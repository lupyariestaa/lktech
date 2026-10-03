import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";

import type { Metadata } from "next";

/** Judul tab browser & riwayat navigasi. */
export const metadata: Metadata = {
  title: "Analitik Penjualan",
  robots: { index: false, follow: false },
};

export default function AdminAnalyticsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Analitik Penjualan</h1>
        <p className="mt-1 text-sm text-muted">
          Pantau tren omzet, jumlah pesanan, produk terlaris, dan status pesanan.
        </p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
