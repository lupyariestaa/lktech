import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBannerProduct } from "./banner-placeholder-data.mjs";

test("banner seed merepresentasikan produk aktif dengan tarif, batas, dan finishing katalog", () => {
  const product = buildBannerProduct("2026-10-25T00:00:00.000Z");

  assert.equal(product.active, true);
  assert.equal(product.featured, false);
  assert.equal(product.price, 0);
  assert.deepEqual(
    product.variants.map(({ slug, name, printPricing }) => ({ slug, name, printPricing })),
    [
      { slug: "flexi-280", name: "Flexi 280", printPricing: { method: "area", ratePerM2: 25000 } },
      { slug: "flexi-340", name: "Flexi 340", printPricing: { method: "area", ratePerM2: 30000 } },
      { slug: "korea-440", name: "Korea 440", printPricing: { method: "area", ratePerM2: 40000 } },
    ],
  );
  assert.deepEqual(product.printConfig, {
    minWidthM: 0.5,
    minHeightM: 0.5,
    maxWidthM: 100,
    maxHeightM: 100,
    minPricePerUnit: 0,
    finishingOptions: [
      { id: "mata-ayam", name: "Mata ayam" },
      { id: "lebih-bahan-selongsong", name: "Lebih bahan & selongsong / rongga" },
    ],
  });
  assert.equal(product.name, "Cetak Banner Gratis Desain");
  assert.match(product.description, /desain gratis/i);
  assert.equal(product.updatedAtISO, "2026-10-25T00:00:00.000Z");
});

test("produk banner seed jelas mengenai alur desain, pembayaran, dan pickup", () => {
  const product = buildBannerProduct("now");

  assert.match(product.description, /Rp25\.000/);
  assert.match(product.description, /Rp30\.000/);
  assert.match(product.description, /Rp40\.000/);
  assert.match(product.description, /Mayar/);
  assert.match(product.description, /diambil langsung di lokasi pickup/);
  assert.equal(product.soldOut, false);
});
