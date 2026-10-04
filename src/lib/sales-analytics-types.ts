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
  /** Omzet BRUTO produk = Σ `item.subtotal` (sebelum diskon) — lihat metrics-spec. */
  omzet: number;
};

export type SalesAnalytics = {
  days: number;
  mode: AnalyticsMode;
  series: SalesPoint[];
  totals: {
    /** Omzet NETTO periode = Σ `order.total` (setelah diskon). */
    omzet: number;
    /** Jumlah pesanan penghasil omzet (per mode) dalam periode. */
    orders: number;
    /** Rata-rata nilai order (Rp) = `omzet / orders`. */
    aov: number;
    /** Jumlah pesanan selesai DALAM periode. */
    completed: number;
    /** Jumlah pesanan dibatalkan DALAM periode. */
    cancelled: number;
    /**
     * Tingkat penyelesaian (0..1) = `selesai / (total periode − dibatalkan)`.
     * Pembilang & penyebut dari jendela yang sama (lihat metrics-spec).
     */
    completionRate: number;
  };
  /**
   * Perbandingan dengan periode sebelumnya (`AN-P1`): perubahan % omzet &
   * jumlah pesanan. `null` bila pembanding 0 (tak terdefinisi).
   */
  deltas: {
    omzet: number | null;
    orders: number | null;
    aov: number | null;
  };
  statusBreakdown: Record<OrderStatus, number>;
  topProducts: TopProduct[];
};
