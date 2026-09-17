# Laporan Template Custom Formula Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah 6 `daftar_hadir_*` kombinasi yang hilang dan 3 fungsi custom `COUNT/LIST/MATH` di mesin template laporan.

**Architecture:** Perluas fungsi murni `src/lib/laporan-template.ts` dengan mini-parser tulis tangan (tanpa `eval`, tanpa dependency): predikat kondisi `!/&&/||/()` + aritmetika `+-*/%()` + pola LIST. UI hanya tambah contekan contoh.

**Tech Stack:** TypeScript, Next.js 16, `Intl.DateTimeFormat id-ID`, `tsx` untuk skrip verifikasi throwaway, `tsc --noEmit`, `eslint`.

**Spec:** `docs/superpowers/specs/2026-09-17-laporan-template-custom-formula-design.md`

## Global Constraints

- Murni/client-safe: `src/lib/laporan-template.ts` tanpa import server, tanpa `eval`/`Function`, tanpa dependency baru.
- Backward compatible: `buildLaporanContext(sesi, totalSesi)` signature tidak berubah; semua 39 variabel lama render identik.
- Daftar: urut abjad locale `id`, bernomor `1. Nama`, kosong → `(tidak ada)`.
- Izin tanpa pola: append ` (keterangan)` bila keterangan non-kosong; dengan pola: tanpa append otomatis.
- Normalisasi atom: lowercase, `[\s\-]+` → `_`.
- MATH bagi/mod nol → `0`; hasil dibulatkan 2 desimal, hilangkan nol trailing.
- Gagal parse/atom tak dikenal: kembalikan `{{...}}` asli + laporkan isi-trimmed di `unknownVars`.
- Regex `{{...}}` baru: `/\{\{\s*([^{}]+?)\s*\}\}/g` (placeholder pola pakai kurung tunggal `{nama}`, tidak konflik).

---

### Task 1: 6 daftar_hadir_* kombinasi tetap

**Files:**
- Modify: `src/lib/laporan-template.ts:35-75` (VARIABLE_CATALOG, tambah 6 entri)
- Modify: `src/lib/laporan-template.ts:129-140` (lists, tambah 6 entri)
- Test: `/tmp/opencode/verify-daftar6.ts` (throwaway, jangan commit)

**Interfaces:**
- Consumes: `LaporanPeserta`, `buildLaporanContext`, `hadirBy(usia, gender)` (existing).
- Produces: `lists.daftar_hadir_pra_remaja_laki_laki`, `daftar_hadir_pra_remaja_perempuan`, `daftar_hadir_remaja_laki_laki`, `daftar_hadir_remaja_perempuan`, `daftar_hadir_pra_nikah_laki_laki`, `daftar_hadir_pra_nikah_perempuan` (string[] bernomor).

- [ ] **Step 1: Write the failing verification script**

```ts
// /tmp/opencode/verify-daftar6.ts
import { buildLaporanContext } from "/home/malino/projects/santri/src/lib/laporan-template.ts";

const ctx = buildLaporanContext({
  namaKegiatan: "Kajian",
  tanggal: "2026-01-10T00:00:00.000Z",
  judul: null,
  catatan: null,
  peserta: [
    { nama: "Budi", status: "hadir", keterangan: null, kategoriUsia: "remaja", jenisKelamin: "laki_laki" },
    { nama: "Ani", status: "hadir", keterangan: null, kategoriUsia: "remaja", jenisKelamin: "perempuan" },
    { nama: "Cici", status: "hadir", keterangan: null, kategoriUsia: "pra_nikah", jenisKelamin: "perempuan" },
    { nama: "Dedi", status: "izin", keterangan: null, kategoriUsia: "remaja", jenisKelamin: "laki_laki" },
  ],
}, 4);

const checks: Array<[string, string[]]> = [
  ["daftar_hadir_remaja_laki_laki", ["1. Budi"]],
  ["daftar_hadir_remaja_perempuan", ["1. Ani"]],
  ["daftar_hadir_pra_nikah_perempuan", ["1. Cici"]],
  ["daftar_hadir_pra_nikah_laki_laki", []],
  ["daftar_hadir_pra_remaja_laki_laki", []],
  ["daftar_hadir_pra_remaja_perempuan", []],
];
for (const [k, v] of checks) {
  const got = ctx.lists[k] ?? "MISSING";
  if (JSON.stringify(got) !== JSON.stringify(v)) throw new Error(`${k} gagal: ${JSON.stringify(got)} != ${JSON.stringify(v)}`);
}
console.log("daftar6 OK");
```

- [ ] **Step 2: Run script to verify it fails**

