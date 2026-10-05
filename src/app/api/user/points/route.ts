import { NextResponse } from "next/server";
import { requireActiveUser, requireUser } from "@/lib/admin-guard";
import { getPointsSummary, listPointsHistory, redeemPoints } from "@/lib/loyalty";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10 * 60 * 1000;

/** GET /api/user/points — saldo, tier, & riwayat poin. */
export async function GET(req: Request) {
  const check = await requireUser(req);
  if (!check.ok) return check.response;

  try {
    const [summary, history] = await Promise.all([
      getPointsSummary(check.uid),
      listPointsHistory(check.uid, 50),
    ]);
    return NextResponse.json({ summary, history });
  } catch (err) {
    console.error("[api/user/points] GET gagal:", err);
    return NextResponse.json({ error: "Gagal memuat poin." }, { status: 500 });
  }
}

/**
 * POST /api/user/points — tukar poin menjadi kupon.
 * Body: { points: number } (harus salah satu paket tukar).
 */
export async function POST(req: Request) {
  const check = await requireActiveUser(req);
  if (!check.ok) return check.response;

  const rl = rateLimit(`points:${check.uid}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: { points?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const points = Number(body.points);
  if (!Number.isFinite(points) || points <= 0) {
    return NextResponse.json({ error: "Poin tidak valid." }, { status: 400 });
  }

  try {
    const result = await redeemPoints(check.uid, Math.floor(points), check.email);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 409 });
    }
    return NextResponse.json({
      ok: true,
      code: result.code,
      value: result.value,
      balance: result.balance,
      message: `Kupon ${result.code} (Rp${result.value.toLocaleString("id-ID")}) berhasil dibuat.`,
    });
  } catch (err) {
    console.error("[api/user/points] POST gagal:", err);
    return NextResponse.json({ error: "Gagal menukar poin." }, { status: 500 });
  }
}
