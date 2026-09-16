"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Global navigation progress bar (thin top bar, YouTube-style). It appears
 * within milliseconds of any in-app link tap and hides once the navigation
 * commits (pathname catches up to the tapped URL) or after a safety timeout.
 *
 * Why this exists on top of loading.tsx: route skeletons only render once the
 * router starts swapping segments (and read as passive gray blocks), while
 * this bar guarantees unmistakable "your tap registered, the app is working"
 * feedback on EVERY client navigation, regardless of prefetch state.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  /**
   * The ongoing tap-navigation, or null when idle/timed out. `fromPath` is
   * the pathname at tap time; the bar hides once the router leaves it
   * (navigation committed). Search-only navigations keep the same pathname
   * and rely on the safety timeout instead (the app navigates by path).
   */
  const [pending, setPending] = useState<{ fromPath: string } | null>(null);

  // Safety net: never leave a stuck bar (e.g. navigation cancelled).
  useEffect(() => {
    if (pending === null) return;
    const timer = setTimeout(() => setPending(null), 8000);
    return () => clearTimeout(timer);
  }, [pending]);

  // Show the bar on any in-app link tap (capture phase, before Next handles
  // the click). External links, new-tab/modifier clicks, and same-URL taps
  // are not client navigations and are ignored.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement).closest?.("a[href]");
      if (!anchor || anchor.getAttribute("target") === "_blank") return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
        setPending({ fromPath: window.location.pathname });
      } catch {
        return;
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Visible while a tapped navigation hasn't committed yet. Derived during
  // render — no setState-in-effect needed.
  if (pending === null || pending.fromPath !== pathname) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 h-1 bg-primary/15"
      role="status"
      aria-label="Memuat halaman"
    >
      <div className="h-full w-2/5 animate-nav-progress bg-gradient-to-r from-success to-accent" />
    </div>
  );
}
