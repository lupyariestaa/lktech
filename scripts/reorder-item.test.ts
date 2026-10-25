import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node's strip-types test runner requires the explicit extension.
import { resolveReorderItem } from "../src/lib/reorder-item-pure.ts";
// @ts-expect-error Node's strip-types test runner requires the explicit extension.
import { calculatePrintUnitPrice } from "../src/lib/product-format.ts";

const printOrderItem = (overrides: Record<string, unknown> = {}) => ({
  slug: "banner",
  name: "Banner — Flexi 280",
  price: 37500,
  qty: 2,
  subtotal: 75000,
  variantSlug: "flexi-280",
  variantName: "Flexi 280",
  printOptions: { widthM: 3, heightM: 0.5, finishingIds: ["mata-ayam"] },
  printPricing: { method: "area", ratePerM2: 25000 },
  ...overrides,
});

const currentPrintProduct = (overrides: Record<string, unknown> = {}) => ({
  slug: "banner",
  exists: true,
  active: true,
  soldOut: false,
  name: "Banner",
  price: 0,
  category: "percetakan",
  variants: [
    {
      slug: "flexi-280",
      name: "Flexi 280",
      price: 0,
      soldOut: false,
      stock: null,
      printPricing: { method: "area", ratePerM2: 25000 },
    },
  ],
  printConfig: {
    minWidthM: 0.5,
    minHeightM: 0.5,
    maxWidthM: 100,
    maxHeightM: 100,
    minPricePerUnit: 0,
    finishingOptions: [{ id: "mata-ayam", name: "Mata ayam" }],
  },
  ...overrides,
});

test("reorder cetak mempertahankan dimensi dan finishing serta memakai harga terkini", () => {
  const result = resolveReorderItem(printOrderItem() as never, currentPrintProduct() as never, calculatePrintUnitPrice);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.item.price, 37500);
  assert.equal(result.item.qty, 2);
  assert.equal(result.item.variantSlug, "flexi-280");
  assert.deepEqual(result.item.printOptions, {
    widthM: 3,
    heightM: 0.5,
    finishingIds: ["mata-ayam"],
  });
});

test("reorder cetak tidak mengubah varian lama ke bahan lain", () => {
  const result = resolveReorderItem(
    printOrderItem() as never,
    currentPrintProduct({ variants: [{ slug: "flexi-340", name: "Flexi 340", price: 0, soldOut: false, stock: null, printPricing: { method: "area", ratePerM2: 30000 } }] }) as never,
    calculatePrintUnitPrice,
  );

  assert.deepEqual(result, { ok: false, reason: "variant_unavailable" });
});

test("reorder cetak melewati opsi finishing yang sudah dihapus", () => {
  const result = resolveReorderItem(
    printOrderItem() as never,
    currentPrintProduct({ printConfig: { ...currentPrintProduct().printConfig, finishingOptions: [] } }) as never,
    calculatePrintUnitPrice,
  );

  assert.deepEqual(result, { ok: false, reason: "print_config_changed" });
});

test("reorder cetak melewati ukuran yang sudah tidak diizinkan", () => {
  const result = resolveReorderItem(
    printOrderItem() as never,
    currentPrintProduct({ printConfig: { ...currentPrintProduct().printConfig, maxWidthM: 2 } }) as never,
    calculatePrintUnitPrice,
  );

  assert.deepEqual(result, { ok: false, reason: "invalid_print_options" });
});

test("reorder umum memakai varian terkini dan harga terkini", () => {
  const result = resolveReorderItem(
    { slug: "digital", name: "Produk — Basic", price: 1000, qty: 1, subtotal: 1000, variantSlug: "basic", variantName: "Basic" } as never,
    { slug: "digital", exists: true, active: true, soldOut: false, name: "Produk", price: 0, variants: [{ slug: "basic", name: "Basic", price: 2000, soldOut: false, stock: null }] } as never,
    calculatePrintUnitPrice,
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.item.price, 2000);
  assert.equal(result.item.variantSlug, "basic");
});
