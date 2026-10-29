import test from "node:test";
import assert from "node:assert/strict";
import { toCheckoutItem, toCheckoutItems } from "../src/lib/checkout-payload-pure.ts";
import { checkoutSchema } from "../src/lib/order-schema.ts";

/**
 * Regresi `CL-D1`: `toPrintCartItem` versi lama menyimpan salinan tampilan
 * `finishing` DI DALAM `printOptions`. Skema checkout yang `strict()` menolaknya
 * sehingga SETIAP checkout produk percetakan gagal dengan
 * `400 "Data keranjang tidak valid."` (path `items.0.printOptions`).
 */

/** Item keranjang cetak persis seperti bentuk lama (termasuk kunci `finishing`). */
const legacyPrintCartItem = {
  slug: "cetak-banner-gratis-desain-flexi-340",
  name: "Cetak Banner Gratis Desain — Flexi 340",
  price: 180000,
  cover: "default",
  qty: 1,
  variantSlug: "flexi-340",
  variantName: "Flexi 340",
  printOptions: {
    widthM: 3,
    heightM: 2,
    finishingIds: ["mata-ayam"],
    finishing: [{ id: "mata-ayam", name: "Mata ayam" }],
  },
  printFinishing: [{ id: "mata-ayam", name: "Mata ayam" }],
  printPricing: { method: "area", ratePerM2: 30000 },
};

test("checkoutSchema: keranjang lama dengan `finishing` di printOptions tetap diterima", () => {
  const parsed = checkoutSchema.safeParse({
    items: [
      {
        slug: legacyPrintCartItem.slug,
        variantSlug: legacyPrintCartItem.variantSlug,
        printOptions: legacyPrintCartItem.printOptions,
        qty: legacyPrintCartItem.qty,
      },
    ],
    buyerName: "Lupy Ariesta",
  });
  assert.equal(
    parsed.success,
    true,
    parsed.success ? "" : JSON.stringify(parsed.error.issues),
  );
  if (parsed.success) {
    // Server hanya butuh field yang dikenali; kunci ekstra diabaikan.
    assert.deepEqual(parsed.data.items[0].printOptions?.finishingIds, ["mata-ayam"]);
    assert.equal(parsed.data.items[0].printOptions?.widthM, 3);
    assert.equal(parsed.data.items[0].printOptions?.heightM, 2);
  }
});

test("checkoutSchema: `variantSlug: \"\"` diperlakukan sebagai tanpa varian", () => {
  const parsed = checkoutSchema.safeParse({
    items: [{ slug: "produk-tunggal", variantSlug: "", qty: 2 }],
  });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.items[0].variantSlug, undefined);
});

test("checkoutSchema: masih menolak nilai yang benar-benar tidak valid", () => {
  const base = { slug: "x", qty: 1 };
  // qty wajib integer >= 1
  assert.equal(checkoutSchema.safeParse({ items: [{ ...base, qty: 0 }] }).success, false);
  assert.equal(checkoutSchema.safeParse({ items: [{ ...base, qty: 1.5 }] }).success, false);
  // slug wajib
  assert.equal(checkoutSchema.safeParse({ items: [{ qty: 1 }] }).success, false);
  // finishingIds wajib string, maksimum 20
  assert.equal(
    checkoutSchema.safeParse({
      items: [{ ...base, printOptions: { finishingIds: [1, 2] } }],
    }).success,
    false,
  );
  assert.equal(
    checkoutSchema.safeParse({
      items: [
        { ...base, printOptions: { finishingIds: Array.from({ length: 21 }, (_, i) => `f${i}`) } },
      ],
    }).success,
    false,
  );
  // ukuran di luar batas
  assert.equal(
    checkoutSchema.safeParse({
      items: [{ ...base, printOptions: { widthM: 101, finishingIds: [] } }],
    }).success,
    false,
  );
  // item kosong tidak boleh
  assert.equal(checkoutSchema.safeParse({ items: [] }).success, false);
});

test("toCheckoutItem: membuang field tampilan & menormalkan isi", () => {
  const payload = toCheckoutItem(legacyPrintCartItem);
  assert.deepEqual(payload, {
    slug: "cetak-banner-gratis-desain-flexi-340",
    variantSlug: "flexi-340",
    qty: 1,
    printOptions: { widthM: 3, heightM: 2, finishingIds: ["mata-ayam"] },
  });
  assert.equal("finishing" in (payload.printOptions ?? {}), false);
  // Payload hasil penyusun harus lolos skema server.
  assert.equal(checkoutSchema.safeParse({ items: [payload] }).success, true);
});

test("toCheckoutItem: variantSlug kosong dibuang, duplikat finishing dibuang", () => {
  const payload = toCheckoutItem({
    slug: "x",
    qty: 3,
    variantSlug: "   ",
    printOptions: { finishingIds: ["a", "b", "a"] },
  });
  assert.equal(payload.variantSlug, undefined);
  assert.deepEqual(payload.printOptions, { finishingIds: ["a", "b"] });
});

test("toCheckoutItem: produk tanpa opsi cetak tidak memuat printOptions", () => {
  const payload = toCheckoutItem({ slug: "template-katalog", qty: 1, variantSlug: "v1" });
  assert.deepEqual(payload, { slug: "template-katalog", qty: 1, variantSlug: "v1" });
});

test("toCheckoutItems: memetakan seluruh keranjang", () => {
  const payloads = toCheckoutItems([
    legacyPrintCartItem,
    { slug: "template-katalog", qty: 2 },
  ]);
  assert.equal(payloads.length, 2);
  assert.equal(checkoutSchema.safeParse({ items: payloads }).success, true);
});
