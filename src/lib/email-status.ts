import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import type { EmailResult } from "@/lib/email-order";

/**
 * Pencatatan STATUS email transaksional pada dokumen order (`EM-C2`, `EM-C3`,
 * `R4/XL-4`). Tujuan:
 * - Observability: admin bisa melihat kapan & apakah email terkirim/gagal.
 * - Idempotensi: tidak mengirim ulang email status yang sama.
 *
 * Field yang ditulis (semua opsional, backward-compatible):
 * - `confirmationEmailAt` / `confirmationEmailStatus`
 * - `lastStatusEmailAt` / `lastStatusEmailStatus` / `lastNotifiedStatus`
 *
 * Penulisan best-effort: kegagalan TIDAK menggagalkan order/update status.
 */

export type EmailKind = "confirmation" | "status";

const FIELD: Record<
  EmailKind,
  { at: string; status: string }
> = {
  confirmation: { at: "confirmationEmailAt", status: "confirmationEmailStatus" },
  status: { at: "lastStatusEmailAt", status: "lastStatusEmailStatus" },
};

/** Ringkas hasil kirim menjadi string status tersimpan. */
function statusString(result: EmailResult): string {
  if (result.ok) return "sent";
  if (result.skipped) return "skipped";
  return "failed";
}

/**
 * Simpan status pengiriman email ke dokumen order. Best-effort (tidak melempar).
 */
export async function recordOrderEmailStatus(
  orderId: string,
  kind: EmailKind,
  result: EmailResult,
): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  const f = FIELD[kind];
  try {
    await db
      .collection("orders")
      .doc(orderId)
      .set(
        {
          [f.at]: new Date().toISOString(),
          [f.status]: statusString(result),
          [`${f.status}Error`]: result.ok ? null : (result.error ?? null),
        },
        { merge: true },
      );
  } catch (err) {
    console.error("[email-status] gagal menyimpan status email:", err);
  }
}

/**
 * Catat status email UPDATE STATUS + tandai status yang baru dinotifikasi
 * (`EM-C3`). Dipanggil setelah (mungkin) mengirim email ke pembeli.
 */
export async function recordStatusEmail(
  orderId: string,
  notifiedStatus: string,
  result: EmailResult,
): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  try {
    await db
      .collection("orders")
      .doc(orderId)
      .set(
        {
          lastStatusEmailAt: new Date().toISOString(),
          lastStatusEmailStatus: statusString(result),
          lastStatusEmailError: result.ok ? null : (result.error ?? null),
          lastNotifiedStatus: notifiedStatus,
        },
        { merge: true },
      );
  } catch (err) {
    console.error("[email-status] gagal menyimpan status email:", err);
  }
}

/* -------------------------------------------------------------------------- */
/* Riwayat email per order (`EM-P1`)                                           */
/* -------------------------------------------------------------------------- */

/** Satu entri riwayat pengiriman email sebuah order. */
export type OrderEmailLog = {
  id: string;
  /** Jenis: konfirmasi | status | resend. */
  kind: string;
  /** Penerima. */
  to: string;
  /** Status: sent | skipped | failed. */
  status: string;
  error?: string;
  /** Offset percobaan (0 = pengiriman awal; >0 = kirim ulang). */
  attempt: number;
  atISO: string;
};

const EMAILS_COLLECTION = "emails";

/**
 * Tulis satu entri riwayat email ke subkoleksi `orders/{id}/emails`.
 * Best-effort (tidak melempar).
 */
export async function logOrderEmail(
  orderId: string,
  entry: {
    kind: string;
    to: string;
    result: EmailResult;
    attempt?: number;
  },
): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  try {
    await db
      .collection("orders")
      .doc(orderId)
      .collection(EMAILS_COLLECTION)
      .add({
        kind: entry.kind,
        to: entry.to,
        status: statusString(entry.result),
        error: entry.result.ok ? null : (entry.result.error ?? null),
        attempt: entry.attempt ?? 0,
        atISO: new Date().toISOString(),
      });
  } catch (err) {
    console.error("[email-status] gagal menulis riwayat email:", err);
  }
}

/** Ambil riwayat email sebuah order (terbaru lebih dulu). Best-effort. */
export async function listOrderEmails(
  orderId: string,
  limit = 20,
): Promise<OrderEmailLog[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection("orders")
      .doc(orderId)
      .collection(EMAILS_COLLECTION)
      .limit(limit)
      .get();
    return snap.docs
      .map((doc) => {
        const d = doc.data() as Record<string, unknown>;
        return {
          id: doc.id,
          kind: String(d.kind ?? ""),
          to: String(d.to ?? ""),
          status: String(d.status ?? ""),
          error: typeof d.error === "string" ? d.error : undefined,
          attempt: typeof d.attempt === "number" ? d.attempt : 0,
          atISO: String(d.atISO ?? ""),
        } satisfies OrderEmailLog;
      })
      .sort((a, b) => b.atISO.localeCompare(a.atISO));
  } catch (err) {
    console.error("[email-status] gagal membaca riwayat email:", err);
    return [];
  }
}