Run: `npx tsx /tmp/opencode/verify-daftar6.ts`
Expected: FAIL with `daftar_hadir_remaja_laki_laki gagal` atau `MISSING`.

- [ ] **Step 3: Write minimal implementation**

```ts
// di VARIABLE_CATALOG setelah daftar_hadir_pra_nikah, tambahkan tepat 6 ini:
{ name: "daftar_hadir_pra_remaja_laki_laki", description: "Daftar hadir pra-remaja laki-laki" },
{ name: "daftar_hadir_pra_remaja_perempuan", description: "Daftar hadir pra-remaja perempuan" },
{ name: "daftar_hadir_remaja_laki_laki", description: "Daftar hadir remaja laki-laki" },
{ name: "daftar_hadir_remaja_perempuan", description: "Daftar hadir remaja perempuan" },
{ name: "daftar_hadir_pra_nikah_laki_laki", description: "Daftar hadir pra-nikah laki-laki" },
{ name: "daftar_hadir_pra_nikah_perempuan", description: "Daftar hadir pra-nikah perempuan" },
```

```ts
// di lists setelah daftar_hadir_pra_nikah, tambahkan tepat 6 ini:
daftar_hadir_pra_remaja_laki_laki: numbered(hadirBy("pra_remaja", "laki_laki")),
daftar_hadir_pra_remaja_perempuan: numbered(hadirBy("pra_remaja", "perempuan")),
daftar_hadir_remaja_laki_laki: numbered(hadirBy("remaja", "laki_laki")),
daftar_hadir_remaja_perempuan: numbered(hadirBy("remaja", "perempuan")),
daftar_hadir_pra_nikah_laki_laki: numbered(hadirBy("pra_nikah", "laki_laki")),
daftar_hadir_pra_nikah_perempuan: numbered(hadirBy("pra_nikah", "perempuan")),
```

- [ ] **Step 4: Run script to verify it passes**

Run: `npx tsx /tmp/opencode/verify-daftar6.ts`
Expected: PASS mencetak `daftar6 OK`.

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: PASS tanpa error.

```bash
git add src/lib/laporan-template.ts
git commit -m "feat(laporan): tambah 6 daftar_hadir kombinasi usia-gender"
```

---

### Task 2: COUNT(kondisi) + parser kondisi

**Files:**
- Modify: `src/lib/laporan-template.ts:22-33` (tambah `peserta: LaporanPeserta[]` di `LaporanContext`)
- Modify: `src/lib/laporan-template.ts:98-154` (simpan peserta mentah, tambah normalizer + parser kondisi + evaluator COUNT + hook di `valueOf`)
- Test: `/tmp/opencode/verify-count.ts` (throwaway)

**Interfaces:**
- Consumes: `LaporanContext.peserta` (baru), `ctx.counts`, existing `sortNama`.
- Produces: `normalizeAtom(raw: string): string`, `atomPredicate(atom: string): ((p: LaporanPeserta) => boolean) | null`, `buildPredicate(condSrc: string): ((p: LaporanPeserta) => boolean) | null`, `evalCountInner(condSrc: string, peserta: LaporanPeserta[]): number | null`.

Kosa kata atom (setelah normalisasi): `hadir`, `izin`, `tanpa_keterangan`, `belum_diabsen`, `belum` (alias belum_diabsen), `tidak_hadir`, `laki_laki`, `perempuan`, `pra_remaja`, `remaja`, `pra_nikah`. Preseden: `!` > `&&` > `||`, `()` didukung, spasi bebas, nama fungsi case-insensitive.

- [ ] **Step 1: Write the failing verification script**

