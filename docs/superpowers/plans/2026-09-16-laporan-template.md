# Laporan Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Template laporan teks bebas-tulis per kegiatan dengan variabel `{{...}}` yang dirender per sesi, plus tombol Salin.

**Architecture:** Tabel `kegiatan_template` baru + API CRUD mengikuti pola route kegiatan yang ada; mesin render fungsi murni di `src/lib/laporan-template.ts` yang jalan di browser (tanpa fetch tambahan); dua komponen client baru (`TemplateManager`, `LaporanCard`) dipakai ulang halaman admin & ustadz.

**Tech Stack:** Next.js 16 (App Router, server components untuk pages), React 19, Drizzle ORM + Postgres, zod v4 (`z` import dari `"zod"`), Tailwind v4 token semantik (`text-ink`, `bg-surface`, `border-border`), Lucide icons, `Dialog`/`toast`/`api()` existing.

**Spec:** `docs/superpowers/specs/2026-09-16-laporan-template-design.md`

## Global Constraints

- Tulis API: `requireApiRole(["admin", "ustadz"])`; baca list template juga admin/ustadz saja (wali → 403 dari helper route).
- Semua pesan user Bahasa Indonesia; error API `{ error: "<kalimat>" }` dan diambil client via `api()` menjadi `ApiError`.
- Mobile-first: dialog pakai `Dialog` existing, tombol min 44px (`min-h-[44px]` bila full-width), daftar panjang scroll (`max-h-64 overflow-y-auto`).
- Tanpa test runner di repo: tiap task diverifikasi dengan `npx tsc --noEmit` dan `npm run lint`; verifikasi perilaku via skrip `tsx` sekali-pakai (Task 3) dan cek manual (Task 8).
- Migrasi DB via `npm run db:push` dengan `.env.local` (butuh `DATABASE_URL`; Postgres lokal via `npm run db:up`).
- Ikuti gaya kode existing: `safeParse` + `issues[0]?.message`, `NextResponse.json`, `and(eq(...))` untuk cek kepemilikan, `updatedAt: new Date()` saat update.
- YAGNI: tidak ada unduh/PDF, tidak ada agregat lintas sesi, tidak ada template per sesi.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/db/schema.ts` (modify) | Tabel `kegiatan_template` + relasi; satu-satunya perubahan DB |
| `src/lib/validations.ts` (modify) | `templateNamaSchema`, `templateIsiSchema`, `templateCreateSchema`, `templateUpdateSchema` |
| `src/lib/laporan-template.ts` (create) | `LaporanContext`, `buildLaporanContext`, `renderTemplate`, `VARIABLE_CATALOG`, `findUnknownVars`; murni, tanpa import server |
| `src/lib/absensi-stats.ts` (modify) | `KegiatanTemplateItem`, `getKegiatanTemplates`, `totalSesi` di `SesiAbsensiData`/`getSesiAbsensi` |
| `src/app/api/kegiatan/[id]/template/route.ts` (create) | `GET` list + `POST` create |
| `src/app/api/kegiatan/[id]/template/[templateId]/route.ts` (create) | `PATCH` update + `DELETE` hapus |
| `src/components/shared/template-manager.tsx` (create) | Seksi kelola template (list + dialog editor + contekan variabel) |
| `src/components/shared/kegiatan-detail-manager.tsx` (modify) | Terima `initialTemplates`, render `TemplateManager` di bawah seksi Sesi |
| `src/components/shared/laporan-card.tsx` (create) | Dropdown template + preview + Salin di halaman sesi |
| `src/components/shared/absensi-sheet.tsx` (modify) | Prop opsional `laporanSlot?: ReactNode` dirender setelah kartu header |
| `src/app/admin/kegiatan/[id]/page.tsx`, `src/app/ustadz/kegiatan/[id]/page.tsx` (modify) | Ambil templates, teruskan ke manager |
| `src/app/admin/kegiatan/[id]/sesi/[sesiId]/page.tsx`, `src/app/ustadz/kegiatan/[id]/sesi/[sesiId]/page.tsx` (modify) | Ambil templates, teruskan ke `LaporanCard` via `laporanSlot` |
| `docs/SCHEMA.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION.md` (modify) | Dokumentasi fase ini |

Shared type contracts (didefinisikan sekali, dipakai lintas task):

```ts
// src/lib/absensi-stats.ts
export interface KegiatanTemplateItem {
  id: string;
  kegiatanId: string;
  nama: string;
  isi: string;
  updatedAt: string; // ISO
}
```

```ts
// src/lib/laporan-template.ts
export interface LaporanContext {
  namaKegiatan: string;
  judulSesi: string;
  catatanSesi: string;
  totalPeserta: number;
  totalSesi: number;
  hari: string; tanggal: string; tanggalPanjang: string;
  counts: Record<string, number>;
  lists: Record<string, string[]>;
}
export function buildLaporanContext(
  sesi: { namaKegiatan: string; tanggal: string; judul: string | null; catatan: string | null; peserta: SesiPesertaAbsensi[]; },
  totalSesi: number,
): LaporanContext;
export function renderTemplate(isi: string, ctx: LaporanContext): { text: string; unknownVars: string[] };
export function findUnknownVars(isi: string): string[];
export const VARIABLE_CATALOG: { name: string; description: string }[];
```

---

### Task 1: Skema DB `kegiatan_template` + migrasi

**Files:**
- Modify: `src/db/schema.ts` (tambah tabel setelah definisi `absensi`, tambah relasi)
- Test: `npx tsc --noEmit`

**Interfaces:**
- Consumes: `kegiatan` table, `uuid/text/timestamp/pgTable/index/relations` (sudah diimpor di file ini).
- Produces: `kegiatanTemplate` table + `kegiatanTemplateRelations` untuk Task 4/5.

- [ ] **Step 1: Tambah tabel + relasi ke `src/db/schema.ts`**

Sisipkan setelah blok `export const absensi = pgTable(...)` (sebelum garis `// --- Relations`):

