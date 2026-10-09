/**
 * Logika murni artikel (tanpa Firestore, tanpa React, tanpa alias "@/").
 * Dipakai oleh `articles.ts`, route API, dan halaman, serta dites langsung.
 */
/** Bentuk artikel minimal untuk logika terkait. Sama dengan `Article` di article-types. */
type Article = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string[];
  cover: string;
  author: string;
  status: "draft" | "published";
  publishedAt: string;
};

/** Minimal bentuk artikel yang dibutuhkan logika murni ini. */
export type ArticleLike = {
  slug: string;
  status: "draft" | "published";
  publishedAt: string;
  scheduledAt?: string;
  slugHistory?: string[];
};

const WORDS_PER_MINUTE = 200;

/** Estimasi menit baca dari teks Markdown (minimal 1 menit). */
export function estimateReadingTime(body: string): number {
  const plain = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#*>`_\-]/g, " ");
  const words = plain.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/**
 * Artikel tampil publik bila published dan waktu terbit/jadwal sudah lewat.
 * `now` diinjeksi agar bisa dites deterministik.
 */
export function isPubliclyVisible(a: ArticleLike, now: number): boolean {
  if (a.status !== "published") return false;
  const pub = Date.parse(a.publishedAt);
  if (!Number.isNaN(pub) && pub > now) return false;
  if (a.scheduledAt) {
    const sched = Date.parse(a.scheduledAt);
    if (!Number.isNaN(sched) && sched > now) return false;
  }
  return true;
}

/**
 * Cari artikel berdasarkan slug aktif; bila tak ada, cek riwayat slug.
 * Mengembalikan { article, redirectTo } â€” redirectTo diisi bila ditemukan lewat
 * slug lama (untuk redirect 301).
 */
export function findArticleBySlugOrHistory<T extends ArticleLike>(
  slug: string,
  all: T[],
): { article: T; redirectTo: string | null } | null {
  const direct = all.find((a) => a.slug === slug);
  if (direct) return { article: direct, redirectTo: null };

  const viaHistory = all.find((a) => a.slugHistory?.includes(slug));
  if (viaHistory) return { article: viaHistory, redirectTo: viaHistory.slug };

  return null;
}

/**
 * Pencarian sederhana di judul, excerpt, tag, dan kategori.
 * Kata dipisah spasi, semua kata harus cocok (AND), tanpa peka huruf.
 */
export function matchesSearch(
  a: { title: string; excerpt: string; tags: string[]; category: string },
  query: string,
): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const hay = [a.title, a.excerpt, a.category, ...a.tags].join(" ").toLowerCase();
  return terms.every((t) => hay.includes(t));
}

/**
 * Paginasi berbasis cursor. Urutan sudah ditentukan pemanggil (terbaru dulu).
 * Cursor = "publishedAt|slug" dari item terakhir halaman sebelumnya.
 */
export function paginate<T extends { slug: string; publishedAt: string }>(
  items: T[],
  limit: number,
  cursor: string | null,
): { items: T[]; nextCursor: string | null } {
  const safeLimit = Math.min(Math.max(1, Math.floor(limit) || 12), 50);

  let start = 0;
  if (cursor) {
    const idx = items.findIndex((a) => cursorOf(a) === cursor);
    start = idx === -1 ? items.length : idx + 1;
  }

  const page = items.slice(start, start + safeLimit);
  const hasMore = start + safeLimit < items.length;
  const last = page[page.length - 1];
  return {
    items: page,
    nextCursor: hasMore && last ? cursorOf(last) : null,
  };
}

export function cursorOf(a: { slug: string; publishedAt: string }): string {
  return `${a.publishedAt}|${a.slug}`;
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
