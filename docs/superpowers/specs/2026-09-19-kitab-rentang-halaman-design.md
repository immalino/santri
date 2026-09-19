# Pembagian Kitab per Rentang Halaman ke Banyak Kelas — Design

Tanggal: 2026-09-19 | Status: disetujui pendekatan A oleh user | Pendekatan: tabel `kitab_bagian` + fallback `kitab.kelas_id`

## 1. Konteks & tujuan

Saat ini satu kitab = satu kelas (`kitab.kelas_id` nullable). Kitab tanpa kelas = belum dipetakan = diabaikan dari syarat & laporan lubang. Laporan lubang (`getLubangReport` + `LubangReport`) menampilkan satu blok penuh per kitab.

Kebutuhan baru (dari ustadz): 1 kitab fisik bisa dibagi ke 2+ kelas berdasarkan rentang halaman. Contoh: Al-Quran ±600 halaman → hal 1-300 materi kelas A, hal 301-600 materi kelas B. Dari 11 kitab, kitab besar dibagi; sisanya tetap 1 kitab = 1 kelas.

Hasil brainstorming yang disepakati:
- Model = rentang halaman (bukan pecah entri kitab, bukan multi-centang kelas).
- Syarat naik = hanya bagian kelasnya (santri A cukup 1-300 untuk naik ke B; santri B wajib 1-600 kumulatif).
- Laporan lubang = dua blok terpisah per bagian.
- Fleksibilitas = bebas banyak bagian per kitab (tidak dibatasi 2).

## 2. Keputusan yang disepakati

- Tabel baru `kitab_bagian`: satu row = satu rentang halaman milik satu kelas.
- Kitab tetap 1 entri fisik (`kitab` + `halaman` + `pencapaian` tidak berubah). Tidak ada duplikasi nilai.
- Fallback kompatibel: bila kitab punya ≥1 bagian → `kitab.kelas_id` diabaikan. Bila 0 bagian → pakai perilaku lama (1 kitab = 1 kelas / tanpa kelas).
- Rentang `halaman_dari .. halaman_sampai` inklusif, dalam `1..kitab.jumlahHalaman`, tidak boleh overlap dalam satu kitab. Gap boleh dan diabaikan (konsisten dengan "tanpa kelas").
- Syarat naik kumulatif tetap, tapi unit scope berubah dari per-kitab menjadi per-bagian: santri kelas berurutan `U` wajib khatam semua bagian milik kelas berurutan `<= U`.
- Khatam tetap strict 100% per halaman (`persentase == 100`).
- Kelas `bebas_syarat`, kitab nonaktif, santri tanpa kelas: aturan lama tetap berlaku, diterapkan di level bagian.
- Laporan lubang: satu blok per bagian (aktif + terpetakan), bukan per kitab.

## 3. Arsitektur & aliran data

Mengikuti pola existing (agregasi server-side saat halaman dibuka, tanpa tabel snapshot, tanpa API JSON baru untuk laporan):

- Helper `src/lib/kenaikan.ts`:
  - `getKenaikanStatus(santriId)` → scope per-bagian + status + daftar bagian belum khatam.
  - `getLubangReport()` → list blok per-bagian: semua halaman dalam rentang + `rataRata`/`dinilaiCount`/`totalSantri` + rata-rata bagian.
- CRUD existing diperluas + route bagian baru (admin saja):
  - `POST/PATCH /api/kitab` tetap terima `kelas_id` (fallback untuk kitab tanpa bagian).
  - Baru: `GET/POST /api/kitab/[id]/bagian`, `PATCH/DELETE /api/kitab/bagian/[bagianId]`.
- Komponen:
  - `kitab-manager.tsx` + `admin/kitab/page.tsx`: tambah editor rentang per kitab.
  - `lubang-report.tsx`: render per-bagian (judul mengandung nama kitab + rentang + kelas).
  - `kenaikan-card.tsx`: render per-bagian yang belum khatam.

## 4. Data & API

```ts
// tambahan di db/schema.ts
export const kitabBagian = pgTable("kitab_bagian", {
  id: uuid("id").defaultRandom().primaryKey(),
  kitabId: uuid("kitab_id").references(() => kitab.id, { onDelete: "cascade" }).notNull(),
  kelasId: uuid("kelas_id").references(() => kelas.id).notNull(),
  halamanDari: integer("halaman_dari").notNull(),
  halamanSampai: integer("halaman_sampai").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index("idx_kitab_bagian_kitab_id").on(t.kitabId),
  index("idx_kitab_bagian_kelas_id").on(t.kelasId),
]);
```

Relasi: `kitab` has-many `kitabBagian`; `kelas` has-many `kitabBagian`.

Validasi zod (pesan Indonesia), di `src/lib/validations.ts`:
- `kitabBagianInputSchema`: `kelasId` UUID wajib, `halamanDari`/`halamanSampai` int ≥1, `dari ≤ sampai`.
- Cek server: kelas ada (404 bila tidak), `sampai ≤ kitab.jumlahHalaman` (400), tidak overlap dengan bagian lain kitab yang sama (400 "Rentang bertabrakan dengan bagian ...").
- Hapus/tambah halaman kitab (`jumlahHalaman` naik): bagian existing tidak diubah; halaman baru di luar semua rentang = gap = diabaikan sampai admin menambah/memperluas bagian. Kurangi tetap ditolak (aturan lama).
- `DELETE /api/kelas/[id]`: tolak 400 bila masih dipakai `kitab.kelas_id` ATAU `kitab_bagian.kelas_id` ("Kelas masih dipakai N kitab/bagian").

