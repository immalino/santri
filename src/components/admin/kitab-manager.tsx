"use client";

import { useState, type FormEvent } from "react";
import { BookOpen, Pencil, Plus, Power } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";

/** Kitab row shared by the server page and this manager (JSON-serializable). */
export interface KitabItem {
  id: string;
  namaKitab: string;
  jumlahHalaman: number;
  deskripsi: string | null;
  status: "aktif" | "nonaktif";
}

interface KitabForm {
  namaKitab: string;
  jumlahHalaman: string;
  deskripsi: string;
  status: "aktif" | "nonaktif";
}

const emptyForm: KitabForm = {
  namaKitab: "",
  jumlahHalaman: "1",
  deskripsi: "",
  status: "aktif",
};

/**
 * Kitab management (tasks 4.5–4.6). Holds the list as state, mutates through
 * the admin API, then re-fetches the GET route so the UI stays in sync with
 * the database (including auto-generated halaman counts).
 */
export default function KitabManager({ initialKitabs }: { initialKitabs: KitabItem[] }) {
  const [kitabs, setKitabs] = useState<KitabItem[]>(initialKitabs);
  const [form, setForm] = useState<KitabForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setKitabs(await api<KitabItem[]>("/api/kitab"));
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError(null);
  }

  function openEdit(item: KitabItem) {
    setEditingId(item.id);
    setForm({
      namaKitab: item.namaKitab,
      jumlahHalaman: String(item.jumlahHalaman),
      deskripsi: item.deskripsi ?? "",
      status: item.status,
    });
    setShowForm(true);
    setError(null);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload = {
      namaKitab: form.namaKitab.trim(),
      jumlahHalaman: Number(form.jumlahHalaman),
      deskripsi: form.deskripsi.trim() || undefined,
      status: form.status,
    };
    try {
      if (editingId) {
        await api(`/api/kitab/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/api/kitab", { method: "POST", body: JSON.stringify(payload) });
      }
      await refresh();
      cancelForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  /** Nonaktifkan via DELETE (soft), Aktifkan via PATCH status. */
  async function toggleStatus(item: KitabItem) {
    setError(null);
    try {
      if (item.status === "aktif") {
        await api(`/api/kitab/${item.id}`, { method: "DELETE" });
      } else {
        await api(`/api/kitab/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "aktif" }),
        });
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Kelola Kitab</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Daftar kitab, jumlah halaman, dan status aktif/nonaktif.
          </p>
        </div>
        <Button type="button" onClick={showForm ? cancelForm : openCreate}>
          <Plus className="h-4 w-4" aria-hidden />
          {showForm ? "Batal" : "Tambah Kitab"}
        </Button>
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {showForm && (
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-ink">
            {editingId ? "Edit Kitab" : "Tambah Kitab"}
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Nama Kitab" htmlFor="nama-kitab">
              <Input
                id="nama-kitab"
                required
                value={form.namaKitab}
                onChange={(e) => setForm((f) => ({ ...f, namaKitab: e.target.value }))}
                placeholder="mis. Kitab Jurumiyah"
              />
            </Field>

            <Field
              label="Jumlah Halaman"
              htmlFor="jumlah-halaman"
              hint={editingId ? "Jumlah halaman tidak bisa dikurangi." : "Halaman akan dibuat otomatis."}
            >
              <Input
                id="jumlah-halaman"
                type="number"
                min={1}
                step={1}
                required
                value={form.jumlahHalaman}
                onChange={(e) => setForm((f) => ({ ...f, jumlahHalaman: e.target.value }))}
              />
            </Field>

            <Field label="Deskripsi" htmlFor="deskripsi-kitab">
              <Textarea
                id="deskripsi-kitab"
                rows={3}
                value={form.deskripsi}
                onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))}
                placeholder="Keterangan singkat (opsional)"
              />
            </Field>

            <Field label="Status" htmlFor="status-kitab">
              <Select
                id="status-kitab"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as KitabForm["status"] }))
                }
              >
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </Select>
            </Field>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button type="button" variant="secondary" onClick={cancelForm}>
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      {kitabs.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-secondary">
          Belum ada kitab. Klik “Tambah Kitab” untuk membuat yang pertama.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {kitabs.map((item) => (
            <Card key={item.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{item.namaKitab}</p>
                    <p className="text-sm text-ink-secondary">
                      {item.jumlahHalaman} halaman
                    </p>
                    {item.deskripsi ? (
                      <p className="mt-1 line-clamp-2 text-sm text-ink-secondary">{item.deskripsi}</p>
                    ) : null}
                  </div>
                </div>
                <Badge variant={item.status === "aktif" ? "success" : "secondary"}>
                  {item.status === "aktif" ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(item)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => toggleStatus(item)}>
                  <Power className="h-4 w-4" aria-hidden />
                  {item.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
