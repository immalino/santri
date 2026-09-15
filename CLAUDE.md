@AGENTS.md

# CLAUDE.md

Panduan kerja untuk Claude Code di project **e-Santri**.

## Dokumen Acuan

Baca dokumen berikut sebelum mengerjakan task besar — jangan asumsikan struktur data/desain tanpa cek dokumen ini:

- `PRD.md` — kebutuhan produk, entitas, fitur MVP
- `ARCHITECTURE.md` — stack, struktur folder, alur request
- `DESIGN.md` — palet warna, tipografi, layout per role
- `SCHEMA.md` — skema database detail (Drizzle)
- `IMPLEMENTATION.md` — rencana implementasi lengkap (fase berurutan + checklist; centang tiap task setelah selesai)

## Tech Stack

- Next.js (App Router) + TypeScript
- PostgreSQL (Supabase) via Drizzle ORM
- better-auth untuk autentikasi & role (admin/ustadz/wali)
- Tailwind CSS (custom component, tanpa library seperti shadcn)
- Deploy: Vercel
- Package manager: **npm**

## Konvensi Kode

- **Bahasa Inggris** untuk nama variabel, function, comment di kode.
- **Bahasa Indonesia** untuk semua teks yang tampil di UI (label, button, pesan error ke user).
- Database: **snake_case** (tabel & kolom), primary key **UUID**, semua tabel punya `created_at`/`updated_at` — ikuti persis `SCHEMA.md`.
- Ikuti struktur folder yang sudah didefinisikan di `ARCHITECTURE.md` (route groups per role: `(admin)`, `(ustadz)`, `(wali)`).
- Validasi input (misal persentase 0-100) dilakukan di level aplikasi, bukan di database.

## Linting & Formatting

- Pakai ESLint + Prettier default dari Next.js (`next lint`).
- Jalankan `npm run lint` sebelum menganggap task selesai.

## Workflow Sebelum Commit

Selalu jalankan urutan berikut sebelum commit:

```bash
npm run lint
npm run build
```

Kalau ada error, perbaiki dulu sebelum commit — jangan commit kode yang gagal lint/build.

## Update Checklist IMPLEMENTATION.md

- Setiap selesai mengerjakan task/fase, centang checklist di `docs/IMPLEMENTATION.md`: task yang selesai + Definition of Done + Progress Tracker di bagian atas, lalu perbarui tanggal `Terakhir di-update`.
- Hanya centang task yang benar-benar selesai dan terverifikasi (`npm run lint` & `npm run build` hijau) — jangan centang saat baru mulai mengerjakan.
- Kalau menemukan langkah/deviasi baru di tengah jalan, catat di bawah fase terkait di `docs/IMPLEMENTATION.md` — jangan diam saja.

## Git & Commit

- Commit **kecil dan sering**, per fitur/perubahan logis (bukan satu commit besar di akhir).
- Commit message singkat, jelas, deskriptif (boleh Bahasa Indonesia atau Inggris, konsisten).
- **Jangan tambahkan baris `Co-Authored-By: Claude` (atau atribusi otomatis lain) di commit message** — commit message cukup berisi ringkasan perubahan.

## Database (Drizzle)

- Perubahan skema dilakukan di `db/schema.ts`, lalu jalankan migrasi (`drizzle-kit push` / `migrate`) — jangan ubah tabel langsung dari Supabase dashboard tanpa update schema.ts.
- Ingat: tabel `pencapaian` menyimpan **nilai terakhir saja** per (santri, halaman) — gunakan `UPDATE`/upsert, bukan `INSERT` baru tiap kali dinilai ulang.
- Tabel `kitab` pakai soft delete (`status: aktif/nonaktif`) — jangan pernah `DELETE` baris kitab yang sudah punya data pencapaian terkait.

## Autentikasi & Role

- Role user (`admin`, `ustadz`, `wali`) ada di field `role` pada tabel `user` (better-auth).
- Setiap API route dan halaman yang butuh proteksi role harus divalidasi — jangan asumsikan middleware saja cukup, cek ulang role di server-side handler.
- Wali hanya boleh akses data santri yang terhubung lewat tabel `wali_santri`.

## Hal yang Perlu Dikonfirmasi ke User

- Kalau ada perubahan skema database yang berdampak ke data existing (misal ubah tipe kolom), konfirmasi dulu sebelum eksekusi migrasi.
- Kalau ada keputusan desain/arsitektur baru yang belum tercakup di `PRD.md`/`ARCHITECTURE.md`/`DESIGN.md`, tanyakan dulu daripada berasumsi.
