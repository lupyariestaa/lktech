import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyDerivedCounts,
  clampStatValue,
  featuredStat,
  formatStatNumber,
  hasVerificationFlags,
  isStatSource,
  publishableStats,
  unverifiedCount,
  validateStats,
  STAT_MAX_ITEMS,
  STAT_MAX_LABEL,
  STAT_MAX_SUFFIX,
  STAT_MAX_VALUE,
  STAT_SOURCES,
  STAT_SOURCE_DEFAULT_LABEL,
  STAT_SOURCE_LABEL,
} from "../src/lib/stats-pure.ts";
import type { ManagedStat } from "../src/lib/content-types.ts";
import { siteContentSchema } from "../src/lib/site-content-schema.ts";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Uji logika statistik angka (bagian statistik/AUD section beranda) —
 * memastikan guard nilai, format angka, aturan tayang "terverifikasi",
 * pemilihan sorotan, dan validasi editor berperilaku benar.
 * Jalankan: `npm run test:stats`
 */

function stat(over: Partial<ManagedStat> = {}): ManagedStat {
  return { value: 10, suffix: "+", label: "Contoh", ...over };
}

test("clampStatValue: membulatkan, membatasi, dan menangani NaN", () => {
  assert.equal(clampStatValue(3.9), 3);
  assert.equal(clampStatValue(-5), 0);
  assert.equal(clampStatValue(STAT_MAX_VALUE + 10), STAT_MAX_VALUE);
  assert.equal(clampStatValue(Number.NaN), 0);
  assert.equal(clampStatValue("12"), 12);
  assert.equal(clampStatValue(undefined, 7), 7);
});

test("formatStatNumber: memakai pemisah ribuan gaya Indonesia", () => {
  assert.equal(formatStatNumber(1000), "1.000");
  assert.equal(formatStatNumber(30), "30");
  assert.equal(formatStatNumber(-1), "0");
});

test("hasVerificationFlags: true hanya bila ada item verified === true", () => {
  assert.equal(hasVerificationFlags([stat(), stat()]), false);
  // Menambah item default (verified:false) TIDAK mengaktifkan mode ketat.
  assert.equal(hasVerificationFlags([stat({ verified: false })]), false);
  assert.equal(hasVerificationFlags([stat({ verified: true })]), true);
});

test("publishableStats (mode lama): sembunyikan contoh, tampilkan sisanya", () => {
  const list = [stat({ value: 20 }), stat({ value: 15 })];
  assert.deepEqual(publishableStats(list, true), []);
  assert.equal(publishableStats(list, false).length, 2);
});

test("publishableStats (mode terverifikasi): hanya item verified === true", () => {
  const list = [
    stat({ label: "A", verified: true }),
    stat({ label: "B", verified: false }),
    stat({ label: "C" }),
    stat({ label: "D", verified: true }),
  ];
  const out = publishableStats(list, false);
  assert.deepEqual(out.map((s) => s.label), ["A", "D"]);
  // `isDefault` tidak relevan saat mode ketat aktif.
  assert.equal(publishableStats(list, true).length, 2);
});

test("publishableStats: `verified:false` saja tetap memakai mode lama", () => {
  const list = [stat({ label: "A", verified: false }), stat({ label: "B" })];
  assert.equal(publishableStats(list, false).length, 2);
  assert.deepEqual(publishableStats(list, true), []);
});

test("unverifiedCount: menghitung item yang belum terverifikasi", () => {
  const list = [
    stat({ verified: true }),
    stat({ verified: false }),
    stat({}),
  ];
  assert.equal(unverifiedCount(list), 2);
});

test("featuredStat: utamakan `featured`, fallback label klien, lalu null", () => {
  assert.equal(
    featuredStat([
      stat({ label: "Klien Puas", value: 20 }),
      stat({ label: "Proyek", featured: true }),
    ])?.label,
    "Proyek",
  );
  assert.equal(featuredStat([stat({ label: "Klien Puas" })])?.label, "Klien Puas");
  assert.equal(featuredStat([stat({ label: "Proyek Dikerjakan" })]), null);
  assert.equal(featuredStat([]), null);
});

test("validateStats: menerima daftar wajar", () => {
  assert.equal(validateStats([stat({ label: "Proyek Dikerjakan", value: 30 })]), null);
  assert.equal(
    validateStats([stat({ label: "A", featured: true }), stat({ label: "B" })]),
    null,
  );
});

