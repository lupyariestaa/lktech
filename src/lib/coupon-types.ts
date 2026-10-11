export const COUPON_TYPES = ["percent", "amount", "tiered"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const COUPON_TYPE_LABEL: Record<CouponType, string> = {
  percent: "Persen (%)",
  amount: "Nominal (Rp)",
  tiered: "Bertingkat (by subtotal)",
};

/**
 * Aturan KUPON AUDIENCE (syarat kustomer) — C1/K8.
 * - `semua` (default) — semua pelanggan.
 * - `baru` — pembeli pertama (`users/{uid}.orderCount === 0`).
 * - `lama` — pelanggan berulang (`orderCount > 0`).
 */
export const COUPON_AUDIENCES = ["semua", "baru", "lama"] as const;
export type CouponAudience = (typeof COUPON_AUDIENCES)[number];

export const COUPON_AUDIENCE_LABEL: Record<CouponAudience, string> = {
  semua: "Semua pelanggan",
  baru: "Pelanggan baru (belum pernah beli)",
  lama: "Pelanggan berulang (pernah beli)",
};

/** Batas aman penyimpanan daftar uid pemakai (agar dokumen tidak membengkak). */
export const MAX_COUPON_USED_BY = 1000;

/**
 * Satu tingkat diskon untuk kupon tipe `tiered` (C1/K1).
 * Berdasarkan subtotal: tier dengan `minSpend` TERBESAR yang ≤ subtotal dipakai.
 */
export type CouponTier = {
  /** Ambang subtotal (Rupiah) agar tier ini berlaku. */
  minSpend: number;
  /** Persen (1–100) atau nominal Rupiah (mengikuti `type`… lihat catatan). */
  value: number;
  /** Batas maksimum diskon untuk tier persen (opsional). */
  maxDiscount?: number;
  /**
   * Jenis diskon tier. Default mengikuti bentuk: bila `<=100` diperlakukan
   * persen; namun agar eksplisit, sediakan `kind`. Bila kosong → `percent`.
   */
  kind?: "percent" | "amount";
};

/** Kupon yang tersimpan di Firestore (`coupons/{id}`). */
export type Coupon = {
  id: string;
  /** Kode unik (uppercase, A-Z0-9). */
  code: string;
  description?: string;
  type: CouponType;
  /** Persen (1–100) atau nominal Rupiah. Untuk `tiered`, diabaikan (pakai `tiers`). */
  value: number;
  /** Tingkat diskon untuk tipe `tiered` (>=1, terurut `minSpend` menaik). */
  tiers?: CouponTier[];
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
  /** Masa berlaku (ISO). Kosong = tak dibatasi. */
  endsAt?: string;
  /** Kuota total pemakaian (0/undefined = tak terbatas). */
  usageLimit?: number;
  /** Batas pemakaian per user (default 1; 0 = tanpa batas). */
  limitPerUser: number;
  /**
   * KUPON SINGLE-USE (C1/K3): hanya boleh 1× total (mis. welcome/gift).
   * Ditambah `assignedEmail`/`assignedUid` bila terikat pemilik.
   */
  singleUse?: boolean;
  /** (opsional) Kode hanya valid untuk email pembeli ini (lowercase). */
  assignedEmail?: string;
  /** (opsional) Kode hanya valid untuk uid pembeli ini. */
  assignedUid?: string;
  /** Syarat kustomer (C1/K8). Default `semua`. */
  audience?: CouponAudience;
  /** Kuota HARIAN (C1/K7; >=1). Kosong = tanpa batas harian. */
  perDayLimit?: number;
  /** Grup kampanye (C1/K5) — string bebas untuk filter/agregasi. */
  campaign?: string;
  /**
   * Boleh digabung kupon lain (C1/K6). Default `false`.
   * Catatan MVP: checkout tetap satu kupon/keranjang; field disiapkan.
   */
  stackable?: boolean;
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
