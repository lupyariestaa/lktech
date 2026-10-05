import { ReviewsManager } from "@/components/admin/reviews-manager";

import type { Metadata } from "next";

/** Judul tab browser & riwayat navigasi. */
export const metadata: Metadata = {
  title: "Ulasan & Rating",
  robots: { index: false, follow: false },
};

export default function AdminReviewsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Ulasan &amp; Rating</h1>
        <p className="mt-1 text-sm text-muted">
          Moderasi ulasan pembeli. Hanya ulasan <strong>disetujui</strong> yang
          tampil di halaman produk & masuk structured data (SEO).
        </p>
      </div>
      <ReviewsManager />
    </div>
  );
}
