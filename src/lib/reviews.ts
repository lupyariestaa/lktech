import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  buildModerationPatch,
  computeRatingSummary,
  isValidRating,
  MODERATION_DELETE,
  normalizeRatingSummary,
  REVIEW_BODY_MAX,
  REVIEW_TITLE_MAX,
  type RatingSummary,
  type Review,
  type ReviewStatus,
  REVIEW_STATUSES,
} from "@/lib/review-types";

/**
 * Data layer ULASAN & RATING produk.
 *
 * Koleksi: `reviews/{id}`. Agregat ringkasan di denormalisasi ke
 * `products/{slug}.ratingSummary` (dihitung ulang dari sumber — ulasan `approved`).
 *
 * Prinsip: server-only (Admin SDK), best-effort untuk recompute agregat,
 * backward-compatible.
 */

const COLLECTION = "reviews";

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function statusOf(v: unknown): ReviewStatus {
  return (REVIEW_STATUSES as readonly string[]).includes(str(v))
    ? (v as ReviewStatus)
    : "pending";
}

/** Normalisasi dokumen ulasan mentah. */
export function normalizeReview(id: string, data: Record<string, unknown>): Review {
  return {
    id,
    productSlug: str(data.productSlug),
    productName: str(data.productName),
    uid: str(data.uid),
    buyerName: str(data.buyerName, "Pembeli"),
    rating: typeof data.rating === "number" ? data.rating : 0,
    title: str(data.title) || undefined,
    body: str(data.body) || undefined,
    status: statusOf(data.status),
    orderId: str(data.orderId),
    createdAtISO: str(data.createdAtISO),
    updatedAtISO: str(data.updatedAtISO) || undefined,
    moderatedBy: str(data.moderatedBy) || undefined,
    moderatedAtISO: str(data.moderatedAtISO) || undefined,
    rejectionReason: str(data.rejectionReason) || undefined,
  };
}

export type CreateReviewInput = {
  productSlug: string;
  productName: string;
  uid: string;
  buyerName: string;
  rating: number;
  title?: string;
  body?: string;
  orderId: string;
};

export type CreateReviewResult =
  | { ok: true; review: Review }
  | { ok: false; reason: "invalid_rating" | "duplicate" | "unavailable" };

/**
 * Buat ulasan baru. Idempoten per (orderId, productSlug): id dokumen
 * deterministik `{orderId}_{productSlug}` + `.create()` (gagal bila sudah ada),
 * sehingga dua klik cepat tidak bisa membuat ulasan ganda. Selalu `pending`.
 */
