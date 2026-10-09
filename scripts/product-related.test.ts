import { test } from "node:test";
import assert from "node:assert/strict";
import { pickRelatedProducts } from "../src/lib/product-related.ts";

type P = { slug: string; category: string; relatedSlugs?: string[] };

const cat = (slug: string, category = "Website"): P => ({ slug, category });

const ALL: P[] = [
  cat("a", "Website"), // produk yang sedang dilihat
  cat("m1", "Website"), // manual
  cat("m2", "Aplikasi"),
  cat("r1", "Aplikasi"), // riwayat
  cat("r2", "Website"), // riwayat
  cat("k1", "Website"), // kategori sama
  cat("k2", "Website"),
];

const current: P = { slug: "a", category: "Website", relatedSlugs: ["m2", "m1"] };

test("BR-5 urutan: manual lebih dulu, lalu riwayat, lalu kategori", () => {
  const r = pickRelatedProducts(current, ALL, {
    limit: 5,
    coPurchase: ["r1", "r2"],
  });
  assert.deepEqual(r.map((p) => p.slug), ["m2", "m1", "r1", "r2", "k1"]);
});

test("BR-5 riwayat tidak menggeser manual dari posisi pertama", () => {
  const r = pickRelatedProducts(current, ALL, { limit: 3, coPurchase: ["r1"] });
  assert.deepEqual(r.map((p) => p.slug), ["m2", "m1", "r1"]);
});

test("BR-5 tanpa riwayat: manual lalu kategori (urutan daftar)", () => {
  const r = pickRelatedProducts(current, ALL, { limit: 4 });
  // Fallback kategori Website mengikuti urutan daftar ALL: r2, k1 (m1 sudah dipakai manual).
  assert.deepEqual(r.map((p) => p.slug), ["m2", "m1", "r2", "k1"]);
});

test("BR-5 riwayat hanya dipakai bila kurang dari limit (kategori jadi fallback terakhir)", () => {
  const r = pickRelatedProducts(current, ALL, { limit: 2, coPurchase: ["r2"] });
  assert.deepEqual(r.map((p) => p.slug), ["m2", "m1"]);
});

test("BR-5 produk sendiri dan exclude tidak pernah muncul", () => {
  const r = pickRelatedProducts(current, ALL, {
    limit: 6,
    coPurchase: ["a", "r1"],
    exclude: ["k1"],
  });
  assert.equal(r.some((p) => p.slug === "a"), false);
  assert.equal(r.some((p) => p.slug === "k1"), false);
  assert.ok(r.some((p) => p.slug === "r1"));
});

test("BR-5 tanpa duplikat meski slug muncul di manual dan riwayat", () => {
  const r = pickRelatedProducts(current, ALL, { limit: 6, coPurchase: ["m1", "r1"] });
  const slugs = r.map((p) => p.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("BR-5 slug riwayat yang tidak ada (tidak aktif) diabaikan", () => {
  const r = pickRelatedProducts(current, ALL, { limit: 3, coPurchase: ["tidak-ada"] });
  // Slug tak dikenal dilewati; fallback kategori mengambil r2 lebih dulu (urutan ALL).
  assert.deepEqual(r.map((p) => p.slug), ["m2", "m1", "r2"]);
});
