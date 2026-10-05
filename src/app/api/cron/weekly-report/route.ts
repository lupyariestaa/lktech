import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { buildWeeklyReport } from "@/lib/weekly-report";
import { sendWeeklyReportEmail } from "@/lib/email-report";
import { obs } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET/POST /api/cron/weekly-report — kirim laporan bisnis mingguan ke admin
 * (Tema 3.3, FASE L4).
 *
 * KEAMANAN: fail-closed. Bila `CRON_SECRET` KOSONG → 503 (nonaktif). Verifikasi
 * header `Authorization: Bearer <secret>` ATAU query `?token=<secret>`.
 *
 * PENJADWALAN: cron EKSTERNAL (mis. cron-job.org / GitHub Actions), mingguan
 * (mis. tiap Senin 08:00). Opsi `?days=7` untuk mengubah jendela.
 */
async function run(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "cron_disabled", hint: "Set CRON_SECRET." },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  const url = new URL(req.url);
  const provided = bearer || url.searchParams.get("token") || "";
  if (provided !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "admin_sdk_unavailable" },
      { status: 503 },
    );
  }

  const daysRaw = Number(url.searchParams.get("days"));
  const days = Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 90 ? Math.floor(daysRaw) : 7;

  try {
    const report = await buildWeeklyReport(new Date(), days);
    const email = await sendWeeklyReportEmail(report);
    obs.weeklyReport({
      ok: email.ok,
      skipped: email.skipped ?? false,
      revenue: report.orders.revenue,
      orders: report.orders.total,
    });
    return NextResponse.json(
      { ok: true, email, report: { ...report, topProducts: report.topProducts } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/cron/weekly-report] gagal:", err);
    return NextResponse.json(
      { ok: false, error: "processing_failed" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
