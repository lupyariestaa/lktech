import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/admin-guard";
import {
  getCouponByCode,
  getUserCouponUsage,
  getCouponUsageSnapshot,
  validateCoupon,
} from "@/lib/coupons";
import { getUserProfile } from "@/lib/user-profile";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { isPlausibleCouponCode, maskCouponCode } from "@/lib/coupon-pure";
import { logEvent } from "@/lib/observability";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Batas validasi kupon per user dalam satu jendela waktu. */
const RATE_LIMIT = 40;
const RATE_WINDOW_MS = 10 * 60 * 1000;
/**
 * `KP-M4` — batas berbasis IP (anti-enumeration). Lebih ketat dari per-user agar
 * satu alamat tak bisa memindai ribuan kode meski berganti akun.
 */
const IP_RATE_LIMIT = 120;
const IP_RATE_WINDOW_MS = 10 * 60 * 1000;

const bodySchema = z.object({
  code: z.string().trim().min(1).max(40),
  /** Subtotal keranjang (dipakai untuk validasi min belanja & hitung diskon). */
  subtotal: z.number().finite().min(0).max(1_000_000_000),
  /** Slug produk di keranjang (validasi kupon bundel, FASE P3). Opsional. */
  slugs: z.array(z.string().trim().max(200)).max(50).optional(),
  /** Total jumlah item (qty) di keranjang (validasi `minItems`). Opsional. */
  itemCount: z.number().int().min(0).max(100000).optional(),
  /**
   * Rincian item keranjang (slug + subtotal) — `KP-P2`. Bila ada & kupon dibatasi
   * `appliesToSlugs`, diskon dihitung atas item yang memenuhi syarat saja.
   */
  items: z
    .array(
      z.object({
        slug: z.string().trim().max(200),
        subtotal: z.number().finite().min(0).max(1_000_000_000),
      }),
    )
    .max(100)
    .optional(),
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

  const rl = await checkRateLimit(`coupon:${check.uid}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  // `KP-M4` — batas berbasis IP (anti-enumeration lintas akun).
  const ip = clientIp(req);
  const ipRl = await checkRateLimit(`coupon-ip:${ip}`, IP_RATE_LIMIT, IP_RATE_WINDOW_MS);
  if (!ipRl.ok) {
    logEvent("coupon_enumeration_blocked", { ip, scope: "ip" });
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(ipRl.retryAfter) } },
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

  // `KP-M4` — tolak cepat kode yang jelas tidak berbentuk kode wajar (spasi,
  // simbol, terlalu pendek/panjang) tanpa menyentuh DB. Mencegah enumeration
  // membanjiri lookup. Pesan tetap generik (tidak memberi petunjuk).
  if (!isPlausibleCouponCode(parsed.data.code)) {
    logEvent("coupon_validate_reject", {
      ip,
      reason: "implausible",
      code: maskCouponCode(parsed.data.code),
    });
    return NextResponse.json({ valid: false, reason: "Kode promo tidak ditemukan." });
  }

  try {
    const coupon = await getCouponByCode(parsed.data.code);
    if (!coupon) {
      // Catat percobaan kode tak dikenal (pola enumeration) tanpa membocorkan kode.
      logEvent("coupon_validate_reject", {
        ip,
        reason: "not_found",
        code: maskCouponCode(parsed.data.code),
      });
    }
    // Audit K3: sertakan pemakaian user ini agar aturan `limitPerUser` akurat
    // (fallback `usedBy` terbatas `MAX_COUPON_USED_BY`).
    const userUsageCount = coupon
      ? await getUserCouponUsage(coupon.id, check.uid)
      : 0;
    // C2: konteks lanjutan (audience/single-use/kuota harian/assigned).
    const usageSnapshot = coupon
      ? await getCouponUsageSnapshot(coupon)
      : { dayUsageCount: 0, singleUseConsumed: false };
    const profile = await getUserProfile(check.uid).catch(() => null);
    const result = validateCoupon(coupon, {
      subtotal: parsed.data.subtotal,
      uid: check.uid,
      buyerEmail: check.email,
      isFirstPurchase: (profile?.orderCount ?? 0) === 0,
      userUsageCount,
      dayUsageCount: usageSnapshot.dayUsageCount,
      singleUseConsumed: usageSnapshot.singleUseConsumed,
      slugs: parsed.data.slugs,
      itemCount: parsed.data.itemCount,
      items: parsed.data.items,
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
