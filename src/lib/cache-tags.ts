/**
 * Tag cache data (`unstable_cache`) — SATU sumber kebenaran.
 *
 * Dipakai untuk dua hal:
 * 1. Menandai hasil `unstable_cache(...)` pada pembaca publik (settings, konten,
 *    artikel, produk, proyek, promo) — lihat `{ tags: [CACHE_TAGS.x] }`.
 * 2. Membatalkan cache saat data berubah dari dashboard (`revalidateTag`).
 *
 * Kenapa perlu: `revalidatePath` HANYA menyegarkan halaman pada kunjungan
 * berikutnya — entri `unstable_cache` yang dipakai halaman lain tetap basi
 * sampai tag-nya di-invalidasi. Jadi setiap mutasi WAJIB memanggil
 * `revalidateTag` untuk tag terkait (lihat `REVALIDATE_NOW`).
 *
 * Catatan Next 16: `revalidateTag(tag)` satu-argumen sudah DEPRECATED — wajib
 * menyertakan argumen kedua (profil atau `{ expire }`). Lihat
 * `node_modules/next/dist/docs/.../revalidateTag.md`.
 */

export const CACHE_TAGS = {
  /** `getSiteSettings()` — kontak, brand, SEO, mode pemeliharaan. */
  settings: "site-settings",
  /** `getSiteContent()` — layanan, FAQ, harga, hero, dll. */
  content: "site-content",
  /** `getArticles()` — artikel blog yang tayang. */
  articles: "articles",
  /** `getProducts()` — katalog produk aktif. */
  products: "products",
  /** `getProjects()` — portofolio proyek. */
  projects: "projects",
  /** `listPublicPromos()` — kupon publik. */
  promos: "promos",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * Profil invalidasi "langsung": entri tag dibuang dan request berikutnya
 * memblokir sampai data dihitung ulang — sehingga perubahan admin LANGSUNG
 * tampil (bukan stale-while-revalidate). Dipakai di Route Handler
 * (`updateTag` tidak tersedia di luar Server Action).
 */
export const REVALIDATE_NOW = { expire: 0 } as const;

/** Semua tag data — untuk "bersihkan semua cache" (mis. restore backup). */
export const ALL_CACHE_TAGS: CacheTag[] = Object.values(CACHE_TAGS);
