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

export type CouponTypeName = "percent" | "amount" | "tiered";

/** Tingkat diskon untuk kupon `tiered`. */
export type CouponTier = {
  minSpend: number;
  value: number;
  maxDiscount?: number;
  kind?: "percent" | "amount";
};

export type CouponAudienceName = "semua" | "baru" | "lama";

/**
 * Item keranjang minimal untuk aturan BUNDEL (`KP-P2`). Dipakai menghitung
 * `eligibleSubtotal` — bagian subtotal yang benar-benar memenuhi syarat kupon.
 * `subtotal` diutamakan; bila kosong, dihitung dari `price × qty`.
 */
export type CouponCartItem = {
  slug: string;
  /** Subtotal baris (harga × qty), Rupiah. */
  subtotal?: number;
  /** Harga satuan (fallback bila `subtotal` tak ada). */
  price?: number;
  /** Qty (fallback bila `subtotal` tak ada). */
  qty?: number;
};

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
  // ---- Field lanjutan (C1; semua opsional → backward-compatible) ----
  tiers?: CouponTier[];
  singleUse?: boolean;
  assignedEmail?: string;
  assignedUid?: string;
  audience?: CouponAudienceName;
  perDayLimit?: number;
  campaign?: string;
  stackable?: boolean;
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
  /**
   * Item keranjang (slug + subtotal) — `KP-P2`. Bila diberikan & kupon dibatasi
   * `appliesToSlugs`, diskon dihitung atas `eligibleSubtotal` (hanya item yang
   * memenuhi syarat), bukan seluruh subtotal keranjang.
   */
  items?: readonly CouponCartItem[];
  // ---- Konteks lanjutan (C1) ----
  /** Email pembeli (lowercase) — untuk cek `assignedEmail`. */
  buyerEmail?: string;
  /** `true` bila pembeli belum pernah beli (`orderCount === 0`). */
  isFirstPurchase?: boolean;
  /** Pemakaian kupon ini HARI INI (zona Asia/Jakarta) — untuk `perDayLimit`. */
  dayUsageCount?: number;
  /** `true` bila kupon single-use SUDAH pernah sukses pada order aktif. */
  singleUseConsumed?: boolean;
};

export type CouponValidation<T = ValidatableCoupon> =
  | { ok: true; coupon: T; discount: number }
  | { ok: false; reason: string };

/** Format Rupiah ringkas (hindari impor helper klien di modul murni). */
function rupiah(n: number): string {
  return `Rp${n.toLocaleString("id-ID")}`;
}

/**
 * Kunci tanggal `yyyy-mm-dd` untuk zona **Asia/Jakarta** (C1/C2 — kuota harian).
 * Murni (memakai `Intl`), aman untuk test Node.
 */
export function jakartaDateKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const d = parts.find((p) => p.type === "day")?.value ?? "00";
  return `${y}-${m}-${d}`;
}

/** Batas jumlah slug produk untuk kupon bundel (selaras schema server). */
export const MAX_COUPON_SLUGS = 50;
/** Panjang maksimum satu slug produk. */
export const MAX_COUPON_SLUG_LEN = 200;

/**
 * Subtotal baris satu item keranjang (Rupiah, ≥ 0). Memakai `subtotal` bila ada,
 * jika tidak `price × qty`.
 */
function lineSubtotal(item: CouponCartItem): number {
  if (typeof item.subtotal === "number" && Number.isFinite(item.subtotal)) {
    return Math.max(0, Math.floor(item.subtotal));
  }
  const price =
    typeof item.price === "number" && Number.isFinite(item.price) ? item.price : 0;
  const qty = typeof item.qty === "number" && Number.isFinite(item.qty) ? item.qty : 0;
  return Math.max(0, Math.floor(price * qty));
}

/**
 * Subtotal yang MEMENUHI SYARAT kupon bundel (`KP-P2`).
 *
 * - Tanpa `appliesToSlugs` (atau daftar kosong) → mengembalikan `null`
 *   (artinya: kupon TIDAK dibatasi produk → pemanggil memakai subtotal penuh).
 * - Dengan daftar → jumlah subtotal baris yang `slug`-nya ada di daftar.
 *
 * Dipakai agar **diskon bundel hanya dihitung atas item yang relevan**, bukan
 * seluruh keranjang (perbaikan `P3-2`).
 */
