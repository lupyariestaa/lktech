import type { OrderStatus } from "@/lib/order-types";

/**
 * Tipe & konstanta analitik penjualan — AMAN untuk klien (tanpa `server-only`).
 * Logika agregasi (yang butuh Admin SDK) ada di `@/lib/sales-analytics`.
 */

/** Rentang periode yang didukung (hari). */
export const ANALYTICS_RANGES = [7, 30, 90] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export type AnalyticsMode = "completed" | "all";

export type SalesPoint = {
  dateISO: string;
  label: string;
  full: string;
  omzet: number;
  orders: number;
};

export type TopProduct = {
  slug: string;
  name: string;
  units: number;
  omzet: number;
};

export type SalesAnalytics = {
  days: number;
  mode: AnalyticsMode;
  series: SalesPoint[];
  totals: {
    omzet: number;
    orders: number;
    /** Rata-rata nilai order (Rp). */
    aov: number;
    completed: number;
    cancelled: number;
    /** Tingkat penyelesaian (0..1). */
    completionRate: number;
  };
  statusBreakdown: Record<OrderStatus, number>;
  topProducts: TopProduct[];
};
