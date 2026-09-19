# Pembagian Kitab per Rentang Halaman Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Satu kitab fisik bisa dipetakan ke banyak kelas via rentang halaman (mis. Al-Quran 1-300 → A, 301-600 → B) untuk syarat naik dan laporan lubang.

**Architecture:** Tabel baru `kitab_bagian` + fallback `kitab.kelas_id` bila 0 bagian; scope kenaikan dan lubang berubah dari per-kitab menjadi per-bagian; UI render per-bagian.

**Tech Stack:** Next.js 16.2.12, React 19, Drizzle ORM 0.45.2, Postgres, Zod 4.4.3, tsx verify scripts, eslint + next build.

**Spec:** `docs/superpowers/specs/2026-09-19-kitab-rentang-halaman-design.md`

## Global Constraints

- Bahasa UI dan pesan error Indonesia via pola `toast` existing.
- Khatam strict: halaman khatam bila `persentase == 100`; null / 0–99 = belum.
- Kitab nonaktif dikecualikan dari scope; tetap tampil di detail dengan badge.
- Santri tanpa kelas → status "tanpa-kelas"; kelas `bebas_syarat` → "bebas" + keluar dari penyebut lubang.
- `npm run lint` + `npm run build` harus hijau setiap task.
- Migrasi additive via `npm run db:push` di dev; tidak ada `DELETE` kitab berdata.
- Repo belum punya test runner — verifikasi via skrip tsx sementara read-only lalu hapus, plus lint/build.

---

### Task 1: Skema `kitab_bagian` + relasi + migrasi

**Files:**
- Modify: `src/db/schema.ts`
- Test: `scripts/verify-bagian-schema.ts` (sementara, hapus setelah dipakai)

**Interfaces:**
- Consumes: tabel existing `kitab(id, jumlahHalaman)`, `kelas(id)`.
- Produces: `kitabBagian { id: string; kitabId: string; kelasId: string; halamanDari: number; halamanSampai: number }` + relasi `kitabRelations.kitabBagian`, `kelasRelations.kitabBagian`, `kitabBagianRelations`.

- [ ] **Step 1: Tambah tabel + relasi ke `src/db/schema.ts`**

```ts
export const kitabBagian = pgTable(
  "kitab_bagian",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kitabId: uuid("kitab_id")
      .references(() => kitab.id, { onDelete: "cascade" })
      .notNull(),
    kelasId: uuid("kelas_id")
      .references(() => kelas.id)
      .notNull(),
    halamanDari: integer("halaman_dari").notNull(),
    halamanSampai: integer("halaman_sampai").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_kitab_bagian_kitab_id").on(table.kitabId),
    index("idx_kitab_bagian_kelas_id").on(table.kelasId),
  ],
);
```

Relasi (tambah ke file yang sama):

```ts
export const kitabBagianRelations = relations(kitabBagian, ({ one }) => ({
  kitab: one(kitab, { fields: [kitabBagian.kitabId], references: [kitab.id] }),
  kelas: one(kelas, { fields: [kitabBagian.kelasId], references: [kelas.id] }),
}));
```

Update `kelasRelations` tambah `kitabBagian: many(kitabBagian)`, update `kitabRelations` tambah `kitabBagian: many(kitabBagian)`. `index` sudah diimpor di file ini — jangan tambah impor baru.

- [ ] **Step 2: Tulis skrip verify sementara `scripts/verify-bagian-schema.ts`**

```ts
import { db } from "@/db";
import { kitabBagian } from "@/db/schema";
console.log("kitabBagian columns:", Object.keys(kitabBagian));
const rows = await db.query.kitabBagian.findMany({ limit: 1 });
console.log("OK: kitab_bagian query jalan, rows =", rows.length);
```

- [ ] **Step 3: Jalankan migrasi + verify (gagal dulu sebelum push)**

Run: `npx tsx --env-file=.env.local scripts/verify-bagian-schema.ts`
Expected: FAIL dengan `relation "kitab_bagian" does not exist` (tabel belum di-push).