export async function createReview(
  input: CreateReviewInput,
): Promise<CreateReviewResult> {
  const db = getAdminDb();
  if (!db) return { ok: false, reason: "unavailable" };
  if (!isValidRating(input.rating)) return { ok: false, reason: "invalid_rating" };

  const nowISO = new Date().toISOString();
  const payload = {
    productSlug: input.productSlug,
    productName: input.productName,
    uid: input.uid,
    buyerName: input.buyerName.slice(0, 80),
    rating: input.rating,
    title: (input.title ?? "").trim().slice(0, REVIEW_TITLE_MAX) || undefined,
    body: (input.body ?? "").trim().slice(0, REVIEW_BODY_MAX) || undefined,
    status: "pending" as const,
    orderId: input.orderId,
    createdAtISO: nowISO,
  };
  // Buang field `undefined` sebelum menulis (Admin SDK menolak undefined).
  const clean: Record<string, unknown> = { ...payload };
  for (const k of ["title", "body"]) {
    if (clean[k] === undefined) delete clean[k];
  }

  // ID deterministik: satu ulasan per (order, produk). `_` pemisah aman untuk doc id.
  const docId = `${input.orderId}_${input.productSlug}`.replace(/\//g, "_");
  const ref = db.collection(COLLECTION).doc(docId);
  try {
    await ref.create(clean);
  } catch (err) {
    // `.create()` gagal bila dokumen sudah ada (ALREADY_EXISTS) → duplikat.
    // Kegagalan lain (mis. jaringan) dibedakan agar tidak salah lapor duplikat.
    const exists = await ref.get();
    if (exists.exists) return { ok: false, reason: "duplicate" };
    console.error("[reviews] gagal membuat ulasan:", err);
    return { ok: false, reason: "unavailable" };
  }
  return { ok: true, review: normalizeReview(docId, clean) };
}

/** Daftar ulasan DISETUJUI sebuah produk (terbaru dulu). */
export async function listProductReviews(
  productSlug: string,
  limit = 50,
): Promise<Review[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db
    .collection(COLLECTION)
    .where("productSlug", "==", productSlug)
    .where("status", "==", "approved")
    .limit(limit)
    .get();
  return snap.docs
    .map((doc) => normalizeReview(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
}

/** Daftar SEMUA ulasan (admin), terbaru lebih dulu. Saring status di memori. */
export async function listAllReviews(status?: ReviewStatus | "semua"): Promise<Review[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection(COLLECTION).limit(500).get();
  const all = snap.docs
    .map((doc) => normalizeReview(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
  if (!status || status === "semua") return all;
  return all.filter((r) => r.status === status);
}

/** Ringkasan jumlah per status (badge/metrik admin). */
export type ReviewsSummary = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  /** Rata-rata rating dari ulasan disetujui. */
  avgRating: number;
};

export async function getReviewsSummary(): Promise<ReviewsSummary> {
  const all = await listAllReviews("semua");
  const approved = all.filter((r) => r.status === "approved");
  const avg =
    approved.length > 0
      ? Math.round(
          (approved.reduce((s, r) => s + r.rating, 0) / approved.length) * 10,
        ) / 10
      : 0;
  return {
    total: all.length,
    pending: all.filter((r) => r.status === "pending").length,
    approved: approved.length,
    rejected: all.filter((r) => r.status === "rejected").length,
    avgRating: avg,
  };
}

/** Ambil satu ulasan. */
export async function getReviewById(id: string): Promise<Review | null> {
  const db = getAdminDb();
  if (!db) return null;
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return normalizeReview(doc.id, doc.data() ?? {});
}

/**
 * Moderasi ulasan (approve/reject). Setelah itu recompute agregat rating produk
 * terkait. Mengembalikan ulasan terbaru (null bila tak ada).
 */
export async function moderateReview(
  id: string,
  status: ReviewStatus,
  moderatedBy: string,
  rejectionReason?: string,
): Promise<Review | null> {
  const db = getAdminDb();
  if (!db) return null;
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const nowISO = new Date().toISOString();
  // PENTING: Firestore Admin SDK MENOLAK nilai `undefined` (akan throw).
  // Helper murni membangun patch tanpa undefined (lihat buildModerationPatch).
  const built = buildModerationPatch(status, moderatedBy, nowISO, rejectionReason);
  const patch: Record<string, unknown> = { ...built };
  if (patch.rejectionReason === MODERATION_DELETE) {
    patch.rejectionReason = FieldValue.delete();
  }
  await ref.set(patch, { merge: true });

  const updated = normalizeReview(id, (await ref.get()).data() ?? {});
  await recomputeProductRating(updated.productSlug);
  return updated;
}

/** Hapus ulasan (permanen) + recompute agregat produk. */
/** Hapus ulasan (permanen) + recompute agregat produk.
 *  Mengembalikan slug produk yang terdampak (untuk revalidate), atau null bila tak ada. */
export async function deleteReview(id: string): Promise<string | null> {
  const db = getAdminDb();
  if (!db) return null;
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const review = normalizeReview(id, doc.data() ?? {});
  await ref.delete();
  await recomputeProductRating(review.productSlug);
  return review.productSlug;
}

/**
 * Hitung ulang agregat rating sebuah produk dari sumber (ulasan `approved`)
 * lalu simpan ke `products/{slug}.ratingSummary`. Sumber kebenaran = `reviews`.
 */
export async function recomputeProductRating(productSlug: string): Promise<RatingSummary | null> {
  const db = getAdminDb();
  if (!db || !productSlug) return null;

  const snap = await db
    .collection(COLLECTION)
    .where("productSlug", "==", productSlug)
    .where("status", "==", "approved")
    .get();
  const ratings = snap.docs.map((d) => Number(d.get("rating")));
  const summary = computeRatingSummary(ratings);

  try {
    await db
      .collection("products")
      .doc(productSlug)
      .set(
        {
          ratingSummary: summary.count > 0 ? summary : { avg: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
          updatedAtISO: new Date().toISOString(),
        },
        { merge: true },
      );
  } catch (err) {
    console.error("[reviews] gagal menyimpan ratingSummary:", err);
  }
  return summary;
}

/** Ambil ratingSummary produk (dari dokumen produk). */
export async function getProductRatingSummary(
  productSlug: string,
): Promise<RatingSummary | undefined> {
  const db = getAdminDb();
  if (!db) return undefined;
  const doc = await db.collection("products").doc(productSlug).get();
  if (!doc.exists) return undefined;
  return normalizeRatingSummary(doc.get("ratingSummary"));
}
