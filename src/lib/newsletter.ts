import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { signTokenId } from "@/lib/download-token";
import type { BroadcastSegment, Subscriber } from "@/lib/newsletter-types";

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

/** Normalisasi email → id dokumen aman (lowercase, ganti char tak aman). */
export function subscriberId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, "_").slice(0, 200);
}

function normalize(v: unknown): Subscriber | null {
  if (!v || typeof v !== "object") return null;
  const d = v as Record<string, unknown>;
  const email = typeof d.email === "string" ? d.email : "";
  if (!email) return null;
  return {
    email,
    name: typeof d.name === "string" ? d.name : undefined,
    source: typeof d.source === "string" ? d.source : "unknown",
    createdAtISO: typeof d.createdAtISO === "string" ? d.createdAtISO : "",
    unsubscribed: d.unsubscribed === true,
  };
}

/** Daftarkan email ke newsletter (idempoten). */
export async function subscribeEmail(
  email: string,
  opts: { name?: string; source?: string } = {},
): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  const clean = email.trim().toLowerCase();
  if (!/.+@.+\..+/.test(clean)) return false;
  try {
    await db
      .collection(COLLECTION)
      .doc(subscriberId(clean))
      .set(
        {
          email: clean,
          name: (opts.name ?? "").trim().slice(0, 80),
          source: opts.source ?? "website",
          unsubscribed: false,
          createdAtISO: new Date().toISOString(),
        },
        { merge: true },
      );
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
      .set({ unsubscribed: true, unsubscribedAtISO: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.error("[newsletter] gagal unsubscribe:", err);
    return false;
  }
}

/** Daftar seluruh subscriber (terbaru dulu). */
export async function listSubscribers(): Promise<Subscriber[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection(COLLECTION).limit(2000).get();
  return snap.docs
    .map((doc) => normalize(doc.data()))
    .filter((s): s is Subscriber => s !== null)
    .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
}

/** Ringkasan subscriber. */
export async function getSubscribersSummary(): Promise<{
  total: number;
  active: number;
  unsubscribed: number;
}> {
  const all = await listSubscribers();
  const unsub = all.filter((s) => s.unsubscribed).length;
  return { total: all.length, active: all.length - unsub, unsubscribed: unsub };
}

/** Segmen broadcast (tipe di `newsletter-types`). */

/**
 * Kumpulkan email penerima untuk segmen tertentu (hanya yang aktif/subscribed
 * & belum unsubscribe). Sumber "pernah beli" dari koleksi `users` (orderCount>0).
 */
export async function resolveSegmentEmails(
  segment: BroadcastSegment,
): Promise<string[]> {
  const db = getAdminDb();
  if (!db) return [];

  // Peta email→pernahBeli dari users.
  const buyers = new Set<string>();
  try {
    const usersSnap = await db.collection("users").limit(5000).get();
    usersSnap.forEach((doc) => {
      const count = doc.get("orderCount");
      const email = String(doc.get("email") ?? "").toLowerCase();
      if (email && typeof count === "number" && count > 0) buyers.add(email);
    });
  } catch (err) {
    console.error("[newsletter] gagal memuat users:", err);
  }

  const subs = (await listSubscribers()).filter((s) => !s.unsubscribed);
  const emails = subs
    .map((s) => s.email)
    .filter((email) => {
      if (segment === "semua") return true;
      if (segment === "beli") return buyers.has(email);
      return !buyers.has(email);
    });
  return Array.from(new Set(emails));
}

/** Secret HMAC untuk tautan unsubscribe. */
function unsubSecret(): string {
  return (
    process.env.NEWSLETTER_UNSUB_SECRET?.trim() ||
    process.env.DOWNLOAD_TOKEN_SECRET?.trim() ||
    process.env.MAYAR_API_KEY?.trim() ||
    ""
  );
}

/** Tanda tangan email untuk tautan unsubscribe (kosong = tanpa tanda tangan). */
export function signNewsletterUnsub(email: string): string {
  const secret = unsubSecret();
  return secret ? signTokenId(`newsletter-unsub:${email.toLowerCase()}`, secret) : "";
}
