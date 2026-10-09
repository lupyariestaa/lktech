import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildToc,
  CATEGORY_SERVICE,
  LIST_PAGE_SIZE,
  listHref,
  pageSlice,
  parseListQuery,
  readingLabel,
  serviceSlugForCategory,
  whatsappShareUrl,
} from "../src/lib/article-ui.ts";

test("B6.3 buildToc: hanya h2 & h3, h4 dibuang", () => {
  const toc = buildToc([
    { level: 2, id: "a", text: "A" },
    { level: 3, id: "b", text: "B" },
    { level: 4, id: "c", text: "C" },
  ]);
  assert.deepEqual(toc.map((h) => h.id), ["a", "b"]);
});

test("B6.3 buildToc: id kosong & duplikat dilewati", () => {
  const toc = buildToc([
    { level: 2, id: "", text: "x" },
    { level: 2, id: "a", text: "A" },
    { level: 2, id: "a", text: "A lagi" },
  ]);
  assert.deepEqual(toc.map((h) => h.text), ["A"]);
});

test("B6.2 serviceSlugForCategory: kategori dipetakan, tak dikenal → umum", () => {
  assert.equal(serviceSlugForCategory("Teknologi"), "pengembangan-aplikasi");
  assert.equal(serviceSlugForCategory("Bisnis Digital"), "pembuatan-website");
  assert.equal(serviceSlugForCategory("Lainnya"), "pembuatan-website");
});

test("B6.4 whatsappShareUrl: teks & URL ter-encode", () => {
  const u = whatsappShareUrl("Judul & Ini", "https://lktech.id/blog/x");
  assert.equal(
    u,
    `https://wa.me/?text=${encodeURIComponent("Judul & Ini\nhttps://lktech.id/blog/x")}`,
  );
});

test("B6.5 readingLabel: pembulatan & minimal 1", () => {
  assert.equal(readingLabel(3), "3 menit baca");
  assert.equal(readingLabel(undefined), "1 menit baca");
  assert.equal(readingLabel(0), "1 menit baca");
});

test("B6.6 parseListQuery: kategori tak sah dibuang, halaman minimal 1", () => {
  const q = parseListQuery(
    { q: " gemini ", kategori: "Hacker", tag: "ai", halaman: "-3" },
    ["Teknologi", "Panduan"],
  );
  assert.deepEqual(q, { q: "gemini", category: "", tag: "ai", page: 1 });
});

test("B6.6 parseListQuery: kategori sah & array param", () => {
  const q = parseListQuery({ kategori: ["Teknologi", "x"], halaman: "2" }, ["Teknologi"]);
  assert.equal(q.category, "Teknologi");
  assert.equal(q.page, 2);
});

test("B6.6 parseListQuery: q dipotong 100 karakter", () => {
  const q = parseListQuery({ q: "a".repeat(300) }, []);
  assert.equal(q.q.length, 100);
});

test("B6.6 pageSlice: halaman pertama & lanjutan", () => {
  const items = Array.from({ length: 10 }, (_, i) => i);
  assert.deepEqual(pageSlice(items, 1, 4), { items: [0, 1, 2, 3], hasMore: true, total: 10 });
  assert.deepEqual(pageSlice(items, 3, 4), { items: [8, 9], hasMore: false, total: 10 });
});

test("B6.6 pageSlice: halaman di luar jangkauan → kosong, tanpa hasMore", () => {
  const r = pageSlice([1, 2], 9, 4);
  assert.deepEqual(r.items, []);
  assert.equal(r.hasMore, false);
});

test("B6.6 listHref: mempertahankan filter, halaman 1 tidak ditulis", () => {
  assert.equal(
    listHref("/blog", { q: "ai", category: "Teknologi", page: 1 }),
    "/blog?q=ai&kategori=Teknologi",
  );
  assert.equal(listHref("/blog", { page: 3 }), "/blog?halaman=3");
  assert.equal(listHref("/blog", {}), "/blog");
});

test("B8.2 CATEGORY_SERVICE: setiap kategori artikel punya layanan tujuan", () => {
  assert.deepEqual(Object.keys(CATEGORY_SERVICE).sort(), ["Bisnis Digital", "Panduan", "Teknologi", "Tips & Trik"]);
});

test("B8.2 LIST_PAGE_SIZE: ukuran halaman wajar", () => {
  assert.ok(LIST_PAGE_SIZE >= 3 && LIST_PAGE_SIZE <= 24);
});