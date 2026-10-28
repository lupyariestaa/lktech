import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  getMayarApiHost,
  getMayarMode,
  getMayarWebhookDeliveries,
  isMayarConfigured,
} from "@/lib/mayar";
import {
  extractWebhookUrlToken,
  redactWebhookUrl,
  webhookTokensMatch,
} from "@/lib/webhook-url-pure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/payments/webhook-history — riwayat pengiriman webhook Mayar.
 *
 * Diagnostik read-only (fase S5): menampilkan apakah Mayar benar-benar mengirim
 * event pembayaran, ke URL mana, dan apa balasan endpoint kita. Berguna saat
 * pesanan tetap "Menunggu Bayar" walau invoice sudah lunas di Mayar.
 * TIDAK membocorkan API key; hanya metadata + ringkasan payload.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  if (!isMayarConfigured()) {
    return NextResponse.json(
      { configured: false, deliveries: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const raw = new URL(req.url).searchParams.get("limit");
  const parsed = Number(raw);
  const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 50) : 15;

  try {
    const deliveries = await getMayarWebhookDeliveries(limit);

    // Cocokkan token pada URL webhook terdaftar (dari pengiriman terbaru)
    // dengan token server — TANPA membocorkan keduanya.
    const latestWithUrl = deliveries.find((d) => d.urlDestination);
    const tokenMatches = latestWithUrl
      ? webhookTokensMatch(
          extractWebhookUrlToken(latestWithUrl.urlDestination),
          process.env.MAYAR_WEBHOOK_TOKEN,
        )
      : null;

    return NextResponse.json(
      {
        configured: true,
        mode: getMayarMode(),
        apiHost: getMayarApiHost(),
        tokenMatches,
        lastDestination: latestWithUrl
          ? redactWebhookUrl(latestWithUrl.urlDestination)
          : null,
        // Jangan kirim nilai token pada URL ke klien.
        deliveries: deliveries.map((d) => ({
          ...d,
          urlDestination: redactWebhookUrl(d.urlDestination),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/admin/payments/webhook-history] gagal:", err);
    return NextResponse.json(
      {
        configured: true,
        mode: getMayarMode(),
        apiHost: getMayarApiHost(),
        deliveries: [],
        error:
          err instanceof Error
            ? err.message
            : "Gagal mengambil riwayat webhook Mayar.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