```ts
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
```

Di blok relasi, tambah `template: many(kegiatanTemplate)` ke `kegiatanRelations`, dan tambah relasi baru setelah `kegiatanSesiRelations`:

```ts
export const kegiatanTemplateRelations = relations(kegiatanTemplate, ({ one }) => ({
  kegiatan: one(kegiatan, {
    fields: [kegiatanTemplate.kegiatanId],
    references: [kegiatan.id],
  }),
}));
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0, tanpa output.

- [ ] **Step 3: Migrasi lokal**

Run: `npm run db:up` (nyalakan Postgres lokal bila belum jalan), lalu `npm run db:push`
Expected: push sukses; tabel `kegiatan_template` ada. Bila `DATABASE_URL` tidak tersedia, catat dan lanjut (migrasi diulang saat deploy); JANGAN fake.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(absensi): tabel kegiatan_template untuk laporan teks"
```

---

### Task 2: Validasi zod template

**Files:**
- Modify: `src/lib/validations.ts` (tambah di bawah skema absensi)
- Test: `npx tsc --noEmit`

**Interfaces:**
- Consumes: tidak ada (hanya `z`).
- Produces: `templateCreateSchema`, `templateUpdateSchema` untuk Task 5.

- [ ] **Step 1: Tambah skema setelah `absensiInputSchema`**

```ts
// --- Template laporan (per kegiatan, render per sesi) ------------------------

const templateNamaSchema = z
  .string()
  .trim()
  .min(1, "Nama template wajib diisi.")
  .max(120, "Nama template maksimal 120 karakter.");

const templateIsiSchema = z
  .string()
  .trim()
  .min(1, "Isi template wajib diisi.")
  .max(10000, "Isi template maksimal 10000 karakter.");

/** Create: nama + isi wajib. */
export const templateCreateSchema = z.object({
  nama: templateNamaSchema,
  isi: templateIsiSchema,
});

/** Partial update: minimal satu field. */
export const templateUpdateSchema = z
  .object({
    nama: templateNamaSchema.optional(),
    isi: templateIsiSchema.optional(),
  })
  .refine((d) => d.nama !== undefined || d.isi !== undefined, {
    message: "Minimal satu field diisi.",
  });
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit` → Expected exit 0. Run: `npm run lint` → Expected exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/validations.ts
git commit -m "feat(absensi): validasi zod template laporan"
```

---

### Task 3: Mesin render `src/lib/laporan-template.ts`

**Files:**
- Create: `src/lib/laporan-template.ts`
- Test: skrip sekali-pakai `/tmp/opencode/verify-laporan.ts` (TIDAK dicommit) + `npx tsc --noEmit`

**Interfaces:**
- Consumes: tipe `SesiPesertaAbsensi` (bentuk field: `nama`, `kelasNama`, `kategoriUsia`, `jenisKelamin`, `status: "hadir" | "izin" | "tanpa_keterangan" | null`, `keterangan`). Untuk menghindari import server, task ini mendefinisikan tipe input struktural sendiri (lihat kode: `LaporanPeserta`).
- Produces: `LaporanContext`, `buildLaporanContext`, `renderTemplate`, `findUnknownVars`, `VARIABLE_CATALOG` untuk Task 6/7.

Aturan dari spec (wajib): list alfabetis locale `id`; entri izin tambah ` (keterangan)` bila ada; list kosong → `(tidak ada)`; variabel tak dikenal dibiarkan + dilaporkan; `jumlah_tidak_hadir` = izin + tanpa_keterangan; persen = `Math.round(n/total*100) + "%"`, total 0 → `0%`; `judul_sesi`/`catatan_sesi` null → string kosong; tanggal locale `id-ID` (`hari`: weekday long; `tanggal`: day numeric + month short + year numeric; `tanggal_panjang`: weekday long + day + month long + year).

- [ ] **Step 1: Tulis file lengkap**

```ts
/**
 * Template laporan teks (fase laporan): katalog variabel tetap + render murni.
 * Client-safe: tidak mengimpor apa pun dari server bundle.
 */

export interface LaporanPeserta {
  nama: string;
  status: "hadir" | "izin" | "tanpa_keterangan" | null;
  keterangan: string | null;
  kategoriUsia: "pra_remaja" | "remaja" | "pra_nikah" | null;
  jenisKelamin: "laki_laki" | "perempuan" | null;
}

export interface LaporanSesiInput {
  namaKegiatan: string;
  tanggal: string;
  judul: string | null;
  catatan: string | null;
  peserta: LaporanPeserta[];
}

export interface LaporanContext {
  namaKegiatan: string;
  judulSesi: string;
  catatanSesi: string;
  totalPeserta: number;
  totalSesi: number;
  hari: string;
  tanggal: string;
  tanggalPanjang: string;
  counts: Record<string, number>;
  lists: Record<string, string[]>;
}

