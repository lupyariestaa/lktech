import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { normalizeCoupon } from "@/lib/coupons";
import type { CouponType } from "@/lib/coupon-types";

/**
 * Data kupon PUBLIK untuk halaman `/promo` (`KP-P1`).
 *
 * Hanya mengekspos field tampilan yang aman (tanpa `usedBy`, `createdBy`,
 * `usageCount` mentah) & hanya kupon yang sedang aktif pada rentang tanggal.
 */

export type PublicPromo = {
  code: string;
  description?: string;
  type: CouponType;
  value: number;
  minSpend: number;
  maxDiscount?: number;
  startsAt?: string;
  endsAt?: string;
  /** Kuota tersisa (bila dibatasi); undefined = tak terbatas. */
  remaining?: number;
};

/** Daftar promo yang sedang berlaku (aktif & dalam rentang tanggal). */
export async function listPublicPromos(): Promise<PublicPromo[]> {
  const db = getAdminDb();
  if (!db) return [];

  try {
    const snap = await db.collection("coupons").get();
    const now = Date.now();

    return snap.docs
      .map((doc) => normalizeCoupon(doc.id, doc.data() as Record<string, unknown>))
      .filter((c) => {
        if (c.archived || !c.active) return false;
        if (c.startsAt) {
          const s = new Date(c.startsAt).getTime();
          if (!Number.isNaN(s) && now < s) return false;
        }
        if (c.endsAt) {
          const e = new Date(c.endsAt).getTime();
          if (!Number.isNaN(e) && now > e) return false;
        }
        if (c.usageLimit && c.usageCount >= c.usageLimit) return false;
        return true;
      })
      .map((c) => ({
        code: c.code,
        description: c.description,
        type: c.type,
        value: c.value,
        minSpend: c.minSpend,
        maxDiscount: c.maxDiscount,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        remaining:
          c.usageLimit !== undefined
            ? Math.max(0, c.usageLimit - c.usageCount)
            : undefined,
      }))
      .sort((a, b) => (b.minSpend ?? 0) - (a.minSpend ?? 0));
  } catch (err) {
    console.error("[promos] gagal memuat promo publik:", err);
    return [];
  }
}
