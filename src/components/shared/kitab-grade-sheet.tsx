"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpenText } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PageScore {
  halamanId: string;
  nomorHalaman: number;
  persentase: number | null;
}

const PRESETS = [0, 25, 50, 75, 100];
/** Idle time after the last tap before queued changes are sent. */
const AUTOSAVE_DELAY_MS = 900;

type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Badge color for a page's current score. */
function pageVariant(persentase: number | null): "success" | "warning" | "danger" | "secondary" {
  if (persentase === null) return "secondary";
  if (persentase >= 75) return "success";
  if (persentase >= 40) return "warning";
  return "danger";
}

/**
 * Quick grading sheet for one santri + kitab ("Nilai Cepat"). Each page is a
 * row with its preset buttons inline: one tap sets the value, changes
 * autosave after a short idle delay, and focus advances to the next page so
 * sequential per-page grading (the dominant pattern) needs one tap per page.
 *
 * Data semantics are unchanged: only pages whose value differs from the last
 * saved one are sent (upsert per `(santri, halaman)`), untouched pages stay
 * `null`/ungraded.
 *
 * The parent remounts this component per selection via `key`, so all state is
 * scoped to one santri+kitab pair.
 */
export function KitabGradeSheet({
  santriId,
  santriNama,
  kitabId,
  kitabNama,
  initialPages,
}: {
  santriId: string;
  santriNama: string;
  kitabId: string;
  kitabNama: string;
  /** Preloaded per-page values (from `getSantriProgressData`); skips the fetch. */
  initialPages?: PageScore[];
}) {
  const [pages, setPages] = useState<PageScore[]>(initialPages ?? []);
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries((initialPages ?? []).map((h) => [h.halamanId, h.persentase ?? 0])),
  );
  // Without preloaded data the sheet always fetches, so start in the loading
  // state instead of flashing "no pages" before the fetch kicks in.
  const [loadingSheet, setLoadingSheet] = useState(!initialPages);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(
    null,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [jumpValue, setJumpValue] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const jumpTimer = useRef<number | null>(null);
  const saveTimer = useRef<number | null>(null);

  // Clear any pending timers on unmount.
  useEffect(
    () => () => {
      if (jumpTimer.current) window.clearTimeout(jumpTimer.current);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    },
    [],
  );

  // Preload the sheet from the API when no initial data was passed. The work
  // is deferred into a setTimeout so no setState runs synchronously in the
  // effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (initialPages) return;
    let cancelled = false;
    const tid = window.setTimeout(async () => {
      setLoadingSheet(true);
      try {
        const data = await api<{ halaman: PageScore[] }>(
          `/api/pencapaian?santriId=${santriId}&kitabId=${kitabId}`,
        );
        if (cancelled) return;
        setPages(data.halaman);
        setValues(
          Object.fromEntries(data.halaman.map((h) => [h.halamanId, h.persentase ?? 0])),
        );
        setMessage(null);
      } catch (err) {
        if (!cancelled) {
          setMessage({
            kind: "error",
            text: err instanceof Error ? err.message : "Gagal memuat nilai.",
          });
        }
      } finally {
        if (!cancelled) setLoadingSheet(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(tid);
    };
  }, [santriId, kitabId, initialPages]);

  // Pages whose current edit value differs from the last saved one. Only these
  // are sent on save, so untouched pages stay "ungraded" (null) instead of
  // being written as 0.
  const changedPages = useMemo(() => {
    if (pages.length === 0) return [];
    return pages.filter((p) => (values[p.halamanId] ?? 0) !== (p.persentase ?? 0));
  }, [pages, values]);

  const gradedCount = useMemo(
    () => pages.filter((p) => (values[p.halamanId] ?? 0) > 0).length,
    [pages, values],
  );

  // Latest state mirror so the debounced saver always sends fresh data without
  // re-creating timers on every render. Assigned in an effect (not during
  // render) to satisfy react-hooks/refs.
  const latest = useRef({ pages, values, santriId, kitabId });
  useEffect(() => {
    latest.current = { pages, values, santriId, kitabId };
  });

  const doSave = useCallback(async () => {
    const { pages: p, values: v, santriId: sid, kitabId: kid } = latest.current;
    const changed = p.filter((pg) => (v[pg.halamanId] ?? 0) !== (pg.persentase ?? 0));
    if (changed.length === 0 || !sid || !kid || p.length === 0) return;
    setSaveStatus("saving");
    try {
      await api("/api/pencapaian", {
        method: "POST",
        body: JSON.stringify({
          santriId: sid,
          kitabId: kid,
          nilai: changed.map((pg) => ({
            halamanId: pg.halamanId,
            persentase: v[pg.halamanId] ?? 0,
          })),
        }),
      });
      // Adopt the new baseline ONLY for pages that were actually sent AND
      // haven't been retapped mid-flight. Pages changed during the flight keep
      // their old baseline, so the autosave effect re-queues them.
      const sentValues = v;
      setPages((prev) =>
        prev.map((pg) => {
          const sent = sentValues[pg.halamanId] ?? 0;
          return latest.current.values[pg.halamanId] === sent
            ? { ...pg, persentase: sent }
            : pg;
        }),
      );
      setMessage(null);
      setSaveStatus("saved");
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Gagal menyimpan otomatis.",
      });
      setSaveStatus("error");
    }
  }, []);

  // Autosave: whenever there are unsent changes, wait for a short idle period
  // then send them. No manual save button needed.
  useEffect(() => {
    if (loadingSheet || changedPages.length === 0) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void doSave();
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [changedPages, loadingSheet, doSave]);

  // "Ada perubahan..." is derived from unsent changes (not a separate state)
  // so no setState runs inside the autosave effect above.
  const saveLabel =
    saveStatus === "saving"
      ? "Menyimpan..."
      : saveStatus === "error"
        ? "Gagal menyimpan"
        : changedPages.length > 0
          ? "Ada perubahan..."
          : saveStatus === "saved"
            ? "Tersimpan ✓"
            : "Belum ada perubahan";

  /** Set one page's value; by default focus advances to the next page. */
  function applyPreset(halamanId: string, preset: number, advance = true) {
    const clamped = Math.max(0, Math.min(100, Math.round(preset)));
    setValues((prev) => (prev[halamanId] === clamped ? prev : { ...prev, [halamanId]: clamped }));
    if (!advance) return;
    requestAnimationFrame(() => {
      const idx = latest.current.pages.findIndex((p) => p.halamanId === halamanId);
      const next = latest.current.pages[idx + 1];
      if (!next) return;
      const el = document.getElementById(`grade-${next.halamanId}-${clamped}`);
      el?.scrollIntoView({ block: "nearest" });
      (el as HTMLElement | null)?.focus({ preventScroll: true });
    });
  }

  /** Set every page to the same value (replaces the old bulk-select modal). */
  function fillAll(preset: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(preset)));
    setValues((prev) => {
      const next = { ...prev };
      for (const p of latest.current.pages) next[p.halamanId] = clamped;
      return next;
    });
  }

  /** Keyboard shortcut on a row: keys 1–5 map to the five presets. */
  function handleRowKey(e: React.KeyboardEvent, halamanId: string) {
    const target = e.target as HTMLElement | null;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
    const idx = ["1", "2", "3", "4", "5"].indexOf(e.key);
    if (idx >= 0) {
      e.preventDefault();
      applyPreset(halamanId, PRESETS[idx]);
    }
  }

  /** Jump the list to a page number and briefly highlight its row. */
  function handleJump(e: React.FormEvent) {
    e.preventDefault();
    if (pages.length === 0) return;
    const n = Number(jumpValue);
    if (!Number.isInteger(n) || n <= 0) return;
    const page = pages.find((p) => p.nomorHalaman === n);
    if (!page) {
      setMessage({ kind: "error", text: `Halaman ${n} tidak ada di kitab ini.` });
      return;
    }
    document
      .getElementById(`row-${page.halamanId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(page.halamanId);
    if (jumpTimer.current) window.clearTimeout(jumpTimer.current);
    jumpTimer.current = window.setTimeout(() => setHighlightId(null), 2500);
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
            message.kind === "error"
              ? "bg-danger/10 text-danger"
              : "bg-success/10 text-success"
          }`}
        >
          <p>{message.text}</p>
          {saveStatus === "error" && (
            <Button type="button" size="sm" onClick={() => void doSave()}>
              Coba lagi
            </Button>
          )}
        </div>
      )}

      {/* Jump-to-page: quick navigation for kitab with many pages. Sticks just
          below the top bar so it stays reachable while scrolling the list.
          Offset top-[72px] clears the sticky top bar (44px content + py-3) + border. */}
      <form
        onSubmit={handleJump}
        className="sticky top-[72px] z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-sm"
      >
        <label htmlFor="lompat-halaman" className="text-sm font-medium text-ink">
          Lompat ke halaman
        </label>
        <input
          id="lompat-halaman"
          type="number"
          min={1}
          max={pages.length}
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          placeholder={`1-${pages.length}`}
          aria-label="Nomor halaman tujuan"
          className="w-28 rounded-xl border border-border bg-background px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-secondary/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <Button type="submit" size="sm">
          Lompat
        </Button>
      </form>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-ink">
            <BookOpenText className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <span className="truncate font-semibold">{kitabNama}</span>
            <span className="truncate text-sm text-ink-secondary">— {santriNama}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs text-ink-secondary">
            <span>
              {gradedCount} dari {pages.length} halaman terisi
            </span>
            <span aria-hidden>•</span>
            <span role="status">{saveLabel}</span>
          </div>
        </div>

        {/* Fill-all: one tap sets every page (replaces bulk-select + modal). */}
        {pages.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-ink-secondary">
              Isi semua halaman:
            </span>
            {PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => fillAll(preset)}
              >
                {preset}%
              </Button>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-ink-secondary">
          Ketuk angka di tiap baris untuk memberi nilai — tersimpan otomatis. Tips keyboard:
          tekan 1–5 untuk 0/25/50/75/100.
        </p>

        <div className="mt-3">
          {loadingSheet && pages.length === 0 ? (
            <p className="py-4 text-sm text-ink-secondary">Memuat nilai...</p>
          ) : pages.length === 0 ? (
            <p className="py-4 text-sm text-ink-secondary">Tidak ada halaman untuk kitab ini.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {pages.map((p) => {
                const current = values[p.halamanId] ?? 0;
                const saved = p.persentase;
                const label = saved === null && current === 0 ? null : current;
                return (
                  <li
                    key={p.halamanId}
                    id={`row-${p.halamanId}`}
                    onKeyDown={(e) => handleRowKey(e, p.halamanId)}
                    className={`scroll-mt-36 py-3 transition-colors ${
                      p.halamanId === highlightId ? "rounded-lg bg-accent/10" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-ink">
                        Halaman {p.nomorHalaman}
                      </span>
                      {label === null ? (
                        <span className="text-xs text-ink-secondary">Belum dinilai</span>
                      ) : (
                        <Badge variant={pageVariant(label)}>{label}%</Badge>
                      )}
                    </div>
                    <div
                      role="group"
                      aria-label={`Nilai halaman ${p.nomorHalaman}`}
                      className="mt-2 grid grid-cols-5 gap-1.5"
                    >
                      {PRESETS.map((preset) => {
                        const active = current === preset && label !== null;
                        return (
                          <button
                            key={preset}
                            id={`grade-${p.halamanId}-${preset}`}
                            type="button"
                            aria-pressed={active}
                            aria-label={`Halaman ${p.nomorHalaman} = ${preset}%`}
                            onClick={() => applyPreset(p.halamanId, preset)}
                            className={`rounded-lg border px-2 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                              active
                                ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                                : "border-border text-ink-secondary hover:border-primary/40 hover:text-ink active:border-primary"
                            }`}
                          >
                            {preset}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
