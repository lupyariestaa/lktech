import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Uji PWA (Tema 3.5, B2) — penjaga agar manifest & service worker tetap benar.
 * Jalankan: `npm run test:pwa`
 *
 * Membaca file sebagai teks (tanpa impor TS) → tak terpengaruh alias `@/`.
 */

const read = (rel: string) =>
  readFileSync(new URL(rel, import.meta.url), "utf8");

const sw = read("../public/sw.js");
const pwaTs = read("../src/lib/pwa.ts");
const manifestTs = read("../src/app/manifest.ts");
const robotsTs = read("../src/app/robots.ts");

test("versi cache sinkron antara src/lib/pwa.ts & public/sw.js", () => {
  const fromPwa = /PWA_CACHE\s*=\s*"([^"]+)"/.exec(pwaTs)?.[1];
  const fromSw = /const CACHE\s*=\s*"([^"]+)"/.exec(sw)?.[1];
  assert.ok(fromPwa, "PWA_CACHE harus ada di src/lib/pwa.ts");
  assert.ok(fromSw, "CACHE harus ada di public/sw.js");
  assert.equal(fromPwa, fromSw, "versi cache harus sama agar purge berlaku");
});

test("service worker: precache halaman offline & manifest", () => {
  assert.match(sw, /OFFLINE_URL\s*=\s*"\/offline"/);
  assert.match(sw, /"\/manifest\.webmanifest"/);
});

test("service worker: melewati /api, /admin, dan permintaan non-GET", () => {
  assert.match(sw, /request\.method !== "GET"/);
  assert.match(sw, /pathname\.startsWith\("\/api\/"\)/);
  assert.match(sw, /pathname\.startsWith\("\/admin\/"\)/);
});

test("service worker: navigasi network-first dengan fallback /offline", () => {
  assert.match(sw, /request\.mode === "navigate"/);
  assert.match(sw, /caches\.match\(OFFLINE_URL\)/);
});

test("manifest: field wajib untuk installability", () => {
  for (const field of [
    "name:",
    "short_name:",
    'start_url: "/"',
    'display: "standalone"',
    "theme_color:",
    "background_color:",
  ]) {
    assert.ok(manifestTs.includes(field), `manifest harus punya ${field}`);
  }
});

test("manifest: ikon 192 & 512 (any) + maskable", () => {
  assert.match(manifestTs, /192x192/);
  assert.match(manifestTs, /512x512/);
  assert.match(manifestTs, /purpose: "maskable"/);
});

test("robots: /offline di-disallow", () => {
  assert.match(robotsTs, /"\/offline"/);
});