export const VARIABLE_CATALOG: { name: string; description: string }[] = [
  { name: "nama_kegiatan", description: "Nama kegiatan" },
  { name: "judul_sesi", description: "Judul sesi (kosong bila tidak ada)" },
  { name: "catatan_sesi", description: "Catatan sesi (kosong bila tidak ada)" },
  { name: "total_peserta", description: "Jumlah santri terdaftar" },
  { name: "total_sesi", description: "Jumlah sesi di kegiatan ini" },
  { name: "hari", description: "Hari sesi, mis. Sabtu" },
  { name: "tanggal", description: "Tanggal pendek, mis. 12 Jan 2026" },
  { name: "tanggal_panjang", description: "Tanggal panjang, mis. Sabtu, 12 Januari 2026" },
  { name: "jumlah_hadir", description: "Yang hadir" },
  { name: "jumlah_izin", description: "Yang izin" },
  { name: "jumlah_tanpa_keterangan", description: "Yang tanpa keterangan" },
  { name: "jumlah_tidak_hadir", description: "Izin + tanpa keterangan" },
  { name: "jumlah_belum_diabsen", description: "Belum diabsen" },
  { name: "jumlah_hadir_laki_laki", description: "Hadir, laki-laki" },
  { name: "jumlah_hadir_perempuan", description: "Hadir, perempuan" },
  { name: "jumlah_hadir_pra_remaja", description: "Hadir, pra-remaja" },
  { name: "jumlah_hadir_remaja", description: "Hadir, remaja" },
  { name: "jumlah_hadir_pra_nikah", description: "Hadir, pra-nikah" },
  { name: "jumlah_hadir_pra_remaja_laki_laki", description: "Hadir, pra-remaja laki-laki" },
  { name: "jumlah_hadir_pra_remaja_perempuan", description: "Hadir, pra-remaja perempuan" },
  { name: "jumlah_hadir_remaja_laki_laki", description: "Hadir, remaja laki-laki" },
  { name: "jumlah_hadir_remaja_perempuan", description: "Hadir, remaja perempuan" },
  { name: "jumlah_hadir_pra_nikah_laki_laki", description: "Hadir, pra-nikah laki-laki" },
  { name: "jumlah_hadir_pra_nikah_perempuan", description: "Hadir, pra-nikah perempuan" },
  { name: "persen_hadir", description: "Persen hadir dari total peserta" },
  { name: "persen_izin", description: "Persen izin dari total peserta" },
  { name: "persen_tanpa_keterangan", description: "Persen tanpa keterangan" },
  { name: "persen_tidak_hadir", description: "Persen tidak hadir (izin + tanpa ket.)" },
  { name: "persen_belum_diabsen", description: "Persen belum diabsen" },
  { name: "daftar_hadir", description: "Daftar bernomor yang hadir" },
  { name: "daftar_izin", description: "Daftar bernomor yang izin (+ keterangan)" },
  { name: "daftar_tanpa_keterangan", description: "Daftar yang tanpa keterangan" },
  { name: "daftar_tidak_hadir", description: "Daftar izin + tanpa keterangan" },
  { name: "daftar_belum_diabsen", description: "Daftar yang belum diabsen" },
  { name: "daftar_hadir_laki_laki", description: "Daftar hadir laki-laki" },
  { name: "daftar_hadir_perempuan", description: "Daftar hadir perempuan" },
  { name: "daftar_hadir_pra_remaja", description: "Daftar hadir pra-remaja" },
  { name: "daftar_hadir_remaja", description: "Daftar hadir remaja" },
  { name: "daftar_hadir_pra_nikah", description: "Daftar hadir pra-nikah" },
];

const KNOWN = new Set(VARIABLE_CATALOG.map((v) => v.name));

function sortNama(list: LaporanPeserta[]): LaporanPeserta[] {
  return [...list].sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}

function formatNama(p: LaporanPeserta): string {
  const ket = p.keterangan?.trim();
  return ket ? `${p.nama} (${ket})` : p.nama;
}

function numbered(list: LaporanPeserta[]): string[] {
  return sortNama(list).map((p, i) => `${i + 1}. ${formatNama(p)}`);
}

function pct(n: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

export function buildLaporanContext(sesi: LaporanSesiInput, totalSesi: number): LaporanContext {
  const d = new Date(sesi.tanggal);
  const hadir = sesi.peserta.filter((p) => p.status === "hadir");
  const izin = sesi.peserta.filter((p) => p.status === "izin");
  const tanpaKet = sesi.peserta.filter((p) => p.status === "tanpa_keterangan");
  const belum = sesi.peserta.filter((p) => p.status === null);
  const tidakHadir = [...izin, ...tanpaKet];
  const total = sesi.peserta.length;

  const hadirBy = (usia: LaporanPeserta["kategoriUsia"], gender: LaporanPeserta["jenisKelamin"]) =>
    hadir.filter((p) => (usia ? p.kategoriUsia === usia : true) && (gender ? p.jenisKelamin === gender : true));

  const counts: Record<string, number> = {
    jumlah_hadir: hadir.length,
    jumlah_izin: izin.length,
    jumlah_tanpa_keterangan: tanpaKet.length,
    jumlah_tidak_hadir: tidakHadir.length,
    jumlah_belum_diabsen: belum.length,
    jumlah_hadir_laki_laki: hadirBy(null, "laki_laki").length,
    jumlah_hadir_perempuan: hadirBy(null, "perempuan").length,
    jumlah_hadir_pra_remaja: hadirBy("pra_remaja", null).length,
    jumlah_hadir_remaja: hadirBy("remaja", null).length,
    jumlah_hadir_pra_nikah: hadirBy("pra_nikah", null).length,
    jumlah_hadir_pra_remaja_laki_laki: hadirBy("pra_remaja", "laki_laki").length,
    jumlah_hadir_pra_remaja_perempuan: hadirBy("pra_remaja", "perempuan").length,
    jumlah_hadir_remaja_laki_laki: hadirBy("remaja", "laki_laki").length,
    jumlah_hadir_remaja_perempuan: hadirBy("remaja", "perempuan").length,
    jumlah_hadir_pra_nikah_laki_laki: hadirBy("pra_nikah", "laki_laki").length,
    jumlah_hadir_pra_nikah_perempuan: hadirBy("pra_nikah", "perempuan").length,
  };

  const lists: Record<string, string[]> = {
    daftar_hadir: numbered(hadir),
    daftar_izin: numbered(izin),
    daftar_tanpa_keterangan: numbered(tanpaKet),
    daftar_tidak_hadir: numbered(tidakHadir),
    daftar_belum_diabsen: numbered(belum),
    daftar_hadir_laki_laki: numbered(hadirBy(null, "laki_laki")),
    daftar_hadir_perempuan: numbered(hadirBy(null, "perempuan")),
    daftar_hadir_pra_remaja: numbered(hadirBy("pra_remaja", null)),
    daftar_hadir_remaja: numbered(hadirBy("remaja", null)),
    daftar_hadir_pra_nikah: numbered(hadirBy("pra_nikah", null)),
  };

  return {
    namaKegiatan: sesi.namaKegiatan,
    judulSesi: sesi.judul ?? "",
    catatanSesi: sesi.catatan ?? "",
    totalPeserta: total,
    totalSesi,
    hari: new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(d),
    tanggal: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d),
    tanggalPanjang: new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d),
    counts,
    lists,
  };
}

