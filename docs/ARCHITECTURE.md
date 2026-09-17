# ARCHITECTURE - e-Santri

Dokumen ini menjabarkan arsitektur teknis berdasarkan `PRD.md`.

## 1. Tech Stack

| Layer | Pilihan |
|---|---|
| Framework | Next.js (App Router, fullstack — frontend + backend jadi satu project) |
| Bahasa | TypeScript |
| Database | PostgreSQL (hosted di Supabase) |
| ORM | Drizzle ORM |
| Auth | better-auth |
| Hosting | Vercel |
| Styling | Tailwind CSS (opsional, umum dipakai bareng Next.js) |

## 2. Alasan Pemilihan

- **Next.js (fullstack)** — satu codebase untuk UI + API routes, cocok untuk skala kecil (<50 santri), deploy sederhana ke Vercel.
- **Supabase** — hosting Postgres yang gampang setup, sediakan connection string langsung dipakai Drizzle. (Fitur bawaan Supabase seperti Auth/Storage tidak dipakai karena auth pakai better-auth sendiri.)
- **Drizzle ORM** — type-safe, ringan, skema didefinisikan sebagai kode TypeScript, cocok untuk migrasi terkontrol.
- **better-auth** — mendukung custom role-based access (admin/ustadz/wali) dan terintegrasi baik dengan Next.js + Drizzle adapter.
- **Vercel** — deploy otomatis dari Git, cocok untuk Next.js, gratis untuk skala kecil.

## 3. Struktur Folder (Next.js App Router)

```
/src
  /app
    /(auth)
      /login
    /admin                -> prefix role (keputusan Fase 2, bukan route group)
      /dashboard          -> rekap semua santri
      /kitab              -> CRUD kitab (+ auto-generate halaman)
      /santri             -> CRUD santri (+ /[id] detail editable, /[id]/kitab/[kitabId] grid nilai)
      /kegiatan           -> CRUD kegiatan (+ /[id] peserta & sesi, /[id]/sesi/[sesiId] input absensi)
      /kelas              -> CRUD kelas (link dari halaman santri)
      /ustadz             -> CRUD akun ustadz
      /wali               -> CRUD akun wali + hubungkan ke santri
      /pengaturan         -> ganti password sendiri
    /ustadz
      /input              -> pilih santri -> pilih kitab -> input persentase
      /santri             -> daftar santri (+ /[id] detail editable, /[id]/kitab/[kitabId] grid nilai)
      /kegiatan           -> CRUD kegiatan (+ /[id] peserta & sesi, /[id]/sesi/[sesiId] input absensi)
      /riwayat            -> riwayat penilaian
      /pengaturan         -> ganti password sendiri
    /wali
      /santri             -> daftar anak (+ /[id] detail read-only: progress kitab + riwayat absensi)
      /pengaturan         -> ganti password sendiri
    /api
      /auth/[...all]      -> better-auth handler
      /kitab              (+ /[id])
      /kelas              (+ /[id])
      /santri             (+ /[id], /[id]/progress, /[id]/absensi)
      /users              (+ /[id])
      /wali-santri
      /kegiatan           (+ /[id], /[id]/peserta, /[id]/sesi, /[id]/sesi/[sesiId], .../absensi, /[id]/template, /[id]/template/[templateId]) (admin/ustadz)
      /pencapaian         (+ /riwayat)
      /ustadz/data
      /admin/dashboard
   /db
     schema.ts             -> skema Drizzle (tabel & relasi, termasuk kegiatan/absensi Fase 10)
     index.ts              -> koneksi Drizzle ke Supabase
   /lib
     auth.ts               -> konfigurasi better-auth (role, session)
     auth-client.ts         -> client-side auth helper
     permissions.ts         -> requireRole / requireApiRole
     roles.ts               -> Role, roleHome, roleLabel (tanpa import server)
     absensi-stats.ts       -> agregasi kegiatan/sesi/absensi (shared API + pages)
      laporan-template.ts    -> katalog 45 variabel + COUNT/LIST/MATH custom + render murni {{...}} (client-safe)
   /components
     /ui                   -> Button, Card, Input, PasswordInput, Select, Badge, ProgressBar, Skeleton, ThemeToggle
     /shared               -> TopBar, RoleNav, LogoutButton, SantriProgressDetail, KitabGradeSheet, BackLink, ChangePasswordForm, KegiatanManager, KegiatanDetailManager, PesertaPicker, AbsensiSheet, AbsensiHistory, TemplateManager, LaporanCard
     /admin, /wali
  proxy.ts                 -> Next 16 proxy (pengganti middleware.ts)
```

Catatan: preview laporan (`LaporanCard`) mencerminkan absensi yang sudah tersimpan — setelah simpan absensi, halaman disegarkan (`router.refresh()`) agar data sesi terbaru dipakai.

## 4. Skema Database (Ringkas)

Mengikuti entitas dari PRD bagian 5:

