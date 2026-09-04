"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenText, Check, Save, SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { PageGrid } from "@/components/ustadz/page-grid";

interface PageScore {
  halamanId: string;
  nomorHalaman: number;
  persentase: number | null;
}

const PRESETS = [0, 25, 50, 75, 100];

/** Bulk-set controls ("N halaman dipilih / Bersihkan / preset / 0-100 / Terapkan"). */
function BulkBar({
  count,
  value,
  onValueChange,
  onApply,
  onClear,
}: {
  count: number;
  value: string;
  onValueChange: (v: string) => void;
  onApply: (v: number) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-2.5">
      <div className="flex flex-wrap items-center gap-2 p-2.5">
        <span className="px-1 text-sm font-semibold text-ink">{count} halaman dipilih</span>
        <Button type="button" size="sm" variant="ghost" onClick={onClear}>
          Bersihkan
        </Button>
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
        {PRESETS.map((p) => (
          <Button key={p} type="button" size="sm" variant="secondary" onClick={() => onApply(p)}>
            {p}%
          </Button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder="0-100"
            aria-label="Nilai untuk halaman terpilih"
            className="w-24 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-secondary/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const v = Number(value);
              if (Number.isFinite(v)) onApply(v);
            }}
          >
            Terapkan
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Grading sheet for one santri + kitab (Fase 8). Extracted verbatim from the
 * ustadz "Input Nilai" page so the detail pages can reuse the exact grid +
 * bulk-set editing flow. Existing values are preloaded from the API unless
 * `initialPages` is provided (then those are used and no fetch runs).
 *
 * The parent remounts this component per selection via `key`, so all state is
 * scoped to one santri+kitab pair.
 *
 * Layout (deviasi keputusan desain — bulk-set dalam modal): the page grid stays
 * inline (task 5.2) with an added jump-to-page aid for kitab with many pages.
 * The bulk-set bar lives in a modal opened by a sticky, always-reachable
 * button, so a 1000-page kitab no longer requires scrolling to the bottom of
 * the grid to set a value.
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
  const toast = useToast();
  const [pages, setPages] = useState<PageScore[]>(initialPages ?? []);
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries((initialPages ?? []).map((h) => [h.halamanId, h.persentase ?? 0])),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkValue, setBulkValue] = useState("");
  const [saving, setSaving] = useState(false);
  // Without preloaded data the sheet always fetches, so start in the loading
  // state instead of flashing "no pages" before the fetch kicks in.
  const [loadingSheet, setLoadingSheet] = useState(!initialPages);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const [jumpValue, setJumpValue] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const jumpTimer = useRef<number | null>(null);

  // Clear any pending jump-highlight timer on unmount.
  useEffect(
    () => () => {
      if (jumpTimer.current) window.clearTimeout(jumpTimer.current);
    },
    [],
  );

  // Preload the sheet from the API when no initial data was passed (task 5.3
  // pattern). The work is deferred into a setTimeout so no setState runs
  // synchronously in the effect body (react-hooks/set-state-in-effect).
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

  function togglePage(halamanId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(halamanId)) next.delete(halamanId);
      else next.add(halamanId);
      return next;
    });
  }

  function paintSelect(halamanId: string) {
    setSelected((prev) => {
      if (prev.has(halamanId)) return prev;
      const next = new Set(prev);
      next.add(halamanId);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(pages.map((p) => p.halamanId)));
  }

  function applyBulkValue(v: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(v)));
    setValues((prev) => {
      const next = { ...prev };
      selected.forEach((id) => {
        next[id] = clamped;
      });
      return next;
    });
  }

  /** Jump the page grid to a page number and briefly highlight it. */
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
      .getElementById(`page-${page.halamanId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(page.halamanId);
    if (jumpTimer.current) window.clearTimeout(jumpTimer.current);
    jumpTimer.current = window.setTimeout(() => setHighlightId(null), 2500);
  }

  async function handleSave() {
    if (!santriId || !kitabId || pages.length === 0 || changedPages.length === 0) return;
    setSaving(true);
    try {
      await toast.promise(
        api("/api/pencapaian", {
          method: "POST",
          body: JSON.stringify({
            santriId,
            kitabId,
            nilai: changedPages.map((p) => ({
              halamanId: p.halamanId,
              persentase: values[p.halamanId] ?? 0,
            })),
          }),
        }),
        {
          loading: "Menyimpan nilai...",
          success: "Nilai berhasil disimpan.",
          error: (err) =>
            err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.",
        },
      );
      // Treat the just-saved values as the new baseline so the sheet stops
      // showing "unsaved changes" and the save button disables.
      setPages((prev) =>
        prev.map((p) => ({ ...p, persentase: values[p.halamanId] ?? 0 })),
      );
      // Auto-unselect after a successful save so the user doesn't have to
      // manually clear the selection. Also reset the bulk input and ensure
      // the bulk-set modal is closed.
      setSelected(new Set());
      setBulkValue("");
      setOpen(false);
    } catch {
      // Error sudah ditampilkan lewat toast.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.kind === "error"
              ? "bg-danger/10 text-danger"
              : "bg-success/10 text-success"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Jump-to-page: quick navigation for kitab with many pages. Sticks just
          below the top bar so it stays reachable while scrolling the grid.
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
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-ink-secondary">
              {gradedCount} dari {pages.length} halaman terisi
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={selectAll}
              disabled={pages.length === 0}
            >
              <Check className="h-4 w-4" aria-hidden />
              Pilih semua
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2 w-10 rounded-full"
              style={{ background: "linear-gradient(90deg, var(--success), var(--accent))" }}
            />
            0% → 100%
          </span>
          <span>Ketuk = pilih satu</span>
          <span>Tekan lama & seret = pilih banyak</span>
        </div>

        <div className="mt-3">
          {loadingSheet && pages.length === 0 ? (
            <p className="py-4 text-sm text-ink-secondary">Memuat nilai...</p>
          ) : pages.length === 0 ? (
            <p className="py-4 text-sm text-ink-secondary">Tidak ada halaman untuk kitab ini.</p>
          ) : (
            <PageGrid
              pages={pages}
              values={values}
              selected={selected}
              onToggle={togglePage}
              onPaintSelect={paintSelect}
              onPaintEnd={() => {}}
              highlightId={highlightId}
            />
          )}
        </div>
      </Card>

      {/* Always-reachable entry to the bulk-set modal (sticky above the mobile
          bottom nav + save bar; inline on desktop). */}
      {selected.size > 0 && (
        <div className="sticky bottom-36 z-10 md:static">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(true)}
            className="w-full"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Set Nilai untuk {selected.size} halaman
          </Button>
        </div>
      )}

      {changedPages.length === 0 && pages.length > 0 && (
        <p className="text-xs text-ink-secondary">Belum ada perubahan untuk disimpan.</p>
      )}

      {/* Save bar — sticky bottom on mobile, inline on desktop. */}
      <div className="sticky bottom-20 md:static">
        <div className="md:hidden">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || loadingSheet || pages.length === 0 || changedPages.length === 0}
            className="w-full"
          >
            <Save className="h-4 w-4" aria-hidden />
            {saving ? "Menyimpan..." : "Simpan Nilai"}
          </Button>
        </div>
        <div className="hidden md:block">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || loadingSheet || pages.length === 0 || changedPages.length === 0}
          >
            <Save className="h-4 w-4" aria-hidden />
            {saving ? "Menyimpan..." : "Simpan Nilai"}
          </Button>
        </div>
      </div>

      {/* Bulk-set modal — the "N halaman dipilih / Bersihkan / preset / 0-100 /
          Terapkan" UI, opened from the always-visible button above. */}
      <Dialog open={open} onClose={() => setOpen(false)} title="Atur Nilai Halaman">
        <BulkBar
          count={selected.size}
          value={bulkValue}
          onValueChange={setBulkValue}
          onApply={(v) => {
            applyBulkValue(v);
            setOpen(false);
          }}
          onClear={() => {
            setSelected(new Set());
            setOpen(false);
          }}
        />
      </Dialog>
    </div>
  );
}
