/**
 * Aturan KUPON BUNDEL murni (FASE P3) — bebas impor runtime agar dapat diuji
 * Node (`--experimental-strip-types`) tanpa resolver alias / `server-only`.
 *
 * Dipakai `@/lib/coupons` (server) di dalam `validateCoupon`.
 */

/** Subset kupon yang relevan untuk aturan bundel. */
export type BundleCouponRule = {
  appliesToSlugs?: string[];
  minItems?: number;
};

export type BundleCheck =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Verifikasi aturan bundel terhadap isi keranjang.
 * - `appliesToSlugs` (bila ada): keranjang WAJIB memuat ≥1 slug dari daftar.
 * - `minItems` (bila > 0): total jumlah item (qty) minimal.
 *
 * Selalu `ok: true` bila kedua aturan kosong (kupon umum).
 */
export function checkBundleRules(
  coupon: BundleCouponRule,
  cart: { slugs?: readonly string[]; itemCount?: number },
): BundleCheck {
  if (coupon.appliesToSlugs && coupon.appliesToSlugs.length > 0) {
    const cartSlugs = cart.slugs ?? [];
    const matches = cartSlugs.some((s) => coupon.appliesToSlugs!.includes(s));
    if (!matches) {
      return {
        ok: false,
        reason:
          "Kode ini hanya berlaku bila keranjang memuat produk tertentu (kupon bundel).",
      };
    }
  }

  if (coupon.minItems && coupon.minItems > 0) {
    const count = cart.itemCount ?? 0;
    if (count < coupon.minItems) {
      return {
        ok: false,
        reason: `Kode ini berlaku untuk minimal ${coupon.minItems} item di keranjang.`,
      };
    }
  }

  return { ok: true };
}
