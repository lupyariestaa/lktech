import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { backfillDailyAggregates } from "@/lib/analytics-daily";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET/POST /api/cron/analytics-daily — isi ulang agregat harian `AN-P3`.
 *
 * Menghitung ringkasan tiap hari (default 3 hari terakhir) ke
 * `analytics_daily/{yyyy-mm-dd}`. Idempoten (menimpa, bukan menambah), jadi aman
 * dijalankan berkali-kali. Lihat `/api/cron/expire-orders` untuk alasan
 * fail-closed + penjadwalan eksternal (Vercel Cron butuh plan Pro).
 *
 * Query opsional `?days=N` (1..90) untuk backfill rentang lebih panjang.
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
  const queryToken = url.searchParams.get("token") ?? "";
  const provided = bearer || queryToken;

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

  const rawDays = Number(url.searchParams.get("days"));
  const days = Number.isInteger(rawDays) && rawDays >= 1 && rawDays <= 90 ? rawDays : 3;

  try {
    const written = await backfillDailyAggregates(days);
    return NextResponse.json(
      { ok: true, days, written, atISO: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/cron/analytics-daily] gagal:", err);
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