import { CouponsManager } from "@/components/admin/coupons-manager";

import type { Metadata } from "next";

/** Judul tab browser & riwayat navigasi. */
export const metadata: Metadata = {
  title: "Kupon / Diskon",
  robots: { index: false, follow: false },
};

export default function AdminCouponsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Kupon / Diskon</h1>
        <p className="mt-1 text-sm text-muted">
          Buat & kelola kode promo (persen atau nominal) untuk kampanye penjualan.
        </p>
      </div>
      <CouponsManager />
    </div>
  );
}
