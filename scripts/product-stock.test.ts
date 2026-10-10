import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stockBadge,
  productTotalStock,
  isStockOut,
  effectiveStock,
  evaluatePurchase,
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

/* -------------------------------------------------------------------------- */
/* OR-B4/B5: evaluatePurchase (aturan kelayakan beli terpusat)                 */
/* -------------------------------------------------------------------------- */

const single = {
  slug: "p1",
  name: "Produk",
  price: 50000,
  soldOut: false,
  active: true,
  variants: [],
};

test("evaluatePurchase: produk tunggal valid → ok + harga", () => {
  const r = evaluatePurchase(single, { qty: 2 });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.price, 50000);
});

test("evaluatePurchase: produk nonaktif → code product_inactive", () => {
  const r = evaluatePurchase({ ...single, active: false }, { qty: 1 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "product_inactive");
});

test("evaluatePurchase: produk tunggal stok habis → out_of_stock", () => {
  const r = evaluatePurchase({ ...single, stock: 0 }, { qty: 1 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "out_of_stock");
});

test("evaluatePurchase: qty melebihi stok → insufficient_stock", () => {
  const r = evaluatePurchase({ ...single, stock: 3 }, { qty: 4 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "insufficient_stock");
});

test("evaluatePurchase: harga 0 → no_price", () => {
  const r = evaluatePurchase({ ...single, price: 0 }, { qty: 1 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "no_price");
});

const multi = {
  slug: "p2",
  name: "Paket",
  price: 0,
  soldOut: false,
  active: true,
  variants: [
    { slug: "basic", name: "Basic", price: 100000, soldOut: false, stock: 5 },
    { slug: "pro", name: "Pro", price: 200000, soldOut: true, stock: 5 },
  ],
};

test("evaluatePurchase: multi-varian tanpa pilih varian → variant_required", () => {
  const r = evaluatePurchase(multi, { qty: 1 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "variant_required");
});

test("evaluatePurchase: varian tak ada → variant_not_found", () => {
  const r = evaluatePurchase(multi, { variantSlug: "xxx", qty: 1 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "variant_not_found");
});

test("evaluatePurchase: varian valid → ok + harga varian", () => {
  const r = evaluatePurchase(multi, { variantSlug: "basic", qty: 2 });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.price, 100000);
    assert.equal(r.variantSlug, "basic");
  }
});

test("evaluatePurchase: varian soldOut → soldout", () => {
  const r = evaluatePurchase(multi, { variantSlug: "pro", qty: 1 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "soldout");
});

test("evaluatePurchase: varian qty > stok → insufficient_stock", () => {
  const r = evaluatePurchase(multi, { variantSlug: "basic", qty: 6 });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "insufficient_stock");
});
