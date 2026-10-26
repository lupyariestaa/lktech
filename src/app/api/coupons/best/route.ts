import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/admin-guard";
import {
  listCandidateCoupons,
  getUserCouponUsage,
  getCouponUsageSnapshot,
  pickBestCoupon,
} from "@/lib/coupons";
import { getUserProfile } from "@/lib/user-profile";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Batas permintaan saran kode terbaik per user dalam satu jendela waktu. */
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const bodySchema = z.object({
  subtotal: z.number().finite().min(0).max(1_000_000_000),
  slugs: z.array(z.string().trim().max(200)).max(50).optional(),
  itemCount: z.number().int().min(0).max(100000).optional(),
  /** Rincian item keranjang (slug + subtotal) — `KP-P2` (diskon eligible). */
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
 * POST /api/coupons/best — saran KODE TERBAIK untuk isi keranjang (C3/K2).
 *
 * Server-authoritative & opt-in: mengembalikan kode dengan diskon terbesar yang
 * VALID untuk keranjang & pembeli, atau `{ best: null }` bila tak ada. Tidak
 * membocorkan detail sensitif (hanya kode, diskon, deskripsi).
 */
export async function POST(req: Request) {
  const check = await requireActiveUser(req);
  if (!check.ok) return check.response;

  const rl = await checkRateLimit(`coupon-best:${check.uid}`, RATE_LIMIT, RATE_WINDOW_MS);
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  try {
    const now = new Date();
    const [candidates, profile] = await Promise.all([
      listCandidateCoupons(now),
      getUserProfile(check.uid).catch(() => null),
    ]);
    const isFirstPurchase = (profile?.orderCount ?? 0) === 0;

    // Konteks per-kupon: pemakaian user, snapshot harian/single-use.
    const usageByCoupon = new Map<string, number>();
    const snapshotByCoupon = new Map<
      string,
      { dayUsageCount: number; singleUseConsumed: boolean }
    >();
    await Promise.all(
      candidates.map(async (c) => {
        usageByCoupon.set(c.id, await getUserCouponUsage(c.id, check.uid));
        snapshotByCoupon.set(c.id, await getCouponUsageSnapshot(c, now));
      }),
    );

    // `pickBestCoupon` validasi murni; konteks bisa berbeda per kupon, jadi
    // kita panggil `validateCoupon` per kandidat via loop manual memakai
    // konteks masing-masing (pickBestCoupon memakai konteks tunggal).
    let best: { coupon: (typeof candidates)[number]; discount: number } | null = null;
    for (const c of candidates) {
      const snap = snapshotByCoupon.get(c.id) ?? {
        dayUsageCount: 0,
        singleUseConsumed: false,
      };
      const picked = pickBestCoupon([c], {
        subtotal: parsed.data.subtotal,
        uid: check.uid,
        buyerEmail: check.email,
        isFirstPurchase,
        now,
        userUsageCount: usageByCoupon.get(c.id) ?? 0,
        dayUsageCount: snap.dayUsageCount,
        singleUseConsumed: snap.singleUseConsumed,
        slugs: parsed.data.slugs,
        itemCount: parsed.data.itemCount,
        items: parsed.data.items,
      });
      if (picked && (!best || picked.discount > best.discount)) {
        best = picked;
      }
    }

    if (!best) {
      return NextResponse.json({ best: null });
    }
    return NextResponse.json({
      best: {
        code: best.coupon.code,
        discount: best.discount,
        type: best.coupon.type,
        description: best.coupon.description ?? null,
      },
    });
  } catch (err) {
    console.error("[api/coupons/best] gagal:", err);
    return NextResponse.json({ error: "Gagal mencari kode terbaik." }, { status: 500 });
  }
}
