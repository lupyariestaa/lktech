import {
  MEDIA_CATEGORIES,
  MEDIA_STATUSES,
  type MediaCategory,
  type MediaItem,
  type MediaStatus,
  type MediaUsage,
} from "@/lib/media-types";

/**
 * Normalisasi dokumen media agar berbentuk `MediaItem` lengkap.
 *
 * Dokumen lama (tanpa field baru) tetap valid: field yang hilang diisi default
 * yang aman. Ini menjaga backward-compat tanpa perlu migrasi massal di
 * Firestore (normalizer on-read).
 */
export function normalizeMediaItem(id: string, raw: unknown): MediaItem {
  const d = (raw ?? {}) as Record<string, unknown>;

  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  const category: MediaCategory = MEDIA_CATEGORIES.includes(
    d.category as MediaCategory,
  )
    ? (d.category as MediaCategory)
    : "lainnya";

  const status: MediaStatus = MEDIA_STATUSES.includes(d.status as MediaStatus)
    ? (d.status as MediaStatus)
    : "active";

  return {
    id,
    publicId: str(d.publicId),
    secureUrl: str(d.secureUrl),
    width: num(d.width),
    height: num(d.height),
    format: str(d.format),
    bytes: num(d.bytes),
    category,
    title: str(d.title),
    alt: str(d.alt),
    description: typeof d.description === "string" ? d.description : undefined,
    tags: Array.isArray(d.tags)
      ? d.tags.filter((t): t is string => typeof t === "string")
      : [],
    collectionId:
      typeof d.collectionId === "string" && d.collectionId
        ? d.collectionId
        : undefined,
    projectSlug:
      typeof d.projectSlug === "string" && d.projectSlug ? d.projectSlug : undefined,
    productSlug:
      typeof d.productSlug === "string" && d.productSlug ? d.productSlug : undefined,
    articleSlug:
      typeof d.articleSlug === "string" && d.articleSlug ? d.articleSlug : undefined,
    favorite: d.favorite === true,
    status,
    usageCount: num(d.usageCount),
    usedIn: Array.isArray(d.usedIn)
      ? (d.usedIn.filter(
          (u) => u && typeof u === "object",
        ) as MediaUsage[])
      : [],
    dominantColor:
      typeof d.dominantColor === "string" && d.dominantColor
        ? d.dominantColor
        : undefined,
    blurHash:
      typeof d.blurHash === "string" && d.blurHash ? d.blurHash : undefined,
    order:
      typeof d.order === "number" && Number.isFinite(d.order)
        ? d.order
        : undefined,
    createdAt: typeof d.createdAtISO === "string" ? d.createdAtISO : null,
    updatedAtISO:
      typeof d.updatedAtISO === "string" ? d.updatedAtISO : undefined,
    uploadedBy: typeof d.uploadedBy === "string" ? d.uploadedBy : undefined,
    deletedAtISO:
      typeof d.deletedAtISO === "string" ? d.deletedAtISO : undefined,
  };
}

/**
 * Bentuk dokumen ringkas untuk endpoint PUBLIK: sembunyikan `publicId`, `tags`,
 * `usedIn`, dan field internal lain. Hanya data aman-tayang yang dikirim.
 */
export function toPublicMediaItem(item: MediaItem): MediaItem {
  return {
    ...item,
    publicId: "",
    collectionId: undefined,
    tags: [],
    usedIn: [],
    usageCount: 0,
    uploadedBy: undefined,
    deletedAtISO: undefined,
    favorite: false,
  };
}
