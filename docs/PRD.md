# PRD - Sistem Pendataan Pencapaian Santri

## 1. Latar Belakang
Yayasan pengajian mengadakan kajian atas 20+ kitab (Al-Qur'an, kumpulan hadits, dll). Saat ini belum ada sistem untuk mendata sejauh mana santri sudah menyelesaikan tiap halaman dari kitab-kitab tersebut. Pencapaian dinilai secara manual oleh ustadz dalam bentuk persentase (0-100%) per halaman, berdasarkan penilaian subjektif mereka atas pemahaman santri (makna & keterangan), tanpa perlu dipecah ke sub-komponen.

## 2. Tujuan
Membangun website untuk mencatat, memantau, dan melaporkan progres penyelesaian kitab per santri, dengan data kitab yang bisa bertambah/berubah sewaktu-waktu.

## 3. Target Pengguna & Role

| Role | Akses |
|---|---|
| **Admin (Yayasan)** | Kelola data kitab, santri, ustadz, wali; lihat rekap semua santri |
| **Ustadz** | Input/update persentase pencapaian santri per halaman per kitab |
| **Wali Santri** | Lihat progress anak(nya) — read-only; bisa punya 1+ santri terhubung |

Semua role login menggunakan akun & password masing-masing.

## 4. Skala Awal
- < 50 santri
- 1-3 ustadz
- Jumlah wali menyesuaikan jumlah santri

## 5. Entitas Data Utama

- **Santri** — nama, kelas/angkatan, status aktif, terhubung ke 1+ wali
- **Ustadz** — nama, akun login
- **Wali** — nama, akun login, terhubung ke 1+ santri
- **Kitab** — nama, jumlah halaman, deskripsi, status aktif/nonaktif (CRUD oleh Admin, bisa nambah kapan saja)
- **Halaman** — auto-generate berdasarkan jumlah halaman kitab
- **Pencapaian** — santri + kitab + halaman + persentase (diisi manual oleh ustadz) + tanggal + ustadz penilai

## 6. Fitur Inti (MVP)

### Admin
- CRUD Kitab (termasuk atur jumlah halaman; nambah halaman di kemudian hari tidak menghapus data lama)
- CRUD Santri, Ustadz, Wali
- Hubungkan Wali ↔ Santri (many-to-many)
- Dashboard rekap semua santri & semua kitab

### Ustadz
- Pilih santri → pilih kitab → input/update persentase per halaman
- Lihat riwayat penilaian yang sudah diinput

### Wali Santri
- Login → lihat progress anak(nya): persentase per kitab, breakdown per halaman
- Kalau punya beberapa santri, bisa switch antar anak

### Umum
- Progress bar per kitab (rata-rata semua halaman)
- Progress keseluruhan per santri (semua kitab)

## 7. Di Luar Cakupan MVP (Nanti)
- Export/cetak laporan PDF
- Notifikasi otomatis ke wali
- Statistik/analitik lanjutan (misal kitab paling lambat diselesaikan secara agregat)

## 8. Alur Data Sederhana
```
Wali ──(many-to-many)── Santri ──── Pencapaian ──── Kitab ──── Halaman (auto-generate)
                                        │
                                     Ustadz (penilai)
```

## 9. Keputusan
- Histori perubahan persentase per halaman: **sementara cukup nilai terakhir saja** (tidak perlu log semua perubahan untuk MVP)
- Kitab yang dinonaktifkan: **tetap ditampilkan** di progress santri (soft delete, bukan disembunyikan)
