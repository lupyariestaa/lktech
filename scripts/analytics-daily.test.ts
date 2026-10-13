import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateDay,
  mergeDailyAggregates,
  type AnalyticsDailyDoc,
  type DailyOrderInput,
} from "../src/lib/analytics-daily-pure.ts";

/**
 * Uji agregasi harian analitik (`AN-P3`) — murni & teruji.
 * Jalankan: `npm run test:analytics-daily`
 */

function order(partial: Partial<DailyOrderInput> = {}): DailyOrderInput {
  return {
    status: "selesai",
    total: 100_000,
    items: [{ slug: "p1", name: "Produk 1", qty: 1, subtotal: 100_000 }],
    ...partial,
  };
}

/* ------------------------------- aggregateDay -------------------------------- */

test("aggregateDay: total per status dihitung", () => {
  const doc = aggregateDay("2026-10-01", [
    order({ status: "selesai", total: 100 }),
    order({ status: "selesai", total: 200 }),
    order({ status: "dibatalkan", total: 999 }),
  ]);
  assert.equal(doc.statusTotals.selesai?.count, 2);
  assert.equal(doc.statusTotals.selesai?.total, 300);
  assert.equal(doc.statusTotals.dibatalkan?.count, 1);
});

test("aggregateDay: mode completed hanya selesai, all kecuali dibatalkan", () => {
  const doc = aggregateDay("2026-10-01", [
    order({ status: "selesai", items: [{ slug: "a", name: "A", qty: 1, subtotal: 10 }] }),
    order({ status: "dibayar", items: [{ slug: "b", name: "B", qty: 1, subtotal: 20 }] }),
    order({ status: "dibatalkan", items: [{ slug: "c", name: "C", qty: 1, subtotal: 30 }] }),
  ]);
  // completed: hanya produk dari status selesai
  assert.deepEqual(Object.keys(doc.productsCompleted), ["a"]);
  // all: dibayar + selesai, TANPA dibatalkan
  assert.deepEqual(Object.keys(doc.productsAll).sort(), ["a", "b"]);
});

test("aggregateDay: varian dipisah berdasarkan slug+variant", () => {
  const doc = aggregateDay("2026-10-01", [
    order({ items: [{ slug: "p", name: "P", qty: 1, subtotal: 5, variantSlug: "red" }] }),
    order({ items: [{ slug: "p", name: "P", qty: 2, subtotal: 5, variantSlug: "blue" }] }),
    order({ items: [{ slug: "p", name: "P", qty: 3, subtotal: 5 }] }),
  ]);
  const keys = Object.keys(doc.productsCompleted).sort();
  assert.deepEqual(keys, ["p", "p::blue", "p::red"]);
});

/* --------------------------- mergeDailyAggregates ---------------------------- */

function doc(partial: Partial<AnalyticsDailyDoc> & { dateISO: string }): AnalyticsDailyDoc {
  return {
    statusTotals: {},
    productsCompleted: {},
    productsAll: {},
    ...partial,
  };
}

test("mergeDailyAggregates: null bila ada hari hilang (jangan menebak)", () => {
  const docs = { "2026-10-01": doc({ dateISO: "2026-10-01" }) };
  const out = mergeDailyAggregates(["2026-10-01", "2026-10-02"], docs, "completed");
  assert.equal(out, null);
});

test("mergeDailyAggregates: jumlah omzet & pesanan per hari + breakdown status", () => {
  const docs = {
    "2026-10-01": doc({
      dateISO: "2026-10-01",
      statusTotals: { selesai: { count: 2, total: 300 }, dibatalkan: { count: 1, total: 50 } },
      productsCompleted: { p1: { slug: "p1", name: "P1", units: 2, omzet: 300 } },
    }),
    "2026-10-02": doc({
      dateISO: "2026-10-02",
      statusTotals: { selesai: { count: 1, total: 120 } },
      productsCompleted: { p1: { slug: "p1", name: "P1", units: 1, omzet: 120 } },
    }),
  };
  const out = mergeDailyAggregates(["2026-10-01", "2026-10-02"], docs, "completed");
  assert.ok(out);
  assert.equal(out.omzetTotal, 420);
  assert.equal(out.ordersCounted, 3);
  assert.deepEqual(
    out.points.map((p) => p.omzet),
    [300, 120],
  );
  assert.equal(out.statusBreakdown.selesai, 3);
  assert.equal(out.statusBreakdown.dibatalkan, 1);
  // p1 digabung lintas hari
  assert.equal(out.topProducts.length, 1);
  assert.equal(out.topProducts[0].units, 3);
  assert.equal(out.topProducts[0].omzet, 420);
});

test("mergeDailyAggregates: mode all menghitung dibayar, completed tidak", () => {
  const docs = {
    "2026-10-01": doc({
      dateISO: "2026-10-01",
      statusTotals: {
        selesai: { count: 1, total: 100 },
        dibayar: { count: 1, total: 40 },
        dibatalkan: { count: 1, total: 999 },
      },
      productsAll: {
        s: { slug: "s", name: "S", units: 1, omzet: 100 },
        b: { slug: "b", name: "B", units: 1, omzet: 40 },
      },
      productsCompleted: { s: { slug: "s", name: "S", units: 1, omzet: 100 } },
    }),
  };
  const completed = mergeDailyAggregates(["2026-10-01"], docs, "completed");
  const all = mergeDailyAggregates(["2026-10-01"], docs, "all");
  assert.equal(completed?.omzetTotal, 100);
  assert.equal(all?.omzetTotal, 140);
  assert.equal(completed?.statusBreakdown.dibatalkan, 1);
  assert.equal(all?.topProducts.length, 2);
});

test("mergeDailyAggregates: topProducts dibatasi 10 & urut omzet", () => {
  const products: AnalyticsDailyDoc["productsCompleted"] = {};
  for (let i = 0; i < 12; i++) {
    products[`p${i}`] = { slug: `p${i}`, name: `P${i}`, units: 1, omzet: i };
  }
  const docs = {
    "2026-10-01": doc({
      dateISO: "2026-10-01",
      statusTotals: { selesai: { count: 12, total: 66 } },
      productsCompleted: products,
    }),
  };
  const out = mergeDailyAggregates(["2026-10-01"], docs, "completed");
  assert.equal(out?.topProducts.length, 10);
  assert.equal(out?.topProducts[0].slug, "p11");
});