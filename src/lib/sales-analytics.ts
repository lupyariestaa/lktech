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
import { ANALYTICS_TIMEZONE, computeCompletionRate, computePaymentConversion } from "@/lib/metrics-spec";
import { loadExistingDocs, windowDayKeys, dayStartMsFromKey } from "@/lib/analytics-daily";
import { mergeDailyAggregates } from "@/lib/analytics-daily-pure";

export type {
  AnalyticsMode,
  AnalyticsRange,
  SalesAnalytics,
  SalesPoint,
  TopProduct,
} from "@/lib/sales-analytics-types";
export { ANALYTICS_RANGES } from "@/lib/sales-analytics-types";

/** Distribusi status kosong (semua status order = 0). */
function emptyStatusBreakdown(): Record<OrderStatus, number> {
  return ORDER_STATUSES.reduce(
    (acc, s) => {
      acc[s] = 0;
      return acc;
    },
    {} as Record<OrderStatus, number>,
  );
}

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

/**
 * `AN-P3` — jalur CEPAT dari agregasi harian. Mengembalikan `SalesAnalytics`
 * bila SEMUA hari (jendela kini + sebelumnya) tersedia di `analytics_daily`;
 * jika ada hari hilang → `null` (pemanggil memakai perhitungan LIVE).
 */
async function getSalesAnalyticsFastPath(opts: {
  days: number;
  mode: AnalyticsMode;
}): Promise<SalesAnalytics | null> {
  // `AN-P3` — kill-switch darurat. Default AKTIF; set `ANALYTICS_DAILY=off`
  // untuk memaksa jalur LIVE. Fallback tetap menjamin kebenaran: bila ada hari
  // yang belum teragregasi, fungsi mengembalikan null → perhitungan live.
  if (process.env.ANALYTICS_DAILY === "off") return null;

  const { days, mode } = opts;
  const nowStartKey = dayKeyInTz(new Date(), ANALYTICS_TIMEZONE);
  const nowStartMs = dayStartMsFromKey(nowStartKey);
  const startMs = nowStartMs - (days - 1) * 86_400_000;
  const prevStartMs = startMs - days * 86_400_000;

  const windowKeys = windowDayKeys(days);
  const prevKeys = windowDayKeys(days, new Date(prevStartMs));
  const allKeys = [...windowKeys, ...prevKeys];

  const docs = await loadExistingDocs(allKeys);
  const current = mergeDailyAggregates(windowKeys, docs, mode);
  const previous = mergeDailyAggregates(prevKeys, docs, mode);
  if (!current || !previous) return null;

  const series: SalesPoint[] = current.points.map((p) => {
    const d = new Date(dayStartMsFromKey(p.dateISO));
    return {
      dateISO: p.dateISO,
      label: dayLabel(d, ANALYTICS_TIMEZONE),
      full: dayFullLabel(d, ANALYTICS_TIMEZONE),
      omzet: p.omzet,
      orders: p.orders,
    };
  });

  const statusBreakdown = emptyStatusBreakdown();
  for (const s of ORDER_STATUSES) {
    const n = current.statusBreakdown[s] ?? 0;
    statusBreakdown[s] = n;
  }

  return buildAnalyticsResult({
    days,
    mode,
    series,
    statusBreakdown,
    topProducts: current.topProducts,
    omzetTotal: current.omzetTotal,
    ordersCounted: current.ordersCounted,
    prevOmzet: previous.omzetTotal,
    prevOrders: previous.ordersCounted,
  });
}

