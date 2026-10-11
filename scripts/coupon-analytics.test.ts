import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeCouponAnalytics,
  computeCampaignsGlobal,
  dayKeyJakarta,
  formatPercent,
  formatRoi,
  type CouponAnalyticsRow,
} from "../src/lib/coupon-analytics-pure.ts";

/**
 * Uji analitik kupon murni (C6/K10).
 * Jalankan: `npm run test:coupon-analytics`
 */

function row(partial: Partial<CouponAnalyticsRow> = {}): CouponAnalyticsRow {
  return {
    status: "selesai",
    total: 100_000,
    createdAt: "2026-11-01T03:00:00.000Z",
    coupon: { code: "PROMO", couponId: "c1", discount: 10_000 },
    ...partial,
  };
}

test("dayKeyJakarta: konversi zona Asia/Jakarta", () => {
  assert.equal(dayKeyJakarta("2026-11-01T18:30:00.000Z"), "2026-11-02");
  assert.equal(dayKeyJakarta("2026-11-01T16:59:00.000Z"), "2026-11-01");
});

test("computeCouponAnalytics: kosong → semua nol", () => {
  const a = computeCouponAnalytics([]);
  assert.equal(a.windowOrders, 0);
  assert.equal(a.couponOrders, 0);
  assert.equal(a.conversionRate, 0);
  assert.equal(a.roi, 0);
  assert.deepEqual(a.trend, []);
  assert.deepEqual(a.campaigns, []);
});

test("computeCouponAnalytics: hitung AOV & ROI dasar", () => {
  const rows = [
    row({ total: 100_000, coupon: { code: "A", couponId: "c1", discount: 10_000 } }),
    row({ total: 200_000, coupon: { code: "A", couponId: "c1", discount: 20_000 } }),
  ];
  const a = computeCouponAnalytics(rows);
  assert.equal(a.couponOrders, 2);
  assert.equal(a.convertedOrders, 2);
  assert.equal(a.totalDiscount, 30_000);
  assert.equal(a.couponRevenue, 300_000);
  assert.equal(a.couponAov, 150_000);
  // ROI = 300000/30000 = 10
  assert.equal(a.roi, 10);
});

test("computeCouponAnalytics: order dibatalkan tak dihitung konversi/omzet", () => {
  const rows = [
    row({ status: "selesai", total: 100_000, coupon: { code: "A", couponId: "c1", discount: 10_000 } }),
    row({ status: "dibatalkan", total: 100_000, coupon: { code: "A", couponId: "c1", discount: 10_000 } }),
  ];
  const a = computeCouponAnalytics(rows);
  assert.equal(a.couponOrders, 2);
  assert.equal(a.convertedOrders, 1);
  assert.equal(a.conversionRate, 0.5);
  assert.equal(a.totalDiscount, 10_000);
  assert.equal(a.couponRevenue, 100_000);
});

test("computeCouponAnalytics: AOV non-kupon dari order tanpa kupon", () => {
  const rows = [
    row({ total: 100_000, coupon: { code: "A", couponId: "c1", discount: 10_000 } }),
    row({ total: 400_000, coupon: null }),
    row({ total: 200_000, coupon: null }),
  ];
  const a = computeCouponAnalytics(rows);
  assert.equal(a.nonCouponRevenue, 600_000);
  assert.equal(a.nonCouponAov, 300_000);
  assert.equal(a.couponShare, 1 / 3);
});

test("computeCouponAnalytics: ROI 0 bila diskon 0", () => {
  const rows = [row({ coupon: { code: "A", couponId: "c1", discount: 0 } })];
  const a = computeCouponAnalytics(rows);
  assert.equal(a.roi, 0);
});

test("computeCouponAnalytics: tren harian terurut & akumulatif", () => {
  const rows = [
    row({ createdAt: "2026-11-01T03:00:00.000Z", coupon: { code: "A", couponId: "c1", discount: 1_000 } }),
    row({ createdAt: "2026-11-01T05:00:00.000Z", coupon: { code: "A", couponId: "c1", discount: 2_000 } }),
    row({ createdAt: "2026-11-02T03:00:00.000Z", coupon: { code: "A", couponId: "c1", discount: 5_000 } }),
  ];
  const a = computeCouponAnalytics(rows);
  assert.deepEqual(a.trend.map((t) => t.date), ["2026-11-01", "2026-11-02"]);
  assert.equal(a.trend[0].orders, 2);
  assert.equal(a.trend[0].discount, 3_000);
  assert.equal(a.trend[1].orders, 1);
  assert.equal(a.trend[1].discount, 5_000);
});

