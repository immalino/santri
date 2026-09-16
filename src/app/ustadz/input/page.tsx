"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, UsersRound } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { KitabGradeSheet } from "@/components/shared/kitab-grade-sheet";

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

/**
 * Ustadz grading page (tasks 5.2–5.4): pick a santri + kitab, then grade pages
 * with the quick-grade list. The list + autosave editing lives in the shared
 * KitabGradeSheet, remounted per selection via `key` so its state always
 * matches the currently chosen santri+kitab pair.
 */
export default function UstadzInputPage() {
  const [santris, setSantris] = useState<SantriOption[]>([]);
  const [kitabs, setKitabs] = useState<KitabOption[]>([]);
  const [santriId, setSantriId] = useState("");
  const [kitabId, setKitabId] = useState("");
  const [query, setQuery] = useState("");
  const [loadingData, setLoadingData] = useState(true);
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
  const sheetVisible = selectedSantri && selectedKitab;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Input Nilai</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Pilih santri dan kitab, lalu ketuk preset di tiap halaman — tersimpan otomatis.
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

      {/* Grading sheet — remounted per selection so state resets cleanly. */}
      {sheetVisible && (
        <KitabGradeSheet
          key={`${santriId}:${kitabId}`}
          santriId={santriId}
          santriNama={selectedSantri.nama}
          kitabId={kitabId}
          kitabNama={selectedKitab.namaKitab}
        />
      )}
    </div>
  );
}
