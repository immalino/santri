import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** User role used for RBAC (admin / ustadz / wali). */
export const roleEnum = pgEnum("role", ["admin", "ustadz", "wali"]);

/** Soft-delete status for a kitab. */
export const kitabStatusEnum = pgEnum("kitab_status", ["aktif", "nonaktif"]);

/** Soft-delete status for a kegiatan (same pattern as kitab). */
export const kegiatanStatusEnum = pgEnum("kegiatan_status", ["aktif", "nonaktif"]);

/** Attendance status per santri per session. */
export const absensiStatusEnum = pgEnum("absensi_status", ["hadir", "izin", "tanpa_keterangan"]);

/** Age group of a santri (nullable — legacy rows stay null until updated). */
export const santriUsiaEnum = pgEnum("santri_usia", ["pra_remaja", "remaja", "pra_nikah"]);

/** Gender of a santri (nullable — legacy rows stay null until updated). */
export const santriGenderEnum = pgEnum("santri_gender", ["laki_laki", "perempuan"]);

// ---------------------------------------------------------------------------
// Auth tables (better-auth)
//
// NOTE — Deviation from SCHEMA.md §1: better-auth uses `text` for the `id`
// column of its auth tables by default (not uuid). We follow the better-auth
// default, so every FK that references `user.id` must be `text` as well.
// See docs/IMPLEMENTATION.md task 1.2.
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  // Custom field for RBAC (declared as `additionalFields` in better-auth).
  role: roleEnum("role").default("wali").notNull(),
  // Admin plugin fields (ban/unban = active/inactive for ustadz & wali).
  banned: boolean("banned").default(false).notNull(),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ---------------------------------------------------------------------------
// App tables
// ---------------------------------------------------------------------------

