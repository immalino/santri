# Laporan Teks per Sesi dengan Template per Kegiatan — Design

Tanggal: 2026-09-16 | Status: disetujui user (semua 4 bagian) | Pendekatan: A (tabel template + render client-side)

## 1. Konteks & tujuan

Halaman absensi sudah punya: daftar kegiatan → detail kegiatan (peserta + sesi) → input absensi per sesi.
Kebutuhan baru: dari tiap sesi bisa menghasilkan **laporan teks** (untuk ditempel ke WA/grup) memakai **template bebas tulis** yang disimpan **per kegiatan** (satu kegiatan boleh punya banyak template: per sesi, mingguan, dll) dengan **variabel `{{...}}`** dari katalog tetap.

Tujuan v1: buat/edit/hapus template per kegiatan → di tiap sesi pilih template via dropdown → preview terisi → salin.

## 2. Keputusan yang disepakati

- Hasil: preview + tombol Salin (tanpa unduh file).
- Scope: N template per kegiatan; semua template render dalam konteks **satu sesi yang dibuka** (template "mingguan" = format teks berbeda, bukan agregat lintas sesi).
- Sintaks: `{{nama_variabel}}`, spasi dalam kurung ditoleransi, nama snake_case huruf kecil.
- Penambah variabel baru murah (satu entri fungsi murni, tanpa ubah DB).

## 3. Arsitektur & aliran data

- Penyimpanan: tabel baru `kegiatan_template` (lihat §4). CRUD via API per kegiatan.
- Render: fungsi murni `src/lib/laporan-template.ts`, jalan di browser. Halaman server memuat data sesi + list template sekali sebagai props; ganti dropdown tidak fetch ulang.
- Pola UI mengikuti kode yang ada: `Dialog` untuk editor, `toast` untuk error/sukses, komponen shared untuk admin & ustadz (hanya `basePath` beda). Wali tidak tersentuh.

## 4. Data & API

Tabel `kegiatan_template`: `id` uuid PK, `kegiatan_id` uuid FK → `kegiatan.id` cascade + index, `nama` text, `isi` text, `created_at`/`updated_at`. Tanpa unique DB. Migrasi via `db:push` (pola Fase 10).

Validasi zod: nama 1–120 karakter (trim), isi 1–10.000 karakter (trim).

Routes (`requireApiRole(["admin","ustadz"])` untuk tulis; GET juga admin/ustadz saja, wali 403):
- `GET/POST /api/kegiatan/[id]/template` — list urut `created_at`; create `{nama, isi}`.
- `PATCH/DELETE /api/kegiatan/[id]/template/[templateId]` — update parsial; hapus. 404 bila template bukan milik kegiatan. Validasi kegiatan[UUID_PLACEHOLDER_1] ada (404 bila tidak).
- Hapus kegiatan (cascade) ikut hapus template. Tambah/hapus peserta atau sesi tidak menyentuh template.

Helper: `getKegiatanTemplates(kegiatanId)` di `src/lib/absensi-stats.ts` untuk halaman server detail & sesi. `getSesiAbsensi` diperluas mengembalikan `totalSesi` (jumlah sesi kegiatan itu) agar konteks laporan lengkap tanpa query tambahan di halaman.

## 5. Mesin variabel (katalog tetap)

Konteks dibangun dari `SesiAbsensiData` + `total_sesi` kegiatan. Status `null` (belum diabsen) dihitung terpisah, bukan bagian hadir/izin/tanpa_keterangan.

Kegiatan & sesi: `nama_kegiatan`, `judul_sesi` (kosong bila null), `catatan_sesi` (kosong bila null), `total_peserta` (peserta terdaftar), `total_sesi` (jumlah sesi kegiatan).

Tanggal sesi: `hari` (mis. Sabtu), `tanggal` (mis. 12 Jan 2026), `tanggal_panjang` (mis. Sabtu, 12 Januari 2026). Locale `id-ID`.

Jumlah umum: `jumlah_hadir`, `jumlah_izin`, `jumlah_tanpa_keterangan`, `jumlah_tidak_hadir` (= izin + tanpa_keterangan), `jumlah_belum_diabsen`.

