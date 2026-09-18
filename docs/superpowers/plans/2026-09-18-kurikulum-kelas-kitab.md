# Kurikulum Kelas–Kitab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memetakan tiap kitab ke satu kelas sebagai materi jenjang, menampilkan kartu "Syarat naik kelas" per santri, dan laporan 100 halaman paling kosong per materi kelas.

**Architecture:** Tambah `kelas.urutan`, `kelas.bebas_syarat`, `kitab.kelas_id` (nullable FK); agregasi dihitung server-side di helper baru `src/lib/kenaikan.ts` mengikuti pola `santri-progress.ts`/`admin-stats.ts`; UI reuse `Card`/`Badge`/`Dialog`/`<details>` yang sudah ada. Tanpa tabel snapshot, tanpa API JSON baru untuk laporan.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle ORM + PostgreSQL, zod, Tailwind 4, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-18-kurikulum-kelas-kitab-design.md`

## Global Constraints

- Kode & komentar Bahasa Inggris; semua teks UI Bahasa Indonesia.
- Database `snake_case`; PK UUID; semua tabel punya `created_at`/`updated_at`.
- Sebelum setiap commit: `npm run lint` lalu `npm run build` hijau.
- Commit kecil & sering, satu perubahan logis per commit.
- Next.js 16: baca panduan di `node_modules/next/dist/docs/` sebelum menulis kode App Router; route proteksi bernama `src/proxy.ts`, bukan `middleware.ts`.
- Client component hanya boleh impor dari `@/lib/roles` (dan `auth-client`), TIDAK dari `@/lib/permissions` (akan menyeret `postgres` ke bundle client).
- Setiap API handler wajib `requireApiRole` — jangan pernah percaya proxy saja.
- `pencapaian` = nilai terakhir saja, tulis via UPSERT; halaman belum dinilai = tidak ada baris (bukan 0).
- Repo belum punya test runner: verifikasi via skrip `tsx` sementara (read-only, hapus setelah dipakai) + `lint` + `build` + uji manual, pola Fase 7.

---

## File map

| File | Peran |
|---|---|
| `src/db/schema.ts` (modify) | Kolom `urutan`, `bebas_syarat` di `kelas`; `kelas_id` di `kitab`; relasi dua arah |
| `src/lib/validations.ts` (modify) | `urutan`/`bebas_syarat` di skema kelas; `kelasId` di skema kitab |
| `src/app/api/kelas/route.ts` (modify) | GET urut `urutan` + field baru; POST terima field baru |
| `src/app/api/kelas/[id]/route.ts` (modify) | PATCH field baru; DELETE tolak bila masih dipetakan kitab |
| `src/app/api/kitab/route.ts` (modify) | GET + POST `kelas_id` (cek 404) |
| `src/app/api/kitab/[id]/route.ts` (modify) | GET + PATCH `kelas_id` (cek 404, boleh null) |
| `src/lib/kenaikan.ts` (create) | `KenaikanStatus`, `LubangKelas`, `getKenaikanStatus`, `getLubangReport` |
| `src/app/admin/kelas/page.tsx` (modify) | Ambil + teruskan `urutan`, `bebasSyarat` |
| `src/components/admin/kelas-manager.tsx` (modify) | Form + kartu: Urutan & checkbox Lulus |
| `src/app/admin/kitab/page.tsx` (modify) | Ambil + teruskan `kelasId` dan daftar kelas |
| `src/components/admin/kitab-manager.tsx` (modify) | Dropdown Kelas + badge kelas di kartu |
| `src/components/shared/kenaikan-card.tsx` (create) | Kartu "Syarat naik kelas" (server, presentational) |
| `src/app/admin/santri/[id]/pencapaian/page.tsx` (modify) | Render `KenaikanCard` di atas detail |
| `src/app/ustadz/santri/[id]/pencapaian/page.tsx` (modify) | Sama, mode edit |
| `src/app/wali/santri/[id]/pencapaian/page.tsx` (modify) | Sama, mode read (setelah ownership check) |
| `src/components/shared/lubang-report.tsx` (create) | Blok per materi kelas, top 100 (server, presentational) |
| `src/app/admin/dashboard/page.tsx` (modify) | Seksi "Halaman paling kosong" di bawah grid |
| `src/app/ustadz/laporan/page.tsx` (create) | Halaman laporan lubang ustadz |
| `src/components/shared/role-nav.tsx` (modify) | Nav ustadz + "Laporan"; branch `grid-cols-5` mobile |
| `docs/SCHEMA.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/IMPLEMENTATION.md` (modify) | Selaraskan docs |

---

### Task 1: Skema + migrasi

**Files:**
- Modify: `src/db/schema.ts`
- Test: skrip tsx sementara `scripts/verify-kurikulum-schema.ts` (hapus setelah dipakai)

**Interfaces:**
- Consumes: tabel `kelas`, `kitab` existing.
- Produces: `kelas.urutan: number`, `kelas.bebasSyarat: boolean`, `kitab.kelasId: string | null`; relasi `kelas.kitab`, `kitab.kelas` untuk relational query.

- [ ] **Step 1: Tambah kolom + relasi di `src/db/schema.ts`**

Ganti definisi `kelas` (tambah 2 kolom setelah `deskripsi`):

```ts
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
```

Ganti definisi `kitab` (tambah `kelasId` setelah `status`):

```ts
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
```

Perluas relasi (ganti `kelasRelations` dan `kitabRelations` yang ada):

```ts
export const kelasRelations = relations(kelas, ({ many }) => ({
  santri: many(santri),
  kitab: many(kitab),
}));
```

```ts
export const kitabRelations = relations(kitab, ({ one, many }) => ({
  kelas: one(kelas, {
    fields: [kitab.kelasId],
    references: [kelas.id],
  }),
  halaman: many(halaman),
}));
```

- [ ] **Step 2: Migrasi dev**

Run: `npm run db:push`
Expected: sukses; kolom `urutan`/`bebas_syarat` terisi default (0/false), `kelas_id` NULL di semua baris kitab.

- [ ] **Step 3: Verifikasi kolom via skrip sementara**

```ts
// scripts/verify-kurikulum-schema.ts
import { db } from "@/db";
import { sql } from "drizzle-orm";

