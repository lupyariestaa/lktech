import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fulfillmentTypeForCategory,
  fulfillmentTypeForCategories,
  effectiveFulfillment,
  allocateDiscountByItem,
} from "../src/lib/order-fulfillment.ts";

/**
 * Uji pemetaan jalur fulfillment produk (FASE P0 — pembayaran online).
 * - INSTAN: template/software/ebook/aplikasi/lainnya (barang digital → unduh).
 * - JASA: kategori `jasa` (layanan manusia → konfirmasi dulu).
 * Jalankan: `npm run test:fulfillment`
 */

test("kategori jasa → JASA", () => {
  assert.equal(fulfillmentTypeForCategory("jasa"), "jasa");
});

test("kategori percetakan → CETAK", () => {
  assert.equal(fulfillmentTypeForCategory("percetakan"), "cetak");
});

test("kategori digital → INSTAN", () => {
  for (const c of ["template", "software", "ebook", "aplikasi", "lainnya"]) {
    assert.equal(fulfillmentTypeForCategory(c), "instan");
  }
});

test("kategori tak dikenal → INSTAN (default aman)", () => {
  assert.equal(fulfillmentTypeForCategory("entah"), "instan");
});

test("keranjang campuran dgn jasa → JASA (jalur konsultasi)", () => {
  assert.equal(fulfillmentTypeForCategories(["template", "jasa"]), "jasa");
});

test("alokasi diskon proporsional menjaga jumlah Rupiah tepat dan deterministik", () => {
  assert.deepEqual(allocateDiscountByItem([100, 200, 50], 17), [5, 10, 2]);
  assert.equal(allocateDiscountByItem([0, 0], 0).reduce((a, b) => a + b, 0), 0);
  assert.throws(() => allocateDiscountByItem([100], 101));
});

test("keranjang semua digital → INSTAN", () => {
  assert.equal(
    fulfillmentTypeForCategories(["template", "software", "ebook"]),
    "instan",
  );
});

test("keranjang semua cetak → CETAK; campuran cetak+digi → INSTAN", () => {
  assert.equal(fulfillmentTypeForCategories(["percetakan", "percetakan"]), "cetak");
  assert.equal(fulfillmentTypeForCategories(["percetakan", "template"]), "instan");
});

/* ---- OR-B7: effectiveFulfillment (order lama tanpa field) ---- */

test("effectiveFulfillment: 'jasa' tetap jasa", () => {
  assert.equal(effectiveFulfillment("jasa"), "jasa");
});

test("effectiveFulfillment: 'instan' tetap instan", () => {
  assert.equal(effectiveFulfillment("instan"), "instan");
});

test("effectiveFulfillment: undefined (order lama) → instan", () => {
  assert.equal(effectiveFulfillment(undefined), "instan");
});
