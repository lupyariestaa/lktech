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
import { ANALYTICS_TIMEZONE, computeCompletionRate } from "@/lib/metrics-spec";

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
 * `@/lib/sales-analytics-types` agar aman diimpor klien. Definisi metrik resmi
 * ada di `@/lib/metrics-spec` (satu sumber kebenaran lintas halaman).
 *
 * Mengambil pesanan DALAM JENDELA waktu (`where("createdAtISO", ">=", cutoff)`)
 * lalu meringkasnya menjadi: seri harian (omzet & jumlah order), total periode
 * (termasuk AOV & tingkat penyelesaian), distribusi status, produk terlaris.
 *
 * - **Omzet** = Σ `total` (netto setelah diskon) pesanan berstatus "selesai".
 *   Mode "all" menghitung semua status KECUALI "dibatalkan" (juga netto).
 *   "Produk terlaris" memakai item `subtotal` (BRUTO) — lihat spesifikasi.
 * - Hari dikelompokkan per hari zona `Asia/Jakarta` (konsisten server & admin).
 * - Query di-filter jendela + `.select(...)` (tanpa full scan) — `AN-C2`.
 */

/** Kunci hari di zona waktu analitik (yyyy-mm-dd). */
function dayKeyInTz(d: Date, timeZone: string): string {
  // en-CA menghasilkan format yyyy-mm-dd; aman untuk kunci.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Label singkat tanggal (mis. "5") untuk sumbu grafik. */
function dayLabel(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone,
    day: "numeric",
  }).format(d);
}

/** Label lengkap tanggal (mis. "Sen, 5 Okt") untuk tooltip. */
function dayFullLabel(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

/** Apakah order dihitung sebagai omzet untuk mode tertentu. */
function countsAsRevenue(order: Order, mode: AnalyticsMode): boolean {
  if (order.status === "dibatalkan") return false;
  if (mode === "all") return true;
  return order.status === "selesai";
}

/** Batas awal jendela (ms) — `days` hari terakhir pada zona analitik. */
function startOfWindow(days: number, timeZone: string): number {
  // Kunci tanggal "hari ini" di TZ, lalu mundur (days - 1) hari dari tengah malam.
  const todayKey = dayKeyInTz(new Date(), timeZone);
  const [y, m, d] = todayKey.split("-").map(Number);
  // Tengah malam hari ini menurut UTC dari komponen tanggal TZ (cukup sebagai
  // pembanding konsisten terhadap createdAtISO, yang disimpan dalam UTC).
  const nowMidnight = Date.UTC(y, m - 1, d);
  return nowMidnight - (days - 1) * 86_400_000;
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
      deltas: { omzet: null, orders: null, aov: null },
      statusBreakdown: { baru: 0, diproses: 0, selesai: 0, dibatalkan: 0 },
      topProducts: [],
    };
  }

  // `AN-C2`: filter jendela di query + proyeksi field yang dibutuhkan saja
  // (hindari full-collection scan). Buffer 1 hari untuk aman terhadap batas TZ.
  // `AN-P1`: ambil 2× jendela agar bisa membandingkan dengan periode sebelumnya.
  const startMs = startOfWindow(days, ANALYTICS_TIMEZONE);
  const prevStartMs = startMs - days * 86_400_000;
  const cutoffISO = new Date(prevStartMs - 86_400_000).toISOString();

  const snap = await db
    .collection("orders")
    .where("createdAtISO", ">=", cutoffISO)
    .select("status", "total", "subtotal", "createdAtISO", "items", "coupon")
    .get();

  const orders = snap.docs
    .map((doc) =>
      normalizeOrder({ id: doc.id, ...(doc.data() as Record<string, unknown>) }),
    )
    .filter((o) => Boolean(o.createdAt));

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
  // Periode sebelumnya (`AN-P1`).
  let prevOmzet = 0;
  let prevOrders = 0;

  for (const o of orders) {
    const d = new Date(o.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getTime() < prevStartMs) continue;

    const inPrev = d.getTime() < startMs;

    if (!inPrev && (ORDER_STATUSES as readonly string[]).includes(o.status)) {
      statusBreakdown[o.status] += 1;
    }

    if (!countsAsRevenue(o, mode)) continue;

    const total = Number.isFinite(o.total) ? o.total : 0;
    if (inPrev) {
      prevOmzet += total;
      prevOrders += 1;
      continue;
    }

    const key = dayKeyInTz(d, ANALYTICS_TIMEZONE);
    const bucket = byDay.get(key) ?? { omzet: 0, orders: 0 };
    bucket.omzet += total;
    bucket.orders += 1;
    byDay.set(key, bucket);

    omzetTotal += total;
    ordersCounted += 1;

    for (const it of o.items) {
      const pk = it.variantSlug ? `${it.slug}::${it.variantSlug}` : it.slug;
      const prev =
        productMap.get(pk) ?? { slug: it.slug, name: it.name, units: 0, omzet: 0 };
      prev.units += it.qty;
      prev.omzet += Number.isFinite(it.subtotal) ? it.subtotal : 0;
      productMap.set(pk, prev);
    }
  }

  const series: SalesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(startMs + (days - 1 - i) * 86_400_000);
    const key = dayKeyInTz(d, ANALYTICS_TIMEZONE);
    const bucket = byDay.get(key) ?? { omzet: 0, orders: 0 };
    series.push({
      dateISO: key,
      label: dayLabel(d, ANALYTICS_TIMEZONE),
      full: dayFullLabel(d, ANALYTICS_TIMEZONE),
      omzet: bucket.omzet,
      orders: bucket.orders,
    });
  }

  const completed = statusBreakdown.selesai;
  const cancelled = statusBreakdown.dibatalkan;
  // `AN-C1`: tingkat penyelesaian dihitung dari jendela (bukan seluruh riwayat).
  const completionRate = computeCompletionRate(statusBreakdown);

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.omzet - a.omzet || b.units - a.units)
    .slice(0, 10);

  const aov = ordersCounted > 0 ? Math.round(omzetTotal / ordersCounted) : 0;
  const prevAov = prevOrders > 0 ? Math.round(prevOmzet / prevOrders) : 0;
  const pct = (curr: number, prev: number): number | null =>
    prev > 0 ? (curr - prev) / prev : null;

  return {
    days,
    mode,
    series,
    totals: {
      omzet: omzetTotal,
      orders: ordersCounted,
      aov,
      completed,
      cancelled,
      completionRate,
    },
    deltas: {
      omzet: pct(omzetTotal, prevOmzet),
      orders: pct(ordersCounted, prevOrders),
      aov: pct(aov, prevAov),
    },
    statusBreakdown,
    topProducts,
  };
}

/** Seri kosong (bila Admin SDK tak tersedia) — tetap punya struktur. */
function buildEmptySeries(days: number): SalesPoint[] {
  const now = new Date();
  const out: SalesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    out.push({
      dateISO: dayKeyInTz(d, ANALYTICS_TIMEZONE),
      label: dayLabel(d, ANALYTICS_TIMEZONE),
      full: dayFullLabel(d, ANALYTICS_TIMEZONE),
      omzet: 0,
      orders: 0,
    });
  }
  return out;
}
