import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBundleRules } from "../src/lib/coupon-rules.ts";

/**
 * Uji aturan KUPON BUNDEL (FASE P3):
 * - `appliesToSlugs`: keranjang wajib memuat ≥1 produk dari daftar.
 * - `minItems`: minimal jumlah item (qty).
 * Jalankan: `npm run test:bundle`
 */

test("tanpa aturan bundel → selalu lolos (kupon umum)", () => {
  assert.deepEqual(checkBundleRules({}, { slugs: ["a"], itemCount: 1 }), {
    ok: true,
  });
  assert.deepEqual(checkBundleRules({}, {}), { ok: true });
});

test("appliesToSlugs cocok → lolos", () => {
  const res = checkBundleRules(
    { appliesToSlugs: ["produk-a", "produk-b"] },
    { slugs: ["produk-b", "produk-c"], itemCount: 1 },
  );
  assert.equal(res.ok, true);
});

test("appliesToSlugs tak cocok → gagal", () => {
  const res = checkBundleRules(
    { appliesToSlugs: ["produk-a"] },
    { slugs: ["produk-x"], itemCount: 1 },
  );
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.reason, /keranjang memuat produk tertentu/i);
});

test("appliesToSlugs tanpa keranjang → gagal (fail-closed)", () => {
  const res = checkBundleRules({ appliesToSlugs: ["produk-a"] }, {});
  assert.equal(res.ok, false);
});

test("minItems terpenuhi → lolos", () => {
  const res = checkBundleRules({ minItems: 3 }, { itemCount: 3 });
  assert.equal(res.ok, true);
});

test("minItems tak terpenuhi → gagal", () => {
  const res = checkBundleRules({ minItems: 2 }, { itemCount: 1 });
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.reason, /minimal 2 item/i);
});

test("kedua aturan: appliesToSlugs dulu, lalu minItems", () => {
  // Slug cocok tapi item kurang → gagal karena minItems.
  const res = checkBundleRules(
    { appliesToSlugs: ["a"], minItems: 2 },
    { slugs: ["a"], itemCount: 1 },
  );
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.reason, /minimal 2 item/i);
});

test("kedua aturan terpenuhi → lolos", () => {
  const res = checkBundleRules(
    { appliesToSlugs: ["a"], minItems: 2 },
    { slugs: ["a", "b"], itemCount: 4 },
  );
  assert.equal(res.ok, true);
});

test("minItems 0 dianggap tanpa syarat", () => {
  const res = checkBundleRules({ minItems: 0 }, { itemCount: 0 });
  assert.equal(res.ok, true);
});
