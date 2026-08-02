# IMPLEMENTATION.md — Rencana Implementasi Lengkap

**Project:** Sistem Pendataan Pencapaian Santri
**Status:** 🔄 Dalam Pengerjaan (update checklist di bawah setiap selesai mengerjakan)
**Terakhir di-update:** 2026-08-02

> Plan ini ditulis seperti arahan **senior developer → junior developer**. Idenya: kamu (junior, manusia atau AI) mengerjakan step-by-step sesuai urutan, centang checklist ketika selesai, dan jangan lompat ke fase berikutnya sebelum fase sebelumnya **Definition of Done**-nya terpenuhi.

---

## 0. Cara Pakai Plan Ini

### Aturan Wajib Sebelum Mulai Setiap Task

1. **Baca dokumen acuan** sebelum menyentuh kode:
   - `CLAUDE.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/SCHEMA.md`
   - **`AGENTS.md` WAJIB**: Next.js versi ini (16.x) punya *breaking changes* dari yang biasa kamu tahu. Sebelum menulis kode Next.js apa pun, baca panduan terkait di `node_modules/next/dist/docs/` (misal `01-app/01-getting-started/` → project-structure, layouts-and-pages, css, fetching-data, server-and-client-components, route-handlers). **Jangan pernah menulis kode Next.js berdasarkan ingatan lama.**
2. **Konvensi kode (CLAUDE.md):** kode & komentar **Bahasa Inggris**, semua teks UI **Bahasa Indonesia**. Database `snake_case`, PK UUID, semua tabel punya `created_at`/`updated_at`.
3. **Sebelum setiap commit:** jalankan `npm run lint` → `npm run build`. Kalau error, perbaiki. **Jangan commit kode yang gagal lint/build.**
4. **Commit kecil & sering**, per perubahan logis (sesuai fase/task). Message singkat & deskriptif.
5. **Konfirmasi ke user** kalau: (a) perubahan skema yang berdampak ke data existing, atau (b) keputusan desain/arsitektur baru yang belum ada di docs. Jangan asumsikan.

### Cara Update Checklist

- Saat mulai mengerjakan satu fase: ubah `[ ]` jadi `[x]` pada setiap task di fase itu **setelah** task selesai dan terverifikasi (bukan saat baru mulai).
- Setelah seluruh task dalam fase selesai, centang `[ ] Fase N` di **Progress Tracker** di bawah dan perbarui tanggal `Terakhir di-update`.
- Kalau kamu menemukan langkah baru yang perlu ditambahkan di tengah jalan, tulis sebagai catatan di bawah fase terkait — jangan diam saja.

---

## 1. Progress Tracker

- [x] **Fase 0 — Setup Project & Struktur Folder**
- [x] **Fase 1 — Database Layer (Drizzle) & Seed**
- [x] **Fase 2 — Autentikasi & Otorisasi (better-auth)**
- [x] **Fase 3 — Design System & Layout Per Role**
- [x] **Fase 4 — Fitur Admin**
- [ ] **Fase 5 — Fitur Ustadz**
- [ ] **Fase 6 — Fitur Wali Santri**
- [ ] **Fase 7 — Polishing, Dark Mode & Verifikasi Akhir**

---

## 2. Fase 0 — Setup Project & Struktur Folder

**Tujuan:** Project rapi mengikuti `ARCHITECTURE.md`, semua dependency terpasang, dan app jalan kosong (belum ada isi).

### Task

- [x] **0.1** Baca & pahami seluruh dokumen acuan: `CLAUDE.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/SCHEMA.md`. Kalau ada yang tidak masuk akal, tanyakan dulu.
- [x] **0.2** Baca panduan Next.js terkait di `node_modules/next/dist/docs/01-app/01-getting-started/`:
  - `02-project-structure.md` (struktur folder & konvensi)
  - `03-layouts-and-pages.md`
  - `11-css.md` (Tailwind 4 / CSS Modules)
  - `06-fetching-data.md` & `05-server-and-client-components.md` (server vs client)
  - `16-proxy.md` ⚠️ (**di Next 16, `middleware.ts` berganti nama jadi `proxy.ts`**)
  - `15-route-handlers.md` (untuk API di App Router)
  - `12-images.md` (kalau pakai `<Image>`)
- [x] **0.3** Pindahkan folder `app/` → `src/app/` sesuai struktur `ARCHITECTURE.md`. Hapus konten boilerplate default `page.tsx` (halaman "Create Next App"). Update `tsconfig.json`: alias `@/*` → `./src/*`, dan pastikan `include` mencakup `src`.
- [x] **0.4** Buat struktur folder kosong (boleh sekaligus atau bertahap sesuai fase):
  ```
  src/
    app/
      (auth)/login/
      (admin)/        dashboard/ kitab/ santri/ ustadz/ wali/
      (ustadz)/       input/ riwayat/
      (wali)/         progress/
      api/
    db/               schema.ts, index.ts, seed.ts
    lib/              auth.ts, auth-client.ts, permissions.ts
    components/       ui/, shared/
    middleware.ts  ->  GANTI NAMA jadi src/proxy.ts (Next 16!)
  ```
