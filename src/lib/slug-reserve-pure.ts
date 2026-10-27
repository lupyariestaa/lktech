/**
 * Logika murni MERESERVASI SLUG (ADM-28) — tanpa I/O & `server-only`, agar dapat
 * diuji Node langsung (`--experimental-strip-types`) tanpa resolver alias.
 *
 * Dipakai saat **membuat** produk/proyek baru: penyimpanan memakai `create()`
 * atomik Firestore (bukan `set({ merge: true })`) sehingga dua admin/tab yang
 * membuat slug sama tidak bisa saling menimpa — yang kalah menerima
 * `SlugTakenError` dan route mengembalikan HTTP 409.
 *
 * File ini SENGAJA mandiri (tak mengimpor modul lain) — pola sama seperti
 * `coupon-pure.ts` / `orders-filter-pure.ts`.
 */

/**
 * True bila `err` berasal dari penulisan `create` yang menemukan dokumen sudah
 * ada (Firestore `ALREADY_EXISTS`). SDK/versi berbeda mengisi `code` sebagai
 * angka GRPC (`6`) atau string (`"already-exists"`/`"ALREADY_EXISTS"`); keduanya
 * dikenali. `cause` ikut diperiksa untuk error yang dibungkus.
 */
export function isAlreadyExistsError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  const code = (err as { code?: unknown }).code;
  if (typeof code === "number") return code === 6;
  if (typeof code === "string") {
    // Firestore memakai `"already-exists"`; sebagian SDK memakai enum dengan
    // garis bawah (`"ALREADY_EXISTS"`) — normalkan keduanya.
    const c = code.trim().toLowerCase().replace(/_/g, "-");
    return c === "6" || c === "already-exists";
  }

  // Beberapa pembungkus menyimpan kode di `cause`.
  const cause = (err as { cause?: unknown }).cause;
  if (cause && cause !== err) return isAlreadyExistsError(cause);

  return false;
}

/**
 * Error: slug sudah dipakai (create atomik gagal mereservasi). Route admin
 * memetakannya menjadi HTTP 409 + `code: "slug_taken"`.
 */
export class SlugTakenError extends Error {
  readonly slug: string;

  constructor(slug: string) {
    super(`Slug "${slug}" sudah dipakai.`);
    this.name = "SlugTakenError";
    this.slug = slug;
  }
}
