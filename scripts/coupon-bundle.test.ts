import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkBundleRules,
  computeEligibleSubtotal,
  validateCoupon,
  validateCouponForm,
  type ValidatableCoupon,
} from "../src/lib/coupon-pure.ts";

/**
 * Uji aturan KUPON BUNDEL (FASE P3 + `KP-P2`) — `coupon-pure.ts`:
 * - `appliesToSlugs`: keranjang wajib memuat ≥1 produk dari daftar.
 * - `minItems`: minimal jumlah item (qty).
 * - `computeEligibleSubtotal`: diskon bundel hanya atas item yang memenuhi syarat.
 * Jalankan: `npm run test:bundle`
 */

/** Kupon minimal untuk `validateCoupon` (diskonto 10% default). */
function coupon(partial: Partial<ValidatableCoupon> = {}): ValidatableCoupon {
  return {
    active: true,
    minSpend: 0,
    usageCount: 0,
    limitPerUser: 1,
    usedBy: [],
    type: "percent",
    value: 10,
    ...partial,
  };
}

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

/* --------------------- computeEligibleSubtotal (`KP-P2`) -------------------- */

test("computeEligibleSubtotal: tanpa appliesToSlugs → null (pakai subtotal penuh)", () => {
  assert.equal(computeEligibleSubtotal([{ slug: "a", subtotal: 100_000 }], undefined), null);
  assert.equal(computeEligibleSubtotal([{ slug: "a", subtotal: 100_000 }], []), null);
});

test("computeEligibleSubtotal: hanya item yang slug-nya cocok dijumlahkan", () => {
  const items = [
    { slug: "produk-a", subtotal: 100_000 },
    { slug: "produk-b", subtotal: 50_000 },
    { slug: "produk-c", subtotal: 25_000 },
  ];
  assert.equal(computeEligibleSubtotal(items, ["produk-a", "produk-c"]), 125_000);
});

test("computeEligibleSubtotal: fallback price × qty bila subtotal tak ada", () => {
  const items = [
    { slug: "produk-a", price: 30_000, qty: 2 },
    { slug: "produk-b", price: 10_000, qty: 5 },
  ];
  assert.equal(computeEligibleSubtotal(items, ["produk-a"]), 60_000);
});

test("computeEligibleSubtotal: tak ada yang cocok → 0", () => {
  assert.equal(
    computeEligibleSubtotal([{ slug: "x", subtotal: 10_000 }], ["produk-a"]),
    0,
  );
});

/* ------------------ validateCoupon: diskon eligible (`KP-P2`) ---------------- */

test("validateCoupon: diskon bundel hanya atas eligibleSubtotal", () => {
  // 10% — tapi hanya produk-a (Rp100rb) yang memenuhi; produk-b (Rp900rb) diabaikan.
  const r = validateCoupon(coupon({ appliesToSlugs: ["produk-a"], value: 10 }), {
    subtotal: 1_000_000,
    items: [
      { slug: "produk-a", subtotal: 100_000 },
      { slug: "produk-b", subtotal: 900_000 },
    ],
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.discount, 10_000);
});

test("validateCoupon: tanpa items → diskon atas subtotal penuh (backward-compat)", () => {
  const r = validateCoupon(coupon({ appliesToSlugs: ["produk-a"], value: 10 }), {
    subtotal: 1_000_000,
    slugs: ["produk-a"],
    itemCount: 1,
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.discount, 100_000);
});

test("validateCoupon: minSpend tetap diukur terhadap subtotal keranjang penuh", () => {
  // Eligible hanya Rp100rb (< minSpend 500rb) tetapi subtotal keranjang Rp1jt → lolos.
  const ok = validateCoupon(coupon({ appliesToSlugs: ["produk-a"], minSpend: 500_000 }), {
    subtotal: 1_000_000,
    items: [
      { slug: "produk-a", subtotal: 100_000 },
      { slug: "produk-b", subtotal: 900_000 },
    ],
  });
  assert.equal(ok.ok, true);

  // Subtotal keranjang pun di bawah minSpend → ditolak.
  const bad = validateCoupon(coupon({ appliesToSlugs: ["produk-a"], minSpend: 500_000 }), {
    subtotal: 100_000,
    items: [{ slug: "produk-a", subtotal: 100_000 }],
  });
  assert.equal(bad.ok, false);
});

/* ------------------ validateCouponForm: field bundel (`KP-P2`) -------------- */

test("validateCouponForm: appliesToSlugs & minItems valid → ok", () => {
  const r = validateCouponForm({
    code: "BUNDLE10",
    type: "percent",
    value: 10,
    minSpend: 0,
    appliesToSlugs: ["produk-a", "produk-b"],
    minItems: 2,
  });
  assert.deepEqual(r, { ok: true });
});

test("validateCouponForm: slug duplikat ditolak", () => {
  const r = validateCouponForm({
    code: "BUNDLE10",
    type: "percent",
    value: 10,
    minSpend: 0,
    appliesToSlugs: ["produk-a", "produk-a"],
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.errors.appliesToSlugs);
});

test("validateCouponForm: slug kosong ditolak", () => {
  const r = validateCouponForm({
    code: "BUNDLE10",
    type: "percent",
    value: 10,
    minSpend: 0,
    appliesToSlugs: ["produk-a", "   "],
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.errors.appliesToSlugs);
});

test("validateCouponForm: minItems non-bulat / negatif ditolak", () => {
  const base = { code: "BUNDLE10", type: "percent" as const, value: 10, minSpend: 0 };
  assert.equal(validateCouponForm({ ...base, minItems: 1.5 }).ok, false);
  assert.equal(validateCouponForm({ ...base, minItems: -1 }).ok, false);
  assert.equal(validateCouponForm({ ...base, minItems: 0 }).ok, true);
});
