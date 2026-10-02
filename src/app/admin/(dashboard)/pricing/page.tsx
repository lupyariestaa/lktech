import { PricingManager } from "@/components/admin/pricing-manager";

import type { Metadata } from "next";

/** Judul tab browser & riwayat navigasi. */
export const metadata: Metadata = {
  title: "Harga",
};

export default function AdminPricingPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Harga</h1>
        <p className="mt-1 text-sm text-muted">
          Kelola paket harga yang tampil di beranda.
        </p>
      </div>
      <PricingManager />
    </div>
  );
}
