import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cartUnsubTokenId,
  newsletterUnsubTokenId,
  signCartUnsub,
  verifyCartUnsub,
  signNewsletterUnsubToken,
  verifyNewsletterUnsubToken,
} from "../src/lib/unsubscribe-token.ts";

/**
 * Uji regresi tautan opt-out (F-N1/N2) — penandatanganan & verifikasi HARUS
 * memakai tokenId yang sama (sebelumnya mismatch → tautan selalu ditolak).
 * Jalankan: `npm run test:unsub`
 */

const SECRET = "rahasia-uji-panjang";

test("F-N1: tanda tangan newsletter valid & terverifikasi", () => {
  const email = "budi@gmail.com";
  const sig = signNewsletterUnsubToken(email, SECRET);
  assert.ok(sig.length > 0);
  assert.equal(verifyNewsletterUnsubToken(email, sig, SECRET), true);
});

test("F-N1: email ber-titik (domain) tetap valid", () => {
  const sig = signNewsletterUnsubToken("a.b.c@mail.co.id", SECRET);
  assert.equal(verifyNewsletterUnsubToken("a.b.c@mail.co.id", sig, SECRET), true);
});

test("F-N1: normalisasi huruf besar/kecil & spasi", () => {
  const sig = signNewsletterUnsubToken("Budi@Gmail.com", SECRET);
  assert.equal(verifyNewsletterUnsubToken("  budi@gmail.com ", sig, SECRET), true);
});

test("F-N1: tanda tangan palsu / email lain ditolak", () => {
  const sig = signNewsletterUnsubToken("budi@gmail.com", SECRET);
  assert.equal(verifyNewsletterUnsubToken("lain@gmail.com", sig, SECRET), false);
  assert.equal(verifyNewsletterUnsubToken("budi@gmail.com", "palsu", SECRET), false);
  assert.equal(verifyNewsletterUnsubToken("budi@gmail.com", sig, "secret-lain"), false);
});

test("F-N1: tanpa secret → tidak ada tanda tangan & verifikasi gagal (fail-closed)", () => {
  const sig = signNewsletterUnsubToken("budi@gmail.com", "");
  assert.equal(sig, "");
  assert.equal(verifyNewsletterUnsubToken("budi@gmail.com", "", ""), false);
});

test("F-N2: tanda tangan cart valid & terverifikasi", () => {
  const uid = "abc123XYZ";
  const sig = signCartUnsub(uid, SECRET);
  assert.ok(sig.length > 0);
  assert.equal(verifyCartUnsub(uid, sig, SECRET), true);
});

test("F-N2: uid lain / signature dipalsukan ditolak", () => {
  const sig = signCartUnsub("uid-a", SECRET);
  assert.equal(verifyCartUnsub("uid-b", sig, SECRET), false);
  assert.equal(verifyCartUnsub("uid-a", "palsu", SECRET), false);
});

test("F-N2: tanpa secret → fail-closed", () => {
  assert.equal(signCartUnsub("uid-a", ""), "");
  assert.equal(verifyCartUnsub("uid-a", "", ""), false);
});

test("Domain separation: tanda tangan cart & newsletter tidak dapat dipertukarkan", () => {
  // newsletter-unsub:<email> vs cart-unsub:<uid> harus berbeda walau id sama.
  const id = "sama";
  const cartSig = signCartUnsub(id, SECRET);
  const newsSig = signNewsletterUnsubToken(id, SECRET);
  assert.notEqual(cartSig, newsSig);
  // Signature cart TIDAK boleh memverifikasi newsletter, & sebaliknya.
  assert.equal(verifyNewsletterUnsubToken(id, cartSig, SECRET), false);
  assert.equal(verifyCartUnsub(id, newsSig, SECRET), false);
});

test("tokenId kanonik ber-prefix", () => {
  assert.equal(cartUnsubTokenId("u1"), "cart-unsub:u1");
  assert.equal(newsletterUnsubTokenId("A@B.com"), "newsletter-unsub:a@b.com");
});
