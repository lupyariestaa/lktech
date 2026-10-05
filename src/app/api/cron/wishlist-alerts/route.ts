import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { runWishlistAlerts } from "@/lib/wishlist-alert";
import { logEvent } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET/POST /api/cron/wishlist-alerts — kirim alert "harga turun"/"kembali
 * tersedia" untuk item wishlist (Tema 2.4, FASE R3). Fail-closed `CRON_SECRET`.
 *
 * Jadwalkan dari cron eksternal (mis. harian).
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
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const provided = bearer || new URL(req.url).searchParams.get("token") || "";
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

  try {
    const result = await runWishlistAlerts();
    logEvent("wishlist_alerts_run", {
      products: result.productsScanned,
      alerts: result.alertsDetected,
      sent: result.emailsSent,
      failed: result.failed,
    });
    return NextResponse.json(
      { ok: true, ...result, atISO: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/cron/wishlist-alerts] gagal:", err);
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
