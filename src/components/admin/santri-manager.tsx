"use client";

import { useState, type FormEvent } from "react";
import { Eye, Pencil, Plus, Power, School, Settings2, UserRound } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";

/** Santri row shared by the server page and this manager. */
export interface SantriItem {
  id: string;
  nama: string;
  kelasId: string | null;
  kelasNama: string | null;
  statusAktif: boolean;
  kategoriUsia: "pra_remaja" | "remaja" | "pra_nikah" | null;
  jenisKelamin: "laki_laki" | "perempuan" | null;
}

/** Kelas option for the form select. */
export interface KelasOption {
  id: string;
  namaKelas: string;
}

interface SantriForm {
  nama: string;
  kelasId: string;
  statusAktif: boolean;
  kategoriUsia: string;
  jenisKelamin: string;
}

const KATEGORI_USIA_OPTIONS = [
  { value: "pra_remaja", label: "Pra-remaja" },
  { value: "remaja", label: "Remaja" },
  { value: "pra_nikah", label: "Pra-nikah" },
] as const;

const JENIS_KELAMIN_OPTIONS = [
  { value: "laki_laki", label: "Laki-laki" },
  { value: "perempuan", label: "Perempuan" },
] as const;

function kategoriUsiaLabel(value: SantriItem["kategoriUsia"]): string {
  return KATEGORI_USIA_OPTIONS.find((o) => o.value === value)?.label ?? "Usia belum diisi";
}

function jenisKelaminLabel(value: SantriItem["jenisKelamin"]): string {
  return JENIS_KELAMIN_OPTIONS.find((o) => o.value === value)?.label ?? "Belum diisi";
}

/**
 * Santri management (tasks 4.8–4.9). Create/edit via the admin API; delete is
 * a soft deactivate (`status_aktif: false`) so records keep their relations.
 */
