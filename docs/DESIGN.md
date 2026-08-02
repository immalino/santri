# DESIGN.md - Sistem Pendataan Pencapaian Santri

Panduan desain visual & UI, mengacu pada `PRD.md` dan `ARCHITECTURE.md`.

## 1. Prinsip Desain
- **Mobile-first** — mayoritas wali & ustadz mengakses dari HP, layout utama dirancang untuk layar kecil dulu, baru di-scale ke desktop.
- **Simpel, bukan sidebar-heavy** — beda dari referensi dashboard (Taskora) yang punya sidebar kompleks; navigasi dibuat ringan (bottom nav / top nav sederhana), fokus ke tugas per role.
- **Modern & clean** — tipografi sans-serif, banyak whitespace, minim ornamen, tapi tetap terasa Islami lewat warna & pemilihan istilah (bukan lewat kaligrafi/motif berat).

## 2. Palet Warna (Tema Islami: Hijau/Gold/Earth Tone)

| Token | Hex | Penggunaan |
|---|---|---|
| `primary` (Emerald) | `#0E6B4F` | Tombol utama, header, elemen aktif |
| `primary-dark` | `#0A4F3A` | Hover state, teks penekanan |
| `accent` (Gold) | `#C99A2E` | Highlight, badge pencapaian, progress penuh (100%) |
| `background` | `#FAF7F0` | Latar utama (warm cream, bukan putih polos) |
| `surface` | `#FFFFFF` | Card, form |
| `border` | `#E5DFD0` | Garis pemisah, outline input |
| `text-primary` | `#1F2A24` | Teks utama (dark green-gray) |
| `text-secondary` | `#6B7568` | Teks sekunder/caption |
| `success` | `#2E9E5B` | Progress tinggi, status aktif |
| `warning` | `#D98E2A` | Progress sedang |
| `danger` | `#C1443C` | Progress rendah/status nonaktif |

Progress bar per kitab menggunakan gradasi hijau → gold sesuai persentase (0% abu-abu muda → 100% gold penuh), agar terasa seperti "pencapaian" bukan sekadar statistik.

## 3. Tipografi
- Font: sans-serif modern, misal **Inter** atau **Plus Jakarta Sans** (gratis, readable di layar kecil).
- Skala:
  - Heading besar (nama halaman): 20-24px, semi-bold
  - Sub-heading (nama kitab/santri): 16-18px, medium
  - Body: 14px, regular
  - Caption/label: 12px, medium, warna `text-secondary`

## 4. Layout per Role (Mobile-First)

### Struktur Umum
```
[Top Bar: Logo/Nama Yayasan + Avatar/Menu]
[Konten utama - single column di mobile]
[Bottom Nav (mobile) / Top Nav sederhana (desktop)]
```
Tidak ada sidebar kompleks seperti referensi — cukup 3-4 menu utama per role di bottom nav (mobile) yang jadi top nav horizontal saat desktop.

### Admin
- Bottom nav: Dashboard, Kitab, Santri, Lainnya (Ustadz/Wali)
- Dashboard: ringkasan card sederhana (Total Santri, Total Kitab, Rata-rata Progress) — versi ringan dari card statistik di referensi, tanpa chart donut kompleks
- List Kitab/Santri/Ustadz/Wali: **grid kartu** (1 kolom di mobile → 2 kolom di desktop). Keputusan implementasi Fase 7: grid kartu dipertahankan di semua breakpoint demi konsistensi — tidak memakai table di desktop (deviasi dari draft awal §4 ini; disepakati saat QA Fase 7).

### Ustadz
- Bottom nav: Input Nilai, Riwayat
- Halaman Input: pilih santri (search/dropdown) → pilih kitab → **grid kotak halaman** — tiap kotak menampilkan nomor halaman, isi warna kotak (gradasi hijau→gold) setinggi persentase sehingga "penuh/tidaknya" kotak = progres halaman itu; bulk set: tap pilih satu, tekan lama & seret pilih banyak, lalu set semua halaman terpilih ke satu nilai (preset/input kustom); tombol Simpan sticky di bawah (mobile)

### Wali Santri
- Bottom nav: Progress, (switch anak via dropdown di top bar kalau >1 santri)
- Halaman Progress: card per kitab dengan progress bar horizontal + persentase, tap untuk expand breakdown per halaman

## 5. Komponen UI (Tailwind, custom — tanpa library komponen)

| Komponen | Catatan Style |
|---|---|
| Card | `rounded-2xl`, `shadow-sm`, background `surface`, padding cukup lega |
| Progress bar | `rounded-full`, tinggi 8-10px, warna dinamis sesuai persentase |
| Button primary | Background `primary`, `rounded-xl`, teks putih, padding nyaman untuk tap di mobile (min-height 44px) |
| Input/Select | Border `border`, `rounded-xl`, focus ring warna `primary` |
| Badge status | Pill kecil, warna sesuai status (aktif=hijau, nonaktif=abu-abu) |
| Bottom nav item | Icon + label kecil, warna aktif `primary`, non-aktif `text-secondary` |

## 6. Ikonografi
- Gunakan icon set simpel & konsisten (misal Lucide/Heroicons — outline style, sejalan dengan gaya "modern & clean").
- Hindari ikon dekoratif berat (kaligrafi, ornamen islami detail) — cukup 1-2 aksen halus (misal ikon buku/kitab bergaya sederhana) untuk identitas tanpa mengganggu kesan clean.

## 7. Keputusan
- **Dark mode** (implementasi Fase 7): varian gelap dari palet §2 — background gelap, surface sedikit lebih terang, primary/accent tetap hijau-gold tapi disesuaikan kontrasnya. Palet gelap konkret yang dipakai (di `src/app/globals.css`):

  | Token | Hex (gelap) |
  |---|---|
  | `primary` | `#16A37C` |
  | `primary-dark` | `#12805F` |
  | `accent` | `#D9A93F` |
  | `background` | `#0F1A15` |
  | `surface` | `#17241E` |
  | `border` | `#26352D` |
  | `ink` / `text-primary` | `#E8EFEA` |
  | `ink-secondary` / `text-secondary` | `#9AA8A0` |
  | `success` | `#3DBB74` |
  | `warning` | `#E2A44A` |
  | `danger` | `#D96059` |

  **Toggle**: ikon Sun/Moon di top bar (komponen `ThemeToggle`). Preferensi disimpan di `localStorage` (kunci `theme` = `light`/`dark`); kunjungan pertama mengikuti `prefers-color-scheme` sistem. Skrip inline anti-flash di root layout menerapkan class `.dark` pada `<html>` sebelum first paint. Mode class-based (Tailwind `@custom-variant dark`), jadi semua komponen yang memakai token semantik otomatis ikut berganti.

- **Logo/identitas visual**: yayasan belum punya — gunakan placeholder logo sementara
