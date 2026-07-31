import PagePlaceholder from "@/components/shared/page-placeholder";

export default function AdminKitabPage() {
  return (
    <PagePlaceholder
      title="Kelola Kitab"
      description="Daftar kitab, jumlah halaman, dan status aktif/nonaktif."
      note="CRUD kitab dengan auto-generate halaman akan dibangun di Fase 4."
      homeHref="/admin/dashboard"
    />
  );
}
