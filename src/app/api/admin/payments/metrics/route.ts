import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getPaymentMetrics } from "@/lib/payment-analytics";
import { clampDays } from "@/lib/payment-metrics-pure";
import { isMayarConfigured, getMayarMode } from "@/lib/mayar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/payments/metrics — kesehatan & metrik pembayaran (fase S5).
 * `days` di-clamp ke rentang aman & dikembalikan apa adanya (gap G16).
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const raw = new URL(req.url).searchParams.get("days");
  const days = clampDays(raw);
  const metrics = await getPaymentMetrics(days);

  return NextResponse.json(
    {
      metrics,
      health: {
        configured: isMayarConfigured(),
        mode: getMayarMode(),
        webhookTokenSet: Boolean(process.env.MAYAR_WEBHOOK_TOKEN?.trim()),
      },
      days,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
