import "server-only";
import { SITE } from "@/lib/site";
import {
  RESEND_ENDPOINT,
  getResendApiKey,
  getFromEmail,
  getReplyTo,
} from "@/lib/email-config";

/**
 * BROADCAST EMAIL (Tema 2.2, FASE R2) — kirim email promo/konten ke daftar
 * penerima via Resend. Best-effort; mengembalikan ringkasan hasil.
 *
 * Catatan pembatasan Resend: email HANYA terkirim ke alamat terdaftar bila
 * domain belum diverifikasi (lihat TASK). Ini tetap berguna untuk uji & audiens
 * kecil, dan otomatis berfungsi penuh setelah domain diverifikasi.
 */

const apiKey = getResendApiKey();
const fromEmail = getFromEmail();
const replyTo = getReplyTo();

export type BroadcastResult = {
  ok: boolean;
  skipped?: boolean;
  sent: number;
  failed: number;
  error?: string;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Ubah teks ber-newline menjadi paragraf HTML. */
function bodyHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.65">${esc(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export function buildBroadcastHtml(params: {
  subject: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  unsubUrl: string;
}): string {
  const cta =
    params.ctaUrl && params.ctaLabel
      ? `<div style="margin-top:20px"><a href="${esc(params.ctaUrl)}" style="display:inline-block;background:#004EDF;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600">${esc(params.ctaLabel)}</a></div>`
      : "";
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:linear-gradient(135deg,#004EDF,#003BB3);padding:24px">
        <h1 style="margin:0;color:#ffffff;font-size:19px">${esc(params.subject)}</h1>
      </div>
      <div style="padding:24px">${bodyHtml(params.body)}${cta}</div>
      <div style="padding:16px 24px;background:#f8fafc;color:#94a3b8;font-size:12px">
        ${esc(SITE.name)} · <a href="${esc(SITE.url)}" style="color:#94a3b8">${esc(SITE.url)}</a><br/>
        Tidak ingin menerima email ini? <a href="${esc(params.unsubUrl)}" style="color:#94a3b8">Berhenti berlangganan</a>.
      </div>
    </div>
  </div>`;
}

/** Kirim satu email broadcast ke satu alamat. */
async function sendOne(
  to: string,
  subject: string,
  text: string,
  html: string,
): Promise<boolean> {
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        reply_to: replyTo,
        subject,
        text,
        html,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[email-broadcast] Resend gagal:", res.status, t);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email-broadcast] gagal:", err);
    return false;
  }
}

/**
 * Kirim broadcast ke daftar penerima. Untuk setiap penerima, tombol CTA sama,
 * hanya tautan unsubscribe yang dipersonalisasi (via `unsubUrlFor`).
 */
export async function sendBroadcast(params: {
  recipients: string[];
  subject: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Bangun tautan unsubscribe per email. */
  unsubUrlFor: (email: string) => string;
}): Promise<BroadcastResult> {
  if (!apiKey) return { ok: false, skipped: true, sent: 0, failed: 0 };
  if (params.recipients.length === 0) {
    return { ok: false, skipped: true, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  for (const to of params.recipients) {
    const unsubUrl = params.unsubUrlFor(to);
    const html = buildBroadcastHtml({
      subject: params.subject,
      body: params.body,
      ctaLabel: params.ctaLabel,
      ctaUrl: params.ctaUrl,
      unsubUrl,
    });
    const text = `${params.subject}\n\n${params.body}\n\n${
      params.ctaUrl ? `${params.ctaLabel ?? "Selengkapnya"}: ${params.ctaUrl}\n\n` : ""
    }Berhenti berlangganan: ${unsubUrl}\n\n${SITE.name}`;
    const ok = await sendOne(to, params.subject, text, html);
    if (ok) sent += 1;
    else failed += 1;
  }

  return { ok: failed === 0, sent, failed };
}