test("validateStats: menolak pelanggaran umum", () => {
  assert.match(validateStats([stat({ label: "  " })]) ?? "", /wajib diisi/);
  assert.match(validateStats([stat({ value: -1 })]) ?? "", /≥ 0/);
  assert.match(validateStats([stat({ value: STAT_MAX_VALUE + 1 })]) ?? "", /maksimal/);
  assert.match(validateStats([stat({ suffix: "x".repeat(9) })]) ?? "", /Sufiks/);
  assert.match(
    validateStats([stat({ label: "x".repeat(STAT_MAX_LABEL + 1) })]) ?? "",
    /karakter/,
  );
  const many = Array.from({ length: STAT_MAX_ITEMS + 1 }, (_, i) =>
    stat({ label: `Item ${i}` }),
  );
  assert.match(validateStats(many) ?? "", /Maksimal/);
  assert.match(
    validateStats([
      stat({ label: "A", featured: true }),
      stat({ label: "B", featured: true }),
    ]) ?? "",
    /satu statistik/,
  );
  // `NaN` (mis. dari input kosong) ditolak.
  assert.match(validateStats([stat({ value: Number.NaN })]) ?? "", /≥ 0/);
});

test("skema konten selaras dengan batas stats-pure", () => {
  const ok = siteContentSchema.safeParse({
    stats: [{ value: STAT_MAX_VALUE, label: "Maksimum" }],
  });
  assert.equal(ok.success, true);

  assert.equal(
    siteContentSchema.safeParse({
      stats: [{ value: STAT_MAX_VALUE + 1, label: "Terlalu besar" }],
    }).success,
    false,
  );
  assert.equal(
    siteContentSchema.safeParse({
      stats: [{ value: 5, suffix: "x".repeat(STAT_MAX_SUFFIX + 1), label: "Sufiks" }],
    }).success,
    false,
  );
  assert.equal(
    siteContentSchema.safeParse({
      stats: [{ value: 5, label: "Baru", verified: true, featured: true, note: "Okt 2026" }],
    }).success,
    true,
  );
});

test("isStatSource: mengenali hanya sumber turunan yang didukung", () => {
  for (const source of STAT_SOURCES) {
    assert.equal(isStatSource(source), true);
    assert.ok(STAT_SOURCE_LABEL[source].length > 0);
    assert.ok(STAT_SOURCE_DEFAULT_LABEL[source].length > 0);
  }
  assert.equal(isStatSource("clients"), false);
  assert.equal(isStatSource(""), false);
  assert.equal(isStatSource(undefined), false);
  // "Klien Puas" TIDAK boleh menjadi sumber turunan.
  assert.equal((STAT_SOURCES as readonly string[]).includes("clients"), false);
});

test("applyDerivedCounts: memperbarui item turunan, membiarkan manual", () => {
  const list = [
    stat({ label: "Proyek", source: "projects", value: 1 }),
    stat({ label: "Layanan", source: "services", value: 999 }),
    stat({ label: "Klien Puas", value: 20 }),
  ];
  const { stats, changed } = applyDerivedCounts(list, { projects: 30, services: 3 });
  assert.equal(changed, 2);
  assert.equal(stats[0].value, 30);
  assert.equal(stats[1].value, 3);
  // Item manual tidak disentuh.
  assert.equal(stats[2].value, 20);
  assert.equal(stats[2].source, undefined);
});

test("applyDerivedCounts: selaras → changed 0; sumber hilang → nilai lama", () => {
  const list = [stat({ label: "Proyek", source: "projects", value: 30 })];
  assert.equal(applyDerivedCounts(list, { projects: 30 }).changed, 0);

  const missing = applyDerivedCounts(list, {});
  assert.equal(missing.changed, 0);
  assert.equal(missing.stats[0].value, 30);
});

test("applyDerivedCounts: mengklamp nilai sumber & membulatkan", () => {
  const list = [stat({ label: "Proyek", source: "projects", value: 0 })];
  const { stats } = applyDerivedCounts(list, { projects: STAT_MAX_VALUE + 500 });
  assert.equal(stats[0].value, STAT_MAX_VALUE);
});

test("validateStats: menolak sumber turunan tak dikenal", () => {
  const bad = [stat({ label: "Proyek", source: "clients" as never })];
  assert.match(validateStats(bad) ?? "", /Sumber angka turunan/);
  assert.equal(validateStats([stat({ label: "Proyek", source: "projects" })]), null);
});

test("skema konten: menerima sumber turunan yang dikenal, menolak yang tidak", () => {
  assert.equal(
    siteContentSchema.safeParse({
      stats: [{ value: 30, label: "Proyek", source: "projects" }],
    }).success,
    true,
  );
  assert.equal(
    siteContentSchema.safeParse({
      stats: [{ value: 30, label: "Klien", source: "clients" }],
    }).success,
    false,
  );
});

test("wiring: endpoint angka turunan dilindungi admin & hanya sumber objektif", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const route = readFileSync(
    resolve(here, "..", "src/app/api/admin/stats/derived/route.ts"),
    "utf8",
  );
  assert.match(route, /requireAdmin\(req\)/);
  assert.match(route, /getProjects\(\)/);
  assert.match(route, /SERVICES\.length/);
  assert.match(route, /getLocationSlugs\(\)\.length/);
  // Tidak boleh menurunkan "Klien Puas"/klaim sosial (hanya jumlah objektif).
  assert.doesNotMatch(route, /counts\.(clients|satisfied)|getClients/);
});