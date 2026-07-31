import PagePlaceholder from "@/components/shared/page-placeholder";

export default function AdminSantriPage() {
  return (
    <PagePlaceholder
      title="Kelola Santri"
      description="Daftar santri beserta kelas dan status aktif."
      note="CRUD santri & kelas akan dibangun di Fase 4."
      homeHref="/admin/dashboard"
    />
  );
}