const rows = await db.execute(sql`
  SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_name IN ('kelas', 'kitab')
    AND column_name IN ('urutan', 'bebas_syarat', 'kelas_id')
  ORDER BY table_name, column_name
`);
console.log(rows);
process.exit(0);
```

Run: `npx tsx --env-file=.env.local scripts/verify-kurikulum-schema.ts`
Expected: 3 baris (`kelas.urutan` integer default 0, `kelas.bebas_syarat` boolean default false, `kitab.kelas_id` uuid default NULL). Lalu hapus file: `rm scripts/verify-kurikulum-schema.ts`.

- [ ] **Step 4: Lint + build + commit**

Run: `npm run lint` lalu `npm run build`
Expected: keduanya hijau.

```bash
git add src/db/schema.ts
git commit -m "feat(db): kelas urutan/bebas-syarat + kitab kelas_id"
```

---

### Task 2: Validasi zod

**Files:**
- Modify: `src/lib/validations.ts`

**Interfaces:**
- Consumes: tidak ada.
- Produces: `kelasInputSchema` (+`urutan?`, +`bebasSyarat?`); `kitabCreateSchema`/`kitabUpdateSchema` (+`kelasId?` nullable) — dipakai Task 3 & 4.

- [ ] **Step 1: Perluas skema kelas dan kitab**

Tambahkan helper di atas blok `// --- Kelas ---`:

```ts
const urutanSchema = z.coerce
  .number("Urutan harus angka.")
  .int("Urutan harus bilangan bulat.")
  .min(0, "Urutan minimal 0.")
  .optional();
```

Ganti `kelasInputSchema` menjadi:

```ts
export const kelasInputSchema = z.object({
  namaKelas: z.string().trim().min(1, "Nama kelas wajib diisi."),
  deskripsi: deskripsiOptional,
  urutan: urutanSchema,
  bebasSyarat: z.boolean().optional(),
});
```

Tambahkan ke `kitabCreateSchema` dan `kitabUpdateSchema` (keduanya, sebagai field opsional):

```ts
kelasId: z.string().uuid("Kelas tidak valid.").nullable().optional(),
```

- [ ] **Step 2: Cek tipe via lint + build**

Run: `npm run lint` lalu `npm run build`
Expected: hijau (belum ada pemakai baru — perubahan murni aditif).

- [ ] **Step 3: Commit**

```bash
git add src/lib/validations.ts
git commit -m "feat(validation): urutan/bebas-syarat kelas + kelasId kitab"
```

---

### Task 3: API kelas

**Files:**
- Modify: `src/app/api/kelas/route.ts`, `src/app/api/kelas/[id]/route.ts`

**Interfaces:**
- Consumes: `kelasInputSchema` (Task 2), tabel `kelas`, `kitab`, `santri`.
- Produces: GET list `{id, namaKelas, deskripsi, urutan, bebasSyarat, jumlahSantri}` urut `urutan` lalu nama; POST/PATCH terima `urutan`/`bebasSyarat`; DELETE 400 bila masih ada santri ATAU kitab.

- [ ] **Step 1: Update `src/app/api/kelas/route.ts`**

Ganti query GET dan mapping respons:

```ts
const rows = await db.query.kelas.findMany({
  orderBy: (k, { asc }) => [asc(k.urutan), asc(k.namaKelas)],
  with: { santri: { columns: { id: true } } },
});
return NextResponse.json(
  rows.map((r) => ({
    id: r.id,
    namaKelas: r.namaKelas,
    deskripsi: r.deskripsi,
    urutan: r.urutan,
    bebasSyarat: r.bebasSyarat,
    jumlahSantri: r.santri.length,
  })),
);
```

Ganti destructure + insert POST:

```ts
const { namaKelas, deskripsi, urutan, bebasSyarat } = parsed.data;
const [created] = await db
  .insert(kelas)
  .values({
    namaKelas,
    deskripsi: deskripsi || null,
    urutan: urutan ?? 0,
    bebasSyarat: bebasSyarat ?? false,
  })
  .returning();
```

- [ ] **Step 2: Update `src/app/api/kelas/[id]/route.ts`**

Ganti destructure + update PATCH:

```ts
const { namaKelas, deskripsi, urutan, bebasSyarat } = parsed.data;
const [updated] = await db
  .update(kelas)
  .set({
    namaKelas,
    deskripsi: deskripsi || null,
    ...(urutan !== undefined ? { urutan } : {}),
    ...(bebasSyarat !== undefined ? { bebasSyarat } : {}),
  })
  .where(eq(kelas.id, id))
  .returning();
```

Tambahkan import `kitab` dan `count` (`import { count, eq } from "drizzle-orm";`), lalu di DELETE setelah cek santri tambahkan cek kitab sebelum `db.delete`:

```ts
const [{ value: jumlahKitab }] = await db
  .select({ value: count() })
  .from(kitab)
  .where(eq(kitab.kelasId, id));
if (jumlahKitab > 0) {
  return NextResponse.json(
    { error: `Kelas masih dipakai ${jumlahKitab} kitab. Pindahkan kitab dulu.` },
    { status: 400 },
  );
}
```

- [ ] **Step 3: Uji manual via curl (butuh cookie admin)**

Run: login sebagai admin, lalu `GET /api/kelas` → tiap item punya `urutan` (number) dan `bebasSyarat` (boolean); `PATCH /api/kelas/<id>` dengan `{"namaKelas":"<nama>","urutan":2}` → 200 dan tersimpan; `DELETE` kelas yang dipetakan kitab (setelah Task 4 diuji manual) → 400 "masih dipakai".
Expected: respons sesuai; non-admin → 403 (pola existing `requireApiRole` tidak diubah).

- [ ] **Step 4: Lint + build + commit**

Run: `npm run lint` lalu `npm run build`
Expected: hijau.

```bash
git add src/app/api/kelas/route.ts "src/app/api/kelas/[id]/route.ts"
git commit -m "feat(api): kelas urutan/bebas-syarat + tolak hapus bila dipetakan"
```

---

### Task 4: API kitab (`kelas_id`)

**Files:**
- Modify: `src/app/api/kitab/route.ts`, `src/app/api/kitab/[id]/route.ts`

**Interfaces:**
- Consumes: `kitabCreateSchema`/`kitabUpdateSchema` (Task 2).
- Produces: respons kitab memuat `kelasId: string | null`; tulis `kelas_id` dengan cek keberadaan kelas (non-null yang tidak ada → 404 "Kelas tidak ditemukan.").

- [ ] **Step 1: Update `src/app/api/kitab/route.ts`**

Tambahkan `kelasId: true` ke `columns` di GET. Di POST, setelah parse dan sebelum transaksi, tambahkan guard:

```ts
const { namaKitab, jumlahHalaman, deskripsi, status, kelasId } = parsed.data;

if (kelasId) {
  const [kelasRow] = await db
    .select({ id: kelas.id })
    .from(kelas)
    .where(eq(kelas.id, kelasId))
    .limit(1);
  if (!kelasRow) {
    return NextResponse.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
  }
}
```

Tambahkan `kelasId: kelasId ?? null` ke `values` insert, dan import `kelas` dari `@/db/schema` plus `eq` dari `drizzle-orm`.

