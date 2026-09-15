"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/shared/back-link";
import type { AbsensiStatus, SesiAbsensiData } from "@/lib/absensi-stats";
import { statusLabel } from "@/components/shared/absensi-history";

const STATUS_ORDER: AbsensiStatus[] = ["hadir", "izin", "tanpa_keterangan"];

function statusButtonClass(active: boolean, status: AbsensiStatus): string {
  const base =
    "min-h-[36px] flex-1 rounded-lg border px-2 text-xs font-semibold transition-colors";
  if (!active) return `${base} border-border bg-surface text-ink-secondary hover:bg-background`;
  if (status === "hadir") return `${base} border-success bg-success/15 text-success`;
  if (status === "izin") return `${base} border-warning bg-warning/15 text-warning`;
  return `${base} border-danger bg-danger/15 text-danger`;
}

/**
 * Attendance input sheet (Fase 10). Lists every registered peserta with a
 * 3-way status toggle + optional keterangan for "izin". Only changed rows
 * are sent (baseline = values loaded from the server).
 */
export function AbsensiSheet({
  initialData,
  postUrl,
  backHref,
}: {
  initialData: SesiAbsensiData;
  postUrl: string;
  backHref: string;
}) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [baseline, setBaseline] = useState(() =>
    initialData.peserta.map((p) => ({ santriId: p.santriId, status: p.status, keterangan: p.keterangan ?? "" })),
  );
  const [rows, setRows] = useState<Record<string, { status: AbsensiStatus | null; keterangan: string }>>(
    () =>
      Object.fromEntries(
        initialData.peserta.map((p) => [
          p.santriId,
          { status: p.status, keterangan: p.keterangan ?? "" },
        ]),
      ),
  );
  const [saving, setSaving] = useState(false);

  const baselineById = useMemo(() => new Map(baseline.map((b) => [b.santriId, b])), [baseline]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? initialData.peserta.filter(
          (p) =>
            p.nama.toLowerCase().includes(q) ||
            (p.kelasNama ?? "").toLowerCase().includes(q),
        )
      : initialData.peserta;
    return [...list].sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  }, [initialData.peserta, query]);

  const changed = useMemo(
    () =>
      initialData.peserta.filter((p) => {
        const cur = rows[p.santriId];
        const base = baselineById.get(p.santriId);
        if (!cur || !base) return false;
        return cur.status !== base.status || (cur.keterangan || "") !== (base.keterangan || "");
      }),
    [initialData.peserta, rows, baselineById],
  );

  const recordedCount = useMemo(
    () => Object.values(rows).filter((r) => r.status !== null).length,
    [rows],
  );

  function setStatus(santriId: string, status: AbsensiStatus) {
    setRows((prev) => {
      const cur = prev[santriId] ?? { status: null, keterangan: "" };
      const next = cur.status === status ? null : status;
      return { ...prev, [santriId]: { ...cur, status: next } };
    });
  }

  function setKeterangan(santriId: string, keterangan: string) {
    setRows((prev) => ({
      ...prev,
      [santriId]: { ...(prev[santriId] ?? { status: null, keterangan: "" }), keterangan },
    }));
  }

  function markAllHadir() {
    setRows((prev) => {
      const next = { ...prev };
      for (const p of initialData.peserta) {
        next[p.santriId] = { ...(next[p.santriId] ?? { keterangan: "" }), status: "hadir" };
      }
      return next;
    });
  }

  function resetAll() {
    setRows((prev) => {
      const next = { ...prev };
      for (const b of baseline) {
        next[b.santriId] = { status: b.status, keterangan: b.keterangan };
      }
      return next;
    });
  }

  async function handleSave() {
    const nilai = changed
      .filter((p) => rows[p.santriId]?.status !== null)
      .map((p) => ({
        santriId: p.santriId,
        status: rows[p.santriId].status as AbsensiStatus,
        keterangan: rows[p.santriId].keterangan.trim() || undefined,
      }));
    if (nilai.length === 0) {
      toast.error("Tidak ada perubahan untuk disimpan.");
      return;
    }
    setSaving(true);
    try {
      const res = await toast.promise(api<{ ok: boolean; saved: number }>(postUrl, {
        method: "POST",
        body: JSON.stringify({ nilai }),
      }), {
        loading: "Menyimpan absensi...",
        success: (r) => `Absensi tersimpan untuk ${r.saved} santri.`,
        error: (err) => (err instanceof Error ? err.message : "Gagal menyimpan absensi."),
      });
      void res;
      setBaseline(
        initialData.peserta.map((p) => ({
          santriId: p.santriId,
          status: rows[p.santriId]?.status ?? null,
          keterangan: rows[p.santriId]?.keterangan ?? "",
        })),
      );
    } catch {
      // Error sudah ditampilkan lewat toast.
    } finally {
      setSaving(false);
    }
  }

  const tanggal = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(initialData.tanggal));

  return (
    <div className="space-y-6">
      <BackLink href={backHref} />

      <Card className="p-5">
        <p className="text-sm text-ink-secondary">{initialData.namaKegiatan}</p>
        <h1 className="text-2xl font-semibold text-ink">{tanggal}</h1>
        {initialData.judul ? <p className="mt-1 text-sm text-ink">{initialData.judul}</p> : null}
        <p className="mt-1 text-sm text-ink-secondary" aria-live="polite">
          {recordedCount} dari {initialData.peserta.length} santri terdata
          {changed.length > 0 ? ` • ${changed.length} perubahan` : ""}.
        </p>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:min-w-0 sm:flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-secondary"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari santri..."
            aria-label="Cari santri"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={markAllHadir} className="flex-1 sm:flex-none">
            Semua Hadir
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={resetAll} disabled={changed.length === 0} className="flex-1 sm:flex-none">
            Batalkan Perubahan
          </Button>
        </div>
      </div>

      {initialData.peserta.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-secondary">
          Belum ada peserta. Tambahkan peserta dari halaman detail kegiatan.
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-secondary">
          Tidak ada santri yang cocok.
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => {
            const cur = rows[p.santriId] ?? { status: null, keterangan: "" };
            const isChanged = changed.some((c) => c.santriId === p.santriId);
            return (
              <li key={p.santriId}>
                <Card className={`p-4 ${isChanged ? "border-primary/50" : ""}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{p.nama}</p>
                      <p className="text-xs text-ink-secondary">{p.kelasNama ?? "Tanpa kelas"}</p>
                    </div>
                    {cur.status === null ? (
                      <span className="shrink-0 text-xs text-ink-secondary">Belum diabsen</span>
                    ) : (
                      <Badge
                        variant={
                          cur.status === "hadir"
                            ? "success"
                            : cur.status === "izin"
                              ? "warning"
                              : "danger"
                        }
                        className="shrink-0"
                      >
                        {statusLabel(cur.status)}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 flex gap-1.5" role="group" aria-label={`Status ${p.nama}`}>
                    {STATUS_ORDER.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(p.santriId, s)}
                        aria-pressed={cur.status === s}
                        className={statusButtonClass(cur.status === s, s)}
                      >
                        {s === "hadir" ? "Hadir" : s === "izin" ? "Izin" : "Tanpa Ket."}
                      </button>
                    ))}
                  </div>
                  {cur.status === "izin" ? (
                    <Input
                      value={cur.keterangan}
                      onChange={(e) => setKeterangan(p.santriId, e.target.value)}
                      placeholder="Keterangan, mis. sakit"
                      aria-label={`Keterangan izin ${p.nama}`}
                      className="mt-2"
                    />
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <div className="sticky bottom-20 md:static">
        <Button
          type="button"
          onClick={handleSave}
          disabled={changed.length === 0 || saving}
          className="w-full"
        >
          {saving
            ? "Menyimpan..."
            : changed.length === 0
              ? "Tidak Ada Perubahan"
              : `Simpan ${changed.length} Perubahan`}
        </Button>
      </div>
    </div>
  );
}
