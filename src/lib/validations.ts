/**
 * Application-level input validation (zod).
 *
 * CLAUDE.md: validations such as 0-100 percentage live at the application
 * layer, not in the database. Every admin API route parses its body through
 * one of these schemas before touching the DB.
 */
import { z } from "zod";

const deskripsiOptional = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""));

// --- Kitab -----------------------------------------------------------------

export const kitabCreateSchema = z.object({
  namaKitab: z.string().trim().min(1, "Nama kitab wajib diisi."),
  jumlahHalaman: z.coerce
    .number()
    .int("Jumlah halaman harus bilangan bulat.")
    .min(1, "Jumlah halaman minimal 1."),
  deskripsi: deskripsiOptional,
  status: z.enum(["aktif", "nonaktif"]).optional(),
});

/** Partial update: every field optional (e.g. toggling status only). */
export const kitabUpdateSchema = z.object({
  namaKitab: z.string().trim().min(1, "Nama kitab wajib diisi.").optional(),
  jumlahHalaman: z.coerce
    .number()
    .int("Jumlah halaman harus bilangan bulat.")
    .min(1, "Jumlah halaman minimal 1.")
    .optional(),
  deskripsi: deskripsiOptional,
  status: z.enum(["aktif", "nonaktif"]).optional(),
});

// --- Kelas -----------------------------------------------------------------

export const kelasInputSchema = z.object({
  namaKelas: z.string().trim().min(1, "Nama kelas wajib diisi."),
  deskripsi: deskripsiOptional,
});

// --- Santri ----------------------------------------------------------------

export const santriInputSchema = z.object({
  nama: z.string().trim().min(1, "Nama santri wajib diisi."),
  kelasId: z.string().uuid("Kelas tidak valid.").nullable().optional(),
  statusAktif: z.boolean().optional(),
});

// --- Users (admin creates accounts) ----------------------------------------

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi."),
  email: z.email("Email tidak valid."),
  password: z.string().min(8, "Password minimal 8 karakter."),
  role: z.enum(["ustadz", "wali"]),
});

/** Ban/unban a ustadz or wali account (soft deactivate). */
export const setUserStatusSchema = z.object({
  action: z.enum(["ban", "unban"]),
});

// --- Pencapaian (ustadz grading) --------------------------------------------

const nilaiPencapaianSchema = z.object({
  halamanId: z.string().uuid("Halaman tidak valid."),
  persentase: z.coerce
    .number()
    .int("Persentase harus bilangan bulat.")
    .min(0, "Persentase minimal 0.")
    .max(100, "Persentase maksimal 100."),
});

/** Batch upsert of per-page scores for one santri in one kitab. */
export const pencapaianInputSchema = z.object({
  santriId: z.string().uuid("Santri tidak valid."),
  kitabId: z.string().uuid("Kitab tidak valid."),
  nilai: z.array(nilaiPencapaianSchema).min(1, "Minimal satu halaman dinilai."),
});

// --- Wali <-> Santri relations ----------------------------------------------

/** Replace the full set of santri linked to one wali. */
export const waliSantriReplaceSchema = z.object({
  waliId: z.string().min(1, "Wali wajib dipilih."),
  santriIds: z.array(z.string().uuid("Santri tidak valid.")).default([]),
});

/** Replace the full set of santri registered to one kegiatan. */
export const kegiatanPesertaReplaceSchema = z.object({
  santriIds: z.array(z.string().uuid("Santri tidak valid.")).default([]),
});

const tanggalSesiSchema = z.coerce.date("Tanggal sesi tidak valid.");

// --- Kegiatan (attendance events) --------------------------------------------

export const kegiatanCreateSchema = z.object({
  namaKegiatan: z.string().trim().min(1, "Nama kegiatan wajib diisi."),
  deskripsi: deskripsiOptional,
  status: z.enum(["aktif", "nonaktif"]).optional(),
  /** First meeting date — a sesi is auto-created from it. */
  tanggalPertama: tanggalSesiSchema,
  pesertaIds: z.array(z.string().uuid("Santri tidak valid.")).default([]),
});

/** Partial update: every field optional (e.g. toggling status only). */
export const kegiatanUpdateSchema = z.object({
  namaKegiatan: z.string().trim().min(1, "Nama kegiatan wajib diisi.").optional(),
  deskripsi: deskripsiOptional,
  status: z.enum(["aktif", "nonaktif"]).optional(),
});

// --- Kegiatan sesi (one meeting date of a kegiatan) --------------------------

export const sesiInputSchema = z.object({
  tanggal: tanggalSesiSchema,
  judul: z.string().trim().max(120, "Judul maksimal 120 karakter.").optional().or(z.literal("")),
  catatan: deskripsiOptional,
});

// --- Absensi (per-santri status in one sesi) ----------------------------------

export const absensiStatusSchema = z.enum(["hadir", "izin", "tanpa_keterangan"]);

const absensiItemSchema = z.object({
  santriId: z.string().uuid("Santri tidak valid."),
  status: absensiStatusSchema,
  keterangan: z.string().trim().max(280, "Keterangan maksimal 280 karakter.").optional().or(z.literal("")),
});

/** Batch upsert of attendance for one sesi. */
export const absensiInputSchema = z.object({
  nilai: z.array(absensiItemSchema).min(1, "Minimal satu santri diabsen."),
});

// --- Self-service password change -------------------------------------------

/** Self password change: verify current password + matching confirmation. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi."),
    newPassword: z.string().min(8, "Password baru minimal 8 karakter."),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok.",
    path: ["confirmPassword"],
  });
