import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extension.
import { TOOLS, TOOL_CATEGORIES } from "../src/lib/tools-registry-pure.ts";
// @ts-expect-error Node strip-types runner needs explicit extension.
import {
  DISCOVERY_TOOL_CATEGORIES,
  MAX_RECENT_TOOLS,
  addRecentToolSlug,
  buildToolsCatalogHref,
  buildToolsCatalogQuery,
  filterCatalogTools,
  isSameToolsCatalogState,
  parseStoredToolSlugs,
  parseToolsCatalogParams,
  parseToolsCategory,
  resolveToolsBySlugs,
  sanitizeToolSlugs,
  serializeToolSlugs,
  toggleFavoriteToolSlug,
} from "../src/lib/tools-discovery-pure.ts";

/**
 * Uji logika discovery LKTech Tools (URL state, recent, favorites, filter).
 * Jalankan: `npm run test:tools-discovery`
 */

const params = (entries: Record<string, string>) => ({
  get: (name: string) => entries[name] ?? null,
});

test("kategori discovery sinkron dengan registry", () => {
  assert.deepEqual([...DISCOVERY_TOOL_CATEGORIES], [...TOOL_CATEGORIES]);
});

test("parseToolsCategory: valid, kosong, dan nilai tak dikenal", () => {
  assert.equal(parseToolsCategory("gambar"), "gambar");
  assert.equal(parseToolsCategory(" PDF "), "pdf");
  assert.equal(parseToolsCategory("semua"), "semua");
  assert.equal(parseToolsCategory(""), "semua");
  assert.equal(parseToolsCategory(null), "semua");
  assert.equal(parseToolsCategory("tidak-ada"), "semua");
});

test("parseToolsCatalogParams: trim query & validasi kategori", () => {
  assert.deepEqual(parseToolsCatalogParams(params({ q: "  webp " })), {
    q: "webp",
    category: "semua",
  });
  assert.deepEqual(
    parseToolsCatalogParams(params({ q: "pdf", kategori: "pdf" })),
    { q: "pdf", category: "pdf" },
  );
  assert.deepEqual(
    parseToolsCatalogParams(params({ kategori: "ngawur" })),
    { q: "", category: "semua" },
  );
});

test("buildToolsCatalogQuery: state default menghasilkan URL bersih", () => {
  assert.equal(buildToolsCatalogQuery({ q: "", category: "semua" }), "");
  assert.equal(
    buildToolsCatalogQuery({ q: "  ", category: "semua" }),
    "",
  );
  assert.equal(
    buildToolsCatalogQuery({ q: "webp", category: "semua" }),
    "?q=webp",
  );
  assert.equal(
    buildToolsCatalogQuery({ q: "webp", category: "gambar" }),
    "?q=webp&kategori=gambar",
  );
});

test("buildToolsCatalogHref: memakai base ruang", () => {
  assert.equal(
    buildToolsCatalogHref({ q: "pdf", category: "pdf" }),
    "/tools/ruang?q=pdf&kategori=pdf",
  );
  assert.equal(
    buildToolsCatalogHref({ q: "", category: "semua" }, "/x"),
    "/x",
  );
});

test("isSameToolsCatalogState: abaikan spasi tepi query", () => {
  assert.equal(
    isSameToolsCatalogState(
      { q: " webp ", category: "gambar" },
      { q: "webp", category: "gambar" },
    ),
    true,
  );
  assert.equal(
    isSameToolsCatalogState(
      { q: "webp", category: "gambar" },
      { q: "webp", category: "pdf" },
    ),
    false,
  );
});

test("sanitizeToolSlugs: unik, valid, dan menghormati batas", () => {
  assert.deepEqual(
    sanitizeToolSlugs(
      ["image-to-webp", "IMAGE-TO-WEBP", "tidak-ada", 42, "color-picker"],
      TOOLS,
    ),
    ["image-to-webp", "color-picker"],
  );
  assert.equal(
    sanitizeToolSlugs(TOOLS.map((tool) => tool.slug), TOOLS, 2).length,
    2,
  );
});

