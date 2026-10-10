import { ContentExtraManager } from "@/components/admin/content-extra-manager";

import type { Metadata } from "next";

/** Judul tab browser & riwayat navigasi. */
export const metadata: Metadata = {
  title: "Konten Beranda",
};

export default function AdminContentPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Konten Beranda</h1>
        <p className="mt-1 text-sm text-muted">
          Kelola keunggulan, alur kerja, statistik, dan teknologi yang tampil di
          beranda serta halaman layanan.
        </p>
      </div>
      <ContentExtraManager />
    </div>
  );
}