- [ ] **Step 2: Update `src/app/api/kitab/[id]/route.ts`**

Tambahkan `kelasId: true` ke `columns` di `findKitab`. Di PATCH, setelah cek `existing`, tambahkan guard yang sama untuk `parsed.data.kelasId` (hanya bila non-null non-undefined), lalu tambahkan ke objek `set`:

```ts
...(kelasId !== undefined ? { kelasId } : {}),
```

dengan destructure `const { namaKelas, jumlahHalaman, deskripsi, status, kelasId } = parsed.data;`. `kelasId: null` eksplisit = lepas pemetaan ("Tanpa kelas").

- [ ] **Step 3: Uji manual via curl (cookie admin)**

Run: `POST /api/kitab` dengan `kelasId` valid → 201 dan `kelasId` tersimpan; dengan UUID asal → 404 "Kelas tidak ditemukan."; `PATCH /api/kitab/<id>` `{"kelasId": null}` → 200, pemetaan terlepas.
Expected: sesuai; halaman auto-generate tidak tersentuh (logika existing tidak diubah).

- [ ] **Step 4: Lint + build + commit**

Run: `npm run lint` lalu `npm run build`
Expected: hijau.

```bash
git add src/app/api/kitab/route.ts "src/app/api/kitab/[id]/route.ts"
git commit -m "feat(api): kitab kelas_id mapping + lepas pemetaan"
```

---

### Task 5: Helper kenaikan per santri

**Files:**
- Create: `src/lib/kenaikan.ts`
- Test: skrip tsx sementara `scripts/verify-kenaikan.ts` (hapus setelah dipakai)

**Interfaces:**
- Consumes: `getSantriProgressData` dari `@/lib/santri-progress`; tabel `kelas`, `kitab` via `db`.
- Produces (dipakai Task 8 dan Task 6):
  - `KenaikanHalamanBelum { nomorHalaman: number; persentase: number | null }`
  - `KenaikanKitabKurang { kitabId: string; namaKitab: string; kelasNama: string; kurangHalaman: number; totalHalaman: number; halamanBelum: KenaikanHalamanBelum[] }`
  - `KenaikanStatus { santriId: string; kelasNama: string | null; status: "siap" | "kurang" | "lulus" | "bebas" | "tanpa-kelas"; kelasBerikutNama: string | null; kurangKitab: number; kurangHalaman: number; kitabBelum: KenaikanKitabKurang[] }`
  - `getKenaikanStatus(santriId: string): Promise<KenaikanStatus | null>`

- [ ] **Step 1: Tulis `src/lib/kenaikan.ts` — tipe + `getKenaikanStatus`**

```ts
/**
 * Kenaikan helpers: which kitab/halaman a santri still owes before moving
 * up, and which pages are emptiest per curriculum kelas. Aggregates are
 * computed server-side on each page load (same pattern as santri-progress
 * and admin-stats). Khatam is strict: a page counts only at persentase 100.
 */

export interface KenaikanHalamanBelum {
  nomorHalaman: number;
  /** null = not yet graded. */
  persentase: number | null;
}

export interface KenaikanKitabKurang {
  kitabId: string;
  namaKitab: string;
  kelasNama: string;
  kurangHalaman: number;
  totalHalaman: number;
  halamanBelum: KenaikanHalamanBelum[];
}

export type KenaikanState = "siap" | "kurang" | "lulus" | "bebas" | "tanpa-kelas";

export interface KenaikanStatus {
  santriId: string;
  kelasNama: string | null;
  status: KenaikanState;
  /** Next kelas by urutan, null when terminal / exempt / classless. */
  kelasBerikutNama: string | null;
  kurangKitab: number;
  kurangHalaman: number;
  /** Only uncompleted kitab in cumulative scope, ordered by kelas urutan then name. */
  kitabBelum: KenaikanKitabKurang[];
}
```

Lalu fungsi (import `db`, `kelas`, `kitab` dari `@/db/schema`, dan `getSantriProgressData` dari `./santri-progress`):

```ts
export async function getKenaikanStatus(santriId: string): Promise<KenaikanStatus | null> {
  const data = await getSantriProgressData(santriId);
  if (!data) return null;

  const kelasRows = await db.query.kelas.findMany({
    columns: { id: true, namaKelas: true, urutan: true, bebasSyarat: true },
    orderBy: (k, { asc }) => [asc(k.urutan), asc(k.namaKelas)],
  });
  const kitabRows = await db.query.kitab.findMany({
    columns: { id: true, status: true, kelasId: true },
  });

  const santriKelas = kelasRows.find((k) => k.namaKelas === data.kelasNama) ?? null;
  const kosong: KenaikanStatus = {
    santriId,
    kelasNama: data.kelasNama,
    status: "tanpa-kelas",
    kelasBerikutNama: null,
    kurangKitab: 0,
    kurangHalaman: 0,
    kitabBelum: [],
  };
  if (!santriKelas) return kosong;
  if (santriKelas.bebasSyarat) return { ...kosong, kelasNama: santriKelas.namaKelas, status: "bebas" };

  const berikut = kelasRows.find((k) => k.urutan > santriKelas.urutan) ?? null;
  const kelasBerikutNama = berikut ? berikut.namaKelas : null;

  // Cumulative scope: active kitab whose kelas.urutan <= U, excluding kitab
  // owned by exempt (bebas) kelas and unmapped kitab.
  const urutanByKelas = new Map(kelasRows.map((k) => [k.id, k]));
  const scopeKitabIds = new Set(
    kitabRows
      .filter((kb) => {
        if (kb.status !== "aktif" || !kb.kelasId) return false;
        const pemilik = urutanByKelas.get(kb.kelasId);
        if (!pemilik || pemilik.bebasSyarat) return false;
        return pemilik.urutan <= santriKelas.urutan;
      })
      .map((kb) => kb.id),
  );

  const namaKelasByKitab = new Map<string, { nama: string; urutan: number }>();
  for (const kb of kitabRows) {
    if (!kb.kelasId) continue;
    const pemilik = urutanByKelas.get(kb.kelasId);
    if (pemilik) namaKelasByKitab.set(kb.id, { nama: pemilik.namaKelas, urutan: pemilik.urutan });
  }

  const kitabBelum: KenaikanKitabKurang[] = [];
  for (const k of data.kitab) {
    if (!scopeKitabIds.has(k.kitabId)) continue;
    const halamanBelum = k.halaman
      .filter((h) => h.persentase !== 100)
      .map((h) => ({ nomorHalaman: h.nomorHalaman, persentase: h.persentase }))
      .sort((a, b) => a.nomorHalaman - b.nomorHalaman);
    if (halamanBelum.length === 0) continue;
    const pemilik = namaKelasByKitab.get(k.kitabId)!;
    kitabBelum.push({
      kitabId: k.kitabId,
      namaKitab: k.namaKitab,
      kelasNama: pemilik.nama,
      kurangHalaman: halamanBelum.length,
      totalHalaman: k.jumlahHalaman,
      halamanBelum,
    });
  }
  kitabBelum.sort((a, b) =>
    namaKelasByKitab.get(a.kitabId)!.urutan !== namaKelasByKitab.get(b.kitabId)!.urutan
      ? namaKelasByKitab.get(a.kitabId)!.urutan - namaKelasByKitab.get(b.kitabId)!.urutan
      : a.namaKitab.localeCompare(b.namaKitab, "id"),
  );

  const kurangHalaman = kitabBelum.reduce((s, k) => s + k.kurangHalaman, 0);
  if (kitabBelum.length === 0) {
    return {
      santriId,
      kelasNama: santriKelas.namaKelas,
      status: berikut ? "siap" : "lulus",
      kelasBerikutNama,
      kurangKitab: 0,
      kurangHalaman: 0,
      kitabBelum: [],
    };
  }
  return {
    santriId,
    kelasNama: santriKelas.namaKelas,
    status: "kurang",
    kelasBerikutNama,
    kurangKitab: kitabBelum.length,
    kurangHalaman,
    kitabBelum,
  };
}
```

