import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDiscount,
  pickTier,
  tieredDiscount,
  validateCoupon,
  pickBestCoupon,
  jakartaDateKey,
  type ValidatableCoupon,
} from "../src/lib/coupon-pure.ts";

/**
 * Uji logika kupon LANJUTAN (upgrade C1): tipe `tiered`, single-use, assigned,
 * audience, kuota harian, dan kupon otomatis (pickBestCoupon).
 * Jalankan: `npm run test:coupon-engine`
 */

const NOW = new Date("2026-11-01T10:00:00.000Z");

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

/* ------------------------------- tiered ---------------------------------- */

test("pickTier: pilih tier terbesar yang ≤ subtotal", () => {
  const tiers = [
    { minSpend: 100_000, value: 5 },
    { minSpend: 250_000, value: 10 },
    { minSpend: 500_000, value: 15 },
  ];
  assert.equal(pickTier(tiers, 90_000), null);
  assert.equal(pickTier(tiers, 100_000)?.value, 5);
  assert.equal(pickTier(tiers, 300_000)?.value, 10);
  assert.equal(pickTier(tiers, 999_999)?.value, 15);
});

test("pickTier: tak ada tier / kosong → null", () => {
  assert.equal(pickTier(undefined, 100_000), null);
  assert.equal(pickTier([], 100_000), null);
});

test("tieredDiscount: hitung persen tier", () => {
  const tiers = [
    { minSpend: 100_000, value: 10 },
    { minSpend: 200_000, value: 20 },
  ];
  assert.equal(tieredDiscount(tiers, 250_000), 50_000); // 20% dari 250k
  assert.equal(tieredDiscount(tiers, 150_000), 15_000); // 10% dari 150k
});

test("tieredDiscount: nominal tier (kind amount)", () => {
  const tiers = [{ minSpend: 100_000, value: 25_000, kind: "amount" as const }];
  assert.equal(tieredDiscount(tiers, 300_000), 25_000);
});

test("tieredDiscount: maxDiscount tier dihormati", () => {
  const tiers = [{ minSpend: 100_000, value: 50, maxDiscount: 30_000 }];
  assert.equal(tieredDiscount(tiers, 500_000), 30_000); // 50% = 250k → cap 30k
});

test("tieredDiscount: subtotal di bawah tier terkecil → 0", () => {
  const tiers = [{ minSpend: 100_000, value: 10 }];
  assert.equal(tieredDiscount(tiers, 50_000), 0);
});

test("computeDiscount: type tiered memakai tiers", () => {
  const c = coupon({ type: "tiered", value: 0, tiers: [{ minSpend: 100_000, value: 12 }] });
  assert.equal(computeDiscount(c, 100_000), 12_000);
});

test("computeDiscount: tiered diskon dibatasi ≤ subtotal", () => {
  const c = coupon({
    type: "tiered",
    value: 0,
    tiers: [{ minSpend: 0, value: 100, kind: "amount", maxDiscount: undefined }],
  });
  // nominal 100 terhadap subtotal 50 → dibatasi 50
  assert.equal(computeDiscount(c, 50), 50);
});

/* ------------------------------- single-use ------------------------------ */

test("validateCoupon: single-use yang sudah terpakai → ditolak", () => {
  const c = coupon({ singleUse: true });
  const r = validateCoupon(c, { subtotal: 100_000, now: NOW, singleUseConsumed: true });
  assert.equal(r.ok, false);
});

test("validateCoupon: single-use belum terpakai → ok", () => {
  const c = coupon({ singleUse: true });
  const r = validateCoupon(c, { subtotal: 100_000, now: NOW, singleUseConsumed: false });
  assert.equal(r.ok, true);
});

/* ------------------------------- assigned -------------------------------- */

test("validateCoupon: assignedUid tidak cocok → ditolak", () => {
  const c = coupon({ assignedUid: "u-owner" });
  const r = validateCoupon(c, { subtotal: 100_000, now: NOW, uid: "u-lain" });
  assert.equal(r.ok, false);
});

test("validateCoupon: assignedUid cocok → ok", () => {
  const c = coupon({ assignedUid: "u-owner" });
  const r = validateCoupon(c, { subtotal: 100_000, now: NOW, uid: "u-owner" });
  assert.equal(r.ok, true);
});

test("validateCoupon: assignedEmail beda case/tak cocok → ditolak", () => {
  const c = coupon({ assignedEmail: "budi@mail.com" });
  const r = validateCoupon(c, {
    subtotal: 100_000,
    now: NOW,
    buyerEmail: "lain@mail.com",
  });
  assert.equal(r.ok, false);
});

test("validateCoupon: assignedEmail cocok (case-insensitive) → ok", () => {
  const c = coupon({ assignedEmail: "budi@mail.com" });
  const r = validateCoupon(c, {
    subtotal: 100_000,
    now: NOW,
    buyerEmail: "BUDI@mail.com",
  });
  assert.equal(r.ok, true);
});

/* ------------------------------- audience -------------------------------- */

