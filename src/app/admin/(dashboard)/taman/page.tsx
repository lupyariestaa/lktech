import { TamanManager } from "@/components/admin/taman-manager";

import type { Metadata } from "next";

/** Judul tab browser & riwayat navigasi. */
export const metadata: Metadata = {
  title: "Taman Testimoni",
};

export default function AdminTamanPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Taman Testimoni</h1>
        <p className="mt-1 text-sm text-muted">
          Moderasi testimoni, tetapkan hewan &amp; urutan. Testimoni hanya tampil publik setelah
          persetujuan pemberi dan bukti tercatat.
        </p>
      </div>
      <TamanManager />
    </div>
  );
}