CATATAN untuk executor: `getSantriProgressData` mengembalikan `kelasNama` (bukan `kelasId`), jadi lookup kelas dilakukan via `namaKelas`. Bila dua kelas bernama sama, ambil yang pertama — nama kelas diasumsikan unik secara praktis (tidak ada constraint DB; jangan tambah constraint di task ini).

- [ ] **Step 2: Verifikasi read-only via skrip sementara**

Setup manual dulu via UI admin (DB dev): beri 2 kelas urutan (mis. A=1, B=2), petakan 1 kitab ke A. Lalu:

```ts
// scripts/verify-kenaikan.ts
import { getKenaikanStatus } from "@/lib/kenaikan";
import { db } from "@/db";
import { santri } from "@/db/schema";

const [s] = await db.select({ id: santri.id }).from(santri).limit(1);
const status = await getKenaikanStatus(s!.id);
console.log(JSON.stringify(status, null, 2));
if (!status || !["siap", "kurang", "lulus", "bebas", "tanpa-kelas"].includes(status.status)) {
  throw new Error("Status kenaikan tidak valid.");
}
process.exit(0);
```

Run: `npx tsx --env-file=.env.local scripts/verify-kenaikan.ts`
Expected: JSON status valid (kemungkinan `kurang` bila kitab belum 100%). Lalu `rm scripts/verify-kenaikan.ts`.

- [ ] **Step 3: Lint + build + commit**

Run: `npm run lint` lalu `npm run build`
Expected: hijau.

```bash
git add src/lib/kenaikan.ts
git commit -m "feat(kurikulum): getKenaikanStatus sisa khatam per santri"
```

---

### Task 6: Helper laporan lubang

**Files:**
- Modify: `src/lib/kenaikan.ts` (tambah di bawah Task 5)
- Test: skrip tsx sementara `scripts/verify-lubang.ts` (hapus setelah dipakai)

**Interfaces:**
- Consumes: tipe dari Task 5 (file yang sama); tabel `santri`, `kitab`, `halaman`, `kelas`, `pencapaian`.
- Produces (dipakai Task 9):
  - `LubangHalaman { kitabId: string; namaKitab: string; nomorHalaman: number; khatamCount: number; totalSantri: number; persenKhatam: number }`
  - `LubangKelas { kelasId: string; namaKelas: string; urutan: number; halaman: LubangHalaman[] }`
  - `getLubangReport(): Promise<LubangKelas[]>`

- [ ] **Step 1: Tambah tipe + `getLubangReport` di `src/lib/kenaikan.ts`**

```ts
export interface LubangHalaman {
  kitabId: string;
  namaKitab: string;
  nomorHalaman: number;
  /** Santri (denominator) dengan nilai 100 di halaman ini. */
  khatamCount: number;
  totalSantri: number;
  /** Math.round(khatamCount / totalSantri * 100), 0 bila penyebut 0. */
  persenKhatam: number;
}

export interface LubangKelas {
  kelasId: string;
  namaKelas: string;
  urutan: number;
  /** Top 100 halaman paling kosong milik kitab kelas ini. */
  halaman: LubangHalaman[];
}
```

_Draf dua-query dihapus — implementasi final tepat di bawah._

```ts
export async function getLubangReport(): Promise<LubangKelas[]> {
  const { inArray } = await import("drizzle-orm");

  const kelasRows = await db.query.kelas.findMany({
    columns: { id: true, namaKelas: true, urutan: true, bebasSyarat: true },
    orderBy: (k, { asc }) => [asc(k.urutan), asc(k.namaKelas)],
  });
  const bebasIds = new Set(kelasRows.filter((k) => k.bebasSyarat).map((k) => k.id));
  const santriRows = await db.query.santri.findMany({
    where: (s, { eq }) => eq(s.statusAktif, true),
    columns: { id: true, kelasId: true },
  });
  const denomIds = new Set(
    santriRows.filter((s) => !s.kelasId || !bebasIds.has(s.kelasId)).map((s) => s.id),
  );

  const kitabRows = await db.query.kitab.findMany({
    columns: { id: true, namaKitab: true, status: true, kelasId: true },
  });
  const pemilikByKitab = new Map<string, (typeof kelasRows)[number]>();
  for (const kb of kitabRows) {
    if (kb.status !== "aktif" || !kb.kelasId) continue;
    const pemilik = kelasRows.find((k) => k.id === kb.kelasId);
    if (pemilik && !pemilik.bebasSyarat) pemilikByKitab.set(kb.id, pemilik);
  }
  const namaKitabById = new Map(kitabRows.map((k) => [k.id, k.namaKitab]));

  const halamanRows =
    pemilikByKitab.size > 0
      ? await db.query.halaman.findMany({
          where: (h, { inArray }) => inArray(h.kitabId, [...pemilikByKitab.keys()]),
          columns: { id: true, kitabId: true, nomorHalaman: true },
        })
      : [];

  const khatamByHalaman = new Map<string, number>();
  if (halamanRows.length > 0 && denomIds.size > 0) {
    const nilai = await db
      .select({
        halamanId: pencapaian.halamanId,
        santriId: pencapaian.santriId,
        persentase: pencapaian.persentase,
      })
      .from(pencapaian)
      .where(
        inArray(
          pencapaian.halamanId,
          halamanRows.map((h) => h.id),
        ),
      );
    for (const n of nilai) {
      if (n.persentase === 100 && denomIds.has(n.santriId)) {
        khatamByHalaman.set(n.halamanId, (khatamByHalaman.get(n.halamanId) ?? 0) + 1);
      }
    }
  }

  const totalSantri = denomIds.size;
  const byKelas = new Map<string, LubangHalaman[]>();
  for (const h of halamanRows) {
    const pemilik = pemilikByKitab.get(h.kitabId)!;
    const khatamCount = khatamByHalaman.get(h.id) ?? 0;
    const list = byKelas.get(pemilik.id) ?? [];
    list.push({
      kitabId: h.kitabId,
      namaKitab: namaKitabById.get(h.kitabId) ?? "?",
      nomorHalaman: h.nomorHalaman,
      khatamCount,
      totalSantri,
      persenKhatam: totalSantri > 0 ? Math.round((khatamCount / totalSantri) * 100) : 0,
    });
    byKelas.set(pemilik.id, list);
  }

  return kelasRows
    .filter((k) => byKelas.has(k.id))
    .map((k) => ({
      kelasId: k.id,
      namaKelas: k.namaKelas,
      urutan: k.urutan,
      halaman: byKelas
        .get(k.id)!
        .sort(
          (a, b) =>
            a.persenKhatam - b.persenKhatam ||
            a.namaKitab.localeCompare(b.namaKitab, "id") ||
            a.nomorHalaman - b.nomorHalaman,
        )
        .slice(0, 100),
    }));
}
```

