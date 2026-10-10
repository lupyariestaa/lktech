import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  COUPON_TYPES,
  MAX_COUPON_USED_BY,
  type Coupon,
  type CouponType,
  type CouponsSummary,
} from "@/lib/coupon-types";
import { checkBundleRules } from "@/lib/coupon-rules";

const COLLECTION = "coupons";
/** Subkoleksi pencatatan pemakaian per user (sumber kebenaran `limitPerUser`). */
const REDEMPTIONS = "redemptions";

/* -------------------------------------------------------------------------- */
/* Normalisasi                                                                 */
/* -------------------------------------------------------------------------- */

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/** Normalisasi daftar slug produk untuk kupon bundel (FASE P3). */
function normalizeSlugList(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== "string") continue;
    const s = x.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= 50) break;
  }
  return out.length ? out : undefined;
}

/** Normalisasi kode kupon: uppercase, hanya A-Z0-9. */
export function normalizeCouponCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Normalisasi dokumen kupon mentah dari Firestore. */
export function normalizeCoupon(
  id: string,
  data: Record<string, unknown>,
): Coupon {
  const type: CouponType = (COUPON_TYPES as readonly string[]).includes(
    str(data.type),
  )
    ? (data.type as CouponType)
    : "percent";

  const usedBy = Array.isArray(data.usedBy)
    ? data.usedBy
        .filter((u): u is string => typeof u === "string" && u.length > 0)
        .slice(0, MAX_COUPON_USED_BY)
    : [];

  return {
    id,
    code: normalizeCouponCode(str(data.code)),
    description: str(data.description) || undefined,
    type,
    value: num(data.value),
    minSpend: num(data.minSpend),
    appliesToSlugs: normalizeSlugList(data.appliesToSlugs),
    minItems:
      typeof data.minItems === "number" && data.minItems > 0
        ? Math.floor(data.minItems)
        : undefined,
    maxDiscount: typeof data.maxDiscount === "number" ? data.maxDiscount : undefined,
    startsAt: str(data.startsAt) || undefined,
    endsAt: str(data.endsAt) || undefined,
    usageLimit:
      typeof data.usageLimit === "number" && data.usageLimit > 0
        ? data.usageLimit
        : undefined,
    limitPerUser:
      typeof data.limitPerUser === "number" && data.limitPerUser > 0
        ? data.limitPerUser
        : 1,
    active: data.active !== false,
    archived: data.archived === true,
    usageCount: num(data.usageCount),
    usedBy,
    createdAtISO: str(data.createdAtISO),
    updatedAtISO: str(data.updatedAtISO) || undefined,
    createdBy: str(data.createdBy) || undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Logika inti (murni — tanpa I/O)                                             */
/* -------------------------------------------------------------------------- */

/**
 * Hitung jumlah diskon (Rupiah) untuk sebuah kupon & subtotal.
 * Selalu dibatasi ≤ subtotal (diskon tak boleh melebihi belanja).
 */
export function computeDiscount(coupon: Coupon, subtotal: number): number {
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

export type CouponValidation =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; reason: string };

/**
 * Validasi kupon terhadap subtotal & konteks user. Mengembalikan alasan bila
 * gagal. Semua aturan dijalankan di SERVER (klien hanya mengirim kode).
 *
 * `userUsageCount` (opsional) = jumlah pemakaian user ini dari subkoleksi
 * `redemptions` (sumber kebenaran `limitPerUser`; lebih akurat dari `usedBy`
 * yang dibatasi `MAX_COUPON_USED_BY`). Bila tak diberikan, fallback ke `usedBy`.
 *
 * `slugs` & `itemCount` (opsional) dipakai untuk aturan KUPON BUNDEL (FASE P3):
 * - `appliesToSlugs`: keranjang wajib memuat ≥1 produk dari daftar.
 * - `minItems`: total jumlah item (qty) minimal.
 */
export function validateCoupon(
  coupon: Coupon | null,
  opts: {
    subtotal: number;
    uid?: string;
    now?: Date;
    userUsageCount?: number;
    slugs?: readonly string[];
    itemCount?: number;
  },
): CouponValidation {
  const now = opts.now ?? new Date();

  if (!coupon) return { ok: false, reason: "Kode promo tidak ditemukan." };
  if (!coupon.active) return { ok: false, reason: "Kode promo sudah tidak aktif." };

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
      reason: `Minimal belanja Rp${coupon.minSpend.toLocaleString("id-ID")} untuk memakai kode ini.`,
    };
  }

  // ===== Aturan KUPON BUNDEL (FASE P3) — logika murni di coupon-rules.ts =====
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
/* Data layer (I/O)                                                            */
/* -------------------------------------------------------------------------- */

/** Ambil semua kupon (terbaru lebih dulu). Sertakan arsip (soft-deleted). */
export async function listCoupons(): Promise<Coupon[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection(COLLECTION).get();
  return snap.docs
    .map((doc) => normalizeCoupon(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => (b.createdAtISO ?? "").localeCompare(a.createdAtISO ?? ""));
}

/**
 * Ambil kupon berdasarkan kode (case-insensitive).
 * `KP-H2`: menggunakan koleksi penanda `couponCodes/{code}` untuk lookup unik
 * atomik (satu kode = satu penanda). Fallback ke query `code ==` untuk data
 * lama yang belum punya penanda.
 */
export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const db = getAdminDb();
  if (!db) return null;
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;

  // Jalur utama: penanda kode → id dokumen (unik, tanpa duplikat).
  const marker = await db.collection("couponCodes").doc(normalized).get();
  const markerId = marker.exists ? (marker.get("couponId") as string) : undefined;
  if (markerId) {
    const doc = await db.collection(COLLECTION).doc(markerId).get();
    if (doc.exists) {
      const coupon = normalizeCoupon(doc.id, doc.data() as Record<string, unknown>);
      if (!coupon.archived) return coupon;
    }
  }

  // Fallback: query by field (data lama).
  const snap = await db
    .collection(COLLECTION)
    .where("code", "==", normalized)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const coupon = normalizeCoupon(doc.id, doc.data() as Record<string, unknown>);
  return coupon.archived ? null : coupon;
}

/** Apakah kode sudah dipakai kupon lain (selain `exceptId`). */
export async function isCouponCodeTaken(
  code: string,
  exceptId?: string,
): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  const normalized = normalizeCouponCode(code);
  if (!normalized) return false;

  // Jalur utama: penanda kode.
  const marker = await db.collection("couponCodes").doc(normalized).get();
  if (marker.exists) {
    return (marker.get("couponId") as string) !== exceptId;
  }

  // Fallback: query by field (data lama).
  const snap = await db
    .collection(COLLECTION)
    .where("code", "==", normalized)
    .get();
  return snap.docs.some((d) => d.id !== exceptId);
}

