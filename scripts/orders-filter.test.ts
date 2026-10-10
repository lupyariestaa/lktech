import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultFilter,
  parseOrdersFilter,
  ordersFilterToParams,
  hasActiveFilter,
  dateRangeForPreset,
  localDateKey,
  attentionReasons,
  matchesFilter,
  sortOrders,
  applyFilterAndSort,
  type FilterableOrder,
} from "../src/lib/orders-filter-pure.ts";

/**
 * Uji logika murni filter/sort pesanan admin (FASE O1–O3).
 * Jalankan: `npm run test:orders`
 */

const NOW = new Date("2026-10-11T10:00:00");

function order(partial: Partial<FilterableOrder> & { id: string }): FilterableOrder {
  return {
    status: "baru",
    total: 100_000,
    createdAt: "2026-10-11T08:00:00.000Z",
    ...partial,
  };
}

test("defaultFilter: tidak ada filter aktif", () => {
  assert.equal(hasActiveFilter(defaultFilter()), false);
});

test("hasActiveFilter: terdeteksi bila salah satu diisi", () => {
  assert.equal(hasActiveFilter({ ...defaultFilter(), status: "dibayar" }), true);
  assert.equal(hasActiveFilter({ ...defaultFilter(), q: "budi" }), true);
  assert.equal(hasActiveFilter({ ...defaultFilter(), minTotal: 0 }), true);
  assert.equal(hasActiveFilter({ ...defaultFilter(), attention: true }), true);
});

test("dateRangeForPreset: hari_ini = today..today", () => {
  const { from, to } = dateRangeForPreset("hari_ini", NOW);
  assert.equal(from, "2026-10-11");
  assert.equal(to, "2026-10-11");
});

test("dateRangeForPreset: 7_hari mencakup 7 hari inklusif", () => {
  const { from, to } = dateRangeForPreset("7_hari", NOW);
  assert.equal(from, "2026-10-05");
  assert.equal(to, "2026-10-11");
});

test("dateRangeForPreset: bulan_ini mulai tanggal 1", () => {
  const { from } = dateRangeForPreset("bulan_ini", NOW);
  assert.equal(from, "2026-10-01");
});

test("dateRangeForPreset: kustom diteruskan apa adanya", () => {
  const { from, to } = dateRangeForPreset("kustom", NOW, {
    from: "2026-01-01",
    to: "2026-02-01",
  });
  assert.equal(from, "2026-01-01");
  assert.equal(to, "2026-02-01");
});

test("localDateKey: konsisten untuk ISO", () => {
  assert.equal(localDateKey(new Date(2026, 9, 11, 23, 0)), "2026-10-11");
});

test("parseOrdersFilter: default saat kosong", () => {
  const f = parseOrdersFilter(new URLSearchParams());
  assert.deepEqual(f, defaultFilter());
});

test("parseOrdersFilter: baca nilai & tolak nilai tak dikenal", () => {
  const f = parseOrdersFilter(
    new URLSearchParams({
      status: "dibayar",
      datePreset: "ngawur",
      fulfillment: "jasa",
      minTotal: "50000",
      attention: "1",
      q: "  budi  ",
    }),
  );
  assert.equal(f.status, "dibayar");
  assert.equal(f.datePreset, "semua"); // tak dikenal → default
  assert.equal(f.fulfillment, "jasa");
  assert.equal(f.minTotal, 50_000);
  assert.equal(f.attention, true);
  assert.equal(f.q, "budi");
});

test("ordersFilterToParams :: parseOrdersFilter round-trip", () => {
  const f = {
    ...defaultFilter(),
    status: "menunggu_bayar",
    fulfillment: "instan" as const,
    coupon: "ada" as const,
    minTotal: 10_000,
    maxTotal: 90_000,
    q: "andi",
  };
  const p = ordersFilterToParams(f);
  const back = parseOrdersFilter(p);
  assert.deepEqual(back, f);
});

test("ordersFilterToParams: kustom menyertakan from/to", () => {
  const p = ordersFilterToParams({
    ...defaultFilter(),
    datePreset: "kustom",
    from: "2026-01-01",
    to: "2026-01-31",
  });
  assert.equal(p.get("from"), "2026-01-01");
  assert.equal(p.get("to"), "2026-01-31");
});

test("matchesFilter: status", () => {
  const o = order({ id: "a", status: "dibayar" });
  assert.equal(matchesFilter(o, { ...defaultFilter(), status: "dibayar" }, NOW), true);
  assert.equal(matchesFilter(o, { ...defaultFilter(), status: "baru" }, NOW), false);
});

test("matchesFilter: fulfillment efektif (undefined → instan)", () => {
  const digital = order({ id: "a" });
  const jasa = order({ id: "b", fulfillment: "jasa" });
  const f = { ...defaultFilter(), fulfillment: "instan" as const };
  assert.equal(matchesFilter(digital, f, NOW), true);
  assert.equal(matchesFilter(jasa, f, NOW), false);
});

