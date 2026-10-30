import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { reconcilePendingPayments } from "@/lib/payment-reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET/POST /api/cron/reconcile-payments — cocokkan invoice yang masih menunggu
 * dengan status sebenarnya di Mayar (F-09).
 *
 * Ini jaring pengaman: webhook `payment.received` tetap jalur utama. Bila webhook
 * hilang/gagal, order tidak lagi menggantung "Menunggu Bayar" selamanya.
 *
 * KEAMANAN: fail-closed seperti cron lain (`CRON_SECRET` wajib).
 * Hanya menandai lunas bila status invoice lunas DAN nominal sama persis.
 *
 * PENJADWALAN: tiap 15 menit dari cron eksternal (GitHub Actions).
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

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "admin_sdk_unavailable" },
      { status: 503 },
    );
  }

  try {
    const result = await reconcilePendingPayments();
    // Kegagalan sementara → 500 agar GitHub Actions menandai run merah.
    const failed = result.failed > 0;
    return NextResponse.json(
      { ok: !failed, ...result, atISO: new Date().toISOString() },
      {
        status: failed ? 500 : 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (err) {
    console.error("[api/cron/reconcile-payments] gagal:", err);
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