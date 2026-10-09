import Link from "next/link";
import { ArticleCard } from "@/components/article-card";
import type { Article } from "@/lib/article-types";
import { listHref, pageSlice, type ListQuery } from "@/lib/article-ui";
import { matchesSearch } from "@/lib/article-logic";
import { cn } from "@/lib/utils";

/**
 * Daftar artikel server-driven (B6.6, B6.7). Filter & halaman datang dari URL,
 * jadi bisa dibagikan dan bekerja tanpa JavaScript (pencarian lewat form GET).
 */
export function BlogIndex({
  articles,
  categories,
  tags,
  query,
  basePath = "/blog",
  lockedBy,
}: {
  articles: Article[];
  categories: string[];
  tags: { tag: string; count: number }[];
  query: ListQuery;
  /** Path dasar untuk tautan (mis. "/blog", "/blog/kategori/x"). */
  basePath?: string;
  /**
   * Halaman sudah difilter (kategori/tag). Navigasi kategori & tag disembunyikan
   * agar tidak membuat filter ganda yang membingungkan.
   */
  lockedBy?: "category" | "tag";
}) {
  const filtered = articles.filter((a) => {
    if (query.category && a.category !== query.category) return false;
    if (query.tag && !a.tags.includes(query.tag)) return false;
    if (query.q && !matchesSearch(a, query.q)) return false;
    return true;
  });
  const page = pageSlice(filtered, query.page);
  const hasFilter = Boolean(query.q || query.category || query.tag);

  const linkFor = (patch: Partial<ListQuery>) =>
    listHref(basePath, { ...query, page: 1, ...patch });

  return (
    <div>
      {/* Pencarian (form GET, tanpa JS) */}
      <form action={basePath} method="get" role="search" className="mx-auto flex max-w-xl items-center gap-2">
        {query.category && <input type="hidden" name="kategori" value={query.category} />}
        {query.tag && <input type="hidden" name="tag" value={query.tag} />}
        <label htmlFor="blog-q" className="sr-only">Cari artikel</label>
        <input
          id="blog-q"
          name="q"
          type="search"
          defaultValue={query.q}
          placeholder="Cari artikel..."
          className="min-h-11 flex-1 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm text-secondary placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:outline-none"
        />
        <button
          type="submit"
          className="min-h-11 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Cari
        </button>
      </form>

      {/* Kategori */}
      {!lockedBy && (
      <nav aria-label="Kategori artikel" className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {[{ label: "Semua", value: "" }, ...categories.map((c) => ({ label: c, value: c }))].map((c) => {
          const active = query.category === c.value && !query.tag;
          return (
            <Link
              key={c.label}
              href={linkFor({ category: c.value, tag: "" })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-all",
                active
                  ? "bg-primary text-white shadow-lg shadow-primary/25"
                  : "border border-slate-200 bg-white/70 text-slate-600 hover:border-primary/40 hover:text-primary",
              )}
            >
              {c.label}
            </Link>
          );
        })}
      </nav>
      )}

      {/* Tag */}
      {!lockedBy && tags.length > 0 && (
        <nav aria-label="Tag artikel" className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {tags.map(({ tag, count }) => {
            const active = query.tag === tag;
            return (
              <Link
                key={tag}
                href={linkFor({ tag: active ? "" : tag, category: "" })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-full px-3 text-xs font-medium transition-colors",
                  active ? "bg-secondary text-white" : "bg-surface text-slate-500 hover:bg-primary-50 hover:text-primary",
                )}
              >
                #{tag}
                <span className="ml-1 text-[10px] opacity-70">{count}</span>
              </Link>
            );
          })}
        </nav>
      )}

      <p className="mt-8 text-center text-sm text-muted" aria-live="polite">
        {page.total} artikel{hasFilter ? " (terfilter)" : ""}
        {query.q && <> untuk &quot;{query.q}&quot;</>}
      </p>

      {page.items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <p className="text-sm font-medium text-secondary">Belum ada artikel yang cocok.</p>
          {hasFilter && (
            <Link href={basePath} className="mt-2 inline-block text-xs font-semibold text-primary">
              Reset filter
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {page.items.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      )}

      {page.hasMore && (
        <div className="mt-10 flex justify-center">
          <Link
            href={listHref(basePath, { ...query, page: query.page + 1 })}
            scroll={false}
            className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 hover:border-primary/30 hover:text-primary"
          >
            Muat lebih banyak
          </Link>
        </div>
      )}
    </div>
  );
}
