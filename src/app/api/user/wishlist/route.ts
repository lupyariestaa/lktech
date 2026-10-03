import { NextResponse } from "next/server";
import { requireUser } from "@/lib/admin-guard";
import {
  addToWishlist,
  getUserProfile,
  removeFromWishlist,
} from "@/lib/user-profile";
import { getProductsBySlugs } from "@/lib/products";
import { wishlistSlugSchema } from "@/lib/api-schemas";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Batas mutasi wishlist per user dalam satu jendela waktu. */
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 10 * 60 * 1000;

/** GET /api/user/wishlist — daftar slug produk favorit + data produk terhidrasi. */
export async function GET(req: Request) {
  const check = await requireUser(req);
  if (!check.ok) return check.response;

  try {
    const profile = await getUserProfile(check.uid);
    const wishlist = profile?.wishlist ?? [];
    // Hidrasi produk (untuk ditampilkan), pertahankan urutan wishlist.
    const map = await getProductsBySlugs(wishlist);
    const products = wishlist
      .map((slug) => map.get(slug))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    return NextResponse.json({ wishlist, products });
  } catch (err) {
    console.error("[api/user/wishlist] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal memuat wishlist." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/user/wishlist — tambah produk ke favorit.
 * Body: { slug }. Slug divalidasi ke produk yang ada & (sebaiknya) aktif.
 */
export async function POST(req: Request) {
  const check = await requireUser(req);
  if (!check.ok) return check.response;

  const rl = rateLimit(`wishlist:${check.uid}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = wishlistSlugSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Slug produk tidak valid." },
      { status: 400 },
    );
  }

  try {
    // Validasi produk benar-benar ada (cegah slug palsu/usang).
    const products = await getProductsBySlugs([parsed.data.slug]);
    if (!products.has(parsed.data.slug)) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan." },
        { status: 404 },
      );
    }
    const wishlist = await addToWishlist(check.uid, parsed.data.slug);
    if (wishlist === null) {
      return NextResponse.json(
        { error: "Profil tidak ditemukan." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, wishlist });
  } catch (err) {
    console.error("[api/user/wishlist] POST gagal:", err);
    return NextResponse.json(
      { error: "Gagal menambahkan ke favorit." },
      { status: 500 },
    );
  }
}

/** DELETE /api/user/wishlist?slug= — hapus produk dari favorit. */
export async function DELETE(req: Request) {
  const check = await requireUser(req);
  if (!check.ok) return check.response;

  const slug = new URL(req.url).searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "slug wajib diisi." }, { status: 400 });
  }

  try {
    const wishlist = await removeFromWishlist(check.uid, slug);
    if (wishlist === null) {
      return NextResponse.json(
        { error: "Profil tidak ditemukan." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, wishlist });
  } catch (err) {
    console.error("[api/user/wishlist] DELETE gagal:", err);
    return NextResponse.json(
      { error: "Gagal menghapus dari favorit." },
      { status: 500 },
    );
  }
}
