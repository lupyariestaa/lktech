import type { Article, StoredArticle } from "@/lib/article-types";

export type { Article, StoredArticle };

const COLLECTION = "articles";

function normalizeArticle(data: Record<string, unknown>): Article {
  const str = (v: unknown, fallback = "") =>
    typeof v === "string" ? v : fallback;

  return {
    slug: str(data.slug),
    title: str(data.title),
    excerpt: str(data.excerpt),
    body: str(data.body),
    category: str(data.category, "Artikel"),
    tags: Array.isArray(data.tags)
      ? data.tags.filter((t): t is string => typeof t === "string")
      : [],
    cover: str(data.cover, "default"),
    coverImage: typeof data.coverImage === "string" ? data.coverImage : undefined,
    coverAlt: typeof data.coverAlt === "string" ? data.coverAlt : undefined,
    author: str(data.author, "LKTech"),
    status: data.status === "draft" ? "draft" : "published",
    publishedAt: str(data.publishedAt, new Date().toISOString()),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
  };
}

/** Semua artikel (published saja) dari Firestore. Tanpa DB → kosong. */
export async function getArticles(): Promise<Article[]> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) return [];

  try {
    const snap = await db.collection(COLLECTION).get();
    return snap.docs
      .map((doc) => normalizeArticle(doc.data()))
      .filter((a) => a.status === "published")
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
  } catch (err) {
    console.error("[articles] gagal memuat:", err);
    return [];
  }
}

/** Semua artikel untuk dashboard (termasuk draft). */
export async function getStoredArticles(): Promise<StoredArticle[]> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) return [];

  const snap = await db.collection(COLLECTION).get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...normalizeArticle(doc.data()) }))
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const articles = await getArticles();
  return articles.find((a) => a.slug === slug) ?? null;
}

export async function getArticleSlugs(): Promise<string[]> {
  const articles = await getArticles();
  return articles.map((a) => a.slug);
}

export async function getArticleCategories(): Promise<string[]> {
  const articles = await getArticles();
  return ["Semua", ...Array.from(new Set(articles.map((a) => a.category)))];
}

/** Kategori asli (tanpa "Semua") â€” untuk tautan & metadata. */
export async function getArticleCategoryList(): Promise<string[]> {
  const articles = await getArticles();
  return Array.from(new Set(articles.map((a) => a.category))).sort();
}

/**
 * Daftar tag unik (urut abjad) beserta jumlah artikel, dari artikel published.
 */
export async function getArticleTags(): Promise<
  { tag: string; count: number }[]
> {
  const articles = await getArticles();
  const map = new Map<string, number>();
  for (const a of articles) {
    for (const t of a.tags) {
      map.set(t, (map.get(t) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

/** Artikel pada kategori tertentu (cocokkan slug â†’ label). */
export async function getArticlesByCategory(category: string): Promise<Article[]> {
  const articles = await getArticles();
  return articles.filter((a) => a.category === category);
}

/** Artikel yang memiliki tag tertentu (cocokkan slug â†’ label). */
export async function getArticlesByTag(tag: string): Promise<Article[]> {
  const articles = await getArticles();
  return articles.filter((a) => a.tags.includes(tag));
}

/**
 * Artikel terkait: prioritaskan kesamaan kategori, lalu kesamaan tag.
 * Mengembalikan hingga `limit` artikel (tanpa dirinya sendiri).
 */
export function pickRelatedArticles(
  current: Article,
  all: Article[],
  limit = 3,
): Article[] {
  return all
    .filter((a) => a.slug !== current.slug)
    .map((a) => {
      const sameCategory = a.category === current.category ? 2 : 0;
      const sharedTags = a.tags.filter((t) => current.tags.includes(t)).length;
      return { article: a, score: sameCategory + sharedTags };
    })
    .sort(
      (x, y) =>
        y.score - x.score ||
        new Date(y.article.publishedAt).getTime() -
          new Date(x.article.publishedAt).getTime(),
    )
    .slice(0, limit)
    .map((x) => x.article);
}


export async function saveArticle(
  article: Article,
  updatedBy: string,
): Promise<void> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");

  const { coverImage, updatedAt, ...rest } = article;
  const payload: Record<string, unknown> = {
    ...rest,
    updatedAtISO: new Date().toISOString(),
    updatedAt: updatedAt ?? new Date().toISOString(),
    updatedBy,
  };
  payload.coverImage = coverImage ?? null;

  await db.collection(COLLECTION).doc(article.slug).set(payload, { merge: true });
}

export async function deleteArticleBySlug(slug: string): Promise<void> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  await db.collection(COLLECTION).doc(slug).delete();
}