Tambahkan import statis di atas file (bukan dynamic import): `import { inArray } from "drizzle-orm";` dan `pencapaian` ke import `@/db/schema` yang sudah ada dari Task 5 (executor: gabungkan import Task 5 + Task 6 — `db`, `kelas`, `kitab`, `pencapaian` dari `@/db/schema`; `inArray` dari `drizzle-orm`; `getSantriProgressData` dari `./santri-progress`).

- [ ] **Step 2: Verifikasi read-only**

```ts
// scripts/verify-lubang.ts
import { getLubangReport } from "@/lib/kenaikan";

const report = await getLubangReport();
for (const blok of report) {
  if (blok.halaman.length > 100) throw new Error(`Blok ${blok.namaKelas} lebih dari 100.`);
  for (let i = 1; i < blok.halaman.length; i++) {
    if (blok.halaman[i]!.persenKhatam < blok.halaman[i - 1]!.persenKhatam) {
      throw new Error(`Urutan blok ${blok.namaKelas} tidak menaik.`);
    }
  }
}
console.log(`OK: ${report.length} blok materi.`);
process.exit(0);
```

Run: `npx tsx --env-file=.env.local scripts/verify-lubang.ts`
Expected: `OK: N blok materi.` Lalu `rm scripts/verify-lubang.ts`.

- [ ] **Step 3: Lint + build + commit**

Run: `npm run lint` lalu `npm run build`
Expected: hijau.

```bash
git add src/lib/kenaikan.ts
git commit -m "feat(kurikulum): getLubangReport top-100 per materi kelas"
```

---

### Task 7: UI admin pemetaan (kelas + kitab manager)

**Files:**
- Modify: `src/app/admin/kelas/page.tsx`, `src/components/admin/kelas-manager.tsx`, `src/app/admin/kitab/page.tsx`, `src/components/admin/kitab-manager.tsx`

**Interfaces:**
- Consumes: API Task 3 & 4 (GET memuat field baru).
- Produces: admin bisa atur `urutan`/`bebasSyarat` dan `kelas_id` dari UI; `KelasItem`/`KitabItem` bertambah (`urutan`, `bebasSyarat`, `kelasId`, `kelasNama`).

- [ ] **Step 1: `src/app/admin/kelas/page.tsx` — teruskan field baru**

Ganti mapping `initialKelas`:

```ts
const initialKelas: KelasItem[] = rows.map((r) => ({
  id: r.id,
  namaKelas: r.namaKelas,
  deskripsi: r.deskripsi,
  urutan: r.urutan,
  bebasSyarat: r.bebasSyarat,
  jumlahSantri: r.santri.length,
}));
```

(`columns` default relational query sudah memuat semua kolom — tidak perlu daftar eksplisit.)

- [ ] **Step 2: `src/components/admin/kelas-manager.tsx` — form + kartu**

  - Extend `KelasItem`: `urutan: number; bebasSyarat: boolean;`.
  - Extend `KelasForm`: `urutan: string; bebasSyarat: boolean;`; `emptyForm = { namaKelas: "", deskripsi: "", urutan: "0", bebasSyarat: false };`.
  - `openEdit`: `setForm({ namaKelas: item.namaKelas, deskripsi: item.deskripsi ?? "", urutan: String(item.urutan), bebasSyarat: item.bebasSyarat });`.
  - `handleSave` payload tambah: `urutan: Number(form.urutan), bebasSyarat: form.bebasSyarat`.
  - Di `<form id="form-kelas">` setelah Deskripsi tambahkan:

```tsx
<Field label="Urutan Jenjang" htmlFor="urutan-kelas">
  <Input
    id="urutan-kelas"
    type="number"
    min={0}
    step={1}
    value={form.urutan}
    onChange={(e) => setForm((f) => ({ ...f, urutan: e.target.value }))}
    placeholder="mis. 1 untuk kelas A"
  />
</Field>

<label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-ink">
  <input
    type="checkbox"
    className="h-5 w-5 accent-[#0E6B4F]"
    checked={form.bebasSyarat}
    onChange={(e) => setForm((f) => ({ ...f, bebasSyarat: e.target.checked }))}
  />
  Kelas lulus (bebas syarat khatam, mis. Lulus Pra-nikah)
</label>
```

  - Di kartu list, di bawah jumlah santri tambahkan:

```tsx
<p className="text-sm text-ink-secondary">
  Urutan {item.urutan}
  {item.bebasSyarat ? " • Bebas syarat" : ""}
</p>
```

  - Ubah subjudul halaman menjadi: `Kelas / angkatan santri sekaligus jenjang materi kitab. Atur urutan menaik (A=1, B=2, ...) dan tandai kelas lulus bila perlu.`

- [ ] **Step 3: `src/app/admin/kitab/page.tsx` — teruskan `kelasId` + daftar kelas**