export default function SantriManager({
  initialSantris,
  initialKelas,
}: {
  initialSantris: SantriItem[];
  initialKelas: KelasOption[];
}) {
  const toast = useToast();
  const [santris, setSantris] = useState<SantriItem[]>(initialSantris);
  const [form, setForm] = useState<SantriForm>({
    nama: "",
    kelasId: "",
    statusAktif: true,
    kategoriUsia: "",
    jenisKelamin: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setSantris(await api<SantriItem[]>("/api/santri"));
  }

  function openCreate() {
    setEditingId(null);
    setForm({ nama: "", kelasId: "", statusAktif: true, kategoriUsia: "", jenisKelamin: "" });
    setShowForm(true);
  }

  function openEdit(item: SantriItem) {
    setEditingId(item.id);
    setForm({
      nama: item.nama,
      kelasId: item.kelasId ?? "",
      statusAktif: item.statusAktif,
      kategoriUsia: item.kategoriUsia ?? "",
      jenisKelamin: item.jenisKelamin ?? "",
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
      nama: form.nama.trim(),
      kelasId: form.kelasId ? form.kelasId : null,
      ...(editingId ? { statusAktif: form.statusAktif } : {}),
      kategoriUsia: form.kategoriUsia ? form.kategoriUsia : null,
      ...(form.jenisKelamin
        ? { jenisKelamin: form.jenisKelamin }
        : editingId
          ? { jenisKelamin: null }
          : {}),
    };
    try {
      await toast.promise(
        editingId
          ? api(`/api/santri/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) })
          : api("/api/santri", { method: "POST", body: JSON.stringify(payload) }),
        {
          loading: "Menyimpan santri...",
          success: editingId ? "Santri berhasil diperbarui." : "Santri berhasil ditambahkan.",
          error: (err) => (err instanceof Error ? err.message : "Gagal menyimpan santri."),
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

  /** Nonaktifkan via DELETE (soft deactivate), Aktifkan via PATCH statusAktif. */
  async function toggleStatus(item: SantriItem) {
    try {
      await toast.promise(
        item.statusAktif
          ? api(`/api/santri/${item.id}`, { method: "DELETE" })
          : api(`/api/santri/${item.id}`, {
              method: "PATCH",
              body: JSON.stringify({ statusAktif: true }),
            }),
        {
          loading: item.statusAktif ? "Menonaktifkan santri..." : "Mengaktifkan santri...",
          success:
            item.statusAktif
              ? "Santri berhasil dinonaktifkan."
              : "Santri berhasil diaktifkan.",
          error: (err) => (err instanceof Error ? err.message : "Gagal mengubah status santri."),
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
          <h1 className="text-2xl font-semibold text-ink">Kelola Santri</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Daftar santri beserta kelas, kategori usia, jenis kelamin, dan status aktif.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/admin/kelas" variant="secondary">
            <Settings2 className="h-4 w-4" aria-hidden />
            Kelola Kelas
          </ButtonLink>
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Tambah Santri
          </Button>
        </div>
      </div>

      {/* Create/edit form lives in a modal (DESIGN.md §5) so it stays reachable
          without scrolling back to the top of a long santri list. */}
      <Dialog
        open={showForm}
        onClose={cancelForm}
        title={editingId ? "Edit Santri" : "Tambah Santri"}
        footer={
          <div className="flex gap-3">
            <Button type="submit" form="form-santri" disabled={loading} className="flex-1">
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
            <Button type="button" variant="secondary" onClick={cancelForm}>
              Batal
            </Button>
          </div>
        }
      >
        <form id="form-santri" onSubmit={handleSave} className="space-y-4">
          <Field label="Nama Santri" htmlFor="nama-santri">
            <Input
              id="nama-santri"
              required
              value={form.nama}
              onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
              placeholder="Nama lengkap santri"
            />
          </Field>

          <Field label="Kelas" htmlFor="kelas-santri">
            <Select
              id="kelas-santri"
              value={form.kelasId}
              onChange={(e) => setForm((f) => ({ ...f, kelasId: e.target.value }))}
            >
              <option value="">Tanpa kelas</option>
              {initialKelas.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.namaKelas}
                </option>
              ))}
            </Select>
          </Field>

          {editingId && (
            <Field label="Status" htmlFor="status-santri">
              <Select
                id="status-santri"
                value={form.statusAktif ? "aktif" : "nonaktif"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, statusAktif: e.target.value === "aktif" }))
                }
              >
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </Select>
            </Field>
          )}

          <Field label="Kategori Usia" htmlFor="usia-santri" hint="Opsional — data lama boleh tetap kosong.">
            <Select
              id="usia-santri"
              value={form.kategoriUsia}
              onChange={(e) => setForm((f) => ({ ...f, kategoriUsia: e.target.value }))}
            >
              <option value="">Belum diisi</option>
              {KATEGORI_USIA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Jenis Kelamin" htmlFor="gender-santri">
            <Select
              id="gender-santri"
              required={!editingId}
              value={form.jenisKelamin}
              onChange={(e) => setForm((f) => ({ ...f, jenisKelamin: e.target.value }))}
            >
              <option value="">Pilih jenis kelamin</option>
              {JENIS_KELAMIN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Dialog>

      {santris.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-secondary">
          Belum ada santri. Klik “Tambah Santri” untuk menambah.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {santris.map((item) => (
            <Card key={item.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UserRound className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{item.nama}</p>
                    <p className="flex items-center gap-1 text-sm text-ink-secondary">
                      <School className="h-3.5 w-3.5" aria-hidden />
                      {item.kelasNama ?? "Tanpa kelas"}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="secondary">{kategoriUsiaLabel(item.kategoriUsia)}</Badge>
                      <Badge variant="secondary">{jenisKelaminLabel(item.jenisKelamin)}</Badge>
                    </p>
                  </div>
                </div>
                <Badge variant={item.statusAktif ? "success" : "secondary"}>
                  {item.statusAktif ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <ButtonLink href={`/admin/santri/${item.id}`} variant="secondary" size="sm">
                  <Eye className="h-4 w-4" aria-hidden />
                  Lihat Detail
                </ButtonLink>
                <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(item)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => toggleStatus(item)}>
                  <Power className="h-4 w-4" aria-hidden />
                  {item.statusAktif ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}