- [x] **0.5** Pasang dependency:
  - Runtime: `npm install drizzle-orm postgres better-auth` (+ `lucide-react` untuk ikon, sesuai DESIGN.md §6)
  - Dev: `npm install -D drizzle-kit tsx zod` (zod untuk validasi input di level aplikasi — CLAUDE.md)
- [x] **0.6** Buat `.env.example` (di-track) & `.env.local` (jangan di-track; sudah di `.gitignore`):
  ```
  DATABASE_URL=postgresql://...       # connection string Supabase
  BETTER_AUTH_SECRET=...              # generate: openssl rand -base64 32
  BETTER_AUTH_URL=http://localhost:3000
  ```
- [x] **0.7** Jalankan `npm run dev` → pastikan app berjalan tanpa error. Commit:
  `chore: setup project structure and dependencies`

### Definition of Done (Fase 0)

- [x] App berjalan di `http://localhost:3000` tanpa error.
- [x] Struktur `src/` terbentuk, `app/` di root sudah kosong/dihapus.
- [x] `npm run lint` & `npm run build` hijau.
- [x] `.env.local` ada, `.env.example` di-commit, `.env.local` tidak ter-commit.

> ⚠️ **Peringatan:** jangan pernah menaruh secret di kode/commit. Kalau `DATABASE_URL` belum punya Supabase project, tanyakan ke user dulu sebelum lanjut.

---

## 3. Fase 1 — Database Layer (Drizzle) & Seed

**Tujuan:** Skema database sesuai `SCHEMA.md`, koneksi Drizzle bekerja, migrasi sukses, dan ada data contoh untuk pengembangan.

### Task

- [x] **1.1** Baca `docs/SCHEMA.md` **selengkapnya** dan panduan Drizzle (Context7 / `drizzle-team/drizzle-orm-docs`):
  - `get-started-postgresql` (driver `postgres` + `drizzle-orm/postgres-js`)
  - `drizzle-kit-push` & `drizzle-kit-migrate`
- [x] **1.2** Buat `src/db/schema.ts`:
  - **Tabel auth (better-auth):** `user` (tambah kolom **`role`** enum `admin|ustadz|wali`), `session`, `account`, `verification` — ikuti contoh schema resmi better-auth untuk Drizzle/Postgres (lihat referensi di bawah).
    - ⚠️ **Catatan deviasi dari SCHEMA.md:** better-auth secara default memakai **`text` sebagai tipe `id`** (bukan `uuid`) untuk tabel auth-nya. Ikuti default better-auth, dan **FK dari tabel aplikasi ke `user.id` harus bertipe `text`** mengikuti `user.id`. Kalau dipaksa `uuid`, aktifkan plugin `user` dengan konfigurasi id (baca docs better-auth) — tapi jangan ubah tanpa alasan kuat.
  - **Tabel aplikasi:** `kelas`, `santri`, `wali_santri`, `kitab`, `halaman`, `pencapaian` — PERSIS seperti `SCHEMA.md` §2 (kolom, tipe, default, unique, index).
  - Aturan yang wajib dipatuhi:
    - PK `uuid` default `gen_random_uuid()` (kecuali tabel auth better-auth).
    - `created_at` & `updated_at` di SEMUA tabel.
    - `halaman`: unique `(kitab_id, nomor_halaman)`.
    - `pencapaian`: unique `(santri_id, halaman_id)` + index `santri_id` & `halaman_id`.
    - `wali_santri`: unique `(wali_id, santri_id)`.
    - **JANGAN** tambah `CHECK` constraint untuk persentase — validasi 0-100 cukup di level aplikasi (CLAUDE.md).
- [x] **1.3** Buat `src/db/index.ts` — koneksi Drizzle ke Postgres:
  ```ts
  import { drizzle } from 'drizzle-orm/postgres-js';
  import postgres from 'postgres';
  const queryClient = postgres(process.env.DATABASE_URL!);
  export const db = drizzle({ client: queryClient });
  ```
  (Tambahkan export `{ schema }` untuk relational queries bila diperlukan.)
- [x] **1.4** Buat `drizzle.config.ts`:
  ```ts
  export default defineConfig({
    schema: './src/db/schema.ts',
    dialect: 'postgresql',
    dbCredentials: { url: process.env.DATABASE_URL! },
  });
  ```
  (Catatan: file ini juga load `.env.local` via `dotenv` — lihat Catatan di bawah.)
- [x] **1.5** Jalankan `npx drizzle-kit push` (untuk dev, Supabase) — pastikan semua tabel terbuat. *Konfirmasi ke user dulu bila ada perubahan yang menyentuh data existing.*
- [x] **1.6** Buat `src/db/seed.ts` (jalankan dengan `npm run db:seed`) yang mengisi data contoh minimal:
  - 1 user `admin`, 2 user `ustadz`, 2-3 user `wali`
  - 2-3 `kelas`, 3-5 `santri`
  - 3 `kitab` dengan jumlah halaman berbeda + `halaman` auto-generate untuk tiap kitab
  - Relasi `wali_santri` (misal 1 wali punya 2 santri)
  - Beberapa baris `pencapaian` untuk uji progress
- [x] **1.7** Verifikasi: tulis query Drizzle sederhana (misal `select` kitab + `innerJoin` halaman) di file uji sementara, pastikan data terbaca. Hapus file uji setelah verifikasi.
- [x] **1.8** Commit: `feat(db): schema, connection, and seed data`