test("matchesFilter: kupon ada/tanpa", () => {
  const withCoupon = order({ id: "a", coupon: { code: "HEMAT" } });
  const without = order({ id: "b" });
  assert.equal(matchesFilter(withCoupon, { ...defaultFilter(), coupon: "ada" }, NOW), true);
  assert.equal(matchesFilter(withCoupon, { ...defaultFilter(), coupon: "tanpa" }, NOW), false);
  assert.equal(matchesFilter(without, { ...defaultFilter(), coupon: "tanpa" }, NOW), true);
});

test("matchesFilter: rentang nominal", () => {
  const o = order({ id: "a", total: 150_000 });
  assert.equal(matchesFilter(o, { ...defaultFilter(), minTotal: 100_000 }, NOW), true);
  assert.equal(matchesFilter(o, { ...defaultFilter(), maxTotal: 100_000 }, NOW), false);
});

test("matchesFilter: pencarian kode/email/nama", () => {
  const o = order({ id: "abcdef1234567890", buyerEmail: "Budi@Mail.com", buyerName: "Budi" });
  assert.equal(matchesFilter(o, { ...defaultFilter(), q: "abcdef12" }, NOW), true);
  assert.equal(matchesFilter(o, { ...defaultFilter(), q: "budi@" }, NOW), true);
  assert.equal(matchesFilter(o, { ...defaultFilter(), q: "budi" }, NOW), true);
  assert.equal(matchesFilter(o, { ...defaultFilter(), q: "zzz" }, NOW), false);
});

test("attentionReasons: JASA menunggu > 24 jam", () => {
  const o = order({
    id: "a",
    fulfillment: "jasa",
    status: "menunggu_konfirmasi",
    createdAt: "2026-10-09T08:00:00.000Z", // > 24 jam sebelum NOW
  });
  assert.ok(attentionReasons(o, NOW).includes("jasa_menunggu"));
});

test("attentionReasons: JASA baru (<24 jam) tidak diperingatkan", () => {
  const o = order({
    id: "a",
    fulfillment: "jasa",
    status: "menunggu_konfirmasi",
    createdAt: "2026-10-11T06:00:00.000Z",
  });
  assert.deepEqual(attentionReasons(o, NOW), []);
});

test("attentionReasons: bayar kedaluwarsa < 6 jam", () => {
  const o = order({
    id: "a",
    status: "menunggu_bayar",
    payment: {
      status: "menunggu",
      expiresAt: new Date(NOW.getTime() + 3 * 60 * 60 * 1000).toISOString(),
    },
  });
  assert.ok(attentionReasons(o, NOW).includes("bayar_segera"));
});

test("attentionReasons: kurang bayar & belum dipenuhi", () => {
  const mismatch = order({
    id: "a",
    status: "menunggu_bayar",
    paymentMismatch: { received: 1000, expected: 100_000 },
  });
  assert.ok(attentionReasons(mismatch, NOW).includes("kurang_bayar"));

  const paidNoToken = order({ id: "b", status: "dibayar" });
  assert.ok(attentionReasons(paidNoToken, NOW).includes("belum_dipenuhi"));

  const paidWithToken = order({ id: "c", status: "dibayar", downloadTokenId: "tok" });
  assert.equal(attentionReasons(paidWithToken, NOW).includes("belum_dipenuhi"), false);
});

test("sortOrders: tanggal & total", () => {
  const a = order({ id: "a", total: 100, createdAt: "2026-10-01T00:00:00Z" });
  const b = order({ id: "b", total: 300, createdAt: "2026-10-03T00:00:00Z" });
  const c = order({ id: "c", total: 200, createdAt: "2026-10-02T00:00:00Z" });
  assert.deepEqual(sortOrders([a, b, c], "date_desc").map((o) => o.id), ["b", "c", "a"]);
  assert.deepEqual(sortOrders([a, b, c], "date_asc").map((o) => o.id), ["a", "c", "b"]);
  assert.deepEqual(sortOrders([a, b, c], "total_desc").map((o) => o.id), ["b", "c", "a"]);
  assert.deepEqual(sortOrders([a, b, c], "total_asc").map((o) => o.id), ["a", "c", "b"]);
});

test("applyFilterAndSort: filter + sort gabungan", () => {
  const list = [
    order({ id: "a", status: "dibayar", total: 100 }),
    order({ id: "b", status: "baru", total: 300 }),
    order({ id: "c", status: "dibayar", total: 200 }),
  ];
  const res = applyFilterAndSort(list, { ...defaultFilter(), status: "dibayar" }, "total_desc", NOW);
  assert.deepEqual(res.map((o) => o.id), ["c", "a"]);
});