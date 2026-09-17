# Template Laporan — Variabel Tetap Kurang + Formula Custom (COUNT/LIST/MATH) — Design

Tanggal: 2026-09-17 | Status: disetujui user (pendekatan A) | Pendekatan: A (mini-parser murni, tanpa dependency)

## 1. Konteks & tujuan

Mesin saat ini (`src/lib/laporan-template.ts`): katalog 39 variabel tetap + render murni `{{var}}`. Ketimpangan: `jumlah_hadir_*` punya 11 varian filter (gender × kategori usia), tapi `daftar_hadir_*` baru 5 (kurang 6 kombinasi usia+gender).

Permintaan user (disepakati 2026-09-17):
1. Tambah 6 `daftar_*` yang hilang agar sejajar dengan `jumlah_*`.
2. Formula custom agar tidak menunggu dev tiap butuh kombinasi baru: `COUNT(kondisi)`, `LIST(kondisi[, pola])`.
3. `MATH(ekspresi)` untuk aritmetika; variabel custom (`COUNT(...)`) boleh masuk ke dalam `MATH`.
4. `LIST` mendukung pola per item, mis. `"Mas {nama}"`.

Tujuan: satu perubahan, backward compatible, tetap murni/client-safe, tanpa dependency baru.

## 2. Keputusan yang disepakati

- Pendekatan A: mini-parser tulis tangan di `src/lib/laporan-template.ts` (tokenizer + recursive descent). Tanpa `eval`/`Function`, tanpa library.
- Tetap tambah 6 variabel tetap (quick win) + 3 fungsi custom. Fungsi custom tidak masuk `VARIABLE_CATALOG` sebagai entri tetap, tapi didokumentasikan di contekan UI sebagai pola.
- Normalisasi token kondisi: lowercase, `-`/spasi → `_`. Jadi `laki-laki`, `laki laki`, `laki_laki` sama; `pra-nikah` = `pra_nikah`; `tanpa keterangan` = `tanpa_keterangan`.
- Operator kondisi: `!` (NOT) > `&&` (AND) > `||` (OR), plus `()` . Spasi bebas.
- `MATH` mendukung angka, identifier variabel numerik, `COUNT(...)` nested, operator `+ - * / %`, `()`, unary minus. Bagi nol → `0`.
- `LIST` pola per item: argumen ke-2 opsional string kutip (`"..."` atau `'...'`; isi boleh mengandung koma) dengan placeholder `{nama}` (wajib bila pola dipakai), `{nomor}`, `{keterangan}`.

## 3. Variabel tetap baru (6)

Tambah ke `VARIABLE_CATALOG` + `buildLaporanContext().lists`:

- `daftar_hadir_pra_remaja_laki_laki` — Daftar hadir pra-remaja laki-laki
- `daftar_hadir_pra_remaja_perempuan` — Daftar hadir pra-remaja perempuan
- `daftar_hadir_remaja_laki_laki` — Daftar hadir remaja laki-laki
- `daftar_hadir_remaja_perempuan` — Daftar hadir remaja perempuan
- `daftar_hadir_pra_nikah_laki_laki` — Daftar hadir pra-nikah laki-laki
- `daftar_hadir_pra_nikah_perempuan` — Daftar hadir pra-nikah perempuan

Perilaku sama seperti daftar lain: urut abjad locale `id`, bernomor `1. Nama`, kosong → `(tidak ada)`. Katalog 39 → 45.

## 4. Sintaks custom

Semua dipakai di dalam `{{...}}` (spasi luar ditoleransi). Regex temu `{{...}}` diperlebar dari `([a-zA-Z0-9_]+)` menjadi `([^{}]+?)` agar menampung `()`, `&&`, `""`, koma, spasi.

### 4.1 COUNT(kondisi) → angka

- Contoh: `{{COUNT(hadir && laki_laki && pra_nikah)}}` → `2`
- `COUNT()` tanpa argumen = total peserta (sama dengan `total_peserta`).
- Kondisi kosong setelah trim juga = total peserta.

### 4.2 LIST(kondisi[, "pola"]) → daftar bernomor

- Contoh: `{{LIST(hadir && perempuan)}}` → `1. Ani\n2. Siti`
- Contoh pola: `{{LIST(hadir && laki_laki, "Mas {nama}")}}` → `1. Mas Budi`
- Placeholder pola: `{nama}` (wajib jika pola dipakai), `{nomor}` (1-based), `{keterangan}` (isi keterangan mentah, kosong bila tidak ada).
- Render per baris: `<nomor>. <pola-terisi>`. Tanpa pola: `<nomor>. <nama>` + ` (keterangan)` otomatis bila status `izin` dan keterangan non-kosong (sama seperti `daftar_izin` hari ini). Bila pola dipakai, tidak ada append otomatis; pembuat template memakai `{keterangan}` sendiri bila perlu.
- Urut abjad locale `id`, kosong → `(tidak ada)`.

### 4.3 MATH(ekspresi) → angka

