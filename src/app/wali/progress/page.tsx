import { Card } from "@/components/ui/card";

export default function WaliProgressPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Progress</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Progress anak per kitab dan per halaman (Fase 6).
        </p>
      </div>

      <Card className="p-6">
        <p className="text-sm text-ink-secondary">
          Progress santri beserta rincian per halaman akan tampil di sini pada
          Fase 6.
        </p>
      </Card>
    </div>
  );
}
