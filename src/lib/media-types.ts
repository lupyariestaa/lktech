export const MEDIA_CATEGORIES = [
  "portofolio",
  "banner",
  "produk",
  "blog",
  "hero",
  "icon",
  "lainnya",
] as const;
export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];

export const MEDIA_CATEGORY_LABEL: Record<MediaCategory, string> = {
  portofolio: "Portofolio",
  banner: "Banner",
  produk: "Produk",
  blog: "Blog",
  hero: "Hero",
  icon: "Icon",
  lainnya: "Lainnya",
};

/** Status daur hidup aset media (trash/restore). */
export const MEDIA_STATUSES = ["active", "trashed"] as const;
export type MediaStatus = (typeof MEDIA_STATUSES)[number];

/** Jenis konten yang bisa memakai sebuah aset media. */
export type MediaUsageType =
  | "product"
  | "article"
  | "project"
  | "hero"
  | "settings";

/** Satu referensi konten yang memakai sebuah aset media. */
export type MediaUsage = {
  type: MediaUsageType;
  /** Slug/ID konten terkait. */
  refId: string;
  /** Teks ramah, mis. "Produk: Paket Website Portfolio". */
  label: string;
  /** Field tempat aset dipakai, mis. "cover", "gallery[0]". */
  field: string;
};

/**
 * Aset media tersimpan (metadata Cloudinary + pengorganisasian).
 *
 * Field baru bersifat opsional pada dokumen lama; gunakan `normalizeMediaItem`
 * untuk memastikan bentuk lengkap saat membaca dari Firestore (backward-compat).
 */
export type MediaItem = {
  id: string;
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  category: MediaCategory;
  title: string;
  /** Teks alternatif untuk a11y/SEO. */
  alt: string;
  description?: string;
  tags: string[];
  /** Kaitan ke koleksi/folder (Fase M4). */
  collectionId?: string;
  /** Slug proyek portofolio terkait (opsional). */
  projectSlug?: string;
  /** Ref generik ke produk/artikel (opsional). */
  productSlug?: string;
  articleSlug?: string;
  /** Pin/favorit. */
  favorite: boolean;
  /** Status daur hidup: `active` atau `trashed`. */
  status: MediaStatus;
  /** Jumlah referensi konten yang memakai aset (denormalisasi, Fase M3). */
  usageCount: number;
  /** Daftar referensi konten (dihitung saat scan, Fase M3). */
  usedIn: MediaUsage[];
  dominantColor?: string;
  blurHash?: string;
  /** Urutan manual (mis. untuk galeri proyek). Angka kecil lebih dulu. */
  order?: number;
  createdAt: string | null;
  updatedAtISO?: string;
  uploadedBy?: string;
  deletedAtISO?: string;
};

/** Kunci pengurutan daftar media. */
export const MEDIA_SORT_KEYS = ["newest", "oldest", "title", "size"] as const;
export type MediaSortKey = (typeof MEDIA_SORT_KEYS)[number];

/** Filter status untuk kueri daftar media admin. */
export const MEDIA_STATUS_FILTERS = ["active", "trashed", "all"] as const;
export type MediaStatusFilter = (typeof MEDIA_STATUS_FILTERS)[number];

/** Parameter kueri daftar media admin (semua opsional). */
export type MediaListQuery = {
  q?: string;
  category?: MediaCategory;
  collectionId?: string;
  tag?: string;
  favorite?: boolean;
  status?: MediaStatusFilter;
  sort?: MediaSortKey;
  cursor?: string;
  limit?: number;
};

/** Respons daftar media terpaginasi. */
export type MediaListResult = {
  items: MediaItem[];
  nextCursor: string | null;
};
