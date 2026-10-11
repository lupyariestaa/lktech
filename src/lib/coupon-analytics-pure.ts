/**
 * Analitik KUPON murni (C6/K10) — bebas impor runtime; dapat diuji Node.
 *
 * Menghitung metrik efektivitas kupon dari baris order:
 * - konversi pemakaian (order berkupon vs order pada jendela),
 * - AOV dengan vs tanpa kupon,
 * - ROI (Σ omzet berkupon ÷ Σ diskon),
 * - tren harian (jumlah order & diskon per hari, zona Asia/Jakarta),
 * - breakdown per kampanye.
 */

/** Status order yang dianggap "menghasilkan" (uang masuk) untuk omzet. */
export const PAID_STATUSES_FOR_ANALYTICS = ["dibayar", "diproses", "selesai"] as const;

/** Status yang TIDAK dihitung sebagai konversi sukses (batal/kedaluwarsa). */
const NON_CONVERTING = new Set(["dibatalkan", "kedaluwarsa"]);

/** Kunci tanggal `yyyy-mm-dd` zona Asia/Jakarta (duplikasi ringan agar mandiri). */
export function dayKeyJakarta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const dd = parts.find((p) => p.type === "day")?.value ?? "00";
  return `${y}-${m}-${dd}`;
}

/** Baris order minimal untuk analitik kupon. */
export type CouponAnalyticsRow = {
  status: string;
  total: number;
  createdAt: string;
  coupon?: {
    code?: string;
    couponId?: string;
    discount?: number;
  } | null;
};

export type CouponTrendPoint = {
  /** kunci tanggal yyyy-mm-dd (Asia/Jakarta). */
  date: string;
  /** jumlah order berkupon hari itu (non-batal). */
  orders: number;
  /** Σ diskon hari itu (Rp). */
  discount: number;
};

export type CampaignBreakdown = {
  campaign: string;
  orders: number;
  revenue: number;
  discount: number;
};

export type CouponAnalytics = {
  /** Order pada jendela (semua). */
  windowOrders: number;
  /** Order yang memakai kupon (semua status). */
  couponOrders: number;
  /** Order berkupon yang TIDAK batal/kedaluwarsa (konversi sukses). */
  convertedOrders: number;
  /** Konversi (0..1) = convertedOrders ÷ couponOrders. */
  conversionRate: number;
  /** Pangsa order berkupon dari seluruh order jendela (0..1). */
  couponShare: number;
  /** Total diskon (Rp) dari order berkupon non-batal. */
  totalDiscount: number;
  /** Omzet (Σ total) dari order berkupon non-batal. */
  couponRevenue: number;
  /** Omzet dari order non-kupon non-batal. */
  nonCouponRevenue: number;
  /** AOV order berkupon (Rp). */
  couponAov: number;
  /** AOV order non-kupon (Rp). */
  nonCouponAov: number;
  /** ROI (0..∞) = couponRevenue ÷ totalDiscount (0 bila diskon 0). */
  roi: number;
  /** Tren harian (terurut naik). */
  trend: CouponTrendPoint[];
  /** Breakdown per kampanye (kode → kampanye disuplai pemanggil via map). */
  campaigns: CampaignBreakdown[];
};

/**
 * Hitung analitik kupon dari baris order. `campaignByCouponId` (opsional) memetakan
 * id kupon → nama kampanye untuk breakdown; kupon tanpa kampanye → "Tanpa kampanye".
 */
