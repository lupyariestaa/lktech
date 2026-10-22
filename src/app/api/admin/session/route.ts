import { NextResponse, type NextRequest } from "next/server";
import { bearerToken, requireAdmin } from "@/lib/admin-guard";
import { getAdminAuth } from "@/lib/firebase-admin";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionCookie,
  setSessionCookie,
  clearSessionCookie,
  revokeAdminSessions,
  verifyAdminSessionCookie,
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

/**
 * Menentukan uid yang akan dicabut saat logout.
 *
 * Prioritas: Bearer ID token (dikirim klien) → session cookie (fallback bila
 * token sudah kedaluwarsa/tidak tersedia). Keduanya diverifikasi dengan
 * `checkRevoked = true`.
 */
async function resolveLogoutUid(req: NextRequest): Promise<string | null> {
  const token = bearerToken(req);
  const auth = getAdminAuth();
  if (token && auth) {
    try {
      const decoded = await auth.verifyIdToken(token, true);
      return decoded.uid;
    } catch {
      /* lanjut ke fallback cookie */
    }
  }

  const cookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifyAdminSessionCookie(cookie);
  return session?.uid ?? null;
}

/**
 * DELETE /api/admin/session — logout admin.
 *
 * Mencabut seluruh refresh token user (semua perangkat) lalu menghapus cookie.
 * Cookie tetap dihapus meski pencabutan gagal agar sesi lokal tidak tertinggal;
 * respons memuat `revoked` untuk observability.
 */
export async function DELETE(req: NextRequest) {
  const uid = await resolveLogoutUid(req);
  const revoked = uid ? await revokeAdminSessions(uid) : false;
  const res = NextResponse.json({ ok: true, revoked });
  clearSessionCookie(res);
  return res;
}
