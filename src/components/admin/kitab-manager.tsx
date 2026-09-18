"use client";

import { useState, type FormEvent } from "react";
import { BookOpen, Pencil, Plus, Power } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";

/** Kitab row shared by the server page and this manager (JSON-serializable). */
export interface KitabItem {
  id: string;
  namaKitab: string;
  jumlahHalaman: number;
  deskripsi: string | null;
  status: "aktif" | "nonaktif";
  kelasId: string | null;
  kelasNama: string | null;
}

interface KitabForm {
  namaKitab: string;
  jumlahHalaman: string;
  deskripsi: string;
  status: "aktif" | "nonaktif";
  kelasId: string;
}

const emptyForm: KitabForm = {
  namaKitab: "",
  jumlahHalaman: "1",
  deskripsi: "",
  status: "aktif",
  kelasId: "",
};

/**
 * Kitab management (tasks 4.5–4.6). Holds the list as state, mutates through
 * the admin API, then re-fetches the GET route so the UI stays in sync with
 * the database (including auto-generated halaman counts).
 */
export default function KitabManager({
  initialKitabs,
  kelasOptions,
}: {
  initialKitabs: KitabItem[];
  kelasOptions: { id: string; namaKelas: string; urutan: number }[];
}) {
  const toast = useToast();
  const [kitabs, setKitabs] = useState<KitabItem[]>(initialKitabs);
  const [form, setForm] = useState<KitabForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const rows = await api<KitabItem[]>("/api/kitab");
    // GET /api/kitab returns kelasId without the joined kelas name, so
    // re-attach it from the page-level options to keep the badge visible.
    setKitabs(
      rows.map((r) => ({
        ...r,
        kelasNama: r.kelasId
          ? (kelasOptions.find((k) => k.id === r.kelasId)?.namaKelas ?? r.kelasNama ?? null)
          : null,
      })),
    );
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(item: KitabItem) {
    setEditingId(item.id);
    setForm({
      namaKitab: item.namaKitab,
      jumlahHalaman: String(item.jumlahHalaman),
      deskripsi: item.deskripsi ?? "",
      status: item.status,
      kelasId: item.kelasId ?? "",
    });
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
      namaKitab: form.namaKitab.trim(),
      jumlahHalaman: Number(form.jumlahHalaman),
      deskripsi: form.deskripsi.trim() || undefined,
      status: form.status,
      ...(form.kelasId ? { kelasId: form.kelasId } : { kelasId: null }),
    };
    try {
      await toast.promise(
        editingId
          ? api(`/api/kitab/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) })
          : api("/api/kitab", { method: "POST", body: JSON.stringify(payload) }),
        {
          loading: "Menyimpan kitab...",
          success: editingId ? "Kitab berhasil diperbarui." : "Kitab berhasil ditambahkan.",
          error: (err) => (err instanceof Error ? err.message : "Gagal menyimpan kitab."),
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

  /** Nonaktifkan via DELETE (soft), Aktifkan via PATCH status. */
  async function toggleStatus(item: KitabItem) {
    try {
      await toast.promise(
        item.status === "aktif"
          ? api(`/api/kitab/${item.id}`, { method: "DELETE" })
          : api(`/api/kitab/${item.id}`, {
              method: "PATCH",
              body: JSON.stringify({ status: "aktif" }),
            }),
        {
          loading: item.status === "aktif" ? "Menonaktifkan kitab..." : "Mengaktifkan kitab...",
          success:
            item.status === "aktif"
              ? "Kitab berhasil dinonaktifkan."
              : "Kitab berhasil diaktifkan.",
          error: (err) => (err instanceof Error ? err.message : "Gagal mengubah status kitab."),
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
          <h1 className="text-2xl font-semibold text-ink">Kelola Kitab</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Daftar kitab, jumlah halaman, dan status aktif/nonaktif.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden />
          Tambah Kitab
        </Button>
      </div>

      {/* Create/edit form lives in a modal so it stays reachable without
          scrolling back to the top of a long kitab list. */}
      <Dialog
        open={showForm}
        onClose={cancelForm}
        title={editingId ? "Edit Kitab" : "Tambah Kitab"}
        footer={
          <div className="flex gap-3">
            <Button type="submit" form="form-kitab" disabled={loading} className="flex-1">
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
            <Button type="button" variant="secondary" onClick={cancelForm}>
              Batal
            </Button>
          </div>
        }
      >
        <form id="form-kitab" onSubmit={handleSave} className="space-y-4">
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

          <Field label="Kelas Materi" htmlFor="kelas-kitab">
            <Select
              id="kelas-kitab"
              value={form.kelasId}
              onChange={(e) => setForm((f) => ({ ...f, kelasId: e.target.value }))}
            >
              <option value="">Tanpa kelas (diabaikan dari syarat)</option>
              {kelasOptions.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.namaKelas} (urutan {k.urutan})
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Dialog>

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
                {item.kelasNama ? <Badge variant="success">{item.kelasNama}</Badge> : null}
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
