import type { OrderStatus } from "@/lib/order-types";

/**
 * Agregasi harian analitik (`AN-P3`) — bagian MURNI (tanpa Admin SDK).
 *
 * Tujuan: hindari pemindaian ulang seluruh jendela `orders` tiap kali dashboard
 * analitik dibuka. Setiap hari diringkas menjadi dokumen `analytics_daily/{date}`
 * yang cukup untuk merekonstruksi keluaran `getSalesAnalytics` PERSIS.
 *
 * Prinsip keamanan (sesuai keputusan proyek menunda AN-P3): pembacaan live TETAP
 * menjadi fallback. Bila dokumen agregat tidak lengkap (mis. cron belum jalan,
 * order baru hari ini), pemanggil WAJIB jatuh ke perhitungan live — bukan menebak.
 *
 * Bentuk ringkasan menyimpan TOTAL per STATUS (bukan per mode) agar mode
 * `completed` (hanya `selesai`) & `all` (semua kecuali `dibatalkan`) dihitung
 * tanpa menyimpan dua salinan.
 */

/** Total (jumlah + nominal) per status pada satu hari. */
export type DailyStatusTotals = Partial<
  Record<OrderStatus, { count: number; total: number }>
>;

/** Ringkasan produk pada satu hari (satuan + omzet BRUTO `item.subtotal`). */
export type DailyProduct = {
  slug: string;
  name: string;
  units: number;
  omzet: number;
};

/** Dokumen `analytics_daily/{dateISO}`. */
export type AnalyticsDailyDoc = {
  /** Kunci hari zona `Asia/Jakarta` (yyyy-mm-dd). */
  dateISO: string;
  statusTotals: DailyStatusTotals;
  /** Produk dari order penghasil omzet mode `completed`. */
  productsCompleted: Record<string, DailyProduct>;
  /** Produk dari order penghasil omzet mode `all`. */
  productsAll: Record<string, DailyProduct>;
};

/** Input minimal satu order untuk agregasi (struktural, agar mudah diuji). */
export type DailyOrderInput = {
  status: string;
  total: number;
  items: ReadonlyArray<{
    slug: string;
    name: string;
    qty: number;
    subtotal: number;
    variantSlug?: string;
  }>;
};

/** Apakah order dihitung sebagai omzet untuk mode tertentu (cermin sales-analytics). */
function countsAsRevenue(status: string, mode: "completed" | "all"): boolean {
  if (status === "dibatalkan") return false;
  if (mode === "all") return true;
  return status === "selesai";
}

/** Kunci produk (slug + varian) — cermin sales-analytics. */
function productKey(slug: string, variantSlug?: string): string {
  return variantSlug ? `${slug}::${variantSlug}` : slug;
}

/**
 * Ringkas pesanan SATU hari menjadi `AnalyticsDailyDoc`. MURNI & deterministik.
 */
export function aggregateDay(dateISO: string, orders: readonly DailyOrderInput[]): AnalyticsDailyDoc {
  const statusTotals: DailyStatusTotals = {};
  const productsCompleted: Record<string, DailyProduct> = {};
  const productsAll: Record<string, DailyProduct> = {};

  for (const o of orders) {
    const total = Number.isFinite(o.total) ? o.total : 0;

    const bucket = statusTotals[o.status as OrderStatus] ?? { count: 0, total: 0 };
    bucket.count += 1;
    bucket.total += total;
    statusTotals[o.status as OrderStatus] = bucket;

    for (const mode of ["completed", "all"] as const) {
      if (!countsAsRevenue(o.status, mode)) continue;
      const target = mode === "completed" ? productsCompleted : productsAll;
      for (const it of o.items) {
        const pk = productKey(it.slug, it.variantSlug);
        const prev = target[pk] ?? { slug: it.slug, name: it.name, units: 0, omzet: 0 };
        prev.units += it.qty;
        prev.omzet += Number.isFinite(it.subtotal) ? it.subtotal : 0;
        target[pk] = prev;
      }
    }
  }

  return { dateISO, statusTotals, productsCompleted, productsAll };
}

/** Titik harian mentah (label dibuat pemanggil yang punya helper Intl). */
export type DailyPoint = { dateISO: string; omzet: number; orders: number };

export type MergedDailyAnalytics = {
  points: DailyPoint[];
  statusBreakdown: Record<string, number>;
  topProducts: DailyProduct[];
  omzetTotal: number;
  ordersCounted: number;
};

/** Peta produk (mutable) untuk penggabungan antar-hari. */
function addProducts(
  acc: Record<string, DailyProduct>,
  add: Record<string, DailyProduct>,
): void {
  for (const pk of Object.keys(add)) {
    const src = add[pk];
    const prev = acc[pk] ?? { slug: src.slug, name: src.name, units: 0, omzet: 0 };
    prev.units += src.units;
    prev.omzet += src.omzet;
    acc[pk] = prev;
  }
}

/**
 * Gabungkan dokumen agregat untuk `expectedKeys` (urut, hari-hari jendela).
 *
 * Mengembalikan `null` bila **ada hari yang hilang** — pemanggil harus jatuh ke
 * perhitungan live (jangan menyajikan angka tak lengkap).
 */
export function mergeDailyAggregates(
  expectedKeys: readonly string[],
  docs: Record<string, AnalyticsDailyDoc>,
  mode: "completed" | "all",
): MergedDailyAnalytics | null {
  for (const key of expectedKeys) {
    if (!docs[key]) return null;
  }

  const points: DailyPoint[] = [];
  const statusBreakdown: Record<string, number> = {};
  const products: Record<string, DailyProduct> = {};
  let omzetTotal = 0;
  let ordersCounted = 0;

  for (const key of expectedKeys) {
    const doc = docs[key];
    let dayOmzet = 0;
    let dayOrders = 0;

    for (const status of Object.keys(doc.statusTotals)) {
      const t = doc.statusTotals[status as OrderStatus]!;
      statusBreakdown[status] = (statusBreakdown[status] ?? 0) + t.count;
      if (countsAsRevenue(status, mode)) {
        dayOmzet += t.total;
        dayOrders += t.count;
      }
    }

    addProducts(products, mode === "completed" ? doc.productsCompleted : doc.productsAll);

    points.push({ dateISO: key, omzet: dayOmzet, orders: dayOrders });
    omzetTotal += dayOmzet;
    ordersCounted += dayOrders;
  }

  const topProducts = Object.values(products)
    .sort((a, b) => b.omzet - a.omzet || b.units - a.units)
    .slice(0, 10);

  return { points, statusBreakdown, topProducts, omzetTotal, ordersCounted };
}