- Contoh antar variabel: `{{MATH(jumlah_hadir - jumlah_izin)}}`
- Contoh nested: `{{MATH(COUNT(hadir && remaja) / total_peserta * 100)}}`
- Identifier yang boleh: semua `counts` numerik (`jumlah_*`), `total_peserta`, `total_sesi`, plus `COUNT(...)`. `persen_*` (string `%`) tidak boleh masuk MATH.
- Operator: `+ - * / %`, `()`, unary `-`. Preseden standar (`* / %` > `+ -`), asosiatif kiri.
- Format hasil: bulatkan ke 2 desimal, hilangkan nol trailing (`66.666` → `66.67`, `50.00` → `50`, `0.5` → `0.5`). Bagi/mod nol → `0`.

### 4.4 Kosa kata atom kondisi

Normalisasi dulu (lowercase, `[\s\-]+` → `_`), lalu cocokkan:

- Status: `hadir`, `izin`, `tanpa_keterangan`, `belum_diabsen` (alias `belum`), `tidak_hadir` (= `izin` OR `tanpa_keterangan`).
- Gender: `laki_laki`, `perempuan`.
- Usia: `pra_remaja`, `remaja`, `pra_nikah`.
- Atom tak dikenal (mis. `foo`) = error unknown (lihat §6).

Semantik: predikat atas satu `LaporanPeserta`. `COUNT`/`LIST` memfilter `sesi.peserta` (seluruh peserta, bukan hanya hadir) dengan predikat itu. Ini membuat `LIST(izin && remaja)` dan `COUNT(belum_diabsen)` valid.

## 5. Arsitektur & aliran data

- Satu file inti: `src/lib/laporan-template.ts`. Tambah: normalizer, tokenizer kondisi, parser kondisi → predikat, parser MATH → angka, parser argumen LIST (split koma level atas, hormati kutip), renderer `COUNT/LIST/MATH`.
- `valueOf(name, ctx, peserta)` diperluas: (1) cocokkan variabel tetap seperti hari ini; (2) bila cocok pola `COUNT|LIST|MATH` (case-insensitive untuk nama fungsi), parse + evaluasi memakai `peserta` mentah + `counts`; (3) selain itu `null` (unknown).
- `buildLaporanContext` perlu menyimpan `peserta` mentah (atau daftar terfilter) agar predikat custom bisa jalan tanpa ubah signature publik secara merusak. Opsi: tambah field opsional `peserta` di `LaporanContext`; pemanggil lama (`laporan-card.tsx`) tetap jalan karena `buildLaporanContext(sesi, totalSesi)` tidak berubah.
- UI `template-manager.tsx`: tambah contekan pola custom (3 contoh) + penyisipan klik seperti variabel tetap. Tidak ada perubahan DB/API.
- Tetap murni/client-safe: tanpa import server, tanpa `eval`, tanpa dependency.

## 6. Error handling

- Parse gagal / atom tak dikenal / identifier MATH tak dikenal / pola LIST tanpa `{nama}` / kutip tak tutup: kembalikan teks `{{...}}` asli apa adanya + laporkan isi dalam kurung (trimmed, mis. `COUNT(foo)`) di `unknownVars` (pola existing: dibiarkan + dilaporkan untuk peringatan typo).
- `findUnknownVars` memakai regex baru + mencoba parse fungsi; fungsi valid dengan atom valid = known (tidak dilaporkan).
- MATH bagi/mod nol → `0` (bukan error, bukan `NaN`).
- `LIST`/`COUNT` kondisi kosong = total (bukan error).

## 7. Testing

Repo belum punya test runner (pola existing: `npx tsc --noEmit` + `npm run lint` + manual). Untuk perubahan ini, verifikasi:

- `tsc` + `lint` bersih.
- Skrip verifikasi sementara (node/tsx, throwaway): 6 daftar baru benar; `COUNT` AND/OR/NOT/paren; `LIST` pola `{nama}`/`{nomor}`; `MATH` nested `COUNT`; normalisasi strip/spasi; unknown dilaporkan; list kosong → `(tidak ada)`; bagi nol → `0`; variabel lama tidak berubah (kasus spec 2026-09-16 tetap lolos).
- Manual: contekan UI tampil, preview + salin di admin & ustadz, mobile.

## 8. Batasan (non-goals)

- Tanpa agregat lintas sesi, tanpa unduh/PDF, tanpa `IF`/loop/template engine umum.
- Tanpa perbandingan numerik di kondisi (`>`, `<`) dan tanpa `total` sebagai atom kondisi (pakai `COUNT()` tanpa argumen).
- Daftar tetap alfabetis; pola LIST tidak mengubah urutan.
- `MATH` hanya angka; tidak ada format `%` otomatis (tulis `%` manual di template bila perlu).

## 9. File yang disentuh (rencana)

- `src/lib/laporan-template.ts` (inti: 6 daftar + COUNT/LIST/MATH + regex + unknown).
- `src/components/shared/template-manager.tsx` (contekan pola custom).
- Docs: `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION.md` (update hitung katalog 39 → 45 + fungsi custom).
- Spec ini. Tanpa migrasi DB, tanpa API baru.
