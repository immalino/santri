"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, UserRound } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";

interface SantriOption {
  id: string;
  nama: string;
}

interface RiwayatRow {
  santriId: string;
  santriNama: string;
  kitabId: string;
  kitabNama: string;
  jumlahHalaman: number;
  rataRata: number;
  terakhirDinilai: string | null;
}

function formatTanggal(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Ustadz grading history (task 5.5): every (santri, kitab) pair that has any
 * score, with the kitab average and the most recent grading date. Filterable
 * per santri.
 */
export default function UstadzRiwayatPage() {
  const [santris, setSantris] = useState<SantriOption[]>([]);
  const [rows, setRows] = useState<RiwayatRow[]>([]);
  const [santriId, setSantriId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the santri list for the filter dropdown once.
  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ santri: SantriOption[] }>("/api/ustadz/data");
        setSantris(data.santri);
      } catch {
        /* dropdown is optional; ignore */
      }
    })();
  }, []);

  // Reload history whenever the santri filter changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const suffix = santriId ? `?santriId=${santriId}` : "";
        const data = await api<RiwayatRow[]>(`/api/pencapaian/riwayat${suffix}`);
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat riwayat.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [santriId]);

  const filtered = useMemo(() => {
    if (!santriId) return rows;
    return rows.filter((r) => r.santriId === santriId);
  }, [rows, santriId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Riwayat Penilaian</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Nilai yang pernah diinput per santri dan kitab.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Field label="Filter Santri" htmlFor="filter-santri">
            <Select
              id="filter-santri"
              value={santriId}
              onChange={(e) => setSantriId(e.target.value)}
            >
              <option value="">Semua santri</option>
              {santris.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {loading ? (
        <Card className="p-6 text-sm text-ink-secondary">Memuat riwayat...</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-secondary">
          Belum ada penilaian. Input nilai dulu melalui halaman <b>Input Nilai</b>.
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={`${r.santriId}-${r.kitabId}`} className="flex items-center gap-4 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpenText className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-ink">{r.kitabNama}</p>
                  <Badge variant="secondary">{r.jumlahHalaman} halaman</Badge>
                </div>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-secondary">
                  <UserRound className="h-3.5 w-3.5" aria-hidden />
                  {r.santriNama}
                  <span className="text-ink-secondary/50">•</span>
                  Dinilai {formatTanggal(r.terakhirDinilai)}
                </p>
                <div className="mt-2 max-w-sm">
                  <ProgressBar value={Number(r.rataRata ?? 0)} showLabel />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}