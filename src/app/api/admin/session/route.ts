import { NextResponse, type NextRequest } from "next/server";
import { bearerToken, requireAdmin } from "@/lib/admin-guard";
import {
  clearAdminLoginCookie,
  createAdminLoginToken,
  setAdminLoginCookie,
  verifyAdminLoginToken,
} from "@/lib/admin-login-cookie";
import { getAdminAuth } from "@/lib/firebase-admin";
import { isAdminEmail } from "@/lib/admins";
import { recordAdminAudit } from "@/lib/admin-audit";
import {
  ADMIN_IDLE_TIMEOUT_MS,
  ADMIN_LOGIN_COOKIE,
  ADMIN_SESSION_COOKIE,
} from "@/lib/session-constants";
import {
  createAdminSessionCookie,
  setSessionCookie,
  clearSessionCookie,
  revokeAdminSessions,
  verifyAdminSessionCookie,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_MAX_AGE_SECONDS = Math.floor(ADMIN_IDLE_TIMEOUT_MS / 1000);

/**
 * POST /api/admin/session
 * Membuat session cookie (HttpOnly) setelah memverifikasi bahwa pemanggil
 * benar-benar admin. Cookie ini dipakai middleware untuk gate `/admin/*`
 * (defense-in-depth; verifikasi kriptografis tetap di API).
 */
export async function POST(req: NextRequest) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const idToken = bearerToken(req);
  if (!idToken) {
    return NextResponse.json({ error: "Token tidak ditemukan." }, { status: 401 });
  }

  // Pertahankan login window awal bila cookie masih valid. Bila belum ada
  // (login baru), mulai window 12 jam sekarang. Cookie yang sudah kedaluwarsa
  // tidak dianggap valid; namun `requireAdmin` di atas sudah menolak token
  // dengan `auth_time` > 12 jam kecuali admin baru saja re-auth.
  const existingLogin = verifyAdminLoginToken(
    req.cookies.get(ADMIN_LOGIN_COOKIE)?.value,
    check.uid,
  );
  const loginAt = existingLogin?.loginAt ?? Date.now();
  const loginToken = createAdminLoginToken(check.uid, loginAt);
  if (!loginToken) {
    return NextResponse.json(
      { error: "Session tidak dapat dibuat (secret sesi belum tersedia)." },
      { status: 503 },
    );
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
    setSessionCookie(res, sessionCookie, SESSION_MAX_AGE_SECONDS);
    setAdminLoginCookie(res, loginToken, loginAt);
    // Hanya login baru yang dicatat; refresh keepalive tidak membanjiri audit.
    if (!existingLogin) {
      await recordAdminAudit({
        action: "admin.login",
        actor: check.email,
        target: check.uid,
        meta: { method: "google" },
      });
    }
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
async function resolveLogoutIdentity(
  req: NextRequest,
): Promise<{ uid: string; email: string } | null> {
  const token = bearerToken(req);
  const auth = getAdminAuth();
  if (token && auth) {
    try {
      const decoded = await auth.verifyIdToken(token, true);
      return { uid: decoded.uid, email: (decoded.email ?? "").toLowerCase() };
    } catch {
      /* lanjut ke fallback cookie */
    }
  }

  const cookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifyAdminSessionCookie(cookie);
  return session ? { uid: session.uid, email: session.email } : null;
}

/**
 * DELETE /api/admin/session — logout admin.
 *
 * Mencabut seluruh refresh token user (semua perangkat) lalu menghapus cookie.
 * Cookie tetap dihapus meski pencabutan gagal agar sesi lokal tidak tertinggal;
 * respons memuat `revoked` untuk observability.
 */
export async function DELETE(req: NextRequest) {
  const identity = await resolveLogoutIdentity(req);
  const uid = identity?.uid ?? null;
  const revoked = uid ? await revokeAdminSessions(uid) : false;
  if (identity?.email && (await isAdminEmail(identity.email))) {
    await recordAdminAudit({
      action: "admin.logout",
      actor: identity.email,
      target: identity.uid,
    });
  }
  const res = NextResponse.json({ ok: true, revoked });
  clearSessionCookie(res);
  clearAdminLoginCookie(res);
  return res;
}
