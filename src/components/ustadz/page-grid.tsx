"use client";

import { useRef } from "react";

/** A page (halaman) to render as one box in the grid. */
export interface PageGridPage {
  halamanId: string;
  nomorHalaman: number;
}

interface PageGridProps {
  pages: PageGridPage[];
  /** Live edit values keyed by halamanId (0-100). */
  values: Record<string, number>;
  selected: ReadonlySet<string>;
  /** Quick tap on a box → toggle its selection. */
  onToggle: (halamanId: string) => void;
  /** Long-press start / paint drag entering a box → select it. */
  onPaintSelect: (halamanId: string) => void;
  onPaintEnd?: () => void;
  /** halamanId to temporarily highlight (jump-to-page target). */
  highlightId?: string | null;
}

const LONG_PRESS_MS = 350;
const MOVE_THRESHOLD = 8;

/** Non-passive touch blocker attached while painting (see PageGrid). */
function blockScroll(e: TouchEvent) {
  e.preventDefault();
}

/**
 * Grid of page boxes for the ustadz grading sheet (task 5.2). Each box shows
 * its page number over a fill that rises with the score — green → gold,
 * DESIGN.md §2 — so a full box reads as "done".
 *
 * Selection gestures:
 * - Quick tap → toggle one box.
 * - Long-press (≈350ms) then drag → paint-select many boxes. While painting,
 *   touch scrolling is blocked with a non-passive `touchmove` listener so the
 *   drag selects boxes instead of scrolling; a plain fast drag never paints,
 *   so normal scrolling is untouched.
 */
export function PageGrid({
  pages,
  values,
  selected,
  onToggle,
  onPaintSelect,
  onPaintEnd,
  highlightId,
}: PageGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const painting = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const startId = useRef<string | null>(null);
  const lastPainted = useRef<string | null>(null);

  function clearTimer() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function endPaint() {
    painting.current = false;
    lastPainted.current = null;
    gridRef.current?.removeEventListener("touchmove", blockScroll);
    onPaintEnd?.();
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const box = (e.target as Element).closest("[data-halaman-id]");
    const id = box?.getAttribute("data-halaman-id");
    if (!id) return;

    startId.current = id;
    startPos.current = { x: e.clientX, y: e.clientY };
    clearTimer();

    timer.current = window.setTimeout(() => {
      timer.current = null;
      painting.current = true;
      lastPainted.current = null;
      try {
        gridRef.current?.setPointerCapture(e.pointerId);
      } catch {
        // Pointer already released — painting still works via move events.
      }
      // Block touch scrolling for the rest of this gesture so the drag paints
      // boxes instead of scrolling the page.
      gridRef.current?.addEventListener("touchmove", blockScroll, { passive: false });
      onPaintSelect(id);
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (painting.current) {
      const box = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest("[data-halaman-id]");
      const id = box?.getAttribute("data-halaman-id");
      if (id && id !== lastPainted.current) {
        lastPainted.current = id;
        onPaintSelect(id);
      }
      return;
    }

    // Not painting yet: cancel the long-press if the pointer moved, i.e. the
    // gesture is a scroll, not a hold.
    if (timer.current !== null && startPos.current) {
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      if (Math.hypot(dx, dy) > MOVE_THRESHOLD) {
        clearTimer();
      }
    }
  }

  function handlePointerUp() {
    if (timer.current !== null) {
      // Quick tap (no long-press fired) → toggle the pressed box.
      clearTimer();
      if (startId.current) onToggle(startId.current);
    } else if (painting.current) {
      endPaint();
    }
    startId.current = null;
    startPos.current = null;
  }

  function handlePointerCancel() {
    clearTimer();
    if (painting.current) endPaint();
    startId.current = null;
    startPos.current = null;
  }

  return (
    <div
      ref={gridRef}
      className="grid select-none grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12"
      style={{ WebkitTouchCallout: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {pages.map((p) => {
        const pct = Math.max(0, Math.min(100, Math.round(values[p.halamanId] ?? 0)));
        const isSelected = selected.has(p.halamanId);
        return (
          <button
            key={p.halamanId}
            type="button"
            id={`page-${p.halamanId}`}
            data-halaman-id={p.halamanId}
            aria-pressed={isSelected}
            aria-label={`Halaman ${p.nomorHalaman}, ${pct}%`}
            className={`relative aspect-square select-none overflow-hidden rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              isSelected ? "border-primary ring-2 ring-primary" : "border-border"
            } ${
              p.halamanId === highlightId
                ? "ring-2 ring-accent"
                : ""
            } ${pct > 0 ? "text-ink" : "text-ink-secondary"}`}
          >
            {pct > 0 && (
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0"
                style={{
                  height: `${pct}%`,
                  background: "linear-gradient(to top, var(--success), var(--accent))",
                }}
              />
            )}
            <span className="relative">{p.nomorHalaman}</span>
          </button>
        );
      })}
    </div>
  );
}
