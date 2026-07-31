# SCHEMA.md - Skema Database

Skema PostgreSQL (via Drizzle ORM), mengacu pada `PRD.md` dan `ARCHITECTURE.md`.

## Konvensi
- Primary key: **UUID** (`gen_random_uuid()`) di semua tabel
- Penamaan tabel & kolom: **snake_case**
- Semua tabel punya `created_at` & `updated_at`
- Role user (`admin` / `ustadz` / `wali`) disimpan langsung sebagai field di tabel `user` milik better-auth
- Kelas/angkatan santri disimpan sebagai tabel referensi terpisah (bisa di-manage admin)
- Tabel `pencapaian` menyimpan **nilai terakhir saja** per (santri, halaman) — bukan log histori (sesuai keputusan PRD #9)

---

## 1. Tabel dari better-auth (auto-generated)

better-auth otomatis membuat & mengelola tabel berikut. Kita tambahkan kolom `role` custom di `user`.

### `user`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| name | text | |
| email | text, unique | |
| email_verified | boolean | |
| image | text, nullable | |
| **role** | enum(`admin`, `ustadz`, `wali`) | **field custom** ditambahkan untuk RBAC |
| created_at | timestamp | |
| updated_at | timestamp | |

### `session`
| Kolom | Tipe |
|---|---|
| id | uuid, PK |
| user_id | uuid, FK → user.id |
| token | text |
| expires_at | timestamp |
| ip_address | text, nullable |
| user_agent | text, nullable |
| created_at | timestamp |
| updated_at | timestamp |

### `account`
| Kolom | Tipe |
|---|---|
| id | uuid, PK |
| user_id | uuid, FK → user.id |
| account_id | text |
| provider_id | text |
| password | text, nullable |
| created_at | timestamp |
| updated_at | timestamp |

### `verification`
| Kolom | Tipe |
|---|---|
| id | uuid, PK |
| identifier | text |
| value | text |
| expires_at | timestamp |
| created_at | timestamp |
| updated_at | timestamp |

---

## 2. Tabel Aplikasi

### `kelas`
Referensi kelas/angkatan santri, bisa di-manage admin.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| nama_kelas | text | misal "Angkatan 2024" |
| deskripsi | text, nullable | |
| created_at | timestamp | |
| updated_at | timestamp | |

### `santri`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| nama | text | |
| kelas_id | uuid, FK → kelas.id, nullable | |
| status_aktif | boolean, default true | |
| created_at | timestamp | |
| updated_at | timestamp | |

### `wali_santri`
Tabel junction many-to-many antara wali (user dengan role `wali`) dan santri.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| wali_id | uuid, FK → user.id | |
| santri_id | uuid, FK → santri.id | |
| created_at | timestamp | |
| updated_at | timestamp | |

Unique constraint: (`wali_id`, `santri_id`) — mencegah duplikat relasi.

### `kitab`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| nama_kitab | text | |
| jumlah_halaman | integer | |
| deskripsi | text, nullable | |
| status | enum(`aktif`, `nonaktif`), default `aktif` | soft delete — tetap tampil di progress santri |
| created_at | timestamp | |
| updated_at | timestamp | |

### `halaman`
Auto-generate saat `kitab` dibuat/jumlah halaman ditambah.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| kitab_id | uuid, FK → kitab.id | |
| nomor_halaman | integer | |
| created_at | timestamp | |
| updated_at | timestamp | |

Unique constraint: (`kitab_id`, `nomor_halaman`).

### `pencapaian`
Jantung sistem — nilai persentase per santri per halaman, **nilai terakhir saja**.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid, PK | |
| santri_id | uuid, FK → santri.id | |
| halaman_id | uuid, FK → halaman.id | |
| persentase | integer (0-100) | |
| dinilai_oleh | uuid, FK → user.id | user dengan role `ustadz` |
| tanggal_dinilai | timestamp | |
| created_at | timestamp | |
| updated_at | timestamp | update setiap kali dinilai ulang |

Unique constraint: (`santri_id`, `halaman_id`) — satu baris per kombinasi santri+halaman, di-`UPDATE` bukan `INSERT` baru saat dinilai ulang.

---

## 3. Diagram Relasi (Ringkas)

```
user (role: admin/ustadz/wali)
  │
  ├──< session, account, verification (better-auth)
  │
  ├──< wali_santri >── santri >── kelas
  │                       │
  │                       └──< pencapaian >── halaman >── kitab
  │
  └──< pencapaian.dinilai_oleh (sebagai ustadz)
```

## 4. Contoh Skema Drizzle (Potongan)

```ts
// db/schema.ts
import { pgTable, uuid, text, boolean, integer, timestamp, pgEnum, unique, index } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "ustadz", "wali"]);
export const kitabStatusEnum = pgEnum("kitab_status", ["aktif", "nonaktif"]);

export const kelas = pgTable("kelas", {
  id: uuid("id").defaultRandom().primaryKey(),
  namaKelas: text("nama_kelas").notNull(),
  deskripsi: text("deskripsi"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const santri = pgTable("santri", {
  id: uuid("id").defaultRandom().primaryKey(),
  nama: text("nama").notNull(),
  kelasId: uuid("kelas_id").references(() => kelas.id),
  statusAktif: boolean("status_aktif").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kitab = pgTable("kitab", {
  id: uuid("id").defaultRandom().primaryKey(),
  namaKitab: text("nama_kitab").notNull(),
  jumlahHalaman: integer("jumlah_halaman").notNull(),
  deskripsi: text("deskripsi"),
  status: kitabStatusEnum("status").default("aktif").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const halaman = pgTable("halaman", {
  id: uuid("id").defaultRandom().primaryKey(),
  kitabId: uuid("kitab_id").references(() => kitab.id).notNull(),
  nomorHalaman: integer("nomor_halaman").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqKitabHalaman: unique().on(table.kitabId, table.nomorHalaman),
}));

export const pencapaian = pgTable("pencapaian", {
  id: uuid("id").defaultRandom().primaryKey(),
  santriId: uuid("santri_id").references(() => santri.id).notNull(),
  halamanId: uuid("halaman_id").references(() => halaman.id).notNull(),
  persentase: integer("persentase").notNull(),
  dinilaiOleh: uuid("dinilai_oleh").notNull(), // FK -> user.id (better-auth)
  tanggalDinilai: timestamp("tanggal_dinilai").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqSantriHalaman: unique().on(table.santriId, table.halamanId),
  idxSantriId: index("idx_pencapaian_santri_id").on(table.santriId),
  idxHalamanId: index("idx_pencapaian_halaman_id").on(table.halamanId),
}));

export const waliSantri = pgTable("wali_santri", {
  id: uuid("id").defaultRandom().primaryKey(),
  waliId: uuid("wali_id").notNull(), // FK -> user.id (better-auth)
  santriId: uuid("santri_id").references(() => santri.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqWaliSantri: unique().on(table.waliId, table.santriId),
}));
```

## 5. Keputusan
- **Index tambahan**: ditambahkan index di `pencapaian.santri_id` (dan `pencapaian.halaman_id`) untuk mempercepat query dashboard progress
- **Validasi persentase (0-100)**: cukup di level aplikasi saja, tidak pakai `CHECK` constraint di database