```ts
// /tmp/opencode/verify-count.ts
import { buildLaporanContext, renderTemplate } from "/home/malino/projects/santri/src/lib/laporan-template.ts";

const sesi = {
  namaKegiatan: "Kajian",
  tanggal: "2026-01-10T00:00:00.000Z",
  judul: null as string | null,
  catatan: null as string | null,
  peserta: [
    { nama: "Budi", status: "hadir" as const, keterangan: null, kategoriUsia: "remaja" as const, jenisKelamin: "laki_laki" as const },
    { nama: "Agus", status: "hadir" as const, keterangan: null, kategoriUsia: "pra_nikah" as const, jenisKelamin: "laki_laki" as const },
    { nama: "Ani", status: "hadir" as const, keterangan: null, kategoriUsia: "remaja" as const, jenisKelamin: "perempuan" as const },
    { nama: "Dedi", status: "izin" as const, keterangan: "sakit", kategoriUsia: "remaja" as const, jenisKelamin: "laki_laki" as const },
    { nama: "Eka", status: null, keterangan: null, kategoriUsia: null, jenisKelamin: null },
  ],
};
const ctx = buildLaporanContext(sesi, 4);
const cases: Array<[string, string]> = [
  ["{{COUNT(hadir && laki_laki && pra_nikah)}}", "0"],
  ["{{COUNT(hadir && laki-laki && remaja)}}", "1"],
  ["{{COUNT(hadir && (remaja || pra_nikah))}}", "3"],
  ["{{COUNT(!hadir)}}", "2"],
  ["{{COUNT(izin && remaja)}}", "1"],
  ["{{COUNT()}}", "5"],
  ["{{count(HADIR)}}", "3"],
];
for (const [tpl, want] of cases) {
  const { text, unknownVars } = renderTemplate(tpl, ctx);
  if (text !== want) throw new Error(`${tpl} -> ${JSON.stringify(text)} != ${JSON.stringify(want)}`);
  if (unknownVars.length !== 0) throw new Error(`${tpl} unknownVars tak terduga: ${unknownVars}`);
}
const bad = renderTemplate("{{COUNT(foo)}}", ctx);
if (bad.text !== "{{COUNT(foo)}}" || !bad.unknownVars.includes("COUNT(foo)")) throw new Error(`unknown gagal: ${JSON.stringify(bad)}`);
console.log("count OK");
```

- [ ] **Step 2: Run script to verify it fails**

Run: `npx tsx /tmp/opencode/verify-count.ts`
Expected: FAIL (teks dibiarkan apa adanya karena COUNT belum dikenal).

- [ ] **Step 3: Write minimal implementation**

```ts
// 1) Tambah field di interface LaporanContext:
peserta: LaporanPeserta[];
```

```ts
// 2) Di buildLaporanContext return, tambahkan:
peserta: sesi.peserta,
```

```ts
// 3) Tambahkan setelah helper pct():
function normalizeAtom(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s\-]+/g, "_");
}

function atomPredicate(atom: string): ((p: LaporanPeserta) => boolean) | null {
  switch (normalizeAtom(atom)) {
    case "hadir": return (p) => p.status === "hadir";
    case "izin": return (p) => p.status === "izin";
    case "tanpa_keterangan": return (p) => p.status === "tanpa_keterangan";
    case "belum_diabsen":
    case "belum": return (p) => p.status === null;
    case "tidak_hadir": return (p) => p.status === "izin" || p.status === "tanpa_keterangan";
    case "laki_laki": return (p) => p.jenisKelamin === "laki_laki";
    case "perempuan": return (p) => p.jenisKelamin === "perempuan";
    case "pra_remaja": return (p) => p.kategoriUsia === "pra_remaja";
    case "remaja": return (p) => p.kategoriUsia === "remaja";
    case "pra_nikah": return (p) => p.kategoriUsia === "pra_nikah";
    default: return null;
  }
}

type CondTok =
  | { t: "atom"; v: string }
  | { t: "and" } | { t: "or" } | { t: "not" } | { t: "lp" } | { t: "rp" };

function tokenizeCond(src: string): CondTok[] | null {
  const toks: CondTok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "(") { toks.push({ t: "lp" }); i++; continue; }
    if (c === ")") { toks.push({ t: "rp" }); i++; continue; }
    if (c === "!") { toks.push({ t: "not" }); i++; continue; }
    if (c === "&" && src[i + 1] === "&") { toks.push({ t: "and" }); i += 2; continue; }
    if (c === "|" && src[i + 1] === "|") { toks.push({ t: "or" }); i += 2; continue; }
    if (c === "&" || c === "|") return null;
    const m = /^[A-Za-z]+(?:[_\- ][A-Za-z0-9]+)*/.exec(src.slice(i));
    if (!m) return null;
    toks.push({ t: "atom", v: m[0].trim() });
    i += m[0].length;
  }
  return toks;
}

function buildPredicate(condSrc: string): ((p: LaporanPeserta) => boolean) | null {
  if (condSrc.trim() === "") return () => true;
  const toks = tokenizeCond(condSrc);
  if (!toks || toks.length === 0) return null;
  let pos = 0;
  function parseOr(): ((p: LaporanPeserta) => boolean) | null {
    let left = parseAnd();
    if (!left) return null;
    while (pos < toks.length && toks[pos].t === "or") {
      pos++;
      const right = parseAnd();
      if (!right) return null;
      const l = left;
      left = (p) => l(p) || right(p);
    }
    return left;
  }
  function parseAnd(): ((p: LaporanPeserta) => boolean) | null {
    let left = parseUnary();
    if (!left) return null;
    while (pos < toks.length && toks[pos].t === "and") {
      pos++;
      const right = parseUnary();
      if (!right) return null;
      const l = left;
      left = (p) => l(p) && right(p);
    }
    return left;
  }
  function parseUnary(): ((p: LaporanPeserta) => boolean) | null {
    const tk = toks[pos];
    if (!tk) return null;
    if (tk.t === "not") {
      pos++;
      const inner = parseUnary();
      if (!inner) return null;
      return (p) => !inner(p);
    }
    if (tk.t === "lp") {
      pos++;
      const inner = parseOr();
      if (!inner || toks[pos]?.t !== "rp") return null;
      pos++;
      return inner;
    }
    if (tk.t === "atom") {
      pos++;
      return atomPredicate(tk.v);
    }
    return null;
  }
  const pred = parseOr();
  if (!pred || pos !== toks.length) return null;
  return pred;
}
```