function valueOf(name: string, ctx: LaporanContext): string | null {
  switch (name) {
    case "nama_kegiatan": return ctx.namaKegiatan;
    case "judul_sesi": return ctx.judulSesi;
    case "catatan_sesi": return ctx.catatanSesi;
    case "total_peserta": return String(ctx.totalPeserta);
    case "total_sesi": return String(ctx.totalSesi);
    case "hari": return ctx.hari;
    case "tanggal": return ctx.tanggal;
    case "tanggal_panjang": return ctx.tanggalPanjang;
    case "persen_hadir": return pct(ctx.counts.jumlah_hadir, ctx.totalPeserta);
    case "persen_izin": return pct(ctx.counts.jumlah_izin, ctx.totalPeserta);
    case "persen_tanpa_keterangan": return pct(ctx.counts.jumlah_tanpa_keterangan, ctx.totalPeserta);
    case "persen_tidak_hadir": return pct(ctx.counts.jumlah_tidak_hadir, ctx.totalPeserta);
    case "persen_belum_diabsen": return pct(ctx.counts.jumlah_belum_diabsen, ctx.totalPeserta);
    default: break;
  }
  if (name in ctx.counts) return String(ctx.counts[name]);
  if (name in ctx.lists) {
    const l = ctx.lists[name];
    return l.length > 0 ? l.join("\n") : "(tidak ada)";
  }
  return null;
}

/** Variabel `{{...}}` tak dikenal — dibiarkan apa adanya + dilaporkan. */
export function findUnknownVars(isi: string): string[] {
  const out: string[] = [];
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(isi)) !== null) {
    const name = m[1];
    if (!KNOWN.has(name) && !out.includes(name)) out.push(name);
  }
  return out;
}

export function renderTemplate(isi: string, ctx: LaporanContext): { text: string; unknownVars: string[] } {
  const unknownVars = findUnknownVars(isi);
  const text = isi.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (full, name: string) => {
    const v = valueOf(name, ctx);
    return v === null ? full : v;
  });
  return { text, unknownVars };
}
```

- [ ] **Step 2: Verifikasi perilaku via skrip sekali-pakai (TIDAK dicommit)**

Tulis `/tmp/opencode/verify-laporan.ts`:

```ts
import { buildLaporanContext, renderTemplate } from "@/lib/laporan-template";

const ctx = buildLaporanContext({
  namaKegiatan: "Kajian Rutin Sabtu",
  tanggal: new Date("2026-09-12T00:00:00").toISOString(),
  judul: "Pertemuan 2",
  catatan: null,
  peserta: [
    { nama: "Budi", status: "hadir", keterangan: null, kategoriUsia: "remaja", jenisKelamin: "laki_laki" },
    { nama: "Ani", status: "izin", keterangan: "sakit", kategoriUsia: "pra_remaja", jenisKelamin: "perempuan" },
    { nama: "Cici", status: null, keterangan: null, kategoriUsia: null, jenisKelamin: "perempuan" },
  ],
}, 4);

const { text, unknownVars } = renderTemplate(
  "{{nama_kegiatan}} {{hari}} {{tanggal}} H:{{jumlah_hadir}} ({{persen_hadir}}) L:{{jumlah_hadir_laki_laki}}\n{{daftar_hadir}}\n{{daftar_izin}}\n{{daftar_belum_diabsen}}\n{{typo}}",
  ctx,
);
console.log(text);
console.log("UNKNOWN:", JSON.stringify(unknownVars));
if (!text.includes("Kajian Rutin Sabtu")) throw new Error("nama_kegiatan gagal");
if (!text.includes("1. Budi")) throw new Error("daftar_hadir gagal");
if (!text.includes("1. Ani (sakit)")) throw new Error("keterangan izin gagal");
if (!text.includes("(tidak ada)") && ctx.lists.daftar_tanpa_keterangan.length !== 0) throw new Error("empty list gagal");
if (!text.includes("{{typo}}") || !unknownVars.includes("typo")) throw new Error("unknown var gagal");
if (!text.includes("33%")) throw new Error("persen gagal (1/3)");
console.log("OK");
```

Run: `npx tsx /tmp/opencode/verify-laporan.ts`
Expected: cetak teks render + `UNKNOWN: ["typo"]` + `OK`, exit 0.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit` → Expected exit 0. Run: `npm run lint` → Expected exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/laporan-template.ts
git commit -m "feat(absensi): mesin render template laporan teks"
```

---

### Task 4: Helper `getKegiatanTemplates` + `totalSesi`

**Files:**
- Modify: `src/lib/absensi-stats.ts`
- Test: `npx tsc --noEmit`

**Interfaces:**
- Consumes: `kegiatanTemplate` (Task 1), `SesiAbsensiData`.
- Produces: `KegiatanTemplateItem`, `getKegiatanTemplates(kegiatanId)`, `SesiAbsensiData.totalSesi` untuk Task 5/6/7.

- [ ] **Step 1: Tambah import + tipe + helper + perluas `getSesiAbsensi`**

Import: tambah `kegiatanTemplate` ke import `{ absensi, kegiatan, kegiatanPeserta, kegiatanSesi, santri }` dari `@/db/schema`.

Tambah setelah interface `KegiatanDetail`:

```ts
export interface KegiatanTemplateItem {
  id: string;
  kegiatanId: string;
  nama: string;
  isi: string;
  /** ISO string. */
  updatedAt: string;
}

