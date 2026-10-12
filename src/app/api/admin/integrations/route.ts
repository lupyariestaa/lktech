import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { isMayarConfigured, getMayarMode } from "@/lib/mayar";
import { isDownloadConfigured } from "@/lib/downloads";
import { isBuyerEmailConfigured } from "@/lib/email-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/integrations — status konfigurasi integrasi (tanpa rahasia).
 * Fase S5. Hanya boolean/mode; TIDAK membocorkan nilai env.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const cloudinary =
    Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim()) &&
    Boolean(process.env.CLOUDINARY_API_KEY?.trim()) &&
    Boolean(process.env.CLOUDINARY_API_SECRET?.trim());
  const upstash =
    Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim()) &&
    Boolean(process.env.UPSTASH_REDIS_REST_TOKEN?.trim());

  return NextResponse.json(
    {
      mayar: {
        configured: isMayarConfigured(),
        mode: getMayarMode(),
        webhookTokenSet: Boolean(process.env.MAYAR_WEBHOOK_TOKEN?.trim()),
      },
      email: { configured: isBuyerEmailConfigured },
      cloudinary: { configured: cloudinary },
      upstash: { configured: upstash },
      cron: { configured: Boolean(process.env.CRON_SECRET?.trim()) },
      download: { configured: isDownloadConfigured() },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
