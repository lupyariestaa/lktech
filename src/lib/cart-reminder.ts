import "server-only";
import { signTokenId } from "@/lib/download-token";
import { SITE_URL } from "@/lib/site";
import { getSiteSettings } from "@/lib/settings";
import { listRemindableCarts, markCartReminded } from "@/lib/cart-draft";
import { sendCartReminderEmail, unsubscribeUrl } from "@/lib/email-cart";
import { obs } from "@/lib/observability";

/**
 * ORKESTRASI pengingat keranjang (FASE P5).
 *
 * Ambil draft "terbengkalai" (via `listRemindableCarts`) → kirim email pengingat
 * (best-effort) → tandai `remindedAtISO`. Idempoten via `shouldRemind` (cooldown).
 *
 * Aman: hormati opt-out & preferensi `notifyCartReminders` (site settings).
 */

/** Secret untuk menandatangani tautan opt-out (HMAC). */
function unsubSecret(): string {
  return (
    process.env.CART_UNSUB_SECRET?.trim() ||
    process.env.DOWNLOAD_TOKEN_SECRET?.trim() ||
    process.env.MAYAR_API_KEY?.trim() ||
    ""
  );
}

/** Tanda tangan `uid` untuk tautan opt-out (kosong → tanpa tanda tangan). */
export function signUnsub(uid: string): string {
  const secret = unsubSecret();
  return secret ? signTokenId(`cart-unsub:${uid}`, secret) : "";
}

export type CartReminderResult = {
  scanned: number;
  reminded: number;
  failed: number;
  skipped: number;
  ids: string[];
};

export async function sendCartReminders(
  now: Date = new Date(),
): Promise<CartReminderResult> {
  const result: CartReminderResult = {
    scanned: 0,
    reminded: 0,
    failed: 0,
    skipped: 0,
    ids: [],
  };

  // Preferensi notifikasi (dibaca sekali).
  try {
    const settings = await getSiteSettings();
    if (!settings.notifyCartReminders) return result;
  } catch (err) {
    console.error("[cart-reminder] gagal memuat pengaturan:", err);
    return result;
  }

  const drafts = await listRemindableCarts(now);
  result.scanned = drafts.length;
  if (drafts.length === 0) return result;

  const cartUrl = `${SITE_URL}/keranjang?ref=reminder`;

  for (const draft of drafts) {
    const sig = signUnsub(draft.uid);
    const unsub = unsubscribeUrl(SITE_URL, draft.uid, sig);
    try {
      const res = await sendCartReminderEmail(draft, cartUrl, unsub);
      if (res.ok) {
        await markCartReminded(draft.uid, now.toISOString());
        result.reminded += 1;
        result.ids.push(draft.uid);
      } else if (res.skipped) {
        result.skipped += 1;
      } else {
        result.failed += 1;
      }
    } catch (err) {
      console.error("[cart-reminder] gagal memproses draft:", draft.uid, err);
      result.failed += 1;
    }
  }

  if (result.reminded > 0 || result.failed > 0) {
    obs.cartReminded({ count: result.reminded, failed: result.failed });
  }
  return result;
}
