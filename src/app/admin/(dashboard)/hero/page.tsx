import { HeroShowcaseManager } from "@/components/admin/hero-showcase-manager";

import type { Metadata } from "next";

/** Judul tab browser & riwayat navigasi. */
export const metadata: Metadata = {
  title: "Hero",
};

export default function AdminHeroPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Hero</h1>
        <p className="mt-1 text-sm text-muted">
          Kelola gambar carousel pada mockup browser &amp; ponsel di section
          paling atas beranda.
        </p>
      </div>
      <HeroShowcaseManager />
    </div>
  );
}
