import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePromoStatus,
  countdownLabel,
  promoRequirement,
  tierSummary,
  ENDING_SOON_MS,
} from "../src/lib/promo-pure.ts";

/**
 * Uji logika promo publik murni (C7).
 * Jalankan: `npm run test:promo`
 */

const NOW = new Date("2026-11-10T10:00:00.000Z").getTime();

test("computePromoStatus: tanpa tanggal → aktif", () => {
  assert.equal(computePromoStatus(undefined, undefined, NOW), "aktif");
});

test("computePromoStatus: startsAt di masa depan → akan_datang", () => {
  assert.equal(
    computePromoStatus("2026-12-01T00:00:00Z", undefined, NOW),
    "akan_datang",
  );
});

test("computePromoStatus: endsAt ≤ 3 hari → berakhir_segera", () => {
  const soon = new Date(NOW + 2 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(computePromoStatus(undefined, soon, NOW), "berakhir_segera");
});

test("computePromoStatus: endsAt > 3 hari → aktif", () => {
  const later = new Date(NOW + 10 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(computePromoStatus(undefined, later, NOW), "aktif");
});

test("computePromoStatus: endsAt sudah lewat → berakhir", () => {
  const past = new Date(NOW - 1000).toISOString();
  assert.equal(computePromoStatus(undefined, past, NOW), "berakhir");
});

test("computePromoStatus: ambang kustom dihormati", () => {
  const in5d = new Date(NOW + 5 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(computePromoStatus(undefined, in5d, NOW, ENDING_SOON_MS), "aktif");
  assert.equal(computePromoStatus(undefined, in5d, NOW, 7 * 24 * 60 * 60 * 1000), "berakhir_segera");
});

test("countdownLabel: hari/jam/menit", () => {
  assert.equal(countdownLabel(new Date(NOW + 3 * 86_400_000).toISOString(), NOW), "3 hari lagi");
  assert.equal(countdownLabel(new Date(NOW + (2 * 3_600_000 + 15 * 60_000)).toISOString(), NOW), "2j 15m lagi");
  assert.equal(countdownLabel(new Date(NOW + 45 * 60_000).toISOString(), NOW), "45m lagi");
});

test("countdownLabel: endsAt lewat → 0m lagi (tak negatif)", () => {
  assert.equal(countdownLabel(new Date(NOW - 60_000).toISOString(), NOW), "0m lagi");
});

test("promoRequirement: gabung min belanja + bundel", () => {
  assert.equal(promoRequirement({ minSpend: 0 }), undefined);
  assert.equal(promoRequirement({ minSpend: 50_000 }), "Min. Rp50.000");
  assert.equal(
    promoRequirement({ minSpend: 50_000, minItems: 2, appliesToSlugs: ["a", "b"] }),
    "Min. Rp50.000 · min 2 item · 2 produk tertentu",
  );
});

test("tierSummary: persen & nominal", () => {
  const s = tierSummary([
    { minSpend: 50_000, value: 5 },
    { minSpend: 200_000, value: 10 },
    { minSpend: 500_000, value: 25_000, kind: "amount" },
  ]);
  assert.ok(s?.includes("≥50rb: 5%"));
  assert.ok(s?.includes("≥200rb: 10%"));
  assert.ok(s?.includes("≥500rb: Rp25.000"));
});

test("tierSummary: kosong → undefined", () => {
  assert.equal(tierSummary(undefined), undefined);
  assert.equal(tierSummary([]), undefined);
});
