import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extension.
import {
  TOOLS,
  TOOL_CATEGORIES,
  availableToolSlugs,
  countToolsByCategory,
  filterTools,
  getToolBySlug,
  matchesToolQuery,
  normalizeToolQuery,
} from "../src/lib/tools-registry-pure.ts";

/**
 * Uji registry & pencarian katalog LKTech Tools (F1a).
 * Jalankan: `npm run test:tools-registry`
 */

test("registry: slug unik & kategori valid", () => {
  const slugs = TOOLS.map((t) => t.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const tool of TOOLS) {
    assert.ok(TOOL_CATEGORIES.includes(tool.category), tool.slug);
    assert.ok(tool.name.trim().length > 0);
    assert.ok(tool.summary.trim().length > 0);
  }
});

test("registry: tools MVP tersedia", () => {
  const slugs = availableToolSlugs();
  assert.ok(slugs.includes("color-picker"));
  assert.ok(slugs.includes("image-to-webp"));
  assert.ok(slugs.includes("image-to-pdf"));
});

test("registry: tool 'segera' tidak masuk availableToolSlugs", () => {
  const slugs = availableToolSlugs();
  assert.ok(!slugs.includes("pdf-to-image"));
  assert.ok(!slugs.includes("text-formatter"));
});

test("normalizeToolQuery: trim + lowercase", () => {
  assert.equal(normalizeToolQuery("  WEBP "), "webp");
  assert.equal(normalizeToolQuery(undefined), "");
});

test("matchesToolQuery: tanpa filter mencocokkan semua", () => {
  const tool = TOOLS[0];
  assert.equal(matchesToolQuery(tool, {}), true);
  assert.equal(matchesToolQuery(tool, { q: "   ", category: "semua" }), true);
});

test("matchesToolQuery: kata kunci di nama/ringkasan/kata kunci", () => {
  const webp = getToolBySlug("image-to-webp");
  assert.ok(webp);
  assert.equal(matchesToolQuery(webp, { q: "webp" }), true);
  assert.equal(matchesToolQuery(webp, { q: "KONVERSI" }), true);
  assert.equal(matchesToolQuery(webp, { q: "png" }), true);
  assert.equal(matchesToolQuery(webp, { q: "tidak-ada" }), false);
});

test("matchesToolQuery: filter kategori ketat", () => {
  const color = getToolBySlug("color-picker");
  assert.ok(color);
  assert.equal(matchesToolQuery(color, { category: "warna" }), true);
  assert.equal(matchesToolQuery(color, { category: "pdf" }), false);
});

test("matchesToolQuery: kategori & kata kunci digabung (AND)", () => {
  const pdf = getToolBySlug("image-to-pdf");
  assert.ok(pdf);
  assert.equal(matchesToolQuery(pdf, { q: "gambar", category: "pdf" }), true);
  assert.equal(matchesToolQuery(pdf, { q: "gambar", category: "gambar" }), false);
});

test("filterTools: mempertahankan urutan registry", () => {
  const all = filterTools(TOOLS, {});
  assert.deepEqual(all.map((t) => t.slug), TOOLS.map((t) => t.slug));

  const images = filterTools(TOOLS, { category: "gambar" });
  assert.deepEqual(images.map((t) => t.slug), ["image-to-webp"]);
});

test("getToolBySlug: case-insensitive & aman untuk slug tak dikenal", () => {
  assert.equal(getToolBySlug("COLOR-PICKER")?.slug, "color-picker");
  assert.equal(getToolBySlug("  image-to-pdf  ")?.slug, "image-to-pdf");
  assert.equal(getToolBySlug("tidak-ada"), null);
});

test("countToolsByCategory: menghitung semua kategori", () => {
  const counts = countToolsByCategory();
  for (const c of TOOL_CATEGORIES) assert.equal(typeof counts[c], "number");
  assert.equal(counts.gambar, 1);
  assert.equal(counts.pdf, 2); // image-to-pdf + pdf-to-image
  assert.equal(
    counts.gambar + counts.pdf + counts.warna + counts.produktivitas,
    TOOLS.length,
  );
});