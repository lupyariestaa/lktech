export const COUPON_TYPES = ["percent", "amount"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const COUPON_TYPE_LABEL: Record<CouponType, string> = {
  percent: "Persen (%)",
  amount: "Nominal (Rp)",
};

/** Batas aman penyimpanan daftar uid pemakai (agar dokumen tidak membengkak). */
export const MAX_COUPON_USED_BY = 1000;

/** Kupon yang tersimpan di Firestore (`coupons/{id}`). */
export type Coupon = {
  id: string;
  /** Kode unik (uppercase, A-Z0-9). */
  code: string;
  description?: string;
  type: CouponType;
  /** Persen (1–100) atau nominal Rupiah. */
  value: number;
  /** Minimal subtotal agar kupon berlaku (0 = tanpa syarat). */
  minSpend: number;
  /**
   * KUPON BUNDEL (FASE P3): kode hanya berlaku bila KERANJANG memuat minimal
   * satu produk dari daftar slug ini. Kosong/undefined = berlaku untuk semua.
   */
  appliesToSlugs?: string[];
  /**
   * KUPON BUNDEL (FASE P3): minimal JUMLAH ITEM (total qty) di keranjang agar
   * kode berlaku. 0/undefined = tanpa syarat jumlah.
   */
  minItems?: number;
  /** Batas maksimum diskon untuk tipe persen (opsional). */
  maxDiscount?: number;
  /** Masa berlaku (ISO). Kosong = tak dibatasi. */
  startsAt?: string;
  endsAt?: string;
  /** Kuota total pemakaian (0/undefined = tak terbatas). */
  usageLimit?: number;
  /** Batas pemakaian per user (default 1). */
  limitPerUser: number;
  /** Aktif/nonaktif (bisa dimatikan tanpa dihapus). */
  active: boolean;
  /** Soft-delete: kupon diarsipkan (disembunyikan & tak bisa dipakai). */
  archived?: boolean;
  /** Jumlah pemakaian (denormalisasi). */
  usageCount: number;
  /** Daftar uid pemakai (dibatasi `MAX_COUPON_USED_BY`). */
  usedBy: string[];
  createdAtISO: string;
  updatedAtISO?: string;
  createdBy?: string;
};

/** Kupon yang TERCATAT pada sebuah order (snapshot saat checkout). */
export type OrderCoupon = {
  code: string;
  type: CouponType;
  /** Jumlah diskon (Rupiah) yang diterapkan. */
  discount: number;
  /** ID dokumen kupon (`coupons/{id}`) — untuk restore kuota & audit. */
  couponId?: string;
};

/** Ringkasan statistik kupon untuk kartu/badge dashboard. */
export type CouponsSummary = {
  total: number;
  active: number;
  totalUsage: number;
};
