import type { Article, StoredArticle } from "@/lib/article-types";
import {
  findArticleBySlugOrHistory,
  isPubliclyVisible,
  type ArticleLike,
} from "@/lib/article-logic";

export {
  estimateReadingTime,
  matchesSearch,
  paginate,
  cursorOf,
  pickRelatedArticles,
} from "@/lib/article-logic";
export type { ArticleLike };

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
    // B5.2: field baru bersifat opsional; artikel lama tetap valid.
    metaTitle: typeof data.metaTitle === "string" && data.metaTitle ? data.metaTitle : undefined,
    metaDescription:
      typeof data.metaDescription === "string" && data.metaDescription
        ? data.metaDescription
        : undefined,
    scheduledAt: typeof data.scheduledAt === "string" && data.scheduledAt ? data.scheduledAt : undefined,
    slugHistory: Array.isArray(data.slugHistory)
      ? data.slugHistory.filter((s): s is string => typeof s === "string")
      : [],
    readingTime: typeof data.readingTime === "number" ? data.readingTime : undefined,
  };
}

/** Semua artikel yang tayang publik (published & jadwal sudah lewat). Tanpa DB → kosong. */
export async function getArticles(): Promise<Article[]> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) return [];

  try {
    const snap = await db.collection(COLLECTION).get();
    const now = Date.now();
    return snap.docs
      .map((doc) => normalizeArticle(doc.data()))
      .filter((a) => isPubliclyVisible(a, now))
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

/**
 * Cari artikel publik via slug aktif, lalu riwayat slug (B5.7).
 * `redirectTo` diisi bila pencarian lewat slug lama.
 */
export async function resolveArticleSlug(
  slug: string,
): Promise<{ article: Article; redirectTo: string | null } | null> {
  const articles = await getArticles();
  return findArticleBySlugOrHistory(slug, articles);
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

  // Firestore menolak `undefined`: ganti dengan null (field opsional kosong).
  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) payload[key] = null;
  }

  await db.collection(COLLECTION).doc(article.slug).set(payload, { merge: true });
}

export async function deleteArticleBySlug(slug: string): Promise<void> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  await db.collection(COLLECTION).doc(slug).delete();
}
