import { getIdToken } from "@/lib/auth";

/** Ulasan publik (bentuk aman dari server). */
export type PublicReview = {
  id: string;
  buyerName: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAtISO: string;
};

/** Ambil ulasan DISETUJUI sebuah produk (publik). */
export async function fetchProductReviews(slug: string): Promise<PublicReview[]> {
  try {
    const res = await fetch(
      `/api/products/${encodeURIComponent(slug)}/reviews`,
      { cache: "no-store" },
    );
    const data = res.ok ? await res.json() : { reviews: [] };
    return Array.isArray(data?.reviews) ? (data.reviews as PublicReview[]) : [];
  } catch {
    return [];
  }
}

export type SubmitReviewResult = { ok: true; message: string };

/**
 * Kirim ulasan produk. Melempar Error berisi pesan server bila gagal.
 */
export async function submitProductReview(
  slug: string,
  input: { rating: number; title?: string; body?: string },
): Promise<SubmitReviewResult> {
  const token = await getIdToken();
  if (!token) throw new Error("Masuk untuk menulis ulasan.");

  const res = await fetch(`/api/products/${encodeURIComponent(slug)}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Gagal mengirim ulasan.");
  return { ok: true, message: data?.message ?? "Ulasan terkirim." };
}
