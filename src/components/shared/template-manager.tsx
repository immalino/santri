"use client";

import { useRef, useState, type FormEvent } from "react";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, Textarea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { VARIABLE_CATALOG, findUnknownVars } from "@/lib/laporan-template";
import type { KegiatanTemplateItem } from "@/lib/absensi-stats";

/**
 * Kelola template laporan teks satu kegiatan (N template per kegiatan).
 * Editor memakai Dialog existing + contekan variabel klik-untuk-sisip.
 */
export function TemplateManager({
  kegiatanId,
  initialTemplates,
}: {
  kegiatanId: string;
  initialTemplates: KegiatanTemplateItem[];
}) {
  const toast = useToast();
  const [items, setItems] = useState<KegiatanTemplateItem[]>(initialTemplates);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nama, setNama] = useState("");
  const [isi, setIsi] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const isiRef = useRef<HTMLTextAreaElement>(null);

  const unknown = findUnknownVars(isi);

  async function refresh() {
    setItems(await api<KegiatanTemplateItem[]>(`/api/kegiatan/${kegiatanId}/template`));
  }

  function openCreate() {
    setEditingId(null);
    setNama("");
    setIsi("");
    setShowForm(true);
  }

  function openEdit(t: KegiatanTemplateItem) {
    setEditingId(t.id);
    setNama(t.nama);
    setIsi(t.isi);
    setShowForm(true);
  }

  function insertVar(name: string) {
    const el = isiRef.current;
    const token = `{{${name}}}`;
    if (!el) {
      setIsi((v) => (v ? `${v} ${token}` : token));
      return;
    }
    const start = el.selectionStart ?? isi.length;
    const end = el.selectionEnd ?? isi.length;
    const next = `${isi.slice(0, start)}${token}${isi.slice(end)}`;
    setIsi(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { nama: nama.trim(), isi: isi.trim() };
      await toast.promise(
        editingId
          ? api(`/api/kegiatan/${kegiatanId}/template/${editingId}`, {
              method: "PATCH",
              body: JSON.stringify(payload),
            })
          : api(`/api/kegiatan/${kegiatanId}/template`, {
              method: "POST",
              body: JSON.stringify(payload),
            }),
        {
          loading: "Menyimpan template...",
          success: editingId ? "Template berhasil diperbarui." : "Template berhasil dibuat.",
          error: (err) => (err instanceof Error ? err.message : "Gagal menyimpan template."),
        },
      );
      await refresh();
      setShowForm(false);
    } catch {
      // Error sudah ditampilkan lewat toast.
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    try {
      await toast.promise(api(`/api/kegiatan/${kegiatanId}/template/${id}`, { method: "DELETE" }), {
        loading: "Menghapus template...",
        success: "Template berhasil dihapus.",
        error: (err) => (err instanceof Error ? err.message : "Gagal menghapus template."),
      });
      await refresh();
    } catch {
      // Error sudah ditampilkan lewat toast.
    }
  }

  return (
    <section aria-label="Template laporan" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Template Laporan</h2>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden />
          Tambah Template
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-secondary">
          Belum ada template. Klik “Tambah Template” untuk membuat laporan per sesi, mingguan, dll.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((t) => (
            <Card key={t.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{t.nama}</p>
                  <p className="line-clamp-2 text-sm text-ink-secondary">{t.isi}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(t)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(t.id)}
                  className={confirmDeleteId === t.id ? "text-danger" : undefined}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  {confirmDeleteId === t.id ? "Yakin? Klik lagi" : "Hapus"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? "Edit Template" : "Tambah Template"}
        footer={
          <div className="flex gap-3">
            <Button type="submit" form="form-template" disabled={saving} className="flex-1">
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Batal
            </Button>
          </div>
        }
      >
        <form id="form-template" onSubmit={handleSave} className="space-y-4">
          <Field label="Nama Template" htmlFor="nama-template">
            <Input
              id="nama-template"
              required
              maxLength={120}
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="mis. Laporan per sesi"
            />
          </Field>
          <Field label="Isi Template" htmlFor="isi-template" hint="Tulis bebas, pakai {{nama_variabel}} untuk data otomatis.">
            <Textarea
              id="isi-template"
              ref={isiRef}
              rows={8}
              required
              value={isi}
              onChange={(e) => setIsi(e.target.value)}
              placeholder={"Contoh:\n{{nama_kegiatan}} — {{tanggal_panjang}}\nHadir {{jumlah_hadir}} dari {{total_peserta}} ({{persen_hadir}})\n{{daftar_hadir}}"}
            />
          </Field>
          {unknown.length > 0 ? (
            <p className="text-sm text-warning" role="alert">
              Variabel tak dikenal: {unknown.map((v) => `{{${v}}}`).join(", ")} — akan tampil apa adanya di laporan.
            </p>
          ) : null}
          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">Variabel — klik untuk menyisipkan</p>
            <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border bg-surface p-2">
              {VARIABLE_CATALOG.map((v) => (
                <li key={v.name}>
                  <button
                    type="button"
                    onClick={() => insertVar(v.name)}
                    className="flex min-h-[44px] w-full flex-col items-start justify-center gap-0.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-background"
                  >
                    <span className="font-mono text-xs font-semibold text-primary">{`{{${v.name}}}`}</span>
                    <span className="text-xs text-ink-secondary">{v.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
