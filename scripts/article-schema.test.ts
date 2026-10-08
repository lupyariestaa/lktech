import { test } from "node:test";
import assert from "node:assert/strict";
import { articleSchema } from "../src/lib/api-schemas.ts";

test("articleSchema: judul wajib", () => {
  assert.equal(articleSchema.safeParse({ title: "   " }).success, false);
  assert.equal(articleSchema.safeParse({ title: "Halo" }).success, true);
});

test("articleSchema: coverAlt diterima (B0.1)", () => {
  const r = articleSchema.safeParse({ title: "A", coverAlt: "Foto tim" });
  assert.equal(r.success, true);
  assert.equal(r.success && r.data.coverAlt, "Foto tim");
});

test("articleSchema: status hanya draft/published", () => {
  assert.equal(articleSchema.safeParse({ title: "A", status: "draft" }).success, true);
  assert.equal(articleSchema.safeParse({ title: "A", status: "trash" }).success, false);
});

test("articleSchema: cover harus URL http(s) atau 'default'", () => {
  assert.equal(articleSchema.safeParse({ title: "A", cover: "default" }).success, true);
  assert.equal(
    articleSchema.safeParse({ title: "A", cover: "https://res.cloudinary.com/x.jpg" }).success,
    true,
  );
  assert.equal(articleSchema.safeParse({ title: "A", cover: "javascript:alert(1)" }).success, false);
});

test("articleSchema: batas body 50.000 karakter", () => {
  assert.equal(articleSchema.safeParse({ title: "A", body: "x".repeat(50_000) }).success, true);
  assert.equal(articleSchema.safeParse({ title: "A", body: "x".repeat(50_001) }).success, false);
});