test("computeCouponAnalytics: breakdown kampanye via map", () => {
  const campaignMap = new Map([["c1", "Ramadan"], ["c2", "Lebaran"]]);
  const rows = [
    row({ total: 100_000, coupon: { code: "A", couponId: "c1", discount: 1_000 } }),
    row({ total: 300_000, coupon: { code: "B", couponId: "c2", discount: 3_000 } }),
    row({ total: 50_000, coupon: { code: "A", couponId: "c1", discount: 500 } }),
  ];
  const a = computeCouponAnalytics(rows, campaignMap);
  // Terurut revenue menurun: c2 (300k) lalu c1 (150k).
  assert.equal(a.campaigns[0].campaign, "Lebaran");
  assert.equal(a.campaigns[0].revenue, 300_000);
  assert.equal(a.campaigns[1].campaign, "Ramadan");
  assert.equal(a.campaigns[1].orders, 2);
});

test("computeCouponAnalytics: kupon tanpa map → 'Tanpa kampanye'", () => {
  const rows = [row({ coupon: { code: "A", couponId: "c1", discount: 1_000 } })];
  const a = computeCouponAnalytics(rows);
  assert.equal(a.campaigns[0].campaign, "Tanpa kampanye");
});

test("formatPercent & formatRoi", () => {
  assert.equal(formatPercent(0.5), "50%");
  assert.equal(formatPercent(0), "0%");
  assert.equal(formatRoi(10), "10×");
  assert.equal(formatRoi(0), "0×");
  assert.ok(formatPercent(1 / 3).includes("33,3"));
});

/* ------------------------------ computeCampaignsGlobal ------------------------- */

test("computeCampaignsGlobal: agregasi per kampanye", () => {
  const map = new Map([
    ["c1", "Ramadan"],
    ["c2", "Lebaran"],
  ]);
  const rows = [
    row({ total: 100_000, coupon: { code: "A", couponId: "c1", discount: 10_000 } }),
    row({ total: 300_000, coupon: { code: "B", couponId: "c2", discount: 30_000 } }),
    row({ total: 50_000, coupon: { code: "A", couponId: "c1", discount: 5_000 } }),
  ];
  const stats = computeCampaignsGlobal(rows, map);
  // Terurut revenue menurun: Lebaran (300k) lalu Ramadan (150k).
  assert.equal(stats[0].campaign, "Lebaran");
  assert.equal(stats[0].revenue, 300_000);
  assert.equal(stats[0].roi, 10);
  assert.equal(stats[1].campaign, "Ramadan");
  assert.equal(stats[1].orders, 2);
  assert.equal(stats[1].couponCount, 1); // hanya kode A
  assert.equal(stats[1].discount, 15_000);
});

test("computeCampaignsGlobal: kampanye tanpa map → 'Tanpa kampanye'", () => {
  const rows = [row({ coupon: { code: "A", couponId: "x", discount: 1_000 } })];
  const stats = computeCampaignsGlobal(rows, new Map());
  assert.equal(stats[0].campaign, "Tanpa kampanye");
});

test("computeCampaignsGlobal: abaikan non-kupon & dibatalkan", () => {
  const rows = [
    row({ coupon: null }),
    row({ status: "dibatalkan", coupon: { code: "A", couponId: "c1", discount: 1_000 } }),
  ];
  assert.deepEqual(computeCampaignsGlobal(rows, new Map()), []);
});

test("computeCampaignsGlobal: hitung kode unik per kampanye", () => {
  const map = new Map([["c1", "X"]]);
  const rows = [
    row({ coupon: { code: "A", couponId: "c1", discount: 1_000 } }),
    row({ coupon: { code: "B", couponId: "c1", discount: 1_000 } }),
    row({ coupon: { code: "A", couponId: "c1", discount: 1_000 } }),
  ];
  const stats = computeCampaignsGlobal(rows, map);
  assert.equal(stats[0].couponCount, 2);
  assert.equal(stats[0].orders, 3);
});
