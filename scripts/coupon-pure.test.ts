import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDiscount,
  validateCoupon,
  validateCouponForm,
  aggregateCouponStats,
  type ValidatableCoupon,
} from "../src/lib/coupon-pure.ts";

/**
 * Uji logika murni KUPON (audit K5) — perhitungan diskon & seluruh aturan
 * validasi. Jalankan: `npm run test:coupon`
 */

const NOW = new Date("2026-10-11T10:00:00.000Z");

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

/* ------------------------------- computeDiscount ------------------------------- */

test("computeDiscount: persen dasar", () => {
  assert.equal(computeDiscount(coupon({ type: "percent", value: 10 }), 100_000), 10_000);
});

test("computeDiscount: persen dibatasi maxDiscount", () => {
  assert.equal(
    computeDiscount(coupon({ type: "percent", value: 50, maxDiscount: 20_000 }), 100_000),
    20_000,
  );
});

test("computeDiscount: nominal", () => {
  assert.equal(computeDiscount(coupon({ type: "amount", value: 25_000 }), 100_000), 25_000);
});

test("computeDiscount: tak melebihi subtotal", () => {
  assert.equal(computeDiscount(coupon({ type: "amount", value: 200_000 }), 50_000), 50_000);
});

test("computeDiscount: subtotal 0 → 0", () => {
  assert.equal(computeDiscount(coupon({ type: "percent", value: 10 }), 0), 0);
});

test("computeDiscount: dibulatkan ke bawah (floor)", () => {
  // 33% dari 100 = 33
  assert.equal(computeDiscount(coupon({ type: "percent", value: 33 }), 100), 33);
  // 15% dari 101 = 15.15 → 15
  assert.equal(computeDiscount(coupon({ type: "percent", value: 15 }), 101), 15);
});

test("computeDiscount: persen 100 = subtotal penuh", () => {
  assert.equal(computeDiscount(coupon({ type: "percent", value: 100 }), 80_000), 80_000);
});

/* ------------------------------- validateCoupon -------------------------------- */

test("validateCoupon: null → tidak ditemukan", () => {
  const r = validateCoupon(null, { subtotal: 100_000, now: NOW });
  assert.equal(r.ok, false);
});

test("validateCoupon: nonaktif ditolak", () => {
  const r = validateCoupon(coupon({ active: false }), { subtotal: 100_000, now: NOW });
  assert.equal(r.ok, false);
});

test("validateCoupon: belum berlaku (startsAt di masa depan)", () => {
  const r = validateCoupon(coupon({ startsAt: "2026-11-01T00:00:00Z" }), {
    subtotal: 100_000,
    now: NOW,
  });
  assert.equal(r.ok, false);
});

test("validateCoupon: kedaluwarsa (endsAt di masa lalu)", () => {
  const r = validateCoupon(coupon({ endsAt: "2026-01-01T00:00:00Z" }), {
    subtotal: 100_000,
    now: NOW,
  });
  assert.equal(r.ok, false);
});

test("validateCoupon: dalam rentang tanggal → ok", () => {
  const r = validateCoupon(
    coupon({ startsAt: "2026-01-01T00:00:00Z", endsAt: "2026-12-31T00:00:00Z" }),
    { subtotal: 100_000, now: NOW },
  );
  assert.equal(r.ok, true);
});

test("validateCoupon: minSpend tak terpenuhi", () => {
  const r = validateCoupon(coupon({ minSpend: 200_000 }), {
    subtotal: 100_000,
    now: NOW,
  });
  assert.equal(r.ok, false);
});

test("validateCoupon: minSpend terpenuhi → ok", () => {
  const r = validateCoupon(coupon({ minSpend: 50_000 }), {
    subtotal: 100_000,
    now: NOW,
  });
  assert.equal(r.ok, true);
});

test("validateCoupon: kuota habis ditolak", () => {
  const r = validateCoupon(coupon({ usageLimit: 5, usageCount: 5 }), {
    subtotal: 100_000,
    now: NOW,
  });
  assert.equal(r.ok, false);
});