export async function getKegiatanTemplates(kegiatanId: string): Promise<KegiatanTemplateItem[]> {
  const rows = await db.query.kegiatanTemplate.findMany({
    where: (t, { eq }) => eq(t.kegiatanId, kegiatanId),
    columns: { id: true, kegiatanId: true, nama: true, isi: true, updatedAt: true },
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
  return rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }));
}
```

Perluas interface `SesiAbsensiData` dengan field `totalSesi: number;` (dengan komentar `/** Jumlah sesi di kegiatan ini (untuk konteks laporan). */`).

Di `getSesiAbsensi`, setelah `bySantri` dibangun, tambah hitungan sesi lalu sertakan di return:

```ts
const totalSesi = (await getKegiatanDetail(sesi.kegiatanId))?.sesi.length ?? 0;
```

dan di object return tambah `totalSesi,`.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit` → Expected exit 0. Run: `npm run lint` → Expected exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/absensi-stats.ts
git commit -m "feat(absensi): helper template + totalSesi untuk laporan"
```

---

### Task 5: API CRUD template

**Files:**
- Create: `src/app/api/kegiatan/[id]/template/route.ts`
- Create: `src/app/api/kegiatan/[id]/template/[templateId]/route.ts`
- Test: `npx tsc --noEmit` + `npm run lint`

**Interfaces:**
- Consumes: `kegiatanTemplate` (Task 1), `templateCreateSchema`/`templateUpdateSchema` (Task 2), `getKegiatanDetail`/`getKegiatanTemplates` (Task 4), pola `requireApiRole` + `safeParse` existing.
- Produces: `GET/POST /api/kegiatan/[id]/template`, `PATCH/DELETE /api/kegiatan/[id]/template/[templateId]` untuk Task 6.

- [ ] **Step 1: Tulis `src/app/api/kegiatan/[id]/template/route.ts`**

```ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { kegiatanTemplate } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { templateCreateSchema } from "@/lib/validations";
import { getKegiatanDetail, getKegiatanTemplates } from "@/lib/absensi-stats";

/** List template laporan satu kegiatan (urut dibuat) + buat template baru. */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireApiRole(["admin", "ustadz"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const detail = await getKegiatanDetail(id);
  if (!detail)
    return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });
  return NextResponse.json(await getKegiatanTemplates(id));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireApiRole(["admin", "ustadz"]);
  if (session instanceof Response) return session;

  const { id } = await params;
  const parsed = templateCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const detail = await getKegiatanDetail(id);
  if (!detail)
    return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });

  const [row] = await db
    .insert(kegiatanTemplate)
    .values({ kegiatanId: id, nama: parsed.data.nama, isi: parsed.data.isi })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
```

- [ ] **Step 2: Tulis `src/app/api/kegiatan/[id]/template/[templateId]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { kegiatanTemplate } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { templateUpdateSchema } from "@/lib/validations";

/** Edit atau hapus satu template. Template harus milik kegiatan di URL. */

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> },
) {
  const session = await requireApiRole(["admin", "ustadz"]);
  if (session instanceof Response) return session;

  const { id, templateId } = await params;
  const parsed = templateUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(kegiatanTemplate)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(kegiatanTemplate.id, templateId), eq(kegiatanTemplate.kegiatanId, id)))
    .returning();
  if (!updated)
    return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> },
) {
  const session = await requireApiRole(["admin", "ustadz"]);
  if (session instanceof Response) return session;

  const { id, templateId } = await params;
  const [row] = await db
    .select({ id: kegiatanTemplate.id })
    .from(kegiatanTemplate)
    .where(and(eq(kegiatanTemplate.id, templateId), eq(kegiatanTemplate.kegiatanId, id)))
    .limit(1);
  if (!row)
    return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });

  await db.delete(kegiatanTemplate).where(eq(kegiatanTemplate.id, templateId));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit` → Expected exit 0. Run: `npm run lint` → Expected exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/kegiatan/\[id\]/template/route.ts "src/app/api/kegiatan/[id]/template/[templateId]/route.ts"
git commit -m "feat(absensi): API CRUD template laporan per kegiatan"
```

---

### Task 6: `TemplateManager` + integrasi halaman detail

**Files:**
- Create: `src/components/shared/template-manager.tsx`
- Modify: `src/components/shared/kegiatan-detail-manager.tsx` (prop `initialTemplates`, render seksi di bawah Sesi)
- Modify: `src/app/admin/kegiatan/[id]/page.tsx`, `src/app/ustadz/kegiatan/[id]/page.tsx` (fetch + teruskan)
- Test: `npx tsc --noEmit` + `npm run lint`

