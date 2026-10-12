/**
 * Metrik pembayaran (Mayar) murni (fase S5) — bebas impor; dapat diuji Node.
 * Menghitung ringkasan penggunaan pembayaran dari baris order.
 *
 * SUMBER TUNGGAL "dibayar" (gap G15): status ORDER (`orders.status`), bukan
 * `payment.status`. Sebelumnya kedua metrik memakai definisi berbeda → order yang
 * dibatalkan setelah bayar ikut terhitung "paid" & omzet di-overcount. Kini
 * `paid`, `paidAmount`, `pending`, `expired`, dan `conversionRate` semua
 * diturunkan dari `orders.status` yang sama.
 */

/** Status order yang menandakan pembayaran lunas. */
export const PAID_STATUSES = ["dibayar", "diproses", "selesai"] as const;

/** Status order yang menandakan masih menunggu pembayaran. */
const PENDING_STATUSES = ["menunggu_bayar", "menunggu_konfirmasi"] as const;

/** Batas hari yang aman untuk query metrik (gap G16). */
export const MIN_METRIC_DAYS = 1;
export const MAX_METRIC_DAYS = 365;
export const DEFAULT_METRIC_DAYS = 30;

/** Clamp `days` ke rentang aman & bulatkan (gap G16). */
export function clampDays(days: unknown): number {
  const n = Math.floor(Number(days));
  if (!Number.isFinite(n)) return DEFAULT_METRIC_DAYS;
  return Math.min(Math.max(n, MIN_METRIC_DAYS), MAX_METRIC_DAYS);
}

/** Konversi = lunas ÷ (lunas + kedaluwarsa); order menunggu tidak dihukum. */
function paymentConversionRate(breakdown: Record<string, number>): number {
  const paid = PAID_STATUSES.reduce((n, s) => n + (breakdown[s] ?? 0), 0);
  const expired = breakdown.kedaluwarsa ?? 0;
  const denom = paid + expired;
  return denom > 0 ? paid / denom : 0;
}

export type PaymentMetricRow = {
  status: string;
  total: number;
  payment?: { status?: string; provider?: string; amount?: number } | null;
  paymentMismatch?: { received?: number; expected?: number } | null;
};

export type PaymentMetrics = {
  /** Order yang memakai gateway (punya data payment). */
  gatewayOrders: number;
  /** Sudah dibayar (status ORDER lunas). */
  paid: number;
  /** Menunggu bayar. */
  pending: number;
  /** Kedaluwarsa. */
  expired: number;
  /** Kurang bayar (mismatch). */
  mismatch: number;
  /** Nilai omzet dari order yang sudah dibayar (status order lunas). */
  paidAmount: number;
  /** Konversi pembayaran (paid / (paid + expired)). */
  conversionRate: number;
};

/** Hitung metrik pembayaran dari baris order. */
export function computePaymentMetrics(rows: readonly PaymentMetricRow[]): PaymentMetrics {
  let gatewayOrders = 0;
  let paid = 0;
  let pending = 0;
  let expired = 0;
  let mismatch = 0;
  let paidAmount = 0;
  const breakdown: Record<string, number> = {};

  const paidSet = new Set<string>(PAID_STATUSES);
  const pendingSet = new Set<string>(PENDING_STATUSES);

  for (const r of rows) {
    breakdown[r.status] = (breakdown[r.status] ?? 0) + 1;
    // `gatewayOrders` tetap dari data payment (menandakan order memakai gateway).
    if (r.payment?.provider) gatewayOrders += 1;

    // Sumber tunggal "dibayar": status ORDER (gap G15).
    if (paidSet.has(r.status)) {
      paid += 1;
      paidAmount += r.total;
    } else if (pendingSet.has(r.status)) {
      pending += 1;
    } else if (r.status === "kedaluwarsa") {
      expired += 1;
    }

    if (r.paymentMismatch) mismatch += 1;
  }

  const conversion = paymentConversionRate(breakdown);

  return {
    gatewayOrders,
    paid,
    pending,
    expired,
    mismatch,
    paidAmount,
    conversionRate: conversion,
  };
}
