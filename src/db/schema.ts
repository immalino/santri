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
}));

export const santriRelations = relations(santri, ({ one, many }) => ({
  kelas: one(kelas, {
    fields: [santri.kelasId],
    references: [kelas.id],
  }),
  waliSantri: many(waliSantri),
  pencapaian: many(pencapaian),
}));

export const kitabRelations = relations(kitab, ({ many }) => ({
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