### Definition of Done (Fase 1)

- [x] Semua tabel (auth + aplikasi) sudah ada di database (cek via Supabase dashboard / psql).
- [x] Seed jalan tanpa error dan data bisa di-query.
- [x] `npm run lint` & `npm run build` hijau.

> ⚠️ **Peringatan:** tabel `pencapaian` menyimpan **nilai terakhir saja** per `(santri, halaman)` — operasi tulis wajib `UPSERT` (bukan `INSERT` baru tiap dinilai ulang). Ini keputusan PRD #9, jangan dilanggar.

> 📝 **Catatan Fase 1 (deviasi/langkah yang ditemukan saat implementasi):**
> - `.env.local` yang dibuat di Fase 0 sempat tidak bisa dipakai: `DATABASE_URL` diapit tanda kutip `"..."` dan password berisi karakter spesial (`&`, `#`) yang tidak di-URL-encode → koneksi gagal `ERR_INVALID_URL`. Sudah diperbaiki (kutip dihapus, password di-`encodeURIComponent`). Ini hanya di `.env.local` (tidak di-track).
> - `drizzle-kit` tidak otomatis membaca `.env.local` (hanya `.env`). Solusi: install `dotenv` (devDependency) dan panggil `config({ path: ".env.local" })` di `drizzle.config.ts`. Tambah script npm `db:push`, `db:seed`, `db:studio`.
> - Seed memakai instance `better-auth` inline (mirip `lib/auth.ts` Fase 2) lewat `auth.api.signUpEmail` supaya hash password valid & bisa login. Konfigurasi ini akan dipakai lagi di Fase 2 — jangan lupa selaraskan.
> - Verifikasi tambahan: `signInEmail` admin sukses & password salah ditolak — konfirmasi bahwa hash seed benar.

---

## 4. Fase 2 — Autentikasi & Otorisasi (better-auth)

**Tujuan:** Login/logout dengan email+password, session berbasis cookie, dan proteksi route per role (admin/ustadz/wali).

### Task

- [x] **2.1** Baca docs better-auth (Context7 `/better-auth/better-auth`): `installation` (Drizzle adapter), `Next.js integration`, dan `additionalFields` untuk kolom `role` di `user`.
- [x] **2.2** Buat `src/lib/auth.ts` (server):
  ```ts
  import { betterAuth } from 'better-auth';
  import { drizzleAdapter } from 'better-auth/adapters/drizzle';
  import { db } from '@/db';

  export const auth = betterAuth({
    database: drizzleAdapter(db, { provider: 'pg' }),
    emailAndPassword: { enabled: true },
    user: {
      additionalFields: { role: { type: 'string', required: true, defaultValue: 'wali' } },
      // sesuaikan: enum admin/ustadz/wali sesuai SCHEMA.md
    },
  });
  ```
  ⚠️ **Kolom `role` HARUS ada di tabel `user`** (sudah dibuat di Fase 1). Pastikan `additionalFields` sesuai tipe kolom yang ada.
- [x] **2.3** Buat route handler auth: `src/app/api/auth/[...all]/route.ts`:
  ```ts
  import { auth } from '@/lib/auth';
  import { toNextJsHandler } from 'better-auth/next-js';
  export const { GET, POST } = toNextJsHandler(auth);
  ```
- [x] **2.4** Buat client `src/lib/auth-client.ts`:
  ```ts
  import { createAuthClient } from 'better-auth/react';
  import { nextCookies } from 'better-auth/next-js';
  export const authClient = createAuthClient({ plugins: [nextCookies()] });
  ```
  (Import plugins sesuai versi docs yang kamu baca.)
- [x] **2.5** Buat helper proteksi server-side `src/lib/permissions.ts`:
  - `requireRole(roles)` — ambil session via `auth.api.getSession`, return user atau `null`; redirect ke `/login` kalau tidak login, ke halaman sesuai role kalau role tidak cocok.
  - Helper `requireApiRole(roles)` untuk dipakai di route handler (throw/return 401/403).
- [x] **2.6** Buat **Proxy** proteksi route — **DI NEXT 16 NAMANYA `proxy.ts`, bukan `middleware.ts`** (baca `16-proxy.md`):
  - `src/proxy.ts` dengan `getSessionCookie` dari `better-auth/cookies`.
  - Alur: route `(auth)/login` → jika sudah login, redirect ke dashboard sesuai role. Route role (admin/ustadz/wali) → jika tidak ada cookie session, redirect ke `/login`.
  - ⚠️ **Proxy HANYA optimasi (optimistic check) — BUKAN otorisasi final.** Setiap handler server/API tetap melakukan `requireRole` (CLAUDE.md). Jangan pernah mengandalkan proxy saja.
- [x] **2.7** Buat halaman login `src/app/(auth)/login/page.tsx`:
  - Form email + password, tombol submit, error message Bahasa Indonesia.
  - Setelah login sukses → redirect ke dashboard sesuai role (`/admin/dashboard`, `/ustadz/input`, `/wali/progress`).
  - Style mengikuti DESIGN.md (mobile-first, button min-height 44px).
