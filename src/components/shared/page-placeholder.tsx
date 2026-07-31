import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface PagePlaceholderProps {
  title: string;
  description: string;
  /** Short note about which phase will build this page. */
  note: string;
  /** Role home to navigate back to. */
  homeHref: string;
}

/** Temporary placeholder page used while a route is still unbuilt (Phase 3). */
export default function PagePlaceholder({
  title,
  description,
  note,
  homeHref,
}: PagePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-1 text-sm text-ink-secondary">{description}</p>
      </div>

      <Card className="p-6">
        <p className="text-sm text-ink-secondary">{note}</p>
        <ButtonLink href={homeHref} variant="secondary" className="mt-4">
          Kembali ke Beranda
        </ButtonLink>
      </Card>
    </div>
  );
}