```tsx
import { db } from "@/db";
import { requireRole } from "@/lib/permissions";
import KitabManager, { type KitabItem } from "@/components/admin/kitab-manager";

export const metadata = {
  title: "Kelola Kitab | e-Santri",
};

export interface KelasOption {
  id: string;
  namaKelas: string;
  urutan: number;
}

/**
 * Kitab admin page (tasks 4.5–4.6). Server component: guard role, query the
 * DB directly, then hand the (JSON-serializable) list to the client manager.
 */
export default async function AdminKitabPage() {
  await requireRole(["admin"]);

  const [kitabRows, kelasRows] = await Promise.all([
    db.query.kitab.findMany({
      orderBy: (k, { desc }) => [desc(k.createdAt)],
      columns: {
        id: true,
        namaKitab: true,
        jumlahHalaman: true,
        deskripsi: true,
        status: true,
        kelasId: true,
      },
      with: { kelas: { columns: { namaKelas: true } } },
    }),
    db.query.kelas.findMany({
      orderBy: (k, { asc }) => [asc(k.urutan), asc(k.namaKelas)],
      columns: { id: true, namaKelas: true, urutan: true },
    }),
  ]);
  const initialKitabs: KitabItem[] = kitabRows.map((r) => ({
    id: r.id,
    namaKitab: r.namaKitab,
    jumlahHalaman: r.jumlahHalaman,
    deskripsi: r.deskripsi,
    status: r.status,
    kelasId: r.kelasId,
    kelasNama: r.kelas?.namaKelas ?? null,
  }));
  const kelasOptions: KelasOption[] = kelasRows.map((k) => ({
    id: k.id,
    namaKelas: k.namaKelas,
    urutan: k.urutan,
  }));

  return <KitabManager initialKitabs={initialKitabs} kelasOptions={kelasOptions} />;
}
```

- [ ] **Step 4: `src/components/admin/kitab-manager.tsx` — dropdown + badge**

  - Extend `KitabItem`: `kelasId: string | null; kelasNama: string | null;`.
  - Props: `export default function KitabManager({ initialKitabs, kelasOptions }: { initialKitabs: KitabItem[]; kelasOptions: { id: string; namaKelas: string; urutan: number }[] })`.
  - Extend `KitabForm`: `kelasId: string;` (`""` = Tanpa kelas); `emptyForm` tambah `kelasId: ""`.
  - `openEdit`: tambah `kelasId: item.kelasId ?? ""`.
  - `refresh()`: `const [kitabs] = await Promise.all([api<KitabItem[]>("/api/kitab")]); setKitabs(kitabs);` — daftar kelas tidak perlu refresh (berubah hanya di halaman kelas).
  - `handleSave` payload tambah: `...(form.kelasId ? { kelasId: form.kelasId } : { kelasId: null })`.
  - Di form setelah Status tambahkan:

```tsx
<Field label="Kelas Materi" htmlFor="kelas-kitab">
  <Select
    id="kelas-kitab"
    value={form.kelasId}
    onChange={(e) => setForm((f) => ({ ...f, kelasId: e.target.value }))}
  >
    <option value="">Tanpa kelas (diabaikan dari syarat)</option>
    {kelasOptions.map((k) => (
      <option key={k.id} value={k.id}>
        {k.namaKelas} (urutan {k.urutan})
      </option>
    ))}
  </Select>
</Field>
```

(Cek `Select` menerima children option — pola ini dipakai form santri; bila `Select` bukan `<select>` native, tiru pola dropdown kelas di `santri-manager.tsx` untuk field ini.)

  - Di kartu list, di samping badge status tambahkan: `{item.kelasNama ? <Badge variant="primary">{item.kelasNama}</Badge> : null}` — cek varian `Badge` yang tersedia di `src/components/ui/badge.tsx`; bila tidak ada `primary`, pakai `success`.

- [ ] **Step 5: Uji manual**

Run: buka `/admin/kelas` → edit urutan + centang lulus → tersimpan + tampil di kartu; buka `/admin/kitab` → petakan kitab ke kelas → badge kelas tampil; lepas ke "Tanpa kelas" → badge hilang.
Expected: toast sukses; refresh API `/api/kelas` & `/api/kitab` cocok dengan tampilan.

- [ ] **Step 6: Lint + build + commit**

Run: `npm run lint` lalu `npm run build`
Expected: hijau.

```bash
git add src/app/admin/kelas/page.tsx src/components/admin/kelas-manager.tsx src/app/admin/kitab/page.tsx src/components/admin/kitab-manager.tsx
git commit -m "feat(admin): atur urutan/lulus kelas + petakan kitab ke kelas"
```

---

### Task 8: Kartu syarat naik di 3 halaman pencapaian

**Files:**
- Create: `src/components/shared/kenaikan-card.tsx`
- Modify: `src/app/admin/santri/[id]/pencapaian/page.tsx`, `src/app/ustadz/santri/[id]/pencapaian/page.tsx`, `src/app/wali/santri/[id]/pencapaian/page.tsx`

**Interfaces:**
- Consumes: `KenaikanStatus` + `getKenaikanStatus` (Task 5).
- Produces: `KenaikanCard({ status })` — server component presentational.

- [ ] **Step 1: Buat `src/components/shared/kenaikan-card.tsx`**

