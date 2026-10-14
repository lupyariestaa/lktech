import "server-only";
import { unstable_cache } from "next/cache";
import { getAdminDb } from "@/lib/firebase-admin";
import { normalizeCoupon } from "@/lib/coupons";
import type { CouponType } from "@/lib/coupon-types";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  computePromoStatus,
  promoRequirement,
  tierSummary,
  type PublicPromoStatus,
} from "@/lib/promo-pure";

/**
 * Data kupon PUBLIK untuk halaman `/promo` (`KP-P1` / upgrade C7).
 *
 * Hanya mengekspos field tampilan yang aman (tanpa `usedBy`, `createdBy`,
 * `usageCount` mentah). Menyertakan kupon aktif, akan datang, & berakhir segera.
 */

export type { PublicPromoStatus } from "@/lib/promo-pure";

export type PublicPromo = {
  code: string;
  description?: string;
  type: CouponType;
  value: number;
  /** Untuk `tiered`: ringkasan tingkat (mis. "≥50rb: 5% · ≥200rb: 10%"). */
  tierSummary?: string;
  minSpend: number;
  maxDiscount?: number;
  startsAt?: string;
  endsAt?: string;
  /** Kuota tersisa (bila dibatasi); undefined = tak terbatas. */
  remaining?: number;
  /** Ringkasan syarat (bundel/min belanja) untuk ditampilkan. */
  requirement?: string;
  /** Status terhadap waktu sekarang (dihitung server). */
  status: PublicPromoStatus;
};

/** Ambang "akan datang" yang masih ditampilkan (ms) — 30 hari. */
const UPCOMING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Daftar kupon PUBLIK untuk halaman `/promo` (C7).
 */
async function readPublicPromos(): Promise<PublicPromo[]> {
  const db = getAdminDb();
  if (!db) return [];

  try {
    const snap = await db.collection("coupons").get();
    const now = Date.now();
    const soonMs = now + UPCOMING_WINDOW_MS;

    return snap.docs
      .map((doc) => normalizeCoupon(doc.id, doc.data() as Record<string, unknown>))
      .filter((c) => {
        if (c.archived || !c.active) return false;
        // Kupon yang sudah lewat → sembunyikan.
        if (c.endsAt) {
          const e = new Date(c.endsAt).getTime();
          if (!Number.isNaN(e) && now > e) return false;
        }
        // Akan datang > 30 hari → sembunyikan (terlalu jauh).
        if (c.startsAt) {
          const s = new Date(c.startsAt).getTime();
          if (!Number.isNaN(s) && s > soonMs) return false;
        }
        return true;
      })
      .map((c) => ({
        code: c.code,
        description: c.description,
        type: c.type,
        value: c.value,
        tierSummary: c.type === "tiered" ? tierSummary(c.tiers) : undefined,
        minSpend: c.minSpend,
        maxDiscount: c.maxDiscount,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        remaining:
          c.usageLimit !== undefined
            ? Math.max(0, c.usageLimit - c.usageCount)
            : undefined,
        requirement: promoRequirement(c),
        status: computePromoStatus(c.startsAt, c.endsAt, now),
      }))
      .sort((a, b) => (b.minSpend ?? 0) - (a.minSpend ?? 0));
  } catch (err) {
    console.error("[promos] gagal memuat promo publik:", err);
    return [];
  }
}

/**
 * Daftar kupon PUBLIK untuk halaman `/promo` (C7) — ber-CACHE.
 * Invalidasi via `revalidateTag(CACHE_TAGS.promos)` saat admin mengubah kupon.
 */
export const listPublicPromos = unstable_cache(
  readPublicPromos,
  ["public-promos"],
  { tags: [CACHE_TAGS.promos], revalidate: 120 },
);
