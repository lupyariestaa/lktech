"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { fetchArticles } from "@/lib/admin-api";
import type { StoredArticle } from "@/lib/article-types";
import { Markdown } from "@/lib/markdown";

/**
 * Pratinjau artikel untuk admin (B3.8). Menampilkan draft maupun yang terjadwal,
 * tanpa mengubah status publik. Memakai renderer publik yang sama.
 */
export function ArticlePreview({ slug }: { slug: string }) {
  const [article, setArticle] = useState<StoredArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchArticles()
      .then((all) => {
        if (!active) return;
        setArticle(all.find((a) => a.slug === slug) ?? null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Gagal memuat artikel.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/admin/blog"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Blog
        </Link>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          Pratinjau admin (tidak publik)
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm">Memuat pratinjau...</span>
        </div>
      ) : error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
      ) : !article ? (
        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-muted">
          Artikel &quot;{slug}&quot; tidak ditemukan.
        </p>
      ) : (
        <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-10">
          <p className="text-xs font-semibold text-primary">{article.category}</p>
          <h1 className="mt-2 text-3xl font-extrabold text-secondary">{article.title}</h1>
          {article.excerpt && <p className="mt-3 text-base text-muted">{article.excerpt}</p>}
          <div className="mt-8">
            <Markdown content={article.body} />
          </div>
        </article>
      )}
    </div>
  );
}
