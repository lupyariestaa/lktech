import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { logEvent } from "@/lib/observability";
import { deliveryStatusFor, type ResendOutcome } from "@/lib/resend-webhook-pure";

/**
 * Jembatan antara EMAIL TERKIRIM dan EVENT pengiriman dari provider (`EM-P2`).
 *
 * Masalah: webhook Resend hanya membawa `email_id` provider — bukan id order
 * kita. Agar event (`delivered`/`bounced`/`complained`) dapat dikorelasikan,
 * tiap email yang BERHASIL dikirim dicatat ke koleksi indeks `email_sends`
 * dengan **doc id = id Resend** (lookup O(1) saat webhook datang).
 *
 * Prinsip:
 * - **Best-effort**: semua penulisan tidak pernah menggagalkan alur order.
 * - **Tanpa PII di log**: hanya id/status/tipe event; alamat email hanya
 *   disimpan di dokumen (tidak di-log).
 * - Indeks kedaluwarsa secara alami bila dokumen lama dibersihkan; tidak ada
 *   penjadwalan di sini.
 */

/** Koleksi indeks pengiriman (doc id = id email Resend). */
const SENDS_COLLECTION = "email_sends";
/** Subkoleksi riwayat email per order (`EM-P1`, sama seperti `email-status`). */
const EMAILS_SUBCOLLECTION = "emails";

export type EmailSendIndex = {
  resendId: string;
  orderId: string;
  kind: string;
  to: string;
};

/**
 * Catat satu pengiriman yang BERHASIL (punya id Resend) ke indeks. Best-effort.
 * Idempoten: menulis ulang id yang sama hanya memperbarui field yang sama.
 */
export async function indexEmailSend(
  resendId: string,
  entry: { orderId: string; kind: string; to: string },
): Promise<void> {
  if (!resendId || !entry.orderId) return;
  const db = getAdminDb();
  if (!db) return;
  try {
    await db
      .collection(SENDS_COLLECTION)
      .doc(resendId)
      .set(
        {
          resendId,
          orderId: entry.orderId,
          kind: entry.kind,
          to: entry.to,
          provider: "resend",
          sentAtISO: new Date().toISOString(),
        },
        { merge: true },
      );
  } catch (err) {
    console.error("[email-events] gagal mencatat indeks email:", err);
  }
}

/** Cari indeks pengiriman dari id email Resend. Best-effort (null bila tak ada). */
export async function getEmailSend(resendId: string): Promise<EmailSendIndex | null> {
  if (!resendId) return null;
  const db = getAdminDb();
  if (!db) return null;
  try {
    const snap = await db.collection(SENDS_COLLECTION).doc(resendId).get();
    if (!snap.exists) return null;
    const d = snap.data() as Record<string, unknown>;
    const orderId = String(d.orderId ?? "");
    if (!orderId) return null;
    return {
      resendId,
      orderId,
      kind: String(d.kind ?? ""),
      to: String(d.to ?? ""),
    };
  } catch (err) {
    console.error("[email-events] gagal membaca indeks email:", err);
    return null;
  }
}

/**
 * Terapkan event pengiriman dari webhook provider.
 *
 * - Memperbarui dokumen indeks (`deliveryStatus`, `lastEvent`).
 * - Menambah satu entri riwayat ke `orders/{orderId}/emails` (status nyata
 *   `delivered`/`bounced`/…) agar admin dapat melihat pantulan/bounce.
 * - Best-effort: tidak pernah melempar. Mengembalikan apakah event cocok
 *   dengan email yang kita kenal (untuk observability).
 */
export async function recordEmailDelivery(input: {
  resendId: string;
  outcome: ResendOutcome;
  eventType: string;
}): Promise<{ matched: boolean; orderId: string | null }> {
  const status = deliveryStatusFor(input.outcome);
  if (!status || !input.resendId) return { matched: false, orderId: null };

  const db = getAdminDb();
  if (!db) return { matched: false, orderId: null };

  const index = await getEmailSend(input.resendId);
  if (!index) {
    // Event untuk email di luar jejak kita (mis. dikirim sebelum fitur ini ada).
    logEvent("resend_email_unmatched", {
      event: input.eventType,
      status,
    });
    return { matched: false, orderId: null };
  }

  const atISO = new Date().toISOString();
  try {
    await db
      .collection(SENDS_COLLECTION)
      .doc(input.resendId)
      .set({ deliveryStatus: status, lastEvent: input.eventType, lastEventAtISO: atISO }, { merge: true });
  } catch (err) {
    console.error("[email-events] gagal memperbarui status pengiriman:", err);
  }

  try {
    await db
      .collection("orders")
      .doc(index.orderId)
      .collection(EMAILS_SUBCOLLECTION)
      .add({
        kind: index.kind || "email",
        to: index.to,
        status,
        event: input.eventType,
        error: null,
        attempt: 0,
        atISO,
      });
  } catch (err) {
    console.error("[email-events] gagal menulis riwayat pengiriman:", err);
  }

  logEvent("resend_email_event", {
    event: input.eventType,
    status,
    matched: true,
  });
  return { matched: true, orderId: index.orderId };
}
