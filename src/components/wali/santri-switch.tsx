"use client";

import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";

interface SantriSwitchProps {
  santris: { id: string; nama: string }[];
  /** The currently selected santri id (from the URL). */
  currentId: string;
}

/**
 * Child switch for a wali with more than one linked santri (task 6.3). The
 * page is server-rendered and driven by `?santriId=`, so changing the select
 * navigates to the new URL and the server re-renders the content.
 */
export function SantriSwitch({ santris, currentId }: SantriSwitchProps) {
  const router = useRouter();

  return (
    <Field label="Melihat progress anak" htmlFor="santri-switch">
      <Select
        id="santri-switch"
        value={currentId}
        onChange={(e) => router.replace(`/wali/progress?santriId=${encodeURIComponent(e.target.value)}`)}
      >
        {santris.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nama}
          </option>
        ))}
      </Select>
    </Field>
  );
}