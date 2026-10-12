import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSearchConsoleReport } from "@/lib/search-console";
import { clampDays } from "@/lib/payment-metrics-pure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/seo?days=28 — laporan Search Console (fase S6).
 * Fail-safe: bila belum dikonfigurasi, kembalikan `configured:false` + panduan
 * (bukan error), agar UI dapat menampilkan cara setup.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const days = clampDays(new URL(req.url).searchParams.get("days"));
  const report = await getSearchConsoleReport(days);

  return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
}
