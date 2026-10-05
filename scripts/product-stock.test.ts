import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stockBadge,
  productTotalStock,
  isStockOut,
  effectiveStock,
  LOW_STOCK_THRESHOLD,
} from "../src/lib/product-format.ts";

/**
 * Uji badge & kelayakan stok nyata (FASE P4, diselaraskan GAP-P4-1).
 * Jalankan: `npm run test:stock`
 */

test("soldOut → badge 'Stok habis'", () => {
  const b = stockBadge({ soldOut: true, stock: 10 });
  assert.deepEqual(b, { label: "Stok habis", kind: "out" });
});

test("stock ≤ 0 & tidak soldOut → badge 'Stok habis' (GAP-P4-1)", () => {
  assert.deepEqual(stockBadge({ soldOut: false, stock: 0 }), {
    label: "Stok habis",
    kind: "out",
  });
  assert.deepEqual(stockBadge({ soldOut: false, stock: -2 }), {
    label: "Stok habis",
    kind: "out",
  });
});

test("stock ≤ ambang (positif) → 'Sisa N'", () => {
  const b = stockBadge({ soldOut: false, stock: 3 });
  assert.deepEqual(b, { label: "Sisa 3", kind: "low" });
});

test("stock > ambang → tidak ada badge", () => {
  assert.equal(stockBadge({ soldOut: false, stock: LOW_STOCK_THRESHOLD + 1 }), null);
});

test("stock tak diisi → tidak ada badge (bukan angka palsu)", () => {
  assert.equal(stockBadge({ soldOut: false }), null);
});

test("stock tak valid → mengikuti soldOut saja", () => {
  assert.equal(stockBadge({ soldOut: false, stock: NaN }), null);
});

test("isStockOut: soldOut / stock≤0 → true", () => {
  assert.equal(isStockOut({ soldOut: true }), true);
  assert.equal(isStockOut({ soldOut: false, stock: 0 }), true);
  assert.equal(isStockOut({ soldOut: false, stock: -1 }), true);
});

test("isStockOut: stock>0 / tak diisi → false", () => {
  assert.equal(isStockOut({ soldOut: false, stock: 1 }), false);
  assert.equal(isStockOut({ soldOut: false }), false);
});

test("effectiveStock: angka ≥0 dibulatkan; undefined → null", () => {
  assert.equal(effectiveStock({ stock: 7 }), 7);
  assert.equal(effectiveStock({ stock: 2.9 }), 2);
  assert.equal(effectiveStock({ stock: -3 }), 0);
  assert.equal(effectiveStock({}), null);
});

test("productTotalStock: produk tunggal", () => {
  assert.equal(productTotalStock({ variants: [], stock: 7 }), 7);
  assert.equal(productTotalStock({ variants: [] }), null);
});

test("productTotalStock: multi-varian menjumlahkan stok diketahui", () => {
  const total = productTotalStock({
    variants: [
      { stock: 2 },
      { stock: 3 },
      {},
    ] as never,
  });
  assert.equal(total, 5);
});

test("productTotalStock: multi-varian tanpa stok → null", () => {
  assert.equal(
    productTotalStock({ variants: [{}, {}] as never }),
    null,
  );
});
