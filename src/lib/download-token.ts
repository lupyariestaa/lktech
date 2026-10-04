import crypto from "node:crypto";

/**
 * Token unduhan (murni kripto — TANPA dependensi server-only, agar dapat diuji).
 *
 * Token = `{tokenId}.{hmacBase64Url}` dengan `hmac = HMAC_SHA256(secret, tokenId)`.
 * `verifyToken` membandingkan signature secara timing-safe.
 */

/** Hitung signature HMAC untuk `tokenId`. */
export function signTokenId(tokenId: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(tokenId).digest("base64url");
}

/** Bentuk token final `{tokenId}.{sig}`. */
export function buildToken(tokenId: string, secret: string): string {
  return `${tokenId}.${signTokenId(tokenId, secret)}`;
}

/**
 * Verifikasi token; mengembalikan `tokenId` bila signature valid, else null.
 * Aman terhadap panjang berbeda (perbandingan timing-safe).
 */
export function parseToken(token: string, secret: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const tokenId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!tokenId || !sig) return null;
  const expected = signTokenId(tokenId, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return crypto.timingSafeEqual(a, b) ? tokenId : null;
}

/** Id token acak (opaque, URL-safe). */
export function randomTokenId(): string {
  return crypto.randomBytes(24).toString("base64url");
}
