/**
 * Logika MURNI laporan (Tema 3.3, FASE L4) — bebas impor runtime, dapat diuji.
 */

/** Status order yang dianggap "sudah dibayar". */
const PAID = ["dibayar", "diproses", "selesai"] as const;

export function isPaidStatus(status: string): boolean {
  return (PAID as readonly string[]).includes(status);
}

/** Baris order ringkas yang dibutuhkan agregat (subset aman). */
export type ReportOrder = {
  status: string;
  total: number;
  couponDiscount?: number;
  items?: Array<{ name: string; qty: number; subtotal: number }>;
};

/** Hasil agregat order untuk laporan. */
export type OrdersAggregate = {
  total: number;
  paid: number;
  completed: number;
  cancelled: number;
  expired: number;
  revenue: number;
  aov: number;
  couponsUsing: number;
  discountGiven: number;
  topProducts: Array<{ name: string; units: number; revenue: number }>;
};

/** Agregat daftar order → ringkasan laporan (murni). */
export function aggregateOrders(
  orders: readonly ReportOrder[],
  topN = 5,
): OrdersAggregate {
  let total = 0;
  let paid = 0;
  let completed = 0;
  let cancelled = 0;
  let expired = 0;
  let revenue = 0;
  let couponsUsing = 0;
  let discountGiven = 0;
  const products = new Map<string, { name: string; units: number; revenue: number }>();

  for (const o of orders) {
    total += 1;
    if (o.status === "selesai") completed += 1;
    if (o.status === "dibatalkan") cancelled += 1;
    if (o.status === "kedaluwarsa") expired += 1;

    if (typeof o.couponDiscount === "number" && o.couponDiscount > 0) {
      couponsUsing += 1;
      discountGiven += o.couponDiscount;
    }

    if (isPaidStatus(o.status)) {
      paid += 1;
      revenue += Number.isFinite(o.total) ? o.total : 0;
      for (const it of o.items ?? []) {
        const entry = products.get(it.name) ?? { name: it.name, units: 0, revenue: 0 };
        entry.units += it.qty;
        entry.revenue += Number.isFinite(it.subtotal) ? it.subtotal : 0;
        products.set(it.name, entry);
      }
    }
  }

  const aov = paid > 0 ? Math.round(revenue / paid) : 0;
  const topProducts = Array.from(products.values())
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, topN);

  return {
    total,
    paid,
    completed,
    cancelled,
    expired,
    revenue,
    aov,
    couponsUsing,
    discountGiven,
    topProducts,
  };
}

/** Perubahan persen (null bila pembanding ≤ 0). */
export function percentDelta(curr: number, prev: number): number | null {
  return prev > 0 ? (curr - prev) / prev : null;
}
