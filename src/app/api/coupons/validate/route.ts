import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/admin-guard";
import { getCouponByCode, validateCoupon } from "@/lib/coupons";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Batas validasi kupon per user dalam satu jendela waktu. */
const RATE_LIMIT = 40;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const bodySchema = z.object({
  code: z.string().trim().min(1).max(40),
  /** Subtotal keranjang (dipakai untuk validasi min belanja & hitung diskon). */
  subtotal: z.number().finite().min(0).max(1_000_000_000),
});

/**
 * POST /api/coupons/validate — validasi kode kupon untuk keranjang.
 *
 * Diskon DIHITUNG SERVER (klien hanya mengirim kode + subtotal yang tampil).
 * Nilai final tetap dihitung ulang saat checkout — endpoint ini hanya untuk
 * memberi umpan balik ke pembeli.
 */
export async function POST(req: Request) {
  const check = await requireActiveUser(req);
  if (!check.ok) return check.response;

  const rl = rateLimit(`coupon:${check.uid}`, RATE_LIMIT, RATE_WINDOW_MS);
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  try {
    const coupon = await getCouponByCode(parsed.data.code);
    const result = validateCoupon(coupon, {
      subtotal: parsed.data.subtotal,
      uid: check.uid,
    });

    if (!result.ok) {
      return NextResponse.json({ valid: false, reason: result.reason });
    }

    return NextResponse.json({
      valid: true,
      code: result.coupon.code,
      type: result.coupon.type,
      discount: result.discount,
      description: result.coupon.description ?? null,
    });
  } catch (err) {
    console.error("[api/coupons/validate] gagal:", err);
    return NextResponse.json(
      { error: "Gagal memvalidasi kode promo." },
      { status: 500 },
    );
  }
}
