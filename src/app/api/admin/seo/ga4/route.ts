import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getGa4Report } from "@/lib/ga4";
import { resolveGa4Range } from "@/lib/ga4-pure";

import { isSeoFeatureEnabledFromEnv, seoFeatureDisabledResponse } from "@/lib/seo-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ALLOWED_PARAMS = new Set(["days", "startDate", "endDate"]);

/**
 * GET /api/admin/seo/ga4?days=28 — laporan Google Analytics 4 (fase D6).
 *
 * Endpoint TERPISAH dari Search Console agar asal data tidak kabur. Fail-safe:
 * bila belum dikonfigurasi, kembalikan `status:"not_configured"` + panduan
 * (bukan error). Tidak pernah menampilkan/mencatat secret.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  if (!isSeoFeatureEnabledFromEnv("ga4")) return seoFeatureDisabledResponse("ga4");

  const params = new URL(req.url).searchParams;
  for (const key of params.keys()) {
    if (!ALLOWED_PARAMS.has(key)) {
      return NextResponse.json({ error: "Parameter tidak dikenal." }, { status: 400 });
    }
    if (params.getAll(key).length > 1) {
      return NextResponse.json({ error: "Parameter ganda tidak diizinkan." }, { status: 400 });
    }
  }

  const hasCustomRange = params.has("startDate") || params.has("endDate");
  const range = resolveGa4Range({
    days: params.has("days") ? params.get("days") : undefined,
    startDate: hasCustomRange ? params.get("startDate") ?? "" : undefined,
    endDate: hasCustomRange ? params.get("endDate") ?? "" : undefined,
    now: new Date(),
  });
  if (!range) {
    return NextResponse.json({ error: "Rentang tanggal tidak valid atau melewati batas." }, { status: 400 });
  }

  const report = await getGa4Report(range);
  return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
}
