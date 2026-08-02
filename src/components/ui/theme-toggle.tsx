"use client";

import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "theme";

/**
 * Dark mode toggle (DESIGN.md §7). Both icons are always rendered and CSS
 * (`dark:block`/`dark:hidden`) picks the relevant one based on the `.dark`
 * class on <html> — applied by the anti-FOUC script in src/app/layout.tsx
 * before first paint. This avoids theme-dependent React state entirely, so
 * there is no hydration mismatch and the icon is correct on first render.
 */
export default function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const nextDark = !root.classList.contains("dark");
    root.classList.toggle("dark", nextDark);
    localStorage.setItem(STORAGE_KEY, nextDark ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Ganti tema"
      title="Ganti tema"
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-ink-secondary transition-colors hover:bg-background hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {/* Sun shown in dark mode (click to go light); Moon shown in light mode. */}
      <Sun className="hidden h-5 w-5 dark:block" aria-hidden />
      <Moon className="block h-5 w-5 dark:hidden" aria-hidden />
    </button>
  );
}