- [ ] **Step 4: Push migrasi**

Run: `npm run db:push`
Expected: sukses, tabel `kitab_bagian` terbuat.

- [ ] **Step 5: Run verify lagi**

Run: `npx tsx --env-file=.env.local scripts/verify-bagian-schema.ts`
Expected: PASS, log `OK: kitab_bagian query jalan`.

- [ ] **Step 6: Lint + hapus skrip + commit**

Run: `npm run lint`
Expected: hijau.
Run: `rm scripts/verify-bagian-schema.ts`

```bash
git add src/db/schema.ts
git commit -m "feat: tambah tabel kitab_bagian untuk rentang halaman per kelas"
```

---

### Task 2: Validasi + API CRUD bagian per kitab

**Files:**
- Modify: `src/lib/validations.ts`
- Create: `src/app/api/kitab/[id]/bagian/route.ts`
- Create: `src/app/api/kitab/bagian/[bagianId]/route.ts`
- Test: `scripts/verify-bagian-api.ts` (sementara, read-only via fetch langsung ke DB? gunakan skrip DB-level untuk overlap)

**Interfaces:**
- Consumes: `kitabBagian` dari Task 1.
- Produces: `kitabBagianInputSchema { kelasId: string; halamanDari: number; halamanSampai: number }`, `GET /api/kitab/[id]/bagian`, `POST /api/kitab/[id]/bagian`, `PATCH /api/kitab/bagian/[bagianId]`, `DELETE /api/kitab/bagian/[bagianId]`, helper `assertBagianValid(kitabId, dari, sampai, excludeId?)`.

- [ ] **Step 1: Tambah schema ke `src/lib/validations.ts`**

```ts
export const kitabBagianInputSchema = z.object({
  kelasId: z.string().uuid("Kelas tidak valid."),
  halamanDari: z.coerce.number().int("Halaman harus bilangan bulat.").min(1, "Halaman minimal 1."),
  halamanSampai: z.coerce.number().int("Halaman harus bilangan bulat.").min(1, "Halaman minimal 1."),
}).refine((d) => d.halamanDari <= d.halamanSampai, {
  message: "Halaman awal tidak boleh lebih besar dari halaman akhir.",
  path: ["halamanSampai"],
});
export const kitabBagianUpdateSchema = kitabBagianInputSchema.partial().refine(
  (d) => d.halamanDari === undefined || d.halamanSampai === undefined || d.halamanDari <= d.halamanSampai,
  { message: "Halaman awal tidak boleh lebih besar dari halaman akhir.", path: ["halamanSampai"] },
);
```

- [ ] **Step 2: Buat `src/app/api/kitab/[id]/bagian/route.ts` (GET + POST)**

```ts
import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { kitab, kitabBagian, kelas } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { kitabBagianInputSchema } from "@/lib/validations";

interface Params { params: Promise<{ id: string }> }

async function cekOverlap(kitabId: string, dari: number, sampai: number, excludeId?: string) {
  const rows = await db.select().from(kitabBagian).where(eq(kitabBagian.kitabId, kitabId));
  return rows.some((r) => {
    if (excludeId && r.id === excludeId) return false;
    return dari <= r.halamanSampai && sampai >= r.halamanDari;
  });
}

export async function GET(_req: Request, { params }: Params) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;
  const { id } = await params;
  const rows = await db.query.kitabBagian.findMany({
    where: (b, { eq }) => eq(b.kitabId, id),
    with: { kelas: { columns: { namaKelas: true, urutan: true } } },
  });
  return NextResponse.json(rows);
}

export async function POST(request: Request, { params }: Params) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;
  const { id: kitabId } = await params;
  const parsed = kitabBagianInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  const [kitabRow] = await db.select().from(kitab).where(eq(kitab.id, kitabId)).limit(1);
  if (!kitabRow) return NextResponse.json({ error: "Kitab tidak ditemukan." }, { status: 404 });
  const [kelasRow] = await db.select().from(kelas).where(eq(kelas.id, parsed.data.kelasId)).limit(1);
  if (!kelasRow) return NextResponse.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
  if (parsed.data.halamanSampai > kitabRow.jumlahHalaman) return NextResponse.json({ error: `Halaman akhir maksimal ${kitabRow.jumlahHalaman}.` }, { status: 400 });
  if (await cekOverlap(kitabId, parsed.data.halamanDari, parsed.data.halamanSampai)) return NextResponse.json({ error: "Rentang bertabrakan dengan bagian lain kitab ini." }, { status: 400 });
  const [created] = await db.insert(kitabBagian).values({ kitabId, ...parsed.data }).returning();
  return NextResponse.json(created, { status: 201 });
}
```

