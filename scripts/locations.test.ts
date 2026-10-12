import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LOCATIONS,
  getLocation,
  getLocationSlugs,
  isKnownLocation,
} from "../src/lib/locations.ts";

/**
 * Uji data & helper LOKASI (fase S5 — programmatic SEO, anti-doorway).
 * Jalankan: `npm run test:locations`
 */

test("getLocation: ambil sesuai slug", () => {
  const l = getLocation("tasikmalaya");
  assert.ok(l);
  assert.equal(l?.name, "Tasikmalaya");
  assert.equal(getLocation("tidak-ada"), undefined);
});

test("getLocationSlugs & isKnownLocation", () => {
  const slugs = getLocationSlugs();
  assert.ok(slugs.includes("tasikmalaya"));
  assert.equal(isKnownLocation("jakarta"), true);
  assert.equal(isKnownLocation("ngawur"), false);
});

test("slug lokasi unik & format URL aman", () => {
  const slugs = LOCATIONS.map((l) => l.slug);
  assert.equal(new Set(slugs).size, slugs.length, "slug harus unik");
  for (const s of slugs) {
    assert.match(s, /^[a-z0-9-]+$/, `slug tidak aman: ${s}`);
  }
});

test("ANTI-DOORWAY: konten unik wajib terisi per kota", () => {
  for (const l of LOCATIONS) {
    assert.ok(l.localContext.length >= 120, `localContext ${l.slug} terlalu pendek (doorway risk)`);
    assert.ok(l.industries.length >= 3, `industries ${l.slug} < 3`);
    assert.ok(l.whyLocal.length >= 2, `whyLocal ${l.slug} < 2`);
    assert.ok(l.localFaqs.length >= 2, `localFaqs ${l.slug} < 2`);
  }
});

test("ANTI-DOORWAY: localContext tidak duplikat antar kota", () => {
  const contexts = LOCATIONS.map((l) => l.localContext.trim());
  assert.equal(new Set(contexts).size, contexts.length, "localContext duplikat antar kota");
});

test("nearby hanya merujuk slug yang dikenal", () => {
  const slugs = new Set(getLocationSlugs());
  for (const l of LOCATIONS) {
    for (const n of l.nearby ?? []) {
      assert.ok(slugs.has(n), `nearby ${l.slug} → ${n} tak dikenal`);
      assert.notEqual(n, l.slug, `nearby ${l.slug} merujuk dirinya sendiri`);
    }
  }
});
