import "server-only";
import {
  getExpiredPendingOrders,
  markOrderExpired,
} from "@/lib/orders";
import { restoreCouponUsage } from "@/lib/coupons";
import { sendOrderStatusToBuyer } from "@/lib/email-order";
import { recordStatusEmail, logOrderEmail } from "@/lib/email-status";
import { getSiteSettings } from "@/lib/settings";
import { obs } from "@/lib/observability";

/**
 * KEDALUWARSA OTOMATIS order `menunggu_bayar` (FASE P2).
 *
 * Alur (best-effort, idempoten):
 * 1. Ambil order `menunggu_bayar` yang melewati `payment.expiresAt`.
 * 2. Tandai `kedaluwarsa` (`markOrderExpired`, idempoten).
 * 3. **Kembalikan kuota kupon** (`KP-C2`) — sekali per transisi.
 * 4. Kirim email "kedaluwarsa" ke pembeli (bila notifikasi aktif).
 *
 * Aman tanpa kredensial: tanpa Admin SDK → tidak ada yang diproses.
 * Mengembalikan ringkasan hasil untuk observability.
 */

/** TTL default (24 jam) bila invoice tidak menyimpan `expiresAt`. */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export type ExpireResult = {
  scanned: number;
  expired: number;
  couponsRestored: number;
  emailsSent: number;
  /** ID order yang berhasil ditandai kedaluwarsa (untuk log/audit). */
  expiredIds: string[];
};

export async function expirePendingOrders(
  now: Date = new Date(),
): Promise<ExpireResult> {
  const result: ExpireResult = {
    scanned: 0,
    expired: 0,
    couponsRestored: 0,
    emailsSent: 0,
    expiredIds: [],
  };

  const candidates = await getExpiredPendingOrders(now, DEFAULT_TTL_MS);
  result.scanned = candidates.length;
  if (candidates.length === 0) return result;

  // Preferensi notifikasi pembeli (dibaca sekali).
  let notifyBuyer = false;
  try {
    const settings = await getSiteSettings();
    notifyBuyer = settings.notifyBuyerOnStatus;
  } catch (err) {
    console.error("[order-expiry] gagal memuat pengaturan:", err);
  }

  for (const order of candidates) {
    try {
      const { applied, order: updated } = await markOrderExpired(order.id);
      if (!applied || !updated) continue;
      result.expired += 1;
      result.expiredIds.push(order.id);

      // `KP-C2`: kembalikan kuota kupon satu kali pada transisi terminal ini.
      if (updated.coupon?.couponId) {
        try {
          await restoreCouponUsage(updated.coupon.couponId, updated.uid);
          result.couponsRestored += 1;
        } catch (err) {
          console.error("[order-expiry] gagal mengembalikan kuota kupon:", err);
        }
      }

      // Email "kedaluwarsa" ke pembeli (best-effort, tidak menggagalkan batch).
      if (notifyBuyer) {
        try {
          const emailResult = await sendOrderStatusToBuyer(updated, "kedaluwarsa");
          await recordStatusEmail(updated.id, "kedaluwarsa", emailResult);
          await logOrderEmail(updated.id, {
            kind: "status",
            to: updated.buyerEmail,
            result: emailResult,
          });
          if (emailResult.ok) result.emailsSent += 1;
        } catch (err) {
          console.error("[order-expiry] gagal kirim email kedaluwarsa:", err);
        }
      }
    } catch (err) {
      console.error("[order-expiry] gagal memproses order:", order.id, err);
    }
  }

  if (result.expired > 0) {
    obs.orderExpired({ count: result.expired, couponsRestored: result.couponsRestored });
  }
  return result;
}