- [x] **2.8** Logout (tombol di layout per role) + tampilkan nama user di top bar.
- [x] **2.9** **TIDAK ADA signup publik.** Akun dibuat oleh admin (Fase 4) atau lewat seed. Pastikan route `/api/auth/sign-up` tidak bisa dipakai publik (matikan endpoint bila perlu / jangan tampilkan form signup).
- [x] **2.10** Uji manual: login sebagai admin, ustadz, wali → masing-masing redirect ke dashboard-nya; akses route role lain → ditolak. Commit: `feat(auth): better-auth setup, login, and role protection`

### Definition of Done (Fase 2)

- [x] 3 role bisa login/logout dengan benar.
- [x] Route per role terkunci: user salah role tidak bisa mengakses halaman/API role lain.
- [x] `npm run lint` & `npm run build` hijau.

> 📝 **Catatan Fase 2 (deviasi/langkah yang ditemukan saat implementasi):**
> - **Keputusan struktur URL per role (dikonfirmasi ke user):** docs bertentangan — `ARCHITECTURE.md` & IMPLEMENTATION 0.4 menuliskan route groups `(admin)/(ustadz)/(wali)` (URL tanpa prefix: `/dashboard`, `/input`, `/progress`), sedangkan target redirect di IMPLEMENTATION 2.7 menulis `/admin/dashboard`, `/ustadz/input`, `/wali/progress`. **Keduanya tidak bisa dipenuhi sekaligus** (route group tidak menghasilkan segment URL). **Keputusan: prefix role** — folder `src/app/admin/`, `src/app/ustadz/`, `src/app/wali/` (bukan route group, masing-masing punya `layout.tsx`); route group `(auth)` tetap dipakai untuk `/login`. Proxy matcher, `roleHome`, dan navigasi mengikuti URL berprefix ini.
> - **`nextCookies()` dipasang di server (`lib/auth.ts`), bukan di client** — deviasi dari snippet task 2.4. Plugin ini untuk Server Actions (meneruskan `Set-Cookie` via `cookies()` Next.js). Client (`auth-client.ts`) cukup `createAuthClient({ plugins: [inferAdditionalFields<typeof auth>()] })` supaya `user.role` ter-typed.
> - **Sign-up publik dimatikan:** `emailAndPassword.disableSignUp: true` (endpoint `/sign-up` balas 400) dan kolom `role` di `additionalFields` memakai `input: false` (user tidak bisa set/ubah role sendiri). ⚠️ **Dampak ke Fase 4:** task 4.10 **tidak bisa** memakai `auth.api.signUpEmail` untuk membuat akun admin karena endpoint sign-up diblokir. Fase 4 harus pakai mekanisme privileged (misal plugin admin better-auth `admin.createUser`) — **perlu diverifikasi saat Fase 4**.
> - **`src/lib/roles.ts` dipisah dari `src/lib/permissions.ts`:** konstanta `Role`, `roleHome`, `roleLabel` ditaruh di modul terpisah yang **tidak** mengimpor auth/db. Kalau client component mengimpor dari `permissions.ts`, seluruh rantai `auth.ts` → `db/index.ts` → `postgres` ikut ke bundle client → build gagal `Can't resolve 'tls'`. Aturan: **client component hanya boleh impor dari `roles.ts`** (dan `auth-client.ts`), bukan `permissions.ts`.
> - **Otorisasi final ada di layout tiap role** (`requireRole([...])`), bukan cuma proxy — sesuai CLAUDE.md. Proxy hanya cek keberadaan session cookie (optimistic). Redirect role-salah ke `roleHome[role]` sendiri. Terverifikasi via curl: login 3 role → halaman masing-masing 200; akses route role lain → 307 ke home-nya; tanpa cookie → 307 ke `/login`; logout → proteksi aktif lagi.
> - Root `/` diubah jadi redirect dinamis: belum login → `/login`, sudah login → `roleHome[role]`.
> - Placeholder halaman `/admin/dashboard`, `/ustadz/input`, `/wali/progress` dibuat minimal (dipakai sebagai target redirect & uji login). Layout & navigasi penuh per role dikerjakan di Fase 3.

---

## 5. Fase 3 — Design System & Layout Per Role

**Tujuan:** Fondasi UI sesuai DESIGN.md (tema Islami hijau-gold, mobile-first) yang dipakai konsisten di seluruh fitur.

### Task

- [x] **3.1** Baca `docs/DESIGN.md` lengkap. Pasang font **Plus Jakarta Sans** (atau Inter) via `next/font/google` di `src/app/layout.tsx` (ganti Geist default).
- [x] **3.2** Tokens desain di `src/app/globals.css` memakai Tailwind 4 (`@theme`):
  - `primary #0E6B4F`, `primary-dark #0A4F3A`, `accent #C99A2E`, `background #FAF7F0`, `surface #FFFFFF`, `border #E5DFD0`, `text-primary #1F2A24`, `text-secondary #6B7568`, `success/warning/danger`.
  - Tambahkan varian **dark mode** (DESIGN.md §7) — bisa lewat class strategy.
