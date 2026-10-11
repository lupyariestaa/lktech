import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import type { BroadcastSegment, BroadcastLog } from "@/lib/newsletter-pure";

/**
 * RIWAYAT BROADCAST (F-N8) — log kampanye yang dikirim admin.
 *
 * Koleksi `broadcasts/{id}`: subjek, isi ringkas, segmen, jumlah penerima
 * terkirim/gagal, pelaku, waktu. Best-effort (kegagalan tidak menggagalkan kirim).
 */

const COLLECTION = "broadcasts";

export type { BroadcastLog } from "@/lib/newsletter-pure";

function normalize(v: unknown): BroadcastLog | null {
  if (!v || typeof v !== "object") return null;
  const d = v as Record<string, unknown>;
  const id = typeof d.id === "string" ? d.id : "";
  const subject = typeof d.subject === "string" ? d.subject : "";
  if (!id || !subject) return null;
  const segment = (["semua", "beli", "belum"] as const).includes(
    d.segment as BroadcastSegment,
  )
    ? (d.segment as BroadcastSegment)
    : "semua";
  return {
    id,
    subject,
    segment,
    recipients: typeof d.recipients === "number" ? d.recipients : 0,
    sent: typeof d.sent === "number" ? d.sent : 0,
    failed: typeof d.failed === "number" ? d.failed : 0,
    actor: typeof d.actor === "string" ? d.actor : "",
    atISO: typeof d.atISO === "string" ? d.atISO : "",
  };
}

/** Simpan entri riwayat broadcast. Best-effort. */
export async function recordBroadcastLog(entry: {
  subject: string;
  segment: BroadcastSegment;
  recipients: number;
  sent: number;
  failed: number;
  actor: string;
}): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  try {
    await db.collection(COLLECTION).add({
      subject: entry.subject.slice(0, 200),
      segment: entry.segment,
      recipients: entry.recipients,
      sent: entry.sent,
      failed: entry.failed,
      actor: entry.actor,
      atISO: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[broadcast-log] gagal menyimpan riwayat:", err);
  }
}

/** Daftar riwayat broadcast (terbaru dulu). */
export async function listBroadcastLogs(limit = 50): Promise<BroadcastLog[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection(COLLECTION)
      .orderBy("atISO", "desc")
      .limit(Math.min(Math.max(limit, 1), 200))
      .get();
    return snap.docs
      .map((doc) => normalize({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
      .filter((x): x is BroadcastLog => x !== null);
  } catch (err) {
    // Fallback bila index field tunggal belum siap.
    console.warn("[broadcast-log] orderBy gagal, fallback memori:", err);
    try {
      const snap = await db.collection(COLLECTION).limit(200).get();
      return snap.docs
        .map((doc) => normalize({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
        .filter((x): x is BroadcastLog => x !== null)
        .sort((a, b) => b.atISO.localeCompare(a.atISO))
        .slice(0, limit);
    } catch {
      return [];
    }
  }
}
