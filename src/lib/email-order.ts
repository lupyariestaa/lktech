import "server-only";
import type { Order, OrderStatus } from "@/lib/order-types";
import { ORDER_STATUS_LABEL } from "@/lib/order-types";
import { formatRupiah, shortOrderCode } from "@/lib/format";
import { SITE } from "@/lib/site";

/**
 * Email TRANSAKSIONAL ke PEMBELI (berbeda dari notifikasi admin di `email.ts`).
 *
 * Dua jenis:
 * - `sendOrderConfirmationToBuyer(order)` — dikirim saat checkout berhasil.
 * - `sendOrderStatusToBuyer(order, status)` — dikirim saat admin mengubah status.
 *
 * Prinsip:
 * - **Best-effort**: TIDAK melempar error (kegagalan email tidak boleh
 *   menggagalkan checkout / update status). Mengembalikan hasil.
 * - Penerima SELALU `order.buyerEmail` (dari token terverifikasi), bukan input
 *   bebas.
 * - Semua teks dinamis di-escape untuk HTML (anti-XSS).
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.EMAIL_FROM ?? "LKTech <onboarding@resend.dev>";
/** Alamat balasan (agar jawaban pembeli masuk ke admin, bukan ke diri sendiri). */
const replyTo = process.env.ORDER_REPLY_TO || process.env.SMTP_REPLY_TO || undefined;

export type EmailResult = { ok: boolean; skipped?: boolean; error?: string };