/** Susun keluaran akhir dari agregat (dipakai jalur cepat & jalur live). */
function buildAnalyticsResult(input: {
  days: number;
  mode: AnalyticsMode;
  series: SalesPoint[];
  statusBreakdown: Record<OrderStatus, number>;
  topProducts: TopProduct[];
  omzetTotal: number;
  ordersCounted: number;
  prevOmzet: number;
  prevOrders: number;
}): SalesAnalytics {
  const { statusBreakdown, omzetTotal, ordersCounted, prevOmzet, prevOrders } = input;
  const aov = ordersCounted > 0 ? Math.round(omzetTotal / ordersCounted) : 0;
  const prevAov = prevOrders > 0 ? Math.round(prevOmzet / prevOrders) : 0;
  const pct = (curr: number, prev: number): number | null =>
    prev > 0 ? (curr - prev) / prev : null;

  return {
    days: input.days,
    mode: input.mode,
    series: input.series,
    totals: {
      omzet: omzetTotal,
      orders: ordersCounted,
      aov,
      completed: statusBreakdown.selesai,
      cancelled: statusBreakdown.dibatalkan,
      completionRate: computeCompletionRate(statusBreakdown),
    },
    deltas: {
      omzet: pct(omzetTotal, prevOmzet),
      orders: pct(ordersCounted, prevOrders),
      aov: pct(aov, prevAov),
    },
    statusBreakdown,
    payment: computePaymentConversion(statusBreakdown),
    topProducts: input.topProducts,
  };
}

/** Keluaran analitik KOSONG — struktur tetap valid. Dipakai bila Admin SDK tak
 *  tersedia ATAU pembacaan Firestore gagal (kuota/network), agar pemanggil
 *  (halaman admin, API) tidak ikut gagal — cukup menampilkan angka nol. */
function buildEmptyAnalytics(days: number, mode: AnalyticsMode): SalesAnalytics {
  return {
    days,
    mode,
    series: buildEmptySeries(days),
    totals: { omzet: 0, orders: 0, aov: 0, completed: 0, cancelled: 0, completionRate: 0 },
    deltas: { omzet: null, orders: null, aov: null },
    statusBreakdown: emptyStatusBreakdown(),
    payment: { initiated: 0, paid: 0, expired: 0, rate: 0 },
    topProducts: [],
  };
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
  if (!db) return buildEmptyAnalytics(days, mode);

  // `AN-C2`: filter jendela di query + proyeksi field yang dibutuhkan saja
  // (hindari full-collection scan). Buffer 1 hari untuk aman terhadap batas TZ.
  // `AN-P1`: ambil 2× jendela agar bisa membandingkan dengan periode sebelumnya.
  const startMs = startOfWindow(days, ANALYTICS_TIMEZONE);
  const prevStartMs = startMs - days * 86_400_000;
  const cutoffISO = new Date(prevStartMs - 86_400_000).toISOString();

  // === `AN-P3` — jalur CEPAT via agregasi harian (fallback otomatis ke live) ===
  // Bila cron sudah mengisi `analytics_daily` untuk SEMUA hari jendela (kini +
  // sebelumnya), hasilkan analitik dari agregat — tanpa memindai ulang `orders`.
  // Bila ada hari hilang, fungsi mengembalikan null → jalur LIVE di bawah dipakai
  // sehingga angka SELALU benar (bahkan tanpa cron berjalan sama sekali).
  const fast = await getSalesAnalyticsFastPath({ days, mode });
  if (fast) return fast;

  // Pembacaan `orders` bisa gagal (kuota Firestore habis, jaringan, izin) —
  // termasuk saat build/prerender. Jangan pernah menjatuhkan pemanggil:
  // kembalikan struktur kosong (angka nol) agar halaman tetap ter-render.
  let snap;
  try {
    snap = await db
      .collection("orders")
      .where("createdAtISO", ">=", cutoffISO)
      .select("status", "total", "subtotal", "createdAtISO", "items", "coupon")
      .get();
  } catch (err) {
    console.error("[sales-analytics] gagal memuat pesanan:", err);
    return buildEmptyAnalytics(days, mode);
  }

  const orders = snap.docs
    .map((doc) =>
      normalizeOrder({ id: doc.id, ...(doc.data() as Record<string, unknown>) }),
    )
    .filter((o) => Boolean(o.createdAt));

  const byDay = new Map<string, { omzet: number; orders: number }>();
  const statusBreakdown: Record<OrderStatus, number> = emptyStatusBreakdown();
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

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.omzet - a.omzet || b.units - a.units)
    .slice(0, 10);

  return buildAnalyticsResult({
    days,
    mode,
    series,
    statusBreakdown,
    topProducts,
    omzetTotal,
    ordersCounted,
    prevOmzet,
    prevOrders,
  });
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
