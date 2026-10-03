import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  normalizeOrder,
  ORDER_STATUSES,
  type Order,
  type OrderStatus,
} from "@/lib/order-types";
import {
  ANALYTICS_RANGES,
  type AnalyticsMode,
  type AnalyticsRange,
  type SalesAnalytics,
  type SalesPoint,
  type TopProduct,
} from "@/lib/sales-analytics-types";

export type {
  AnalyticsMode,
  AnalyticsRange,
  SalesAnalytics,
  SalesPoint,
  TopProduct,
} from "@/lib/sales-analytics-types";
export { ANALYTICS_RANGES } from "@/lib/sales-analytics-types";

/**
 * Agregasi analitik PENJUALAN (server-only).
 *
 * Catatan: modul ini BERBEDA dari `@/lib/analytics` (yang berisi pelacakan
 * event Vercel Analytics di klien). Tipe & konstanta ada di
 * `@/lib/sales-analytics-types` agar aman diimpor klien.
 *
 * Mengambil pesanan dalam jendela waktu lalu meringkasnya menjadi:
 * seri harian (omzet & jumlah order), total periode (termasuk AOV & tingkat
 * penyelesaian), distribusi status, dan produk terlaris.
 *
 * - Omzet default = Σ `total` pesanan berstatus "selesai" (konsisten dgn
 *   `getOrdersSummary`). Mode "all" menghitung semua status KECUALI "dibatalkan".
 * - Hari dihitung dari `createdAtISO`, dikelompokkan per hari LOKAL server.
 * - Query single-field (`where("createdAtISO", ">=", cutoff)`) — tanpa composite index.
 */

/** Kunci hari lokal (yyyy-mm-dd). */
function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Apakah order dihitung sebagai omzet untuk mode tertentu. */
function countsAsRevenue(order: Order, mode: AnalyticsMode): boolean {
  if (order.status === "dibatalkan") return false;
  if (mode === "all") return true;
  return order.status === "selesai";
}

/** Hitung analitik penjualan untuk `days` hari terakhir. */
export async function getSalesAnalytics(opts?: {
  days?: number;
  mode?: AnalyticsMode;
}): Promise<SalesAnalytics> {
  const days = ANALYTICS_RANGES.includes(opts?.days as AnalyticsRange)
    ? (opts!.days as number)
    : 30;
  const mode: AnalyticsMode = opts?.mode === "all" ? "all" : "completed";

  const db = getAdminDb();
  if (!db) {
    return {
      days,
      mode,
      series: buildEmptySeries(days),
      totals: { omzet: 0, orders: 0, aov: 0, completed: 0, cancelled: 0, completionRate: 0 },
      statusBreakdown: { baru: 0, diproses: 0, selesai: 0, dibatalkan: 0 },
      topProducts: [],
    };
  }

  const snap = await db.collection("orders").get();
  const orders = snap.docs
    .map((doc) =>
      normalizeOrder({ id: doc.id, ...(doc.data() as Record<string, unknown>) }),
    )
    .filter((o) => Boolean(o.createdAt));

  // Batas hari (mulai = 00:00 hari ke-(days-1) yang lalu).
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(now);
  start.setDate(now.getDate() - (days - 1));
  const startMs = start.getTime();

  const byDay = new Map<string, { omzet: number; orders: number }>();
  const statusBreakdown: Record<OrderStatus, number> = {
    baru: 0,
    diproses: 0,
    selesai: 0,
    dibatalkan: 0,
  };
  const productMap = new Map<string, TopProduct>();
  let omzetTotal = 0;
  let ordersCounted = 0;

  for (const o of orders) {
    const d = new Date(o.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getTime() < startMs) continue;

    if ((ORDER_STATUSES as readonly string[]).includes(o.status)) {
      statusBreakdown[o.status] += 1;
    }

    if (!countsAsRevenue(o, mode)) continue;

    const key = dayKey(d);
    const bucket = byDay.get(key) ?? { omzet: 0, orders: 0 };
    bucket.omzet += o.total;
    bucket.orders += 1;
    byDay.set(key, bucket);

    omzetTotal += o.total;
    ordersCounted += 1;

    for (const it of o.items) {
      const pk = it.variantSlug ? `${it.slug}::${it.variantSlug}` : it.slug;
      const prev =
        productMap.get(pk) ?? { slug: it.slug, name: it.name, units: 0, omzet: 0 };
      prev.units += it.qty;
      prev.omzet += it.subtotal;
      productMap.set(pk, prev);
    }
  }

  const series: SalesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = dayKey(d);
    const bucket = byDay.get(key) ?? { omzet: 0, orders: 0 };
    series.push({
      dateISO: key,
      label: d.toLocaleDateString("id-ID", { day: "numeric" }),
      full: d.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      omzet: bucket.omzet,
      orders: bucket.orders,
    });
  }

  const completed = statusBreakdown.selesai;
  const cancelled = statusBreakdown.dibatalkan;
  const totalOrders = orders.length;

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.omzet - a.omzet || b.units - a.units)
    .slice(0, 10);

  return {
    days,
    mode,
    series,
    totals: {
      omzet: omzetTotal,
      orders: ordersCounted,
      aov: ordersCounted > 0 ? Math.round(omzetTotal / ordersCounted) : 0,
      completed,
      cancelled,
      completionRate: totalOrders > 0 ? completed / totalOrders : 0,
    },
    statusBreakdown,
    topProducts,
  };
}

/** Seri kosong (bila Admin SDK tak tersedia) — tetap punya struktur. */
function buildEmptySeries(days: number): SalesPoint[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const out: SalesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push({
      dateISO: dayKey(d),
      label: d.toLocaleDateString("id-ID", { day: "numeric" }),
      full: d.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      omzet: 0,
      orders: 0,
    });
  }
  return out;
}