```ts
// 4) Evaluator COUNT + hook valueOf (nama fungsi case-insensitive, spasi disekitar paren ditoleransi):
function evalCountInner(condSrc: string, peserta: LaporanPeserta[]): number | null {
  const pred = buildPredicate(condSrc);
  if (!pred) return null;
  return peserta.filter(pred).length;
}
// di valueOf(), sebelum fallback counts/lists, tambahkan:
const fn = /^\s*(COUNT)\s*\((.*)\)\s*$/is.exec(name);
if (fn) {
  const n = evalCountInner(fn[2] ?? "", ctx.peserta ?? []);
  return n === null ? null : String(n);
}
```

`buildPredicate` mengembalikan `null` bila tokenize/parse gagal atau atom tak dikenal. `valueOf` mengembalikan `null` → `renderTemplate` membiarkan teks asli (sesuai constraint error handling).

- [ ] **Step 4: Run script to verify it passes**

Run: `npx tsx /tmp/opencode/verify-count.ts`
Expected: PASS mencetak `count OK`.

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add src/lib/laporan-template.ts
git commit -m "feat(laporan): tambah COUNT(kondisi) custom"
```

---

### Task 3: LIST(kondisi[, pola]) + placeholder per item

**Files:**
- Modify: `src/lib/laporan-template.ts` (tambah `splitTopLevelComma`, `parsePatternArg`, `renderListWithPattern`, hook `LIST` di `valueOf`)
- Test: `/tmp/opencode/verify-list.ts` (throwaway)

**Interfaces:**
- Consumes: `buildPredicate` dari Task 2, `LaporanContext.peserta`.
- Produces: `splitTopLevelComma(src: string): string[]`, `parsePatternArg(raw: string): string | null`, `renderListWithPattern(list: LaporanPeserta[], pattern: string | null): string`.

Aturan pola: argumen ke-2 opsional string kutip `"` atau `'` (boleh mengandung koma). Placeholder `{nama}` wajib bila pola dipakai; `{nomor}` 1-based; `{keterangan}` mentah. Tanpa pola: `nama` + ` (keterangan)` otomatis untuk `izin`. Hasil akhir per baris diformat `<i>. <isi>` setelah sort abjad `id`; kosong → pemanggil kembalikan `(tidak ada)` via jalur `lists` (untuk fungsi, `valueOf` join atau `(tidak ada)` langsung).

- [ ] **Step 1: Write the failing verification script**

```ts
// /tmp/opencode/verify-list.ts
import { buildLaporanContext, renderTemplate } from "/home/malino/projects/santri/src/lib/laporan-template.ts";

const sesi = {
  namaKegiatan: "Kajian",
  tanggal: "2026-01-10T00:00:00.000Z",
  judul: null as string | null,
  catatan: null as string | null,
  peserta: [
    { nama: "Budi", status: "hadir" as const, keterangan: null, kategoriUsia: "remaja" as const, jenisKelamin: "laki_laki" as const },
    { nama: "Agus", status: "hadir" as const, keterangan: null, kategoriUsia: "remaja" as const, jenisKelamin: "laki_laki" as const },
    { nama: "Ani", status: "hadir" as const, keterangan: null, kategoriUsia: "remaja" as const, jenisKelamin: "perempuan" as const },
    { nama: "Dedi", status: "izin" as const, keterangan: "sakit", kategoriUsia: "remaja" as const, jenisKelamin: "laki_laki" as const },
  ],
};
const ctx = buildLaporanContext(sesi, 4);
const t1 = renderTemplate("{{LIST(hadir && laki_laki)}}", ctx);
if (t1.text !== "1. Agus\n2. Budi") throw new Error(`LIST dasar gagal: ${JSON.stringify(t1.text)}`);
const t2 = renderTemplate('{{LIST(hadir && laki_laki, "Mas {nama}")}}', ctx);
if (t2.text !== "1. Mas Agus\n2. Mas Budi") throw new Error(`LIST pola gagal: ${JSON.stringify(t2.text)}`);
const t3 = renderTemplate("{{LIST(hadir && pra_nikah)}}", ctx);
if (t3.text !== "(tidak ada)") throw new Error(`LIST kosong gagal: ${JSON.stringify(t3.text)}`);
const t4 = renderTemplate("{{LIST(izin && remaja)}}", ctx);
if (t4.text !== "1. Dedi (sakit)") throw new Error(`LIST izin gagal: ${JSON.stringify(t4.text)}`);
const bad = renderTemplate('{{LIST(hadir, "Mas")}}', ctx);
if (bad.text !== '{{LIST(hadir, "Mas")}}' || bad.unknownVars.length === 0) throw new Error(`LIST pola tanpa nama harus unknown: ${JSON.stringify(bad)}`);
console.log("list OK");
```

