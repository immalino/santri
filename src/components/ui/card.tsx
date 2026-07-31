import type { HTMLAttributes } from "react";

/** Surface card — DESIGN.md §5: rounded-2xl, shadow-sm, surface background. */
export function Card({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
