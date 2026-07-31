import type { InputHTMLAttributes } from "react";

/** Text input — DESIGN.md §5: rounded-xl border, primary focus ring. */
export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-secondary/70 focus:border-primary focus:ring-2 focus:ring-primary/20 ${className}`}
      {...props}
    />
  );
}