export type CouponInput = Omit<
  Coupon,
  "id" | "usageCount" | "usedBy" | "createdAtISO" | "updatedAtISO" | "createdBy" | "archived"
>;

/**
 * Buat kupon baru. Kode dinormalisasi & wajib unik.
 * `KP-H2`: klaim penanda `couponCodes/{code}` secara atomik (create-only)
 * sebelum menulis dokumen kupon, sehingga duplikat tidak mungkin lolos.
 */
export async function createCoupon(
  input: CouponInput,
  createdBy: string,
): Promise<Coupon> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");

  const code = normalizeCouponCode(input.code);
  const nowISO = new Date().toISOString();

  const couponRef = db.collection(COLLECTION).doc();
  const markerRef = db.collection("couponCodes").doc(code);

  await db.runTransaction(async (tx) => {
    const marker = await tx.get(markerRef);
    if (marker.exists) {
      throw new Error(`Kode "${code}" sudah dipakai kupon lain.`);
    }
    const payload = {
      ...stripUndefined(input),
      code,
      usageCount: 0,
      usedBy: [],
      createdAtISO: nowISO,
      createdBy,
    };
    tx.set(couponRef, payload);
    tx.set(markerRef, { couponId: couponRef.id, code, createdAtISO: nowISO });
  });

  const created = await couponRef.get();
  return normalizeCoupon(
    couponRef.id,
    created.data() as Record<string, unknown>,
  );
}

/** Perbarui kupon (partial). Kode (bila diubah) dinormalisasi + penanda dipindah. */
export async function updateCoupon(
  id: string,
  patch: Partial<CouponInput>,
): Promise<Coupon | null> {
  const db = getAdminDb();
  if (!db) return null;

  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;
  const oldCode = normalizeCouponCode(str(existing.get("code")));

  const data: Record<string, unknown> = stripUndefined({
    ...patch,
    ...(patch.code !== undefined ? { code: normalizeCouponCode(patch.code) } : {}),
  });
  data.updatedAtISO = new Date().toISOString();

  const newCode = normalizeCouponCode(str(patch.code ?? oldCode));

  if (newCode && newCode !== oldCode) {
    // Pindahkan penanda kode secara atomik (tolak bila sudah dipakai kupon lain).
    await db.runTransaction(async (tx) => {
      const newMarkerRef = db.collection("couponCodes").doc(newCode);
      const newMarker = await tx.get(newMarkerRef);
      if (newMarker.exists && (newMarker.get("couponId") as string) !== id) {
        throw new Error(`Kode "${newCode}" sudah dipakai kupon lain.`);
      }
      if (oldCode) tx.delete(db.collection("couponCodes").doc(oldCode));
      tx.set(newMarkerRef, {
        couponId: id,
        code: newCode,
        createdAtISO: new Date().toISOString(),
      });
      tx.set(ref, data, { merge: true });
    });
  } else {
    await ref.set(data, { merge: true });
  }

  const updated = await ref.get();
  return normalizeCoupon(id, updated.data() as Record<string, unknown>);
}

