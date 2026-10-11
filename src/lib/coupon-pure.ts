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

/* -------------------------------------------------------------------------- */
/* Validasi FORM kupon (admin) — murni & teruji (audit K4)                    */
/* -------------------------------------------------------------------------- */

/** Bentuk input form kupon (subset yang divalidasi). */
export type CouponFormValues = {
  code: string;
  type: CouponTypeName;
  value: number;
  minSpend: number;
  maxDiscount?: number;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;
  limitPerUser?: number;
};

export type CouponFormErrors = Partial<
  Record<
    | "code"
    | "value"
    | "minSpend"
    | "maxDiscount"
    | "startsAt"
    | "endsAt"
    | "usageLimit"
    | "limitPerUser",
    string
  >
>;

export type CouponFormValidation =
  | { ok: true }
  | { ok: false; errors: CouponFormErrors };

/** Apakah nilai numerik valid (finite). */
function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Validasi input form kupon (admin) — MURNI. Mengembalikan peta error per field.
 * Semua aturan dicerminkan dari schema server agar pesan bisa tampil sebelum
 * round-trip (server tetap memvalidasi ulang sebagai sumber kebenaran).
 */
export function validateCouponForm(v: CouponFormValues): CouponFormValidation {
  const errors: CouponFormErrors = {};

  const code = v.code.trim();
  if (code.length < 3) {
    errors.code = "Kode kupon minimal 3 karakter.";
  } else if (!/^[A-Za-z0-9]+$/.test(code)) {
    errors.code = "Kode kupon hanya boleh huruf & angka (tanpa spasi/simbol).";
  }

  if (!isFiniteNumber(v.value)) {
    errors.value = "Nilai diskon wajib diisi.";
  } else if (v.type === "percent") {
    if (v.value < 1 || v.value > 100) {
      errors.value = "Diskon persen harus antara 1–100.";
    }
  } else if (v.value <= 0) {
    errors.value = "Diskon nominal harus lebih dari 0.";
  }

  if (!isFiniteNumber(v.minSpend) || v.minSpend < 0) {
    errors.minSpend = "Minimal belanja tidak boleh negatif.";
  }

  if (v.maxDiscount !== undefined && v.maxDiscount !== null) {
    if (!isFiniteNumber(v.maxDiscount) || v.maxDiscount < 0) {
      errors.maxDiscount = "Maksimal diskon tidak boleh negatif.";
    }
  }

  if (v.usageLimit !== undefined && v.usageLimit !== null) {
    if (!isFiniteNumber(v.usageLimit) || v.usageLimit < 1) {
      errors.usageLimit = "Kuota minimal 1 (kosongkan untuk tanpa batas).";
    }
  }

  if (v.limitPerUser !== undefined && v.limitPerUser !== null) {
    if (!isFiniteNumber(v.limitPerUser) || v.limitPerUser < 0) {
      errors.limitPerUser = "Batas per user tidak boleh negatif (0 = tanpa batas).";
    }
  }

  // Rentang tanggal: mulai harus sebelum berakhir.
  if (v.startsAt && v.endsAt) {
    const s = new Date(v.startsAt).getTime();
    const e = new Date(v.endsAt).getTime();
    if (!Number.isNaN(s) && !Number.isNaN(e) && s >= e) {
      errors.endsAt = "Waktu berakhir harus setelah waktu mulai.";
    }
  }

  return Object.keys(errors).length === 0 ? { ok: true } : { ok: false, errors };
}
