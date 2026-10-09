import { test } from "node:test";
import assert from "node:assert/strict";
import { ogImageFor, seoDescription, seoTitle } from "../src/lib/article-logic.ts";

const FALLBACK = "/opengraph-image";

test("B7.1 seoTitle: metaTitle dipakai bila ada", () => {
  assert.equal(seoTitle({ title: "Judul", metaTitle: "Judul SEO" }), "Judul SEO");
});

test("B7.1 seoTitle: kosong/spasi → fallback judul", () => {
  assert.equal(seoTitle({ title: "Judul", metaTitle: "   " }), "Judul");
  assert.equal(seoTitle({ title: "Judul" }), "Judul");
});

test("B7.1 seoDescription: metaDescription lalu fallback excerpt", () => {
  assert.equal(seoDescription({ excerpt: "ex", metaDescription: "md" }), "md");
  assert.equal(seoDescription({ excerpt: "ex" }), "ex");
});

test("B7.2 ogImageFor: cover artikel dipakai", () => {
  assert.equal(ogImageFor({ coverImage: "https://res.cloudinary.com/x.jpg" }, FALLBACK), "https://res.cloudinary.com/x.jpg");
});

test("B7.2 ogImageFor: tanpa cover / 'default' → fallback OG situs", () => {
  assert.equal(ogImageFor({}, FALLBACK), FALLBACK);
  assert.equal(ogImageFor({ coverImage: "default" }, FALLBACK), FALLBACK);
  assert.equal(ogImageFor({ coverImage: "  " }, FALLBACK), FALLBACK);
});