/**
 * Arsipkan kupon (SOFT-DELETE) — `KP-M3`. Dokumen tetap ada agar laporan &
 * restore tetap utuh; kupon tak lagi bisa dipakai & tak tampil sebagai aktif.
 */
export async function deleteCoupon(id: string): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.set(
    {
      archived: true,
      active: false,
      archivedAtISO: new Date().toISOString(),
    },
    { merge: true },
  );
  return true;
}

/** Pulihkan kupon yang diarsipkan. */
export async function restoreCoupon(id: string): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.set({ archived: false, updatedAtISO: new Date().toISOString() }, { merge: true });
  return true;
}

/** Hasil pemakaian kupon (untuk logging/rekonsiliasi). */
export type RedeemResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Catat pemakaian kupon secara ATOMIK (`KP-C1`).
 *
 * Dalam satu transaksi: baca ulang kupon → cek ulang `usageLimit` & batas
 * per-user (dari subkoleksi `redemptions/{uid}`) → `increment(1)` +
 * tulis `redemptions/{uid}` + `arrayUnion(uid)` (bila masih dalam batas).
 *
 * Mengembalikan `{ ok:false }` bila kuota/batas terlampaui (dipanggil SEBELUM
 * `createOrder` sebagai reservasi). Idempoten-aman terhadap concurrency karena
 * transaksi Firestore mengulang saat ada konflik.
 */
export async function redeemCoupon(
  id: string,
  uid: string,
): Promise<RedeemResult> {
  const db = getAdminDb();
  if (!db) return { ok: false, reason: "Admin SDK tidak tersedia." };

  const ref = db.collection(COLLECTION).doc(id);
  const redemptionRef = ref.collection(REDEMPTIONS).doc(uid);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("coupon_not_found");
      const coupon = normalizeCoupon(id, snap.data() as Record<string, unknown>);
      if (coupon.archived) throw new Error("coupon_archived");
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        throw new Error("usage_limit_reached");
      }

      const redemption = await tx.get(redemptionRef);
      const used = redemption.exists ? num(redemption.get("count")) : 0;
      if (coupon.limitPerUser > 0 && used >= coupon.limitPerUser) {
        throw new Error("per_user_limit_reached");
      }

      tx.update(ref, {
        usageCount: FieldValue.increment(1),
        usedBy:
          coupon.usedBy.length < MAX_COUPON_USED_BY
            ? FieldValue.arrayUnion(uid)
            : FieldValue.arrayUnion(),
        updatedAtISO: new Date().toISOString(),
      });
      tx.set(
        redemptionRef,
        {
          uid,
          count: FieldValue.increment(1),
          lastRedeemedAtISO: new Date().toISOString(),
        },
        { merge: true },
      );
    });
    invalidateCouponStatsCache();
    return { ok: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "redeem_failed";
    return { ok: false, reason };
  }
}

/**
 * Kembalikan kuota kupon (`KP-C2`) — dipanggil saat order dibatalkan/dihapus.
 * Idempoten bila pemanggil hanya memanggil pada transisi status yang tepat
 * (lihat pemanggilan di API admin). Dekremen `usageCount` (tidak negatif) +
 * `redemptions/{uid}` (jika ada).
 *
 * Mengembalikan `true` bila berhasil (atau tidak ada yang perlu dikembalikan),
 * `false` bila terjadi kegagalan — agar pemanggil yang butuh (mis. hard-delete
 * order, OR-A5) bisa membatalkan operasi & tidak membuat kuota bocor.
 */
