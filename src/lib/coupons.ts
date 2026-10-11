import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  COUPON_TYPES,
  MAX_COUPON_USED_BY,
  type Coupon,
  type CouponAudience,
  type CouponTier,
  type CouponType,
  type CouponsSummary,
} from "@/lib/coupon-types";
// Logika murni kupon (diskon & validasi) dipindah ke `@/lib/coupon-pure`
// (bebas `server-only` + diuji Node — audit K5). Re-ekspor agar pemanggil lama
// (`@/lib/coupons`) tetap bekerja.
export {
  computeDiscount,
  validateCoupon,
  pickBestCoupon,
  pickTier,
  tieredDiscount,
  jakartaDateKey,
} from "@/lib/coupon-pure";
export type {
  CouponValidation,
  CouponTier as CouponTierPure,
} from "@/lib/coupon-pure";
import {
  aggregateCouponStats,
  jakartaDateKey,
  type CouponStat,
  type CouponStatRow,
} from "@/lib/coupon-pure";
import {
  computeCouponAnalytics,
  type CouponAnalytics,
  type CouponAnalyticsRow,
} from "@/lib/coupon-analytics-pure";

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

/** Normalisasi daftar tier untuk kupon `tiered` (C1). */
function normalizeTiers(v: unknown): CouponTier[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: CouponTier[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const t = raw as Record<string, unknown>;
    const minSpend = num(t.minSpend, -1);
    const value = num(t.value, -1);
    if (minSpend < 0 || value <= 0) continue;
    const kind = t.kind === "amount" ? "amount" : "percent";
    out.push({
      minSpend: Math.floor(minSpend),
      value,
      maxDiscount:
        typeof t.maxDiscount === "number" && t.maxDiscount > 0
          ? t.maxDiscount
          : undefined,
      kind,
    });
    if (out.length >= 20) break;
  }
  out.sort((a, b) => a.minSpend - b.minSpend);
  return out.length ? out : undefined;
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

  const audience: CouponAudience =
    data.audience === "baru" || data.audience === "lama" ? data.audience : "semua";

  return {
    id,
    code: normalizeCouponCode(str(data.code)),
    description: str(data.description) || undefined,
    type,
    value: num(data.value),
    tiers: normalizeTiers(data.tiers),
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
    // `limitPerUser` 0 = tanpa batas (K6) — JANGAN dipaksa 1. Default 1 bila kosong.
    limitPerUser:
      typeof data.limitPerUser === "number" && data.limitPerUser >= 0
        ? Math.floor(data.limitPerUser)
        : 1,
    singleUse: data.singleUse === true ? true : undefined,
    assignedEmail: str(data.assignedEmail).trim().toLowerCase() || undefined,
    assignedUid: str(data.assignedUid) || undefined,
    audience,
    perDayLimit:
      typeof data.perDayLimit === "number" && data.perDayLimit > 0
        ? Math.floor(data.perDayLimit)
        : undefined,
    campaign: str(data.campaign).trim() || undefined,
    stackable: data.stackable === true ? true : undefined,
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
 * Kupon KANDIDAT untuk "kode terbaik" (C3/K2): kupon aktif, non-arsip, & (bila
 * dibatasi) masih dalam rentang tanggal. Validasi penuh tetap dilakukan
 * `pickBestCoupon` per keranjang/pembeli. Best-effort.
 */
export async function listCandidateCoupons(now: Date = new Date()): Promise<Coupon[]> {
  const all = await listCoupons();
  const t = now.getTime();
  return all.filter((c) => {
    if (c.archived || !c.active) return false;
    if (c.startsAt) {
      const s = new Date(c.startsAt).getTime();
      if (!Number.isNaN(s) && t < s) return false;
    }
    if (c.endsAt) {
      const e = new Date(c.endsAt).getTime();
      if (!Number.isNaN(e) && t > e) return false;
    }
    if (c.usageLimit && c.usageCount >= c.usageLimit) return false;
    return true;
  });
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

/** Ambil kupon berdasarkan ID dokumen (termasuk yang diarsipkan). */
export async function getCouponById(id: string): Promise<Coupon | null> {
  const db = getAdminDb();
  if (!db) return null;
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return normalizeCoupon(doc.id, doc.data() as Record<string, unknown>);
}

/** Satu entri pemakaian kupon oleh pengguna (dari subkoleksi `redemptions`). */
export type CouponRedemption = {
  uid: string;
  count: number;
  lastRedeemedAtISO?: string;
  email?: string;
};

/**
 * Daftar pemakaian kupon per-pengguna (C5/K9) — dari subkoleksi
 * `coupons/{id}/redemptions`. Diurutkan dari yang terbaru. Best-effort.
 */
export async function listCouponRedemptions(id: string): Promise<CouponRedemption[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection(COLLECTION)
      .doc(id)
      .collection(REDEMPTIONS)
      .limit(500)
      .get();
    return snap.docs
      .map((doc) => {
        const d = doc.data() as Record<string, unknown>;
        return {
          uid: doc.id,
          count: typeof d.count === "number" ? d.count : 0,
          lastRedeemedAtISO:
            typeof d.lastRedeemedAtISO === "string" ? d.lastRedeemedAtISO : undefined,
          email: typeof d.email === "string" ? d.email : undefined,
        } satisfies CouponRedemption;
      })
      .sort((a, b) =>
        (b.lastRedeemedAtISO ?? "").localeCompare(a.lastRedeemedAtISO ?? ""),
      );
  } catch (err) {
    console.error("[coupons] gagal memuat daftar pemakai:", err);
    return [];
  }
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

/**
 * Buat BANYAK kupon sekaligus (C4/K4) — tiap kode diklaim penanda atomik.
 * `baseInput` = pengaturan bersama (kode diabaikan; diganti `codes`). Mengembalikan
 * kode yang BERHASIL dibuat & yang GAGAL (mis. kode kebetulan sudah dipakai).
 */
export async function createCouponBatch(
  baseInput: Omit<CouponInput, "code">,
  codes: string[],
  createdBy: string,
): Promise<{ created: string[]; failed: { code: string; reason: string }[] }> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");

  const created: string[] = [];
  const failed: { code: string; reason: string }[] = [];

  for (const raw of codes) {
    const code = normalizeCouponCode(raw);
    if (!code) {
      failed.push({ code: raw, reason: "kode_tidak_valid" });
      continue;
    }
    const couponRef = db.collection(COLLECTION).doc();
    const markerRef = db.collection("couponCodes").doc(code);
    const nowISO = new Date().toISOString();
    try {
      await db.runTransaction(async (tx) => {
        const marker = await tx.get(markerRef);
        if (marker.exists) throw new Error("code_taken");
        tx.set(couponRef, {
          ...stripUndefined({ ...baseInput, code } as Record<string, unknown>),
          code,
          usageCount: 0,
          usedBy: [],
          createdAtISO: nowISO,
          createdBy,
        });
        tx.set(markerRef, { couponId: couponRef.id, code, createdAtISO: nowISO });
      });
      created.push(code);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "gagal";
      failed.push({ code, reason: reason === "code_taken" ? "kode_sudah_dipakai" : reason });
    }
  }
  return { created, failed };
}

/**
 * Duplikat kupon (C4/O15) sebagai DRAFT baru: **nonaktif**, kuota/pemakaian
 * direset, kode baru (`copy`). Menyalin pengaturan (diskon, syarat, jadwal, dst).
 */
export async function duplicateCoupon(
  id: string,
  createdBy: string,
): Promise<Coupon | null> {
  const source = await getCouponById(id);
  if (!source) return null;

  // Kode baru: `{CODE}-COPY` (di-unique-kan; bila dipakai, tambah akhiran angka).
  const baseCode = normalizeCouponCode(`${source.code}COPY`).slice(0, 30) || "COPY";
  let newCode = baseCode;
  for (let i = 2; i <= 50; i++) {
    if (!(await isCouponCodeTaken(newCode))) break;
    newCode = `${baseCode}${i}`;
  }

  const input: CouponInput = {
    code: newCode,
    description: source.description,
    type: source.type,
    value: source.value,
    tiers: source.tiers,
    minSpend: source.minSpend,
    appliesToSlugs: source.appliesToSlugs,
    minItems: source.minItems,
    maxDiscount: source.maxDiscount,
    startsAt: source.startsAt,
    endsAt: source.endsAt,
    usageLimit: source.usageLimit,
    limitPerUser: source.limitPerUser,
    singleUse: source.singleUse,
    assignedEmail: source.assignedEmail,
    assignedUid: source.assignedUid,
    audience: source.audience,
    perDayLimit: source.perDayLimit,
    campaign: source.campaign,
    stackable: source.stackable,
    // DRAFT: nonaktif agar admin meninjau sebelum mengaktifkan.
    active: false,
  };
  return createCoupon(input, createdBy);
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
  email?: string,
): Promise<RedeemResult> {
  const db = getAdminDb();
  if (!db) return { ok: false, reason: "Admin SDK tidak tersedia." };

  const ref = db.collection(COLLECTION).doc(id);
  const redemptionRef = ref.collection(REDEMPTIONS).doc(uid);
  const dayKey = jakartaDateKey();
  const dailyRef = ref.collection(DAILY).doc(dayKey);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("coupon_not_found");
      const coupon = normalizeCoupon(id, snap.data() as Record<string, unknown>);
      if (coupon.archived) throw new Error("coupon_archived");

      // C2/K3: single-use hanya 1× total (pada order aktif).
      if (coupon.singleUse && coupon.usageCount >= 1) {
        throw new Error("single_use_reached");
      }
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        throw new Error("usage_limit_reached");
      }

      const redemption = await tx.get(redemptionRef);
      const used = redemption.exists ? num(redemption.get("count")) : 0;
      if (coupon.limitPerUser > 0 && used >= coupon.limitPerUser) {
        throw new Error("per_user_limit_reached");
      }

      // C2/K7: kuota harian (counter per tanggal, atomik dalam transaksi).
      if (coupon.perDayLimit && coupon.perDayLimit > 0) {
        const daily = await tx.get(dailyRef);
        const dayUsed = daily.exists ? num(daily.get("count")) : 0;
        if (dayUsed >= coupon.perDayLimit) {
          throw new Error("daily_limit_reached");
        }
        tx.set(
          dailyRef,
          { date: dayKey, count: FieldValue.increment(1), updatedAtISO: new Date().toISOString() },
          { merge: true },
        );
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
          ...(email ? { email } : {}),
          count: FieldValue.increment(1),
          atISO: new Date().toISOString(),
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
  const dayKey = jakartaDateKey();
  const dailyRef = ref.collection(DAILY).doc(dayKey);

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

      // C2/K7: turunkan counter harian (bila ada) agar kuota harian kembali.
      if (coupon.perDayLimit && coupon.perDayLimit > 0) {
        const daily = await tx.get(dailyRef);
        const dayUsed = daily.exists ? num(daily.get("count")) : 0;
        if (dayUsed <= 1) {
          tx.delete(dailyRef);
        } else {
          tx.set(
            dailyRef,
            { date: dayKey, count: dayUsed - 1, updatedAtISO: new Date().toISOString() },
            { merge: true },
          );
        }
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

/* -------------------------------------------------------------------------- */
/* Kuota harian (C2/K7) — counter per tanggal (Asia/Jakarta)                  */
/* -------------------------------------------------------------------------- */

/** Subkoleksi counter harian: `coupons/{id}/daily/{yyyymmdd}`. */
const DAILY = "daily";

/** Jumlah pemakaian kupon ini HARI INI (Asia/Jakarta). */
export async function getCouponDayUsage(
  id: string,
  now: Date = new Date(),
): Promise<number> {
  const db = getAdminDb();
  if (!db) return 0;
  try {
    const doc = await db
      .collection(COLLECTION)
      .doc(id)
      .collection(DAILY)
      .doc(jakartaDateKey(now))
      .get();
    return doc.exists ? num(doc.get("count")) : 0;
  } catch {
    return 0;
  }
}

/**
 * Snapshot penggunaan kupon (untuk validasi server) dalam satu panggilan:
 * - `dayUsageCount` — pemakaian hari ini (Asia/Jakarta).
 * - `singleUseConsumed` — `true` bila single-use sudah terpakai (order aktif /
 *   `usageCount >= 1`). Restore saat batal menurunkan `usageCount` → boleh lagi.
 */
export async function getCouponUsageSnapshot(
  coupon: Coupon,
  now: Date = new Date(),
): Promise<{ dayUsageCount: number; singleUseConsumed: boolean }> {
  const dayUsageCount = coupon.perDayLimit
    ? await getCouponDayUsage(coupon.id, now)
    : 0;
  return {
    dayUsageCount,
    // `usageCount` = jumlah pemakaian pada order aktif (naik saat sukses, turun
    // saat restore). Cukup untuk menentukan single-use terpakai.
    singleUseConsumed: coupon.singleUse ? coupon.usageCount >= 1 : false,
  };
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
export type { CouponStat } from "@/lib/coupon-pure";

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

    // Agregasi MURNI (teruji — audit K9).
    const rows = snap.docs.map((doc) => ({
      status: String(doc.get("status") ?? ""),
      coupon: doc.get("coupon") as CouponStatRow["coupon"],
    }));
    const stats = aggregateCouponStats(rows);
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

/* -------------------------------------------------------------------------- */
/* Analitik kupon (C6/K10)                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Hitung analitik efektivitas untuk SATU kupon dalam `days` hari terakhir
 * (zona Asia/Jakarta, default 30). Memuat order dalam jendela lalu mendelegasikan
 * ke logika murni `computeCouponAnalytics` (memfilter order berkupon ini saja).
 * Best-effort — `null` bila Admin SDK tak tersedia.
 */
export async function getCouponAnalytics(
  couponId: string,
  days = 30,
): Promise<CouponAnalytics | null> {
  const db = getAdminDb();
  if (!db) return null;
  try {
    const safeDays = Math.min(Math.max(Math.floor(days), 1), 365);
    const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();
    const snap = await db
      .collection("orders")
      .where("createdAtISO", ">=", cutoff)
      .select("status", "total", "createdAtISO", "coupon")
      .get();

    const rows: CouponAnalyticsRow[] = [];
    for (const doc of snap.docs) {
      const coupon = doc.get("coupon") as CouponAnalyticsRow["coupon"];
      // Hanya order yang memakai kupon INI (by couponId, fallback kode).
      const cid = coupon && typeof coupon === "object" ? coupon.couponId : undefined;
      if (cid !== couponId) {
        // Fallback: cocokkan kode (order lama tanpa couponId tidak dapat dipetakan
        // by-id; lewati agar tidak salah hitung).
        continue;
      }
      rows.push({
        status: String(doc.get("status") ?? ""),
        total: num(doc.get("total")),
        createdAt: String(doc.get("createdAtISO") ?? ""),
        coupon,
      });
    }
    return computeCouponAnalytics(rows);
  } catch (err) {
    console.error("[coupons] gagal menghitung analitik kupon:", err);
    return null;
  }
}
