# ARCHITECTURE - Sistem Pendataan Pencapaian Santri

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
    /(admin)
      /kitab            -> CRUD kitab
      /santri           -> CRUD santri
      /ustadz           -> CRUD ustadz
      /wali             -> CRUD wali + hubungkan ke santri
      /dashboard         -> rekap semua santri
    /(ustadz)
      /input            -> pilih santri -> pilih kitab -> input persentase
      /riwayat          -> riwayat penilaian
    /(wali)
      /progress         -> lihat progress anak, switch antar santri
    /api
      /auth/[...all]     -> better-auth handler
      /kitab
      /santri
      /pencapaian
      ...
  /db
    schema.ts            -> skema Drizzle (tabel & relasi)
    index.ts              -> koneksi Drizzle ke Supabase
  /lib
    auth.ts               -> konfigurasi better-auth (role, session)
    auth-client.ts         -> client-side auth helper
  /components
    ...
```

## 4. Skema Database (Ringkas)

Mengikuti entitas dari PRD bagian 5:

```
users            (dikelola better-auth: id, email, password, role[admin|ustadz|wali])
santri           (id, nama, kelas, status_aktif)
wali_santri      (wali_id, santri_id)         -- relasi many-to-many
kitab            (id, nama, jumlah_halaman, deskripsi, status[aktif|nonaktif])
halaman          (id, kitab_id, nomor_halaman) -- auto-generate saat kitab dibuat/diedit
pencapaian       (id, santri_id, halaman_id, persentase, dinilai_oleh(users.id), tanggal)
```

Catatan implementasi:
- `pencapaian` menyimpan **nilai terakhir saja** per (santri, halaman) — bukan log histori (sesuai keputusan PRD #9). Cukup `UPDATE` record yang sudah ada, bukan `INSERT` baru tiap kali dinilai ulang.
- `kitab` yang nonaktif tetap tampil di progress santri (soft delete via kolom `status`, bukan `DELETE`).
- Saat jumlah halaman kitab ditambah, sistem cukup `INSERT` baris `halaman` baru tanpa menyentuh baris lama — data `pencapaian` yang sudah ada tetap aman.

## 5. Autentikasi & Otorisasi

- better-auth menangani session (cookie-based) dan tabel `users`.
- Role disimpan sebagai field pada user (`admin` / `ustadz` / `wali`), dicek di:
  - **Middleware Next.js** — proteksi route per role (misal `/admin/*` hanya untuk admin).
  - **API routes** — validasi role sebelum eksekusi query (misal hanya `ustadz` yang boleh POST ke `/api/pencapaian`).
- Wali hanya bisa mengakses data santri yang terhubung ke akunnya (dicek via tabel `wali_santri`).

## 6. Alur Request Sederhana

**Ustadz input nilai:**
```
Ustadz (browser) 
  -> Next.js page /(ustadz)/input 
  -> pilih santri & kitab (fetch via API route)
  -> submit persentase per halaman
  -> API route /api/pencapaian (validasi role=ustadz via better-auth)
  -> Drizzle -> Supabase Postgres (UPDATE pencapaian)
```

**Wali lihat progress:**
```
Wali (browser)
  -> Next.js page /(wali)/progress
  -> API route /api/santri/:id/progress (validasi wali terhubung ke santri ini)
  -> Drizzle query (JOIN pencapaian + halaman + kitab, agregasi rata-rata %)
  -> render progress bar per kitab
```

## 7. Deployment

- Repo di GitHub -> auto-deploy ke Vercel tiap push ke branch `main`.
- Environment variables (di Vercel): `DATABASE_URL` (Supabase), `BETTER_AUTH_SECRET`, dll.
- Migrasi database dijalankan via Drizzle Kit (`drizzle-kit push` atau `migrate`) sebelum/saat deploy.

## 8. Hal yang Belum Diputuskan
- Perlu staging environment terpisah (misal Supabase project kedua) sebelum production, atau langsung production saja mengingat skala kecil?
- Apakah perlu rate-limiting/logging tambahan di API routes, atau cukup andalkan proteksi role saja untuk MVP?
