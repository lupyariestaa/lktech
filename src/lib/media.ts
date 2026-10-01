import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import {
  MEDIA_CATEGORIES,
  type MediaCategory,
  type MediaItem,
  type MediaListQuery,
  type MediaListResult,
  type MediaSortKey,
  type MediaStatusFilter,
} from "@/lib/media-types";
import { normalizeMediaItem } from "@/lib/media-normalize";

/**
 * Data layer media (server-only). Semua baca/tulis lewat satu tempat agar
 * konsisten, mudah diuji, dan tidak terduplikasi di route.
 *
 * Catatan paginasi: kursor berbasis `createdAtISO` + `id`. Filter teks/tag
 * dilakukan di server setelah fetch karena Firestore tidak mendukung pencarian
 * substring. Untuk skala besar, filter yang bisa diindeks (category/status)
 * tetap dipush ke query.
 */

const COLLECTION = "media";

/** Batas default & maksimum jumlah item per halaman. */
export const MEDIA_PAGE_DEFAULT_LIMIT = 24;
export const MEDIA_PAGE_MAX_LIMIT = 100;

function clampLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit) || limit <= 0) {
    return MEDIA_PAGE_DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(limit), MEDIA_PAGE_MAX_LIMIT);
}

/** Kursor: gabungan `createdAtISO` dan `id`, di-encode base64url. */
type Cursor = { createdAt: string; id: string };

