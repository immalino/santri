"use client";

import { useState, type FormEvent } from "react";
import { CalendarDays, ClipboardCheck, Pencil, Plus, Trash2, Users } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { BackLink } from "@/components/shared/back-link";
import { PesertaPicker, type PickerSantri } from "@/components/shared/peserta-picker";
import type { KegiatanDetail } from "@/lib/absensi-stats";

function dateStr(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function formatTanggal(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

interface SesiForm {
  tanggal: string;
  judul: string;
  catatan: string;
}

/**
 * Kegiatan detail (Fase 10): edit peserta + manage sesi. Shared by the admin
 * and ustadz detail pages — only `basePath` differs.
 */
export function KegiatanDetailManager({
  initialDetail,
  allSantri,
  basePath,
}: {
  initialDetail: KegiatanDetail;
  allSantri: PickerSantri[];
  basePath: string;
}) {
  const toast = useToast();
  const [detail, setDetail] = useState<KegiatanDetail>(initialDetail);

  const [pesertaIds, setPesertaIds] = useState<string[]>(
    initialDetail.peserta.map((p) => p.santriId),
  );
  const [savingPeserta, setSavingPeserta] = useState(false);
  const [showPesertaDialog, setShowPesertaDialog] = useState(false);
  const pesertaDirty =
    pesertaIds.length !== detail.peserta.length ||
    pesertaIds.some((id) => !detail.peserta.some((p) => p.santriId === id));

  const previewNames = detail.peserta.slice(0, 5).map((p) => p.nama);
  const remainingPeserta = detail.peserta.length - previewNames.length;

  const [showSesiForm, setShowSesiForm] = useState(false);
  const [editingSesiId, setEditingSesiId] = useState<string | null>(null);
  const [sesiForm, setSesiForm] = useState<SesiForm>({
    tanggal: new Date().toISOString().slice(0, 10),
    judul: "",
    catatan: "",
  });
  const [savingSesi, setSavingSesi] = useState(false);
  const [confirmDeleteSesi, setConfirmDeleteSesi] = useState<string | null>(null);

  async function refresh() {
    const fresh = await api<KegiatanDetail>(`/api/kegiatan/${detail.id}`);
    setDetail(fresh);
    setPesertaIds(fresh.peserta.map((p) => p.santriId));
  }

  async function handleSavePeserta() {
    setSavingPeserta(true);
    try {
      await toast.promise(
        api(`/api/kegiatan/${detail.id}/peserta`, {
          method: "PUT",
          body: JSON.stringify({ santriIds: pesertaIds }),
        }),
        {
          loading: "Menyimpan peserta...",
          success: "Peserta berhasil diperbarui.",
          error: (err) => (err instanceof Error ? err.message : "Gagal menyimpan peserta."),
        },
      );
      await refresh();
      setShowPesertaDialog(false);
    } catch {
      // Error sudah ditampilkan lewat toast.
    } finally {
      setSavingPeserta(false);
    }
  }

  function openPesertaDialog() {
    setPesertaIds(detail.peserta.map((p) => p.santriId));
    setShowPesertaDialog(true);
  }

  function closePesertaDialog() {
    setShowPesertaDialog(false);
    setPesertaIds(detail.peserta.map((p) => p.santriId));
  }

  function openCreateSesi() {
    setEditingSesiId(null);
    setSesiForm({
      tanggal: new Date().toISOString().slice(0, 10),
      judul: "",
      catatan: "",
    });
    setShowSesiForm(true);
  }

  function openEditSesi(sesiId: string) {
    const sesi = detail.sesi.find((s) => s.id === sesiId);
    if (!sesi) return;
    setEditingSesiId(sesiId);
    setSesiForm({
      tanggal: dateStr(sesi.tanggal),
      judul: sesi.judul ?? "",
      catatan: sesi.catatan ?? "",
    });
    setShowSesiForm(true);
  }

  async function handleSaveSesi(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingSesi(true);
    const payload = {
      tanggal: sesiForm.tanggal,
      judul: sesiForm.judul.trim() || undefined,
      catatan: sesiForm.catatan.trim() || undefined,
    };
    try {
      await toast.promise(
        editingSesiId
          ? api(`/api/kegiatan/${detail.id}/sesi/${editingSesiId}`, {
              method: "PATCH",
              body: JSON.stringify(payload),
            })
          : api(`/api/kegiatan/${detail.id}/sesi`, {
              method: "POST",
              body: JSON.stringify(payload),
            }),
        {
          loading: "Menyimpan sesi...",
          success: editingSesiId ? "Sesi berhasil diperbarui." : "Sesi berhasil ditambahkan.",
          error: (err) => (err instanceof Error ? err.message : "Gagal menyimpan sesi."),
        },
      );
      await refresh();
      setShowSesiForm(false);
    } catch {
      // Error sudah ditampilkan lewat toast.
    } finally {
      setSavingSesi(false);
    }
  }

  async function handleDeleteSesi(sesiId: string) {
    if (confirmDeleteSesi !== sesiId) {
      setConfirmDeleteSesi(sesiId);
      return;
    }
    setConfirmDeleteSesi(null);
    try {
      await toast.promise(api(`/api/kegiatan/${detail.id}/sesi/${sesiId}`, { method: "DELETE" }), {
        loading: "Menghapus sesi...",
        success: "Sesi berhasil dihapus.",
        error: (err) => (err instanceof Error ? err.message : "Gagal menghapus sesi."),
      });
      await refresh();
    } catch {
      // Error sudah ditampilkan lewat toast.
    }
  }

  return (
    <div className="space-y-6">
      <BackLink href={basePath} />

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-ink">{detail.namaKegiatan}</h1>
            {detail.deskripsi ? (
              <p className="mt-1 text-sm text-ink-secondary">{detail.deskripsi}</p>
            ) : null}
            <p className="mt-1 text-sm text-ink-secondary">
              {detail.peserta.length} peserta • {detail.sesi.length} sesi
            </p>
          </div>
          <Badge variant={detail.status === "aktif" ? "success" : "secondary"}>
            {detail.status === "aktif" ? "Aktif" : "Nonaktif"}
          </Badge>
        </div>
      </Card>

      <section aria-label="Peserta kegiatan" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Peserta</h2>
          <Button type="button" size="sm" onClick={openPesertaDialog}>
            <Users className="h-4 w-4" aria-hidden />
            Kelola Peserta
          </Button>
        </div>
        <Card className="p-5">
          {detail.peserta.length === 0 ? (
            <p className="text-sm text-ink-secondary">
              Belum ada peserta. Klik Kelola Peserta untuk menambahkan.
            </p>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium text-ink">
                {detail.peserta.length} santri terdaftar
              </p>
              <p className="text-sm text-ink-secondary">
                {previewNames.join(", ")}
                {remainingPeserta > 0 ? ` +${remainingPeserta} lainnya` : ""}
              </p>
            </div>
          )}
        </Card>
      </section>

      <section aria-label="Sesi kegiatan" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Sesi Pertemuan</h2>
          <Button type="button" size="sm" onClick={openCreateSesi}>
            <Plus className="h-4 w-4" aria-hidden />
            Tambah Sesi
          </Button>
        </div>

        {detail.sesi.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-secondary">Belum ada sesi.</Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {detail.sesi.map((s) => (
              <Card key={s.id} className="flex flex-col gap-3 p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CalendarDays className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{formatTanggal(s.tanggal)}</p>
                    {s.judul ? <p className="text-sm text-ink">{s.judul}</p> : null}
                    {s.catatan ? (
                      <p className="line-clamp-2 text-sm text-ink-secondary">{s.catatan}</p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-ink-secondary">
                      {s.jumlahHadir} hadir • {s.jumlahDiabsen} terdata
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink
                    href={`${basePath}/${detail.id}/sesi/${s.id}`}
                    variant="secondary"
                    size="sm"
                  >
                    <ClipboardCheck className="h-4 w-4" aria-hidden />
                    Isi Absensi
                  </ButtonLink>
                  <Button type="button" variant="ghost" size="sm" onClick={() => openEditSesi(s.id)}>
                    <Pencil className="h-4 w-4" aria-hidden />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSesi(s.id)}
                    className={confirmDeleteSesi === s.id ? "text-danger" : undefined}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    {confirmDeleteSesi === s.id ? "Yakin? Klik lagi" : "Hapus"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Dialog
        open={showPesertaDialog}
        onClose={closePesertaDialog}
        title={`Kelola Peserta — ${detail.namaKegiatan}`}
        footer={
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={handleSavePeserta}
              disabled={!pesertaDirty || savingPeserta}
              className="flex-1"
            >
              {savingPeserta ? "Menyimpan..." : "Simpan Peserta"}
            </Button>
            <Button type="button" variant="secondary" onClick={closePesertaDialog}>
              Batal
            </Button>
          </div>
        }
      >
        <PesertaPicker allSantri={allSantri} selected={pesertaIds} onChange={setPesertaIds} />
      </Dialog>

      <Dialog
        open={showSesiForm}
        onClose={() => setShowSesiForm(false)}
        title={editingSesiId ? "Edit Sesi" : "Tambah Sesi"}
        footer={
          <div className="flex gap-3">
            <Button type="submit" form="form-sesi" disabled={savingSesi} className="flex-1">
              {savingSesi ? "Menyimpan..." : "Simpan"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowSesiForm(false)}>
              Batal
            </Button>
          </div>
        }
      >
        <form id="form-sesi" onSubmit={handleSaveSesi} className="space-y-4">
          <Field label="Tanggal" htmlFor="tanggal-sesi">
            <Input
              id="tanggal-sesi"
              type="date"
              required
              value={sesiForm.tanggal}
              onChange={(e) => setSesiForm((f) => ({ ...f, tanggal: e.target.value }))}
            />
          </Field>
          <Field label="Judul" htmlFor="judul-sesi" hint="Opsional, mis. Pertemuan 2.">
            <Input
              id="judul-sesi"
              value={sesiForm.judul}
              onChange={(e) => setSesiForm((f) => ({ ...f, judul: e.target.value }))}
              placeholder="Judul sesi (opsional)"
            />
          </Field>
          <Field label="Catatan" htmlFor="catatan-sesi">
            <Textarea
              id="catatan-sesi"
              rows={2}
              value={sesiForm.catatan}
              onChange={(e) => setSesiForm((f) => ({ ...f, catatan: e.target.value }))}
              placeholder="Catatan sesi (opsional)"
            />
          </Field>
        </form>
      </Dialog>
    </div>
  );
}
