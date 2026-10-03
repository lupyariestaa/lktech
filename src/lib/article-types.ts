export const ARTICLE_STATUSES = ["draft", "published"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  /** Isi artikel dalam Markdown sederhana. */
  body: string;
  category: string;
  tags: string[];
  cover: string;
  coverImage?: string;
  /** Teks alternatif gambar sampul (a11y/SEO). */
  coverAlt?: string;
  author: string;
  status: ArticleStatus;
  /** ISO date. */
  publishedAt: string;
  updatedAt?: string;
};

/** Artikel tersimpan di Firestore (dengan id dokumen). */
export type StoredArticle = Article & { id: string };

export const ARTICLE_CATEGORIES = [
  "Tips & Trik",
  "Bisnis Digital",
  "Teknologi",
  "Panduan",
] as const;

/**
 * Ubah label (kategori/tag/teks) menjadi slug URL yang aman & ramah SEO.
 * Contoh: "Tips & Trik" → "tips-trik", "Jasa Website" → "jasa-website".
 */
export function taxonomySlug(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Cari label asli dari daftar label yang tersedia berdasarkan slug-nya.
 * Dipakai halaman kategori/tag untuk memetakan slug URL → label sebenarnya
 * (mis. "tips-trik" → "Tips & Trik").
 */
export function resolveLabelFromSlug(
  slug: string,
  labels: string[],
): string | null {
  const target = slug.toLowerCase();
  return labels.find((l) => taxonomySlug(l) === target) ?? null;
}

