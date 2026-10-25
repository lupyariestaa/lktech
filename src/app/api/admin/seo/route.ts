import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSearchConsoleReport } from "@/lib/search-console";
import { parseGscFilters, resolveReportRange } from "@/lib/search-console-pure";
import { recordAdminAudit } from "@/lib/admin-audit";
import { guardAdminMutation } from "@/lib/admin-rate-limit";
import { seoInsightActionSchema } from "@/lib/api-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ambang impresi minimum yang boleh dikirim klien (heuristik transparan). */
function parseMinImpressions(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(Math.floor(n), 0), 100_000);
}

/**
 * GET /api/admin/seo?days=28 — laporan Search Console (fase S6/D2/D3).
 * Fail-safe: bila belum dikonfigurasi, kembalikan `status:"not_configured"` +
 * panduan (bukan error), agar UI dapat menampilkan cara setup.
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
  const minImpressions = parseMinImpressions(params.get("minImpressions"));
  const report = await getSearchConsoleReport({
    ...range,
    filters,
    ...(minImpressions > 0 ? { insightConfig: { minImpressions, zeroClickMinImpressions: minImpressions } } : {}),
  });

  return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
}

/**
 * PATCH /api/admin/seo — catat tindak lanjut editorial atas satu insight.
 * Hanya mencatat keputusan admin (tidak ada perubahan konten otomatis).
 */
export async function PATCH(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const limited = await guardAdminMutation(check.uid, "seo.insight_action", { limit: 60 });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = seoInsightActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  const { insightId, rule, kind, subject, decision, reason } = parsed.data;
  await recordAdminAudit({
    action: "seo.insight_action",
    actor: check.email,
    target: subject,
    meta: {
      insightId,
      rule,
      kind,
      decision,
      ...(reason ? { reason } : {}),
    },
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
