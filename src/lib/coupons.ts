import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  COUPON_TYPES,
  MAX_COUPON_USED_BY,
  type Coupon,
  type CouponType,
  type CouponsSummary,
} from "@/lib/coupon-types";

const COLLECTION = "coupons";

/* -------------------------------------------------------------------------- */
/* Normalisasi                                                                 */
/* -------------------------------------------------------------------------- */

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
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
 */
export function validateCoupon(
  coupon: Coupon | null,
  opts: { subtotal: number; uid?: string; now?: Date },
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

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return { ok: false, reason: "Kuota kode promo sudah habis." };
  }

  if (
    opts.uid &&
    coupon.limitPerUser > 0 &&
    coupon.usedBy.filter((u) => u === opts.uid).length >= coupon.limitPerUser
  ) {
    return {
      ok: false,
      reason:
        coupon.limitPerUser === 1
          ? "Anda sudah pernah memakai kode promo ini."
          : `Kode promo ini maksimal ${coupon.limitPerUser}× per pengguna.`,
    };
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

/** Ambil semua kupon (terbaru lebih dulu). */
export async function listCoupons(): Promise<Coupon[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection(COLLECTION).get();
  return snap.docs
    .map((doc) => normalizeCoupon(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => (b.createdAtISO ?? "").localeCompare(a.createdAtISO ?? ""));
}

/** Ambil kupon berdasarkan kode (case-insensitive). */
export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const db = getAdminDb();
  if (!db) return null;
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;

  const snap = await db
    .collection(COLLECTION)
    .where("code", "==", normalized)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return normalizeCoupon(doc.id, doc.data() as Record<string, unknown>);
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

  const snap = await db
    .collection(COLLECTION)
    .where("code", "==", normalized)
    .get();
  return snap.docs.some((d) => d.id !== exceptId);
}

export type CouponInput = Omit<
  Coupon,
  "id" | "usageCount" | "usedBy" | "createdAtISO" | "updatedAtISO" | "createdBy"
>;

/** Buat kupon baru. Kode dinormalisasi & wajib unik. */
export async function createCoupon(
  input: CouponInput,
  createdBy: string,
): Promise<Coupon> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");

  const code = normalizeCouponCode(input.code);
  const nowISO = new Date().toISOString();
  const payload = {
    ...stripUndefined(input),
    code,
    usageCount: 0,
    usedBy: [],
    createdAtISO: nowISO,
    createdBy,
  };

  const ref = await db.collection(COLLECTION).add(payload);
  return normalizeCoupon(ref.id, payload);
}

/** Perbarui kupon (partial). Kode (bila diubah) dinormalisasi. */
export async function updateCoupon(
  id: string,
  patch: Partial<CouponInput>,
): Promise<Coupon | null> {
  const db = getAdminDb();
  if (!db) return null;

  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const data: Record<string, unknown> = stripUndefined({
    ...patch,
    ...(patch.code !== undefined ? { code: normalizeCouponCode(patch.code) } : {}),
  });
  data.updatedAtISO = new Date().toISOString();

  await ref.set(data, { merge: true });
  const updated = await ref.get();
  return normalizeCoupon(id, updated.data() as Record<string, unknown>);
}

/** Hapus kupon. */
export async function deleteCoupon(id: string): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return false;
  await ref.delete();
  return true;
}

/**
 * Catat pemakaian kupon: `usageCount++` & push uid (dibatasi jumlah).
 * Best-effort dipanggil saat order sukses; tidak melempar bila kupon hilang.
 */
export async function redeemCoupon(id: string, uid: string): Promise<void> {
  const db = getAdminDb();
  if (!db) return;

  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return;

  const coupon = normalizeCoupon(id, existing.data() as Record<string, unknown>);
  const usedBy =
    coupon.usedBy.length < MAX_COUPON_USED_BY
      ? [...coupon.usedBy, uid]
      : coupon.usedBy;

  await ref.set(
    {
      usageCount: coupon.usageCount + 1,
      usedBy,
      updatedAtISO: new Date().toISOString(),
    },
    { merge: true },
  );
}

/** Ringkasan statistik kupon. */
export async function getCouponsSummary(): Promise<CouponsSummary> {
  const coupons = await listCoupons();
  return {
    total: coupons.length,
    active: coupons.filter((c) => c.active).length,
    totalUsage: coupons.reduce((sum, c) => sum + c.usageCount, 0),
  };
}

/** Buang field `undefined` agar aman ditulis ke Firestore. */
function stripUndefined(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
