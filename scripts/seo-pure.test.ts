import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSeo, hasSeo } from "../src/lib/seo-pure.ts";

/**
 * Uji logika murni SEO (gap G1) — memastikan pengaturan SEO dashboard benar
 * dipetakan menjadi nilai metadata.
 * Jalankan: `npm run test:seo`
 */

test("resolveSeo: kosong → tanpa field", () => {
  assert.deepEqual(resolveSeo(undefined), {});
  assert.deepEqual(resolveSeo({}), {});
  assert.equal(hasSeo({}), false);
});

test("resolveSeo: trim & buang nilai kosong", () => {
  const r = resolveSeo({ title: "  Judul  ", description: "   ", ogImage: "" });
  assert.deepEqual(r, { title: "Judul" });
});

test("resolveSeo: semua field terisi", () => {
  const r = resolveSeo({
    title: "T",
    description: "D",
    ogImage: "https://x/y.png",
    searchConsoleId: "abc123",
  });
  assert.deepEqual(r, {
    title: "T",
    description: "D",
    ogImage: "https://x/y.png",
    searchConsoleId: "abc123",
  });
  assert.equal(hasSeo({ title: "x" }), true);
});

test("resolveSeo: abaikan tipe bukan string", () => {
  const r = resolveSeo({ title: 123 as unknown as string, description: null as unknown as string });
  assert.deepEqual(r, {});
});
