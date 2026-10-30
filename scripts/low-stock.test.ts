import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extension.
import { findLowStock, type LowStockProduct } from "../src/lib/low-stock-pure.ts";

const product = (patch: Partial<LowStockProduct>): LowStockProduct => ({
  slug: "product",
  name: "Produk",
  active: true,
  soldOut: false,
  variants: [],
  ...patch,
});

test("findLowStock: stok terbatas <=5 dimasukkan, stok >5/tak terbatas diabaikan", () => {
  const items = findLowStock([
    product({ slug: "low", stock: 5 }),
    product({ slug: "out", stock: 0 }),
    product({ slug: "high", stock: 6 }),
    product({ slug: "unknown" }),
  ]);
  assert.deepEqual(items.map((item) => [item.productSlug, item.stock]), [["out", 0], ["low", 5]]);
});

test("findLowStock: stok nol / soldOut tetap muncul dan ditandai habis", () => {
  const items = findLowStock([
    product({ slug: "zero", stock: 0 }),
    product({ slug: "flagged", stock: 20, soldOut: true }),
  ]);
  assert.equal(items.length, 2);
  assert.ok(items.every((item) => item.soldOut));
});

test("findLowStock: produk multi-varian melaporkan varian satu per satu", () => {
  const items = findLowStock([
    product({
      slug: "bundle",
      name: "Bundle",
      stock: 1, // diabaikan pada produk multi-varian
      variants: [
        { slug: "basic", name: "Basic", stock: 2, soldOut: false },
        { slug: "pro", name: "Pro", stock: 8, soldOut: false },
        { slug: "custom", name: "Custom", soldOut: false },
      ],
    }),
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].variantSlug, "basic");
  assert.equal(items[0].stock, 2);
});

test("findLowStock: produk nonaktif diabaikan", () => {
  assert.deepEqual(findLowStock([product({ active: false, stock: 0 })]), []);
});

test("findLowStock: threshold diklem ke integer non-negatif", () => {
  assert.equal(findLowStock([product({ stock: 3 })], 2.9).length, 0);
  assert.equal(findLowStock([product({ stock: 3 })], 3.9).length, 1);
});
