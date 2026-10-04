import { adminFetch } from "@/lib/admin-fetch";
import type {
  AnalyticsMode,
  SalesAnalytics,
} from "@/lib/sales-analytics-types";
import { formatRupiah } from "@/lib/format";

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

/** Quote sel CSV. */
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Ekspor analitik (`AN-P2`): seri harian + produk terlaris + total, sebagai CSV.
 */
export function exportAnalyticsToCsv(
  analytics: SalesAnalytics,
  filename?: string,
) {
  const lines: string[] = [];
  // Ringkasan.
  lines.push(["Ringkasan", "Nilai"].map(csvCell).join(","));
  lines.push(["Periode (hari)", analytics.days].map(csvCell).join(","));
  lines.push(["Mode omzet", analytics.mode].map(csvCell).join(","));
  lines.push(["Omzet", analytics.totals.omzet].map(csvCell).join(","));
  lines.push(["Pesanan penghasil omzet", analytics.totals.orders].map(csvCell).join(","));
  lines.push(["AOV", analytics.totals.aov].map(csvCell).join(","));
  lines.push(["Selesai", analytics.totals.completed].map(csvCell).join(","));
  lines.push(["Dibatalkan", analytics.totals.cancelled].map(csvCell).join(","));
  lines.push(
    ["Tingkat penyelesaian", `${Math.round(analytics.totals.completionRate * 100)}%`]
      .map(csvCell)
      .join(","),
  );
  lines.push("");
  // Seri harian.
  lines.push(["Tanggal", "Omzet", "Pesanan"].map(csvCell).join(","));
  for (const p of analytics.series) {
    lines.push([p.dateISO, p.omzet, p.orders].map(csvCell).join(","));
  }
  lines.push("");
  // Produk terlaris.
  lines.push(["Produk", "Unit", "Omzet (bruto)"].map(csvCell).join(","));
  for (const t of analytics.topProducts) {
    lines.push([t.name, t.units, t.omzet].map(csvCell).join(","));
  }

  const csv = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = filename ?? `analitik-lktech-${analytics.days}h-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Ringkas nilai rupiah untuk label (dipakai di tooltip). */
export function analyticsRupiah(v: number): string {
  return formatRupiah(v);
}