- [ ] **Step 3: Buat `src/app/api/kitab/bagian/[bagianId]/route.ts` (PATCH + DELETE)**

```ts
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { kitab, kitabBagian, kelas } from "@/db/schema";
import { requireApiRole } from "@/lib/permissions";
import { kitabBagianUpdateSchema } from "@/lib/validations";

interface Params { params: Promise<{ bagianId: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;
  const { bagianId } = await params;
  const parsed = kitabBagianUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  const [existing] = await db.select().from(kitabBagian).where(eq(kitabBagian.id, bagianId)).limit(1);
  if (!existing) return NextResponse.json({ error: "Bagian tidak ditemukan." }, { status: 404 });
  const [kitabRow] = await db.select().from(kitab).where(eq(kitab.id, existing.kitabId)).limit(1);
  if (parsed.data.kelasId) {
    const [k] = await db.select().from(kelas).where(eq(kelas.id, parsed.data.kelasId)).limit(1);
    if (!k) return NextResponse.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
  }
  const dari = parsed.data.halamanDari ?? existing.halamanDari;
  const sampai = parsed.data.halamanSampai ?? existing.halamanSampai;
  if (sampai > (kitabRow?.jumlahHalaman ?? sampai)) return NextResponse.json({ error: `Halaman akhir maksimal ${kitabRow?.jumlahHalaman}.` }, { status: 400 });
  const rows = await db.select().from(kitabBagian).where(eq(kitabBagian.kitabId, existing.kitabId));
  const tabrakan = rows.some((r) => r.id !== bagianId && dari <= r.halamanSampai && sampai >= r.halamanDari);
  if (tabrakan) return NextResponse.json({ error: "Rentang bertabrakan dengan bagian lain kitab ini." }, { status: 400 });
  const [updated] = await db.update(kitabBagian).set({ ...parsed.data }).where(eq(kitabBagian.id, bagianId)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await requireApiRole(["admin"]);
  if (session instanceof Response) return session;
  const { bagianId } = await params;
  const [existing] = await db.select().from(kitabBagian).where(eq(kitabBagian.id, bagianId)).limit(1);
  if (!existing) return NextResponse.json({ error: "Bagian tidak ditemukan." }, { status: 404 });
  await db.delete(kitabBagian).where(eq(kitabBagian.id, bagianId));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Verifikasi manual via curl/dev (tidak perlu skrip DB tulis)**

Run: `npm run lint`
Expected: hijau.
Manual: di dev, POST overlap → 400 "Rentang bertabrakan..."; POST sampai > jumlahHalaman → 400; GET list → JSON array.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations.ts src/app/api/kitab/[id]/bagian/route.ts src/app/api/kitab/bagian/[bagianId]/route.ts
git commit -m "feat: CRUD kitab_bagian dengan validasi overlap dan batas halaman"
```

---

### Task 3: Guard hapus kelas untuk bagian

**Files:**
- Modify: `src/app/api/kelas/[id]/route.ts:74-83`

**Interfaces:**
- Consumes: `kitabBagian` Task 1.
- Produces: DELETE kelas menolak bila dipakai `kitab.kelasId` ATAU `kitabBagian.kelasId` (pesan hitung total).

