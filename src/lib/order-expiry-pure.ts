import type { Order } from "@/lib/order-types";

/**
 * Logika murni KEDALUWARSA order (FASE P2) — dapat diuji tanpa DB.
 *
 * Hanya file ini yang bebas dari impor runtime (hanya `import type`), sehingga
 * dapat dijalankan oleh test Node (`--experimental-strip-types`) tanpa resolver
 * alias. Fungsi sebenarnya dipakai `@/lib/orders` (server-only).
 */

/** TTL fallback bila invoice tak menyimpan `expiresAt` (24 jam). */
export const DEFAULT_EXPIRY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Apakah sebuah order `menunggu_bayar` sudah KEDALUWARSA pada waktu `now`.
 * Waktu kedaluwarsa diambil dari `payment.expiresAt`; bila tidak ada, fallback
 * ke `createdAt + fallbackTtlMs`. Status selain `menunggu_bayar` selalu `false`.
 */
export function isOrderExpired(
  order: Pick<Order, "status" | "createdAt" | "payment">,
  now: Date = new Date(),
  fallbackTtlMs = DEFAULT_EXPIRY_TTL_MS,
): boolean {
  if (order.status !== "menunggu_bayar") return false;
  const expiresMs = order.payment?.expiresAt
    ? new Date(order.payment.expiresAt).getTime()
    : new Date(order.createdAt).getTime() + fallbackTtlMs;
  if (!Number.isFinite(expiresMs)) return false;
  return expiresMs < now.getTime();
}
