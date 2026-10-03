import { Reveal } from "@/components/motion";
import { ArticleCard } from "@/components/article-card";
import type { Article } from "@/lib/article-types";

/**
 * Grid artikel (server-rendered, tanpa state) — dipakai halaman kategori & tag.
 * Untuk daftar utama blog yang punya filter interaktif, gunakan `BlogGrid`.
 */
export function ArticleGrid({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return (
      <p className="mt-16 text-center text-sm text-muted">
        Belum ada artikel di sini.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article, i) => (
        <Reveal key={article.slug} delay={(i % 3) * 0.08}>
          <ArticleCard article={article} />
        </Reveal>
      ))}
    </div>
  );
}
