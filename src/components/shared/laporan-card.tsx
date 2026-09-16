"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { buildLaporanContext, renderTemplate } from "@/lib/laporan-template";
import type { KegiatanTemplateItem, SesiAbsensiData } from "@/lib/absensi-stats";

/**
 * Laporan teks satu sesi: dropdown template → preview → Salin.
 * Render murni di browser dari data sesi yang sudah ada.
 */
export function LaporanCard({
  sesi,
  templates,
  detailHref,
}: {
  sesi: SesiAbsensiData;
  templates: KegiatanTemplateItem[];
  detailHref: string;
}) {
  const toast = useToast();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [copied, setCopied] = useState(false);

  const template = templates.find((t) => t.id === templateId) ?? templates[0] ?? null;

  const { text, unknownVars } = useMemo(() => {
    if (!template) return { text: "", unknownVars: [] as string[] };
    const ctx = buildLaporanContext(sesi, sesi.totalSesi);
    return renderTemplate(template.isi, ctx);
  }, [template, sesi]);

  async function handleCopy() {
    if (!text) {
      toast.error("Laporan kosong — tidak ada yang bisa disalin.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Laporan tersalin. Tempel ke WA/grup.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin otomatis. Teks sudah diseleksi — salin manual.");
      const el = document.getElementById("laporan-preview");
      const range = document.createRange();
      if (el) {
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  return (
    <Card className="space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Laporan</h2>
        {template ? (
          <Button type="button" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? "Tersalin!" : "Salin Laporan"}
          </Button>
        ) : null}
      </div>

      {templates.length === 0 || !template ? (
        <p className="text-sm text-ink-secondary">
          Belum ada template. <Link className="font-medium text-primary underline" href={detailHref}>Buat template di detail kegiatan.</Link>
        </p>
      ) : (
        <>
          <Select
            value={template.id}
            onChange={(e) => setTemplateId(e.target.value)}
            aria-label="Pilih template laporan"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.nama}</option>
            ))}
          </Select>
          {unknownVars.length > 0 ? (
            <p className="text-sm text-warning" role="alert">
              Variabel tak dikenal: {unknownVars.map((v) => `{{${v}}}`).join(", ")} — tampil apa adanya.
            </p>
          ) : null}
          <pre
            id="laporan-preview"
            className="max-h-96 overflow-y-auto rounded-xl border border-border bg-background p-4 text-sm whitespace-pre-wrap text-ink"
          >
            {text}
          </pre>
        </>
      )}
    </Card>
  );
}
