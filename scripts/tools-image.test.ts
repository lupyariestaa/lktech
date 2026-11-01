import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extension.
import {
  IMAGE_LIMITS,
  PDF_PAGE_PRESETS,
  buildOutputName,
  clampQuality,
  computeTargetSize,
  fitImageOnPage,
  formatBytes,
  isAcceptedImageType,
  pageSizeForImage,
  sanitizeBaseName,
  validateImageFile,
} from "../src/lib/tools/image-tool-pure.ts";

/**
 * Uji logika murni tool gambar (F2b/F2c).
 * Jalankan: `npm run test:tools-image`
 */

test("formatBytes: satuan & pembulatan gaya Indonesia", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(1536), "1,5 KB");
  assert.equal(formatBytes(15 * 1024 * 1024), "15 MB");
  assert.equal(formatBytes(Number.NaN), "0 B");
  assert.equal(formatBytes(-10), "0 B");
});

test("clampQuality: batas 0.1–1 & default aman", () => {
  assert.equal(clampQuality(0.05), IMAGE_LIMITS.minQuality);
  assert.equal(clampQuality(2), 1);
  assert.equal(clampQuality(0.75), 0.75);
  assert.equal(clampQuality(Number.NaN), 0.8);
});

test("isAcceptedImageType: tipe didukung saja", () => {
  assert.equal(isAcceptedImageType("image/png"), true);
  assert.equal(isAcceptedImageType("image/jpeg"), true);
  assert.equal(isAcceptedImageType("application/pdf"), false);
  assert.equal(isAcceptedImageType(""), false);
});

test("validateImageFile: kosong/terlalu besar/tipe salah", () => {
  assert.deepEqual(validateImageFile({ size: 0, type: "image/png" }), {
    ok: false,
    reason: "Berkas kosong atau tidak dapat dibaca.",
  });

  const big = validateImageFile({ size: 20 * 1024 * 1024, type: "image/png" });
  assert.equal(big.ok, false);
  if (!big.ok) assert.match(big.reason, /melebihi batas 15 MB/);

  const pdf = validateImageFile({ size: 1000, type: "application/pdf" });
  assert.equal(pdf.ok, false);

  assert.deepEqual(validateImageFile({ size: 1000, type: "image/png" }), { ok: true });
  // Batas kustom dihormati.
  assert.equal(
    validateImageFile({ size: 2000, type: "image/jpeg" }, { maxBytes: 1000 }).ok,
    false,
  );
});

test("sanitizeBaseName: buang ekstensi & karakter berbahaya", () => {
  assert.equal(sanitizeBaseName("foto liburan.png"), "foto-liburan");
  assert.equal(sanitizeBaseName("a/b\\c:d*e?f.png"), "a-b-c-d-e-f");
  assert.equal(sanitizeBaseName("...hidden..."), "hidden");
  assert.equal(sanitizeBaseName("   "), "gambar");
  assert.equal(sanitizeBaseName("", "fallback"), "fallback");
});

test("buildOutputName: gabung nama & ekstensi", () => {
  assert.equal(buildOutputName("KTP depan.JPG", "webp"), "KTP-depan.webp");
  assert.equal(buildOutputName("", "pdf", "dokumen"), "dokumen.pdf");
});

test("computeTargetSize: tidak membesarkan, hanya membatasi", () => {
  assert.deepEqual(computeTargetSize(800, 600, 4096), {
    width: 800,
    height: 600,
    scaled: false,
  });
  assert.deepEqual(computeTargetSize(8000, 4000, 4096), {
    width: 4096,
    height: 2048,
    scaled: true,
  });
  // Sisi terpanjang = tinggi (portrait).
  assert.deepEqual(computeTargetSize(2000, 8000, 4000), {
    width: 1000,
    height: 4000,
    scaled: true,
  });
  // Input liar tetap aman.
  assert.deepEqual(computeTargetSize(0, 0, 4096), { width: 1, height: 1, scaled: false });
  assert.deepEqual(computeTargetSize(100, 100, 0), { width: 100, height: 100, scaled: false });
});

test("fitImageOnPage: contain + pusat", () => {
  const fit = fitImageOnPage(1000, 500, 600, 800, 0);
  // Skala dibatasi lebar: 600/1000 = 0.6 → tinggi 300.
  assert.equal(fit.scale, 0.6);
  assert.equal(fit.width, 600);
  assert.equal(fit.height, 300);
  assert.equal(fit.x, 0);
  assert.equal(fit.y, 250);

  const withMargin = fitImageOnPage(600, 600, 600, 600, 30);
  assert.equal(withMargin.width, 540);
  assert.equal(withMargin.height, 540);
  assert.equal(withMargin.x, 30);
  assert.equal(withMargin.y, 30);
});

test("pageSizeForImage & preset halaman", () => {
  assert.deepEqual(pageSizeForImage(1200, 900), { width: 1200, height: 900 });
  assert.deepEqual(pageSizeForImage(0, Number.NaN), { width: 1, height: 1 });
  assert.equal(PDF_PAGE_PRESETS.a4.width, 595.28);
  assert.equal(PDF_PAGE_PRESETS.letter.height, 792);
});
