import "server-only";
import { formatRupiah } from "@/lib/format";
import { SITE } from "@/lib/site";
import type { CartDraft } from "@/lib/cart-draft-pure";

/**
 * Email PENGINGAT KERANJANG (FASE P5) — transaksional, ke pembeli yang
 * meninggalkan keranjang (draft server) > 24 jam.
 *
 * Best-effort: TIDAK melempar error. Menyertakan deep-link kembali ke keranjang
 * + cara berhenti diingatkan (opt-out, dihormati).
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.EMAIL_FROM ?? "LKTech <onboarding@resend.dev>";
const replyTo = process.env.ORDER_REPLY_TO || process.env.SMTP_REPLY_TO || undefined;

export type CartEmailResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

/**
 * Bangun URL berhenti berlangganan (opt-out) bertanda tangan (HMAC).
 * `secret` dari env (fallback DISABLE: bila kosong, tautan tanpa signature
 * tetap dibuat tetapi endpoint opt-out akan menolak — lihat route).
 */
export function unsubscribeUrl(baseUrl: string, uid: string, signature: string): string {
  const u = new URL("/api/cart/unsubscribe", baseUrl);
  u.searchParams.set("uid", uid);
  u.searchParams.set("sig", signature);
  return u.toString();
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function itemsRowsHtml(draft: CartDraft): string {
  return draft.items
    .map(
      (it) => `<tr>
        <td style="padding:8px 0;color:#0a0f1e;font-size:14px">${esc(it.name || it.slug)} <span style="color:#64748b">×${it.qty}</span></td>
        <td style="padding:8px 0;color:#0a0f1e;font-size:14px;font-weight:600;text-align:right;white-space:nowrap">${formatRupiah(it.price * it.qty)}</td>
      </tr>`,
    )
    .join("");
}

function button(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;background:#004EDF;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600">${esc(label)}</a>`;
}

/**
 * Kirim email pengingat keranjang ke `draft.email`. Best-effort.
 * `cartUrl` = deep-link kembali (mis. `${SITE.url}/keranjang?ref=reminder`).
 * `unsubUrl` = tautan berhenti diingatkan.
 */
export async function sendCartReminderEmail(
  draft: CartDraft,
  cartUrl: string,
  unsubUrl: string,
): Promise<CartEmailResult> {
  if (!apiKey) return { ok: false, skipped: true };
  if (!draft.email || !draft.email.includes("@")) return { ok: false, skipped: true };

  const text = [
    `Halo ${draft.displayName || "Pelanggan"},`,
    "",
    "Sepertinya Anda belum menyelesaikan pesanan di LKTech. Produk berikut masih menunggu di keranjang Anda:",
    "",
    ...draft.items.map(
      (it) => `- ${it.name || it.slug} ×${it.qty} = ${formatRupiah(it.price * it.qty)}`,
    ),
    "",
    `Total perkiraan: ${formatRupiah(draft.subtotal)}`,
    "",
    `Lanjutkan checkout: ${cartUrl}`,
    "",
    `Berhenti diingatkan: ${unsubUrl}`,
    "",
    `${SITE.name}`,
  ].join("\n");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:linear-gradient(135deg,#004EDF,#003BB3);padding:24px">
        <h1 style="margin:0;color:#ffffff;font-size:20px">🛒 Keranjang Anda Masih Menunggu</h1>
      </div>
      <div style="padding:24px">
        <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.6">Halo ${esc(draft.displayName || "Pelanggan")}, sepertinya Anda belum menyelesaikan pesanan. Produk berikut masih tersimpan di keranjang Anda:</p>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0">${itemsRowsHtml(draft)}</table>
        <table style="width:100%;border-collapse:collapse;margin-top:8px;border-top:2px solid #004EDF">
          <tr>
            <td style="padding-top:12px;color:#0a0f1e;font-size:15px;font-weight:700">Total perkiraan</td>
            <td style="padding-top:12px;color:#004EDF;font-size:15px;font-weight:700;text-align:right">${formatRupiah(draft.subtotal)}</td>
          </tr>
        </table>
        <div style="margin-top:24px">${button(cartUrl, "Lanjutkan Checkout")}</div>
      </div>
      <div style="padding:16px 24px;background:#f8fafc;color:#94a3b8;font-size:12px">
        Email otomatis dari <strong>${esc(SITE.name)}</strong> · <a href="${esc(SITE.url)}" style="color:#94a3b8">${esc(SITE.url)}</a><br/>
        Tidak ingin diingatkan lagi? <a href="${esc(unsubUrl)}" style="color:#94a3b8">Berhenti diingatkan</a>.
      </div>
    </div>
  </div>`;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [draft.email],
        reply_to: replyTo,
        subject: `Keranjang Anda di ${SITE.name} masih menunggu`,
        text,
        html,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[email-cart] Resend gagal:", res.status, errText);
      return { ok: false, error: `Resend ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email-cart] gagal mengirim pengingat:", err);
    return { ok: false, error: "network" };
  }
}