export function computeEligibleSubtotal(
  items: readonly CouponCartItem[] | undefined,
  appliesToSlugs?: readonly string[],
): number | null {
  if (!appliesToSlugs || appliesToSlugs.length === 0) return null;
  // Tanpa rincian item, batas bundel tak bisa dihitung → pakai subtotal penuh
  // (backward-compatible untuk pemanggil yang hanya mengirim `slugs`).
  if (!items) return null;
  let sum = 0;
  for (const item of items) {
    if (appliesToSlugs.includes(item.slug)) sum += lineSubtotal(item);
  }
  return Math.max(0, sum);
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
 * Hitung diskon satu TINGKAT (persen/nominal) dengan batas `maxDiscount`.
 * Murni; mengembalikan Rupiah (belum dibatasi subtotal kecuali oleh pemanggil).
 */
function applyRate(
  kind: "percent" | "amount",
  value: number,
  subtotal: number,
  maxDiscount?: number,
): number {
  if (kind === "percent") {
    let d = (subtotal * value) / 100;
    if (typeof maxDiscount === "number" && maxDiscount > 0) {
      d = Math.min(d, maxDiscount);
    }
    return d;
  }
  return value;
}

/**
 * Pilih tier untuk kupon `tiered`: tier dengan `minSpend` TERBESAR yang ≤ subtotal.
 * Mengembalikan `null` bila tak ada tier yang memenuhi (subtotal < minSpend terkecil).
 */
export function pickTier(
  tiers: readonly CouponTier[] | undefined,
  subtotal: number,
): CouponTier | null {
  if (!tiers || tiers.length === 0) return null;
  let best: CouponTier | null = null;
  for (const t of tiers) {
    if (t.minSpend <= subtotal && (!best || t.minSpend > best.minSpend)) {
      best = t;
    }
  }
  return best;
}

/**
 * Hitung diskon untuk kupon `tiered` (Rupiah, sudah dibatasi subtotal ≥ 0).
 * `kind` tier default `percent` bila tak diisi.
 */
export function tieredDiscount(
  tiers: readonly CouponTier[] | undefined,
  subtotal: number,
): number {
  const tier = pickTier(tiers, subtotal);
  if (!tier) return 0;
  const kind = tier.kind ?? "percent";
  const raw = applyRate(kind, tier.value, subtotal, tier.maxDiscount);
  return Math.min(Math.floor(Math.max(0, raw)), subtotal);
}

/**
 * Hitung jumlah diskon (Rupiah) untuk sebuah kupon & subtotal.
 * Mendukung `percent`/`amount`/`tiered`. Selalu dibatasi ≤ subtotal & ≥ 0.
 */
export function computeDiscount(
  coupon: Pick<ValidatableCoupon, "type" | "value" | "maxDiscount" | "tiers">,
  subtotal: number,
): number {
  if (subtotal <= 0) return 0;

  if (coupon.type === "tiered") {
    return tieredDiscount(coupon.tiers, subtotal);
  }

  const raw = applyRate(
    coupon.type === "amount" ? "amount" : "percent",
    coupon.value,
    subtotal,
    coupon.maxDiscount,
  );
  return Math.min(Math.floor(Math.max(0, raw)), subtotal);
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

  // ===== Aturan AUDIENCE (C1/K8) =====
  const audience = coupon.audience ?? "semua";
  if (audience === "baru" && opts.isFirstPurchase === false) {
    return {
      ok: false,
      reason: "Kode ini khusus untuk pelanggan baru (belum pernah berbelanja).",
    };
  }
  if (audience === "lama" && opts.isFirstPurchase === true) {
    return {
      ok: false,
      reason: "Kode ini khusus untuk pelanggan yang sudah pernah berbelanja.",
    };
  }

  // ===== Aturan KEPEMILIKAN kode (C1/K3) =====
  if (coupon.assignedUid && opts.uid && coupon.assignedUid !== opts.uid) {
    return { ok: false, reason: "Kode ini tidak berlaku untuk akun Anda." };
  }
  if (
    coupon.assignedEmail &&
    opts.buyerEmail &&
    coupon.assignedEmail.trim().toLowerCase() !== opts.buyerEmail.trim().toLowerCase()
  ) {
    return { ok: false, reason: "Kode ini tidak berlaku untuk akun Anda." };
  }

  // ===== Aturan SINGLE-USE (C1/K3) =====
  if (coupon.singleUse && opts.singleUseConsumed === true) {
    return { ok: false, reason: "Kode ini hanya dapat dipakai satu kali." };
  }

  if (coupon.minSpend > 0 && opts.subtotal < coupon.minSpend) {
    return {
      ok: false,
      reason: `Minimal belanja ${rupiah(coupon.minSpend)} untuk memakai kode ini.`,
    };
  }

  const bundle = checkBundleRules(coupon, {
    slugs: opts.slugs ?? opts.items?.map((it) => it.slug),
    itemCount: opts.itemCount,
  });
  if (!bundle.ok) return { ok: false, reason: bundle.reason };

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return { ok: false, reason: "Kuota kode promo sudah habis." };
  }

  // ===== Aturan KUOTA HARIAN (C1/K7) =====
  if (
    coupon.perDayLimit &&
    coupon.perDayLimit > 0 &&
    typeof opts.dayUsageCount === "number" &&
    opts.dayUsageCount >= coupon.perDayLimit
  ) {
    return {
      ok: false,
      reason: "Kuota harian kode promo ini sudah habis. Coba lagi besok.",
    };
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

  // `KP-P2`: untuk kupon bundel, diskon dihitung atas `eligibleSubtotal`
  // (hanya item yang memenuhi `appliesToSlugs`), bukan seluruh keranjang.
  // `minSpend` tetap diukur terhadap subtotal keranjang penuh (syarat belanja).
  const discountBase = computeEligibleSubtotal(opts.items, coupon.appliesToSlugs) ?? opts.subtotal;
  const discount = computeDiscount(coupon, discountBase);
  if (discount <= 0) {
    return { ok: false, reason: "Kode promo tidak memberi diskon untuk pesanan ini." };
  }

  return { ok: true, coupon, discount };
}

/**
 * KUPON OTOMATIS (C1/K2) — pilih kupon TERBAIK (diskon terbesar) yang valid
 * untuk keranjang & pembeli. Mengembalikan `{ coupon, discount }` atau `null`.
 *
 * Murni: pemanggil menyediakan daftar kupon KANDIDAT (mis. dari halaman
 * `/promo` atau query kode aktif) + konteks. Kupon yang gagal validasi dilewati.
 */
export function pickBestCoupon<T extends ValidatableCoupon>(
  coupons: readonly T[],
  opts: CouponValidationContext,
): { coupon: T; discount: number } | null {
  let best: { coupon: T; discount: number } | null = null;
  for (const coupon of coupons) {
    const res = validateCoupon(coupon, opts);
    if (!res.ok) continue;
    if (!best || res.discount > best.discount) {
      best = { coupon: res.coupon, discount: res.discount };
    }
  }
  return best;
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
  // ---- Field lanjutan (C1) ----
  tiers?: readonly CouponTier[];
  perDayLimit?: number;
  assignedEmail?: string;
  singleUse?: boolean;
  // ---- Kupon bundel (`KP-P2`) ----
  appliesToSlugs?: readonly string[];
  minItems?: number;
};

export type CouponFormErrors = Partial<
  Record<
    | "code"
    | "value"
    | "tiers"
    | "minSpend"
    | "maxDiscount"
    | "startsAt"
    | "endsAt"
    | "usageLimit"
    | "limitPerUser"
    | "perDayLimit"
    | "assignedEmail"
    | "appliesToSlugs"
    | "minItems",
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

  if (v.type === "tiered") {
    // Kupon bertingkat: butuh >=1 tier valid, terurut & menaik.
    const tiers = v.tiers ?? [];
    if (tiers.length === 0) {
      errors.tiers = "Tambahkan minimal 1 tingkat diskon.";
    } else {
      let prev = -1;
      let bad = false;
      for (const t of tiers) {
        if (!isFiniteNumber(t.minSpend) || t.minSpend <= prev || t.value <= 0) bad = true;
        if ((t.kind ?? "percent") === "percent" && t.value > 100) bad = true;
        if (isFiniteNumber(t.minSpend)) prev = t.minSpend;
      }
      if (bad) {
        errors.tiers =
          "Tingkat tidak valid: ambang naik, nilai > 0, persen ≤ 100, tanpa duplikat ambang.";
      }
    }
  } else if (!isFiniteNumber(v.value)) {
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

  if (v.perDayLimit !== undefined && v.perDayLimit !== null) {
    if (!isFiniteNumber(v.perDayLimit) || v.perDayLimit < 1) {
      errors.perDayLimit = "Kuota harian minimal 1 (kosongkan untuk tanpa batas).";
    }
  }

  if (v.limitPerUser !== undefined && v.limitPerUser !== null) {
    if (!isFiniteNumber(v.limitPerUser) || v.limitPerUser < 0) {
      errors.limitPerUser = "Batas per user tidak boleh negatif (0 = tanpa batas).";
    }
  }

  if (v.assignedEmail && !/.+@.+\..+/.test(v.assignedEmail.trim())) {
    errors.assignedEmail = "Email penerima tidak valid.";
  }

  // Kupon bundel (`KP-P2`): daftar produk & minimal item.
  if (v.appliesToSlugs && v.appliesToSlugs.length > 0) {
    if (v.appliesToSlugs.length > MAX_COUPON_SLUGS) {
      errors.appliesToSlugs = `Maksimal ${MAX_COUPON_SLUGS} produk.`;
    } else if (
      v.appliesToSlugs.some((s) => !s.trim() || s.trim().length > MAX_COUPON_SLUG_LEN)
    ) {
      errors.appliesToSlugs = "Slug produk tidak valid (kosong/terlalu panjang).";
    } else if (new Set(v.appliesToSlugs.map((s) => s.trim())).size !== v.appliesToSlugs.length) {
      errors.appliesToSlugs = "Slug produk duplikat — hapus yang berulang.";
    }
  }

  if (v.minItems !== undefined && v.minItems !== null) {
    if (!isFiniteNumber(v.minItems) || !Number.isInteger(v.minItems) || v.minItems < 0) {
      errors.minItems = "Minimal item harus bilangan bulat ≥ 0.";
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

/* -------------------------------------------------------------------------- */
/* Generator kode massal (C4/K4) — murni & teruji                             */
/* -------------------------------------------------------------------------- */

/** Alfabet kode acak (tanpa karakter ambigu: 0/O, 1/I/L). */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Batas jumlah kode per aksi generate massal (K4). */
export const MAX_BATCH_CODES = 500;

/** Batas panjang prefix (agar kode tetap wajar). */
export const MAX_CODE_PREFIX_LEN = 12;

/** Normalisasi prefix: uppercase, hanya A-Z0-9, dipotong. */
export function normalizeCodePrefix(prefix: string): string {
  return prefix
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, MAX_CODE_PREFIX_LEN);
}

export type BatchCodeResult =
  | { ok: true; codes: string[] }
  | { ok: false; error: string };

/**
 * Generate `count` kode unik dengan `prefix` + `suffixLen` karakter acak.
 * `rand` disuntikkan agar deterministik saat diuji (default `Math.random`).
 *
 * Mengembalikan daftar kode TERUNIK (dalam batch). Keunikan lintas-batch
 * dijamin server (penanda `couponCodes/{code}` atomik).
 */
export function generateBatchCodes(
  prefix: string,
  count: number,
  suffixLen = 6,
  rand: () => number = Math.random,
): BatchCodeResult {
  const cleanPrefix = normalizeCodePrefix(prefix);
  if (!cleanPrefix) {
    return { ok: false, error: "Prefix kode wajib diisi (huruf/angka)." };
  }
  if (!Number.isInteger(count) || count < 1) {
    return { ok: false, error: "Jumlah kode minimal 1." };
  }
  if (count > MAX_BATCH_CODES) {
    return { ok: false, error: `Maksimal ${MAX_BATCH_CODES} kode per aksi.` };
  }
  const len = Math.min(Math.max(Math.floor(suffixLen), 4), 12);

  const seen = new Set<string>();
  const codes: string[] = [];
  // Batas percobaan agar tak loop selamanya bila ruang kode habis.
  const maxAttempts = count * 20;
  let attempts = 0;
  while (codes.length < count && attempts < maxAttempts) {
    attempts += 1;
    let suffix = "";
    for (let i = 0; i < len; i++) {
      suffix += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
    }
    const code = `${cleanPrefix}${suffix}`;
    if (seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }
  if (codes.length < count) {
    return { ok: false, error: "Gagal membuat kode unik. Coba lagi." };
  }
  return { ok: true, codes };
}

/* -------------------------------------------------------------------------- */
/* Agregasi statistik per-kupon (murni & teruji — audit K9)                    */
/* -------------------------------------------------------------------------- */

/** Statistik dampak satu kupon. */
export type CouponStat = {
  couponId: string;
  code: string;
  /** TOTAL pesanan (termasuk dibatalkan). */
  orderCount: number;
  /** Pesanan AKTIF (tidak dibatalkan) — metrik utama. */
  activeOrders: number;
  /** Total diskon (Rp) dari pesanan aktif. */
  totalDiscount: number;
  /** Pesanan dibatalkan. */
  cancelledOrders: number;
};

/** Baris order minimal untuk agregasi (subset field `coupon`). */
export type CouponStatRow = {
  status: string;
  coupon?: { code?: string; couponId?: string; discount?: number } | null;
};

/**
 * Agregasi statistik per-kupon dari baris pesanan. Mengelompokkan berdasarkan
 * `couponId` (fallback `code:<KODE>` untuk order lama tanpa couponId).
 *
 * - `orderCount` = semua order ber-kupon.
 * - `activeOrders` = order non-`dibatalkan` (metrik utama).
 * - `totalDiscount` = Σ diskon dari order AKTIF saja.
 */
export function aggregateCouponStats(
  rows: readonly CouponStatRow[],
): Record<string, CouponStat> {
  const stats: Record<string, CouponStat> = {};
  for (const row of rows) {
    const coupon = row.coupon;
    if (!coupon || typeof coupon !== "object") continue;
    const code = typeof coupon.code === "string" ? coupon.code : "";
    const couponId =
      typeof coupon.couponId === "string" && coupon.couponId
        ? coupon.couponId
        : `code:${code}`;
    const discount =
      typeof coupon.discount === "number" && Number.isFinite(coupon.discount)
        ? coupon.discount
        : 0;

    const entry =
      stats[couponId] ??
      {
        couponId,
        code,
        orderCount: 0,
        activeOrders: 0,
        totalDiscount: 0,
        cancelledOrders: 0,
      };
    entry.orderCount += 1;
    if (row.status === "dibatalkan") {
      entry.cancelledOrders += 1;
    } else {
      entry.activeOrders += 1;
      entry.totalDiscount += discount;
    }
    stats[couponId] = entry;
  }
  return stats;
}

/* -------------------------------------------------------------------------- */
/* Anti-enumeration kode kupon (`KP-M4`) — murni & teruji                      */
/* -------------------------------------------------------------------------- */

/**
 * Apakah kode kupon "berbentuk wajar" menurut aturan yang sama dengan form admin
 * (huruf & angka saja, 3–40 karakter). Dipakai sebagai gerbang RINGAN anti
 * enumeration: kode yang jelas-jelas tidak valid ditolak cepat tanpa menyentuh
 * DB, sehingga pemindaian massal tidak membanjiri lookup.
 */
export function isPlausibleCouponCode(raw: string): boolean {
  const code = raw.trim();
  return code.length >= 3 && code.length <= 40 && /^[A-Za-z0-9]+$/.test(code);
}

/**
 * Format kode kupon untuk observability TANPA membocorkan nilainya (`KP-M4`).
 * Menyisakan 2 karakter awal + panjang, sisanya disamarkan — cukup untuk melihat
 * pola percobaan (enumeration) tanpa mencatat rahasia.
 */
export function maskCouponCode(raw: string): string {
  const code = raw.trim().toUpperCase();
  if (code.length === 0) return "";
  if (code.length <= 2) return "*".repeat(code.length);
  return `${code.slice(0, 2)}${"*".repeat(Math.min(6, code.length - 2))}`;
}
