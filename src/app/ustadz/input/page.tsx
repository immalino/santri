import { Card } from "@/components/ui/card";

export default function UstadzInputPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Input Nilai</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Nilai pencapaian santri per halaman per kitab (Fase 5).
        </p>
      </div>

      <Card className="p-6">
        <p className="text-sm text-ink-secondary">
          Pilih santri → pilih kitab → isi persentase tiap halaman. Form penilaian
          akan dibangun di Fase 5.
        </p>
      </Card>
    </div>
  );
}
