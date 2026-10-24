import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { runBackupRestoreWorker } from "@/lib/backup-restore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET/POST /api/cron/backup-restore — worker job restore snapshot (ADM-12).
 *
 * Fail-closed seperti cron lain: butuh `CRON_SECRET`. Worker memproses
 * beberapa unit (snapshot/chunk) dalam batas waktu; UI juga dapat memanggil
 * langkah yang sama. Lock Firestore mencegah pemrosesan ganda.
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
  const queryToken = new URL(req.url).searchParams.get("token") ?? "";
  const provided = bearer || queryToken;

  if (provided !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!getAdminDb()) {
    return NextResponse.json(
      { ok: false, error: "admin_sdk_unavailable" },
      { status: 503 },
    );
  }

  try {
    const result = await runBackupRestoreWorker();
    return NextResponse.json(
      { ok: true, ...result, atISO: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/cron/backup-restore] gagal:", err);
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
