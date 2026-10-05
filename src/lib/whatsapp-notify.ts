import "server-only";
import { formatRupiah } from "@/lib/format";

/**
 * NOTIFIKASI WHATSAPP (Tema 2.3, FASE R4) — abstraksi OPSIONAL & FAIL-SAFE.
 *
 * Aktif HANYA bila kredensial WhatsApp Cloud API tersedia:
 * - `WHATSAPP_ACCESS_TOKEN` (WA Business Cloud API token)
 * - `WHATSAPP_PHONE_NUMBER_ID` (id nomor pengirim)
 *
 * Bila kosong → `isWhatsAppConfigured()` false & semua kirim menjadi no-op
 * (tidak error, tidak menggagalkan alur). Ini menjaga proyek tetap berjalan
 * tanpa akun WA Business, sambil siap begitu kredensial diisi.
 */

const GRAPH_VERSION = "v20.0";

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    (process.env.WHATSAPP_ACCESS_TOKEN ?? "").trim() &&
      (process.env.WHATSAPP_PHONE_NUMBER_ID ?? "").trim(),
  );
}

export type WhatsAppResult = { ok: boolean; skipped?: boolean; error?: string };

/**
 * Kirim pesan teks WhatsApp ke nomor tujuan (format internasional tanpa `+`,
 * mis. "6281234567890"). Best-effort: tidak melempar.
 */
export async function sendWhatsAppText(
  to: string,
  body: string,
): Promise<WhatsAppResult> {
  if (!isWhatsAppConfigured()) return { ok: false, skipped: true };
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!.trim();
  const token = process.env.WHATSAPP_ACCESS_TOKEN!.trim();
  const digits = (to ?? "").replace(/[^\d]/g, "");
  if (digits.length < 8) return { ok: false, skipped: true };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: digits,
          type: "text",
          text: { body: body.slice(0, 4000) },
        }),
        cache: "no-store",
      },
    );
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[whatsapp] gagal kirim:", res.status, t);
      return { ok: false, error: `WA ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[whatsapp] error:", err);
    return { ok: false, error: "network" };
  }
}

/** Notifikasi WhatsApp update status pesanan (opsional, best-effort). */
export async function notifyWhatsAppOrderStatus(
  to: string,
  orderCode: string,
  statusLabel: string,
  total: number,
): Promise<WhatsAppResult> {
  const body = `LKTech: Pesanan ${orderCode} kini berstatus "${statusLabel}". Total ${formatRupiah(
    total,
  )}. Terima kasih!`;
  return sendWhatsAppText(to, body);
}
