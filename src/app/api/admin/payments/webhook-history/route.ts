import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  getMayarApiHost,
  getMayarMode,
  getMayarWebhookDeliveries,
  isMayarConfigured,
} from "@/lib/mayar";

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
    return NextResponse.json(
      {
        configured: true,
        mode: getMayarMode(),
        apiHost: getMayarApiHost(),
        deliveries,
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
