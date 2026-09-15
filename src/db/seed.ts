/**
 * Seed script for the development database.
 *
 * Run with:
 *   npm run db:seed
 *
 * It clears all rows in the public schema (FK-safe order) and re-inserts a
 * minimal set of example data covering every role and table, including
 * better-auth users with valid password hashes so login works (Phase 2).
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "./index";
import {
  user as userTable,
  session as sessionTable,
  account as accountTable,
  verification as verificationTable,
  kelas,
  santri,
  kitab,
  halaman,
  waliSantri,
  pencapaian,
  kegiatan,
  kegiatanPeserta,
  kegiatanSesi,
  absensi,
} from "./schema";

// ---------------------------------------------------------------------------
// Inline better-auth instance used only to create users with real password
// hashes. It mirrors the config that src/lib/auth.ts will use in Phase 2.
// ---------------------------------------------------------------------------
const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "wali" },
    },
  },
});

type Role = "admin" | "ustadz" | "wali";

const PASSWORD = "santri123";

async function createUser(
  name: string,
  email: string,
  role: Role,
): Promise<{ id: string; role: Role }> {
  const res = await auth.api.signUpEmail({
    body: { name, email, password: PASSWORD, role },
  });
  if (!res.user) {
    throw new Error(`Signup failed for ${email}`);
  }
  return res.user as { id: string; role: Role };
}

/** Insert a kitab and auto-generate its halaman rows (1..jumlah_halaman). */
async function createKitab(
  namaKitab: string,
  jumlahHalaman: number,
  deskripsi: string,
): Promise<{ kitabId: string; halaman: { id: string; nomorHalaman: number }[] }> {
  return db.transaction(async (tx) => {
    const [k] = await tx
      .insert(kitab)
      .values({ namaKitab, jumlahHalaman, deskripsi })
      .returning();
    const pages = await tx
      .insert(halaman)
      .values(
        Array.from({ length: jumlahHalaman }, (_, i) => ({
          kitabId: k.id,
          nomorHalaman: i + 1,
        })),
      )
      .returning();
    return { kitabId: k.id, halaman: pages };
  });
}

/** Grade a range of halaman for one santri. */
async function gradeRange(
  santriId: string,
  pages: { id: string; nomorHalaman: number }[],
  start: number,
  end: number,
  persentase: number,
  ustadzId: string,
): Promise<void> {
  const selected = pages.filter((p) => p.nomorHalaman >= start && p.nomorHalaman <= end);
  if (selected.length === 0) return;
  await db
    .insert(pencapaian)
    .values(
      selected.map((p) => ({
        santriId,
        halamanId: p.id,
        persentase,
        dinilaiOleh: ustadzId,
      })),
    )
    .execute();
}