function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.createdAt}|${c.id}`, "utf8").toString("base64url");
}

function decodeCursor(raw?: string): Cursor | null {
  if (!raw) return null;
  try {
    const [createdAt, id] = Buffer.from(raw, "base64url")
      .toString("utf8")
      .split("|");
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

/** Bandingkan dua item untuk pengurutan (server-side). */
function compareItems(a: MediaItem, b: MediaItem, sort: MediaSortKey): number {
  switch (sort) {
    case "oldest":
      return (a.createdAt ?? "").localeCompare(b.createdAt ?? "") || a.id.localeCompare(b.id);
    case "title":
      return (
        (a.title || a.publicId).localeCompare(b.title || b.publicId) ||
        a.id.localeCompare(b.id)
      );
    case "size":
      return b.bytes - a.bytes || a.id.localeCompare(b.id);
    case "newest":
    default:
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "") || b.id.localeCompare(a.id);
  }
}

/** Apakah item cocok dengan filter yang tidak bisa diindeks Firestore. */
function matchesTextFilters(
  item: MediaItem,
  q: string,
  category?: MediaCategory,
  collectionId?: string,
  tag?: string,
  favorite?: boolean,
): boolean {
  if (category && item.category !== category) return false;
  if (collectionId && item.collectionId !== collectionId) return false;
  if (tag && !item.tags.includes(tag)) return false;
  if (favorite === true && !item.favorite) return false;
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    item.title.toLowerCase().includes(needle) ||
    item.alt.toLowerCase().includes(needle) ||
    item.publicId.toLowerCase().includes(needle) ||
    item.tags.some((t) => t.toLowerCase().includes(needle))
  );
}

/**
 * Ambil dokumen media mentah (belum difilter) dari Firestore, terurut menurun
 * berdasarkan `createdAtISO`. Bila query memakai sortir lain, ambil lebih dulu
 * semua yang relevan lalu urutkan di server.
 */
async function fetchAllDocs(db: Firestore): Promise<MediaItem[]> {
  const snap = await db
    .collection(COLLECTION)
    .orderBy("createdAtISO", "desc")
    .get();
  return snap.docs.map((doc) => normalizeMediaItem(doc.id, doc.data()));
}

/**
 * Daftar media terpaginasi dengan pencarian, filter, dan pengurutan.
 *
 * Implementasi: fetch dokumen (terurut baru→lama dari Firestore), lalu
 * filter/paginate di server. Cara ini menjamin filter teks/tag berfungsi tanpa
 * perlu composite index, dan tetap memberi paginasi kursor yang stabil.
 */
export async function listMedia(
  db: Firestore,
  query: MediaListQuery = {},
): Promise<MediaListResult> {
  const limit = clampLimit(query.limit);
  const sort: MediaSortKey = query.sort ?? "newest";
  const status: MediaStatusFilter = query.status ?? "active";
  const q = (query.q ?? "").trim();

  const all = await fetchAllDocs(db);

  const filtered = all.filter((item) => {
    if (status !== "all" && item.status !== status) return false;
    return matchesTextFilters(
      item,
      q,
      query.category,
      query.collectionId,
      query.tag,
      query.favorite,
    );
  });

  // Sortir (fetchAllDocs sudah desc by createdAt; timpa bila perlu).
  if (sort !== "newest") {
    filtered.sort((a, b) => compareItems(a, b, sort));
  }

  // Paginasi kursor: mulai setelah posisi kursor pada urutan saat ini.
  const cursor = decodeCursor(query.cursor);
  let startIndex = 0;
  if (cursor && sort === "newest") {
    const idx = filtered.findIndex(
      (it) => it.createdAt === cursor.createdAt && it.id === cursor.id,
    );
    startIndex = idx >= 0 ? idx + 1 : 0;
  } else if (cursor) {
    // Untuk sortir non-newest: cari berdasarkan id saja.
    const idx = filtered.findIndex((it) => it.id === cursor.id);
    startIndex = idx >= 0 ? idx + 1 : 0;
  }

  const page = filtered.slice(startIndex, startIndex + limit);
  const last = page[page.length - 1];
  const hasMore = startIndex + limit < filtered.length;
  const nextCursor =
    hasMore && last
      ? encodeCursor({ createdAt: last.createdAt ?? "", id: last.id })
      : null;

  return { items: page, nextCursor };
}

/** Ambil satu item media berdasarkan id (atau null bila tidak ada). */
export async function getMediaItem(
  db: Firestore,
  id: string,
): Promise<MediaItem | null> {
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return normalizeMediaItem(doc.id, doc.data());
}

/** Field yang boleh diubah lewat PATCH. */
export type MediaUpdatePatch = {
  title?: string;
  alt?: string;
  description?: string;
  tags?: string[];
  category?: MediaCategory;
  collectionId?: string;
  projectSlug?: string;
  productSlug?: string;
  articleSlug?: string;
  favorite?: boolean;
  order?: number;
};

/** Perbarui metadata media (field yang tak disertakan tidak diubah). */
export async function updateMediaItem(
  db: Firestore,
  id: string,
  patch: MediaUpdatePatch,
): Promise<MediaItem | null> {
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const data: Record<string, unknown> = {
    updatedAtISO: new Date().toISOString(),
  };

  if (patch.title !== undefined) data.title = patch.title;
  if (patch.alt !== undefined) data.alt = patch.alt;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.tags !== undefined) data.tags = patch.tags;
  if (patch.category !== undefined) data.category = patch.category;
  if (patch.collectionId !== undefined) data.collectionId = patch.collectionId;
  if (patch.projectSlug !== undefined) data.projectSlug = patch.projectSlug;
  if (patch.productSlug !== undefined) data.productSlug = patch.productSlug;
  if (patch.articleSlug !== undefined) data.articleSlug = patch.articleSlug;
  if (patch.favorite !== undefined) data.favorite = patch.favorite;
  if (patch.order !== undefined) data.order = patch.order;

  await ref.update(data);
  return getMediaItem(db, id);
}

/** Tandai item sebagai `trashed` (soft delete). */
export async function trashMediaItem(
  db: Firestore,
  id: string,
): Promise<MediaItem | null> {
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;
  const now = new Date().toISOString();
  await ref.update({ status: "trashed", deletedAtISO: now, updatedAtISO: now });
  return getMediaItem(db, id);
}

/** Pulihkan item dari trash (restore). */
export async function restoreMediaItem(
  db: Firestore,
  id: string,
): Promise<MediaItem | null> {
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;
  const now = new Date().toISOString();
  await ref.update({ status: "active", deletedAtISO: "", updatedAtISO: now });
  return getMediaItem(db, id);
}

/** Hapus dokumen media secara permanen (metadata saja). */
export async function deleteMediaDoc(
  db: Firestore,
  id: string,
): Promise<boolean> {
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.delete();
  return true;
}

/** Daftar kategori valid (re-export untuk kemudahan route). */
export { MEDIA_CATEGORIES };