- [ ] **Step 2: Run script to verify it fails**

Run: `npx tsx /tmp/opencode/verify-list.ts`
Expected: FAIL (LIST belum dikenal, teks dibiarkan).

- [ ] **Step 3: Write minimal implementation**

```ts
function splitTopLevelComma(src: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let quote: string | null = null;
  let depth = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      cur += c;
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; cur += c; continue; }
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (c === "," && depth === 0) { parts.push(cur); cur = ""; continue; }
    cur += c;
  }
  parts.push(cur);
  return parts.map((p) => p.trim());
}

function parsePatternArg(raw: string): string | null {
  const m = /^\s*("(?:[^"]*)"|'(?:[^']*)')\s*$/.exec(raw);
  if (!m) return null;
  return m[1].slice(1, -1);
}

function renderListWithPattern(
  list: LaporanPeserta[],
  pattern: string | null
): string {
  const sorted = [...list].sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  if (sorted.length === 0) return "(tidak ada)";
  if (pattern === null) {
    return sorted
      .map((p, i) => {
        const ket = p.keterangan?.trim();
        const extra = p.status === "izin" && ket ? ` (${ket})` : "";
        return `${i + 1}. ${p.nama}${extra}`;
      })
      .join("\n");
  }
  if (!pattern.includes("{nama}")) return "(pola-tanpa-nama)";
  return sorted
    .map((p, i) =>
      `${i + 1}. ${pattern
        .replaceAll("{nama}", p.nama)
        .replaceAll("{nomor}", String(i + 1))
        .replaceAll("{keterangan}", p.keterangan?.trim() ?? "")}`
    )
    .join("\n");
}
// di valueOf(), tambahkan cabang LIST (case-insensitive):
// /^\s*(LIST)\s*\((.*)\)\s*$/is → splitTopLevelComma(inner)
//   bila 1 arg → evalList(cond, null); bila 2 arg → parsePatternArg(arg2), bila null atau tanpa {nama} → return null (unknown)
//   predikat null → return null; else renderListWithPattern(filtered, pattern)
```

- [ ] **Step 4: Run script to verify it passes**

Run: `npx tsx /tmp/opencode/verify-list.ts`
Expected: PASS mencetak `list OK`.

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add src/lib/laporan-template.ts
git commit -m "feat(laporan): tambah LIST(kondisi, pola) custom"
```

---

### Task 4: MATH(ekspresi) + COUNT nested

**Files:**
- Modify: `src/lib/laporan-template.ts` (tambah tokenizer/parser MATH + `evalMath` + hook di `valueOf`)
- Test: `/tmp/opencode/verify-math.ts` (throwaway)

**Interfaces:**
- Consumes: `ctx.counts`, `ctx.totalPeserta`, `ctx.totalSesi`, `evalCountInner` dari Task 2.
- Produces: `formatMathResult(n: number): string`, `evalMathExpr(expr: string, scope: Record<string, number>, countFn: (condSrc: string) => number | null): number | null`.

Grammar: `expr := term ((+|-) term)*`, `term := factor ((*|/|%) factor)*`, `factor := -factor | number | ident | COUNT(...) | ( expr )`. Ident boleh: semua key `counts` + `total_peserta` + `total_sesi` (dinormalisasi lowercase). `persen_*` ditolak (return null). Angka: `\d+(\.\d+)?`. Bagi/mod nol → `0`. Format: bulat 2 desimal, hilangkan trailing zero.

- [ ] **Step 1: Write the failing verification script**

```ts
// /tmp/opencode/verify-math.ts
import { buildLaporanContext, renderTemplate } from "/home/malino/projects/santri/src/lib/laporan-template.ts";

