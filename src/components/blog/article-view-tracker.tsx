"use client";

import { useEffect } from "react";
import { trackArticleView } from "@/lib/analytics";

/**
 * Mencatat `article_view` sekali saat halaman detail artikel tampil (B8.1).
 * Tidak merender apa pun.
 */
export function ArticleViewTracker({
  slug,
  category,
  readingTime,
}: {
  slug: string;
  category: string;
  readingTime?: number;
}) {
  useEffect(() => {
    trackArticleView({ slug, category, readingTime });
  }, [slug, category, readingTime]);
  return null;
}
