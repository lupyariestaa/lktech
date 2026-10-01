import { NextResponse } from "next/server";
import { bearerToken, requireAdmin } from "@/lib/admin-guard";
import {
  createAdminSessionCookie,
  setSessionCookie,
  clearSessionCookie,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIVE_DAYS_SECONDS = 5 * 24 * 60 * 60;

/**
 * POST /api/admin/session
 * Membuat session cookie (HttpOnly) setelah memverifikasi bahwa pemanggil
 * benar-benar admin. Cookie ini dipakai middleware untuk gate `/admin/*`
 * (defense-in-depth; verifikasi kriptografis tetap di API).
 */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const idToken = bearerToken(req);
  if (!idToken) {
    return NextResponse.json({ error: "Token tidak ditemukan." }, { status: 401 });
  }

  try {
    const sessionCookie = await createAdminSessionCookie(idToken);
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Session tidak dapat dibuat (Admin SDK belum dikonfigurasi)." },
        { status: 503 },
      );
    }
    const res = NextResponse.json({ ok: true });
    setSessionCookie(res, sessionCookie, FIVE_DAYS_SECONDS);
    return res;
  } catch (err) {
    console.error("[api/admin/session] gagal membuat sesi:", err);
    return NextResponse.json(
      { error: "Gagal membuat sesi admin." },
      { status: 500 },
    );
  }
}

/** DELETE /api/admin/session — hapus session cookie (logout). */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
