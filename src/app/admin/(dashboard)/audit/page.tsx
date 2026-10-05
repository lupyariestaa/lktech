import { AuditLogManager } from "@/components/admin/audit-log-manager";

import type { Metadata } from "next";

/** Judul tab browser & riwayat navigasi. */
export const metadata: Metadata = {
  title: "Audit Log",
  robots: { index: false, follow: false },
};

export default function AdminAuditPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Audit Log</h1>
        <p className="mt-1 text-sm text-muted">
          Riwayat aksi admin penting (status pesanan, produk, kupon, pengguna,
          pengaturan, moderasi ulasan) untuk transparansi & penelusuran.
        </p>
      </div>
      <AuditLogManager />
    </div>
  );
}
