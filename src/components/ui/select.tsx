import type { SelectHTMLAttributes } from "react";

/** Select dropdown — same look as Input (DESIGN.md §5). */
export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
