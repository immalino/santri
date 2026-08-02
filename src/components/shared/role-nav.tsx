"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  UserRound,
  ClipboardList,
  Clock,
  Ellipsis,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/roles";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Nav items per role (DESIGN.md §4).
 * `items` are the main entries; `more` is only shown for admin as a
 * "Lainnya" entry on mobile (Ustadz/Wali).
 */
const navByRole: Record<Role, { items: NavItem[]; more?: NavItem[] }> = {
  admin: {
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/kitab", label: "Kitab", icon: BookOpen },
      { href: "/admin/santri", label: "Santri", icon: Users },
    ],
    more: [
      { href: "/admin/ustadz", label: "Ustadz", icon: GraduationCap },
      { href: "/admin/wali", label: "Wali", icon: UserRound },
    ],
  },
  ustadz: {
    items: [
      { href: "/ustadz/input", label: "Input Nilai", icon: ClipboardList },
      { href: "/ustadz/santri", label: "Santri", icon: Users },
      { href: "/ustadz/riwayat", label: "Riwayat", icon: Clock },
    ],
  },
  wali: {
    items: [{ href: "/wali/santri", label: "Santri", icon: Users }],
  },
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop horizontal top nav. */
function DesktopNav({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <nav className="hidden border-b border-border bg-surface md:block" aria-label="Navigasi utama">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-1 px-4">
        {items.map((item) => (
          <DesktopLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
          />
        ))}
      </div>
    </nav>
  );
}

function DesktopLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[44px] items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors ${
        active ? "border-primary text-primary" : "border-transparent text-ink-secondary hover:text-ink"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {item.label}
    </Link>
  );
}

/** Mobile fixed bottom nav. */
function MobileNav({
  items,
  more,
  pathname,
}: {
  items: NavItem[];
  more?: NavItem[];
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const moreActive = more?.some((m) => isActivePath(pathname, m.href)) ?? false;
  // Tailwind needs literal class names — the values below are static.
  const cols = more
    ? "grid-cols-4"
    : items.length === 3
      ? "grid-cols-3"
      : items.length === 2
        ? "grid-cols-2"
        : "grid-cols-1";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden"
      aria-label="Navigasi utama"
    >
      <div className={`mx-auto grid max-w-lg ${cols}`}>
        {items.map((item) => (
          <MobileLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
        ))}
        {more && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="true"
            className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              open || moreActive ? "text-primary" : "text-ink-secondary"
            }`}
          >
            <Ellipsis className="h-5 w-5" aria-hidden />
            Lainnya
          </button>
        )}
      </div>

      {open && more && (
        <div className="space-y-1 border-t border-border bg-surface p-2 pb-6">
          {more.map((item) => (
            <MobileMoreLink
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </div>
      )}
    </nav>
  );
}

function MobileLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
        active ? "text-primary" : "text-ink-secondary"
      }`}
    >
      <Icon className="h-5 w-5" aria-hidden />
      {item.label}
    </Link>
  );
}

function MobileMoreLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
        active ? "bg-primary/10 text-primary" : "text-ink hover:bg-background"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {item.label}
    </Link>
  );
}

/**
 * Role-aware navigation: a horizontal top nav on desktop and a fixed bottom
 * nav on mobile (DESIGN.md §4). Admin gets a "Lainnya" entry on mobile that
 * expands to Ustadz/Wali.
 */
export default function RoleNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const { items, more } = navByRole[role];
  const allItems = more ? [...items, ...more] : items;

  return (
    <>
      <DesktopNav items={allItems} pathname={pathname} />
      <MobileNav items={items} more={more} pathname={pathname} />
    </>
  );
}
