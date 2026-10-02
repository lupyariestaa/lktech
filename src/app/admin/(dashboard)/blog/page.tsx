import { ArticlesManager } from "@/components/admin/articles-manager";

import type { Metadata } from "next";

/** Judul tab browser & riwayat navigasi. */
export const metadata: Metadata = {
  title: "Blog",
};

export default function AdminBlogPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-secondary">Blog</h1>
        <p className="mt-1 text-sm text-muted">
          Kelola artikel untuk konten SEO &amp; informasi pelanggan.
        </p>
      </div>
      <ArticlesManager />
    </div>
  );
}
