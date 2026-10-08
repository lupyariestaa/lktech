import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cursorOf,
  estimateReadingTime,
  findArticleBySlugOrHistory,
  isPubliclyVisible,
  matchesSearch,
  paginate,
} from "../src/lib/article-logic.ts";

const NOW = Date.parse("2026-10-09T12:00:00Z");

type A = {
  slug: string;
  status: "draft" | "published";
  publishedAt: string;
  scheduledAt?: string;
  slugHistory?: string[];
  title: string;
  excerpt: string;
  tags: string[];
  category: string;
};

function art(slug: string, over: Partial<A> = {}): A {
  return {
    slug,
    status: "published",
    publishedAt: "2026-01-01T00:00:00Z",
    title: slug,
    excerpt: "",
    tags: [],
    category: "Teknologi",
    ...over,
  };
}

test("B5.3 isPubliclyVisible: published & sudah terbit → tampil", () => {
  assert.equal(isPubliclyVisible(art("a"), NOW), true);
});

test("B5.3 isPubliclyVisible: draft → tidak tampil", () => {
  assert.equal(isPubliclyVisible(art("a", { status: "draft" }), NOW), false);
});

test("B5.3 isPubliclyVisible: publishedAt di masa depan → tidak tampil", () => {
  assert.equal(
    isPubliclyVisible(art("a", { publishedAt: "2026-12-01T00:00:00Z" }), NOW),
    false,
  );
});

test("B5.3 isPubliclyVisible: scheduledAt belum lewat → tidak tampil", () => {
  assert.equal(
    isPubliclyVisible(art("a", { scheduledAt: "2026-10-10T00:00:00Z" }), NOW),
    false,
  );
});

test("B5.3 isPubliclyVisible: scheduledAt sudah lewat → tampil", () => {
  assert.equal(
    isPubliclyVisible(art("a", { scheduledAt: "2026-10-08T00:00:00Z" }), NOW),
    true,
  );
});

test("B5.3 isPubliclyVisible: tanggal tak valid tidak memblokir (fail-open ke status)", () => {
  assert.equal(isPubliclyVisible(art("a", { publishedAt: "bukan-tanggal" }), NOW), true);
});

test("B5.7 findArticleBySlugOrHistory: slug aktif → tanpa redirect", () => {
  const all = [art("baru", { slugHistory: ["lama"] })];
  const r = findArticleBySlugOrHistory("baru", all);
  assert.equal(r?.article.slug, "baru");
  assert.equal(r?.redirectTo, null);
});

test("B5.7 findArticleBySlugOrHistory: slug lama → redirect ke slug baru", () => {
  const all = [art("baru", { slugHistory: ["lama"] })];
  const r = findArticleBySlugOrHistory("lama", all);
  assert.equal(r?.article.slug, "baru");
  assert.equal(r?.redirectTo, "baru");
});

test("B5.7 findArticleBySlugOrHistory: tak dikenal → null", () => {
  assert.equal(findArticleBySlugOrHistory("tidak-ada", [art("a")]), null);
});

test("matchesSearch: semua kata harus cocok (AND), tanpa peka huruf", () => {
  const a = { title: "Gemini AI untuk Bisnis", excerpt: "panduan", tags: ["ai"], category: "Teknologi" };
  assert.equal(matchesSearch(a, "gemini bisnis"), true);
  assert.equal(matchesSearch(a, "gemini kucing"), false);
});

test("matchesSearch: kosong → semua cocok", () => {
  assert.equal(matchesSearch({ title: "x", excerpt: "", tags: [], category: "" }, "   "), true);
});

test("B5.5 paginate: halaman pertama & cursor berikutnya", () => {
  const items = [art("a", { publishedAt: "2026-03-01T00:00:00Z" }),
    art("b", { publishedAt: "2026-02-01T00:00:00Z" }),
    art("c", { publishedAt: "2026-01-01T00:00:00Z" })];
  const p1 = paginate(items, 2, null);
  assert.deepEqual(p1.items.map((x) => x.slug), ["a", "b"]);
  assert.equal(p1.nextCursor, cursorOf(items[1]));

  const p2 = paginate(items, 2, p1.nextCursor);
  assert.deepEqual(p2.items.map((x) => x.slug), ["c"]);
  assert.equal(p2.nextCursor, null);
});

test("B5.5 paginate: limit dibatasi 1..50, default 12", () => {
  const many = Array.from({ length: 60 }, (_, i) =>
    art(`s${i}`, { publishedAt: `2026-01-${String(i % 28 + 1).padStart(2, "0")}T00:00:00Z` }),
  );
  assert.equal(paginate(many, 999, null).items.length, 50);
  assert.equal(paginate(many, 0, null).items.length, 12);
});

test("B5.5 paginate: cursor tak dikenal → halaman kosong (tidak loop)", () => {
  const r = paginate([art("a")], 5, "tidak|ada");
  assert.deepEqual(r.items, []);
  assert.equal(r.nextCursor, null);
});

test("B5.1 estimateReadingTime: minimal 1 menit & kode/gambar diabaikan", () => {
  assert.equal(estimateReadingTime(""), 1);
  const body = "kata ".repeat(400) + "\n```\n" + "kode ".repeat(500) + "\n```\n";
  // 400 kata prosa ≈ 2 menit; blok kode diabaikan.
  assert.equal(estimateReadingTime(body), 2);
});
