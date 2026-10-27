/**
 * Logika murni BATCH/CURSOR broadcast (ADM-18) — bebas I/O & `server-only`,
 * dapat diuji Node langsung (`--experimental-strip-types`).
 *
 * Broadcast besar dipecah menjadi batch agar tidak timeout serverless. Kursor
 * berbasis **EMAIL** (bukan offset) supaya penerima yang sudah diproses tidak
 * pernah dikirim ulang meski daftar penerima berubah antar batch (monoton naik).
 *
 * File ini SENGAJA mandiri (tak mengimpor modul lain) — pola sama seperti
 * `coupon-pure.ts` / `broadcast-idempotency-pure.ts`.
 */

/** Batas kirim per batch (cegah timeout serverless) — F-N7/ADM-18. */
export const BROADCAST_MAX_PER_RUN = 200;

/** Panjang maksimum kursor email yang diterima (batas aman input). */
export const BROADCAST_CURSOR_MAX_LEN = 320;

/**
 * Normalisasi kursor email dari input tak tepercaya. Mengembalikan `null` bila
 * tidak ada / tidak valid (berarti: mulai dari awal).
 */
export function normalizeBroadcastCursor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (!v || v.length > BROADCAST_CURSOR_MAX_LEN) return null;
  return v;
}

export type BroadcastBatch = {
  /** Email yang akan dikirim pada batch ini (semua `> cursor`). */
  batch: string[];
  /** Kursor baru = email terakhir batch (atau kursor lama bila batch kosong). */
  nextCursor: string | null;
  /** Sisa penerima SETELAH batch ini. */
  remaining: number;
  /** Jumlah penerima tersisa termasuk batch ini (setelah kursor). */
  total: number;
  /** True bila tak ada sisa setelah batch ini. */
  done: boolean;
};

/**
 * Ambil batch penerima SETELAH `cursor` (email terakhir yang sudah diproses).
 *
 * Daftar penerima tidak harus terurut (diurutkan di sini secara defensif).
 * Batch berikutnya HANYA berisi email `> cursor`, sehingga penerima yang sudah
 * diproses tidak pernah masuk lagi (anti-duplikat saat "lanjutkan batch").
 */
export function nextBroadcastBatch(
  recipients: readonly string[],
  cursor: string | null,
  batchSize: number = BROADCAST_MAX_PER_RUN,
): BroadcastBatch {
  const size =
    Number.isFinite(batchSize) && Math.floor(batchSize) > 0
      ? Math.floor(batchSize)
      : BROADCAST_MAX_PER_RUN;
  const norm = cursor && cursor.trim() ? cursor.trim().toLowerCase() : null;

  const pending = (norm ? recipients.filter((e) => e > norm) : recipients.slice())
    .slice()
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const batch = pending.slice(0, size);
  const nextCursor = batch.length > 0 ? batch[batch.length - 1] : norm;
  const remaining = Math.max(0, pending.length - batch.length);

  return {
    batch,
    nextCursor,
    remaining,
    total: pending.length,
    done: remaining === 0,
  };
}