test("validateCoupon: kuota tersisa → ok", () => {
  const r = validateCoupon(coupon({ usageLimit: 5, usageCount: 4 }), {
    subtotal: 100_000,
    now: NOW,
  });
  assert.equal(r.ok, true);
});

test("validateCoupon: limitPerUser tercapai (via userUsageCount)", () => {
  const r = validateCoupon(coupon({ limitPerUser: 1 }), {
    subtotal: 100_000,
    now: NOW,
    uid: "u1",
    userUsageCount: 1,
  });
  assert.equal(r.ok, false);
});

test("validateCoupon: limitPerUser 0 = tanpa batas per user", () => {
  const r = validateCoupon(coupon({ limitPerUser: 0 }), {
    subtotal: 100_000,
    now: NOW,
    uid: "u1",
    userUsageCount: 99,
  });
  assert.equal(r.ok, true);
});

test("validateCoupon: fallback usedBy bila userUsageCount tak diberikan", () => {
  const r = validateCoupon(coupon({ limitPerUser: 1, usedBy: ["u1"] }), {
    subtotal: 100_000,
    now: NOW,
    uid: "u1",
  });
  assert.equal(r.ok, false);
});

test("validateCoupon: kupon bundel — syarat slug tak terpenuhi", () => {
  const r = validateCoupon(coupon({ appliesToSlugs: ["produk-a"] }), {
    subtotal: 100_000,
    now: NOW,
    slugs: ["produk-b"],
    itemCount: 1,
  });
  assert.equal(r.ok, false);
});

test("validateCoupon: kupon bundel — syarat slug terpenuhi", () => {
  const r = validateCoupon(coupon({ appliesToSlugs: ["produk-a"] }), {
    subtotal: 100_000,
    now: NOW,
    slugs: ["produk-a", "produk-b"],
    itemCount: 2,
  });
  assert.equal(r.ok, true);
});

test("validateCoupon: kupon bundel — minItems tak terpenuhi", () => {
  const r = validateCoupon(coupon({ minItems: 3 }), {
    subtotal: 100_000,
    now: NOW,
    slugs: ["a"],
    itemCount: 2,
  });
  assert.equal(r.ok, false);
});

test("validateCoupon: diskon 0 (nominal 0) ditolak", () => {
  const r = validateCoupon(coupon({ type: "amount", value: 0 }), {
    subtotal: 100_000,
    now: NOW,
  });
  assert.equal(r.ok, false);
});

test("validateCoupon: sukses mengembalikan objek kupon & diskon", () => {
  const c = coupon({ type: "percent", value: 10 });
  const r = validateCoupon(c, { subtotal: 100_000, now: NOW });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.discount, 10_000);
    assert.equal(r.coupon, c); // referensi objek yang sama
  }
});

/* ------------------------------ validateCouponForm ----------------------------- */

function form(partial: Partial<Parameters<typeof validateCouponForm>[0]> = {}) {
  return {
    code: "PROMO10",
    type: "percent" as const,
    value: 10,
    minSpend: 0,
    ...partial,
  };
}

test("validateCouponForm: form valid → ok", () => {
  assert.deepEqual(validateCouponForm(form()), { ok: true });
});

