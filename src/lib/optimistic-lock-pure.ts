/**
 * Logika MURNI optimistic concurrency (ADM-11) — bebas I/O & `server-only`,
 * dapat diuji Node langsung (`--experimental-strip-types`).
 *
 * Setiap dokumen yang dapat diedit admin (settings, content, produk, proyek)
 * menyimpan field `version` (token unik). Klien mengirim `expectedVersion`
 * (versi yang dimuat terakhir); server menolak simpan bila versi sudah berubah
 * (admin lain menimpanya) → `version_conflict` (route memetakan ke 409).
 *
 * `expectedVersion` kosong/absen = TIDAK ada pemeriksaan. Ini menjaga
 * kompatibilitas mundur: impor backup, seed, dan pemanggil lama tetap boleh
 * menulis tanpa memegang versi.
 *
 * File ini SENGAJA mandiri (tak mengimpor modul lain) — pola sama seperti
 * `slug-reserve-pure.ts` / `broadcast-batch-pure.ts`.
 */

/** Nama field versi di dokumen Firestore. */
export const VERSION_FIELD = "version";

/** Kode error/response saat versi tak cocok. */
export const VERSION_CONFLICT_CODE = "version_conflict";

/** Panjang maksimum versi yang diterima dari input (batas aman). */
export const EXPECTED_VERSION_MAX_LEN = 128;

export type VersionConflict = {
  code: typeof VERSION_CONFLICT_CODE;
  /** Versi terkini di server (null bila dokumen belum ada). */
  current: string | null;
  /** Versi yang dikirim klien. */
  expected: string | null;
};

export type VersionCheck =
  | { ok: true }
  | { ok: false; conflict: VersionConflict };

function coerceVersion(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v ? v : null;
}

/** Normalisasi `expectedVersion` dari input tak tepercaya. */
export function normalizeExpectedVersion(value: unknown): string | null {
  const v = coerceVersion(value);
  if (v === null) return null;
  return v.slice(0, EXPECTED_VERSION_MAX_LEN);
}

/** Baca field versi dari data dokumen (aman untuk nilai apa pun). */
export function readVersion(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  return coerceVersion((data as Record<string, unknown>)[VERSION_FIELD]);
}

/**
 * Bandingkan versi terkini dengan yang diharapkan klien.
 *
 * - `expected` kosong → `{ ok: true }` (tanpa pemeriksaan; kompatibel mundur).
 * - `expected` ada & sama dengan `current` → `{ ok: true }`.
 * - selain itu → konflik (termasuk dokumen belum ada / versi tidak cocok).
 */
export function checkOptimisticVersion(
  current: unknown,
  expected: unknown,
): VersionCheck {
  const exp = normalizeExpectedVersion(expected);
  if (exp === null) return { ok: true };

  const cur = coerceVersion(current);
  if (cur === exp) return { ok: true };

  return {
    ok: false,
    conflict: { code: VERSION_CONFLICT_CODE, current: cur, expected: exp },
  };
}

/** Token versi baru yang unik (UUID bila tersedia). */
export function newVersionToken(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Error yang dilempar saat versi dokumen tak cocok. Route memetakan ini ke
 * HTTP 409 dengan `code: "version_conflict"` agar klien dapat menawarkan
 * "muat ulang" alih-alih menimpa perubahan admin lain.
 */
export class VersionConflictError extends Error {
  readonly code = VERSION_CONFLICT_CODE;
  readonly currentVersion: string | null;

  constructor(currentVersion: string | null) {
    super("Data sudah diubah oleh admin lain. Muat ulang halaman lalu coba lagi.");
    this.name = "VersionConflictError";
    this.currentVersion = currentVersion;
  }
}
