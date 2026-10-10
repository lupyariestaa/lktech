import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fulfillmentTypeForCategory,
  fulfillmentTypeForCategories,
  effectiveFulfillment,
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

test("keranjang semua digital → INSTAN", () => {
  assert.equal(
    fulfillmentTypeForCategories(["template", "software", "ebook"]),
    "instan",
  );
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
