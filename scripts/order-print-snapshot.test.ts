import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extensions.
import { normalizePrintFinishing, printSpecificationLines } from "../src/lib/order-item-display.ts";

test("normalizeOrder mempertahankan snapshot finishing sambil tetap kompatibel dengan order lama", () => {
  assert.deepEqual(normalizePrintFinishing([{ id: "mata", name: "Mata ayam" }]), [{ id: "mata", name: "Mata ayam" }]);
  assert.equal(normalizePrintFinishing(undefined), undefined);
  assert.equal(normalizePrintFinishing([{ id: "", name: "" }, null]), undefined);
});

test("spesifikasi pesanan cetak menampilkan label snapshot, bukan label katalog terkini", () => {
  const lines = printSpecificationLines({
    slug: "banner", name: "Banner", price: 10000, qty: 1, subtotal: 10000,
    variantName: "Flexi 280", printOptions: { widthM: 2, heightM: 1, finishingIds: ["mata"] },
    printFinishing: [{ id: "mata", name: "Mata ayam lama" }],
  } as never);

  assert.deepEqual(lines, ["Ukuran: 2 × 1 m", "Finishing: Mata ayam lama", "Bahan/varian: Flexi 280"]);
});

test("legacy print order tetap punya fallback ID finishing dan format lembar", () => {
  assert.deepEqual(printSpecificationLines({
    slug: "print", name: "Print", price: 100, qty: 1, subtotal: 100,
    printOptions: { finishingIds: ["laminasi"] },
    printPricing: { method: "sheet", pricePerSheet: 100, description: "A3 matte" },
  } as never), ["Format: A3 matte", "Finishing: laminasi"]);
});
