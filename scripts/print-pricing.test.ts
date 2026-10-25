import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatePrintUnitPrice } from "../src/lib/product-format.ts";

const config = {
  minWidthM: 0.1,
  minHeightM: 0.1,
  maxWidthM: 10,
  maxHeightM: 10,
  minPricePerUnit: 0,
  finishingOptions: [],
};

test("harga area dibulatkan ke atas ke kelipatan Rp100", () => {
  assert.equal(calculatePrintUnitPrice({ method: "area", ratePerM2: 25000 }, config, { widthM: 3, heightM: 0.5 }), 37500);
  assert.equal(calculatePrintUnitPrice({ method: "area", ratePerM2: 25100 }, config, { widthM: 0.1, heightM: 0.1 }), 300);
});

test("harga lembar dibulatkan dan ukuran tidak diterima", () => {
  assert.equal(calculatePrintUnitPrice({ method: "sheet", pricePerSheet: 6000 }, config, {}), 6000);
  assert.equal(calculatePrintUnitPrice({ method: "sheet", pricePerSheet: 6000 }, config, { widthM: 1 }), null);
});

test("dimensi di luar batas atau tarif tidak valid ditolak", () => {
  assert.equal(calculatePrintUnitPrice({ method: "area", ratePerM2: 25000 }, config, { widthM: 11, heightM: 1 }), null);
  assert.equal(calculatePrintUnitPrice({ method: "area", ratePerM2: 0 }, config, { widthM: 1, heightM: 1 }), null);
  assert.equal(calculatePrintUnitPrice({ method: "area", ratePerM2: 25000 }, config, { widthM: 1.001, heightM: 1 }), null);
});
