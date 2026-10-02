import { ServicesManager } from "@/components/admin/services-manager";

import type { Metadata } from "next";

/** Judul tab browser & riwayat navigasi. */
export const metadata: Metadata = {
  title: "Layanan",
};

export default function AdminServicesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Layanan</h1>
        <p className="mt-1 text-sm text-muted">
          Kelola layanan yang tampil di beranda dan halaman layanan — termasuk
          detail, fitur, paket, dan FAQ tiap layanan.
        </p>
      </div>
      <ServicesManager />
    </div>
  );
}