async function main(): Promise<void> {
  console.log("Clearing existing data...");
  await db.delete(absensi).execute();
  await db.delete(kegiatanSesi).execute();
  await db.delete(kegiatanPeserta).execute();
  await db.delete(kegiatan).execute();
  await db.delete(pencapaian).execute();
  await db.delete(waliSantri).execute();
  await db.delete(halaman).execute();
  await db.delete(kitab).execute();
  await db.delete(santri).execute();
  await db.delete(kelas).execute();
  await db.delete(verificationTable).execute();
  await db.delete(sessionTable).execute();
  await db.delete(accountTable).execute();
  await db.delete(userTable).execute();

  // --- Users (better-auth) ---
  await createUser("Admin Utama", "admin@santri.test", "admin");
  const ustadz1 = await createUser("Ustadz Ahmad", "ustadz1@santri.test", "ustadz");
  const ustadz2 = await createUser("Ustadz Siti", "ustadz2@santri.test", "ustadz");
  const wali1 = await createUser("Bapak Rudi", "wali1@santri.test", "wali");
  const wali2 = await createUser("Ibu Dewi", "wali2@santri.test", "wali");
  console.log("Created users (admin, 2 ustadz, 2 wali).");

  // --- Kelas ---
  const kelasRows = await db
    .insert(kelas)
    .values([
      { namaKelas: "Angkatan 2023", deskripsi: "Santri tahun ajaran 2023/2024" },
      { namaKelas: "Angkatan 2024", deskripsi: "Santri tahun ajaran 2024/2025" },
      { namaKelas: "Angkatan 2025", deskripsi: "Santri tahun ajaran 2025/2026" },
    ])
    .returning();

  // --- Santri ---
  const santriRows = await db
    .insert(santri)
    .values([
      { nama: "Ahmad Fauzi", kelasId: kelasRows[0].id, kategoriUsia: "pra_nikah", jenisKelamin: "laki_laki" },
      { nama: "Budi Santoso", kelasId: kelasRows[0].id, kategoriUsia: "remaja", jenisKelamin: "laki_laki" },
      { nama: "Citra Ayu", kelasId: kelasRows[1].id, kategoriUsia: "remaja", jenisKelamin: "perempuan" },
      { nama: "Dewi Lestari", kelasId: kelasRows[1].id, kategoriUsia: "pra_remaja", jenisKelamin: "perempuan" },
      { nama: "Eko Prasetyo", kelasId: kelasRows[2].id, kategoriUsia: "pra_remaja", jenisKelamin: "laki_laki" },
    ])
    .returning();

  // --- Kitab + halaman auto-generate ---
  const juzAmma = await createKitab(
    "Juz 'Amma",
    37,
    "Juz 30 dari Al-Qur'an, jilid untuk santri pemula.",
  );
  const alala = await createKitab(
    "Kitab Alala",
    20,
    "Nadzom adab pelajar, dikaji setelah Juz 'Amma.",
  );
  const safinah = await createKitab(
    "Kitab Safinah",
    30,
    "Fiqih dasar untuk santri tingkat lanjut.",
  );
  console.log("Created 3 kitab with auto-generated halaman.");

  // --- Wali <-> Santri relations ---
  await db
    .insert(waliSantri)
    .values([
      { waliId: wali1.id, santriId: santriRows[0].id },
      { waliId: wali1.id, santriId: santriRows[1].id },
      { waliId: wali2.id, santriId: santriRows[2].id },
    ])
    .execute();

  // --- Pencapaian (latest value per (santri, halaman)) ---
  // Ahmad Fauzi: Juz 'Amma mostly done, Alala halfway
  await gradeRange(santriRows[0].id, juzAmma.halaman, 1, 5, 100, ustadz1.id);
  await gradeRange(santriRows[0].id, juzAmma.halaman, 6, 10, 75, ustadz1.id);
  await gradeRange(santriRows[0].id, juzAmma.halaman, 11, 15, 50, ustadz1.id);
  await gradeRange(santriRows[0].id, alala.halaman, 1, 5, 100, ustadz2.id);

  // Budi Santoso: Juz 'Amma early stage
  await gradeRange(santriRows[1].id, juzAmma.halaman, 1, 8, 50, ustadz2.id);

  // Citra Ayu: Safinah just started
  await gradeRange(santriRows[2].id, safinah.halaman, 1, 3, 25, ustadz1.id);

  // --- Kegiatan + sesi + absensi (Fase 10) ---
  // Kajian Rutin Sabtu: all 5 santri registered, 2 sesi recorded.
  const [kajian] = await db
    .insert(kegiatan)
    .values({
      namaKegiatan: "Kajian Rutin Sabtu",
      deskripsi: "Kajian pekanan setiap Sabtu pagi.",
      dibuatOleh: ustadz1.id,
    })
    .returning();
  await db
    .insert(kegiatanPeserta)
    .values(santriRows.map((s) => ({ kegiatanId: kajian.id, santriId: s.id })))
    .execute();
  const sesiRows = await db
    .insert(kegiatanSesi)
    .values([
      { kegiatanId: kajian.id, tanggal: new Date("2026-09-05T08:00:00"), judul: "Pertemuan 1" },
      { kegiatanId: kajian.id, tanggal: new Date("2026-09-12T08:00:00"), judul: "Pertemuan 2" },
    ])
    .returning();
  await db
    .insert(absensi)
    .values([
      { sesiId: sesiRows[0].id, santriId: santriRows[0].id, status: "hadir", dicatatOleh: ustadz1.id },
      { sesiId: sesiRows[0].id, santriId: santriRows[1].id, status: "hadir", dicatatOleh: ustadz1.id },
      { sesiId: sesiRows[0].id, santriId: santriRows[2].id, status: "izin", keterangan: "sakit", dicatatOleh: ustadz1.id },
      { sesiId: sesiRows[1].id, santriId: santriRows[0].id, status: "hadir", dicatatOleh: ustadz2.id },
      { sesiId: sesiRows[1].id, santriId: santriRows[1].id, status: "tanpa_keterangan", dicatatOleh: ustadz2.id },
    ])
    .execute();
  console.log("Created 1 kegiatan with 2 sesi and 5 absensi rows.");

  console.log("\nSeed selesai ✅\n");
  console.log("Akun login (password semua: " + PASSWORD + "):");
  console.log("  Admin : admin@santri.test");
  console.log("  Ustadz: ustadz1@santri.test / ustadz2@santri.test");
  console.log("  Wali  : wali1@santri.test / wali2@santri.test");
  console.log("\nData:");
  console.log(`  Kelas : ${kelasRows.length} | Santri: ${santriRows.length}`);
  console.log("  Kitab : Juz 'Amma (37), Kitab Alala (20), Kitab Safinah (30)");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