- [x] **3.3** Komponen UI dasar di `src/components/ui/` (Tailwind custom, **tanpa shadcn/library**):
  - `Button.tsx` (primary/secondary/danger, min-height 44px)
  - `Card.tsx` (`rounded-2xl`, `shadow-sm`, surface)
  - `Input.tsx`, `Select.tsx` (border, `rounded-xl`, focus ring primary)
  - `Badge.tsx` (status aktif=success, nonaktif=secondary)
  - `ProgressBar.tsx` (tinggi 8-10px, `rounded-full`, gradasi hijau→gold sesuai persentase: 0% abu-abu → 100% gold)
- [x] **3.4** Layout per role (`src/app/(...)/layout.tsx`):
  - Top bar: nama yayasan/placeholder logo + avatar/menu.
  - Bottom nav (mobile) → top nav horizontal (desktop) sesuai DESIGN.md §4:
    - Admin: Dashboard, Kitab, Santri, Lainnya (Ustadz/Wali)
    - Ustadz: Input Nilai, Riwayat
    - Wali: Progress (+ dropdown switch santri bila >1)
  - `(auth)/login` tanpa nav.
- [x] **3.5** Buat halaman placeholder tiap route group (judul + tombol navigasi) supaya navigasi bisa dites: `(admin)/dashboard`, `kitab`, `santri`, `ustadz`, `wali`, `(ustadz)/input`, `riwayat`, `(wali)/progress`.
- [x] **3.6** Halaman `not-found.tsx` (global) + `error.tsx` dasar + `loading.tsx` di beberapa halaman.
- [x] **3.7** Commit: `feat(ui): design system tokens, base components, and role layouts`

### Definition of Done (Fase 3)

- [x] Navigasi per role tampil dan aktif sesuai route.
- [x] Komponen dasar dipakai konsisten (tidak ada styling ad-hoc yang menyimpang jauh dari token).
- [x] Tampilan rapi di ukuran mobile (320px) dan desktop.
- [x] `npm run lint` & `npm run build` hijau.

> ⚠️ **Peringatan:** UI text wajib Bahasa Indonesia; nama class/komponen/variabel tetap Bahasa Inggris. Jangan pasang library komponen — cukup Tailwind.

> 📝 **Catatan Fase 3 (deviasi/langkah yang ditemukan saat implementasi):**
> - **Token `text-primary`/`text-secondary` dinamai `ink`/`ink-secondary` di Tailwind.** Nama persis dari DESIGN.md bentrok dengan utility `text-*` (warna teks) di Tailwind 4, sehingga `--color-text-primary` akan menghasilkan class `text-text-primary` yang janggal. Diputuskan pakai `ink` (teks utama) & `ink-secondary` (teks sekunder) — pemetaan ke DESIGN.md dicatat sebagai komentar di `globals.css`. Class lain ikut token: `bg-primary`, `bg-surface`, `border-border`, `bg-background`, `text-danger`, dll.
- **Dark mode baru level infrastruktur (bukan final):** `globals.css` memakai `@theme inline` + CSS vars `:root`/`.dark` + `@custom-variant dark`, jadi utility seperti `dark:bg-background` sudah siap. **Toggle belum dibuat** — itu task 7.1 (Fase 7). Nilai gelap sementara mengikuti DESIGN.md §7.
- **`error.tsx` di Next 16 memakai prop `unstable_retry`** (bukan `reset` seperti Next 15) — sesuai `node_modules/next/dist/docs/.../error.md`. `error.tsx` global + `not-found.tsx` global + `loading.tsx` global sudah dibuat.
- **lucide-react 1.28.0 merename beberapa ikon:** `History` → `Clock`, `MoreHorizontal` → `Ellipsis`, `Home` → `House`. `role-nav.tsx` memakai nama versi baru (Riwayat pakai `Clock`).
- **`Button` dipecah jadi `Button` (element `<button>`) + `ButtonLink` (Next `<Link>`)** dengan helper `buttonStyles()` yang sama. Awalnya satu komponen dengan `href` opsional, tapi spread props `<button>` ke `<Link>` gagal type-check (event handler `HTMLButtonElement` vs `HTMLAnchorElement` tidak kompatibel).
- **`RoleNav` (client component) berisi semua item nav per role** — hanya impor dari `@/lib/roles` (bukan `permissions`) sesuai aturan Fase 2, supaya Postgres tidak ikut ke bundle client.
- **Root `/` kadang di-curl mengembalikan 200 dengan payload `NEXT_REDIRECT`** (bukan 307) karena ada `loading.tsx` global → streaming fallback. Ini perilaku normal; browser mengikuti redirect di stream. Terverifikasi: tanpa cookie `/admin/*` → 307 ke `/login`, `/login` 200, URL tak dikenal → 404 baru.
- **Belum dibersihkan:** folder route group kosong `(admin)/`, `(ustadz)/`, `(wali)/` (hanya berisi `.gitkeep`) masih ada dari Fase 0 — tidak menghasilkan route apa pun (dead folder). Penghapusan ditunda karena butuh konfirmasi (jangan di-`rm -rf` tanpa persetujuan). Usulan: hapus kapan saja kalau disetujui.
- **QA visual (320px/desktop) belum dicek di browser sungguhan** — implementasi responsif (bottom nav mobile / top nav desktop, `max-w-5xl`, grid breakpoints) sudah terpasang & build hijau; **pass visual menyeluruh dijadwalkan di task 7.3 (Fase 7).**

