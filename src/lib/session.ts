import "server-only";
import type { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import {
  ADMIN_ABSOLUTE_TIMEOUT_MS,
  ADMIN_IDLE_TIMEOUT_MS,
  ADMIN_SESSION_COOKIE,
} from "@/lib/session-constants";

export { ADMIN_SESSION_COOKIE };

/**
 * Cookie sesi Firebase memakai idle timeout 60 menit. Klien admin yang aktif
 * me-refresh-nya tiap 5 menit; tanpa aktivitas, cookie kedaluwarsa sendiri.
 * Absolute timeout 12 jam diperiksa dari klaim `auth_time` + cookie login.
 */
const SESSION_MAX_AGE_MS = ADMIN_IDLE_TIMEOUT_MS;

/**
 * Membuat session cookie Firebase dari ID token yang sudah terverifikasi.
 * Mengembalikan null bila Admin SDK tidak tersedia.
 */
export async function createAdminSessionCookie(
  idToken: string,
): Promise<string | null> {
  const auth = getAdminAuth();
  if (!auth) return null;
  return auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
}

export type AdminSessionInfo = { uid: string; email: string; emailVerified: boolean };

/**
 * Memverifikasi SESSION COOKIE admin (defense-in-depth, gap G6).
 *
 * Sebelumnya gate `/admin` hanya mengecek KEBERADAAN cookie; siapa pun yang
 * menyetel cookie bernama `__session` bisa membuka shell dashboard. Fungsi ini
 * memverifikasi cookie secara kriptografis (`verifySessionCookie`) & mengembalikan
 * identitas, sehingga layout server `/admin` dapat menolak non-admin.
 *
 * Mengembalikan `null` bila cookie kosong, tidak valid, kedaluwarsa, atau Admin
 * SDK tidak tersedia.
 */
export async function verifyAdminSessionCookie(
  cookieValue: string | undefined | null,
): Promise<AdminSessionInfo | null> {
  const token = cookieValue?.trim();
  if (!token) return null;
  const auth = getAdminAuth();
  if (!auth) return null;
  try {
    const decoded = await auth.verifySessionCookie(token, true);
    const authTime = Number(decoded.auth_time ?? 0);
    if (
      !authTime ||
      Date.now() / 1000 - authTime > ADMIN_ABSOLUTE_TIMEOUT_MS / 1000
    ) {
      return null;
    }
    return {
      uid: decoded.uid,
      email: (decoded.email ?? "").toLowerCase(),
      emailVerified: decoded.email_verified === true,
    };
  } catch {
    return null;
  }
}

/**
 * Mencabut seluruh refresh token milik user (logout semua perangkat).
 *
 * Session cookie & ID token yang masih beredar akan ditolak karena verifikasi
 * Firebase memakai `checkRevoked = true`. Mengembalikan `false` bila Admin SDK
 * tidak tersedia atau pencabutan gagal; pemanggil tetap harus menghapus cookie.
 */
export async function revokeAdminSessions(uid: string): Promise<boolean> {
  const auth = getAdminAuth();
  if (!auth) return false;
  try {
    await auth.revokeRefreshTokens(uid);
    return true;
  } catch (err) {
    console.error("[session] gagal mencabut refresh token admin:", err);
    return false;
  }
}

/** Menyimpan session cookie (HttpOnly) pada respons. */
export function setSessionCookie(
  res: NextResponse,
  value: string,
  maxAgeSeconds: number,
) {
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

/** Menghapus session cookie pada respons. */
export function clearSessionCookie(res: NextResponse) {
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
