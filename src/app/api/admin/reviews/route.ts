import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import {
  deleteReview,
  getReviewsSummary,
  listAllReviews,
  moderateReview,
} from "@/lib/reviews";
import { REVIEW_STATUSES, type ReviewStatus } from "@/lib/review-types";
import { reviewModerateSchema } from "@/lib/api-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/reviews — daftar ulasan (admin).
 *   ?status=pending|approved|rejected|semua  ?summary=1 (ringkasan/badge)
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const url = new URL(req.url);
  try {
    if (url.searchParams.get("summary") === "1") {
      const summary = await getReviewsSummary();
      return NextResponse.json(
        { summary },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const statusParam = url.searchParams.get("status");
    const status: ReviewStatus | "semua" =
      statusParam && (REVIEW_STATUSES as readonly string[]).includes(statusParam)
        ? (statusParam as ReviewStatus)
        : "semua";
    const reviews = await listAllReviews(status);
    return NextResponse.json(
      { reviews },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/admin/reviews] GET gagal:", err);
    return NextResponse.json({ error: "Gagal memuat ulasan." }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/reviews — moderasi ulasan.
 * Body: { id, status: "approved" | "rejected", reason? }
 */
export async function PATCH(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = reviewModerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  try {
    const review = await moderateReview(
      parsed.data.id,
      parsed.data.status,
      check.email,
      parsed.data.reason,
    );
    if (!review) {
      return NextResponse.json({ error: "Ulasan tidak ditemukan." }, { status: 404 });
    }
    revalidatePath(`/produk/${review.productSlug}`);
    revalidatePath("/produk");
    return NextResponse.json({ ok: true, review });
  } catch (err) {
    console.error("[api/admin/reviews] PATCH gagal:", err);
    return NextResponse.json({ error: "Gagal memoderasi ulasan." }, { status: 500 });
  }
}

/** DELETE /api/admin/reviews?id= — hapus ulasan (permanen) + recompute agregat. */
export async function DELETE(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  try {
    const ok = await deleteReview(id);
    if (!ok) {
      return NextResponse.json({ error: "Ulasan tidak ditemukan." }, { status: 404 });
    }
    revalidatePath("/produk");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/reviews] DELETE gagal:", err);
    return NextResponse.json({ error: "Gagal menghapus ulasan." }, { status: 500 });
  }
}
