import { DashboardOverview } from "@/components/admin/dashboard-overview";

import type { Metadata } from "next";

/** Judul tab browser & riwayat navigasi. */
export const metadata: Metadata = {
  title: "Ringkasan",
};

export default function AdminHomePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Ringkasan</h1>
        <p className="mt-1 text-sm text-muted">
          Statistik singkat lead &amp; aktivitas terbaru.
        </p>
      </div>
      <DashboardOverview />
    </div>
  );
}
