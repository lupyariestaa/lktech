import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  isAlreadyExistsError,
  SlugTakenError,
} from "../src/lib/slug-reserve-pure.ts";

/**
 * Regresi ADM-28: race slug produk/proyek.
 *
 * Saat MEMBUAT produk/proyek baru, penyimpanan memakai `create()` atomik
 * Firestore yang menolak bila slug sudah dipakai → `SlugTakenError` → HTTP 409.
 * Ini mencegah dua admin/tab saling menimpa (perilaku lama `set({ merge })`).
 *
 * Uji logika murni + wiring. Ini bukan pengganti E2E terautentikasi.
 * Jalankan: `npm run test:admin-slug`
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

/* ----------------------- isAlreadyExistsError (murni) ----------------------- */

test("isAlreadyExistsError: mengenali kode ALREADY_EXISTS (angka & string)", () => {
  assert.equal(isAlreadyExistsError({ code: 6 }), true);
  assert.equal(isAlreadyExistsError({ code: "6" }), true);
  assert.equal(isAlreadyExistsError({ code: "already-exists" }), true);
  assert.equal(isAlreadyExistsError({ code: "ALREADY_EXISTS" }), true);
  assert.equal(isAlreadyExistsError({ code: "  Already-Exists  " }), true);
});

test("isAlreadyExistsError: mengenali kode di `cause` (error terbungkus)", () => {
  assert.equal(isAlreadyExistsError({ cause: { code: 6 } }), true);
  assert.equal(
    isAlreadyExistsError({ code: 13, cause: { code: "already-exists" } }),
    false,
  );
});

test("isAlreadyExistsError: menolak error lain & nilai non-objek", () => {
  assert.equal(isAlreadyExistsError({ code: 5 }), false); // NOT_FOUND
  assert.equal(isAlreadyExistsError({ code: "permission-denied" }), false);
  assert.equal(isAlreadyExistsError(new Error("jaringan")), false);
  assert.equal(isAlreadyExistsError(null), false);
  assert.equal(isAlreadyExistsError(undefined), false);
  assert.equal(isAlreadyExistsError("already-exists"), false);
});

/* ----------------------------- SlugTakenError ------------------------------ */

test("SlugTakenError: membawa slug & nama kelas yang jelas", () => {
  const err = new SlugTakenError("produk-x");
  assert.ok(err instanceof Error);
  assert.ok(err instanceof SlugTakenError);
  assert.equal(err.name, "SlugTakenError");
  assert.equal(err.slug, "produk-x");
  assert.match(err.message, /produk-x/);
});

/* --------------------------------- Wiring ---------------------------------- */

test("ADM-28: penyimpanan membuat dokumen baru via create() atomik", () => {
  for (const rel of ["src/lib/products.ts", "src/lib/projects.ts"]) {
    const src = read(rel);
    assert.match(src, /import \{ isAlreadyExistsError, SlugTakenError \}/);
    assert.match(src, /opts\?:\s*\{\s*create\?:\s*boolean\s*\}/);
    assert.match(src, /if \(opts\?\.create\)/);
    assert.match(src, /\.create\(payload\)/);
    assert.match(src, /throw new SlugTakenError\(/);
    // Pembaruan tetap memakai merge (backward-compatible).
    assert.match(src, /\.set\(payload, \{ merge: true \}\)/);
  }
});

test("ADM-28: route POST membaca intent create & membalas 409 slug_taken", () => {
  for (const rel of [
    "src/app/api/admin/products/route.ts",
    "src/app/api/admin/projects/route.ts",
  ]) {
    const src = read(rel);
    assert.match(src, /import \{ SlugTakenError \} from "@\/lib\/slug-reserve-pure"/);
    assert.match(src, /\.create === true/);
    assert.match(src, /await save(Product|Project)\([^)]*\{ create: wantsCreate \}\)/);
    assert.match(src, /err instanceof SlugTakenError/);
    assert.match(src, /code: "slug_taken"/);
    assert.match(src, /status: 409/);
  }
});

test("ADM-28: klien mengirim intent create & UI memakai flag isNew", () => {
  const api = read("src/lib/admin-api.ts");
  assert.match(api, /opts\?:\s*\{\s*create\?:\s*boolean\s*\}/);
  assert.match(api, /create: opts\?\.create === true/);

  assert.match(
    read("src/components/admin/products-manager.tsx"),
    /saveProduct\(editing, \{ create: isNew \}\)/,
  );
  assert.match(
    read("src/components/admin/projects-manager.tsx"),
    /saveProject\(\{ \.\.\.editing, slug, year \}, \{ create: isNew \}\)/,
  );
});
