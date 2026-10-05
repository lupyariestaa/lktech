import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { expirePendingOrders } from "@/lib/order-expiry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET/POST /api/cron/expire-orders — tandai order `menunggu_bayar` yang
 * kedaluwarsa → `kedaluwarsa` + kembalikan kuota kupon (FASE P2).
 *
 * KEAMANAN: endpoint ini mengubah data, jadi WAJIB dilindungi.
 * - Bila `CRON_SECRET` diisi → verifikasi header `Authorization: Bearer <secret>`
 *   ATAU query `?token=<secret>`.
 * - Bila `CRON_SECRET` KOSONG → endpoint NONAKTIF (fail-closed, balas 503)
 *   agar tidak bisa dipicu sembarang orang. Ini disengaja.
 *
 * PENJADWALAN: panggil berkala dari cron EKSTERNAL (mis. cron-job.org,
 * GitHub Actions, UptimeRobot) tiap jam. CATATAN: fitur Vercel Cron bawaan
 * (`vercel.json` → `crons`) memerlukan plan Pro; pada plan Hobby deployment
 * akan GAGAL, jadi sengaja TIDAK memakai `vercel.json`.
 */
async function run(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // Fail-closed: tanpa secret, jangan pernah memproses (cegah penyalahgunaan).
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
    const result = await expirePendingOrders();
    return NextResponse.json(
      { ok: true, ...result, atISO: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/cron/expire-orders] gagal:", err);
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