- [ ] **Step 1: Tambah cek bagian di DELETE**

```ts
import { kitabBagian } from "@/db/schema";
// setelah cek jumlahKitab:
const [{ value: jumlahBagian }] = await db
  .select({ value: count() })
  .from(kitabBagian)
  .where(eq(kitabBagian.kelasId, id));
if (jumlahBagian > 0) {
  return NextResponse.json(
    { error: `Kelas masih dipakai ${jumlahBagian} bagian kitab. Pindahkan bagian dulu.` },
    { status: 400 },
  );
}
```

Bila kitab juga memakai kelas, pesan kitab yang lama tetap keluar dulu (urutan: santri → kitab → bagian).

- [ ] **Step 2: Lint + commit**

Run: `npm run lint`
Expected: hijau.

```bash
git add src/app/api/kelas/[id]/route.ts
git commit -m "feat: tolak hapus kelas yang masih dipakai bagian kitab"
```

---

### Task 4: `getKenaikanStatus` per-bagian + tipe baru

**Files:**
- Modify: `src/lib/kenaikan.ts:18-135`
- Test: `scripts/verify-kenaikan-bagian.ts` (sementara, read-only, hapus setelah dipakai)

**Interfaces:**
- Consumes: `kitabBagian` + `kelas.urutan/bebasSyarat` + `getSantriProgressData(santriId) -> { kitab: [{ kitabId, namaKitab, jumlahHalaman, halaman: [{ nomorHalaman, persentase }] }] }`.
- Produces: `KenaikanKitabKurang { kitabId; bagianId: string | null; namaKitab; labelRentang: string | null; kelasNama; kurangHalaman; totalHalaman; halamanBelum }` — `labelRentang` = `"hal 1-300"` atau `null` bila kitab tidak dibagi; key unik = `bagianId ?? kitabId`.

- [ ] **Step 1: Perluas tipe `KenaikanKitabKurang`**

```ts
export interface KenaikanKitabKurang {
  kitabId: string;
  /** null = kitab tanpa bagian (fallback virtual full). */
  bagianId: string | null;
  namaKitab: string;
  /** "hal 1-300" atau null bila full kitab. */
  labelRentang: string | null;
  kelasNama: string;
  kurangHalaman: number;
  totalHalaman: number;
  halamanBelum: KenaikanHalamanBelum[];
}
```

- [ ] **Step 2: Ganti logika scope per-kitab menjadi per-bagian**

Ganti blok `scopeKitabIds` + `namaKelasByKitab` + loop `kitabBelum` dengan:

```ts
const bagianRows = await db.query.kitabBagian.findMany({
  columns: { id: true, kitabId: true, kelasId: true, halamanDari: true, halamanSampai: true },
});
const bagianByKitab = new Map<string, typeof bagianRows>();
for (const b of bagianRows) {
  const list = bagianByKitab.get(b.kitabId) ?? [];
  list.push(b);
  bagianByKitab.set(b.kitabId, list);
}
interface ScopeBagian { kitabId: string; bagianId: string | null; dari: number; sampai: number; kelasNama: string; urutan: number }
const scope: ScopeBagian[] = [];
for (const kb of kitabRows) {
  if (kb.status !== "aktif") continue;
  const daftar = bagianByKitab.get(kb.id) ?? [];
  if (daftar.length === 0) {
    if (!kb.kelasId) continue;
    const pemilik = urutanByKelas.get(kb.kelasId);
    if (!pemilik || pemilik.bebasSyarat || pemilik.urutan > santriKelas.urutan) continue;
    const jumlah = data.kitab.find((k) => k.kitabId === kb.id)?.jumlahHalaman ?? 0;
    scope.push({ kitabId: kb.id, bagianId: null, dari: 1, sampai: jumlah, kelasNama: pemilik.namaKelas, urutan: pemilik.urutan });
  } else {
    for (const b of daftar) {
      const pemilik = urutanByKelas.get(b.kelasId);
      if (!pemilik || pemilik.bebasSyarat || pemilik.urutan > santriKelas.urutan) continue;
      scope.push({ kitabId: kb.id, bagianId: b.id, dari: b.halamanDari, sampai: b.halamanSampai, kelasNama: pemilik.namaKelas, urutan: pemilik.urutan });
    }
  }
}
```

