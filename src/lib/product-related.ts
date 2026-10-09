/**
 * Urutan produk terkait (murni, tanpa I/O). Dipisah dari products.ts agar bisa dites
 * langsung. Urutan: 1) manual (relatedSlugs), 2) riwayat pesanan (coPurchase, sudah
 * diranking), 3) fallback kategori sama. Maks limit, tanpa duplikat, tanpa exclude.
 */

/** Bentuk minimal produk yang dibutuhkan urutan ini. */
export type RelatableProduct = {
  slug: string;
  category: string;
  relatedSlugs?: string[];
};

export function pickRelatedProducts<T extends RelatableProduct>(
  product: { slug: string; category: string; relatedSlugs?: string[] },
  all: T[],
  opts: { limit?: number; exclude?: Iterable<string>; coPurchase?: string[] } = {},
): T[] {
  const limit = Math.max(1, opts.limit ?? 3);
  const exclude = new Set<string>([product.slug, ...(opts.exclude ?? [])]);
  const bySlug = new Map(all.map((p) => [p.slug, p]));

  const picked: T[] = [];
  const push = (p: T | undefined) => {
    if (!p || exclude.has(p.slug) || picked.some((x) => x.slug === p.slug)) return;
    if (picked.length < limit) picked.push(p);
  };

  // 1) Manual (urutan sesuai `relatedSlugs`).
  for (const slug of product.relatedSlugs ?? []) {
    push(bySlug.get(slug));
    if (picked.length >= limit) break;
  }

  // 2) Riwayat pesanan: produk yang sering dibeli bersama (sudah diranking).
  for (const slug of opts.coPurchase ?? []) {
    push(bySlug.get(slug));
    if (picked.length >= limit) break;
  }

  // 3) Fallback: kategori sama.
  if (picked.length < limit) {
    for (const p of all) {
      if (p.category !== product.category) continue;
      push(p);
      if (picked.length >= limit) break;
    }
  }

  return picked;
}
