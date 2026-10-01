/**
 * Utilitas "kembali ke tujuan" setelah login.
 *
 * Nilai `next` berasal dari query string yang BISA dimanipulasi pengguna, jadi
 * tidak boleh langsung dianggap aman. Kita hanya mengizinkan **path relatif
 * internal** untuk mencegah open-redirect (mis. `next=https://evil.com` atau
 * `next=//evil.com`).
 */
const DEFAULT_REDIRECT = "/akun";

/** Apakah sebuah string merupakan path relatif internal yang aman. */
export function isSafeInternalPath(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  // Harus diawali satu "/" (bukan "//" atau "/\" yang bisa jadi host protokol-relative).
  if (!v.startsWith("/")) return false;
  if (v.startsWith("//") || v.startsWith("/\\")) return false;
  // Tolak backslash & karakter kontrol (proteksi tambahan).
  if (/[\\\u0000-\u001f]/.test(v)) return false;
  // Tolak skema seperti "javascript:" yang tersisip setelah "/" (jarang, tapi murah).
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(v)) return false;
  return true;
}

/**
 * Mengembalikan `next` bila aman; jika tidak, kembalikan default (`/akun`).
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback: string = DEFAULT_REDIRECT,
): string {
  return isSafeInternalPath(value) ? (value as string).trim() : fallback;
}
