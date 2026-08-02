"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Check, Save, UsersRound } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageGrid } from "@/components/ustadz/page-grid";

interface SantriOption {
  id: string;
  nama: string;
  kelasNama: string | null;
}

interface KitabOption {
  id: string;
  namaKitab: string;
  jumlahHalaman: number;
}

interface PageScore {
  halamanId: string;
  nomorHalaman: number;
  persentase: number | null;
}

const PRESETS = [0, 25, 50, 75, 100];

/** Sticky bulk-set bar shown while pages are selected (task 5.2 redesign). */
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
 * Ustadz grading page (tasks 5.2–5.4): pick a santri + kitab, then grade pages
 * on a color-filled grid. Tap a box toggles selection; long-press & drag
 * paint-selects many boxes, then the bulk bar sets them all to one value.
 * Existing values are preloaded so a re-grade starts from the last values.
 */
export default function UstadzInputPage() {
  const toast = useToast();
  const [santris, setSantris] = useState<SantriOption[]>([]);
  const [kitabs, setKitabs] = useState<KitabOption[]>([]);
  const [santriId, setSantriId] = useState("");
  const [kitabId, setKitabId] = useState("");
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState<PageScore[]>([]);
  const [values, setValues] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkValue, setBulkValue] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ santri: SantriOption[]; kitab: KitabOption[] }>(
          "/api/ustadz/data",
        );
        setSantris(data.santri);
        setKitabs(data.kitab);
      } catch (err) {
        setMessage({
          kind: "error",
          text: err instanceof Error ? err.message : "Gagal memuat data.",
        });
      } finally {
        setLoadingData(false);
      }
    })();
  }, []);

  // Preload the sheet whenever both santri+kitab are chosen (task 5.3). The
  // work is deferred into a setTimeout so no setState runs synchronously in the
  // effect body (react-hooks/set-state-in-effect). When a selection is cleared
  // the sheet simply isn't rendered, so stale state is never shown.
  useEffect(() => {
    if (!santriId || !kitabId) return;
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
  }, [santriId, kitabId]);

  const filteredSantris = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return santris;
    return santris.filter(
      (s) =>
        s.nama.toLowerCase().includes(q) ||
        (s.kelasNama ?? "").toLowerCase().includes(q),
    );
  }, [santris, query]);

  const selectedSantri = santris.find((s) => s.id === santriId);
  const selectedKitab = kitabs.find((k) => k.id === kitabId);

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
    } catch {
      // Error sudah ditampilkan lewat toast.
    } finally {
      setSaving(false);
    }
  }

  const sheetVisible = selectedSantri && selectedKitab;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Input Nilai</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Pilih santri dan kitab, lalu isi persentase tiap halaman (0–100).
        </p>
      </div>

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

      {/* Selection card: searchable santri list + kitab dropdown. */}
      <Card className="space-y-4 p-5">
        <Field
          label="Pilih Santri"
          hint={
            selectedSantri
              ? `Terpilih: ${selectedSantri.nama}${
                  selectedSantri.kelasNama ? ` (${selectedSantri.kelasNama})` : ""
                }`
              : undefined
          }
        >
          <div className="space-y-2">
            <div className="relative">
              <UsersRound
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary"
                aria-hidden
              />
              <Input
                aria-label="Cari santri"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari santri..."
                className="pl-9"
                autoComplete="off"
              />
            </div>
            <div className="max-h-44 overflow-y-auto rounded-xl border border-border">
              {loadingData ? (
                <p className="p-3 text-sm text-ink-secondary">Memuat santri...</p>
              ) : filteredSantris.length === 0 ? (
                <p className="p-3 text-sm text-ink-secondary">Tidak ada santri.</p>
              ) : (
                <ul>
                  {filteredSantris.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          if (s.id === santriId) return;
                          setSantriId(s.id);
                          setPages([]);
                          setSelected(new Set());
                          setBulkValue("");
                          setLoadingSheet(true);
                        }}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                          s.id === santriId
                            ? "bg-primary/10 text-primary"
                            : "text-ink hover:bg-background"
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium">{s.nama}</span>
                          {s.kelasNama && (
                            <span className="block text-xs text-ink-secondary">
                              {s.kelasNama}
                            </span>
                          )}
                        </span>
                        {s.id === santriId && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Field>

        <Field label="Pilih Kitab">
          <Select
            value={kitabId}
            onChange={(e) => {
              const v = e.target.value;
              if (v === kitabId) return;
              setKitabId(v);
              setPages([]);
              setSelected(new Set());
              setBulkValue("");
              setLoadingSheet(true);
            }}
            disabled={kitabs.length === 0}
          >
            <option value="">Pilih kitab...</option>
            {kitabs.map((k) => (
              <option key={k.id} value={k.id}>
                {k.namaKitab} ({k.jumlahHalaman} halaman)
              </option>
            ))}
          </Select>
          {kitabs.length === 0 && (
            <p className="mt-2 text-sm text-ink-secondary">Belum ada kitab.</p>
          )}
        </Field>
      </Card>

      {/* Grading sheet. */}
      {sheetVisible && (
        <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 text-ink">
                <BookOpenText className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <span className="truncate font-semibold">{selectedKitab.namaKitab}</span>
                <span className="truncate text-sm text-ink-secondary">
                  — {selectedSantri.nama}
                </span>
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
                />
              )}
            </div>

            {selected.size > 0 && (
              <div className="mt-3">
                <BulkBar
                  count={selected.size}
                  value={bulkValue}
                  onValueChange={setBulkValue}
                  onApply={applyBulkValue}
                  onClear={() => setSelected(new Set())}
                />
              </div>
            )}

            {changedPages.length === 0 && pages.length > 0 && (
              <p className="mt-2 text-xs text-ink-secondary">
                Belum ada perubahan untuk disimpan.
              </p>
            )}
          </Card>
      )}

      {/* Save bar — sticky bottom on mobile, inline on desktop. */}
      {sheetVisible && (
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
      )}
    </div>
  );
}
