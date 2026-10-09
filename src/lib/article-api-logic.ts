/**
 * Keputusan murni untuk route API artikel (tanpa Next, Firestore, atau alias "@/").
 * Route hanya memanggil fungsi ini lalu menjalankan efek samping (simpan, audit,
 * revalidate). Dipisah agar aturan yang berisiko bisa dites langsung.
 */

/** Bentuk minimal artikel untuk keputusan. */
export type ApiArticleLike = {
  slug: string;
  category: string;
  tags: string[];
  status: "draft" | "published";
  slugHistory?: string[];
};

export type AuditAction =
  | "article.save"
  | "article.publish"
  | "article.unpublish"
  | "article.duplicate";

/**
 * Riwayat slug setelah simpan (B5.7).
 * - Mengambil riwayat dari versi slug saat ini dan dari slug asal saat rename.
 * - Menambahkan slug asal saat rename (kecuali sama dengan slug baru).
 * - Slug baru tidak boleh ada di riwayat (artikel aktif didahulukan).
 */
export function buildSlugHistory(input: {
  slug: string;
  currentHistory?: string[];
  renamedFrom?: string;
  renamedFromHistory?: string[];
}): string[] {
  const set = new Set<string>([
    ...(input.currentHistory ?? []),
    ...(input.renamedFromHistory ?? []),
  ]);
  if (input.renamedFrom && input.renamedFrom !== input.slug) {
    set.add(input.renamedFrom);
  }
  set.delete(input.slug);
  return Array.from(set);
}

/**
 * Pilih aksi audit untuk simpan artikel.
 * - `duplicate`: slug sumber diberikan dan belum ada versi sebelumnya.
 * - `publish`/`unpublish`: status berubah.
 * - selain itu: `save`.
 */
export function decideAuditAction(input: {
  hasPrevious: boolean;
  previousStatus?: "draft" | "published";
  nextStatus: "draft" | "published";
  duplicatedFrom?: string;
}): AuditAction {
  if (input.duplicatedFrom && !input.hasPrevious) return "article.duplicate";
  if (input.hasPrevious && input.previousStatus && input.previousStatus !== input.nextStatus) {
    return input.nextStatus === "published" ? "article.publish" : "article.unpublish";
  }
  return "article.save";
}

/**
 * Kumpulan path yang perlu di-revalidate untuk artikel (list, detail, kategori,
 * tag, RSS, sitemap). Urutan dijamin stabil (Set insertion order).
 */
export function revalidationPaths(
  articles: Array<Pick<ApiArticleLike, "slug" | "category" | "tags"> | undefined>,
  slugify: (label: string) => string,
): string[] {
  const paths = new Set<string>(["/blog", "/blog/rss.xml", "/sitemap.xml"]);
  for (const a of articles) {
    if (!a) continue;
    if (a.slug) paths.add(`/blog/${a.slug}`);
    if (a.category) paths.add(`/blog/kategori/${slugify(a.category)}`);
    for (const t of a.tags) paths.add(`/blog/tag/${slugify(t)}`);
  }
  return Array.from(paths);
}

/**
 * Otorisasi cron (fail-closed). Tanpa secret → tidak pernah diizinkan.
 * Token dari header `Authorization: Bearer` atau query `token`.
 */
export function isCronAuthorized(input: {
  secret: string | undefined;
  authorizationHeader: string | null;
  queryToken: string | null;
}): boolean {
  const secret = input.secret?.trim();
  if (!secret) return false;

  const auth = input.authorizationHeader ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const provided = bearer || (input.queryToken ?? "");
  return provided !== "" && provided === secret;
}

/** Batas jumlah item per aksi massal (sama dengan article-manage). */
export const BULK_LIMIT = 50;