Lalu bangun `kitabBelum` per scope entry: filter `h.persentase !== 100 && nomorHalaman >= dari && nomorHalaman <= sampai`, `totalHalaman = sampai - dari + 1`, `labelRentang = bagianId ? \`hal ${dari}-${sampai}\` : null`. Sort by `urutan → namaKitab → dari`. Key untuk React nanti = `bagianId ?? kitabId` (dikerjakan di Task 6, bukan di sini).

`kitabRows` query di fungsi ini harus tambah `namaKitab` ke columns agar bisa sort tanpa lookup tambahan.

- [ ] **Step 3: Tulis skrip verify read-only**

```ts
// scripts/verify-kenaikan-bagian.ts
import { getKenaikanStatus } from "@/lib/kenaikan";
// Ganti dengan id santri A/B di dev:
const a = await getKenaikanStatus(process.env.SANTRI_A!);
const b = await getKenaikanStatus(process.env.SANTRI_B!);
console.log("A:", a?.kitabBelum.map((k) => `${k.namaKitab} ${k.labelRentang} kurang=${k.kurangHalaman}`));
console.log("B:", b?.kitabBelum.map((k) => `${k.namaKitab} ${k.labelRentang} kurang=${k.kurangHalaman}`));
```

- [ ] **Step 4: Run verify**

Run: `SANTRI_A=... SANTRI_B=... npx tsx --env-file=.env.local scripts/verify-kenaikan-bagian.ts`
Expected: santri A hanya menagih `hal 1-300` Quran; santri B menagih `hal 1-300` + `hal 301-600`; kitab tanpa bagian tetap 1 entri `labelRentang=null`.

- [ ] **Step 5: Lint + hapus skrip + commit**

Run: `npm run lint`
Expected: hijau.
Run: `rm scripts/verify-kenaikan-bagian.ts`

```bash
git add src/lib/kenaikan.ts
git commit -m "feat: scope kenaikan per bagian kitab"
```

---

### Task 5: `getLubangReport` per-bagian + tipe baru

**Files:**
- Modify: `src/lib/kenaikan.ts:146-252`
- Test: `scripts/verify-lubang-bagian.ts` (sementara, read-only, hapus setelah dipakai)

**Interfaces:**
- Consumes: `kitabBagian` Task 1, agregat `pencapaian` existing.
- Produces: `LubangKitab { kitabId; bagianId: string | null; namaKitab; labelRentang: string | null; kelasNama; rataRata; halaman: LubangHalaman[] }` — satu elemen per bagian; kitab tanpa bagian = satu elemen `bagianId=null`.

- [ ] **Step 1: Perluas tipe `LubangKitab`**

```ts
export interface LubangKitab {
  kitabId: string;
  bagianId: string | null;
  namaKitab: string;
  labelRentang: string | null;
  kelasNama: string;
  rataRata: number;
  halaman: LubangHalaman[];
}
```

- [ ] **Step 2: Ganti `pemilikByKitab` menjadi daftar bagian**

Ganti blok `pemilikByKitab` + `halamanRows` + `scoped` dengan logika: ambil `kitabBagian` + `kitab.jumlahHalaman`; bangun `blokDef = [{ kitabId, bagianId, dari, sampai, pemilik }]` (virtual full bila 0 bagian); query `halaman` seperti sekarang lalu filter `nomorHalaman` dalam `[dari..sampai]` per blok; agregat sum/dinilai per halaman tidak berubah; `scoped` sort by `pemilik.urutan → namaKitab → dari`.

- [ ] **Step 3: Tulis skrip verify**

