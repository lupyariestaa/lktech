import "server-only";
import type { Query, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { signNewsletterUnsubToken } from "@/lib/unsubscribe-token";
import {
  normalizeSubscriber,
  summarizeSubscribers,
  countSegmentRecipients,
  matchesSegment,
  type BroadcastSegment,
} from "@/lib/newsletter-pure";
import type { Subscriber } from "@/lib/newsletter-types";

export type { BroadcastSegment, Subscriber } from "@/lib/newsletter-types";
export { BROADCAST_SEGMENT_LABEL } from "@/lib/newsletter-types";

/**
 * NEWSLETTER & BROADCAST (Tema 2.2, FASE R2).
 *
 * - Koleksi `subscribers/{emailSafe}` (id = email dinormalisasi) — opt-in publik.
 * - Broadcast dari admin ke segmen (semua / pernah beli / belum pernah) via Resend.
 * - Unsubscribe bertoken HMAC (reuse pola cart-unsubscribe).
 *
 * Aman tanpa Admin SDK → no-op. Best-effort.
 */

const COLLECTION = "subscribers";
const ORDERS_COLLECTION = "orders";

/** Batas dokumen saat memindai (hindari biaya/loop tak terbatas). */
const SCAN_CAP = 10000;

/** Ukuran satu batch pemindaian dokumen subscriber (satu `.get()` per batch). */
const SCAN_BATCH = 500;

/** Normalisasi email → id dokumen aman (lowercase, ganti char tak aman). */
export function subscriberId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, "_").slice(0, 200);
}

/**
 * Daftarkan email ke newsletter (idempoten).
 *
 * F-N11: re-subscribe AMAN — bila subscriber sudah ada, `createdAtISO` asli
 * dipertahankan & `unsubscribedAtISO` dibersihkan (bukan menimpa createdAt).
 */
export async function subscribeEmail(
  email: string,
  opts: { name?: string; source?: string } = {},
): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  const clean = email.trim().toLowerCase();
  if (!/.+@.+\..+/.test(clean)) return false;
  const ref = db.collection(COLLECTION).doc(subscriberId(clean));
  try {
    const data: Record<string, unknown> = {
      email: clean,
      name: (opts.name ?? "").trim().slice(0, 80),
      source: opts.source ?? "website",
      unsubscribed: false,
      unsubscribedAtISO: null,
    };
    // Pertahankan createdAtISO asli bila sudah ada.
    const existing = await ref.get();
    if (!existing.exists) data.createdAtISO = new Date().toISOString();
    await ref.set(data, { merge: true });
    return true;
  } catch (err) {
    console.error("[newsletter] gagal subscribe:", err);
    return false;
  }
}

/** Berhenti berlangganan (by id/email). */
export async function unsubscribeEmail(email: string): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  try {
    await db
      .collection(COLLECTION)
      .doc(subscriberId(email))
      .set(
        { unsubscribed: true, unsubscribedAtISO: new Date().toISOString() },
        { merge: true },
      );
    return true;
  } catch (err) {
    console.error("[newsletter] gagal unsubscribe:", err);
    return false;
  }
}

/**
 * Pindai seluruh subscriber secara BERTAHAP (Sprint 10 / ADM-17).
 *
 * Tanpa `orderBy` (urutan default per-id dokumen) agar dokumen lama tanpa
 * `createdAtISO` tetap ikut; pengurutan tampilan dilakukan setelahnya.
 * `startAfter(snapshot)` menjaga iterasi stabil (tidak terlewat/terulang).
 *
 * Berhenti saat query habis (`truncated = false`) atau menyentuh `SCAN_CAP`
 * (`truncated = true`) — pemanggil bisa memperingatkan admin secara jujur.
 */
async function scanSubscribers(): Promise<{
  subscribers: Subscriber[];
  truncated: boolean;
}> {
  const db = getAdminDb();
  if (!db) return { subscribers: [], truncated: false };
  const subscribers: Subscriber[] = [];
  let last: QueryDocumentSnapshot | null = null;
  let scanned = 0;
  while (scanned < SCAN_CAP) {
    const batchLimit = Math.min(SCAN_BATCH, SCAN_CAP - scanned);
    let q: Query = db.collection(COLLECTION);
    if (last) q = q.startAfter(last);
    const snap = await q.limit(batchLimit).get();
    if (snap.docs.length === 0) {
      return { subscribers, truncated: false };
    }
    for (const doc of snap.docs) {
      const sub = normalizeSubscriber(doc.data());
      if (sub) subscribers.push(sub);
    }
    scanned += snap.docs.length;
    last = snap.docs[snap.docs.length - 1];
    // Batch tidak penuh → tidak ada dokumen lagi setelah ini.
    if (snap.docs.length < batchLimit) {
      return { subscribers, truncated: false };
    }
  }
  return { subscribers, truncated: true };
}

