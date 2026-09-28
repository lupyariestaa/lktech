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
