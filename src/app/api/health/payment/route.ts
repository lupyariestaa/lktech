import { NextResponse } from "next/server";
import { isMayarConfigured, getMayarMode } from "@/lib/mayar";
import { isDownloadConfigured } from "@/lib/downloads";
import { isBuyerEmailConfigured } from "@/lib/email-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health/payment — status konfigurasi pembayaran/unduhan/email.
 *
 * TIDAK membocorkan rahasia apa pun — hanya boolean apakah env terisi, agar
 * pemilik dapat mendiagnosis kenapa checkout jatuh ke alur WhatsApp.
 */
export function GET() {
  return NextResponse.json({
    mayar: {
      /** true = MAYAR_API_KEY terisi → invoice otomatis aktif. */
      configured: isMayarConfigured(),
      mode: getMayarMode(),
      /** true = verifikasi token webhook diaktifkan. */
      webhookTokenSet: Boolean(process.env.MAYAR_WEBHOOK_TOKEN?.trim()),
    },
    download: { configured: isDownloadConfigured() },
    email: { configured: isBuyerEmailConfigured },
  });
}
