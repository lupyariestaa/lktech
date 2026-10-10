import { NextResponse } from "next/server";
import { requireActiveUser, requireUser } from "@/lib/admin-guard";
import { checkoutSchema } from "@/lib/order-schema";
import { getOrdersByUser } from "@/lib/orders";
import { performCheckout } from "@/lib/checkout";
import { makeToken, downloadUrl } from "@/lib/downloads";
import { SITE_URL } from "@/lib/site";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Batas pembuatan order per user dalam satu jendela waktu. */
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 menit

/**
 * POST /api/orders — membuat pesanan (checkout).
 *
 * Handler tipis: auth + rate-limit + validasi skema, lalu delegasikan alur
 * bisnis ke `performCheckout` (`@/lib/checkout`). Keamanan & kebenaran data:
 * - Wajib login (uid/email dari token, bukan body).
 * - Harga/nama/total DIHITUNG ULANG server dari Firestore.
 * - Produk tidak ada / nonaktif / stok habis ditolak dengan pesan jelas.
 */
export async function POST(req: Request) {
  const check = await requireActiveUser(req);
  if (!check.ok) return check.response;

  const rl = rateLimit(`order:${check.uid}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan checkout. Coba lagi beberapa saat." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data keranjang tidak valid." },
      { status: 400 },
    );
  }

  try {
    const outcome = await performCheckout(parsed.data, {
      uid: check.uid,
      email: check.email,
    });

    if (!outcome.ok) {
      return NextResponse.json(outcome.body, { status: outcome.status });
    }

    return NextResponse.json({
      ok: true,
      order: outcome.order,
      payUrl: outcome.payUrl,
      warning: outcome.warning,
      mayarMode: outcome.mayarMode,
    });
  } catch (err) {
    console.error("[api/orders] gagal membuat order:", err);
    return NextResponse.json(
      { error: "Gagal membuat pesanan. Silakan coba lagi." },
      { status: 500 },
    );
  }
}

/** GET /api/orders — daftar pesanan milik user yang sedang login. */
export async function GET(req: Request) {
  const check = await requireUser(req);
  if (!check.ok) return check.response;

  try {
    const orders = await getOrdersByUser(check.uid);
    // Lampirkan link unduhan (bila ada token) — dihitung server, bukan dikirim klien.
    const enriched = orders.map((o) => ({
      ...o,
      downloadUrl: o.downloadTokenId
        ? downloadUrl(SITE_URL, makeToken(o.downloadTokenId))
        : undefined,
    }));
    return NextResponse.json({ orders: enriched });
  } catch (err) {
    console.error("[api/orders] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal memuat pesanan." },
      { status: 500 },
    );
  }
}