export async function restoreCouponUsage(
  id: string,
  uid: string,
): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;

  const ref = db.collection(COLLECTION).doc(id);
  const redemptionRef = ref.collection(REDEMPTIONS).doc(uid);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const coupon = normalizeCoupon(id, snap.data() as Record<string, unknown>);

      const redemption = await tx.get(redemptionRef);
      const used = redemption.exists ? num(redemption.get("count")) : 0;

      tx.update(ref, {
        usageCount: Math.max(0, coupon.usageCount - 1),
        usedBy: coupon.usedBy.filter((u) => u !== uid),
        updatedAtISO: new Date().toISOString(),
      });
      if (used <= 1) {
        tx.delete(redemptionRef);
      } else {
        tx.set(
          redemptionRef,
          { uid, count: used - 1, lastRedeemedAtISO: new Date().toISOString() },
          { merge: true },
        );
      }
    });
    return true;
  } catch (err) {
    console.error("[coupons] gagal mengembalikan kuota kupon:", err);
    return false;
  }
}

/** Jumlah pemakaian kupon oleh seorang user (dari subkoleksi `redemptions`). */
export async function getUserCouponUsage(
  id: string,
  uid: string,
): Promise<number> {
  const db = getAdminDb();
  if (!db) return 0;
  try {
    const doc = await db
      .collection(COLLECTION)
      .doc(id)
      .collection(REDEMPTIONS)
      .doc(uid)
      .get();
    return doc.exists ? num(doc.get("count")) : 0;
  } catch {
    return 0;
  }
}

/** Ringkasan statistik kupon. */
export async function getCouponsSummary(): Promise<CouponsSummary> {
  const coupons = await listCoupons();
  const active = coupons.filter((c) => c.active && !c.archived);
  return {
    total: coupons.filter((c) => !c.archived).length,
    active: active.length,
    totalUsage: coupons.reduce((sum, c) => sum + c.usageCount, 0),
  };
}

/* -------------------------------------------------------------------------- */
/* Statistik per-kupon (`KP-M2`)                                               */
/* -------------------------------------------------------------------------- */

/** Statistik dampak satu kupon dari pesanan (bukan `ar`/estimasi). */
export type CouponStat = {
  couponId: string;
  code: string;
  /** Jumlah pesanan yang memakai kupon ini. */
  orderCount: number;
  /** Total diskon yang diberikan (Rp). */
  totalDiscount: number;
  /** Jumlah pesanan yang dibatalkan (diskon tak jadi). */
  cancelledOrders: number;
};

/**
 * Hitung statistik per-kupon dari koleksi `orders` (agregasi di memori).
 * Dipakai kartu kupon admin (`KP-M2`) + ekspor CSV. Menyaring order yang
 * memiliki snapshot `coupon`. Best-effort — mengembalikan map kosong bila
 * Admin SDK tak tersedia.
 *
 * OR-C3: hasil di-CACHE singkat (in-memory + TTL) karena memuat seluruh koleksi
 * `orders`; dipanggil berulang oleh halaman kupon.
 */
const COUPON_STATS_TTL_MS = 60_000;
let couponStatsCache: { at: number; value: Record<string, CouponStat> } | null = null;

export function invalidateCouponStatsCache(): void {
  couponStatsCache = null;
}

export async function getCouponStats(
  opts: { bypassCache?: boolean } = {},
): Promise<Record<string, CouponStat>> {
  const now = Date.now();
  if (!opts.bypassCache && couponStatsCache && now - couponStatsCache.at < COUPON_STATS_TTL_MS) {
    return couponStatsCache.value;
  }

  const db = getAdminDb();
  if (!db) return {};
  try {
    const snap = await db
      .collection("orders")
      .select("status", "coupon")
      .get();

    const stats: Record<string, CouponStat> = {};
    snap.forEach((doc) => {
      const coupon = doc.get("coupon") as Record<string, unknown> | undefined;
      if (!coupon || typeof coupon !== "object") return;
      const code = typeof coupon.code === "string" ? coupon.code : "";
      const couponId =
        typeof coupon.couponId === "string" ? coupon.couponId : `code:${code}`;
      const discount =
        typeof coupon.discount === "number" && Number.isFinite(coupon.discount)
          ? coupon.discount
          : 0;
      const status = doc.get("status") as string;

      const entry =
        stats[couponId] ??
        { couponId, code, orderCount: 0, totalDiscount: 0, cancelledOrders: 0 };
      entry.orderCount += 1;
      if (status === "dibatalkan") {
        entry.cancelledOrders += 1;
      } else {
        entry.totalDiscount += discount;
      }
      stats[couponId] = entry;
    });
    couponStatsCache = { at: Date.now(), value: stats };
    return stats;
  } catch (err) {
    console.error("[coupons] gagal menghitung statistik kupon:", err);
    return {};
  }
}

/** Buang field `undefined` agar aman ditulis ke Firestore. */
function stripUndefined(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
