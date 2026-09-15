"use client";

import { useState, type FormEvent } from "react";
import { CalendarCheck, Pencil, Plus, Power } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { PesertaPicker, type PickerSantri } from "@/components/shared/peserta-picker";
import type { KegiatanListItem } from "@/lib/absensi-stats";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTanggal(iso: string | null): string {
  if (!iso) return "Belum ada sesi";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/**
 * Kegiatan list + create/edit (Fase 10). Shared by the admin and ustadz
 * pages — only `basePath` differs. Mutations go through the shared
 * `/api/kegiatan` routes, then re-fetch so the UI stays in sync.
 */
export function KegiatanManager({
  initialItems,
  allSantri,
  basePath,
}: {
  initialItems: KegiatanListItem[];
  allSantri: PickerSantri[];
  basePath: string;
}) {
  const toast = useToast();
  const [items, setItems] = useState<KegiatanListItem[]>(initialItems);

  const [showCreate, setShowCreate] = useState(false);
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [tanggalPertama, setTanggalPertama] = useState(todayStr());
  const [pesertaIds, setPesertaIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<KegiatanListItem | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editDeskripsi, setEditDeskripsi] = useState("");
  const [editStatus, setEditStatus] = useState<"aktif" | "nonaktif">("aktif");
  const [savingEdit, setSavingEdit] = useState(false);

  async function refresh() {
    setItems(await api<KegiatanListItem[]>("/api/kegiatan"));
  }

  function openCreate() {
    setNama("");
    setDeskripsi("");
    setTanggalPertama(todayStr());
    setPesertaIds([]);
    setShowCreate(true);
  }

  function openEdit(item: KegiatanListItem) {
    setEditing(item);
    setEditNama(item.namaKegiatan);
    setEditDeskripsi(item.deskripsi ?? "");
    setEditStatus(item.status);
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      await toast.promise(
        api("/api/kegiatan", {
          method: "POST",
          body: JSON.stringify({
            namaKegiatan: nama.trim(),
            deskripsi: deskripsi.trim() || undefined,
            tanggalPertama,
            pesertaIds,
          }),
        }),
        {
          loading: "Menyimpan kegiatan...",
          success: "Kegiatan berhasil dibuat.",
          error: (err) => (err instanceof Error ? err.message : "Gagal menyimpan kegiatan."),
        },
      );
      await refresh();
      setShowCreate(false);
    } catch {
      // Error sudah ditampilkan lewat toast.
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    try {
      await toast.promise(
        api(`/api/kegiatan/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            namaKegiatan: editNama.trim(),
            deskripsi: editDeskripsi.trim() || undefined,
            status: editStatus,
          }),
        }),
        {
          loading: "Menyimpan perubahan...",
          success: "Kegiatan berhasil diperbarui.",
          error: (err) => (err instanceof Error ? err.message : "Gagal menyimpan kegiatan."),
        },
      );
      await refresh();
      setEditing(null);
    } catch {
      // Error sudah ditampilkan lewat toast.
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleStatus(item: KegiatanListItem) {
    try {
      await toast.promise(
        item.status === "aktif"
          ? api(`/api/kegiatan/${item.id}`, { method: "DELETE" })
          : api(`/api/kegiatan/${item.id}`, {
              method: "PATCH",
              body: JSON.stringify({ status: "aktif" }),
            }),
        {
          loading: item.status === "aktif" ? "Menonaktifkan kegiatan..." : "Mengaktifkan kegiatan...",
          success:
            item.status === "aktif"
              ? "Kegiatan berhasil dinonaktifkan."
              : "Kegiatan berhasil diaktifkan.",
          error: (err) => (err instanceof Error ? err.message : "Gagal mengubah status."),
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
          <h1 className="text-2xl font-semibold text-ink">Kegiatan Absensi</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Buat kegiatan, daftarkan santri, lalu catat kehadiran per pertemuan.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden />
          Tambah Kegiatan
        </Button>
      </div>

      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Tambah Kegiatan"
        footer={
          <div className="flex gap-3">
            <Button type="submit" form="form-kegiatan" disabled={saving} className="flex-1">
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
              Batal
            </Button>
          </div>
        }
      >
        <form id="form-kegiatan" onSubmit={handleCreate} className="space-y-4">
          <Field label="Nama Kegiatan" htmlFor="nama-kegiatan">
            <Input
              id="nama-kegiatan"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="mis. Kajian Rutin Sabtu"
            />
          </Field>
          <Field label="Deskripsi" htmlFor="deskripsi-kegiatan">
            <Textarea
              id="deskripsi-kegiatan"
              rows={2}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Keterangan singkat (opsional)"
            />
          </Field>
          <Field
            label="Tanggal Pertemuan Pertama"
            htmlFor="tanggal-pertama"
            hint="Sesi pertama dibuat otomatis. Tambah sesi berikutnya dari halaman detail."
          >
            <Input
              id="tanggal-pertama"
              type="date"
              required
              value={tanggalPertama}
              onChange={(e) => setTanggalPertama(e.target.value)}
            />
          </Field>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-ink">Peserta</span>
            <PesertaPicker allSantri={allSantri} selected={pesertaIds} onChange={setPesertaIds} />
          </div>
        </form>
      </Dialog>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit Kegiatan"
        footer={
          <div className="flex gap-3">
            <Button type="submit" form="form-kegiatan-edit" disabled={savingEdit} className="flex-1">
              {savingEdit ? "Menyimpan..." : "Simpan"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Batal
            </Button>
          </div>
        }
      >
        <form id="form-kegiatan-edit" onSubmit={handleEdit} className="space-y-4">
          <Field label="Nama Kegiatan" htmlFor="edit-nama-kegiatan">
            <Input
              id="edit-nama-kegiatan"
              required
              value={editNama}
              onChange={(e) => setEditNama(e.target.value)}
            />
          </Field>
          <Field label="Deskripsi" htmlFor="edit-deskripsi-kegiatan">
            <Textarea
              id="edit-deskripsi-kegiatan"
              rows={2}
              value={editDeskripsi}
              onChange={(e) => setEditDeskripsi(e.target.value)}
            />
          </Field>
          <Field label="Status" htmlFor="edit-status-kegiatan">
            <Select
              id="edit-status-kegiatan"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as "aktif" | "nonaktif")}
            >
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </Select>
          </Field>
        </form>
      </Dialog>

      {items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-secondary">
          Belum ada kegiatan. Klik “Tambah Kegiatan” untuk membuat yang pertama.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CalendarCheck className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{item.namaKegiatan}</p>
                    <p className="text-sm text-ink-secondary">
                      {item.jumlahPeserta} peserta • {item.jumlahSesi} sesi •{" "}
                      {formatTanggal(item.tanggalTerakhir)}
                    </p>
                    {item.deskripsi ? (
                      <p className="mt-1 line-clamp-2 text-sm text-ink-secondary">
                        {item.deskripsi}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Badge variant={item.status === "aktif" ? "success" : "secondary"}>
                  {item.status === "aktif" ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <ButtonLink href={`${basePath}/${item.id}`} variant="secondary" size="sm">
                  Kelola
                </ButtonLink>
                <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(item)}>
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
