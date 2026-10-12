import { test } from "node:test";
import assert from "node:assert/strict";
import { checkTrustedUrl } from "../src/lib/trusted-url.ts";

/**
 * Uji validasi URL tepercaya (gap G19) — mencegah kredensial terkirim ke host asing.
 * Jalankan: `npm run test:trusted-url`
 */

test("checkTrustedUrl: host resmi diterima", () => {
  assert.equal(checkTrustedUrl("https://api.mayar.io/hl/v2", "mayar").ok, true);
  assert.equal(checkTrustedUrl("https://api.mayar.id/hl/v2", "mayar").ok, true);
  assert.equal(checkTrustedUrl("https://safe-sloth-12345.upstash.io", "upstash").ok, true);
});

test("checkTrustedUrl: normalisasi trailing slash", () => {
  const r = checkTrustedUrl("https://api.mayar.id/hl/v2///", "mayar");
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.url, "https://api.mayar.id/hl/v2");
});

test("checkTrustedUrl: host asing DITOLAK", () => {
  assert.equal(checkTrustedUrl("https://evil.example.com", "mayar").ok, false);
  assert.equal(checkTrustedUrl("https://mayar.id.evil.com", "mayar").ok, false);
  assert.equal(checkTrustedUrl("https://upstash.io.evil.com", "upstash").ok, false);
});

test("checkTrustedUrl: wajib HTTPS", () => {
  assert.equal(checkTrustedUrl("http://api.mayar.id", "mayar").ok, false);
});

test("checkTrustedUrl: tolak userinfo (penyamaran host)", () => {
  assert.equal(checkTrustedUrl("https://user:pass@api.mayar.id", "mayar").ok, false);
  assert.equal(checkTrustedUrl("https://api.mayar.id@evil.com", "mayar").ok, false);
});

test("checkTrustedUrl: kosong / tidak valid", () => {
  assert.equal(checkTrustedUrl("", "mayar").ok, false);
  assert.equal(checkTrustedUrl(undefined, "mayar").ok, false);
  assert.equal(checkTrustedUrl("bukan-url", "mayar").ok, false);
});
