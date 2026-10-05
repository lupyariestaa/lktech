/**
 * Logika MURNI transisi & klasifikasi status order (FASE P6) — bebas impor
 * runtime agar dapat diuji Node tanpa alias resolver.
 *
 * Melengkapi `order-types.ts` (yang berisi konstanta/label) dengan predikat
 * yang dipakai lintas alur: restore kupon, status final, status dibayar.
 */

/** Status ORDER (salinan ringkas — harus konsisten dengan `ORDER_STATUSES`). */
export type OrderStatusName =
  | "baru"
  | "menunggu_bayar"
  | "dibayar"
  | "menunggu_konfirmasi"
  | "diproses"
  | "selesai"
  | "dibatalkan"
  | "kedaluwarsa";

/** Status yang menandakan order SUDAH dibayar (uang masuk). */
export const PAID_STATUSES: readonly OrderStatusName[] = [
  "dibayar",
  "diproses",
  "selesai",
];

/**
 * Status FINAL/terminal: tidak lagi berpotensi menghasilkan pesanan baru.
 * - `dibatalkan` (manual), `kedaluwarsa` (auto), `selesai` (tuntas).
 */
export const TERMINAL_STATUSES: readonly OrderStatusName[] = [
  "dibatalkan",
  "kedaluwarsa",
  "selesai",
];

/**
 * Transisi yang WAJIB mengembalikan kuota kupon (`KP-C2`): ke `dibatalkan`
 * atau `kedaluwarsa` — terminal NON-penghasil yang membatalkan komitmen.
 */
export const RESTORE_COUPON_STATUSES: readonly OrderStatusName[] = [
  "dibatalkan",
  "kedaluwarsa",
];

/** Apakah order sudah dibayar. */
export function isPaidStatus(status: string): boolean {
  return (PAID_STATUSES as readonly string[]).includes(status);
}

/** Apakah status bersifat final/terminal (tanpa potensi lanjut). */
export function isTerminalStatus(status: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

/**
 * Apakah transisi DARI `previous` KE `next` harus mengembalikan kuota kupon.
 * Benar hanya bila: status berubah, `next` termasuk `RESTORE_COUPON_STATUSES`,
 * dan order sebelumnya BELUM final (hindari restore ganda).
 */
export function shouldRestoreCoupon(
  previous: string,
  next: string,
): boolean {
  if (previous === next) return false;
  if (!(RESTORE_COUPON_STATUSES as readonly string[]).includes(next)) return false;
  return !isTerminalStatus(previous);
}

/**
 * Apakah transisi DARI `previous` KE `next` memicu EMAIL status (hindari
 * email ganda untuk status sama — `EM-C3`). `baru` tak pernah memicu.
 */
export function shouldSendStatusEmail(previous: string, next: string): boolean {
  if (previous === next) return false;
  if (next === "baru") return false;
  return true;
}
