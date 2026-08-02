import LogoutButton from "./logout-button";
import ThemeToggle from "@/components/ui/theme-toggle";
import { roleLabel, type Role } from "@/lib/roles";

interface TopBarProps {
  userName: string;
  role: Role;
}

/**
 * Shared top bar for role pages (DESIGN.md §4): placeholder logo + app name
 * on the left, user info + logout on the right. Navigation is rendered
 * separately by <RoleNav />.
 */
export default function TopBar({ userName, role }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            S
          </span>
          <span className="truncate text-sm font-semibold text-ink">Pencapaian Santri</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-ink">{userName}</p>
            <p className="text-xs text-ink-secondary">{roleLabel[role]}</p>
          </div>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