**Interfaces:**
- Consumes: `KegiatanTemplateItem` (Task 4), `VARIABLE_CATALOG` + `findUnknownVars` (Task 3), `api()`, `toast`, `Dialog`/`Button`/`Card`/`Input`/`Field`/`Textarea` existing.
- Produces: seksi kelola template di detail kegiatan untuk Task 8 (manual).

- [ ] **Step 1: Tulis `src/components/shared/template-manager.tsx` lengkap**

```tsx
"use client";

import { useRef, useState, type FormEvent } from "react";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, Textarea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { VARIABLE_CATALOG, findUnknownVars } from "@/lib/laporan-template";
import type { KegiatanTemplateItem } from "@/lib/absensi-stats";

/**
 * Kelola template laporan teks satu kegiatan (N template per kegiatan).
 * Editor memakai Dialog existing + contekan variabel klik-untuk-sisip.
 */
export function TemplateManager({
  kegiatanId,
  initialTemplates,
}: {
  kegiatanId: string;
  initialTemplates: KegiatanTemplateItem[];
}) {
  const toast = useToast();
  const [items, setItems] = useState<KegiatanTemplateItem[]>(initialTemplates);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nama, setNama] = useState("");
  const [isi, setIsi] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const isiRef = useRef<HTMLTextAreaElement>(null);

  const unknown = findUnknownVars(isi);

  async function refresh() {
    setItems(await api<KegiatanTemplateItem[]>(`/api/kegiatan/${kegiatanId}/template`));
  }

  function openCreate() {
    setEditingId(null);
    setNama("");
    setIsi("");
    setShowForm(true);
  }

  function openEdit(t: KegiatanTemplateItem) {
    setEditingId(t.id);
    setNama(t.nama);
    setIsi(t.isi);
    setShowForm(true);
  }

  function insertVar(name: string) {
    const el = isiRef.current;
    const token = `{{${name}}}`;
    if (!el) {
      setIsi((v) => (v ? `${v} ${token}` : token));
      return;
    }
    const start = el.selectionStart ?? isi.length;
    const end = el.selectionEnd ?? isi.length;
    const next = `${isi.slice(0, start)}${token}${isi.slice(end)}`;
    setIsi(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  }

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { nama: nama.trim(), isi: isi.trim() };
      await toast.promise(
        editingId
          ? api(`/api/kegiatan/${kegiatanId}/template/${editingId}`, {
              method: "PATCH",
              body: JSON.stringify(payload),
            })
          : api(`/api/kegiatan/${kegiatanId}/template`, {
              method: "POST",
              body: JSON.stringify(payload),
            }),
        {
          loading: "Menyimpan template...",
          success: editingId ? "Template berhasil diperbarui." : "Template berhasil dibuat.",
          error: (err) => (err instanceof Error ? err.message : "Gagal menyimpan template."),
        },
      );
      await refresh();
      setShowForm(false);
    } catch {
      // Error sudah ditampilkan lewat toast.
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    try {
      await toast.promise(api(`/api/kegiatan/${kegiatanId}/template/${id}`, { method: "DELETE" }), {
        loading: "Menghapus template...",
        success: "Template berhasil dihapus.",
        error: (err) => (err instanceof Error ? err.message : "Gagal menghapus template."),
      });
      await refresh();
    } catch {
      // Error sudah ditampilkan lewat toast.
    }
  }

  return (
    <section aria-label="Template laporan" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Template Laporan</h2>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden />
          Tambah Template
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-secondary">
          Belum ada template. Klik “Tambah Template” untuk membuat laporan per sesi, mingguan, dll.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((t) => (
            <Card key={t.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{t.nama}</p>
                  <p className="line-clamp-2 text-sm text-ink-secondary">{t.isi}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(t)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(t.id)}
                  className={confirmDeleteId === t.id ? "text-danger" : undefined}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  {confirmDeleteId === t.id ? "Yakin? Klik lagi" : "Hapus"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? "Edit Template" : "Tambah Template"}
        footer={
          <div className="flex gap-3">
            <Button type="submit" form="form-template" disabled={saving} className="flex-1">
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Batal
            </Button>
          </div>
        }
      >
        <form id="form-template" onSubmit={handleSave} className="space-y-4">
          <Field label="Nama Template" htmlFor="nama-template">
            <Input
              id="nama-template"
              required
              maxLength={120}
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="mis. Laporan per sesi"
            />
          </Field>
          <Field label="Isi Template" htmlFor="isi-template" hint="Tulis bebas, pakai {{nama_variabel}} untuk data otomatis.">
            <Textarea
              id="isi-template"
              ref={isiRef}
              rows={8}
              required
              value={isi}
              onChange={(e) => setIsi(e.target.value)}
              placeholder={"Contoh:\n{{nama_kegiatan}} — {{tanggal_panjang}}\nHadir {{jumlah_hadir}} dari {{total_peserta}} ({{persen_hadir}})\n{{daftar_hadir}}"}
            />
          </Field>
          {unknown.length > 0 ? (
            <p className="text-sm text-warning" role="alert">
              Variabel tak dikenal: {unknown.map((v) => `{{${v}}}`).join(", ")} — akan tampil apa adanya di laporan.
            </p>
          ) : null}
          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">Variabel — klik untuk menyisipkan</p>
            <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border bg-surface p-2">
              {VARIABLE_CATALOG.map((v) => (
                <li key={v.name}>
                  <button
                    type="button"
                    onClick={() => insertVar(v.name)}
                    className="flex min-h-[44px] w-full flex-col items-start justify-center gap-0.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-background"
                  >
                    <span className="font-mono text-xs font-semibold text-primary">{`{{${v.name}}}`}</span>
                    <span className="text-xs text-ink-secondary">{v.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
```

