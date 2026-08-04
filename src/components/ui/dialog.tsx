"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Dialog heading shown in the fixed header. */
  title: string;
  /** Scrollable body content. */
  children: ReactNode;
  /** Fixed footer below the scrollable body (e.g. save button). */
  footer?: ReactNode;
}

/**
 * Reusable modal dialog — DESIGN.md §5, Tailwind custom (no library).
 *
 * Full-screen sheet on mobile (rounded top, slides with the viewport edge),
 * centered panel on ≥sm. Closes on Escape or overlay tap, locks body scroll
 * while open, and restores focus to the trigger on close.
 */
export function Dialog({ open, onClose, title, children, footer }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<Element | null>(null);
  const onCloseRef = useRef(onClose);
  // Keep the latest onClose without re-registering the keydown listener.
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Lock body scroll + remember the trigger element for focus restore.
  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      if (lastFocused.current instanceof HTMLElement) lastFocused.current.focus();
    };
  }, [open]);

  // Escape to close + a light focus trap so Tab stays inside the panel.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    panel?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = panel?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-xl outline-none sm:max-h-[85vh] sm:max-w-3xl sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <h2 className="min-w-0 truncate text-base font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-secondary transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          {children}
        </div>

        {footer && (
          <footer className="shrink-0 border-t border-border bg-background/95 px-4 py-3 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
