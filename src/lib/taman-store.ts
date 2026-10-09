import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import type { TamanPrivate, TamanTestimonial } from "@/lib/taman-types";
import { normalizeTamanTestimonial, str } from "@/lib/taman-logic";

/**
 * Data layer "Taman Pixel" (T1). Hanya Admin SDK (server-only).
 *
 * - `taman_testimonials`: dokumen publik-aman (diproses lewat whitelist di logika murni).
 * - `taman_private`: email & bukti persetujuan, id dokumen sama dengan testimonial.
 *
 * Pola mengikuti `products.ts`: normalisasi data mentah, dan pembersihan `undefined`
 * sebelum tulis (Firestore menolaknya).
 */

export const TAMAN_COLLECTION = "taman_testimonials";
export const TAMAN_PRIVATE_COLLECTION = "taman_private";

/** Normalisasi dokumen (`normalizeTamanTestimonial`) berada di taman-logic.ts (murni, dites). */

/** Buang nilai `undefined` (Firestore menolaknya). */
export function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

/** Semua testimoni (termasuk pending/hidden) untuk admin. */
export async function listTamanTestimonials(): Promise<TamanTestimonial[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection(TAMAN_COLLECTION).get();
  return snap.docs
    .map((doc) => normalizeTamanTestimonial(doc.id, doc.data()))
    .sort((a, b) => a.order - b.order || b.createdAtISO.localeCompare(a.createdAtISO));
}

export async function getTamanTestimonial(id: string): Promise<TamanTestimonial | null> {
  const db = getAdminDb();
  if (!db) return null;
  const doc = await db.collection(TAMAN_COLLECTION).doc(id).get();
  return doc.exists ? normalizeTamanTestimonial(doc.id, doc.data() ?? {}) : null;
}

/**
 * Tulis testimoni publik + (opsional) data privat dalam satu batch atomik.
 * Id dibuat di sini bila tidak diberikan. Mengembalikan id dokumen.
 */
export async function writeTamanTestimonial(
  data: Omit<TamanTestimonial, "id">,
  privateData: Omit<TamanPrivate, "testimonialId"> | null,
  id?: string,
): Promise<string> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");

  const ref = id
    ? db.collection(TAMAN_COLLECTION).doc(id)
    : db.collection(TAMAN_COLLECTION).doc();
  const batch = db.batch();
  batch.set(ref, stripUndefined(data as unknown as Record<string, unknown>), { merge: true });
  if (privateData) {
    const priv = db.collection(TAMAN_PRIVATE_COLLECTION).doc(ref.id);
    batch.set(
      priv,
      stripUndefined({ ...privateData, testimonialId: ref.id } as unknown as Record<string, unknown>),
      { merge: true },
    );
  }
  await batch.commit();
  return ref.id;
}

/** Perbarui sebagian field testimoni publik. */
export async function updateTamanTestimonial(
  id: string,
  patch: Partial<Omit<TamanTestimonial, "id">>,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  await db
    .collection(TAMAN_COLLECTION)
    .doc(id)
    .set(stripUndefined(patch as Record<string, unknown>), { merge: true });
}

/** Hapus testimoni publik dan data privatnya (hak hapus, Q20). */
export async function deleteTamanTestimonial(id: string): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  const batch = db.batch();
  batch.delete(db.collection(TAMAN_COLLECTION).doc(id));
  batch.delete(db.collection(TAMAN_PRIVATE_COLLECTION).doc(id));
  await batch.commit();
}

/** Data privat (admin saja). */
export async function getTamanPrivate(id: string): Promise<TamanPrivate | null> {
  const db = getAdminDb();
  if (!db) return null;
  const doc = await db.collection(TAMAN_PRIVATE_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  const d = doc.data() ?? {};
  return {
    testimonialId: id,
    email: str(d.email),
    uid: str(d.uid),
    consentText: str(d.consentText),
    consentAtISO: str(d.consentAtISO),
    evidenceNote: typeof d.evidenceNote === "string" ? d.evidenceNote : undefined,
    evidenceBy: typeof d.evidenceBy === "string" ? d.evidenceBy : undefined,
  };
}

/** Perbarui catatan bukti persetujuan (admin). */
export async function updateTamanEvidence(
  id: string,
  evidenceNote: string,
  evidenceBy: string,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  await db
    .collection(TAMAN_PRIVATE_COLLECTION)
    .doc(id)
    .set({ testimonialId: id, evidenceNote, evidenceBy }, { merge: true });
}
