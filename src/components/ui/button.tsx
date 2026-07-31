import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import Link from "next/link";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  secondary: "border border-border bg-surface text-ink hover:bg-background",
  danger: "bg-danger text-white hover:bg-danger/85",
  ghost: "text-ink-secondary hover:bg-background hover:text-ink",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-[36px] px-3 text-sm",
  md: "min-h-[44px] px-4 text-sm",
};

/** Shared button look for both <button> and <Link> variants. */
export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = "",
) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
}

/** Button element (min-height 44px for tap targets — DESIGN.md §5). */
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={buttonStyles(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

interface ButtonLinkProps extends Omit<ComponentProps<typeof Link>, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: ReactNode;
}

/** Next.js <Link> styled as a button. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonStyles(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
