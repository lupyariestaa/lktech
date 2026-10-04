import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildToken,
  parseToken,
  randomTokenId,
  signTokenId,
} from "../src/lib/download-token.ts";

/**
 * Uji token unduhan (FASE P1): sign/verify HMAC & penolakan token tak valid.
 * Jalankan: `npm run test:downloads`
 */

const SECRET = "rahasia-uji-yang-panjang";

test("token yang dibangun dapat diverifikasi kembali", () => {
  const id = randomTokenId();
  const token = buildToken(id, SECRET);
  assert.equal(parseToken(token, SECRET), id);
});

test("verifikasi gagal dengan secret berbeda", () => {
  const token = buildToken(randomTokenId(), SECRET);
  assert.equal(parseToken(token, "secret-lain"), null);
});

test("token yang diubah (signature salah) ditolak", () => {
  const id = randomTokenId();
  const token = buildToken(id, SECRET);
  const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
  assert.equal(parseToken(tampered, SECRET), null);
});

test("token tanpa pemisah '.' ditolak", () => {
  assert.equal(parseToken("tanpa-titik", SECRET), null);
});

test("token id palsu (signature dari id lain) ditolak", () => {
  const idA = randomTokenId();
  const sigA = signTokenId(idA, SECRET);
  const forged = `${randomTokenId()}.${sigA}`;
  assert.equal(parseToken(forged, SECRET), null);
});