Catatan: `Textarea` di `src/components/ui/field.tsx` belum meneruskan `ref` — ubah signature-nya menjadi berikut agar sisip-di-kursor bisa fokus kembali (satu-satunya perubahan di file itu):

```tsx
import type { ReactNode, Ref, TextareaHTMLAttributes } from "react";

// ...

export function Textarea({
  className = "",
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return (
    <textarea
      ref={ref}
      className={`w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-secondary/70 focus:border-primary focus:ring-2 focus:ring-primary/20 ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Integrasi ke `KegiatanDetailManager`**

Tambah prop `initialTemplates: KegiatanTemplateItem[]`; import `TemplateManager` + tipe; render `<TemplateManager kegiatanId={detail.id} initialTemplates={initialTemplates} />` setelah `</section>` Sesi (sebelum Dialog peserta). Update kedua page detail:

Admin (`src/app/admin/kegiatan/[id]/page.tsx`): tambah `getKegiatanTemplates` ke import dari `@/lib/absensi-stats`; tambah ke `Promise.all` ketiga; teruskan `initialTemplates={templates}`.

Ustadz (`src/app/ustadz/kegiatan/[id]/page.tsx`): sama.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit` → Expected exit 0. Run: `npm run lint` → Expected exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/template-manager.tsx src/components/shared/kegiatan-detail-manager.tsx "src/app/admin/kegiatan/[id]/page.tsx" "src/app/ustadz/kegiatan/[id]/page.tsx" src/components/ui/field.tsx
git commit -m "feat(absensi): kelola template laporan di detail kegiatan"
```

(Sesuaikan daftar file bila `field.tsx` tidak perlu diubah.)

---

### Task 7: `LaporanCard` + integrasi halaman sesi

**Files:**
- Create: `src/components/shared/laporan-card.tsx`
- Modify: `src/components/shared/absensi-sheet.tsx` (prop `laporanSlot?: ReactNode` setelah kartu header)
- Modify: 2 halaman sesi (admin + ustadz): fetch templates + render via slot
- Test: `npx tsc --noEmit` + `npm run lint`

**Interfaces:**
- Consumes: `SesiAbsensiData` (+`totalSesi`, Task 4), `KegiatanTemplateItem` (Task 4), `buildLaporanContext`/`renderTemplate` (Task 3).
- Produces: laporan per sesi untuk Task 8 (manual).

- [ ] **Step 1: Tulis `src/components/shared/laporan-card.tsx` lengkap**

```tsx
"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { buildLaporanContext, renderTemplate } from "@/lib/laporan-template";
import type { KegiatanTemplateItem, SesiAbsensiData } from "@/lib/absensi-stats";

/**
 * Laporan teks satu sesi: dropdown template → preview → Salin.
 * Render murni di browser dari data sesi yang sudah ada.
 */
export function LaporanCard({
  sesi,
  templates,
  detailHref,
}: {
  sesi: SesiAbsensiData;
  templates: KegiatanTemplateItem[];
  detailHref: string;
}) {
  const toast = useToast();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [copied, setCopied] = useState(false);

  const template = templates.find((t) => t.id === templateId) ?? templates[0] ?? null;

  const { text, unknownVars } = useMemo(() => {
    if (!template) return { text: "", unknownVars: [] as string[] };
    const ctx = buildLaporanContext(sesi, sesi.totalSesi);
    return renderTemplate(template.isi, ctx);
  }, [template, sesi]);

  async function handleCopy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Laporan tersalin. Tempel ke WA/grup.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin otomatis. Teks sudah diseleksi — salin manual.");
      const el = document.getElementById("laporan-preview");
      const range = document.createRange();
      if (el) {
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  return (
    <Card className="space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Laporan</h2>
        {template ? (
          <Button type="button" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? "Tersalin!" : "Salin Laporan"}
          </Button>
        ) : null}
      </div>

      {templates.length === 0 || !template ? (
        <p className="text-sm text-ink-secondary">
          Belum ada template. <a className="font-medium text-primary underline" href={detailHref}>Buat template di detail kegiatan.</a>
        </p>
      ) : (
        <>
          <Select
            value={template.id}
            onChange={(e) => setTemplateId(e.target.value)}
            aria-label="Pilih template laporan"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.nama}</option>
            ))}
          </Select>
          {unknownVars.length > 0 ? (
            <p className="text-sm text-warning" role="alert">
              Variabel tak dikenal: {unknownVars.map((v) => `{{${v}}}`).join(", ")} — tampil apa adanya.
            </p>
          ) : null}
          <pre
            id="laporan-preview"
            className="max-h-96 overflow-y-auto rounded-xl border border-border bg-background p-4 text-sm whitespace-pre-wrap text-ink"
          >
            {text}
          </pre>
        </>
      )}
    </Card>
  );
}
```

(`toast.success`/`toast.error` sudah ada di `ToastApi`, langsung pakai.)

- [ ] **Step 2: Tambah slot di `AbsensiSheet`**

Import `type ReactNode` dari react; tambah prop `laporanSlot?: ReactNode`; render `{laporanSlot}` tepat setelah `</Card>` header (sebelum div search). Tanda: cari blok `<p className="mt-1 text-sm text-ink-secondary" aria-live="polite">` + `</Card>` penutupnya, sisipkan `{laporanSlot}` setelahnya.