```tsx
import { ChevronDown, GraduationCap } from "lucide-react";
import type { KenaikanStatus } from "@/lib/kenaikan";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function statusText(s: KenaikanStatus): string {
  switch (s.status) {
    case "siap":
      return `Siap naik ke ${s.kelasBerikutNama ?? "kelas berikutnya"}`;
    case "kurang":
      return `Kurang ${s.kurangKitab} kitab, ${s.kurangHalaman} halaman untuk naik ke ${s.kelasBerikutNama ?? "kelas berikutnya"}`;
    case "lulus":
      return "Lulus, tidak ada kelas lanjutan";
    case "bebas":
      return "Bebas syarat (kelas lulus)";
    case "tanpa-kelas":
      return "Belum ditempatkan di kelas";
  }
}

/**
 * "Syarat naik kelas" card: one-line status plus the uncompleted kitab in
 * cumulative scope (expandable to uncompleted pages). Server component,
 * purely presentational; read-only for every role.
 */
export function KenaikanCard({ status }: { status: KenaikanStatus }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <GraduationCap className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-semibold text-ink">Syarat Naik Kelas</h2>
          <p className="text-xs text-ink-secondary">{statusText(status)}</p>
        </div>
      </div>

      {status.kitabBelum.length === 0 ? null : (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {status.kitabBelum.map((k) => (
            <details key={k.kitabId} className="group rounded-xl border border-border bg-background/60">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-3 select-none [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{k.namaKitab}</span>
                    <Badge variant="secondary">{k.kelasNama}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-secondary">
                    Kurang {k.kurangHalaman} dari {k.totalHalaman} halaman
                  </p>
                </div>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-ink-secondary transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <ul className="divide-y divide-border border-t border-border px-3">
                {k.halamanBelum.map((h) => (
                  <li key={h.nomorHalaman} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-sm text-ink">Halaman {h.nomorHalaman}</span>
                    {h.persentase === null ? (
                      <span className="text-xs text-ink-secondary">Belum dinilai</span>
                    ) : (
                      <Badge variant="secondary">{h.persentase}%</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Pasang di 3 halaman pencapaian**

Admin (`src/app/admin/santri/[id]/pencapaian/page.tsx`):

```tsx
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/permissions";
import { getSantriProgressData } from "@/lib/santri-progress";
import { getKenaikanStatus } from "@/lib/kenaikan";
import { SantriProgressDetail } from "@/components/shared/santri-progress-detail";
import { KenaikanCard } from "@/components/shared/kenaikan-card";
import { BackLink } from "@/components/shared/back-link";
```

```tsx
const data = await getSantriProgressData(id);
if (!data) notFound();
const kenaikan = await getKenaikanStatus(id);
```

Render `<KenaikanCard status={kenaikan} />` di atas `<SantriProgressDetail .../>` bila `kenaikan` tidak null (selalu non-null bila data ada — guard untuk type-safety).

Ustadz: perubahan identik di `src/app/ustadz/santri/[id]/pencapaian/page.tsx` (link prefix tetap `/ustadz/santri/${id}/kitab`).

Wali (`src/app/wali/santri/[id]/pencapaian/page.tsx`): ownership check tetap PERTAMA, lalu `getSantriProgressData` + `getKenaikanStatus`, render `<KenaikanCard status={kenaikan} />` di atas `<SantriProgressDetail mode="read" .../>`.

- [ ] **Step 3: Uji manual 3 role**

Run: admin buka santri kelas A → kartu tampil "Kurang N kitab..."; ustadz sama; wali buka anaknya → kartu read-only tampil; wali buka santri lain → tetap 404.
Expected: angka kartu cocok dengan expand kitab (halaman <100%).

- [ ] **Step 4: Lint + build + commit**

Run: `npm run lint` lalu `npm run build`
Expected: hijau.

```bash
git add src/components/shared/kenaikan-card.tsx "src/app/admin/santri/[id]/pencapaian/page.tsx" "src/app/ustadz/santri/[id]/pencapaian/page.tsx" "src/app/wali/santri/[id]/pencapaian/page.tsx"
git commit -m "feat(kurikulum): kartu syarat naik kelas per santri"
```

---

### Task 9: Laporan lubang (dashboard + halaman ustadz + nav)

**Files:**
- Create: `src/components/shared/lubang-report.tsx`, `src/app/ustadz/laporan/page.tsx`
- Modify: `src/app/admin/dashboard/page.tsx`, `src/components/shared/role-nav.tsx`

**Interfaces:**
- Consumes: `LubangKelas[]` + `getLubangReport` (Task 6).
- Produces: `LubangReport({ data })`; route `/ustadz/laporan` (`requireRole(["ustadz"])`); nav ustadz 5 item.

- [ ] **Step 1: Buat `src/components/shared/lubang-report.tsx`**

```tsx
import { TriangleAlert } from "lucide-react";
import type { LubangKelas } from "@/lib/kenaikan";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * "Halaman paling kosong" report: one block per curriculum kelas with its
 * top-100 emptiest pages. Server component, purely presentational.
 */