```ts
// scripts/verify-lubang-bagian.ts
import { getLubangReport } from "@/lib/kenaikan";
const lubang = await getLubangReport();
console.log(lubang.map((b) => `${b.namaKitab} ${b.labelRentang ?? "full"} [${b.kelasNama}] hal=${b.halaman.length} rata=${b.rataRata}`));
```

- [ ] **Step 4: Run verify**

Run: `npx tsx --env-file=.env.local scripts/verify-lubang-bagian.ts`
Expected: Quran muncul 2 baris (`hal 1-300 [A]`, `hal 301-600 [B]`); kitab tanpa bagian 1 baris `full`.

- [ ] **Step 5: Lint + hapus skrip + commit**

Run: `npm run lint`
Expected: hijau.
Run: `rm scripts/verify-lubang-bagian.ts`

```bash
git add src/lib/kenaikan.ts
git commit -m "feat: laporan lubang per bagian kitab"
```

---

### Task 6: UI `LubangReport` + `KenaikanCard` per-bagian

**Files:**
- Modify: `src/components/shared/lubang-report.tsx`
- Modify: `src/components/shared/kenaikan-card.tsx`

**Interfaces:**
- Consumes: tipe baru Task 4–5 (`bagianId`, `labelRentang`).
- Produces: accordion per-bagian dengan judul yang membedakan rentang; tidak ada perubahan props (tetap `data: LubangKitab[]`, `status: KenaikanStatus`).

- [ ] **Step 1: Update `lubang-report.tsx` — key + judul per-bagian**

Ganti `key={kitab.kitabId}` menjadi `key={kitab.bagianId ?? kitab.kitabId}`. Judul:

```tsx
<span className="font-semibold text-ink">
  {kitab.namaKitab}
  {kitab.labelRentang ? <span className="text-ink-secondary"> — {kitab.labelRentang}</span> : null}
</span>
```

Grouping per `kelasNama` tetap (helper sudah urut by urutan → nama → dari, jadi blok sekelas selalu adjacent).

- [ ] **Step 2: Update `kenaikan-card.tsx` — key + label + hitung**

Ganti `key={k.kitabId}` menjadi `key={k.bagianId ?? k.kitabId}`. Nama:

```tsx
<span className="text-sm font-semibold text-ink">
  {k.namaKitab}
  {k.labelRentang ? <span className="font-normal text-ink-secondary"> — {k.labelRentang}</span> : null}
</span>
```

Teks `statusText` tidak berubah (tetap hitung kitab/bagian yang kurang — `kurangKitab` kini berarti jumlah bagian).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: sukses tanpa error tipe.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/lubang-report.tsx src/components/shared/kenaikan-card.tsx
git commit -m "feat: tampilkan laporan dan kartu kenaikan per bagian kitab"
```

---

### Task 7: Editor rentang di Kelola Kitab

**Files:**
- Modify: `src/app/admin/kitab/page.tsx`
- Modify: `src/components/admin/kitab-manager.tsx`

**Interfaces:**
- Consumes: API bagian Task 2, `kelasOptions { id, namaKelas, urutan }` existing.
- Produces: `KitabItem { ...existing; bagian: { id: string; kelasId: string; kelasNama: string | null; halamanDari: number; halamanSampai: number }[] }` + CRUD UI per kitab.

- [ ] **Step 1: Perluas query server di `admin/kitab/page.tsx`**

```ts
with: {
  kelas: { columns: { namaKelas: true } },
  kitabBagian: { with: { kelas: { columns: { namaKelas: true } } } },
},
```

Mapping:

```ts
bagian: (r.kitabBagian ?? [])
  .map((b) => ({ id: b.id, kelasId: b.kelasId, kelasNama: b.kelas?.namaKelas ?? null, halamanDari: b.halamanDari, halamanSampai: b.halamanSampai }))
  .sort((a, b) => a.halamanDari - b.halamanDari),