- [ ] **Step 3: Update 2 halaman sesi**

Admin (`src/app/admin/kegiatan/[id]/sesi/[sesiId]/page.tsx`):

```tsx
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { AbsensiSheet } from "@/components/shared/absensi-sheet";
import { LaporanCard } from "@/components/shared/laporan-card";
import { getKegiatanTemplates, getSesiAbsensi } from "@/lib/absensi-stats";

// ... metadata sama ...

export default async function AdminSesiAbsensiPage({
  params,
}: {
  params: Promise<{ id: string; sesiId: string }>;
}) {
  await requireRole(["admin"]);
  const { id, sesiId } = await params;

  const [data, templates] = await Promise.all([
    getSesiAbsensi(sesiId),
    getKegiatanTemplates(id),
  ]);
  if (!data || data.kegiatanId !== id) notFound();

  return (
    <AbsensiSheet
      initialData={data}
      postUrl={`/api/kegiatan/${id}/sesi/${sesiId}/absensi`}
      backHref={`/admin/kegiatan/${id}`}
      laporanSlot={<LaporanCard sesi={data} templates={templates} detailHref={`/admin/kegiatan/${id}`} />}
    />
  );
}
```

Ustadz: sama dengan `requireRole(["ustadz"])` dan path `/ustadz/kegiatan/${id}`.

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit` → Expected exit 0. Run: `npm run lint` → Expected exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/laporan-card.tsx src/components/shared/absensi-sheet.tsx "src/app/admin/kegiatan/[id]/sesi/[sesiId]/page.tsx" "src/app/ustadz/kegiatan/[id]/sesi/[sesiId]/page.tsx"
git commit -m "feat(absensi): laporan teks per sesi dengan pilih template + salin"
```

---

### Task 8: Docs + verifikasi akhir manual

**Files:**
- Modify: `docs/SCHEMA.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION.md`
- Test: manual checklist di bawah (aplikasi jalan `npm run dev`)

**Interfaces:**
- Consumes: semua task di atas.
- Produces: docs sinkron + keyakinan rilis.

- [ ] **Step 1: Update `docs/SCHEMA.md`**

Di bagian Attendance (dekat tabel `absensi`), tambah baris tabel `kegiatan_template (id, kegiatan_id FK cascade, nama, isi, created_at, updated_at; index kegiatan_id)` + catatan: hapus kegiatan cascade; hapus peserta/sesi tidak menyentuh template.

- [ ] **Step 2: Update `docs/ARCHITECTURE.md`**

Di §3 route kegiatan: tambah `GET/POST /api/kegiatan/[id]/template`, `PATCH/DELETE .../template/[templateId]` (admin/ustadz). Di komponen shared: tambah `template-manager.tsx` (kelola N template/kegiatan), `laporan-card.tsx` (dropdown + preview + salin per sesi), `laporan-template.ts` (render murni `{{var}}`).

- [ ] **Step 3: Update `docs/IMPLEMENTATION.md`**

Tambah entri fase laporan (setelah Fase 11): tabel baru, validasi, API, mesin variabel + katalog 39 variabel tetap, UI, batasan v1.

- [ ] **Step 4: Verifikasi akhir**

Run: `npx tsc --noEmit` (exit 0), `npm run lint` (exit 0). Lalu `npm run dev`, cek manual dengan seed "Kajian Rutin Sabtu":
  1. Detail kegiatan → tambah template "Laporan sesi" berisi variabel tanggal, jumlah, persen, daftar → simpan sukses.
  2. Buka sesi → dropdown template → preview benar (nama, hari/tanggal Indonesia, `1. Ani (sakit)`, `(tidak ada)` untuk list kosong, `{{typo}}` + peringatan bila ada).
  3. Salin → tempel ke editor teks, cocok dengan preview.
  4. Edit + hapus template dari detail → dropdown sesi ikut berubah setelah refresh.
  5. Login wali → `GET /api/kegiatan/<id>/template` → 403.
  6. Cek tampilan mobile (dialog bottom-sheet, tombol 44px, preview scroll).

- [ ] **Step 5: Commit**

```bash
git add docs/SCHEMA.md docs/ARCHITECTURE.md docs/IMPLEMENTATION.md
git commit -m "docs(absensi): dokumentasi template laporan teks"
```

---

## Plan Self-Review (diisi penulis plan)

1. **Spec coverage:** §4 tabel/API → Task 1/4/5 ✓; §5 katalog+aturan (39 variabel tetap, persen `Math.round`, `(tidak ada)`, unknown dibiarkan) → Task 3 ✓ (+ persen*_filter? spec hanya 5 persen umum ✓); §6 TemplateManager + contekan sisip kursor + LaporanCard dropdown/preview/salin + slot AbsensiSheet ✓ Task 6/7; §7 error handling (404/403/400, toast, fallback salin) ✓ Task 5/6/7; §8 testing/rollout ✓ Task 3 (tsx) + Task 8; §9 non-goals dihormati (tanpa unduh/agregat) ✓.
2. **Placeholder scan:** tidak ada TBD/TODO/"nanti"/"cek dulu"; instruksi `Textarea ref` dan `toast` sudah berupa kode/keputusan final.
3. **Type consistency:** `KegiatanTemplateItem.updatedAt: string` (ISO) konsisten di helper/API JSON/komponen; `SesiAbsensiData.totalSesi: number` ditambah Task 4 dipakai Task 7; `LaporanPeserta` struktural kompatibel dengan `SesiPesertaAbsensi` (kelebihan field `kelasNama` dkk diabaikan secara struktural) ✓.
