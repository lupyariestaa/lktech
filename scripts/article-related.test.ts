import { test } from "node:test";
import assert from "node:assert/strict";
import { pickRelatedArticles } from "../src/lib/article-logic.ts";
import type { Article } from "../src/lib/article-types.ts";

function art(slug: string, category: string, tags: string[], publishedAt: string): Article {
  return {
    slug,
    title: slug,
    excerpt: "",
    body: "",
    category,
    tags,
    cover: "default",
    author: "LKTech",
    status: "published",
    publishedAt,
  };
}

const current = art("cur", "Teknologi", ["ai", "bisnis"], "2026-01-10T00:00:00Z");

test("pickRelatedArticles: tidak memasukkan artikel sendiri", () => {
  const all = [current, art("a", "Teknologi", [], "2026-01-01T00:00:00Z")];
  assert.deepEqual(pickRelatedArticles(current, all).map((a) => a.slug), ["a"]);
});

test("pickRelatedArticles: kategori sama (skor 2) mengalahkan tag saja", () => {
  const all = [
    art("tag-only", "Panduan", ["ai"], "2026-01-05T00:00:00Z"),
    art("same-cat", "Teknologi", [], "2026-01-01T00:00:00Z"),
  ];
  assert.equal(pickRelatedArticles(current, all)[0].slug, "same-cat");
});

test("pickRelatedArticles: seri skor → yang lebih baru di depan", () => {
  const all = [
    art("old", "Teknologi", [], "2025-01-01T00:00:00Z"),
    art("new", "Teknologi", [], "2026-06-01T00:00:00Z"),
  ];
  assert.deepEqual(pickRelatedArticles(current, all).map((a) => a.slug), ["new", "old"]);
});

test("pickRelatedArticles: batas limit dihormati", () => {
  const all = Array.from({ length: 6 }, (_, i) =>
    art(`x${i}`, "Teknologi", [], `2026-0${i + 1}-01T00:00:00Z`),
  );
  assert.equal(pickRelatedArticles(current, all, 3).length, 3);
});

test("pickRelatedArticles: tanpa kandidat → array kosong", () => {
  assert.deepEqual(pickRelatedArticles(current, []), []);
});
