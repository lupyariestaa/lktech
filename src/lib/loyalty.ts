import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  normalizePoints,
  pointsForSpend,
  tierFor,
  checkRedeem,
  type Tier,
} from "@/lib/loyalty-pure";

/**
 * DATA LAYER program loyalitas/poin (Tema 2.1, FASE R1).
 *
 * - Ledger di subkoleksi `users/{uid}/points/{entryId}` (sumber kebenaran).
 * - Saldo `points` & `pointsLifetime` didenormalisasi ke `users/{uid}`.
 * - Poin diperoleh saat order lunas (idempoten per order), ulasan disetujui.
 * - Tukar poin → kupon: potong saldo atomik + buat kupon berkode unik.
 *
 * Semua best-effort & aman tanpa Admin SDK.
 */

const USERS = "users";
const POINTS = "points";

export type PointsEntry = {
  id: string;
  delta: number;
  reason: string;
  refId?: string;
  atISO: string;
};

export type PointsSummary = {
  balance: number;
  lifetime: number;
  tier: Tier;
};

/** Baca saldo & lifetime dari profil. */
export async function getPointsSummary(uid: string): Promise<PointsSummary> {
  const db = getAdminDb();
  if (!db) return { balance: 0, lifetime: 0, tier: "bronze" };
  const doc = await db.collection(USERS).doc(uid).get();
  const balance = normalizePoints(doc.get("points"));
  const lifetime = normalizePoints(doc.get("pointsLifetime"));
  return { balance, lifetime, tier: tierFor(lifetime) };
}

/** Riwayat ledger poin (terbaru dulu). */
export async function listPointsHistory(uid: string, limit = 50): Promise<PointsEntry[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db
    .collection(USERS)
    .doc(uid)
    .collection(POINTS)
    .limit(200)
    .get();
  return snap.docs
    .map((doc) => {
      const d = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        delta: typeof d.delta === "number" ? d.delta : 0,
        reason: typeof d.reason === "string" ? d.reason : "",
        refId: typeof d.refId === "string" ? d.refId : undefined,
        atISO: typeof d.atISO === "string" ? d.atISO : "",
      } satisfies PointsEntry;
    })
    .sort((a, b) => b.atISO.localeCompare(a.atISO))
    .slice(0, limit);
}

/**
 * Tambah poin (idempoten per `refId` bila diberikan). `reason` mis.
 * "order" | "review" | "redeem". Best-effort; mengembalikan saldo baru (null gagal).
 */
export async function addPoints(
  uid: string,
  delta: number,
  reason: string,
  refId?: string,
): Promise<number | null> {
  const db = getAdminDb();
  if (!db) return null;
  if (!Number.isFinite(delta) || delta === 0) return null;

  const userRef = db.collection(USERS).doc(uid);
  const ledger = userRef.collection(POINTS);

  // Idempotensi: bila refId diberikan & sudah ada entri dgn refId+reason → skip.
  if (refId) {
    const dup = await ledger
      .where("refId", "==", refId)
      .where("reason", "==", reason)
      .limit(1)
      .get();
    if (!dup.empty) return null;
  }

  try {
    await ledger.add({
      delta,
      reason,
      refId: refId ?? "",
      atISO: new Date().toISOString(),
    });
    const patch: Record<string, unknown> = {
      points: FieldValue.increment(delta),
    };
    if (delta > 0) patch.pointsLifetime = FieldValue.increment(delta);
    await userRef.set(patch, { merge: true });
    const doc = await userRef.get();
    return normalizePoints(doc.get("points"));
  } catch (err) {
    console.error("[loyalty] gagal menambah poin:", err);
    return null;
  }
}

/** Beri poin dari order yang lunas (idempoten per orderId). */
export async function awardOrderPoints(
  uid: string,
  orderId: string,
  total: number,
): Promise<number | null> {
  const points = pointsForSpend(total);
  if (points <= 0) return null;
  return addPoints(uid, points, "order", orderId);
}

/** Beri poin bonus karena ulasan disetujui (idempoten per reviewId). */
export async function awardReviewPoints(
  uid: string,
  reviewId: string,
  bonus = 50,
): Promise<number | null> {
  return addPoints(uid, bonus, "review", reviewId);
}

export type RedeemResult =
  | { ok: true; code: string; value: number; balance: number }
  | { ok: false; reason: string };

/**
 * Tukar poin → kupon. Atomik: potong saldo + ledger `redeem` + buat kupon
 * berkode unik `POIN-XXXXXX` (nominal Rp sesuai paket). Best-effort.
 */
export async function redeemPoints(
  uid: string,
  points: number,
  actorEmail: string,
): Promise<RedeemResult> {
  const db = getAdminDb();
  if (!db) return { ok: false, reason: "Layanan poin belum tersedia." };

  const userRef = db.collection(USERS).doc(uid);
  const doc = await userRef.get();
  if (!doc.exists) return { ok: false, reason: "Profil tidak ditemukan." };

  const balance = normalizePoints(doc.get("points"));
  const check = checkRedeem(balance, points);
  if (!check.ok) return { ok: false, reason: check.reason };

  // Kode kupon unik.
  const code = `POIN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const nowISO = new Date().toISOString();

  try {
    // 1) Buat kupon (via modul kupon agar konsisten + penanda kode).
    const { createCoupon } = await import("@/lib/coupons");
    const coupon = await createCoupon(
      {
        code,
        description: `Tukar poin (${points} poin)`,
        type: "amount",
        value: check.value,
        minSpend: 0,
        limitPerUser: 1,
        usageLimit: 1,
        active: true,
      },
      actorEmail,
    );

    // 2) Potong saldo + ledger.
    await userRef.set({ points: FieldValue.increment(-points) }, { merge: true });
    await userRef.collection(POINTS).add({
      delta: -points,
      reason: "redeem",
      refId: coupon.id,
      atISO: nowISO,
    });

    const updated = await userRef.get();
    return {
      ok: true,
      code: coupon.code,
      value: check.value,
      balance: normalizePoints(updated.get("points")),
    };
  } catch (err) {
    console.error("[loyalty] gagal tukar poin:", err);
    return { ok: false, reason: "Gagal menukar poin. Coba lagi." };
  }
}
