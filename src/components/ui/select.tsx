import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

/** Select dropdown — same look as Input (DESIGN.md §5).
 *  Native arrow diganti ChevronDown Lucide yang di-inset dari tepi kanan
 *  (bukan nempel di pinggir) biar sejajar dengan padding field. */
export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={`w-full appearance-none rounded-xl border border-border bg-surface py-3 pl-3 pr-10 text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary"
      />
    </div>
  );
}
