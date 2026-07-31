import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">Halaman tidak ditemukan</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-secondary">
        Halaman yang Anda cari tidak ada atau telah dipindahkan.
      </p>
      <ButtonLink href="/" className="mt-6">
        Kembali ke Beranda
      </ButtonLink>
    </div>
  );
}