test("validateCouponForm: kode terlalu pendek", () => {
  const r = validateCouponForm(form({ code: "AB" }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.errors.code);
});

test("validateCouponForm: kode dengan spasi/simbol ditolak", () => {
  const r = validateCouponForm(form({ code: "PROMO 10!" }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.errors.code);
});

test("validateCouponForm: persen di luar 1–100", () => {
  assert.equal(validateCouponForm(form({ value: 0 })).ok, false);
  assert.equal(validateCouponForm(form({ value: 101 })).ok, false);
  assert.equal(validateCouponForm(form({ value: 100 })).ok, true);
  assert.equal(validateCouponForm(form({ value: 1 })).ok, true);
});

test("validateCouponForm: nominal harus > 0", () => {
  assert.equal(validateCouponForm(form({ type: "amount", value: 0 })).ok, false);
  assert.equal(validateCouponForm(form({ type: "amount", value: 5000 })).ok, true);
});

test("validateCouponForm: minSpend negatif ditolak", () => {
  assert.equal(validateCouponForm(form({ minSpend: -1 })).ok, false);
});

test("validateCouponForm: maxDiscount negatif ditolak", () => {
  assert.equal(validateCouponForm(form({ maxDiscount: -5 })).ok, false);
  assert.equal(validateCouponForm(form({ maxDiscount: 0 })).ok, true);
});

test("validateCouponForm: usageLimit < 1 ditolak", () => {
  assert.equal(validateCouponForm(form({ usageLimit: 0 })).ok, false);
  assert.equal(validateCouponForm(form({ usageLimit: 1 })).ok, true);
});

test("validateCouponForm: limitPerUser 0 = tanpa batas (valid)", () => {
  assert.equal(validateCouponForm(form({ limitPerUser: 0 })).ok, true);
  assert.equal(validateCouponForm(form({ limitPerUser: -1 })).ok, false);
});

test("validateCouponForm: rentang tanggal (mulai harus < berakhir)", () => {
  const bad = validateCouponForm(
    form({ startsAt: "2026-02-01T00:00:00Z", endsAt: "2026-01-01T00:00:00Z" }),
  );
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.ok(bad.errors.endsAt);

  const good = validateCouponForm(
    form({ startsAt: "2026-01-01T00:00:00Z", endsAt: "2026-02-01T00:00:00Z" }),
  );
  assert.equal(good.ok, true);
});

test("validateCouponForm: value NaN ditolak", () => {
  assert.equal(validateCouponForm(form({ value: NaN })).ok, false);
});

/* ------------------------------ aggregateCouponStats --------------------------- */

test("aggregateCouponStats: kelompokkan per couponId + hitung aktif/batal", () => {
  const stats = aggregateCouponStats([
    { status: "dibayar", coupon: { couponId: "c1", code: "PROMO", discount: 10_000 } },
    { status: "selesai", coupon: { couponId: "c1", code: "PROMO", discount: 5_000 } },
    { status: "dibatalkan", coupon: { couponId: "c1", code: "PROMO", discount: 7_000 } },
  ]);
  const c1 = stats.c1;
  assert.equal(c1.orderCount, 3);
  assert.equal(c1.activeOrders, 2);
  assert.equal(c1.cancelledOrders, 1);
  assert.equal(c1.totalDiscount, 15_000); // hanya order aktif
});

test("aggregateCouponStats: order lama tanpa couponId → key code:<KODE>", () => {
  const stats = aggregateCouponStats([
    { status: "dibayar", coupon: { code: "LAMA", discount: 1_000 } },
    { status: "dibayar", coupon: { code: "LAMA", discount: 2_000 } },
  ]);
  assert.equal(stats["code:LAMA"].activeOrders, 2);
  assert.equal(stats["code:LAMA"].totalDiscount, 3_000);
});

test("aggregateCouponStats: abaikan baris tanpa kupon / kupon null", () => {
  const stats = aggregateCouponStats([
    { status: "dibayar", coupon: null },
    { status: "dibayar" },
    { status: "dibayar", coupon: { couponId: "c1", code: "X", discount: 1_000 } },
  ]);
  assert.deepEqual(Object.keys(stats), ["c1"]);
});

test("aggregateCouponStats: discount tak valid dianggap 0", () => {
  const stats = aggregateCouponStats([
    {
      status: "selesai",
      coupon: { couponId: "c1", code: "X", discount: Number.NaN },
    },
  ]);
  assert.equal(stats.c1.totalDiscount, 0);
  assert.equal(stats.c1.activeOrders, 1);
});

test("aggregateCouponStats: kupon berbeda dipisah", () => {
  const stats = aggregateCouponStats([
    { status: "dibayar", coupon: { couponId: "a", code: "A", discount: 1_000 } },
    { status: "dibayar", coupon: { couponId: "b", code: "B", discount: 2_000 } },
  ]);
  assert.equal(stats.a.totalDiscount, 1_000);
  assert.equal(stats.b.totalDiscount, 2_000);
});