const sesi = {
  namaKegiatan: "Kajian",
  tanggal: "2026-01-10T00:00:00.000Z",
  judul: null as string | null,
  catatan: null as string | null,
  peserta: [
    { nama: "Budi", status: "hadir" as const, keterangan: null, kategoriUsia: "remaja" as const, jenisKelamin: "laki_laki" as const },
    { nama: "Ani", status: "hadir" as const, keterangan: null, kategoriUsia: "remaja" as const, jenisKelamin: "perempuan" as const },
    { nama: "Dedi", status: "izin" as const, keterangan: null, kategoriUsia: "remaja" as const, jenisKelamin: "laki_laki" as const },
    { nama: "Eka", status: null, keterangan: null, kategoriUsia: null, jenisKelamin: null },
  ],
};
const ctx = buildLaporanContext(sesi, 4);
const cases: Array<[string, string]> = [
  ["{{MATH(jumlah_hadir - jumlah_izin)}}", "1"],
  ["{{MATH(COUNT(hadir && remaja) / total_peserta * 100)}}", "50"],
  ["{{MATH((jumlah_hadir + jumlah_izin) * 2)}}", "6"],
  ["{{MATH(jumlah_hadir / 0)}}", "0"],
  ["{{MATH(1 / 3)}}", "0.33"],
];
for (const [tpl, want] of cases) {
  const r = renderTemplate(tpl, ctx);
  if (r.text !== want) throw new Error(`${tpl} -> ${JSON.stringify(r.text)} != ${want}`);
}
const bad = renderTemplate("{{MATH(persen_hadir + 1)}}", ctx);
if (bad.text !== "{{MATH(persen_hadir + 1)}}") throw new Error(`MATH persen harus unknown: ${JSON.stringify(bad)}`);
console.log("math OK");
```

- [ ] **Step 2: Run script to verify it fails**

Run: `npx tsx /tmp/opencode/verify-math.ts`
Expected: FAIL (MATH belum dikenal).

- [ ] **Step 3: Write minimal implementation**

```ts
function formatMathResult(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const r = Math.round(n * 100) / 100;
  return String(r);
}