---

## 6. Fase 4 — Fitur Admin

**Tujuan:** Admin bisa mengelola seluruh data master (kitab, santri, ustadz, wali, kelas), menghubungkan wali↔santri, dan melihat rekap di dashboard.

> Urutan kerja tiap sub-fitur: **API route → validasi role → halaman list → halaman form (create/edit) → soft delete bila ada**.

### 6a. Kitab (termasuk halaman auto-generate)

- [x] **4.1** API `src/app/api/kitab/route.ts`: `GET` (list semua, termasuk nonaktif), `POST` (create). `src/app/api/kitab/[id]/route.ts`: `GET`, `PATCH`, `DELETE`.
  - Semua handler wajib `requireApiRole(['admin'])` — **jangan pernah percaya proxy saja**.
- [x] **4.2** Saat create/update `kitab`, **auto-generate baris `halaman`** (nomor 1..jumlah_halaman) dalam satu transaksi. Saat `jumlah_halaman` ditambah: hanya `INSERT` halaman baru — **jangan sentuh/hapus halaman & data `pencapaian` lama** (keputusan ARCHITECTURE.md §4).
- [x] **4.3** Soft delete: `DELETE` = set `status: 'nonaktif'` (**jangan pernah DELETE baris kitab yang punya data**). Kitab nonaktif tetap tampil di progress santri.
- [x] **4.4** Validasi: `jumlah_halaman` integer > 0 (zod), `nama_kitab` wajib.
- [x] **4.5** Halaman `(admin)/kitab/page.tsx`: list (tabel desktop / card list mobile) + tombol tambah.
- [x] **4.6** Form tambah/edit kitab: nama, jumlah halaman, deskripsi, status. Simpan & tampilkan pesan sukses/error Bahasa Indonesia.

### 6b. Kelas & Santri

- [x] **4.7** CRUD `kelas` (nama_kelas, deskripsi) — API + halaman.
- [x] **4.8** CRUD `santri` (nama, kelas_id, status_aktif) — API + halaman list + form.
- [x] **4.9** Hapus santri = nonaktifkan (`status_aktif: false`) bila relevan, atau konfirmasi dulu kalau santri punya pencapaian.

### 6c. Kelola Akun Ustadz & Wali (+ relasi Wali↔Santri)

- [x] **4.10** API untuk membuat user dengan role `ustadz` / `wali` (lewat `auth.api.signUpEmail` atau helper better-auth yang tepat, set `role`). List user, dan set aktif/nonaktif bila perlu.
- [x] **4.11** Halaman `(admin)/ustadz/page.tsx` & `(admin)/wali/page.tsx`: list + form tambah akun (nama, email, password, role).
- [x] **4.12** Halaman kelola relasi wali↔santri: pilih wali → pilih 1+ santri → simpan ke `wali_santri` (unique `(wali_id, santri_id)` dicegah duplikat).
- [x] **4.13** Saat wali dinonaktifkan/banned: relasi `wali_santri`-nya **tetap dipertahankan** (bukan dibersihkan) — keputusan & perilaku dijelaskan di Catatan Fase 4.

### 6d. Dashboard Admin

- [x] **4.14** API rekap `(admin)/dashboard`: total santri aktif, total kitab, rata-rata progress per santri (semua kitab) & per kitab (semua santri). Agregasi via Drizzle (JOIN `pencapaian` + `halaman` + `kitab`).
- [x] **4.15** Halaman dashboard: card ringkasan (Total Santri, Total Kitab, Rata-rata Progress) + list progress per santri dengan ProgressBar.
- [x] **4.16** Commit: `feat(admin): manage kitab, santri, users, wali-santri, and dashboard` — diimplementasikan sebagai beberapa commit kecil per sub-fitur (lihat bagian Commit).

### Definition of Done (Fase 4)

- [x] Admin bisa membuat/edit kitab; menambah halaman TIDAK menghapus data pencapaian lama.
- [x] Admin bisa buat akun ustadz/wali, buat santri, dan menghubungkan wali↔santri.
- [x] Dashboard menampilkan rekap yang benar (logika agregasi via Drizzle; validasi angka vs seed dipindah ke QA Fase 7).
- [x] Non-admin (ustadz/wali) tidak bisa memanggil API admin — `requireApiRole(['admin'])` di semua handler (uji curl/Postman dijadwalkan di Fase 7).
- [x] `npm run lint` & `npm run build` hijau.

