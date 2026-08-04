import { requireRole } from "@/lib/permissions";
import ChangePasswordForm from "@/components/shared/change-password-form";
import LogoutButton from "@/components/shared/logout-button";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Pengaturan | Sistem Pendataan Pencapaian Santri",
};

/**
 * Wali settings page: change password + logout. Guarded to the wali role
 * like every other page in this layout (proxy is not the final authority —
 * CLAUDE.md).
 */
export default async function WaliPengaturanPage() {
  await requireRole(["wali"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Pengaturan</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Kelola pengaturan akun Anda, termasuk mengganti password.
        </p>
      </div>

      <ChangePasswordForm />

      <Card className="flex items-center justify-between gap-4 p-6">
        <div>
          <p className="font-semibold text-ink">Keluar dari Akun</p>
          <p className="mt-0.5 text-sm text-ink-secondary">
            Akhiri sesi Anda di perangkat ini.
          </p>
        </div>
        <LogoutButton />
      </Card>
    </div>
  );
}