export function computeCouponAnalytics(
  rows: readonly CouponAnalyticsRow[],
  campaignByCouponId?: ReadonlyMap<string, string>,
): CouponAnalytics {
  let couponOrders = 0;
  let convertedOrders = 0;
  let totalDiscount = 0;
  let couponRevenue = 0;
  let nonCouponRevenue = 0;
  let nonCouponConverted = 0;

  const trendMap = new Map<string, CouponTrendPoint>();
  const campaignMap = new Map<string, CampaignBreakdown>();

  for (const row of rows) {
    const hasCoupon = Boolean(row.coupon && (row.coupon.code || row.coupon.couponId));
    const converted = !NON_CONVERTING.has(row.status);

    if (!hasCoupon) {
      if (converted) {
        nonCouponRevenue += row.total;
        nonCouponConverted += 1;
      }
      continue;
    }

    // Order ber-kupon.
    couponOrders += 1;
    if (converted) {
      convertedOrders += 1;
      const disc =
        typeof row.coupon?.discount === "number" && Number.isFinite(row.coupon.discount)
          ? row.coupon.discount
          : 0;
      totalDiscount += disc;
      couponRevenue += row.total;

      // Tren harian.
      const key = dayKeyJakarta(row.createdAt);
      if (key) {
        const point =
          trendMap.get(key) ?? { date: key, orders: 0, discount: 0 };
        point.orders += 1;
        point.discount += disc;
        trendMap.set(key, point);
      }

      // Breakdown kampanye.
      const couponId = row.coupon?.couponId ?? `code:${row.coupon?.code ?? ""}`;
      const campaign =
        (couponId && campaignByCouponId?.get(couponId)) || "Tanpa kampanye";
      const cb =
        campaignMap.get(campaign) ??
        { campaign, orders: 0, revenue: 0, discount: 0 };
      cb.orders += 1;
      cb.revenue += row.total;
      cb.discount += disc;
      campaignMap.set(campaign, cb);
    }
  }

  const windowOrders = rows.length;
  const conversionRate = couponOrders > 0 ? convertedOrders / couponOrders : 0;
  const couponShare = windowOrders > 0 ? couponOrders / windowOrders : 0;
  const couponAov = convertedOrders > 0 ? couponRevenue / convertedOrders : 0;
  const nonCouponAov =
    nonCouponConverted > 0 ? nonCouponRevenue / nonCouponConverted : 0;
  const roi = totalDiscount > 0 ? couponRevenue / totalDiscount : 0;

  const trend = Array.from(trendMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const campaigns = Array.from(campaignMap.values()).sort(
    (a, b) => b.revenue - a.revenue,
  );

  return {
    windowOrders,
    couponOrders,
    convertedOrders,
    conversionRate,
    couponShare,
    totalDiscount,
    couponRevenue,
    nonCouponRevenue,
    couponAov,
    nonCouponAov,
    roi,
    trend,
    campaigns,
  };
}

/** Format persen (0..1) → "12,3%" (id-ID). */
export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return "0%";
  return `${(ratio * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

/** Format ROI → "3,2×" (id-ID). */
export function formatRoi(roi: number): string {
  if (!Number.isFinite(roi) || roi <= 0) return "0×";
  return `${roi.toLocaleString("id-ID", { maximumFractionDigits: 2 })}×`;
}

/* -------------------------------------------------------------------------- */
/* Analitik per KAMPANYE (global) — C8/K5                                     */
/* -------------------------------------------------------------------------- */

export type CampaignGlobalStat = {
  campaign: string;
  /** Jumlah order berkupon non-batal pada kampanye ini. */
  orders: number;
  /** Σ omzet order berkupon non-batal. */
  revenue: number;
  /** Σ diskon (Rp). */
  discount: number;
  /** ROI = revenue ÷ discount (0 bila diskon 0). */
  roi: number;
  /** Jumlah kode kupon berbeda dalam kampanye ini. */
  couponCount: number;
};

/**
 * Agregasi analitik per KAMPANYE dari banyak order + peta idKupon→kampanye.
 * Hanya menghitung order berkupon non-batal. Terurut omzet menurun.
 */
export function computeCampaignsGlobal(
  rows: readonly CouponAnalyticsRow[],
  campaignByCouponId: ReadonlyMap<string, string>,
): CampaignGlobalStat[] {
  const map = new Map<string, CampaignGlobalStat & { _codes: Set<string> }>();
  for (const row of rows) {
    const coupon = row.coupon;
    if (!coupon || (!coupon.code && !coupon.couponId)) continue;
    if (NON_CONVERTING.has(row.status)) continue;
    const couponId = coupon.couponId ?? `code:${coupon.code ?? ""}`;
    const campaign = campaignByCouponId.get(couponId) || "Tanpa kampanye";
    const disc =
      typeof coupon.discount === "number" && Number.isFinite(coupon.discount)
        ? coupon.discount
        : 0;
    const entry =
      map.get(campaign) ??
      {
        campaign,
        orders: 0,
        revenue: 0,
        discount: 0,
        roi: 0,
        couponCount: 0,
        _codes: new Set<string>(),
      };
    entry.orders += 1;
    entry.revenue += row.total;
    entry.discount += disc;
    entry._codes.add(coupon.code ?? couponId);
    map.set(campaign, entry);
  }
  return Array.from(map.values())
    .map((e) => ({
      campaign: e.campaign,
      orders: e.orders,
      revenue: e.revenue,
      discount: e.discount,
      roi: e.discount > 0 ? e.revenue / e.discount : 0,
      couponCount: e._codes.size,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}
