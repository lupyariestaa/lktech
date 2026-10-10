/**
 * Tipe & logika MURNI ulasan/rating produk — AMAN untuk klien (tanpa server-only)
 * dan dapat diuji Node tanpa alias resolver.
 */

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "Menunggu moderasi",
  approved: "Disetujui",
  rejected: "Ditolak",
};

export const REVIEW_STATUS_STYLE: Record<ReviewStatus, string> = {
  pending: "bg-amber-50 text-amber-600 border-amber-100",
  approved: "bg-emerald-50 text-emerald-600 border-emerald-100",
  rejected: "bg-rose-50 text-rose-600 border-rose-100",
};

/** Rating minimum & maksimum. */
export const RATING_MIN = 1;
export const RATING_MAX = 5;

/** Batas panjang teks ulasan. */
export const REVIEW_TITLE_MAX = 120;
export const REVIEW_BODY_MAX = 2000;

/** Satu ulasan tersimpan di Firestore (`reviews/{id}`). */
export type Review = {
  id: string;
  productSlug: string;
  /** Nama produk (snapshot, untuk tampilan admin). */
  productName: string;
  uid: string;
  /** Nama penampil pembeli (snapshot; boleh disamarkan di UI). */
  buyerName: string;
  rating: number;
  title?: string;
  body?: string;
  status: ReviewStatus;
  /** ID order sumber (verified purchase) — kunci idempotensi 1 ulasan/order. */
  orderId: string;
  createdAtISO: string;
  updatedAtISO?: string;
  moderatedBy?: string;
  moderatedAtISO?: string;
  /** Alasan penolakan (opsional, untuk audit internal). */
  rejectionReason?: string;
};

/** Ringkasan rating sebuah produk (denormalisasi pada `products/{slug}`). */
export type RatingSummary = {
  /** Rata-rata rating (1 desimal), 0 bila belum ada. */
  avg: number;
  /** Jumlah ulasan disetujui. */
  count: number;
  /** Distribusi jumlah per bintang (1..5). */
  distribution: Record<number, number>;
};

/** Ringkasan kosong. */
export function emptyRatingSummary(): RatingSummary {
  return { avg: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
}

/** Apakah sebuah rating valid (integer 1..5). */
export function isValidRating(v: unknown): v is number {
  return (
    typeof v === "number" &&
    Number.isInteger(v) &&
    v >= RATING_MIN &&
    v <= RATING_MAX
  );
}

/**
 * Hitung ringkasan rating dari daftar rating (HANYA yang sudah approved —
 * pemanggil bertanggung jawab menyaring). Murni & teruji.
 */
export function computeRatingSummary(ratings: readonly number[]): RatingSummary {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  let count = 0;
  for (const r of ratings) {
    if (!isValidRating(r)) continue;
    distribution[r] += 1;
    sum += r;
    count += 1;
  }
  const avg = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
  return { avg, count, distribution };
}

/** Normalisasi ratingSummary dari Firestore (aman/backward-compat). */
export function normalizeRatingSummary(v: unknown): RatingSummary | undefined {
  if (!v || typeof v !== "object") return undefined;
  const d = v as Record<string, unknown>;
  const count = typeof d.count === "number" && Number.isFinite(d.count) ? Math.max(0, Math.floor(d.count)) : 0;
  const avg = typeof d.avg === "number" && Number.isFinite(d.avg) ? d.avg : 0;
  if (count <= 0 && avg <= 0) return undefined;
  const rawDist =
    d.distribution && typeof d.distribution === "object"
      ? (d.distribution as Record<string, unknown>)
      : {};
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (let i = RATING_MIN; i <= RATING_MAX; i++) {
    const n = rawDist[String(i)];
    distribution[i] = typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  return { avg, count, distribution };
}

/** Persentase (0..100) untuk bilah distribusi. */
export function ratingPercent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

/**
 * Bangun patch moderasi ulasan (murni, teruji). PENTING: tidak pernah memuat
 * nilai `undefined` (Firestore Admin SDK menolak `undefined`). Untuk approve,
 * `rejectionReason` ditandai `${DELETE}` agar pemanggil menghapus field-nya.
 *
 * `DELETE` = sentinel string; `reviews.ts` menerjemahkannya menjadi
 * `FieldValue.delete()`.
 */
export const MODERATION_DELETE = "__delete__";

export function buildModerationPatch(
  status: ReviewStatus,
  moderatedBy: string,
  nowISO: string,
  rejectionReason?: string,
): Record<string, string> {
  const patch: Record<string, string> = {
    status,
    moderatedBy,
    moderatedAtISO: nowISO,
    updatedAtISO: nowISO,
  };
  const reason = (rejectionReason ?? "").trim();
  if (status === "rejected") {
    // Hanya set bila ada alasan; kalau kosong, biarkan (tanpa undefined).
    if (reason) patch.rejectionReason = reason;
  } else {
    // Approve: tandai agar alasan penolakan lama dihapus dari dokumen.
    patch.rejectionReason = MODERATION_DELETE;
  }
  return patch;
}
