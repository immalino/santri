import Link from "next/link";
import { BookOpen, TrendingUp, UserRound } from "lucide-react";
import { requireRole } from "@/lib/permissions";
import { getAdminRecap } from "@/lib/admin-stats";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";

export const metadata = {
  title: "Dashboard | Sistem Pendataan Pencapaian Santri",
};

function progressVariant(progress: number): "danger" | "warning" | "success" | "accent" {
  if (progress >= 75) return "success";
  if (progress >= 40) return "warning";
  if (progress > 0) return "danger";
  return "accent";
}

/** Admin dashboard (tasks 4.14–4.15). Rendered fully server-side. */
export default async function AdminDashboardPage() {
  await requireRole(["admin"]);
  const recap = await getAdminRecap();

  const stats = [
    { label: "Total Santri Aktif", value: recap.totalSantriAktif, icon: UserRound },
    { label: "Total Kitab", value: recap.totalKitab, icon: BookOpen },
    { label: "Rata-rata Progress", value: `${recap.rataRataProgress}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-secondary">Rekap pencapaian seluruh santri.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-ink-secondary">{stat.label}</p>
                <p className="text-2xl font-semibold text-ink">{stat.value}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">Progress per Santri</h2>
          {recap.santriProgress.length === 0 ? (
            <Card className="p-6 text-center text-sm text-ink-secondary">
              Belum ada santri aktif.
            </Card>
          ) : (
            recap.santriProgress.map((s) => (
              <Link
                key={s.santriId}
                href={`/admin/santri/${s.santriId}`}
                className="block rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-background"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{s.nama}</p>
                    <p className="text-xs text-ink-secondary">{s.kelasNama ?? "Tanpa kelas"}</p>
                  </div>
                  <Badge variant={progressVariant(s.progress)}>{s.progress}%</Badge>
                </div>
                <ProgressBar value={s.progress} showLabel={false} />
              </Link>
            ))
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">Rata-rata per Kitab</h2>
          {recap.perKitab.length === 0 ? (
            <Card className="p-6 text-center text-sm text-ink-secondary">Belum ada kitab.</Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-background text-xs uppercase tracking-wide text-ink-secondary">
                    <th className="px-4 py-3 font-medium">Kitab</th>
                    <th className="px-4 py-3 font-medium">Halaman</th>
                    <th className="px-4 py-3 text-right font-medium">Rata-rata</th>
                  </tr>
                </thead>
                <tbody>
                  {recap.perKitab.map((k) => (
                    <tr key={k.kitabId} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium text-ink">{k.namaKitab}</td>
                      <td className="px-4 py-3 text-ink-secondary">{k.jumlahHalaman}</td>
                      <td className="px-4 py-3 text-right font-semibold text-ink">{k.rataRata}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}