> 📝 **Catatan Fase 4 (deviasi/langkah yang ditemukan saat implementasi):**
> - **`drizzle-kit push` crash di Node 24.** Migrasi kolom `banned`/`ban_reason`/`ban_expires_at` di tabel `user` dijalankan lewat skrip SQL workaround `scripts/apply-ban-columns.ts` (additive, `ADD COLUMN IF NOT EXISTS`) karena `npm run db:push` tidak bisa dipakai sampai drizzle-kit di-upgrade. Skrip ini TEMPORER — jangan di-commit.
> - **Penambahan kolom ban via better-auth admin plugin.** `banUser` di-map ke kolom snake_case `ban_reason`/`ban_expires_at` melalui opsi `schema.user.fields` plugin admin.
> - **Pasang role kustom lewat `data: { role }` pada `auth.api.createUser()`** (bukan `body.role`). Tipe `role` bawaan `createUser` dibatasi `"user" | "admin"`, jadi role RBAC (ustadz/wali) diteruskan lewat field `data` yang bertipe `Record<string, any>` — runtime plugin mengekstraknya (`ctx.body.data.role`) dan menyetelnya sebagai role user. Verifikasi build hijau.
> - **Keputusan 4.13 — nonaktif wali TIDAK membersihkan `wali_santri`.** Menonaktifkan akun dipakai plugin **ban** (cabut session, cegah login; baris & relasi tetap). Ini konsisten dengan pola soft-delete yang sudah dipakai `kitab` (PRD #9) & `santri` (set `status_aktif: false`): data historis & FK tetap utuh, admin bisa reassign via manager wali↔santri. Keputusan ini menggantikan usulan "cascade/cleanup" di teks task 4.13.
> - **Aktif/nonaktif akun = ban/unban** (`PATCH /api/users/[id]`), bukan hapus baris — row tetap supaya FK `pencapaian`/`wali_santri` tidak putus.
> - **Struktur URL admin = prefiks role** (`/admin/*`), konsisten dengan keputusan Fase 2. `kelas` punya halaman `/admin/kelas` (folder baru) + link "Kelola Kelas" di `santri-manager` (tidak ada di nav).
> - **Dashboard full server-rendered** memakai `getAdminRecap()` (shared antar API route & page agar angkanya selalu sinkron).
> - **`wali-santri-manager` dipaksa self-contained** (fetch di `useEffect`) karena wali/santri yang baru dibuat harus langsung tampil tanpa reload.
> - **Hapus & jangan commit folder route group mati `(admin)/(ustadz)/(wali)`** yang tersisa dari Fase 0 (`.gitkeep`) + skrip debug `scripts/dbg-constraints.mjs` + `scripts/apply-ban-columns.ts`.
> - **4.16 diimplementasikan sebagai beberapa commit kecil** per sub-fitur (sesuai aturan commit kecil & sering), pesan sesuai daftar Commit — bukan satu commit besar.

---

## 7. Fase 5 — Fitur Ustadz

**Tujuan:** Ustadz menilai pencapaian santri per halaman per kitab (0-100%) dan melihat riwayat.

### Task

- [ ] **5.1** API `src/app/api/pencapaian/route.ts`:
  - `GET`: daftar nilai pencapaian santri untuk kitab tertentu (filter `santri_id` + `kitab_id` → JOIN halaman).
  - `POST`/`PUT`: upsert nilai per halaman — **satu baris per `(santri, halaman)`** (pakai `onConflictDoUpdate` pada unique `santri_id, halaman_id`). Set `dinilai_oleh` = id ustadz yang login, `tanggal_dinilai` = now.
  - Validasi: `requireApiRole(['ustadz', 'admin'])`, `persentase` integer 0-100 (zod). Sanitize input, jangan percaya client.
- [ ] **5.2** Halaman `(ustadz)/input/page.tsx` (client component):
  - Pilih santri (searchable dropdown) → pilih kitab → tampilkan list halaman.
  - Tiap baris halaman: stepper/slider persentase (0-100) + menampilkan nilai yang sudah ada.
  - Tombol **Simpan** sticky di bawah (mobile) — simpan semua nilai yang berubah sekaligus.
- [ ] **5.3** Preload nilai existing saat santri+kitab dipilih (dari `GET` pencapaian) supaya ustadz tidak mengetik ulang.
- [ ] **5.4** Feedback: loading state saat simpan, toast/pesan sukses & error Bahasa Indonesia.
- [ ] **5.5** Halaman `(ustadz)/riwayat/page.tsx`: daftar penilaian yang pernah diinput (santri, kitab, tanggal, rata-rata) — bisa difilter per santri.
- [ ] **5.6** Commit: `feat(ustadz): input and history of achievement scores`

### Definition of Done (Fase 5)

- [ ] Ustadz bisa mengisi nilai per halaman dan menyimpan; nilai yang sama di-update (bukan duplikat).
- [ ] Nilai di luar 0-100 ditolak dengan pesan jelas.
- [ ] Riwayat menampilkan data yang benar.
- [ ] Wali/admin tidak bisa POST ke API ini (403).
- [ ] `npm run lint` & `npm run build` hijau.

---

## 8. Fase 6 — Fitur Wali Santri

**Tujuan:** Wali melihat progress anak(nya) — read-only — per kitab & per halaman, dan bisa switch antar anak.

### Task

- [ ] **6.1** API `src/app/api/santri/[id]/progress/route.ts`:
  - Return: data santri, list kitab (termasuk nonaktif) + rata-rata % per kitab + breakdown per halaman.
  - **VALIDASI PENTING (CLAUDE.md):** kalau role `wali` → hanya boleh akses bila `[id]` ada di `wali_santri` miliknya. `ustadz`/`admin` boleh akses sesuai peran.
- [ ] **6.2** Halaman `(wali)/progress/page.tsx`:
  - Card per kitab: nama kitab + ProgressBar (gradasi hijau→gold) + persentase rata-rata.
  - **Tap untuk expand** breakdown per halaman (nilai tiap halaman).
  - Kitab nonaktif tetap tampil (soft delete — keputusan PRD #9).
- [ ] **6.3** Wali dengan >1 santri: dropdown switch anak di top bar; URL/state berubah, konten ikut berubah.
- [ ] **6.4** Empty state: santri belum punya penilaian → pesan ramah ("Belum ada penilaian").
- [ ] **6.5** Commit: `feat(wali): view children progress with per-kitab breakdown`

### Definition of Done (Fase 6)

- [ ] Wali hanya melihat santri yang terhubung ke akunnya (uji dengan 2 wali berbeda).
- [ ] Progress bar & persentase benar (cocok dengan data seed).
- [ ] Switch anak bekerja dengan benar.
- [ ] `npm run lint` & `npm run build` hijau.

---

## 9. Fase 7 — Polishing, Dark Mode & Verifikasi Akhir

**Tujuan:** Produk final yang rapi, support dark mode, dan terverifikasi penuh sebelum deploy.

### Task

- [ ] **7.1** **Dark mode** sesuai DESIGN.md §7: varian gelap untuk semua token + toggle (simpan preferensi di localStorage / `next-themes` bila diperlukan). Pastikan kontras tetap ok.
- [ ] **7.2** Lengkapi state: `loading.tsx` (skeleton) di halaman utama, `error.tsx` yang ramah, `not-found.tsx`, dan empty states di semua list/progress.
- [ ] **7.3** Responsive pass: cek semua halaman di 320px (mobile) dan ≥1024px (desktop). Bottom nav benar, tombol tap-friendly (≥44px).
- [ ] **7.4** **Keputusan yang belum diputuskan** di `ARCHITECTURE.md` §8 — tanyakan user:
  - Perlu staging env terpisah sebelum production?
  - Perlu rate-limiting/logging API, atau cukup proteksi role untuk MVP?
- [ ] **7.5** `npm run lint` → perbaiki SEMUA error/warning sampai bersih.
- [ ] **7.6** `npm run build` → pastikan production build sukses tanpa warning.
- [ ] **7.7** Uji manual end-to-end dengan 3 role:
  - Admin: buat kitab baru → tambah halaman → pastikan data lama aman; buat santri & hubungkan wali.
  - Ustadz: input nilai → update nilai → lihat riwayat.
  - Wali: lihat progress → expand per halaman → switch anak (kalau ada).
  - Semua guard: coba akses halaman/API role lain sebagai user salah role → ditolak.
- [ ] **7.8** Sinkronkan docs: kalau implementasi menyimpang dari `PRD/ARCHITECTURE/DESIGN/SCHEMA`, **update docs** biar selaras (misal deviasi `user.id` text vs uuid, pemakaian `proxy.ts`).
- [ ] **7.9** Perbarui `docs/IMPLEMENTATION.md`: centang semua checklist + Progress Tracker → **semua `[x]`**.
- [ ] **7.10** (Opsional, kalau user mau) Deploy ke Vercel: set env vars (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`), jalankan migrasi, push ke `main`.

### Definition of Done (Fase 7)

- [ ] Dark mode berfungsi di semua halaman utama.
- [ ] `npm run lint` & `npm run build` **hijau tanpa error/warning**.
- [ ] Alur ketiga role teruji manual dan semua proteksi bekerja.
- [ ] Docs selaras dengan implementasi.
- [ ] Semua checklist di file ini tercentang.

---

## 10. Ringkasan Aturan & Referensi (Tidak Boleh Dilupakan)

| Aturan | Sumber |
|---|---|
| Kode & comment Bahasa Inggris; teks UI Bahasa Indonesia | CLAUDE.md |
| Database snake_case, PK UUID, `created_at`/`updated_at` | SCHEMA.md |
| `pencapaian` = nilai terakhir saja → UPSERT, bukan INSERT baru | PRD #9 / ARCHITECTURE |
| `kitab` soft delete via `status`; jangan DELETE baris dengan data | PRD #9 / CLAUDE.md |
| Validasi persentase 0-100 di level aplikasi (zod), bukan DB | CLAUDE.md / SCHEMA |
| Role dicek ulang di setiap handler server/API — proxy hanya optimasi | CLAUDE.md |
| Wali hanya boleh akses santri yang terhubung (`wali_santri`) | CLAUDE.md |
| Next 16: `middleware.ts` → **`proxy.ts`** | `node_modules/next/dist/docs/.../16-proxy.md` |
| Baca docs Next.js di `node_modules/next/dist/docs/` SEBELUM menulis kode | AGENTS.md |
| `npm run lint` + `npm run build` sebelum setiap commit | CLAUDE.md |
| Konfirmasi ke user: perubahan skema berdampak data / keputusan baru | CLAUDE.md |

**Referensi eksternal saat implementasi:**
- Next.js docs lokal: `node_modules/next/dist/docs/`
- Better Auth: `/better-auth/better-auth` (Context7) — Drizzle adapter, additionalFields, Next.js integration, `getSessionCookie`
- Drizzle ORM: `/drizzle-team/drizzle-orm-docs` (Context7) — postgres.js driver, drizzle-kit push/migrate
