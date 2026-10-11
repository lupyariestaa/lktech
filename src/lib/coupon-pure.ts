/**
 * Logika KUPON murni (tanpa I/O & `server-only`) — dapat diuji Node langsung
 * (`--experimental-strip-types`) tanpa resolver alias.
 *
 * Sumber kebenaran untuk perhitungan diskon & validasi kupon. Dipakai ulang oleh
 * `@/lib/coupons` (server) & test. Menghindari regresi diskon/aturan yang bisa
 * lolos bila logika terkurung di modul server-only (audit K5).
 *
 * File ini SENGAJA mandiri (tak mengimpor modul lain) agar aman dijalankan Node
 * tanpa alias resolver — pola sama seperti `orders-filter-pure.ts`.
 */

export type CouponTypeName = "percent" | "amount";

/**
 * Subset kupon yang dibutuhkan validasi. Generic `T` memastikan objek yang
 * dikembalikan tetap bertipe asli pemanggil (mis. `Coupon` dengan `id`/`code`).
 */
export type ValidatableCoupon = {
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  minSpend: number;
  appliesToSlugs?: string[];
  minItems?: number;
  usageLimit?: number;
  usageCount: number;
  limitPerUser: number;
  usedBy: readonly string[];
  type: CouponTypeName;
  value: number;
  maxDiscount?: number;
};

/** Konteks validasi kupon. */
export type CouponValidationContext = {
  subtotal: number;
  uid?: string;
  now?: Date;
  /** Jumlah pemakaian user ini (sumber `redemptions`). Bila tak ada, pakai `usedBy`. */
  userUsageCount?: number;
  slugs?: readonly string[];
  itemCount?: number;
};

export type CouponValidation<T = ValidatableCoupon> =
  | { ok: true; coupon: T; discount: number }
  | { ok: false; reason: string };

/** Format Rupiah ringkas (hindari impor helper klien di modul murni). */
function rupiah(n: number): string {
  return `Rp${n.toLocaleString("id-ID")}`;
}

/**
 * Aturan KUPON BUNDEL (FASE P3) — murni.
 * - `appliesToSlugs` (bila ada): keranjang WAJIB memuat ≥1 slug dari daftar.
 * - `minItems` (bila > 0): total jumlah item (qty) minimal.
 *
 * Selalu `ok: true` bila kedua aturan kosong (kupon umum).
 */
export function checkBundleRules(
  coupon: Pick<ValidatableCoupon, "appliesToSlugs" | "minItems">,
  cart: { slugs?: readonly string[]; itemCount?: number },
): { ok: true } | { ok: false; reason: string } {
  if (coupon.appliesToSlugs && coupon.appliesToSlugs.length > 0) {
    const cartSlugs = cart.slugs ?? [];
    if (!cartSlugs.some((s) => coupon.appliesToSlugs!.includes(s))) {
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

/**
 * Hitung jumlah diskon (Rupiah) untuk sebuah kupon & subtotal.
 * Selalu dibatasi ≤ subtotal (diskon tak boleh melebihi belanja) dan ≥ 0.
 */
export function computeDiscount(
  coupon: Pick<ValidatableCoupon, "type" | "value" | "maxDiscount">,
  subtotal: number,
): number {
  if (subtotal <= 0) return 0;

  let discount = 0;
  if (coupon.type === "percent") {
    discount = (subtotal * coupon.value) / 100;
    if (typeof coupon.maxDiscount === "number" && coupon.maxDiscount > 0) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    discount = coupon.value;
  }

  discount = Math.floor(Math.max(0, discount));
  return Math.min(discount, subtotal);
}

/**
 * Validasi kupon terhadap subtotal & konteks user. Mengembalikan alasan bila
 * gagal. Semua aturan dijalankan di SERVER (klien hanya mengirim kode).
 *
 * `userUsageCount` (opsional) = jumlah pemakaian user ini dari subkoleksi
 * `redemptions` (sumber kebenaran `limitPerUser`; lebih akurat dari `usedBy`
 * yang dibatasi `MAX_COUPON_USED_BY`). Bila tak diberikan, fallback ke `usedBy`.
 *
 * `slugs` & `itemCount` (opsional) dipakai untuk aturan KUPON BUNDEL (FASE P3).
 */
export function validateCoupon<T extends ValidatableCoupon>(
  coupon: T | null,
  opts: CouponValidationContext,
): CouponValidation<T> {
  const now = opts.now ?? new Date();

  if (!coupon) {
    return { ok: false, reason: "Kode promo tidak ditemukan." };
  }
  if (!coupon.active) {
    return { ok: false, reason: "Kode promo sudah tidak aktif." };
  }

  if (coupon.startsAt) {
    const start = new Date(coupon.startsAt).getTime();
    if (!Number.isNaN(start) && now.getTime() < start) {
      return { ok: false, reason: "Kode promo belum berlaku." };
    }
  }
  if (coupon.endsAt) {
    const end = new Date(coupon.endsAt).getTime();
    if (!Number.isNaN(end) && now.getTime() > end) {
      return { ok: false, reason: "Kode promo sudah kedaluwarsa." };
    }
  }

  if (coupon.minSpend > 0 && opts.subtotal < coupon.minSpend) {
    return {
      ok: false,
      reason: `Minimal belanja ${rupiah(coupon.minSpend)} untuk memakai kode ini.`,
    };
  }

  const bundle = checkBundleRules(coupon, {
    slugs: opts.slugs,
    itemCount: opts.itemCount,
  });
  if (!bundle.ok) return { ok: false, reason: bundle.reason };

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return { ok: false, reason: "Kuota kode promo sudah habis." };
  }

  if (opts.uid && coupon.limitPerUser > 0) {
    const usedCount =
      typeof opts.userUsageCount === "number"
        ? opts.userUsageCount
        : coupon.usedBy.filter((u) => u === opts.uid).length;
    if (usedCount >= coupon.limitPerUser) {
      return {
        ok: false,
        reason:
          coupon.limitPerUser === 1
            ? "Anda sudah pernah memakai kode promo ini."
            : `Kode promo ini maksimal ${coupon.limitPerUser}× per pengguna.`,
      };
    }
  }

  const discount = computeDiscount(coupon, opts.subtotal);
  if (discount <= 0) {
    return { ok: false, reason: "Kode promo tidak memberi diskon untuk pesanan ini." };
  }

  return { ok: true, coupon, discount };
}
