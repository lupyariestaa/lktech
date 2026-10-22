import "server-only";
import * as Sentry from "@sentry/nextjs";
import { getAdminDb } from "@/lib/firebase-admin";
import { decideBroadcastQuota } from "@/lib/broadcast-quota-pure";

/**
 * GUARD & ALARM KUOTA BROADCAST (ADM-07).
 *
 * Hitungan email per hari (zona Asia/Jakarta) disimpan di
 * `broadcast_usage/{yyyy-mm-dd}`. Reservation dilakukan SEBELUM kirim:
 * - `BROADCAST_DAILY_QUOTA` kosong/0 → guard nonaktif (perilaku lama).
 * - Dipakai untuk menolak pengiriman yang akan melewati kuota.
 * - Saat pemakaian melewati 80%, kirim satu alarm Sentry (sekali per hari,
 *   karena `used` sudah melewati ambang pada request berikutnya).
 *
 * Reservation bersifat konservatif: bila pengiriman gagal setelah dicoba,
 * kuota tetap terhitung. Ini lebih aman daripada mengizinkan spam berulang.
 */

const COLLECTION = "broadcast_usage";
const ALERT_RATIO = 0.8;

export type BroadcastQuotaReservation =
  | {
      ok: true;
      used: number;
      limit: number;
      disabled?: boolean;
      alert?: boolean;
    }
  | {
      ok: false;
      code: "quota_exceeded" | "unavailable";
      used: number;
      limit: number;
      requested: number;
    };

function dailyLimit(): number {
  const n = Number(process.env.BROADCAST_DAILY_QUOTA ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function jakartaDayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Reservasi kuota email harian. `requested` = jumlah email yang akan dicoba. */
export async function reserveBroadcastQuota(
  requested: number,
): Promise<BroadcastQuotaReservation> {
  const limit = dailyLimit();
  if (limit <= 0) {
    return { ok: true, disabled: true, used: 0, limit: 0 };
  }

  const db = getAdminDb();
  if (!db) {
    return { ok: false, code: "unavailable", used: 0, limit, requested };
  }

  const day = jakartaDayKey();
  const ref = db.collection(COLLECTION).doc(day);
  const nowISO = new Date().toISOString();

  let result: BroadcastQuotaReservation;
  try {
    result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const usedRaw = snap.exists ? Number(snap.get("emails") ?? 0) : 0;
      const decision = decideBroadcastQuota(usedRaw, requested, limit);

      if (!decision.ok) return decision;

      tx.set(
        ref,
        {
          date: day,
          emails: decision.used,
          updatedAtISO: nowISO,
          ...(decision.alert ? { alertAtISO: nowISO } : {}),
        },
        { merge: true },
      );
      return decision;
    });
  } catch (err) {
    console.error("[broadcast-quota] gagal reservasi kuota:", err);
    return { ok: false, code: "unavailable", used: 0, limit, requested };
  }

  if (result.ok && result.alert) {
    try {
      Sentry.captureMessage(
        `Kuota broadcast harian mendekati batas (${result.used}/${result.limit}, ambang ${ALERT_RATIO * 100}%).`,
        {
          level: "warning",
          tags: { area: "broadcast-quota" },
          extra: { used: result.used, limit: result.limit },
        },
      );
    } catch {
      /* alarm tidak boleh menggagalkan pengiriman */
    }
  }

  return result;
}