```

- [ ] **Step 2: Tambah tipe + state editor di `kitab-manager.tsx`**

```ts
export interface KitabBagianItem {
  id: string;
  kelasId: string;
  kelasNama: string | null;
  halamanDari: number;
  halamanSampai: number;
}
export interface KitabItem {
  // ...field existing
  bagian: KitabBagianItem[];
}
```

Refresh juga re-attach `kelasNama` bagian dari `kelasOptions` (pola yang sama dengan `refresh()` existing untuk `kelasNama` kitab).

- [ ] **Step 3: Tambah UI per kartu kitab**

Di bawah badge existing, render list bagian + form inline (dua `Input type=number` + `Select` kelas + tombol Simpan/Hapus) memakai `api("/api/kitab/${id}/bagian")` dan `api("/api/kitab/bagian/${bagianId}")` dengan `toast.promise` pesan Indonesia ("Bagian berhasil ditambahkan.", "Rentang bertabrakan dengan bagian lain kitab ini." diteruskan dari server). Bila `bagian.length > 0`, sembunyikan badge `kelasNama` fallback dan tampilkan hint "Diatur per bagian di bawah".

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: sukses.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/kitab/page.tsx src/components/admin/kitab-manager.tsx
git commit -m "feat: editor rentang bagian kitab per kelas"
```

---

### Task 8: Verifikasi akhir + docs

**Files:**
- Modify: `docs/SCHEMA.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION.md` (tambah fase + tabel `kitab_bagian`)
- Test: `scripts/verify-bagian-e2e.ts` (sementara, read-only kecuali data uji yang dibuat lalu dihapus)

**Interfaces:**
- Consumes: semua task di atas.
- Produces: docs sinkron + bukti manual E2E.

- [ ] **Step 1: Tulis skrip E2E sementara**

```ts
// scripts/verify-bagian-e2e.ts
import { getKenaikanStatus, getLubangReport } from "@/lib/kenaikan";
const lubang = await getLubangReport();
const quran = lubang.filter((b) => b.namaKitab.toLowerCase().includes("quran"));
console.log("blok quran:", quran.map((b) => `${b.labelRentang} [${b.kelasNama}]`));
if (quran.length < 2) throw new Error("Quran harus 2 blok");
const s = await getKenaikanStatus(process.env.SANTRI_A!);
console.log("OK santri A kitabBelum:", s?.kitabBelum.length);
console.log("E2E OK");
```

- [ ] **Step 2: Run E2E + lint + build**

Run: `SANTRI_A=... npx tsx --env-file=.env.local scripts/verify-bagian-e2e.ts`
Expected: `E2E OK`.
Run: `npm run lint && npm run build`
Expected: keduanya hijau.

- [ ] **Step 3: Hapus skrip + update docs + commit**

Run: `rm scripts/verify-bagian-e2e.ts`
Docs: tambah baris `kitab_bagian` di SCHEMA, alur per-bagian di ARCHITECTURE, fase baru di IMPLEMENTATION.

```bash
git add docs/SCHEMA.md docs/ARCHITECTURE.md docs/IMPLEMENTATION.md
git commit -m "docs: skema dan arsitektur kitab_bagian"
```

---

## Self-Review

**1. Spec coverage:** §2 fallback → Task 1+4+5; §4 tabel/validasi/API/guard → Task 1+2+3; §5 kartu/lubang/kelola → Task 6+7; §6 aturan formal → Task 4; §7 error → Task 2+3+8; §8 testing/rollout → Task 8; §9 non-goals tidak ada task (benar: tanpa auto-split, lintas kitab, bobot, riwayat).

**2. Placeholder scan:** tidak ada TBD/TODO/"nanti"; semua langkah berisi file exact, kode aktual, command aktual, ekspektasi aktual.

**3. Type consistency:** `bagianId: string | null` + `labelRentang: string | null` didefinisikan di Task 4–5 dan dipakai dengan nama sama di Task 6–7; key React `bagianId ?? kitabId` konsisten; `KitabBagianItem` Task 7 cocok dengan GET Task 2.
