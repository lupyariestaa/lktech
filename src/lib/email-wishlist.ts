import "server-only";
import { formatRupiah } from "@/lib/format";
import { SITE } from "@/lib/site";
import type { WishlistAlert } from "@/lib/wishlist-alert-pure";

/**
 * Email ALERT WISHLIST (Tema 2.4, FASE R3) — "harga turun" / "kembali tersedia".
 * Best-effort: tidak melempar.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.EMAIL_FROM ?? "LKTech <onboarding@resend.dev>";

export type WishlistEmailResult = { ok: boolean; skipped?: boolean; error?: string };

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Kirim email alert wishlist ke pembeli. */
export async function buildWishlistAlertEmail(params: {
  email: string;
  productName: string;
  alerts: WishlistAlert[];
  productUrl: string;
}): Promise<WishlistEmailResult> {
  if (!apiKey) return { ok: false, skipped: true };
  if (!params.email || !params.email.includes("@")) return { ok: false, skipped: true };

  const primary = params.alerts[0];
  const isStock = primary.type === "back_in_stock";
  const title = isStock
    ? `🎉 ${params.productName} kembali tersedia!`
    : `📉 Harga ${params.productName} turun!`;

  const detail = isStock
    ? `<p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.6">Produk yang Anda simpan di favorit kini <strong>tersedia kembali</strong>. Jangan sampai kehabisan!</p>`
    : `<p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.6">
        Harga produk favorit Anda turun:<br/>
        <span style="color:#94a3b8;text-decoration:line-through">${formatRupiah(primary.oldPrice)}</span>
        <strong style="color:#059669;font-size:16px;margin-left:8px">${formatRupiah(primary.newPrice)}</strong>
      </p>`;

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:linear-gradient(135deg,#004EDF,#003BB3);padding:24px">
        <h1 style="margin:0;color:#ffffff;font-size:19px">${esc(title)}</h1>
      </div>
      <div style="padding:24px">
        ${detail}
        <a href="${esc(params.productUrl)}" style="display:inline-block;background:#004EDF;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600">Lihat Produk</a>
      </div>
      <div style="padding:16px 24px;background:#f8fafc;color:#94a3b8;font-size:12px">
        Email otomatis dari ${esc(SITE.name)} · <a href="${esc(SITE.url)}/akun?tab=favorit" style="color:#94a3b8">Kelola favorit</a>
      </div>
    </div>
  </div>`;

  const text = `${title}\n\n${
    isStock ? "Produk favorit Anda kini tersedia kembali." : `Harga turun: ${formatRupiah(primary.oldPrice)} → ${formatRupiah(primary.newPrice)}.`
  }\n\nLihat produk: ${params.productUrl}\n\n${SITE.name}`;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [params.email],
        subject: title,
        text,
        html,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[email-wishlist] Resend gagal:", res.status, t);
      return { ok: false, error: `Resend ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email-wishlist] gagal:", err);
    return { ok: false, error: "network" };
  }
}
