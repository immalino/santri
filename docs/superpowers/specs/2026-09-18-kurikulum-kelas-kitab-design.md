# Pemetaan Kitab ke Kelas + Laporan Kenaikan & Halaman Kosong — Design

Tanggal: 2026-09-18 | Status: disetujui user (semua 5 seksi) | Pendekatan: 1 (FK nullable + hitung on-the-fly)

## 1. Konteks & tujuan

`kelas` saat ini hanya label di `santri` (mis. Angkatan 2024), `kitab` berdiri sendiri tanpa kategori, dan progres dihitung rata-rata semua halaman (kosong = 0). Kebutuhan baru: tiap kitab dipetakan ke satu kelas sebagai materi jenjang (contoh: 20 kitab, kelas A/B/C/D — kitab 1–3 materi A, 4–10 materi B, 11–20 materi C, D = sudah khatam semua).

Dua tujuan laporan:
1. Per santri: kurang apa saja agar bisa naik ke kelas berikutnya (kitab + halaman yang belum khatam).
2. Agregat: untuk tiap kitab, rata-rata penguasaan per halaman dari semua santri, agar ustadz tahu lubang terbesar untuk sesi pengajian tambahan.

## 2. Keputusan yang disepakati

- Pakai tabel `kelas` yang ada sebagai jenjang (bukan tabel baru). Tambah kolom `urutan` (A=1, B=2, C=3, D=4) + flag `bebas_syarat`.
- Satu kitab = satu kelas (`kitab.kelas_id` nullable). Kitab tanpa kelas = belum dipetakan = diabaikan dari syarat & laporan lubang. Kelas boleh kosong tanpa kitab (mis. D).
- Syarat naik **kumulatif**: santri kelas berurutan `U` wajib khatam semua kitab milik kelas berurutan `<= U`.
- **Khatam = 100% semua halaman.** Satu halaman khatam bila `persentase == 100`; null / 0–99 = belum.
- Kelas `bebas_syarat = true` (mis. kelas Lulus untuk pra-nikah): penghuninya bebas kewajiban — status selalu "Lulus / tidak ada kewajiban" — dan dikecualikan dari penyebut laporan lubang.
- Kitab **nonaktif tidak dihitung** sebagai syarat (tetap tampil di detail dengan badge, konsisten PRD tampil) supaya admin bisa mempensiunkan materi tanpa mengunci kelulusan.
- Santri tanpa kelas: tanpa syarat + banner "Belum ditempatkan di kelas".
- Laporan lubang: satu blok per kitab (aktif + terpetakan); tiap halaman menampilkan rata-rata semua santri aktif kecuali kelas lulus (belum dinilai = 0); toggle global Nomor halaman | Paling kosong, seri nilai → nomor halaman.
- Akses: mapping/urutan = admin saja. Kartu sisa: admin/ustadz semua santri, wali hanya anaknya. Laporan lubang: admin/ustadz saja, wali 403.

## 3. Arsitektur & aliran data

Mengikuti pola yang sudah ada (`santri-progress.ts`, `admin-stats.ts`): agregasi dihitung server-side saat halaman dibuka, tanpa tabel snapshot dan tanpa API JSON baru untuk laporan.

- Helper baru `src/lib/kenaikan.ts`:
  - `getKenaikanStatus(santriId)` → scope kumulatif + status + daftar kitab belum khatam + halaman belum 100%. Dipakai kartu sisa di detail santri admin/ustadz/wali (server component, reuse `getSantriProgressData` sebagai basis agar angka konsisten).
  - `getLubangReport()` → per kitab: semua halaman + `rataRata`/`dinilaiCount`/`totalSantri` + rata-rata kitab. Dipakai seksi dashboard admin + halaman `/ustadz/laporan` (komponen shared yang sama).
- CRUD existing diperluas (bukan route baru): `POST/PATCH /api/kelas` terima `urutan` + `bebas_syarat`; `POST/PATCH /api/kitab` terima `kelas_id` nullable.
- Hapus kelas yang masih dipetakan kitab → ditolak 400 dengan pesan Indonesia (restrict, bukan set-null diam-diam).

## 4. Data & API

`kelas`: tambah `urutan integer NOT NULL DEFAULT 0` (boleh kembar = dianggap setara, syarat pakai `<=`) dan `bebas_syarat boolean NOT NULL DEFAULT false`. `kitab`: tambah `kelas_id uuid NULL REFERENCES kelas.id` (on delete restrict di level aplikasi; hapus kelas berisi kitab ditolak).

```ts
// tambahan di db/schema.ts
export const kelas = pgTable("kelas", {
  // ...kolom existing
  urutan: integer("urutan").default(0).notNull(),
  bebasSyarat: boolean("bebas_syarat").default(false).notNull(),
});
export const kitab = pgTable("kitab", {
  // ...kolom existing
  kelasId: uuid("kelas_id").references(() => kelas.id),
});
```

