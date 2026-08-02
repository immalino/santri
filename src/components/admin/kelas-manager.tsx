"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Plus, School, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, Textarea } from "@/components/ui/field";

/** Kelas row shared by the server page and this manager. */
export interface KelasItem {
  id: string;
  namaKelas: string;
  deskripsi: string | null;
  jumlahSantri: number;
}

interface KelasForm {
  namaKelas: string;
  deskripsi: string;
}

const emptyForm: KelasForm = { namaKelas: "", deskripsi: "" };

/** Kelas management (task 4.7). Create/edit via the admin API, delete allowed only when empty. */
export default function KelasManager({ initialKelas }: { initialKelas: KelasItem[] }) {
  const [kelas, setKelas] = useState<KelasItem[]>(initialKelas);
  const [form, setForm] = useState<KelasForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setKelas(await api<KelasItem[]>("/api/kelas"));
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError(null);
  }

  function openEdit(item: KelasItem) {
    setEditingId(item.id);
    setForm({ namaKelas: item.namaKelas, deskripsi: item.deskripsi ?? "" });
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
      namaKelas: form.namaKelas.trim(),
      deskripsi: form.deskripsi.trim() || undefined,
    };
    try {
      if (editingId) {
        await api(`/api/kelas/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/api/kelas", { method: "POST", body: JSON.stringify(payload) });
      }
      await refresh();
      cancelForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(item: KelasItem) {
    if (!confirm(`Hapus kelas "${item.namaKelas}"?`)) return;
    setError(null);
    try {
      await api(`/api/kelas/${item.id}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Kelola Kelas</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Kelas / angkatan untuk santri, bisa diubah oleh admin.
          </p>
        </div>
        <Button type="button" onClick={showForm ? cancelForm : openCreate}>
          <Plus className="h-4 w-4" aria-hidden />
          {showForm ? "Batal" : "Tambah Kelas"}
        </Button>
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {showForm && (
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold text-ink">
            {editingId ? "Edit Kelas" : "Tambah Kelas"}
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Nama Kelas" htmlFor="nama-kelas">
              <Input
                id="nama-kelas"
                required
                value={form.namaKelas}
                onChange={(e) => setForm((f) => ({ ...f, namaKelas: e.target.value }))}
                placeholder="mis. Angkatan 2025"
              />
            </Field>

            <Field label="Deskripsi" htmlFor="deskripsi-kelas">
              <Textarea
                id="deskripsi-kelas"
                rows={3}
                value={form.deskripsi}
                onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))}
                placeholder="Keterangan singkat (opsional)"
              />
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

      {kelas.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-secondary">
          Belum ada kelas. Klik “Tambah Kelas” untuk membuat yang pertama.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {kelas.map((item) => (
            <Card key={item.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <School className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{item.namaKelas}</p>
                    <p className="text-sm text-ink-secondary">
                      {item.jumlahSantri} santri
                    </p>
                    {item.deskripsi ? (
                      <p className="mt-1 line-clamp-2 text-sm text-ink-secondary">{item.deskripsi}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(item)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item)}
                  disabled={item.jumlahSantri > 0}
                  title={item.jumlahSantri > 0 ? "Pindahkan atau hapus santri dulu" : "Hapus kelas"}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Hapus
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
