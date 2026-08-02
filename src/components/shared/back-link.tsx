import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

/**
 * "Kembali" link styled as a ghost button, shown at the top of the santri and
 * kitab detail pages (admin/ustadz/wali). The label can be overridden, e.g.
 * "Kembali ke daftar santri".
 */
export function BackLink({
  href,
  children = "Kembali",
}: {
  href: string;
  children?: ReactNode;
}) {
  return (
    <ButtonLink href={href} variant="ghost" size="sm">
      <ChevronLeft className="h-4 w-4" aria-hidden />
      {children}
    </ButtonLink>
  );
}
