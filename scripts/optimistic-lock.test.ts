import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  VERSION_FIELD,
  VERSION_CONFLICT_CODE,
  normalizeExpectedVersion,
  readVersion,
  checkOptimisticVersion,
  newVersionToken,
  VersionConflictError,
} from "../src/lib/optimistic-lock-pure.ts";

/**
 * Regresi ADM-11: tanpa optimistic concurrency, dua admin yang mengedit
 * settings/konten/produk/proyek bisa saling menimpa tanpa peringatan.
 *
 * Solusi: field `version` per dokumen + `expectedVersion` dari klien; server
 * menulis dalam transaksi & menolak (409) bila versi sudah berubah.
 *
 * Uji logika murni + wiring. Jalankan: `npm run test:optimistic-lock`
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

/* ------------------------- normalizeExpectedVersion ------------------------- */

test("normalizeExpectedVersion: string non-kosong dipangkas", () => {
  assert.equal(normalizeExpectedVersion("  abc-123  "), "abc-123");
  assert.equal(normalizeExpectedVersion("v1"), "v1");
});

test("normalizeExpectedVersion: kosong/tak valid → null", () => {
  assert.equal(normalizeExpectedVersion(undefined), null);
  assert.equal(normalizeExpectedVersion(null), null);
  assert.equal(normalizeExpectedVersion(""), null);
  assert.equal(normalizeExpectedVersion("   "), null);
  assert.equal(normalizeExpectedVersion(42), null);
  assert.equal(normalizeExpectedVersion({}), null);
});

test("normalizeExpectedVersion: dipotong pada batas aman", () => {
  const long = "x".repeat(500);
  assert.equal(normalizeExpectedVersion(long)!.length, 128);
});

/* --------------------------------- readVersion ------------------------------ */

test("readVersion: membaca field version dengan aman", () => {
  assert.equal(readVersion({ [VERSION_FIELD]: "abc" }), "abc");
  assert.equal(readVersion({ [VERSION_FIELD]: "  abc " }), "abc");
  assert.equal(readVersion({ [VERSION_FIELD]: "" }), null);
  assert.equal(readVersion({ [VERSION_FIELD]: 123 }), null);
  assert.equal(readVersion({}), null);
  assert.equal(readVersion(null), null);
  assert.equal(readVersion("not-an-object"), null);
});

/* ---------------------------- checkOptimisticVersion ------------------------ */

test("checkOptimisticVersion: expected absen → tanpa pemeriksaan (kompatibel)", () => {
  assert.deepEqual(checkOptimisticVersion("server-v1", undefined), { ok: true });
  assert.deepEqual(checkOptimisticVersion("server-v1", null), { ok: true });
  assert.deepEqual(checkOptimisticVersion("server-v1", ""), { ok: true });
});

test("checkOptimisticVersion: versi cocok → ok", () => {
  assert.deepEqual(checkOptimisticVersion("v1", "v1"), { ok: true });
  assert.deepEqual(checkOptimisticVersion("  v1 ", " v1 "), { ok: true });
});

test("checkOptimisticVersion: versi tak cocok → konflik", () => {
  const r = checkOptimisticVersion("v2", "v1");
  assert.equal(r.ok, false);
  if (r.ok) throw new Error("harus konflik");
  assert.equal(r.conflict.code, VERSION_CONFLICT_CODE);
  assert.equal(r.conflict.current, "v2");
  assert.equal(r.conflict.expected, "v1");
});

test("checkOptimisticVersion: dokumen belum ada + expected ada → konflik", () => {
  const r = checkOptimisticVersion(null, "v1");
  assert.equal(r.ok, false);
  if (r.ok) throw new Error("harus konflik");
  assert.equal(r.conflict.current, null);
});

/* ------------------------------- newVersionToken ---------------------------- */

test("newVersionToken: non-kosong & (praktis) unik", () => {
  const a = newVersionToken();
  const b = newVersionToken();
  assert.ok(a.length > 0);
  assert.notEqual(a, b);
});

/* ----------------------------- VersionConflictError ------------------------- */

test("VersionConflictError: membawa kode & versi terkini", () => {
  const err = new VersionConflictError("v9");
  assert.ok(err instanceof Error);
  assert.equal(err.code, VERSION_CONFLICT_CODE);
  assert.equal(err.currentVersion, "v9");
  assert.match(err.message, /Muat ulang/i);
});

/* ---------------------------------- Wiring ---------------------------------- */