function evalMathExpr(
  expr: string,
  scope: Record<string, number>,
  countFn: (condSrc: string) => number | null
): number | null {
  let i = 0;
  function skip(): void { while (i < expr.length && /\s/.test(expr[i])) i++; }
  function parseExpr(): number | null {
    let v = parseTerm();
    if (v === null) return null;
    for (;;) {
      skip();
      const c = expr[i];
      if (c !== "+" && c !== "-") return v;
      i++;
      const rhs = parseTerm();
      if (rhs === null) return null;
      v = c === "+" ? v + rhs : v - rhs;
    }
  }
  function parseTerm(): number | null {
    let v = parseFactor();
    if (v === null) return null;
    for (;;) {
      skip();
      const c = expr[i];
      if (c !== "*" && c !== "/" && c !== "%") return v;
      i++;
      const rhs = parseFactor();
      if (rhs === null) return null;
      if ((c === "/" || c === "%") && rhs === 0) return 0;
      v = c === "*" ? v * rhs : c === "/" ? v / rhs : v % rhs;
    }
  }
  function parseFactor(): number | null {
    skip();
    if (expr[i] === "-") { i++; const v = parseFactor(); return v === null ? null : -v; }
    if (expr[i] === "+") { i++; return parseFactor(); }
    if (expr[i] === "(") {
      i++;
      const v = parseExpr();
      skip();
      if (expr[i] !== ")") return null;
      i++;
      return v;
    }
    const countM = /^COUNT\s*\(/i.exec(expr.slice(i));
    if (countM) {
      i += countM[0].length;
      let depth = 1;
      const start = i;
      while (i < expr.length && depth > 0) {
        if (expr[i] === "(") depth++;
        if (expr[i] === ")") depth--;
        i++;
      }
      if (depth !== 0) return null;
      const condSrc = expr.slice(start, i - 1);
      return countFn(condSrc);
    }
    const numM = /^\d+(\.\d+)?/.exec(expr.slice(i));
    if (numM) { i += numM[0].length; return parseFloat(numM[0]); }
    const idM = /^[A-Za-z_][A-Za-z0-9_]*/.exec(expr.slice(i));
    if (idM) {
      i += idM[0].length;
      const key = idM[0].toLowerCase();
      if (key.startsWith("persen_")) return null;
      if (!(key in scope)) return null;
      return scope[key];
    }
    return null;
  }
  const v = parseExpr();
  skip();
  if (v === null || i !== expr.length) return null;
  return v;
}
// di valueOf(): cabang MATH (case-insensitive):
// inner = /^\s*MATH\s*\((.*)\)\s*$/is.exec(name)?.[1]; bila tidak cocok → bukan MATH
// scope = { ...ctx.counts, total_peserta: ctx.totalPeserta, total_sesi: ctx.totalSesi }
// countFn = (condSrc) => evalCountInner(condSrc, ctx.peserta ?? [])
// v = evalMathExpr(inner, scope, countFn); bila null → return null; else return formatMathResult(v)
// Validasi kurung seimbang: bila inner berakhir dengan ")" berlebih/kurang (tanda regex greedy salah),
// tolak dengan return null — parser di atas sudah menolak trailing chars via cek i !== expr.length.
```

- [ ] **Step 4: Run script to verify it passes**

Run: `npx tsx /tmp/opencode/verify-math.ts`
Expected: PASS mencetak `math OK`.

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: PASS.

```bash
git add src/lib/laporan-template.ts
git commit -m "feat(laporan): tambah MATH(ekspresi) dengan COUNT nested"
```

---

### Task 5: Regex global + unknownVars + contekan UI + docs + regresi penuh

**Files:**
- Modify: `src/lib/laporan-template.ts:181-199` (`findUnknownVars`, `renderTemplate` regex → `/\{\{\s*([^{}]+?)\s*\}\}/g`, coba `valueOf` dulu untuk klasifikasi known)
- Modify: `src/components/shared/template-manager.tsx:220-243` (tambah 4 contoh custom di atas katalog)
- Modify: `docs/ARCHITECTURE.md:70` (39 → 45 + fungsi custom)
- Modify: `docs/IMPLEMENTATION.md` (update hitung katalog + aturan custom)
- Test: `/tmp/opencode/verify-full.ts` (throwaway)

**Interfaces:**
- Consumes: semua fungsi Task 1-4 (`buildPredicate`, `evalCountInner`, `splitTopLevelComma`, `parsePatternArg`, `renderListWithPattern`, `evalMathExpr`, `formatMathResult`).
- Produces: tidak ada API baru; `unknownVars` final + UI contekan + docs sinkron.

- [ ] **Step 1: Write the failing full-regression script**

```ts
// /tmp/opencode/verify-full.ts
import { buildLaporanContext, renderTemplate, VARIABLE_CATALOG } from "/home/malino/projects/santri/src/lib/laporan-template.ts";

if (VARIABLE_CATALOG.length !== 45) throw new Error(`katalog harus 45, dapat ${VARIABLE_CATALOG.length}`);
const sesi = {
  namaKegiatan: "Kajian Rutin",
  tanggal: "2026-01-10T00:00:00.000Z",
  judul: "Sesi 1",
  catatan: "Catatan",
  peserta: [
    { nama: "Budi", status: "hadir" as const, keterangan: null, kategoriUsia: "remaja" as const, jenisKelamin: "laki_laki" as const },
    { nama: "Ani", status: "izin" as const, keterangan: "sakit", kategoriUsia: "remaja" as const, jenisKelamin: "perempuan" as const },
  ],
};
const ctx = buildLaporanContext(sesi, 4);
// variabel lama identik
const t0 = renderTemplate("{{nama_kegiatan}} {{hari}} {{tanggal}} H:{{jumlah_hadir}} ({{persen_hadir}})\n{{daftar_hadir}}\n{{daftar_izin}}", ctx);
if (!t0.text.includes("Kajian Rutin") || !t0.text.includes("1. Budi") || !t0.text.includes("1. Ani (sakit)")) throw new Error(`regresi lama gagal: ${t0.text}`);
// custom
const t1 = renderTemplate("{{COUNT(hadir && laki_laki)}} | {{LIST(hadir && laki_laki, \"Mas {nama}\")}} | {{MATH(jumlah_hadir - jumlah_izin)}}", ctx);
if (t1.text !== "1 | 1. Mas Budi | 0") throw new Error(`custom gagal: ${JSON.stringify(t1.text)}`);
// unknown tetap dilaporkan
const t2 = renderTemplate("Halo {{typo}} dan {{COUNT(foo)}}", ctx);
if (!t2.unknownVars.includes("typo") || !t2.unknownVars.includes("COUNT(foo)")) throw new Error(`unknown gagal: ${JSON.stringify(t2)}`);
if (!t2.text.includes("{{typo}}") || !t2.text.includes("{{COUNT(foo)}}")) throw new Error(`unknown harus dibiarkan: ${t2.text}`);
console.log("full OK");
```

- [ ] **Step 2: Run script to verify current gaps**

Run: `npx tsx /tmp/opencode/verify-full.ts`
Expected: FAIL sebelum Task 5 bila regex/unknown belum final (atau PASS bila Task 1-4 sudah menutupinya — tetap lanjutkan UI + docs).

- [ ] **Step 3: Finalize regex + unknownVars**

```ts
// Ganti KEDUA regex (findUnknownVars + renderTemplate) dari:
// /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g
// menjadi:
const VAR_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;
```

```ts
export function findUnknownVars(isi: string): string[] {
  const out: string[] = [];
  const re = /\{\{\s*([^{}]+?)\s*\}\}/g;
  let m: RegExpExecArray | null;
  // butuh ctx dummy? TIDAK — findUnknownVars tidak punya ctx.
  // Aturan final: nama fixed yang ada di KNOWN → known.
  // Pola fungsi valid (COUNT/LIST/MATH dengan parse sukses + atom/ident dikenal) → known.
  // Untuk itu, pindahkan logika "isKnownFunction(inner)" ke fungsi murni tanpa ctx
  // (validasi sintaks + atom/ident; tanpa hitung jumlah).
  // Sisanya → unknown (trimmed inner, tanpa duplikat).
  while ((m = re.exec(isi)) !== null) {
    const name = m[1].trim();
    if (!KNOWN.has(name) && !isKnownFunction(name) && !out.includes(name)) out.push(name);
  }
  return out;
}
```

CATATAN: `isKnownFunction` harus memakai parser yang sama dengan evaluator (jangan regex longgar). `renderTemplate` tetap memakai `valueOf`: bila `valueOf` return `null` → biarkan `{{...}}` asli (otomatis konsisten dengan `unknownVars`).

- [ ] **Step 4: Tambah contekan custom di TemplateManager**

```tsx
// di src/components/shared/template-manager.tsx, tepat di atas <ul> VARIABLE_CATALOG,
// tambahkan blok contoh custom (klik = insertVar dengan string penuh termasuk {{...}}):
const CUSTOM_EXAMPLES = [
  { snippet: "{{COUNT(hadir && remaja && laki_laki)}}", description: "Contoh hitung custom" },
  { snippet: '{{LIST(hadir && laki_laki, "Mas {nama}")}}', description: "Contoh daftar + awalan" },
  { snippet: "{{MATH(jumlah_hadir - jumlah_izin)}}", description: "Contoh kurang" },
  { snippet: "{{MATH(COUNT(hadir && remaja) / total_peserta * 100)}}", description: "Contoh persen custom" },
];
// render sebagai 4 tombol memakai insertVar(snippet) — insertVar sudah menerima string bebas,
// jadi panggil insertVar dengan snippet TANPA pembungkus ganda: ubah insertVar bila perlu
// agar bila argumen diawali "{{" langsung pakai apa adanya (jangan jadi "{{{{...}}}}").
```

CATATAN: sesuaikan `insertVar(name: string)` menjadi: `const token = name.trim().startsWith("{{") ? name.trim() : \`{{${name}}}\`;` — satu baris ini wajib agar contoh custom tidak terbungkus ganda, dan variabel lama tetap jalan.

- [ ] **Step 5: Update docs hitung katalog**

```markdown
// docs/ARCHITECTURE.md:70 lama:
// laporan-template.ts    -> katalog 39 variabel + render murni {{var}} (client-safe)
// baru:
// laporan-template.ts    -> katalog 45 variabel + COUNT/LIST/MATH custom + render murni {{...}} (client-safe)
```

```markdown
// docs/IMPLEMENTATION.md: tambah satu bullet setelah bullet 12.3:
// - [x] **12.4** Formula custom (COUNT/LIST/MATH + 6 daftar_hadir kombinasi): kondisi &&/||/!/(), normalisasi strip/spasi, pola LIST "{nama}/{nomor}/{keterangan}", MATH nested COUNT, unknown dibiarkan + dilaporkan.
```

- [ ] **Step 6: Run full verification + typecheck + lint**

Run: `npx tsx /tmp/opencode/verify-daftar6.ts && npx tsx /tmp/opencode/verify-count.ts && npx tsx /tmp/opencode/verify-list.ts && npx tsx /tmp/opencode/verify-math.ts && npx tsx /tmp/opencode/verify-full.ts`
Expected: semua cetak `OK`.

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run lint`
Expected: PASS (bersih seperti baseline).

- [ ] **Step 7: Commit**

```bash
git add src/lib/laporan-template.ts src/components/shared/template-manager.tsx docs/ARCHITECTURE.md docs/IMPLEMENTATION.md docs/superpowers/specs/2026-09-17-laporan-template-custom-formula-design.md docs/superpowers/plans/2026-09-17-laporan-template-custom-formula.md
git commit -m "feat(laporan): COUNT/LIST/MATH custom + regex + contekan UI + docs"
```

Hapus skrip throwaway setelah hijau (opsional, di /tmp tidak ikut commit):
```bash
rm -f /tmp/opencode/verify-daftar6.ts /tmp/opencode/verify-count.ts /tmp/opencode/verify-list.ts /tmp/opencode/verify-math.ts /tmp/opencode/verify-full.ts
```
