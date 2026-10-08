import type { Metadata } from "next";
import { ArticlePreview } from "@/components/admin/article-preview";

export const metadata: Metadata = {
  title: "Pratinjau artikel",
  robots: { index: false, follow: false },
};

/**
 * Pratinjau draft untuk admin (B3.8). Hanya di dalam layout dashboard yang sudah
 * dilindungi sesi admin. Data diambil di klien lewat API admin (dengan token).
 */
export default async function AdminArticlePreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ArticlePreview slug={decodeURIComponent(slug)} />;
}
