"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Plus, School, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, Textarea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";

/** Kelas row shared by the server page and this manager. */
export interface KelasItem {
  id: string;
  namaKelas: string;
  deskripsi: string | null;
  urutan: number;
  bebasSyarat: boolean;
  jumlahSantri: number;
}

interface KelasForm {
  namaKelas: string;
  deskripsi: string;
  urutan: string;
  bebasSyarat: boolean;
}

const emptyForm: KelasForm = { namaKelas: "", deskripsi: "", urutan: "0", bebasSyarat: false };

/** Kelas management (task 4.7). Create/edit via the admin API, delete allowed only when empty. */
export default function KelasManager({ initialKelas }: { initialKelas: KelasItem[] }) {
  const toast = useToast();
  const [kelas, setKelas] = useState<KelasItem[]>(initialKelas);
  const [form, setForm] = useState<KelasForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setKelas(await api<KelasItem[]>("/api/kelas"));
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(item: KelasItem) {
    setEditingId(item.id);
    setForm({ namaKelas: item.namaKelas, deskripsi: item.deskripsi ?? "", urutan: String(item.urutan), bebasSyarat: item.bebasSyarat });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const payload = {
      namaKelas: form.namaKelas.trim(),
      deskripsi: form.deskripsi.trim() || undefined,
      urutan: Number(form.urutan),
      bebasSyarat: form.bebasSyarat,
    };
    try {
      await toast.promise(
        editingId
          ? api(`/api/kelas/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) })
          : api("/api/kelas", { method: "POST", body: JSON.stringify(payload) }),
        {
          loading: "Menyimpan kelas...",
          success: editingId ? "Kelas berhasil diperbarui." : "Kelas berhasil ditambahkan.",
          error: (err) => (err instanceof Error ? err.message : "Gagal menyimpan kelas."),
        },
      );
      await refresh();
      cancelForm();
    } catch {
      // Error sudah ditampilkan lewat toast.
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(item: KelasItem) {
    if (!confirm(`Hapus kelas "${item.namaKelas}"?`)) return;
    try {
      await toast.promise(
        api(`/api/kelas/${item.id}`, { method: "DELETE" }),
        {
          loading: "Menghapus kelas...",
          success: "Kelas berhasil dihapus.",
          error: (err) => (err instanceof Error ? err.message : "Gagal menghapus kelas."),
        },
      );
      await refresh();
    } catch {
      // Error sudah ditampilkan lewat toast.
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Kelola Kelas</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Kelas / angkatan santri sekaligus jenjang materi kitab. Atur urutan menaik (A=1,
            B=2, ...) dan tandai kelas lulus bila perlu.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden />
          Tambah Kelas
        </Button>
      </div>

      {/* Create/edit form lives in a modal so it stays reachable without
          scrolling back to the top of a long kelas list. */}
      <Dialog
        open={showForm}
        onClose={cancelForm}
        title={editingId ? "Edit Kelas" : "Tambah Kelas"}
        footer={
          <div className="flex gap-3">
            <Button type="submit" form="form-kelas" disabled={loading} className="flex-1">
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
            <Button type="button" variant="secondary" onClick={cancelForm}>
              Batal
            </Button>
          </div>
        }
      >
        <form id="form-kelas" onSubmit={handleSave} className="space-y-4">
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

          <Field label="Urutan Jenjang" htmlFor="urutan-kelas">
            <Input
              id="urutan-kelas"
              type="number"
              min={0}
              step={1}
              value={form.urutan}
              onChange={(e) => setForm((f) => ({ ...f, urutan: e.target.value }))}
              placeholder="mis. 1 untuk kelas A"
            />
          </Field>

          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-ink">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[#0E6B4F]"
              checked={form.bebasSyarat}
              onChange={(e) => setForm((f) => ({ ...f, bebasSyarat: e.target.checked }))}
            />
            Kelas lulus (bebas syarat khatam, mis. Lulus Pra-nikah)
          </label>
        </form>
      </Dialog>

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
                    <p className="text-sm text-ink-secondary">
                      Urutan {item.urutan}
                      {item.bebasSyarat ? " • Bebas syarat" : ""}
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
