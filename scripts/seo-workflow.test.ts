import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeSnippet,
  buildSeoChecklist,
  buildSnippetPreview,
  countInternalLinks,
  formatBreadcrumbUrl,
  snippetStatus,
  summarizeChecklist,
  truncateForDisplay,
  validateOgImageUrl,
  SEO_CHECKLIST_BLOCKING_ENABLED,
  SNIPPET_GUIDE,
} from "../src/lib/seo-workflow-pure.ts";

/**
 * Uji workflow SEO (fase D5) — panduan panjang, preview snippet/OG, validasi
 * gambar statis, dan checklist pra-terbit (non-pemblokir).
 * Jalankan: `npm run test:seo-workflow`
 */

test("snippetStatus: kosong/pendek/ok/panjang sesuai rentang", () => {
  assert.equal(snippetStatus(0, SNIPPET_GUIDE.title), "kosong");
  assert.equal(snippetStatus(10, SNIPPET_GUIDE.title), "pendek");
  assert.equal(snippetStatus(40, SNIPPET_GUIDE.title), "ok");
  assert.equal(snippetStatus(200, SNIPPET_GUIDE.title), "panjang");
});

test("truncateForDisplay: memotong di batas kata & menandai", () => {
  const short = truncateForDisplay("teks pendek", 60);
  assert.deepEqual(short, { text: "teks pendek", truncated: false });

  const long = truncateForDisplay("kata ".repeat(40), 30);
  assert.equal(long.truncated, true);
  assert.ok(long.text.length <= 31);
  assert.ok(long.text.endsWith("…"));
});

test("formatBreadcrumbUrl: membentuk breadcrumb tanpa skema", () => {
  assert.equal(formatBreadcrumbUrl("https://lktech.id", "/blog/abc"), "lktech.id › blog › abc");
  assert.equal(formatBreadcrumbUrl("", "/"), "lktech.id");
});

test("buildSnippetPreview: memakai fallback & memotong deskripsi panjang", () => {
  const p = buildSnippetPreview({
    title: "",
    description: "",
    titleFallback: "Judul fallback",
    descriptionFallback: "Deskripsi fallback yang cukup panjang",
    path: "/blog/x",
    origin: "https://lktech.id",
  });
  assert.equal(p.title, "Judul fallback");
  assert.match(p.description, /Deskripsi fallback/);
  assert.equal(p.displayUrl, "lktech.id › blog › x");
  assert.equal(p.titleTruncated, false);
});

test("analyzeSnippet: menyediakan panduan & status", () => {
  const checks = analyzeSnippet({
    title: "Judul yang pas untuk panduan seo dasar",
    description: "D".repeat(80),
  });
  assert.equal(checks.title.status, "ok");
  assert.equal(checks.description.status, "ok");
  assert.match(checks.title.guidance, /ideal|ideal/i);

  const kosong = analyzeSnippet({ title: "", description: "" });
  assert.equal(kosong.title.status, "kosong");
  assert.equal(kosong.description.status, "kosong");
});

test("validateOgImageUrl: menerima format umum & menandai yang meragukan", () => {
  assert.equal(validateOgImageUrl("").status, "ok");
  assert.equal(validateOgImageUrl("https://lktech.id/og.png").status, "ok");
  assert.equal(validateOgImageUrl("/og-image.webp").status, "ok");
  assert.equal(validateOgImageUrl("default").status, "warn");
  assert.equal(validateOgImageUrl("https://lktech.id/og").status, "warn");
  assert.equal(validateOgImageUrl("https://lktech.id/og.pdf").status, "warn");
  assert.equal(validateOgImageUrl("https://lktech.id/a b.png").status, "invalid");
  assert.equal(validateOgImageUrl("javascript:alert(1)").status, "invalid");
});

test("countInternalLinks: hanya tautan internal yang dihitung", () => {
  const body =
    "Lihat [layanan](/layanan) dan [produk](https://lktech.id/produk) serta [luar](https://google.com).";
  assert.equal(countInternalLinks(body, "https://lktech.id"), 2);
  assert.equal(countInternalLinks(body), 1);
  assert.equal(countInternalLinks(""), 0);
});

test("buildSeoChecklist: konten lengkap hampir semua ok & tidak memblokir", () => {
  const items = buildSeoChecklist({
    kind: "article",
    title: "Judul panduan website bisnis modern",
    metaTitle: "Judul panduan website bisnis modern",
    excerpt: "D".repeat(80),
    metaDescription: "D".repeat(80),
    slug: "judul-panduan-website",
    internalLinkCount: 3,
    imageUrl: "https://lktech.id/og.png",
    imageAlt: "Ilustrasi panduan",
    titleDuplicate: false,
    slugDuplicate: false,
    canonicalPath: "/blog/judul-panduan-website",
    indexable: true,
    hasStructuredData: true,
  });
  assert.equal(items.every((i) => !i.blocking), true);
  assert.equal(items.every((i) => i.status === "ok"), true);
  assert.equal(SEO_CHECKLIST_BLOCKING_ENABLED, false);
});

test("buildSeoChecklist: konten kosong menandai missing", () => {
  const items = buildSeoChecklist({ kind: "product", title: "", slug: "" });
  const byId = new Map(items.map((i) => [i.id, i]));
  assert.equal(byId.get("title.present")?.status, "missing");
  assert.equal(byId.get("description.present")?.status, "missing");
  assert.equal(items.every((i) => !i.blocking), true);
});

test("buildSeoChecklist: duplikat & tautan internal jadi perhatian", () => {
  const items = buildSeoChecklist({
    kind: "article",
    title: "Judul panduan website bisnis modern",
    excerpt: "D".repeat(80),
    slug: "dup",
    internalLinkCount: 0,
    titleDuplicate: true,
    slugDuplicate: true,
    hasStructuredData: false,
  });
  const byId = new Map(items.map((i) => [i.id, i]));
  assert.equal(byId.get("title.unique")?.status, "warn");
  assert.equal(byId.get("slug.unique")?.status, "warn");
  assert.equal(byId.get("internal.links")?.status, "warn");
  assert.equal(byId.get("structured.data")?.status, "warn");
});

test("summarizeChecklist: menghitung status & blocking", () => {
  const items = buildSeoChecklist({ kind: "service", title: "Layanan Website", slug: "layanan" });
  const s = summarizeChecklist(items);
  assert.equal(s.total, items.length);
  assert.equal(s.ok + s.warn + s.missing, items.length);
  assert.equal(s.blocking, 0);
});
