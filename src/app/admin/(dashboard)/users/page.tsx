import { UsersManager } from "@/components/admin/users-manager";

import type { Metadata } from "next";

/** Judul tab browser & riwayat navigasi. */
export const metadata: Metadata = {
  title: "Pengguna",
  robots: { index: false, follow: false },
};

export default function AdminUsersPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Pengguna</h1>
        <p className="mt-1 text-sm text-muted">
          Lihat & kelola user yang login di website — nama, email, WhatsApp,
          waktu masuk, dan status pesanan.
        </p>
      </div>
      <UsersManager />
    </div>
  );
}