test("ADM-11: writeVersioned memakai transaksi & melempar VersionConflictError", () => {
  const src = read("src/lib/optimistic-lock.ts");
  assert.match(src, /checkOptimisticVersion/);
  assert.match(src, /db\.runTransaction/);
  assert.match(src, /throw new VersionConflictError\(check\.conflict\.current\)/);
  // Baca dulu, tulis kemudian (aturan transaksi Firestore).
  assert.match(src, /const snap = await tx\.get\(ref\)/);
  assert.match(src, /tx\.set\(ref, payload/);
});

test("ADM-11: settings memakai writeVersioned + expectedVersion", () => {
  const src = read("src/lib/settings.ts");
  assert.match(src, /writeVersioned/);
  assert.match(src, /expectedVersion/);
  assert.match(src, /readSiteSettingsDoc/);
  assert.match(src, /readVersion\(snap\.data\(\)\)/);

  const route = read("src/app/api/admin/settings/route.ts");
  assert.match(route, /body\.expectedVersion/);
  assert.match(route, /saveSiteSettings\(settings, check\.email, expectedVersion\)/);
  assert.match(route, /err instanceof VersionConflictError/);
  assert.match(route, /status: 409/);
  assert.match(route, /version/);
});

test("ADM-11: konten memakai writeVersioned + expectedVersion", () => {
  const src = read("src/lib/site-content.ts");
  assert.match(src, /writeVersioned/);
  assert.match(src, /readSiteContentDoc/);

  const route = read("src/app/api/admin/content/route.ts");
  assert.match(route, /expectedVersion/);
  assert.match(route, /saveSiteContent\(content, check\.email, expectedVersion\)/);
  assert.match(route, /err instanceof VersionConflictError/);
  assert.match(route, /status: 409/);
});

test("ADM-11: produk & proyek memperbarui dengan transaksi + versi", () => {
  for (const [lib, route] of [
    ["src/lib/products.ts", "src/app/api/admin/products/route.ts"],
    ["src/lib/projects.ts", "src/app/api/admin/projects/route.ts"],
  ]) {
    const src = read(lib);
    assert.match(src, /writeVersioned/, `${lib} harus memakai writeVersioned`);
    assert.match(src, /expectedVersion/, `${lib} harus menerima expectedVersion`);
    assert.match(src, /readVersion/, `${lib} harus membaca versi saat list`);
    assert.match(src, /newVersionToken/, `${lib} harus memberi versi saat create`);

    const r = read(route);
    assert.match(r, /expectedVersion/, `${route} harus membaca expectedVersion`);
    assert.match(r, /VersionConflictError/, `${route} harus menangani konflik`);
    assert.match(r, /status: 409/, `${route} harus membalas 409`);
  }
});

test("ADM-11: klien mengirim expectedVersion & menyimpan versi baru", () => {
  const api = read("src/lib/admin-api.ts");
  assert.match(api, /saveSettings\(\s*settings: SiteSettings,\s*version/);
  assert.match(api, /expectedVersion/);
  assert.match(api, /version: string \| null/);

  const content = read("src/lib/admin-content-api.ts");
  assert.match(content, /saveSiteContent\(/);
  assert.match(content, /expectedVersion/);

  // Form/hook meneruskan versi dari fetch ke save.
  for (const file of [
    "src/components/admin/settings/settings-kontak.tsx",
    "src/components/admin/settings/settings-seo.tsx",
    "src/components/admin/settings/settings-notifikasi.tsx",
    "src/components/admin/settings/settings-lanjutan.tsx",
  ]) {
    const src = read(file);
    assert.match(src, /setVersion\(data\.version\)/, `${file} harus menyimpan versi`);
    assert.match(src, /saveSettings\(settings, version\)/, `${file} harus mengirim versi`);
  }

  const hook = read("src/components/admin/use-site-content.ts");
  assert.match(hook, /saveSiteContent\(next, version\)/);
  assert.match(hook, /setVersion\(saved\.version\)/);

  // Manager produk/proyek mengirim versi saat mengubah (bukan saat buat).
  for (const file of [
    "src/components/admin/products-manager.tsx",
    "src/components/admin/projects-manager.tsx",
  ]) {
    const src = read(file);
    assert.match(src, /editingVersion/, `${file} harus melacak versi`);
    assert.match(src, /expectedVersion: isNew \? undefined : editingVersion/);
  }
});
