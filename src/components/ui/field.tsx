import type { ReactNode, Ref, TextareaHTMLAttributes } from "react";

/** Label wrapper for form fields (consistent label + optional hint). */
export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-ink-secondary">{hint}</p> : null}
    </div>
  );
}

/** Multiline textarea — same look as Input (DESIGN.md §5). */
export function Textarea({
  className = "",
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return (
    <textarea
      ref={ref}
      className={`w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-secondary/70 focus:border-primary focus:ring-2 focus:ring-primary/20 ${className}`}
      {...props}
    />
  );
}
