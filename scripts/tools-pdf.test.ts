import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extension.
import {
  PDF_LIMITS,
  buildPageImageName,
  clampRenderScale,
  computePageRenderSize,
  isPdfType,
  parsePageRange,
  validatePdfFile,
} from "../src/lib/tools/pdf-tool-pure.ts";

/**
 * Uji logika murni tool PDF ke Gambar (F2e).
 * Jalankan: `npm run test:tools-pdf`
 */

test("isPdfType: MIME atau ekstensi", () => {
  assert.equal(isPdfType("application/pdf"), true);
  assert.equal(isPdfType("", "laporan.pdf"), true);
  assert.equal(isPdfType("", "laporan.PDF"), true);
  assert.equal(isPdfType("", "laporan.txt"), false);
  assert.equal(isPdfType("image/png", "x.pdf"), false);
});

test("validatePdfFile: kosong/terlalu besar/tipe salah", () => {
  assert.deepEqual(validatePdfFile({ size: 0, type: "application/pdf" }), {
    ok: false,
    reason: "Berkas kosong atau tidak dapat dibaca.",
  });

  const big = validatePdfFile({ size: 30 * 1024 * 1024, type: "application/pdf" });
  assert.equal(big.ok, false);
  if (!big.ok) assert.match(big.reason, /melebihi batas 25 MB/);

  const wrong = validatePdfFile({ size: 1000, type: "image/png" });
  assert.equal(wrong.ok, false);
  if (!wrong.ok) assert.equal(wrong.reason, "Berkas harus berformat PDF.");

  assert.deepEqual(validatePdfFile({ size: 1000, type: "", name: "a.pdf" }), {
    ok: true,
  });
  assert.equal(validatePdfFile({ size: 2000, type: "application/pdf" }, { maxBytes: 1000 }).ok, false);
});

test("clampRenderScale: rentang 0.5–3 & aman", () => {
  assert.equal(clampRenderScale(1), 1);
  assert.equal(clampRenderScale(0.1), PDF_LIMITS.minRenderScale);
  assert.equal(clampRenderScale(9), PDF_LIMITS.maxRenderScale);
  assert.equal(clampRenderScale(Number.NaN), 1);
});

test("computePageRenderSize: skala & batas dimensi", () => {
  const normal = computePageRenderSize(600, 800, 1.5);
  assert.equal(normal.scale, 1.5);
  assert.equal(normal.width, 900);
  assert.equal(normal.height, 1200);
  assert.equal(normal.capped, false);

  // Halaman besar: dibatasi agar sisi terpanjang ≤ maxDim.
  const capped = computePageRenderSize(2000, 3000, 3, 4096);
  assert.equal(capped.capped, true);
  assert.ok(Math.max(capped.width, capped.height) <= 4096);
  assert.equal(capped.height, 4096);
  assert.equal(capped.width, 2731);

  // Input liar tetap aman.
  const degenerate = computePageRenderSize(0, Number.NaN, 1);
  assert.equal(degenerate.width, 1);
  assert.equal(degenerate.height, 1);
});

test("parsePageRange: kosong berarti semua halaman", () => {
  assert.deepEqual(parsePageRange("", 3), { ok: true, pages: [1, 2, 3] });
  assert.deepEqual(parsePageRange("   ", 0), { ok: true, pages: [] });
});

test("parsePageRange: daftar, rentang, dan bentuk terbuka", () => {
  assert.deepEqual(parsePageRange("1-3, 5", 10), { ok: true, pages: [1, 2, 3, 5] });
  assert.deepEqual(parsePageRange("8-", 10), { ok: true, pages: [8, 9, 10] });
  assert.deepEqual(parsePageRange("-4", 10), { ok: true, pages: [1, 2, 3, 4] });
  assert.deepEqual(parsePageRange("3-1", 5), { ok: true, pages: [1, 2, 3] });
  // Unik + terurut, di luar rentang dibuang.
  assert.deepEqual(parsePageRange("5,5,99,2", 6), { ok: true, pages: [2, 5] });
});

test("parsePageRange: token tidak valid & hasil kosong", () => {
  const bad = parsePageRange("abc", 5);
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(bad.error, /tidak valid/);

  const empty = parsePageRange("99-100", 5);
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.match(empty.error, /Tidak ada halaman/);
});

test("buildPageImageName: padding & sanitasi", () => {
  assert.equal(buildPageImageName("laporan.pdf", 3, 12, "png"), "laporan-hal-03.png");
  assert.equal(buildPageImageName("my doc/final.pdf", 1, 100, "jpg"), "my-doc-final-hal-001.jpg");
  assert.equal(buildPageImageName(".pdf", 2, 4, "png"), "dokumen-hal-2.png");
});
