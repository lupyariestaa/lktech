import { NextResponse } from "next/server";
import { requireUser } from "@/lib/admin-guard";
import { getProductsBySlugs } from "@/lib/products";
import { findCompletedOrderForProduct } from "@/lib/orders";
import { createReview, listProductReviews } from "@/lib/reviews";
import { reviewSubmitSchema } from "@/lib/api-schemas";
import { rateLimit } from "@/lib/rate-limit";
import type { Review } from "@/lib/review-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bentuk ulasan yang aman untuk publik (tanpa uid/orderId internal). */
function toPublicReview(r: Review) {
  return {
    id: r.id,
    buyerName: maskName(r.buyerName),
    rating: r.rating,
    title: r.title ?? null,
    body: r.body ?? null,
    createdAtISO: r.createdAtISO,
  };
}

/** Samarkan nama pembeli (privasi): "Budi Santoso" → "Budi S.". */
function maskName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Pembeli";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

/**
 * GET /api/products/[slug]/reviews — ulasan DISETUJUI sebuah produk (publik).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ reviews: [] });
  try {
    const reviews = await listProductReviews(slug, 50);
    return NextResponse.json(
      { reviews: reviews.map(toPublicReview) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/products/reviews] GET gagal:", err);
    return NextResponse.json({ reviews: [] });
  }
}

/**
 * POST /api/products/[slug]/reviews — kirim ulasan (hanya pembeli terverifikasi).
 * Body: { rating, title?, body? }
 *
 * Keamanan: wajib login; server memverifikasi user punya order `selesai` yang
 * memuat produk ini (bukan dari body). Idempoten 1 ulasan per (order, produk).
 * Ulasan masuk status `pending` (menunggu moderasi).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const check = await requireUser(req);
  if (!check.ok) return check.response;

  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: "Produk tidak valid." }, { status: 400 });
  }

  const rl = rateLimit(`review:${check.uid}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = reviewSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data ulasan tidak valid." },
      { status: 400 },
    );
  }

  try {
    // Produk harus ada & aktif.
    const products = await getProductsBySlugs([slug]);
    const product = products.get(slug);
    if (!product || !product.active) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    // Verifikasi pembelian (order `selesai` milik user memuat produk ini).
    const order = await findCompletedOrderForProduct(check.uid, slug);
    if (!order) {
      return NextResponse.json(
        {
          error:
            "Ulasan hanya untuk pembeli. Selesaikan pesanan produk ini terlebih dahulu.",
          code: "not_verified_buyer",
        },
        { status: 403 },
      );
    }

    const result = await createReview({
      productSlug: slug,
      productName: product.name,
      uid: check.uid,
      buyerName: order.buyerName || check.email || "Pembeli",
      rating: parsed.data.rating,
      title: parsed.data.title,
      body: parsed.data.body,
      orderId: order.id,
    });

    if (!result.ok) {
      if (result.reason === "duplicate") {
        return NextResponse.json(
          { error: "Anda sudah mengulas produk ini.", code: "duplicate" },
          { status: 409 },
        );
      }
      if (result.reason === "invalid_rating") {
        return NextResponse.json({ error: "Rating tidak valid." }, { status: 400 });
      }
      return NextResponse.json(
        { error: "Layanan ulasan belum tersedia." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      review: toPublicReview(result.review),
      message: "Terima kasih! Ulasan Anda menunggu moderasi.",
    });
  } catch (err) {
    console.error("[api/products/reviews] POST gagal:", err);
    return NextResponse.json({ error: "Gagal mengirim ulasan." }, { status: 500 });
  }
}
