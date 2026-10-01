import "server-only";
import type { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { ADMIN_SESSION_COOKIE } from "@/lib/session-constants";

export { ADMIN_SESSION_COOKIE };

/** Durasi sesi (5 hari, dalam milidetik). Firebase membatasi 5–14 hari. */
const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

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
