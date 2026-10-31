import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extension.
import { paginateMedia, isScanTruncated } from "../src/lib/media-list-pure.ts";

/**
 * Uji paginasi & penanda batas daftar media (Sprint 10 / ADM-17).
 * Jalankan: `npm run test:media-list`
 */

type Item = { id: string; createdAt: string | null };

/** Buat daftar item menurun (newest dulu) seperti hasil `scanAllDocs`. */
function newestList(n: number): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    // m0 paling baru (menurun).
    createdAt: `2026-10-${String(31 - (i % 28)).padStart(2, "0")}T00:00:00.000Z`,
  }));
}

test("paginateMedia: halaman pertama + kursor berikutnya", () => {
  const list = newestList(5);
  const page = paginateMedia({
    filtered: list,
    cursor: null,
    sort: "newest",
    limit: 2,
    scanExhausted: true,
  });
  assert.deepEqual(page.items.map((i) => i.id), ["m0", "m1"]);
  assert.equal(page.hasMore, true);
  assert.equal(page.startIndex, 0);
  assert.deepEqual(page.nextCursorItem, { createdAt: list[1].createdAt, id: "m1" });
  assert.equal(page.truncated, false);
});

test("paginateMedia: melanjutkan dari kursor (newest) cocok id+createdAt", () => {
  const list = newestList(5);
  const page = paginateMedia({
    filtered: list,
    cursor: { createdAt: list[1].createdAt as string, id: "m1" },
    sort: "newest",
    limit: 2,
    scanExhausted: true,
  });
  assert.deepEqual(page.items.map((i) => i.id), ["m2", "m3"]);
  assert.equal(page.startIndex, 2);
});

test("paginateMedia: createdAt identik → kursor tetap stabil via id", () => {
  const list: Item[] = [
    { id: "a", createdAt: "2026-10-01T00:00:00.000Z" },
    { id: "b", createdAt: "2026-10-01T00:00:00.000Z" },
    { id: "c", createdAt: "2026-10-01T00:00:00.000Z" },
  ];
  const page = paginateMedia({
    filtered: list,
    cursor: { createdAt: "2026-10-01T00:00:00.000Z", id: "a" },
    sort: "newest",
    limit: 10,
    scanExhausted: true,
  });
  assert.deepEqual(page.items.map((i) => i.id), ["b", "c"]);
});

test("paginateMedia: halaman terakhir → tanpa kursor berikutnya", () => {
  const list = newestList(3);
  const page = paginateMedia({
    filtered: list,
    cursor: null,
    sort: "newest",
    limit: 10,
    scanExhausted: true,
  });
  assert.equal(page.items.length, 3);
  assert.equal(page.hasMore, false);
  assert.equal(page.nextCursorItem, null);
});

test("paginateMedia: sortir non-newest memakai id kursor saja", () => {
  const list: Item[] = [
    { id: "x", createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "y", createdAt: "2026-01-02T00:00:00.000Z" },
    { id: "z", createdAt: "2026-01-03T00:00:00.000Z" },
  ];
  const page = paginateMedia({
    filtered: list,
    cursor: { createdAt: "salah", id: "y" },
    sort: "title",
    limit: 10,
    scanExhausted: true,
  });
  assert.deepEqual(page.items.map((i) => i.id), ["z"]);
});

test("paginateMedia: kursor tak ditemukan → mulai dari awal (tidak menghilangkan data)", () => {
  const list = newestList(3);
  const page = paginateMedia({
    filtered: list,
    cursor: { createdAt: "1999-01-01T00:00:00.000Z", id: "hilang" },
    sort: "newest",
    limit: 2,
    scanExhausted: true,
  });
  assert.deepEqual(page.items.map((i) => i.id), ["m0", "m1"]);
  assert.equal(page.startIndex, 0);
});

test("paginateMedia: pemindaian belum habis → truncated=true", () => {
  const page = paginateMedia({
    filtered: newestList(3),
    cursor: null,
    sort: "newest",
    limit: 2,
    scanExhausted: false,
  });
  assert.equal(page.truncated, true);
});

test("paginateMedia: limit tak valid dinormalkan (>=1)", () => {
  const page = paginateMedia({
    filtered: newestList(5),
    cursor: null,
    sort: "newest",
    limit: 0,
    scanExhausted: true,
  });
  assert.equal(page.items.length, 1);
});

test("isScanTruncated: kebalikan dari exhausted", () => {
  assert.equal(isScanTruncated(true), false);
  assert.equal(isScanTruncated(false), true);
});
