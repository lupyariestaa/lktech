import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node's strip-types test runner requires the explicit extension.
import { cartIdentityKey, mergeCartItems } from "../src/lib/cart-identity-pure.ts";

const printItem = (
  overrides: Partial<Parameters<typeof cartIdentityKey>[0] & { qty: number }> = {},
) => ({
  slug: "banner",
  variantSlug: "flexi-280",
  qty: 1,
  printOptions: {
    widthM: 3,
    heightM: 0.5,
    finishingIds: ["mata-ayam"],
  },
  ...overrides,
});

test("identitas item cetak memasukkan produk, bahan, ukuran, dan finishing", () => {
  const base = printItem();

  assert.notEqual(cartIdentityKey(base), cartIdentityKey(printItem({ variantSlug: "flexi-340" })));
  assert.notEqual(
    cartIdentityKey(base),
    cartIdentityKey(printItem({ printOptions: { ...base.printOptions!, widthM: 4 } })),
  );
  assert.notEqual(
    cartIdentityKey(base),
    cartIdentityKey(printItem({ printOptions: { ...base.printOptions!, finishingIds: ["selongsong"] } })),
  );
  assert.notEqual(cartIdentityKey(base), cartIdentityKey(printItem({ slug: "stiker" })));
});

test("mergeCartItems menjumlahkan hanya konfigurasi yang identik", () => {
  const existing = [printItem({ qty: 2 })];
  const incoming = [
    printItem({ qty: 3 }),
    printItem({ qty: 1, variantSlug: "flexi-340" }),
    printItem({ qty: 1, printOptions: { ...printItem().printOptions!, widthM: 4 } }),
    printItem({ qty: 1, printOptions: { ...printItem().printOptions!, finishingIds: ["selongsong"] } }),
  ];

  const merged = mergeCartItems(existing, incoming);

  assert.equal(merged.length, 4);
  assert.deepEqual(merged.map((item) => item.qty), [5, 1, 1, 1]);
  assert.deepEqual(existing.map((item) => item.qty), [2], "tidak memutasi keranjang asal");
});

test("finishing dengan urutan berbeda tetap konfigurasi yang identik", () => {
  const first = printItem({
    printOptions: { widthM: 3, heightM: 0.5, finishingIds: ["mata-ayam", "selongsong"] },
  });
  const second = printItem({
    printOptions: { widthM: 3, heightM: 0.5, finishingIds: ["selongsong", "mata-ayam"] },
  });

  assert.equal(cartIdentityKey(first), cartIdentityKey(second));
  assert.equal(mergeCartItems([first], [second])[0].qty, 2);
});

test("merge keranjang akun mempertahankan item yang berbeda dan urutannya", () => {
  const account = [
    { slug: "digital", qty: 1 },
    printItem({ qty: 2 }),
  ];
  const guest = [
    printItem({ qty: 1 }),
    { slug: "jasa", qty: 1 },
  ];

  const merged = mergeCartItems(account, guest);

  assert.deepEqual(merged.map((item) => item.slug), ["digital", "banner", "jasa"]);
  assert.deepEqual(merged.map((item) => item.qty), [1, 3, 1]);
});