test("sanitizeToolSlugs: menyaring tool yang belum tersedia", () => {
  const fake = [
    { ...TOOLS[0], slug: "soon", status: "segera" },
    TOOLS[1],
  ];
  assert.deepEqual(sanitizeToolSlugs(["soon", TOOLS[1].slug], fake), [
    TOOLS[1].slug,
  ]);
});

test("parseStoredToolSlugs: JSON rusak/format salah dianggap kosong", () => {
  assert.deepEqual(parseStoredToolSlugs(null, TOOLS), []);
  assert.deepEqual(parseStoredToolSlugs("{rusak", TOOLS), []);
  assert.deepEqual(parseStoredToolSlugs('{"a":1}', TOOLS), []);
  assert.deepEqual(
    parseStoredToolSlugs(
      serializeToolSlugs(["color-picker", "color-picker"]),
      TOOLS,
    ),
    ["color-picker"],
  );
});

test("addRecentToolSlug: dedupe & batas recent", () => {
  assert.deepEqual(addRecentToolSlug([], "color-picker"), ["color-picker"]);
  assert.deepEqual(
    addRecentToolSlug(["color-picker", "image-to-webp"], "color-picker"),
    ["color-picker", "image-to-webp"],
  );
  const many = Array.from({ length: MAX_RECENT_TOOLS + 2 }, (_, i) => `t${i}`);
  assert.equal(addRecentToolSlug(many, "baru").length, MAX_RECENT_TOOLS);
});

test("toggleFavoriteToolSlug: tambah, hapus, dan batas", () => {
  assert.deepEqual(toggleFavoriteToolSlug([], "color-picker"), [
    "color-picker",
  ]);
  assert.deepEqual(
    toggleFavoriteToolSlug(["color-picker", "pdf-to-image"], "color-picker"),
    ["pdf-to-image"],
  );
  assert.equal(
    toggleFavoriteToolSlug(["a", "b"], "c", 2).length,
    2,
  );
});

test("resolveToolsBySlugs: mempertahankan urutan & melewati slug invalid", () => {
  assert.deepEqual(
    resolveToolsBySlugs(
      ["pdf-to-image", "tidak-ada", "color-picker"],
      TOOLS,
    ).map((tool) => tool.slug),
    ["pdf-to-image", "color-picker"],
  );
});

test("filterCatalogTools: kategori, query, dan favoritesOnly", () => {
  const all = filterCatalogTools(
    { q: "", category: "semua" },
    { tools: TOOLS },
  );
  assert.equal(all.length, TOOLS.length);

  const pdf = filterCatalogTools(
    { q: "", category: "pdf" },
    { tools: TOOLS },
  );
  assert.ok(pdf.every((tool) => tool.category === "pdf"));

  const webp = filterCatalogTools(
    { q: "webp", category: "semua" },
    { tools: TOOLS },
  );
  assert.deepEqual(webp.map((tool) => tool.slug), ["image-to-webp", "webp-to-image"]);

  const favorites = filterCatalogTools(
    { q: "", category: "semua" },
    {
      tools: TOOLS,
      favorites: ["color-picker"],
      favoritesOnly: true,
    },
  );
  assert.deepEqual(favorites.map((tool) => tool.slug), ["color-picker"]);

  assert.deepEqual(
    filterCatalogTools(
      { q: "webp", category: "pdf" },
      { tools: TOOLS },
    ),
    [],
  );
});

test("filterCatalogTools: menyaring tool yang belum tersedia", () => {
  const fake = [{ ...TOOLS[0], slug: "soon", status: "segera" }, TOOLS[1]];
  const visible = filterCatalogTools(
    { q: "", category: "semua" },
    { tools: fake },
  );
  assert.deepEqual(visible.map((tool) => tool.slug), [TOOLS[1].slug]);
});
