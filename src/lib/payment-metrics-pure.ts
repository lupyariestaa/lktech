/**
 * Metrik pembayaran (Mayar) murni (fase S5) — bebas impor; dapat diuji Node.
 * Menghitung ringkasan penggunaan pembayaran dari baris order.
 */

/** Status order yang menandakan pembayaran lunas. */
const PAID_STATUSES = ["dibayar", "diproses", "selesai"] as const;

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
  /** Sudah dibayar (status bayar = dibayar). */
  paid: number;
  /** Menunggu bayar. */
  pending: number;
  /** Kedaluwarsa. */
  expired: number;
  /** Kurang bayar (mismatch). */
  mismatch: number;
  /** Nilai omzet dari order yang sudah dibayar. */
  paidAmount: number;
  /** Konversi pembayaran (paid / (paid+expired)). */
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

  for (const r of rows) {
    breakdown[r.status] = (breakdown[r.status] ?? 0) + 1;
    const hasGateway = Boolean(r.payment?.provider);
    if (hasGateway) gatewayOrders += 1;
    const payStatus = r.payment?.status ?? "";
    if (payStatus === "dibayar") {
      paid += 1;
      paidAmount += r.total;
    }
    if (payStatus === "menunggu") pending += 1;
    if (r.paymentMismatch) mismatch += 1;
    if (r.status === "kedaluwarsa") expired += 1;
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
