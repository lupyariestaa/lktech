export const MEDIA_CATEGORIES = ["portofolio", "banner", "lainnya"] as const;
export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];

export const MEDIA_CATEGORY_LABEL: Record<MediaCategory, string> = {
  portofolio: "Portofolio",
  banner: "Banner",
  lainnya: "Lainnya",
};

/** Aset media tersimpan (metadata Cloudinary + kategori). */
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
  /** Slug proyek portofolio terkait (opsional). */
  projectSlug?: string;
  createdAt: string | null;
};
