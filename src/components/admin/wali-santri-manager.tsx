"use client";

import { useEffect, useState } from "react";
import { Link2, Save } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

/** Wali option for the select. */
interface WaliOption {
  id: string;
  name: string;
}

/** Active santri option for the checklist. */
interface SantriOption {
  id: string;
  nama: string;
}

/** Current wali<->santri relation (only the ids are needed here). */
interface Relation {
  waliId: string;
  santriId: string;
}

/**
 * Wali <-> Santri relation management (tasks 4.12, 4.13). Pick a wali, tick
 * the active santri to link, then Save replaces the whole set for that wali
 * (atomic on the server). Self-contained: fetches its own data on mount so it
 * always reflects freshly-created wali / santri.
 */
export default function WaliSantriManager() {
  const toast = useToast();
  const [walis, setWalis] = useState<WaliOption[]>([]);
  const [santris, setSantris] = useState<SantriOption[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [waliId, setWaliId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(
    null,
  );

  // Santri ids linked to a given wali.
  function linkedSantriIds(id: string, rels: Relation[]): string[] {
    return rels.filter((r) => r.waliId === id).map((r) => r.santriId);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<{ id: string; name: string }[]>("/api/users?role=wali"),
      api<{ id: string; nama: string; statusAktif: boolean }[]>("/api/santri"),
      api<{ waliId: string; santriId: string }[]>("/api/wali-santri"),
    ])
      .then(([w, s, r]) => {
        if (cancelled) return;
        const activeSantris = s.filter((st) => st.statusAktif);
        const rels = r.map((rel) => ({ waliId: rel.waliId, santriId: rel.santriId }));
        const firstWali = w[0]?.id ?? "";
        setWalis(w.map((u) => ({ id: u.id, name: u.name })));
        setSantris(activeSantris.map((st) => ({ id: st.id, nama: st.nama })));
        setRelations(rels);
        setWaliId(firstWali);
        setSelected(linkedSantriIds(firstWali, rels));
      })
      .catch(() => {
        if (cancelled) return;
        setMessage({ kind: "error", text: "Gagal memuat data. Silakan muat ulang." });
      })
      .finally(() => {
        if (!cancelled) setLoadingData(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleWaliChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setWaliId(id);
    setSelected(linkedSantriIds(id, relations));
  }

  function toggleSantri(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSave() {
    if (!waliId) return;
    setLoading(true);
    try {
      await toast.promise(
        api("/api/wali-santri", {
          method: "POST",
          body: JSON.stringify({ waliId, santriIds: selected }),
        }),
        {
          loading: "Menyimpan relasi...",
          success: "Relasi wali ↔ santri berhasil disimpan.",
          error: (err) => (err instanceof Error ? err.message : "Gagal menyimpan relasi."),
        },
      );
      const fresh = await api<{ waliId: string; santriId: string }[]>("/api/wali-santri");
      setRelations(fresh.map((rel) => ({ waliId: rel.waliId, santriId: rel.santriId })));
    } catch {
      // Error sudah ditampilkan lewat toast.
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Link2 className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">Hubungkan Santri</h2>
          <p className="text-sm text-ink-secondary">
            Pilih wali, lalu centang santri aktif yang terhubung ke akun wali tersebut.
          </p>
        </div>
      </div>

      {loadingData ? (
        <p className="text-sm text-ink-secondary">Memuat data...</p>
      ) : walis.length === 0 ? (
        <p className="text-sm text-ink-secondary">
          Belum ada akun wali. Buat dulu di daftar akun di atas.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="wali-select" className="mb-1 block text-sm font-medium text-ink">
              Pilih Wali
            </label>
            <Select
              id="wali-select"
              value={waliId}
              onChange={handleWaliChange}
            >
              {walis.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </div>

          {santris.length === 0 ? (
            <p className="text-sm text-ink-secondary">Belum ada santri aktif.</p>
          ) : (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-ink">Santri Terhubung</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {santris.map((st) => {
                  const checked = selected.includes(st.id);
                  return (
                    <label
                      key={st.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                        checked
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-background"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-border accent-primary"
                        checked={checked}
                        onChange={() => toggleSantri(st.id)}
                      />
                      <span className="text-sm font-medium text-ink">{st.nama}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <Button type="button" onClick={handleSave} disabled={loading || !waliId}>
            <Save className="h-4 w-4" aria-hidden />
            {loading ? "Menyimpan..." : "Simpan Relasi"}
          </Button>

          {message && (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                message.kind === "success"
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger"
              }`}
            >
              {message.text}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}