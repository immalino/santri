import type { HTMLAttributes } from "react";

type Variant = "success" | "secondary" | "danger" | "warning" | "accent";

const styles: Record<Variant, string> = {
  success: "bg-success/15 text-success",
  secondary: "bg-ink-secondary/10 text-ink-secondary",
  danger: "bg-danger/15 text-danger",
  warning: "bg-warning/15 text-warning",
  accent: "bg-accent/15 text-accent",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

/** Pill status badge — DESIGN.md §5 (aktif=hijau, nonaktif=abu-abu). */
export function Badge({ variant = "secondary", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