test("validateCoupon: audience 'baru' ditolak bila sudah pernah beli", () => {
  const c = coupon({ audience: "baru" });
  const r = validateCoupon(c, { subtotal: 100_000, now: NOW, isFirstPurchase: false });
  assert.equal(r.ok, false);
});

test("validateCoupon: audience 'baru' ok bila pembeli pertama", () => {
  const c = coupon({ audience: "baru" });
  const r = validateCoupon(c, { subtotal: 100_000, now: NOW, isFirstPurchase: true });
  assert.equal(r.ok, true);
});

test("validateCoupon: audience 'lama' ditolak bila pembeli pertama", () => {
  const c = coupon({ audience: "lama" });
  const r = validateCoupon(c, { subtotal: 100_000, now: NOW, isFirstPurchase: true });
  assert.equal(r.ok, false);
});

test("validateCoupon: audience 'semua' (default) selalu lolos syarat audience", () => {
  const c = coupon({});
  assert.equal(
    validateCoupon(c, { subtotal: 100_000, now: NOW, isFirstPurchase: true }).ok,
    true,
  );
  assert.equal(
    validateCoupon(c, { subtotal: 100_000, now: NOW, isFirstPurchase: false }).ok,
    true,
  );
});

/* ------------------------------- perDayLimit ----------------------------- */

test("validateCoupon: kuota harian tercapai → ditolak", () => {
  const c = coupon({ perDayLimit: 3 });
  const r = validateCoupon(c, { subtotal: 100_000, now: NOW, dayUsageCount: 3 });
  assert.equal(r.ok, false);
});

test("validateCoupon: kuota harian belum tercapai → ok", () => {
  const c = coupon({ perDayLimit: 3 });
  const r = validateCoupon(c, { subtotal: 100_000, now: NOW, dayUsageCount: 2 });
  assert.equal(r.ok, true);
});

test("validateCoupon: perDayLimit kosong → tanpa batas harian", () => {
  const c = coupon({});
  const r = validateCoupon(c, { subtotal: 100_000, now: NOW, dayUsageCount: 9999 });
  assert.equal(r.ok, true);
});

/* ------------------------------- pickBestCoupon -------------------------- */

test("pickBestCoupon: pilih diskon terbesar yang valid", () => {
  const list = [
    coupon({ type: "percent", value: 5 }), // 5k
    coupon({ type: "percent", value: 20 }), // 20k
    coupon({ type: "amount", value: 15_000 }), // 15k
  ];
  const best = pickBestCoupon(list, { subtotal: 100_000, now: NOW });
  assert.equal(best?.discount, 20_000);
});

test("pickBestCoupon: lewati kupon tak valid (habis/kedaluwarsa)", () => {
  const list = [
    coupon({ type: "percent", value: 30, usageLimit: 1, usageCount: 1 }), // habis
    coupon({ type: "percent", value: 10, endsAt: "2020-01-01T00:00:00Z" }), // kedaluwarsa
    coupon({ type: "amount", value: 5_000 }), // valid
  ];
  const best = pickBestCoupon(list, { subtotal: 100_000, now: NOW });
  assert.equal(best?.discount, 5_000);
});

test("pickBestCoupon: tak ada yang valid → null", () => {
  const list = [coupon({ active: false }), coupon({ type: "amount", value: 0 })];
  assert.equal(pickBestCoupon(list, { subtotal: 100_000, now: NOW }), null);
});

test("pickBestCoupon: menghormati minSpend & bundel", () => {
  const list = [
    coupon({ type: "percent", value: 50, minSpend: 500_000 }), // tak memenuhi
    coupon({ type: "percent", value: 10, appliesToSlugs: ["x"] }), // slug tak ada
    coupon({ type: "amount", value: 7_000 }), // valid
  ];
  const best = pickBestCoupon(list, {
    subtotal: 100_000,
    now: NOW,
    slugs: ["a", "b"],
    itemCount: 2,
  });
  assert.equal(best?.discount, 7_000);
});

test("pickBestCoupon: hasil menyertakan objek kupon pemenang", () => {
  const winner = coupon({ type: "percent", value: 25 });
  const best = pickBestCoupon([coupon({ type: "percent", value: 5 }), winner], {
    subtotal: 100_000,
    now: NOW,
  });
  assert.equal(best?.coupon, winner);
});

/* ------------------------------- jakartaDateKey -------------------------- */

test("jakartaDateKey: memakai zona Asia/Jakarta (UTC+7)", () => {
  // 2026-11-01T18:30:00Z = 2026-11-02T01:30 WIB → sudah ganti hari.
  assert.equal(jakartaDateKey(new Date("2026-11-01T18:30:00Z")), "2026-11-02");
  // 2026-11-01T16:59:00Z = 2026-11-01T23:59 WIB → masih hari yang sama.
  assert.equal(jakartaDateKey(new Date("2026-11-01T16:59:00Z")), "2026-11-01");
});

test("jakartaDateKey: tengah malam UTC belum ganti hari WIB", () => {
  assert.equal(jakartaDateKey(new Date("2026-03-10T00:00:00Z")), "2026-03-10");
});
