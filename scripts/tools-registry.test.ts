import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extension.
import {
  TOOLS,
  TOOL_CATEGORIES,
  TOOL_INTENTS,
  availableToolSlugs,
  countToolsByCategory,
  filterTools,
  getRelatedTools,
  getToolBySlug,
  isToolAvailable,
  matchesToolQuery,
  normalizeToolQuery,
  resolveToolIntents,
  toolGuideHref,
  toolWorkspaceHref,
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
  assert.ok(slugs.includes("webp-to-image"));
  assert.ok(slugs.includes("image-to-pdf"));
  assert.ok(slugs.includes("pdf-to-image"));
  assert.ok(slugs.includes("text-formatter"));
});

test("registry: availableToolSlugs hanya memuat status 'tersedia'", () => {
  const available = new Set(availableToolSlugs());
  for (const tool of TOOLS) {
    assert.equal(available.has(tool.slug), tool.status === "tersedia", tool.slug);
  }
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
  assert.deepEqual(images.map((t) => t.slug), ["image-to-webp", "webp-to-image"]);
});

test("tool WebP ke Gambar terdaftar dengan metadata dan format yang benar", () => {
  const tool = getToolBySlug("webp-to-image");
  assert.ok(tool);
  assert.equal(tool.category, "gambar");
  assert.equal(tool.status, "tersedia");
  assert.equal(tool.format.from, "WebP statis");
  assert.match(tool.format.to, /PNG.*JPG.*GIF.*BMP.*AVIF/);
  assert.ok(tool.format.to.includes("ZIP"), "format.to harus menyebut ZIP");
  assert.ok(tool.limitLabel.includes("20"), "limitLabel harus menyebut batas 20 berkas");
  assert.ok(tool.related.includes("image-to-webp"));
});

test("getToolBySlug: case-insensitive & aman untuk slug tak dikenal", () => {
  assert.equal(getToolBySlug("COLOR-PICKER")?.slug, "color-picker");
  assert.equal(getToolBySlug("  image-to-pdf  ")?.slug, "image-to-pdf");
  assert.equal(getToolBySlug("tidak-ada"), null);
});

test("countToolsByCategory: menghitung semua kategori", () => {
  const counts = countToolsByCategory();
  for (const c of TOOL_CATEGORIES) assert.equal(typeof counts[c], "number");
  assert.equal(counts.gambar, 2);
  assert.equal(counts.pdf, 2); // image-to-pdf + pdf-to-image
  assert.equal(
    counts.gambar + counts.pdf + counts.warna + counts.produktivitas,
    TOOLS.length,
  );
});

test("registry: metadata kartu format/batas/lokal lengkap", () => {
  for (const tool of TOOLS) {
    assert.ok(tool.format.from.trim().length > 0, tool.slug);
    assert.ok(tool.format.to.trim().length > 0, tool.slug);
    assert.ok(tool.limitLabel.trim().length > 0, tool.slug);
    assert.equal(typeof tool.local, "boolean", tool.slug);
    assert.ok(Array.isArray(tool.related), tool.slug);
    assert.ok(!tool.related.includes(tool.slug), `${tool.slug} terkait dirinya`);
  }
});

test("registry: related hanya menunjuk slug valid & tersedia", () => {
  for (const tool of TOOLS) {
    for (const slug of tool.related) {
      const related = getToolBySlug(slug);
      assert.ok(related, `${tool.slug} → ${slug} tidak ada`);
      assert.equal(related.status, "tersedia", `${tool.slug} → ${slug}`);
    }
  }
});

test("isToolAvailable: mengikuti status registry", () => {
  for (const tool of TOOLS) {
    assert.equal(isToolAvailable(tool), tool.status === "tersedia", tool.slug);
  }
});

test("intents: id unik & semua menunjuk tool tersedia", () => {
  const ids = TOOL_INTENTS.map((intent) => intent.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const intent of TOOL_INTENTS) {
    const tool = getToolBySlug(intent.toolSlug);
    assert.ok(tool, intent.toolSlug);
    assert.equal(tool.status, "tersedia", intent.toolSlug);
  }
  assert.equal(resolveToolIntents().length, TOOL_INTENTS.length);
});

test("helpers URL: workspace privat vs panduan publik", () => {
  assert.equal(toolWorkspaceHref("color-picker"), "/tools/color-picker");
  assert.equal(toolGuideHref("color-picker"), "/tools/panduan/color-picker");
});

test("getRelatedTools: menyaring tool tersedia & mempertahankan urutan", () => {
  const webp = getToolBySlug("image-to-webp");
  assert.ok(webp);
  const related = getRelatedTools(webp).map((tool) => tool.slug);
  assert.deepEqual(related, webp.related.filter((slug) => {
    const tool = getToolBySlug(slug);
    return tool?.status === "tersedia";
  }));
});
