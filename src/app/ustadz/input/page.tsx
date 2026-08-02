"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Check, Minus, Plus, Save, UsersRound } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

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

/** Percentage stepper row for one halaman (grading input). */
function GradeRow({
  nomorHalaman,
  value,
  onChange,
}: {
  nomorHalaman: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="w-20 shrink-0 text-sm font-semibold text-ink">
        Halaman {nomorHalaman}
      </span>

      <div className="flex flex-1 items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange(Math.max(0, value - 5))}
          aria-label={`Kurangi nilai halaman ${nomorHalaman}`}
        >
          <Minus className="h-4 w-4" aria-hidden />
        </Button>

        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 flex-1 accent-[var(--primary)]"
          aria-label={`Persentase halaman ${nomorHalaman}`}
        />

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange(Math.min(100, value + 5))}
          aria-label={`Tambah nilai halaman ${nomorHalaman}`}
        >
          <Plus className="h-4 w-4" aria-hidden />
        </Button>

        <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums text-ink-secondary">
          {value}%
        </span>
      </div>
    </div>
  );
}

/**
 * Ustadz grading page (tasks 5.2–5.4): pick a santri + kitab, then grade every
 * page with a slider/stepper and save the whole sheet at once (sticky Save on
 * mobile). Existing values are preloaded so a re-grade starts from the last
 * values instead of from scratch.
 */
export default function UstadzInputPage() {
  const [santris, setSantris] = useState<SantriOption[]>([]);
  const [kitabs, setKitabs] = useState<KitabOption[]>([]);
  const [santriId, setSantriId] = useState("");
  const [kitabId, setKitabId] = useState("");
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState<PageScore[]>([]);
  const [values, setValues] = useState<Record<string, number>>({});
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

  function setPageValue(halamanId: string, v: number) {
    setValues((prev) => ({ ...prev, [halamanId]: v }));
  }

  async function handleSave() {
    if (!santriId || !kitabId || pages.length === 0) return;
    setSaving(true);
    setMessage(null);
    try {
      await api("/api/pencapaian", {
        method: "POST",
        body: JSON.stringify({
          santriId,
          kitabId,
          nilai: pages.map((p) => ({
            halamanId: p.halamanId,
            persentase: values[p.halamanId] ?? 0,
          })),
        }),
      });
      setMessage({ kind: "success", text: "Nilai berhasil disimpan." });
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.",
      });
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
                          setSantriId(s.id);
                          setQuery("");
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
            onChange={(e) => setKitabId(e.target.value)}
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
          <div className="flex items-center gap-2 text-ink">
            <BookOpenText className="h-5 w-5 text-primary" aria-hidden />
            <span className="font-semibold">{selectedKitab.namaKitab}</span>
            <span className="text-sm text-ink-secondary">— {selectedSantri.nama}</span>
          </div>

          <div className="mt-2 divide-y divide-border">
            {loadingSheet && pages.length === 0 ? (
              <p className="py-4 text-sm text-ink-secondary">Memuat nilai...</p>
            ) : pages.length === 0 ? (
              <p className="py-4 text-sm text-ink-secondary">Tidak ada halaman untuk kitab ini.</p>
            ) : (
              pages.map((p) => (
                <GradeRow
                  key={p.halamanId}
                  nomorHalaman={p.nomorHalaman}
                  value={values[p.halamanId] ?? 0}
                  onChange={(v) => setPageValue(p.halamanId, v)}
                />
              ))
            )}
          </div>
        </Card>
      )}

      {/* Save bar — sticky bottom on mobile, inline on desktop. */}
      {sheetVisible && (
        <div className="sticky bottom-20 md:static">
          <div className="md:hidden">
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || loadingSheet || pages.length === 0}
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
              disabled={saving || loadingSheet || pages.length === 0}
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