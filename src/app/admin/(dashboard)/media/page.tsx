import { MediaManager } from "@/components/admin/media-manager";

import type { Metadata } from "next";

/** Judul tab browser & riwayat navigasi. */
export const metadata: Metadata = {
  title: "Media",
};

export default function AdminMediaPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Media</h1>
        <p className="mt-1 text-sm text-muted">
          Unggah dan kelola gambar untuk portofolio &amp; banner.
        </p>
      </div>
      <MediaManager />
    </div>
  );
}
