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

/** Satu rentang halaman kitab yang dimiliki satu kelas (JSON-serializable). */
export interface KitabBagianItem {
  id: string;
  kelasId: string;
  kelasNama: string | null;
  halamanDari: number;
  halamanSampai: number;
}

/** Kitab row shared by the server page and this manager (JSON-serializable). */
export interface KitabItem {
  id: string;
  namaKitab: string;
  jumlahHalaman: number;
  deskripsi: string | null;
  status: "aktif" | "nonaktif";
  kelasId: string | null;
  kelasNama: string | null;
  bagian: KitabBagianItem[];
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
 * Editor rentang per kartu kitab (Task 7). Menampilkan daftar bagian +
 * form inline (dua Input number + Select kelas + Simpan/Hapus) lewat
 * HTTP API Task 2. Tidak mengimpor internals route (ledger ruling).
 */
function BagianEditor({
  kitab,
  kelasOptions,
  onChanged,
}: {
  kitab: KitabItem;
  kelasOptions: { id: string; namaKelas: string; urutan: number }[];
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const [kelasId, setKelasId] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      await toast.promise(
        api(`/api/kitab/${kitab.id}/bagian`, {
          method: "POST",
          body: JSON.stringify({
            kelasId,
            halamanDari: Number(dari),
            halamanSampai: Number(sampai),
          }),
        }),
        {
          loading: "Menambahkan bagian...",
          success: "Bagian berhasil ditambahkan.",
          error: (err) => (err instanceof Error ? err.message : "Gagal menambahkan bagian."),
        },
      );
      setDari("");
      setSampai("");
      await onChanged();
    } catch {
      // Error sudah ditampilkan lewat toast (termasuk
      // "Rentang bertabrakan dengan bagian lain kitab ini.").
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(bagianId: string) {
    try {
      await toast.promise(api(`/api/kitab/bagian/${bagianId}`, { method: "DELETE" }), {
        loading: "Menghapus bagian...",
        success: "Bagian berhasil dihapus.",
        error: (err) => (err instanceof Error ? err.message : "Gagal menghapus bagian."),
      });
      await onChanged();
    } catch {
      // Error sudah ditampilkan lewat toast.
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-3">
      <p className="text-sm font-medium text-ink">Bagian per kelas</p>
      {kitab.bagian.length === 0 ? (
        <p className="text-xs text-ink-secondary">
          Belum ada bagian. Tambahkan rentang halaman per kelas di bawah.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {kitab.bagian.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs"
            >
              <span className="min-w-0 truncate text-ink">
                hal {b.halamanDari}–{b.halamanSampai} • {b.kelasNama ?? "Kelas dihapus"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(b.id)}
              >
                Hapus
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleAdd} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Dari" htmlFor={`bagian-dari-${kitab.id}`}>
            <Input
              id={`bagian-dari-${kitab.id}`}
              type="number"
              min={1}
              max={kitab.jumlahHalaman}
              step={1}
              required
              value={dari}
              onChange={(e) => setDari(e.target.value)}
              placeholder="1"
            />
          </Field>
          <Field label="Sampai" htmlFor={`bagian-sampai-${kitab.id}`}>
            <Input
              id={`bagian-sampai-${kitab.id}`}
              type="number"
              min={1}
              max={kitab.jumlahHalaman}
              step={1}
              required
              value={sampai}
              onChange={(e) => setSampai(e.target.value)}
              placeholder={String(kitab.jumlahHalaman)}
            />
          </Field>
        </div>
        <Field label="Kelas" htmlFor={`bagian-kelas-${kitab.id}`}>
          <Select
            id={`bagian-kelas-${kitab.id}`}
            value={kelasId}
            onChange={(e) => setKelasId(e.target.value)}
          >
            <option value="">Pilih kelas</option>
            {kelasOptions.map((k) => (
              <option key={k.id} value={k.id}>
                {k.namaKelas} (urutan {k.urutan})
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" size="sm" disabled={saving || !kelasId || !dari || !sampai}>
          {saving ? "Menyimpan..." : "Simpan"}
        </Button>
      </form>
    </div>
  );
}

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
    const rows = await api<
      (Omit<KitabItem, "bagian"> & {
        bagian?: KitabBagianItem[];
        kelas?: { namaKelas: string } | null;
      })[]
    >("/api/kitab");
    // GET /api/kitab returns kelasId without the joined kelas name and
    // without bagian, so re-attach names from the page-level options and
    // fetch each kitab's rentang via the Task 2 bagian API (HTTP only).
    const withBagian = await Promise.all(
      rows.map(async (r) => {
        const kelasNama = r.kelasId
          ? (kelasOptions.find((k) => k.id === r.kelasId)?.namaKelas ?? r.kelasNama ?? null)
          : null;
        let bagian: KitabBagianItem[];
        try {
          const bRows = await api<
            {
              id: string;
              kelasId: string;
              halamanDari: number;
              halamanSampai: number;
              kelas?: { namaKelas: string } | null;
            }[]
          >(`/api/kitab/${r.id}/bagian`);
          bagian = bRows
            .map((b) => ({
              id: b.id,
              kelasId: b.kelasId,
              kelasNama:
                kelasOptions.find((k) => k.id === b.kelasId)?.namaKelas ??
                b.kelas?.namaKelas ??
                null,
              halamanDari: b.halamanDari,
              halamanSampai: b.halamanSampai,
            }))
            .sort((a, b) => a.halamanDari - b.halamanDari);
        } catch {
          // Bila fetch bagian gagal, pertahankan bagian yang sudah ada.
          bagian = (r.bagian ?? [])
            .map((b) => ({
              ...b,
              kelasNama:
                kelasOptions.find((k) => k.id === b.kelasId)?.namaKelas ??
                b.kelasNama ??
                null,
            }))
            .sort((a, b) => a.halamanDari - b.halamanDari);
        }
        return {
          id: r.id,
          namaKitab: r.namaKitab,
          jumlahHalaman: r.jumlahHalaman,
          deskripsi: r.deskripsi,
          status: r.status,
          kelasId: r.kelasId,
          kelasNama,
          bagian,
        };
      }),
    );
    setKitabs(withBagian);
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
                {item.bagian.length === 0 && item.kelasNama ? (
                  <Badge variant="success">{item.kelasNama}</Badge>
                ) : null}
              </div>
              {item.bagian.length > 0 ? (
                <p className="text-xs text-ink-secondary">Diatur per bagian di bawah</p>
              ) : null}

              <BagianEditor kitab={item} kelasOptions={kelasOptions} onChanged={refresh} />

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