export function LubangReport({ data }: { data: LubangKelas[] }) {
  if (data.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-ink-secondary">
        Belum ada materi yang dipetakan ke kelas.
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {data.map((blok) => (
        <Card key={blok.kelasId} className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-ink">Materi {blok.namaKelas}</h3>
            <Badge variant="secondary">{blok.halaman.length} halaman</Badge>
          </div>
          {blok.halaman.length === 0 ? (
            <p className="mt-2 text-sm text-ink-secondary">
              Semua materi kelas ini sudah khatam.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {blok.halaman.map((h) => (
                <li key={`${h.kitabId}-${h.nomorHalaman}`} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {h.namaKitab} — Halaman {h.nomorHalaman}
                    </span>
                    <span className="block text-xs text-ink-secondary">
                      {h.khatamCount}/{h.totalSantri} khatam • {h.totalSantri - h.khatamCount} belum
                    </span>
                  </span>
                  <Badge variant={h.persenKhatam >= 75 ? "success" : h.persenKhatam >= 40 ? "warning" : "danger"}>
                    {h.persenKhatam}%
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
```

(Cek impor ikon: `TriangleAlert` adalah nama baru lucide; bila lint/build gagal, ganti ke ikon yang pasti ada — file ini tidak wajib pakai ikon, hapus impor bila ragu. Executor: bila ragu, hapus baris ikon dan pakai tanpa ikon.)

- [ ] **Step 2: Seksi dashboard admin**

Di `src/app/admin/dashboard/page.tsx` tambahkan import `getLubangReport` + `LubangReport`, fetch bersamaan:

```tsx
const [recap, lubang] = await Promise.all([getAdminRecap(), getLubangReport()]);
```

Tambahkan setelah `</div>` penutup grid dua kolom, sebelum `</div>` terakhir:

```tsx
<section className="space-y-4">
  <h2 className="text-lg font-semibold text-ink">Halaman Paling Kosong per Materi Kelas</h2>
  <LubangReport data={lubang} />
</section>
```

- [ ] **Step 3: Halaman ustadz baru `src/app/ustadz/laporan/page.tsx`**

```tsx
import { requireRole } from "@/lib/permissions";
import { getLubangReport } from "@/lib/kenaikan";
import { LubangReport } from "@/components/shared/lubang-report";

export const metadata = {
  title: "Laporan Materi | e-Santri",
};

/** Ustadz lubang report: top-100 emptiest pages per curriculum kelas. */
export default async function UstadzLaporanPage() {
  await requireRole(["ustadz"]);
  const lubang = await getLubangReport();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Laporan Materi</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          100 halaman paling kosong untuk setiap materi kelas.
        </p>
      </div>
      <LubangReport data={lubang} />
    </div>
  );
}
```

- [ ] **Step 4: Nav ustadz + `grid-cols-5`**

Di `src/components/shared/role-nav.tsx`: tambah import `TrendingUp` (sudah dipakai di dashboard — pasti tersedia di versi lucide ini), tambah item ustadz `{ href: "/ustadz/laporan", label: "Laporan", icon: TrendingUp }` setelah Kegiatan (sebelum Riwayat). Perluas branch kolom mobile:

```ts
: items.length === 5
  ? "grid-cols-5"
: items.length === 4
  ? "grid-cols-4"
```

(letakkan SEBELUM branch `=== 4`).

- [ ] **Step 5: Uji manual + guard**

Run: admin dashboard → seksi baru tampil; ustadz `/ustadz/laporan` → 200 + nav "Laporan" aktif; tanpa login → redirect `/login`; wali buka `/ustadz/laporan` → redirect ke home wali (pola `requireRole` existing); mobile 360px → bottom nav 5 item rapi.
Expected: urutan blok ikut `urutan` kelas; tiap blok ≤100 baris.

- [ ] **Step 6: Lint + build + commit**

Run: `npm run lint` lalu `npm run build`
Expected: hijau.

```bash
git add src/components/shared/lubang-report.tsx src/app/ustadz/laporan/page.tsx src/app/admin/dashboard/page.tsx src/components/shared/role-nav.tsx
git commit -m "feat(kurikulum): laporan 100 halaman kosong per materi kelas"
```

---

### Task 10: Docs + verifikasi akhir

**Files:**
- Modify: `docs/SCHEMA.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/IMPLEMENTATION.md`

**Interfaces:**
- Consumes: semua task di atas.
- Produces: docs selaras + checklist fase baru dicentang.

- [ ] **Step 1: `docs/SCHEMA.md`**

  - Tabel `kelas`: tambah baris `| urutan | integer, default 0 | urutan jenjang (A=1, B=2, ...) |` dan `| bebas_syarat | boolean, default false | kelas lulus: bebas kewajiban khatam |`.
  - Tabel `kitab`: tambah baris `| kelas_id | uuid, FK → kelas.id, nullable | pemilik materi; null = belum dipetakan, diabaikan |`.
  - Diagram relasi: ubah `santri >── kelas` menjadi `santri >── kelas <── kitab` (kitab menunjuk ke kelas).

- [ ] **Step 2: `docs/ARCHITECTURE.md`**

  - §3 struktur folder: ustadz tambah `/laporan → 100 halaman paling kosong per materi kelas`; admin dashboard tambah seksi lubang; `/lib` tambah `kenaikan.ts → getKenaikanStatus + getLubangReport (shared API + pages)`; `/components/shared` tambah `KenaikanCard, LubangReport`.
  - §4 skema ringkas: `kelas (..., urutan, bebas_syarat)` dan `kitab (..., kelas_id → kelas.id, nullable)`.
  - §4 catatan implementasi: tambah 2 bullet — (a) syarat naik kumulatif + khatam strict 100% dihitung on-the-fly (tanpa snapshot); kitab null/nonaktif/milik kelas lulus dikecualikan; (b) hapus kelas yang masih dipetakan kitab ditolak 400.

- [ ] **Step 3: `docs/DESIGN.md`**

  - §4 Ustadz: bottom nav menjadi Input Nilai, Santri, Kegiatan, Laporan, Riwayat; tambah bullet halaman Laporan (blok per materi kelas + top-100 + empty state).
  - §4 Admin & Ustadz & Wali: tambah bullet kartu "Syarat Naik Kelas" di halaman pencapaian santri (status satu baris + expand kitab/halaman belum khatam; wali read-only).

- [ ] **Step 4: `docs/IMPLEMENTATION.md`**

  - Progress Tracker: tambah `- [x] **Fase 13 — Kurikulum Kelas–Kitab + Laporan Kenaikan & Lubang**`.
  - Tambah seksi `## 10d. Fase 13` berisi task 1–9 plan ini sebagai checklist `[x]` + Definition of Done: (a) admin petakan kitab & atur urutan/lulus; (b) kartu sisa benar di 3 role (kumulatif, strict 100%); (c) top-100 per materi benar + guard wali; (d) lint & build hijau. Perbarui `Terakhir di-update: 2026-09-18`.

- [ ] **Step 5: Verifikasi akhir end-to-end**

  1. Setup data via UI admin: kelas A/urutan 1, B/urutan 2, Lulus/bebas; petakan 2 kitab (satu ke A, satu ke B).
  2. Ustadz nilai 1 santri kelas B: 100% semua halaman kitab A, sebagian kitab B → kartu "Kurang 1 kitab...".
  3. Wali anak tersebut → kartu sama read-only; wali lain → 404.
  4. Dashboard admin + `/ustadz/laporan` → blok A/B tampil, urutan % menaik.
  5. `npm run lint` + `npm run build` hijau.
  Expected: semua lolos; catat deviasi (bila ada) di IMPLEMENTATION Fase 13.

- [ ] **Step 6: Commit docs**

```bash
git add docs/SCHEMA.md docs/ARCHITECTURE.md docs/DESIGN.md docs/IMPLEMENTATION.md
git commit -m "docs(kurikulum): selaraskan skema, arsitektur, desain, implementasi"
```

---

## Self-Review

**1. Spec coverage:** §1 konteks → Task 1 (skema). §2 keputusan (urutan, satu-kitab-satu-kelas, kumulatif, strict 100%, bebas_syarat, nonaktif dikecualikan, tanpa-kelas, penyebut lubang, akses) → Task 1–4 (skema/API), Task 5 (kumulatif/100%/bebas/tanpa-kelas), Task 6 (penyebut/top-100/sort), Task 8–9 (akses per role). §3 arsitektur (helper + tanpa API baru + tolak hapus) → Task 3, 5, 6. §4 data/API → Task 1–4. §5 komponen/UI (kartu + laporan + `/ustadz/laporan`) → Task 7–9. §6 aturan formal → Task 5. §7 error handling → Task 3, 4, 7–9. §8 testing/rollout → Task 10. §9 non-goals → tidak ada task (benar: riwayat kenaikan, auto-naik, ambang parsial, bobot tidak dibangun).

**2. Placeholder scan:** tidak ada TBD/TODO/"nanti"/"dsb". Semua langkah berisi kode aktual, command aktual, dan ekspektasi aktual. Satu titik yang didelegasikan eksplisit dengan instruksi fallback: varian `Badge` dan komponen `Select` (Task 7 Step 4 — executor meniru pola `santri-manager.tsx` bila API berbeda) serta impor ikon `lubang-report` (fallback hapus ikon). Ini titik integrasi yang hanya bisa dipastikan saat eksekusi; fallback-nya konkret.

**3. Type consistency:** `KelasItem` (+`urutan: number`, +`bebasSyarat: boolean`) mengalir page → manager di Task 7. `KitabItem` (+`kelasId: string | null`, +`kelasNama: string | null`) mengalir page → manager di Task 7. `KenaikanStatus`/`KenaikanState`/`LubangKelas`/`LubangHalaman` didefinisikan sekali di Task 5–6 dan dipakai apa adanya di Task 8–9. `getKenaikanStatus` mengembalikan `null` hanya bila santri tidak ada — ketiga halaman memanggilnya setelah `notFound()` guard, dan `KenaikanCard` menerima non-null (guard di page). `getLubangReport` selalu array (kosong bila belum ada pemetaan) — `LubangReport` menangani `[]` via empty state. Import `pencapaian`/`inArray` digabung di Task 6 Step 1 (catatan untuk executor ada).
