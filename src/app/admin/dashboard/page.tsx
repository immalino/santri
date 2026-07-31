import { Card } from "@/components/ui/card";

const stats = [
  { label: "Total Santri", value: "—" },
  { label: "Total Kitab", value: "—" },
  { label: "Rata-rata Progress", value: "—" },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Rekap santri & kitab akan tampil di sini (Fase 4).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <p className="text-sm text-ink-secondary">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{stat.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
