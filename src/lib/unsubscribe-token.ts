import crypto from "node:crypto";

/**
 * Token BERLANGGANAN-ULANG bertanda tangan HMAC (murni, dapat diuji).
 *
 * Latar (bug F-N1/N2): penandatanganan memakai `tokenId` ber-prefix
 * (`cart-unsub:<id>` / `newsletter-unsub:<email>`) tetapi verifikasi memakai id
 * mentah → HMAC tidak pernah cocok → tautan opt-out selalu ditolak. Modul ini
 * menyatukan penandatanganan & verifikasi agar prefix konsisten di kedua sisi.
 *
 * Implementasi HMAC inline (bebas impor alias) agar dapat diuji Node langsung —
 * sama seperti `download-token.ts`.
 */

/** Prefix domain-separation (jangan diubah tanpa migrasi — mengubahnya membatalkan tautan lama). */
export const CART_UNSUB_PREFIX = "cart-unsub:";
export const NEWSLETTER_UNSUB_PREFIX = "newsletter-unsub:";

/** HMAC-SHA256 base64url dari `tokenId`. */
function hmac(tokenId: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(tokenId).digest("base64url");
}

/**
 * Verifikasi bahwa `sig` adalah HMAC yang sah untuk `tokenId` (timing-safe).
 * `sig` dibandingkan terhadap `hmac(tokenId)` — konsisten dgn `signUnsubTokenId`.
 */
function verify(tokenId: string, sig: string, secret: string): boolean {
  if (!secret || !sig) return false;
  const expected = hmac(tokenId, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** tokenId kanonik untuk opt-out pengingat keranjang. */
export function cartUnsubTokenId(uid: string): string {
  return `${CART_UNSUB_PREFIX}${uid}`;
}

/** tokenId kanonik untuk opt-out newsletter (email dinormalisasi huruf kecil). */
export function newsletterUnsubTokenId(email: string): string {
  return `${NEWSLETTER_UNSUB_PREFIX}${email.trim().toLowerCase()}`;
}

/** Buat tanda tangan untuk tokenId tertentu (kosong → tanpa tanda tangan). */
export function signUnsubTokenId(tokenId: string, secret: string): string {
  return secret ? hmac(tokenId, secret) : "";
}

/** Verifikasi `sig` untuk tokenId tertentu. */
export function verifyUnsubTokenId(
  tokenId: string,
  sig: string,
  secret: string,
): boolean {
  return verify(tokenId, sig, secret);
}

/* ---- Pembantu spesifik fitur (memakai tokenId kanonik) ---- */

export function signCartUnsub(uid: string, secret: string): string {
  return signUnsubTokenId(cartUnsubTokenId(uid), secret);
}

export function verifyCartUnsub(uid: string, sig: string, secret: string): boolean {
  return verifyUnsubTokenId(cartUnsubTokenId(uid), sig, secret);
}

export function signNewsletterUnsubToken(email: string, secret: string): string {
  return signUnsubTokenId(newsletterUnsubTokenId(email), secret);
}

export function verifyNewsletterUnsubToken(
  email: string,
  sig: string,
  secret: string,
): boolean {
  return verifyUnsubTokenId(newsletterUnsubTokenId(email), sig, secret);
}
