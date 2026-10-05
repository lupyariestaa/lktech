import { getIdToken } from "@/lib/auth";
import type { CouponType } from "@/lib/coupon-types";

export type CouponValidationResult =
  | { valid: true; code: string; type: CouponType; discount: number; description: string | null }
  | { valid: false; reason: string };

/**
 * Validasi kode kupon di server untuk subtotal tertentu.
 * Mengembalikan hasil validasi (diskon dihitung server). Melempar bila gagal
 * jaringan/sesi; mengembalikan `{ valid: false, reason }` bila kode tak sah.
 *
 * `context` (opsional, FASE P3) membawa isi keranjang agar kupon BUNDEL
 * (`appliesToSlugs`/`minItems`) ikut divalidasi dengan benar.
 */
export async function validateCouponRequest(
  code: string,
  subtotal: number,
  context?: { slugs?: string[]; itemCount?: number },
): Promise<CouponValidationResult> {
  const token = await getIdToken();
  if (!token) throw new Error("Masuk untuk memakai kode promo.");

  const res = await fetch("/api/coupons/validate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      code,
      subtotal,
      slugs: context?.slugs,
      itemCount: context?.itemCount,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? "Gagal memvalidasi kode promo.");
  }
  return data as CouponValidationResult;
}