Contoh payload:
- `POST /api/kitab/:id/bagian` → `{ kelasId, halamanDari: 1, halamanSampai: 300 }`
- `PATCH /api/kitab/bagian/:bagianId` → parsial sama, validasi ulang overlap.

## 5. Komponen & UI

Kartu "Syarat naik kelas" (`kenaikan-card.tsx`):
- Status satu baris tetap sama (siap/kurang/lulus/bebas/tanpa-kelas).
- Daftar berubah dari per-kitab menjadi per-bagian yang belum khatam: label `"{namaKitab} — hal {dari}-{sampai}"` + badge kelas pemilik + "kurang X/Y halaman", expand = nomor halaman belum 100% dalam rentang itu. Urut: urutan kelas pemilik lalu nama kitab lalu `halamanDari`.
- Kitab tanpa bagian: render sebagai satu bagian virtual `1..jumlahHalaman` dengan kelas dari `kitab.kelas_id` (agar UI seragam).

Laporan lubang (`lubang-report.tsx` + `getLubangReport`):
- Dikelompokkan per kelas (judul "Materi {kelas}") seperti sekarang; tiap bagian berupa accordion tertutup default.
- Judul accordion: `"{namaKitab} — hal {dari}-{sampai}"` + badge `"{N} halaman"` + badge rata-rata. Bila kitab tidak dibagi, tampil `"{namaKitab}"` saja (tanpa suffix rentang) agar tidak berisik.
- Toggle global Nomor halaman | Paling kosong tetap, berlaku per blok. Empty state global tetap bila belum ada materi terpetakan.
- Contoh: Al-Quran muncul 2 kali — sekali di "Materi A (hal 1-300)", sekali di "Materi B (hal 301-600)".

Kelola Kitab (`kitab-manager.tsx`):
- Kartu kitab tambah seksi "Bagian kelas": list `{hal dari-sampai → namaKelas}` + tombol tambah/edit/hapus (modal kedua atau inline expand; ikut pola Dialog existing).
- Bila kitab punya bagian, badge `kitab.kelas_id` lama disembunyikan/diberi hint "diatur per bagian" agar tidak ambigu. Dropdown Kelas Materi tetap ada sebagai fallback untuk kitab tanpa bagian.
- `admin/kitab/page.tsx` query `with: { kitabBagian: { with: { kelas } } }` dan teruskan ke manager.

## 6. Aturan syarat naik (formal, revisi §6 spec 2026-09-18)

```
U = urutan kelas santri; berikut = kelas urutan terkecil > U
bagian(k) = kitab_bagian milik kitab k; bila kosong → satu bagian virtual [1..jumlahHalaman] milik kitab.kelas_id (bila null → tanpa pemilik = abaikan)
scope(U) = { (kitab, dari, sampai, pemilik) | kitab aktif, pemilik tidak bebas_syarat, pemilik.urutan <= U, halaman dalam [dari..sampai] }
khatam(halaman) = persentase == 100
khatam(bagian) = semua halaman dalam rentang khatam
siap naik = semua bagian scope(U) khatam
```

Contoh: Quran [1-300]→A(U=1), [301-600]→B(U=2). Santri A (U=1): scope = [1-300] saja. Santri B (U=2): scope = [1-300]+[301-600] + semua kitab A/B lain.

## 7. Error handling

- API: 400 validasi zod (dari/sampai bukan integer, dari > sampai, dari < 1), 400 sampai > jumlahHalaman, 400 overlap, 404 kitab/kelas/bagian tidak ada, 400 hapus kelas terpakai (KITAB maupun BAGIAN), 403 non-admin. Semua pesan Indonesia via pola `toast` existing.
- UI: rentang invalid → toast + form tidak tertutup; kitab dengan gap → halaman gap tidak muncul di kartu/lubang (tidak error); penyebut 0 santri → rata-rata 0 (aturan lama).
- Migrasi: additive (`db:push` dev; prod via SQL additive). Tidak ada backfill — kitab existing 0 bagian = perilaku lama otomatis.

## 8. Testing & rollout

- `npm run lint` + `npm run build` hijau.
- Manual + skrip tsx sementara (read-only, hapus setelah dipakai, pola Fase 7):
  1. Buat Quran 600 hal + bagian A 1-300 + B 301-600; 10 kitab lain tetap tanpa bagian.
  2. Santri A kurang 1-300 → status kurang; khatam 1-300 → siap walau 301-600 kosong.
  3. Santri B wajib full; khatam 1-300 saja → tetap kurang.
  4. Lubang: 2 blok Quran di grup A/B dengan angka benar; kitab tanpa bagian 1 blok.
  5. Overlap ditolak, sampai > 600 ditolak, hapus kelas terpakai bagian ditolak, wali 403.
- Rollout: migrasi additive; update `docs/SCHEMA.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION.md` (fase baru); `kitab.kelas_id` dipertahankan (deprecated parsial, bukan drop).

## 9. Batasan v1 (non-goals)

- Tanpa auto-split (mis. "bagi rata 2") — admin isi angka manual.
- Tanpa rentang lintas kitab (satu bagian = satu kitab).
- Tanpa bobot per bagian dan tanpa urutan bagian kustom (urut pakai urutan kelas → nama kitab → halamanDari).
- Tanpa riwayat kenaikan / tombol naik otomatis (tetap manual, sesuai spec lama).
- Tanpa migrasi data pencapaian (tidak ada yang berubah di `halaman`/`pencapaian`).
