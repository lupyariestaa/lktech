import "server-only";
import type { LeadInput } from "@/lib/lead-schema";
import type { Order } from "@/lib/order-types";
import { formatRupiah, shortOrderCode } from "@/lib/format";

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

/**
 * Mengirim email notifikasi pesanan baru via Resend (best-effort).
 * Tidak melempar error — kegagalan email tidak boleh menggagalkan checkout.
 */
export async function sendOrderNotification(
  order: Order,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isEmailConfigured) return { ok: false, skipped: true };

  const recipients = getNotifyRecipients();
  if (recipients.length === 0) return { ok: false, skipped: true };

  const subject = `🛒 Pesanan baru ${shortOrderCode(order.id)} — ${formatRupiah(order.total)}`;

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
        reply_to: order.buyerEmail || undefined,
        subject,
        text: buildOrderText(order),
        html: buildOrderHtml(order),
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[email] Resend (order) gagal:", res.status, errText);
      return { ok: false, error: `Resend ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] gagal mengirim notifikasi pesanan:", err);
    return { ok: false, error: "network" };
  }
}

/** Email percobaan (untuk tombol test di dashboard). */
export async function sendTestEmail(  to: string,
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
      // Detail provider hanya di-log (server), TIDAK diteruskan ke klien.
      console.error("[email] test Resend gagal:", res.status, errText);
      return {
        ok: false,
        error: `Gagal mengirim (kode ${res.status}). Periksa konfigurasi Resend.`,
      };
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

function buildOrderText(order: Order): string {
  const items = order.items
    .map(
      (it) =>
        `- ${it.name}${it.variantName ? ` (${it.variantName})` : ""} ×${it.qty} = ${formatRupiah(it.subtotal)}`,
    )
    .join("\n");
  return [
    `Pesanan baru dari website LKTech (${shortOrderCode(order.id)})`,
    "",
    `Pembeli : ${order.buyerName || "-"}`,
    `Email   : ${order.buyerEmail}`,
    "",
    "Item:",
    items || "-",
    "",
    `Total   : ${formatRupiah(order.total)}`,
  ].join("\n");
}

function buildOrderHtml(order: Order): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const itemRows = order.items
    .map((it) => {
      const name = esc(it.name) + (it.variantName ? ` <span style="color:#64748b">(${esc(it.variantName)})</span>` : "");
      return `<tr>
        <td style="padding:8px 0;color:#0a0f1e;font-size:14px">${name} <span style="color:#64748b">×${it.qty}</span></td>
        <td style="padding:8px 0;color:#0a0f1e;font-size:14px;font-weight:600;text-align:right;white-space:nowrap">${formatRupiah(it.subtotal)}</td>
      </tr>`;
    })
    .join("");

  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:linear-gradient(135deg,#004EDF,#003BB3);padding:24px">
        <h1 style="margin:0;color:#ffffff;font-size:20px">🛒 Pesanan Baru — LKTech</h1>
        <p style="margin:6px 0 0;color:#dbe6ff;font-size:13px">${shortOrderCode(order.id)} · ${formatRupiah(order.total)}</p>
      </div>
      <div style="padding:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#64748b;font-size:14px;width:90px">Pembeli</td><td style="padding:6px 0;color:#0a0f1e;font-size:14px;font-weight:600">${esc(order.buyerName || "-")}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:14px">Email</td><td style="padding:6px 0;color:#0a0f1e;font-size:14px;font-weight:600">${esc(order.buyerEmail)}</td></tr>
        </table>
        <div style="margin-top:16px;padding:8px 0;border-top:1px solid #e2e8f0">
          <table style="width:100%;border-collapse:collapse">${itemRows}</table>
        </div>
        <div style="margin-top:8px;padding-top:12px;border-top:2px solid #004EDF;display:flex;justify-content:space-between">
          <strong style="color:#0a0f1e;font-size:15px">Total</strong>
          <strong style="color:#004EDF;font-size:15px;float:right">${formatRupiah(order.total)}</strong>
        </div>
        <p style="margin:20px 0 0;color:#64748b;font-size:13px">Kelola pesanan ini di dashboard: <strong>Pesanan</strong>.</p>
      </div>
      <div style="padding:16px 24px;background:#f8fafc;color:#94a3b8;font-size:12px">
        Dikirim otomatis dari website LKTech · ${new Date().toLocaleString("id-ID")}
      </div>
    </div>
  </div>`;
}
