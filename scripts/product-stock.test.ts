import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stockBadge,
  productTotalStock,
  LOW_STOCK_THRESHOLD,
} from "../src/lib/product-format.ts";

/**
 * Uji badge stok nyata (FASE P4) — "Sisa N" hanya dari data nyata.
 * Jalankan: `npm run test:stock`
 */

test("soldOut → badge 'Stok habis'", () => {
  const b = stockBadge({ soldOut: true, stock: 10 });
  assert.deepEqual(b, { label: "Stok habis", kind: "out" });
});

test("stock ≤ ambang → 'Sisa N'", () => {
  const b = stockBadge({ soldOut: false, stock: 3 });
  assert.deepEqual(b, { label: "Sisa 3", kind: "low" });
});

test("stock = 0 & tidak soldOut → 'Sisa 0'", () => {
  const b = stockBadge({ soldOut: false, stock: 0 });
  assert.deepEqual(b, { label: "Sisa 0", kind: "low" });
});

test("stock > ambang → tidak ada badge", () => {
  assert.equal(stockBadge({ soldOut: false, stock: LOW_STOCK_THRESHOLD + 1 }), null);
});

test("stock tak diisi → tidak ada badge (bukan angka palsu)", () => {
  assert.equal(stockBadge({ soldOut: false }), null);
});

test("stock negatif/tak valid → tidak ada badge", () => {
  assert.equal(stockBadge({ soldOut: false, stock: -5 }), null);
  assert.equal(stockBadge({ soldOut: false, stock: NaN }), null);
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
