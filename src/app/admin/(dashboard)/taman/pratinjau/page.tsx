import { TamanPreview } from "@/components/admin/taman-preview";

import type { Metadata } from "next";

/** Judul tab browser & riwayat navigasi. */
export const metadata: Metadata = {
  title: "Pratinjau Taman",
  robots: { index: false, follow: false },
};

export default function AdminTamanPreviewPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Pratinjau Taman</h1>
        <p className="mt-1 text-sm text-muted">
          Lihat seperti apa frame di publik, termasuk contoh (tidak pernah tampil publik).
        </p>
      </div>
      <TamanPreview />
    </div>
  );
}
