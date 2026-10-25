import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSearchConsoleReport } from "@/lib/search-console";
import { parseGscFilters, resolveReportRange } from "@/lib/search-console-pure";

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

  const params = new URL(req.url).searchParams;
  const filters = parseGscFilters(params);
  if (!filters) return NextResponse.json({ error: "Filter Search Console tidak valid." }, { status: 400 });
  const hasCustomRange = params.has("startDate") || params.has("endDate");
  const range = resolveReportRange({
    days: params.has("days") ? params.get("days") : undefined,
    startDate: hasCustomRange ? params.get("startDate") ?? "" : undefined,
    endDate: hasCustomRange ? params.get("endDate") ?? "" : undefined,
    now: new Date(),
  });
  if (!range) return NextResponse.json({ error: "Rentang tanggal tidak valid atau melewati batas." }, { status: 400 });
  const report = await getSearchConsoleReport({ ...range, filters });

  return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
}
