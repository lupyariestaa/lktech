import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  computePaymentMetrics,
  type PaymentMetricRow,
  type PaymentMetrics,
} from "@/lib/payment-metrics-pure";

/**
 * Metrik pembayaran (Mayar) dari koleksi `orders` (fase S5). Best-effort.
 * Membaca jendela `days` hari terakhir (default 30), field minimal.
 */
export async function getPaymentMetrics(days = 30): Promise<PaymentMetrics> {
  const empty: PaymentMetrics = {
    gatewayOrders: 0,
    paid: 0,
    pending: 0,
    expired: 0,
    mismatch: 0,
    paidAmount: 0,
    conversionRate: 0,
  };
  const db = getAdminDb();
  if (!db) return empty;
  try {
    const safeDays = Math.min(Math.max(Math.floor(days), 1), 365);
    const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();
    const snap = await db
      .collection("orders")
      .where("createdAtISO", ">=", cutoff)
      .select("status", "total", "payment", "paymentMismatch")
      .get();

    const rows: PaymentMetricRow[] = snap.docs.map((doc) => ({
      status: String(doc.get("status") ?? ""),
      total: Number(doc.get("total")) || 0,
      payment: doc.get("payment") as PaymentMetricRow["payment"],
      paymentMismatch: doc.get("paymentMismatch") as PaymentMetricRow["paymentMismatch"],
    }));
    return computePaymentMetrics(rows);
  } catch (err) {
    console.error("[payment-analytics] gagal menghitung metrik:", err);
    return empty;
  }
}
