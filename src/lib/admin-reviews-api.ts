import { adminFetch } from "@/lib/admin-fetch";
import type { Review, ReviewStatus } from "@/lib/review-types";
import type { ReviewsSummary } from "@/lib/reviews";

/** Daftar ulasan (admin), opsional difilter status. */
export async function fetchAllReviews(
  status: ReviewStatus | "semua" = "semua",
): Promise<Review[]> {
  const qs = status !== "semua" ? `?status=${encodeURIComponent(status)}` : "";
  const data = await adminFetch<{ reviews: Review[] }>(`/api/admin/reviews${qs}`);
  return data.reviews;
}

/** Ringkasan ulasan (badge/metrik). */
export async function fetchReviewsSummary(): Promise<ReviewsSummary> {
  const data = await adminFetch<{ summary: ReviewsSummary }>(
    "/api/admin/reviews?summary=1",
  );
  return data.summary;
}

/** Moderasi ulasan (approve/reject). */
export async function moderateReviewAdmin(
  id: string,
  status: "approved" | "rejected",
  reason?: string,
): Promise<Review> {
  const data = await adminFetch<{ review: Review }>("/api/admin/reviews", {
    method: "PATCH",
    body: JSON.stringify({ id, status, reason }),
  });
  return data.review;
}

/** Hapus ulasan (permanen). */
export async function deleteReviewAdmin(id: string): Promise<void> {
  await adminFetch<{ ok: boolean }>(
    `/api/admin/reviews?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}