export const kelas = pgTable("kelas", {
  id: uuid("id").defaultRandom().primaryKey(),
  namaKelas: text("nama_kelas").notNull(),
  deskripsi: text("deskripsi"),
  // Curriculum order of this kelas (A=1, B=2, ...). Ties count as equal.
  urutan: integer("urutan").default(0).notNull(),
  // Graduation kelas (e.g. Lulus Pra-nikah): members are exempt from khatam duty.
  bebasSyarat: boolean("bebas_syarat").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const santri = pgTable("santri", {
  id: uuid("id").defaultRandom().primaryKey(),
  nama: text("nama").notNull(),
  kelasId: uuid("kelas_id").references(() => kelas.id),
  statusAktif: boolean("status_aktif").default(true).notNull(),
  // Nullable: existing rows stay null until the admin updates them manually.
  kategoriUsia: santriUsiaEnum("kategori_usia"),
  jenisKelamin: santriGenderEnum("jenis_kelamin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const kitab = pgTable("kitab", {
  id: uuid("id").defaultRandom().primaryKey(),
  namaKitab: text("nama_kitab").notNull(),
  jumlahHalaman: integer("jumlah_halaman").notNull(),
  deskripsi: text("deskripsi"),
  // Soft delete: a nonaktif kitab still appears in santri progress.
  status: kitabStatusEnum("status").default("aktif").notNull(),
  // Curriculum owner of this kitab. Null = unmapped, ignored by kenaikan logic.
  kelasId: uuid("kelas_id").references(() => kelas.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const halaman = pgTable(
  "halaman",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kitabId: uuid("kitab_id")
      .references(() => kitab.id)
      .notNull(),
    nomorHalaman: integer("nomor_halaman").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [unique("halaman_kitab_nomor_unique").on(table.kitabId, table.nomorHalaman)],
);

export const pencapaian = pgTable(
  "pencapaian",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    santriId: uuid("santri_id")
      .references(() => santri.id)
      .notNull(),
    halamanId: uuid("halaman_id")
      .references(() => halaman.id)
      .notNull(),
    // Latest value only: one row per (santri, halaman), updated on re-grading.
    persentase: integer("persentase").notNull(),
    // FK -> user.id (better-auth, text type).
    dinilaiOleh: text("dinilai_oleh")
      .references(() => user.id)
      .notNull(),
    tanggalDinilai: timestamp("tanggal_dinilai").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("pencapaian_santri_halaman_unique").on(table.santriId, table.halamanId),
    index("idx_pencapaian_santri_id").on(table.santriId),
    index("idx_pencapaian_halaman_id").on(table.halamanId),
  ],
);

export const waliSantri = pgTable(
  "wali_santri",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // FK -> user.id (better-auth, text type).
    waliId: text("wali_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    santriId: uuid("santri_id")
      .references(() => santri.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [unique("wali_santri_wali_santri_unique").on(table.waliId, table.santriId)],
);

// ---------------------------------------------------------------------------
// Attendance (Fase 10): kegiatan + peserta + sesi + absensi
//
// A kegiatan is a flexible event container: a one-time event has exactly one
// sesi, a recurring event has many sesi (one per meeting date). Peserta are
// chosen manually per kegiatan (with a "select all" shortcut in the UI).
// Removing a peserta does NOT delete historical absensi rows.
// ---------------------------------------------------------------------------

export const kegiatan = pgTable("kegiatan", {
  id: uuid("id").defaultRandom().primaryKey(),
  namaKegiatan: text("nama_kegiatan").notNull(),
  deskripsi: text("deskripsi"),
  // Soft delete: a nonaktif kegiatan still appears in santri history.
  status: kegiatanStatusEnum("status").default("aktif").notNull(),
  // FK -> user.id (better-auth, text type).
  dibuatOleh: text("dibuat_oleh")
    .references(() => user.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const kegiatanPeserta = pgTable(
  "kegiatan_peserta",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kegiatanId: uuid("kegiatan_id")
      .references(() => kegiatan.id, { onDelete: "cascade" })
      .notNull(),
    santriId: uuid("santri_id")
      .references(() => santri.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("kegiatan_peserta_kegiatan_santri_unique").on(table.kegiatanId, table.santriId),
    index("idx_kegiatan_peserta_kegiatan_id").on(table.kegiatanId),
    index("idx_kegiatan_peserta_santri_id").on(table.santriId),
  ],
);

export const kegiatanSesi = pgTable(
  "kegiatan_sesi",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kegiatanId: uuid("kegiatan_id")
      .references(() => kegiatan.id, { onDelete: "cascade" })
      .notNull(),
    tanggal: timestamp("tanggal").notNull(),
    judul: text("judul"),
    catatan: text("catatan"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("idx_kegiatan_sesi_kegiatan_id").on(table.kegiatanId)],
);

export const absensi = pgTable(
  "absensi",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sesiId: uuid("sesi_id")
      .references(() => kegiatanSesi.id, { onDelete: "cascade" })
      .notNull(),
    santriId: uuid("santri_id")
      .references(() => santri.id)
      .notNull(),
    status: absensiStatusEnum("status").default("tanpa_keterangan").notNull(),
    keterangan: text("keterangan"),
    // FK -> user.id (better-auth, text type).
    dicatatOleh: text("dicatat_oleh")
      .references(() => user.id)
      .notNull(),
    tanggalDicatat: timestamp("tanggal_dicatat").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("absensi_sesi_santri_unique").on(table.sesiId, table.santriId),
    index("idx_absensi_sesi_id").on(table.sesiId),
    index("idx_absensi_santri_id").on(table.santriId),
  ],
);

export const kegiatanTemplate = pgTable(
  "kegiatan_template",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kegiatanId: uuid("kegiatan_id")
      .references(() => kegiatan.id, { onDelete: "cascade" })
      .notNull(),
    nama: text("nama").notNull(),
    isi: text("isi").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("idx_kegiatan_template_kegiatan_id").on(table.kegiatanId)],
);

// ---------------------------------------------------------------------------
// Relations (for Drizzle relational queries)
// ---------------------------------------------------------------------------

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  waliSantri: many(waliSantri),
  pencapaianDinilai: many(pencapaian),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const kelasRelations = relations(kelas, ({ many }) => ({
  santri: many(santri),
  kitab: many(kitab),
}));

export const santriRelations = relations(santri, ({ one, many }) => ({
  kelas: one(kelas, {
    fields: [santri.kelasId],
    references: [kelas.id],
  }),
  waliSantri: many(waliSantri),
  pencapaian: many(pencapaian),
}));

export const kitabRelations = relations(kitab, ({ one, many }) => ({
  kelas: one(kelas, {
    fields: [kitab.kelasId],
    references: [kelas.id],
  }),
  halaman: many(halaman),
}));

export const halamanRelations = relations(halaman, ({ one, many }) => ({
  kitab: one(kitab, {
    fields: [halaman.kitabId],
    references: [kitab.id],
  }),
  pencapaian: many(pencapaian),
}));

export const pencapaianRelations = relations(pencapaian, ({ one }) => ({
  santri: one(santri, {
    fields: [pencapaian.santriId],
    references: [santri.id],
  }),
  halaman: one(halaman, {
    fields: [pencapaian.halamanId],
    references: [halaman.id],
  }),
  dinilaiOlehUser: one(user, {
    fields: [pencapaian.dinilaiOleh],
    references: [user.id],
  }),
}));

export const waliSantriRelations = relations(waliSantri, ({ one }) => ({
  wali: one(user, {
    fields: [waliSantri.waliId],
    references: [user.id],
  }),
  santri: one(santri, {
    fields: [waliSantri.santriId],
    references: [santri.id],
  }),
}));

export const kegiatanRelations = relations(kegiatan, ({ many, one }) => ({
  peserta: many(kegiatanPeserta),
  sesi: many(kegiatanSesi),
  template: many(kegiatanTemplate),
  dibuatOlehUser: one(user, {
    fields: [kegiatan.dibuatOleh],
    references: [user.id],
  }),
}));

export const kegiatanPesertaRelations = relations(kegiatanPeserta, ({ one }) => ({
  kegiatan: one(kegiatan, {
    fields: [kegiatanPeserta.kegiatanId],
    references: [kegiatan.id],
  }),
  santri: one(santri, {
    fields: [kegiatanPeserta.santriId],
    references: [santri.id],
  }),
}));

export const kegiatanSesiRelations = relations(kegiatanSesi, ({ one, many }) => ({
  kegiatan: one(kegiatan, {
    fields: [kegiatanSesi.kegiatanId],
    references: [kegiatan.id],
  }),
  absensi: many(absensi),
}));

export const kegiatanTemplateRelations = relations(kegiatanTemplate, ({ one }) => ({
  kegiatan: one(kegiatan, {
    fields: [kegiatanTemplate.kegiatanId],
    references: [kegiatan.id],
  }),
}));

export const absensiRelations = relations(absensi, ({ one }) => ({
  sesi: one(kegiatanSesi, {
    fields: [absensi.sesiId],
    references: [kegiatanSesi.id],
  }),
  santri: one(santri, {
    fields: [absensi.santriId],
    references: [santri.id],
  }),
  dicatatOlehUser: one(user, {
    fields: [absensi.dicatatOleh],
    references: [user.id],
  }),
}));
