"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, CircleAlert, Loader2, X } from "lucide-react";

export type ToastKind = "loading" | "success" | "error";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

/** Auto-dismiss delay for terminal states (loading stays until updated). */
const SUCCESS_DURATION = 4000;
const ERROR_DURATION = 8000;

interface PromiseMessages<T> {
  loading: string;
  success: string | ((result: T) => string);
  error: string | ((error: unknown) => string);
}

export interface ToastApi {
  loading: (title: string, description?: string) => number;
  success: (title: string, description?: string) => number;
  error: (title: string, description?: string) => number;
  dismiss: (id?: number) => void;
  update: (id: number, patch: Partial<Omit<ToastItem, "id">>) => void;
  /**
   * Runs a promise through one toast's lifecycle: loading → success
   * (auto-dismiss) or error (longer auto-dismiss, closable). Returns the
   * original promise so callers can still await/catch and act on the result.
   */
  promise: <T>(
    promiseOrFn: Promise<T> | (() => Promise<T>),
    messages: PromiseMessages<T>,
  ) => Promise<T>;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Access the toast API. Must be used inside <Toaster> (mounted at root layout). */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast harus dipakai di dalam <Toaster>.");
  }
  return ctx;
}

/** Icon per kind — DESIGN.md palette (success=hijau, error=merah). */
const kindIcon: Record<ToastKind, ReactNode> = {
  loading: <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden />,
  success: <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden />,
  error: <CircleAlert className="h-5 w-5 shrink-0 text-danger" aria-hidden />,
};

/** One toast card; terminal states auto-dismiss via a per-kind timer. */
function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    if (toast.kind === "loading") return;
    const duration = toast.kind === "success" ? SUCCESS_DURATION : ERROR_DURATION;
    const timer = window.setTimeout(() => onDismiss(toast.id), duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.kind, onDismiss]);

  return (
    <div
      role="status"
      className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-lg shadow-black/5"
    >
      {kindIcon[toast.kind]}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-sm text-ink-secondary">{toast.description}</p>
        ) : null}
      </div>
      {toast.kind !== "loading" && (
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Tutup notifikasi"
          className="shrink-0 rounded-lg p-1 text-ink-secondary transition-colors hover:bg-background hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

/**
 * Toast provider + viewport (DESIGN.md §5). Mount once at the root layout so
 * every action across all roles can surface loading → success/error feedback.
 * Fixed top-right on desktop, full-width top on mobile.
 */
export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id?: number) => {
    setToasts((prev) => (id === undefined ? [] : prev.filter((t) => t.id !== id)));
  }, []);

  const update = useCallback((id: number, patch: Partial<Omit<ToastItem, "id">>) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const push = useCallback(
    (kind: ToastKind, title: string, description?: string): number => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, kind, title, description }]);
      return id;
    },
    [],
  );

  const promise = useCallback(
    <T,>(promiseOrFn: Promise<T> | (() => Promise<T>), messages: PromiseMessages<T>): Promise<T> => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, kind: "loading", title: messages.loading }]);

      const pending = typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn;

      // Handlers swallow (resolve the .then() chain) so no unhandled rejection
      // is created here; the caller still receives the original rejection.
      pending.then(
        (result) => {
          update(id, {
            kind: "success",
            title:
              typeof messages.success === "function"
                ? messages.success(result)
                : messages.success,
          });
        },
        (error) => {
          update(id, {
            kind: "error",
            title:
              typeof messages.error === "function" ? messages.error(error) : messages.error,
          });
        },
      );

      return pending;
    },
    [update],
  );

  const api = useMemo<ToastApi>(
    () => ({
      loading: (title, description) => push("loading", title, description),
      success: (title, description) => push("success", title, description),
      error: (title, description) => push("error", title, description),
      dismiss,
      update,
      promise,
    }),
    [push, dismiss, update, promise],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifikasi aksi"
        className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-4 sm:w-96 sm:items-end"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