Jumlah hadir berfilter (11): `jumlah_hadir_laki_laki`, `jumlah_hadir_perempuan`, `jumlah_hadir_pra_remaja`, `jumlah_hadir_remaja`, `jumlah_hadir_pra_nikah`, `jumlah_hadir_pra_remaja_laki_laki`, `jumlah_hadir_pra_remaja_perempuan`, `jumlah_hadir_remaja_laki_laki`, `jumlah_hadir_remaja_perempuan`, `jumlah_hadir_pra_nikah_laki_laki`, `jumlah_hadir_pra_nikah_perempuan`.

Persentase (5, penyebut `total_peserta`, 0 peserta → `0%`, `Math.round` + `%`): `persen_hadir`, `persen_izin`, `persen_tanpa_keterangan`, `persen_tidak_hadir`, `persen_belum_diabsen`.

Daftar (bernomor `1. Nama`, alfabetis locale `id`, entri izin menambahkan ` (keterangan)` bila ada; kosong → `(tidak ada)`):
`daftar_hadir`, `daftar_izin`, `daftar_tanpa_keterangan`, `daftar_tidak_hadir`, `daftar_belum_diabsen`, `daftar_hadir_laki_laki`, `daftar_hadir_perempuan`, `daftar_hadir_pra_remaja`, `daftar_hadir_remaja`, `daftar_hadir_pra_nikah`.

Aturan: variabel tak dikenal dibiarkan apa adanya + dikembalikan sebagai daftar `unknownVars` untuk peringatan. API fungsi:

```ts
buildLaporanContext(sesi: SesiAbsensiData, totalSesi: number): LaporanContext
renderTemplate(isi: string, ctx: LaporanContext): { text: string; unknownVars: string[] }
VARIABLE_CATALOG: { name: string; description: string }[] // untuk contekan UI
```

## 6. Komponen & UI

`TemplateManager` (baru, dipakai di `KegiatanDetailManager` sebagai seksi "Template Laporan" di bawah Sesi): daftar (nama + potongan isi + waktu ubah) + Tambah/Edit/Hapus. Editor = `Dialog` existing: field Nama + textarea Isi + contekan variabel (klik sisip di kursor) + peringatan typo (deteksi sintaks tanpa data). Simpan via API + refresh pola existing.

`LaporanCard` (baru, di halaman sesi admin & ustadz setelah kartu header, sebelum daftar absensi): dropdown template → preview `<pre>` scroll (`whitespace-pre-wrap`) → tombol Salin (`navigator.clipboard`, sukses toast; gagal toast error + teks terseleksi untuk salin manual) → peringatan typo bila ada → bila belum ada template: empty state + link ke detail kegiatan. Mobile-first: tombol min 44px, dialog bottom-sheet existing.

## 7. Error handling

API: 404 kegiatan/template salah milik; 403 wali & anonim; 400 validasi zod. UI: semua error via `toast` (pola existing); tombol simpan disabled saat tidak ada perubahan; salin gagal ada fallback seleksi manual.

## 8. Testing & rollout

- `npx tsc --noEmit` dan `npm run lint` bersih (repo belum punya test runner).
- Manual: buat → render sesi (cek filter usia/gender, persen, list kosong, typo) → salin → edit/hapus; cek admin & ustadz; cek wali 403; cek mobile.
- Rollout: `db:push` dengan `.env.local`; update `docs/SCHEMA.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION.md`.

## 9. Batasan v1 (non-goals)

Tanpa agregat lintas sesi/mingguan otomatis, tanpa unduh/PDF, tanpa template khusus per sesi (semua template milik kegiatan), daftar selalu alfabetis, penyebut persen selalu total peserta terdaftar.

## 10. File yang disentuh (rencana)

- `src/db/schema.ts` (tabel + relasi), `src/lib/validations.ts` (skema template).
- Baru: `src/lib/laporan-template.ts`, `src/components/shared/template-manager.tsx`, `src/components/shared/laporan-card.tsx`, API `src/app/api/kegiatan/[id]/template/route.ts` + `[templateId]/route.ts`.
- Edit: `src/lib/absensi-stats.ts` (helper `getKegiatanTemplates` + `totalSesi` di `getSesiAbsensi`/`SesiAbsensiData`), `KegiatanDetailManager`, halaman detail kegiatan & sesi admin/ustadz, docs.