/** Daftar seluruh subscriber (terbaru dulu) + penanda bila pemindaian terbatas. */
export async function listSubscribers(): Promise<{
  subscribers: Subscriber[];
  truncated: boolean;
}> {
  const { subscribers, truncated } = await scanSubscribers();
  const sorted = [...subscribers].sort((a, b) =>
    b.createdAtISO.localeCompare(a.createdAtISO),
  );
  return { subscribers: sorted, truncated };
}

/**
 * Kumpulkan SEMUA email yang pernah membeli (sumber kebenaran: koleksi `orders`,
 * bukan field `orderCount` yang bisa drift). F-N9.
 *
 * Order dibatalkan/kedaluwarsa tidak dihitung. Mengembalikan himpunan email
 * lowercase. Best-effort.
 */
export async function getBuyerEmails(): Promise<Set<string>> {
  const db = getAdminDb();
  if (!db) return new Set();
  const buyers = new Set<string>();
  try {
    const snap = await db
      .collection(ORDERS_COLLECTION)
      .select("buyerEmail", "status")
      .limit(SCAN_CAP)
      .get();
    snap.forEach((doc) => {
      const status = String(doc.get("status") ?? "");
      if (status === "dibatalkan" || status === "kedaluwarsa") return;
      const email = String(doc.get("buyerEmail") ?? "").trim().toLowerCase();
      if (email) buyers.add(email);
    });
  } catch (err) {
    console.error("[newsletter] gagal memuat pembeli dari orders:", err);
  }
  return buyers;
}

/**
 * Ringkasan + jumlah per segmen dalam SATU pemuatan subscriber (hindari
 * `listSubscribers` dipanggil dua kali pada endpoint yang sama).
 */
export async function getBroadcastOverview(): Promise<{
  summary: { total: number; active: number; unsubscribed: number };
  segmentCounts: Record<BroadcastSegment, number>;
  /** `true` bila pemindaian subscriber menyentuh batas (angka mungkin terpotong). */
  truncated: boolean;
}> {
  const [subsMeta, buyers] = await Promise.all([listSubscribers(), getBuyerEmails()]);
  return {
    summary: summarizeSubscribers(subsMeta.subscribers),
    segmentCounts: countSegmentRecipients(subsMeta.subscribers, buyers),
    truncated: subsMeta.truncated,
  };
}

/**
 * Kumpulkan email penerima untuk segmen tertentu (hanya yang aktif/subscribed
 * & belum unsubscribe). Sumber "pernah beli" dari koleksi `orders` (F-N9).
 *
 * ADM-18: hasil diurutkan naik & unik agar batch berbasis kursor stabil (batch
 * berikutnya hanya mengambil email `> kursor` — penerima lama tak dikirim ulang).
 */
export async function resolveSegmentEmails(
  segment: BroadcastSegment,
): Promise<string[]> {
  const db = getAdminDb();
  if (!db) return [];

  const [subsMeta, buyers] = await Promise.all([listSubscribers(), getBuyerEmails()]);
  const emails = subsMeta.subscribers
    .filter((s) => !s.unsubscribed)
    .filter((s) => matchesSegment(segment, buyers.has(s.email.toLowerCase())))
    .map((s) => s.email.toLowerCase());
  return Array.from(new Set(emails)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Secret HMAC untuk tautan unsubscribe. */
export function unsubSecret(): string {
  return (
    process.env.NEWSLETTER_UNSUB_SECRET?.trim() ||
    process.env.DOWNLOAD_TOKEN_SECRET?.trim() ||
    process.env.MAYAR_API_KEY?.trim() ||
    ""
  );
}

/**
 * Tanda tangan email untuk tautan unsubscribe (kosong = tanpa tanda tangan).
 * F-N1: memakai tokenId ber-prefix yang SAMA dengan verifikasi
 * (`verifyNewsletterUnsubToken`) agar tidak lagi mismatch.
 */
export function signNewsletterUnsub(email: string): string {
  return signNewsletterUnsubToken(email, unsubSecret());
}
