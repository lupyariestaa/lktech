import "server-only";
import type { LeadInput } from "@/lib/lead-schema";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.EMAIL_FROM ?? "LKTech <onboarding@resend.dev>";

/**
 * Apakah notifikasi email dikonfigurasi (Resend API key tersedia).
 */
export const isEmailConfigured = Boolean(apiKey);

/** Menerima notifikasi lead (dari env, fallback ke EMAIL_FROM). */
function getNotifyRecipients(): string[] {
  return (process.env.LEAD_NOTIFY_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * Mengirim email notifikasi lead baru via Resend HTTP API.
 * Best-effort: mengembalikan status, tidak melempar error ke pemanggil
 * (agar kegagalan email tidak menggagalkan penyimpanan lead).
 */
export async function sendLeadNotification(
  lead: LeadInput,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isEmailConfigured) return { ok: false, skipped: true };

  const recipients = getNotifyRecipients();
  if (recipients.length === 0) return { ok: false, skipped: true };

  const subject = `🔔 Lead baru: ${lead.name} — ${lead.service}`;
  const text = buildText(lead);
  const html = buildHtml(lead);

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        reply_to: lead.email,
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[email] Resend gagal:", res.status, errText);
      return { ok: false, error: `Resend ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    console.error("[email] gagal mengirim notifikasi:", err);
    return { ok: false, error: "network" };
  }
}

/** Email percobaan (untuk tombol test di dashboard). */
export async function sendTestEmail(
  to: string,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isEmailConfigured) return { ok: false, skipped: true };

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
        subject: "✅ Email notifikasi LKTech aktif",
        text: "Selamat! Notifikasi email lead LKTech berfungsi dengan baik.",
        html: `<div style="font-family:sans-serif;padding:24px">
          <h2 style="color:#004EDF;margin:0 0 8px">Notifikasi email aktif 🎉</h2>
          <p style="color:#334155">Konfigurasi Resend LKTech berfungsi dengan baik. Anda akan menerima email setiap ada lead baru dari form kontak.</p>
        </div>`,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${errText}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] gagal test:", err);
    return { ok: false, error: "network" };
  }
}

function buildText(lead: LeadInput): string {
  return [
    "Lead baru dari website LKTech",
    "",
    `Nama    : ${lead.name}`,
    `Email   : ${lead.email}`,
    `Telepon : ${lead.phone}`,
    `Layanan : ${lead.service}`,
    "",
    "Pesan:",
    lead.message,
  ].join("\n");
}

function buildHtml(lead: LeadInput): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 0;color:#64748b;font-size:14px;width:110px">${label}</td>
      <td style="padding:8px 0;color:#0a0f1e;font-size:14px;font-weight:600">${esc(value)}</td>
    </tr>`;

  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:linear-gradient(135deg,#004EDF,#003BB3);padding:24px">
        <h1 style="margin:0;color:#ffffff;font-size:20px">🔔 Lead Baru — LKTech</h1>
      </div>
      <div style="padding:24px">
        <table style="width:100%;border-collapse:collapse">
          ${row("Nama", lead.name)}
          ${row("Email", lead.email)}
          ${row("Telepon", lead.phone)}
          ${row("Layanan", lead.service)}
        </table>
        <div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:12px;border-left:3px solid #004EDF">
          <p style="margin:0;color:#334155;font-size:14px;white-space:pre-wrap">${esc(lead.message)}</p>
        </div>
        <div style="margin-top:24px">
          <a href="mailto:${esc(lead.email)}" style="display:inline-block;background:#004EDF;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600">Balas via Email</a>
        </div>
      </div>
      <div style="padding:16px 24px;background:#f8fafc;color:#94a3b8;font-size:12px">
        Dikirim otomatis dari website LKTech · ${new Date().toLocaleString("id-ID")}
      </div>
    </div>
  </div>`;
}
