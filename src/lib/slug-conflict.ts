/**
 * Deteksi konflik slug (G4) — murni, tanpa Firestore.
 *
 * Masalah: slug lama yang masih tercatat di `slugHistory` artikel lain berfungsi
 * sebagai redirect 301. Jika artikel baru memakai slug itu, `findArticleBySlugOrHistory`
 * akan menampilkan artikel baru dan redirect lama hilang diam-diam.
 */

export type SlugOwner = { slug: string; slugHistory?: string[] };

/**
 * Mengembalikan artikel lain yang masih menyimpan `slug` di riwayatnya
 * (null bila aman). Artikel dengan slug yang sama (dirinya sendiri) diabaikan.
 */
export function findHistoryConflict(
  slug: string,
  all: SlugOwner[],
): SlugOwner | null {
  return (
    all.find((a) => a.slug !== slug && (a.slugHistory ?? []).includes(slug)) ??
    null
  );
}