```
users            (dikelola better-auth: id, email, password, role[admin|ustadz|wali])
santri           (id, nama, kelas, status_aktif)
wali_santri      (wali_id, santri_id)         -- relasi many-to-many
kitab            (id, nama, jumlah_halaman, deskripsi, status[aktif|nonaktif])
halaman          (id, kitab_id, nomor_halaman) -- auto-generate saat kitab dibuat/diedit
pencapaian       (id, santri_id, halaman_id, persentase, dinilai_oleh(users.id), tanggal)
kegiatan         (id, nama, deskripsi, status[aktif|nonaktif], dibuat_oleh(users.id))
kegiatan_peserta (kegiatan_id, santri_id)      -- santri terdaftar per kegiatan
kegiatan_sesi    (id, kegiatan_id, tanggal, judul, catatan) -- satu baris per pertemuan
absensi          (id, sesi_id, santri_id, status[hadir|izin|tanpa_keterangan], keterangan, dicatat_oleh(users.id), tanggal)
kegiatan_template (id, kegiatan_id, nama, isi) -- N template laporan teks per kegiatan
```

Catatan implementasi:
- `pencapaian` menyimpan **nilai terakhir saja** per (santri, halaman) — bukan log histori (sesuai keputusan PRD #9). Cukup `UPDATE` record yang sudah ada, bukan `INSERT` baru tiap kali dinilai ulang.
- `absensi` mengikuti pola yang sama: **satu baris per (sesi, santri)**, pencatatan ulang = `UPSERT` (`onConflictDoUpdate`), bukan `INSERT` baru.
- `kitab` yang nonaktif tetap tampil di progress santri (soft delete via kolom `status`, bukan `DELETE`). `kegiatan` memakai pola soft delete yang sama.
- Saat jumlah halaman kitab ditambah, sistem cukup `INSERT` baris `halaman` baru tanpa menyentuh baris lama — data `pencapaian` yang sudah ada tetap aman.
- Saat kegiatan dibuat, sesi pertama otomatis dibuat dari tanggal yang diisi — kegiatan sekali jalan cukup 1 sesi, kegiatan rutin tambah sesi lagi dari halaman detail. Menghapus peserta tidak menghapus baris `absensi` historis.
- `kegiatan_template` (template laporan teks) dimiliki per kegiatan: hapus kegiatan meng-cascade template; tambah/hapus peserta atau sesi tidak menyentuh template. Render `{{var}}` murni di browser dari data sesi yang sudah dimuat server.

## 5. Autentikasi & Otorisasi

- better-auth menangani session (cookie-based) dan tabel `users`.
- Role disimpan sebagai field pada user (`admin` / `ustadz` / `wali`), dicek di:
  - **Proxy** (`src/proxy.ts`, pengganti `middleware.ts` di Next 16) — cek cookie session secara optimis: belum login → redirect ke `/login`. **BUKAN otorisasi final.**
  - **Layout tiap role** (`requireRole`) — redirect ke halaman home sendiri bila role tidak cocok.
  - **API routes** — `requireApiRole` validasi role sebelum eksekusi query (misal hanya `ustadz`/`admin` yang boleh POST ke `/api/pencapaian`; wali → 403).
- Wali hanya bisa mengakses data santri yang terhubung ke akunnya (dicek via tabel `wali_santri` — selain itu API progress membalas 403).

## 6. Alur Request Sederhana

**Ustadz input nilai:**
```
Ustadz (browser) 
  -> Next.js page /ustadz/input 
  -> pilih santri & kitab (fetch via API route)
  -> submit persentase per halaman
  -> API route /api/pencapaian (validasi role=ustadz/admin via better-auth)
  -> Drizzle -> Supabase Postgres (UPSERT pencapaian: INSERT ... ON CONFLICT UPDATE)
```

**Wali lihat progress:**
```
Wali (browser)
  -> Next.js page /wali/santri -> /wali/santri/:id (server-rendered; ownership dicek via getWaliSantris, santri tak terhubung -> 404)
  -> helper getSantriProgressData (JOIN pencapaian + halaman + kitab, agregasi rata-rata %) — langsung ke DB, tanpa API
  -> render card kitab read-only, expand breakdown per halaman
```

## 7. Deployment

- Repo di GitHub -> auto-deploy ke Vercel tiap push ke branch `main`.
- Environment variables (di Vercel): `DATABASE_URL` (Supabase), `BETTER_AUTH_SECRET`, dll.
- Migrasi database dijalankan via Drizzle Kit (`drizzle-kit push` atau `migrate`) sebelum/saat deploy.

## 8. Keputusan (diselesaikan di Fase 7)

- **Staging environment**: **tidak** — langsung production saja (skala <50 santri, hemat biaya & waktu). Development memakai localhost + Supabase project yang ada.
- **Rate-limiting / logging API**: **tidak** untuk MVP — cukup andalkan proteksi role di tiap handler (`requireApiRole`). Tanpa dependency/konfigurasi tambahan.
- **Dark mode**: hand-rolled tanpa library (`next-themes` tidak dipakai) — lihat `DESIGN.md` §7.
- **List admin di desktop**: grid kartu (bukan table) — lihat `DESIGN.md` §4.
