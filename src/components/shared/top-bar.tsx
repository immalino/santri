import LogoutButton from "./logout-button";
import { roleLabel, type Role } from "@/lib/roles";

interface TopBarProps {
  userName: string;
  role: Role;
}

/**
 * Shared top bar for role pages: app name + user info + logout.
 * Navigation per role is added in Phase 3.
 */
export default function TopBar({ userName, role }: TopBarProps) {
  return (
    <header className="border-b border-[#E5DFD0] bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0E6B4F] text-sm font-bold text-white">
            S
          </span>
          <span className="truncate text-sm font-semibold text-[#1F2A24]">
            Pencapaian Santri
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-[#1F2A24]">{userName}</p>
            <p className="text-xs text-[#6B7568]">{roleLabel[role]}</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
