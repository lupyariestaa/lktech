import { adminFetch } from "@/lib/admin-fetch";
import type { AnalyticsMode, SalesAnalytics } from "@/lib/sales-analytics-types";

/**
 * Klien API admin untuk analitik penjualan.
 * Data diagregasi server-side (klien hanya menerima rangkaian terhitung).
 */
export async function fetchSalesAnalytics(opts: {
  days: number;
  mode?: AnalyticsMode;
}): Promise<SalesAnalytics> {
  const params = new URLSearchParams({ days: String(opts.days) });
  if (opts.mode) params.set("mode", opts.mode);
  const data = await adminFetch<{ analytics: SalesAnalytics }>(
    `/api/admin/analytics?${params.toString()}`,
  );
  return data.analytics;
}
