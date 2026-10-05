import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  computeRatingSummary,
  isValidRating,
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
 * Buat ulasan baru. Idempoten per (orderId, productSlug): bila sudah ada,
 * kembalikan `duplicate`. Selalu berstatus `pending` (moderasi wajib).
 */
export async function createReview(
  input: CreateReviewInput,
): Promise<CreateReviewResult> {
  const db = getAdminDb();
  if (!db) return { ok: false, reason: "unavailable" };
  if (!isValidRating(input.rating)) return { ok: false, reason: "invalid_rating" };

  // Idempotensi: cek apakah (orderId, productSlug) sudah pernah diulas.
  const existing = await db
    .collection(COLLECTION)
    .where("orderId", "==", input.orderId)
    .where("productSlug", "==", input.productSlug)
    .limit(1)
    .get();
  if (!existing.empty) return { ok: false, reason: "duplicate" };

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
  const ref = await db.collection(COLLECTION).add(payload);
  return { ok: true, review: normalizeReview(ref.id, payload) };
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

  await ref.set(
    {
      status,
      moderatedBy,
      moderatedAtISO: new Date().toISOString(),
      updatedAtISO: new Date().toISOString(),
      rejectionReason: status === "rejected" ? (rejectionReason ?? "") || undefined : undefined,
    },
    { merge: true },
  );

  const updated = normalizeReview(id, (await ref.get()).data() ?? {});
  await recomputeProductRating(updated.productSlug);
  return updated;
}

/** Hapus ulasan (permanen) + recompute agregat produk. */
export async function deleteReview(id: string): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;
  const review = normalizeReview(id, doc.data() ?? {});
  await ref.delete();
  await recomputeProductRating(review.productSlug);
  return true;
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