/** Apakah pengiriman email dikonfigurasi. */
export const isBuyerEmailConfigured = Boolean(apiKey);

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Kirim satu email via Resend (best-effort). */
async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<EmailResult> {
  if (!isBuyerEmailConfigured) return { ok: false, skipped: true };
  if (!params.to || !params.to.includes("@")) return { ok: false, skipped: true };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [params.to],
        reply_to: replyTo,
        subject: params.subject,
        text: params.text,
        html: params.html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[email-order] Resend gagal:", res.status, errText);
      return { ok: false, error: `Resend ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email-order] gagal mengirim:", err);
    return { ok: false, error: "network" };
  }
}

/* -------------------------------------------------------------------------- */
/* Template bersama                                                            */
/* -------------------------------------------------------------------------- */

/** Baris item pesanan (HTML). */
function itemsRowsHtml(order: Order): string {
  return order.items
    .map((it) => {
      const variant = it.variantName
        ? ` <span style="color:#64748b">(${esc(it.variantName)})</span>`
        : "";
      return `<tr>
        <td style="padding:8px 0;color:#0a0f1e;font-size:14px">${esc(it.name)}${variant} <span style="color:#64748b">×${it.qty}</span></td>
        <td style="padding:8px 0;color:#0a0f1e;font-size:14px;font-weight:600;text-align:right;white-space:nowrap">${formatRupiah(it.subtotal)}</td>
      </tr>`;
    })
    .join("");
}

/** Blok dasar email (header ber-brand + konten + footer). */
function emailShell(params: {
  headerTitle: string;
  headerSubtitle?: string;
  bodyHtml: string;
}): string {
  const subtitle = params.headerSubtitle
    ? `<p style="margin:6px 0 0;color:#dbe6ff;font-size:13px">${esc(params.headerSubtitle)}</p>`
    : "";
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:linear-gradient(135deg,#004EDF,#003BB3);padding:24px">
        <h1 style="margin:0;color:#ffffff;font-size:20px">${esc(params.headerTitle)}</h1>
        ${subtitle}
      </div>
      <div style="padding:24px">${params.bodyHtml}</div>
      <div style="padding:16px 24px;background:#f8fafc;color:#94a3b8;font-size:12px">
        Email otomatis dari <strong>${esc(SITE.name)}</strong> · <a href="${SITE.url}" style="color:#94a3b8">${esc(SITE.url)}</a><br/>
        Jangan balas email ini? Hubungi kami via WhatsApp atau website.
      </div>
    </div>
  </div>`;
}

/** Tombol CTA. */
function button(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;background:#004EDF;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:600">${esc(label)}</a>`;
}

function instansiFooter(order: Order): string {
  return `<div style="margin-top:20px;padding-top:14px;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px">
    Kode pesanan: <strong style="color:#0a0f1e">${shortOrderCode(order.id)}</strong>
  </div>`;
}

/* -------------------------------------------------------------------------- */
/* 1. Konfirmasi pesanan                                                       */
/* -------------------------------------------------------------------------- */

/** Susun teks polos konfirmasi (fallback klien email tanpa HTML). */
function confirmationText(order: Order): string {
  const items = order.items
    .map(
      (it) =>
        `- ${it.name}${it.variantName ? ` (${it.variantName})` : ""} ×${it.qty} = ${formatRupiah(it.subtotal)}`,
    )
    .join("\n");
  return [
    `Halo ${order.buyerName || "Pelanggan"},`,
    "",
    "Terima kasih! Pesanan Anda sudah kami terima.",
    "",
    `Kode pesanan : ${shortOrderCode(order.id)}`,
    `Total        : ${formatRupiah(order.total)}`,
    "",
    "Item:",
    items || "-",
    "",
    "Langkah selanjutnya: kami akan memproses pesanan Anda dan menghubungi",
    "Anda via WhatsApp untuk konfirmasi & pembayaran.",
    "",
    `Lihat pesanan Anda: ${SITE.url}/akun?tab=pesanan`,
    "",
    `${SITE.name}`,
  ].join("\n");
}

function confirmationHtml(order: Order): string {
  const body = `
    <p style="margin:0 0 6px;color:#0a0f1e;font-size:15px;font-weight:700">Halo ${esc(order.buyerName || "Pelanggan")},</p>
    <p style="margin:0 0 18px;color:#334155;font-size:14px;line-height:1.6">Terima kasih! Pesanan Anda sudah kami terima dan sedang menunggu diproses.</p>
    <div style="padding:8px 0;border-top:1px solid #e2e8f0">
      <table style="width:100%;border-collapse:collapse">${itemsRowsHtml(order)}</table>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-top:8px;padding-top:12px;border-top:2px solid #004EDF">
      <tr>
        <td style="padding-top:12px;color:#0a0f1e;font-size:15px;font-weight:700">Total</td>
        <td style="padding-top:12px;color:#004EDF;font-size:15px;font-weight:700;text-align:right">${formatRupiah(order.total)}</td>
      </tr>
    </table>
    <div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:12px;border-left:3px solid #004EDF">
      <p style="margin:0;color:#334155;font-size:13px;line-height:1.6">
        <strong>Langkah selanjutnya:</strong> kami akan memproses pesanan Anda dan menghubungi Anda via <strong>WhatsApp</strong> untuk konfirmasi &amp; pembayaran.
      </p>
    </div>
    <div style="margin-top:24px">${button(`${SITE.url}/akun?tab=pesanan`, "Lihat Pesanan Saya")}</div>
    ${instansiFooter(order)}
  `;
  return emailShell({
    headerTitle: "🛒 Pesanan Anda Diterima",
    headerSubtitle: `${shortOrderCode(order.id)} · ${formatRupiah(order.total)}`,
    bodyHtml: body,
  });
}

/**
 * Email konfirmasi pesanan ke pembeli (setelah checkout berhasil).
 * Best-effort — tidak melempar error.
 */
export async function sendOrderConfirmationToBuyer(
  order: Order,
): Promise<EmailResult> {
  return sendEmail({
    to: order.buyerEmail,
    subject: `Pesanan ${shortOrderCode(order.id)} diterima — ${SITE.name}`,
    text: confirmationText(order),
    html: confirmationHtml(order),
  });
}

/* -------------------------------------------------------------------------- */
/* 2. Update status                                                            */
/* -------------------------------------------------------------------------- */

type StatusCopy = {
  headerTitle: string;
  subject: string;
  intro: string;
  accent: string;
};

/** Teks & nada per status (status "baru" tidak dikirim dari jalur update). */
const STATUS_COPY: Record<Exclude<OrderStatus, "baru">, StatusCopy> = {
  diproses: {
    headerTitle: "⚙️ Pesanan Anda Sedang Diproses",
    subject: "sedang diproses",
    intro:
      "Kabar baik! Pesanan Anda sedang kami kerjakan. Kami akan segera menghubungi Anda bila ada yang perlu dikonfirmasi.",
    accent: "#D97706",
  },
  selesai: {
    headerTitle: "✅ Pesanan Anda Selesai",
    subject: "telah selesai",
    intro:
      "Terima kasih telah mempercayakan kebutuhan Anda kepada kami! Pesanan Anda telah selesai. Kami senang bisa membantu — jangan ragu menghubungi kami lagi kapan saja.",
    accent: "#059669",
  },
  dibatalkan: {
    headerTitle: "❌ Pesanan Dibatalkan",
    subject: "dibatalkan",
    intro:
      "Pesanan Anda telah dibatalkan. Bila ini tidak sesuai harapan Anda atau terjadi kekeliruan, silakan hubungi kami via WhatsApp agar dapat kami bantu.",
    accent: "#E11D48",
  },
};

function statusText(order: Order, status: Exclude<OrderStatus, "baru">): string {
  const copy = STATUS_COPY[status];
  return [
    `Halo ${order.buyerName || "Pelanggan"},`,
    "",
    `Status pesanan ${shortOrderCode(order.id)}: ${ORDER_STATUS_LABEL[status]}.`,
    "",
    copy.intro,
    "",
    `Lihat pesanan Anda: ${SITE.url}/akun?tab=pesanan`,
    "",
    `${SITE.name}`,
  ].join("\n");
}

function statusHtml(order: Order, status: Exclude<OrderStatus, "baru">): string {
  const copy = STATUS_COPY[status];
  const body = `
    <p style="margin:0 0 6px;color:#0a0f1e;font-size:15px;font-weight:700">Halo ${esc(order.buyerName || "Pelanggan")},</p>
    <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.6">${esc(copy.intro)}</p>
    <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px">
      <tr>
        <td style="padding:14px 16px;color:#64748b;font-size:13px">Status pesanan</td>
        <td style="padding:14px 16px;text-align:right">
          <span style="display:inline-block;background:${copy.accent};color:#ffffff;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px">${esc(ORDER_STATUS_LABEL[status])}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:0 16px 14px;color:#64748b;font-size:13px">Total</td>
        <td style="padding:0 16px 14px;color:#0a0f1e;font-size:14px;font-weight:700;text-align:right">${formatRupiah(order.total)}</td>
      </tr>
    </table>
    <div style="margin-top:24px">${button(`${SITE.url}/akun?tab=pesanan`, "Lihat Pesanan Saya")}</div>
    ${instansiFooter(order)}
  `;
  return emailShell({
    headerTitle: copy.headerTitle,
    headerSubtitle: `${shortOrderCode(order.id)} · ${ORDER_STATUS_LABEL[status]}`,
    bodyHtml: body,
  });
}

/**
 * Email update status pesanan ke pembeli.
 * Status "baru" dilewati (konfirmasi sudah dikirim saat checkout).
 * Best-effort — tidak melempar error.
 */
export async function sendOrderStatusToBuyer(
  order: Order,
  status: OrderStatus,
): Promise<EmailResult> {
  if (status === "baru") return { ok: false, skipped: true };

  const copy = STATUS_COPY[status];
  return sendEmail({
    to: order.buyerEmail,
    subject: `Pesanan ${shortOrderCode(order.id)} ${copy.subject} — ${SITE.name}`,
    text: statusText(order, status),
    html: statusHtml(order, status),
  });
}