Validasi zod (pesan Indonesia): `urutan` integer ≥ 0; `bebas_syarat` boolean; `kelas_id` UUID valid atau null (404 bila id kelas tidak ada). Form kelas tambah field Urutan + checkbox "Kelas lulus (bebas syarat khatam)". Form kitab tambah dropdown Kelas + opsi "Tanpa kelas". Migrasi additive (`db:push` di dev; prod via skrip SQL additive karena bug introspeksi drizzle-kit yang sudah dicatat di IMPLEMENTATION).

Routes yang berubah (`requireApiRole(["admin"])` untuk tulis):
- `POST/PATCH /api/kelas` — terima `{nama_kelas, deskripsi, urutan, bebas_syarat}`.
- `POST/PATCH /api/kitab` — terima `{nama_kitab, jumlah_halaman, deskripsi, status, kelas_id}`.
- `DELETE /api/kelas/[id]` — 400 bila masih ada kitab memetakan kelas ini ("Kelas masih dipakai N kitab").

## 5. Komponen & UI

Kartu "Syarat naik kelas" (baru, di halaman detail santri yang sudah ada — `mode="edit"` admin/ustadz, `mode="read"` wali):
- Satu baris status: "Siap naik ke [B]" / "Kurang N kitab, M halaman untuk naik ke [B]" / "Lulus, tidak ada kelas lanjutan" / "Bebas syarat (kelas lulus)" / "Belum ditempatkan di kelas".
- Daftar hanya kitab dalam scope yang **belum khatam**: nama kitab + badge kelasnya + "kurang X/Y halaman", tap expand = nomor halaman belum 100% + nilai saat ini (null = "belum dinilai"). Kitab sudah khatam disembunyikan dari kartu ini agar fokus (daftar kitab lengkap di bawah kartu tetap tampil semua, tidak berubah). Urut: urutan kelas lalu nama kitab; halaman menaik.
- Mobile-first mengikuti DESIGN.md (card `rounded-2xl`, badge, progress existing). Wali: kartu sama, read-only, ownership check existing tetap berlaku.

Laporan lubang (komponen shared baru, dipakai seksi dashboard admin + halaman baru `/ustadz/laporan` dengan nav "Laporan"):
- Satu blok per kitab aktif yang terpetakan (urut urutan kelas pemilik lalu nama kitab). Tiap blok: semua halaman + toggle global Nomor halaman | Paling kosong.
- Empty state global bila belum ada kitab terpetakan ("Belum ada materi yang dipetakan ke kelas."). Wali tidak melihat laporan ini.

## 6. Aturan syarat naik (formal)

```
U = urutan kelas santri; berikut = kelas urutan terkecil > U (tidak ada = terminal)
scope(U) = kitab status aktif dengan kelas.urutan <= U,
           kecuali kitab milik kelas bebas_syarat dan kitab kelas_id null / nonaktif
bila kelas santri bebas_syarat → status "bebas syarat", scope kosong
bila santri tanpa kelas → status "tanpa kelas", scope kosong
khatam(halaman) = persentase == 100
khatam(kitab) = semua halamannya khatam
siap naik = semua kitab scope(U) khatam  → target = berikut (atau "lulus" bila terminal)
```

Kelas D kosong (tanpa kitab, U=4): scope = semua kitab berurutan ≤ 4 = 20 kitab → D berarti sudah khatam semua. Kelas Lulus (`bebas_syarat`): scope selalu kosong apa pun urutannya.

## 7. Error handling

- API: 400 validasi zod (urutan negatif/bukan integer, kelas_id bukan UUID), 404 kelas tidak ada, 400 hapus kelas terpakai, 403 wali/non-admin untuk tulis mapping & laporan lubang. Semua pesan Indonesia via pola `toast` existing.
- UI: dropdown kelas kosong → "Belum ada kelas, buat dulu"; kitab tak terpetakan/nonaktif tidak dibuatkan blok; penyebut laporan 0 santri → rata-rata 0 (hindari bagi-nol).

## 8. Testing & rollout

- `npm run lint` + `npm run build` hijau (repo belum punya test runner).
- Manual + skrip tsx sementara (read-only, hapus setelah dipakai, pola Fase 7): mapping kumulatif benar (santri B wajib 1–10), khatam strict 100 (99 = belum), kelas lulus bebas syarat + keluar dari penyebut, urutan toggle dua mode (seri → nomor halaman), guard (wali hanya anaknya; wali 403 laporan lubang & POST mapping; non-admin tulis ditolak), hapus kelas terpakai ditolak.
- Rollout: migrasi additive; update `docs/SCHEMA.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/IMPLEMENTATION.md` (fase baru).

## 9. Batasan v1 (non-goals)

- Tanpa riwayat kenaikan (kapan naik kelas) — hanya status saat ini.
- Tanpa tombol "Naikkan kelas" otomatis — perpindahan kelas tetap manual oleh admin di data santri.
- Tanpa ambang parsial (mis. 80% = lulus) — strict 100% sesuai kesepakatan.
- Tanpa bobot per kitab/halaman dan tanpa urutan kitab kustom (seri pakai nama kitab).
