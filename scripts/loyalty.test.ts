import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tierFor,
  pointsForSpend,
  findRedeemPackage,
  checkRedeem,
  tierProgress,
  normalizePoints,
  TIER_THRESHOLDS,
  REDEEM_PACKAGES,
} from "../src/lib/loyalty-pure.ts";

/**
 * Uji aturan program loyalitas/poin (Tema 2.1, FASE R1).
 * Jalankan: `npm run test:loyalty`
 */

test("tierFor: ambang tier", () => {
  assert.equal(tierFor(0), "bronze");
  assert.equal(tierFor(499), "bronze");
  assert.equal(tierFor(500), "silver");
  assert.equal(tierFor(1999), "silver");
  assert.equal(tierFor(2000), "gold");
  assert.equal(tierFor(99999), "gold");
});

test("pointsForSpend: 1 poin per Rp10.000", () => {
  assert.equal(pointsForSpend(0), 0);
  assert.equal(pointsForSpend(9999), 0);
  assert.equal(pointsForSpend(10000), 1);
  assert.equal(pointsForSpend(149000), 14);
  assert.equal(pointsForSpend(150000), 15);
});

test("pointsForSpend: unit kustom & nilai tak valid", () => {
  assert.equal(pointsForSpend(50000, 5000), 10);
  assert.equal(pointsForSpend(-100), 0);
  assert.equal(pointsForSpend(NaN), 0);
  assert.equal(pointsForSpend(10000, 0), 0);
});

test("findRedeemPackage: paket valid & tidak", () => {
  assert.ok(findRedeemPackage(REDEEM_PACKAGES[0].points));
  assert.equal(findRedeemPackage(123), null);
});

test("checkRedeem: saldo cukup → ok", () => {
  const r = checkRedeem(300, 250);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value, 25000);
});

test("checkRedeem: saldo kurang → gagal", () => {
  const r = checkRedeem(50, 100);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, /belum cukup/i);
});

test("checkRedeem: paket invalid → gagal", () => {
  const r = checkRedeem(10000, 999);
  assert.equal(r.ok, false);
});

test("tierProgress: bronze → silver", () => {
  // bronze: 0..; silver: 500. lifetime 250 → separuh jalan.
  const p = tierProgress(250);
  assert.equal(p.tier, "bronze");
  assert.equal(p.next, "silver");
  assert.equal(p.toNext, 250);
  assert.equal(p.progress, 0.5);
});

test("tierProgress: gold → tidak ada berikutnya", () => {
  const p = tierProgress(TIER_THRESHOLDS.gold);
  assert.equal(p.tier, "gold");
  assert.equal(p.next, null);
  assert.equal(p.progress, 1);
});

test("normalizePoints: jepit ≥ 0 & bulatkan", () => {
  assert.equal(normalizePoints(12.9), 12);
  assert.equal(normalizePoints(-5), 0);
  assert.equal(normalizePoints("x"), 0);
  assert.equal(normalizePoints(undefined), 0);
});
