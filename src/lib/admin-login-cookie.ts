import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";
import {
  ADMIN_ABSOLUTE_TIMEOUT_MS,
  ADMIN_LOGIN_COOKIE,
} from "@/lib/session-constants";

/**
 * Cookie "login window" admin — ditandatangani HMAC, HttpOnly.
 *
 * Tujuan: absolute timeout 12 jam tidak bisa diperpanjang oleh refresh cookie
 * sesi biasa. Cookie ini juga mengikat `__session` ke login window yang sama,
 * sehingga cookie sesi yang dicuri tanpa cookie ini tidak bisa membuka shell
 * dashboard.
 *
 * Kunci HMAC memakai `ADMIN_SESSION_SECRET` bila tersedia; fallback ke private
 * key Firebase Admin (sudah wajib ada untuk fitur admin) agar tidak menambah
 * prasyarat deploy baru.
 */

export type AdminLoginWindow = {
  uid: string;
  loginAt: number;
};

function signingSecret(): string | null {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n").trim() ||
    null
  );
}

function sign(payload: string): string | null {
  const secret = signingSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function encode(login: AdminLoginWindow): string {
  return Buffer.from(JSON.stringify(login), "utf8").toString("base64url");
}

/** Membuat token login window untuk uid tertentu. */
export function createAdminLoginToken(
  uid: string,
  loginAt = Date.now(),
): string | null {
  const payload = encode({ uid, loginAt });
  const signature = sign(payload);
  return signature ? `${payload}.${signature}` : null;
}

/**
 * Memverifikasi token login window. `uid` opsional untuk memastikan cookie
 * memang milik sesi Firebase yang sedang diverifikasi.
 */
export function verifyAdminLoginToken(
  token: string | undefined | null,
  uid?: string,
): AdminLoginWindow | null {
  const raw = token?.trim();
  if (!raw) return null;

  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  const expected = sign(payload);
  if (!expected) return null;

  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (
    actualBuf.length !== expectedBuf.length ||
    !timingSafeEqual(actualBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<AdminLoginWindow>;
    if (typeof parsed.uid !== "string" || parsed.uid.length === 0) return null;
    if (
      typeof parsed.loginAt !== "number" ||
      !Number.isFinite(parsed.loginAt) ||
      parsed.loginAt <= 0
    ) {
      return null;
    }
    if (uid && parsed.uid !== uid) return null;
    if (Date.now() - parsed.loginAt >= ADMIN_ABSOLUTE_TIMEOUT_MS) return null;
    return { uid: parsed.uid, loginAt: parsed.loginAt };
  } catch {
    return null;
  }
}

/** Menyimpan cookie login window dengan sisa waktu absolut (bukan 12 jam baru). */
export function setAdminLoginCookie(
  res: NextResponse,
  token: string,
  loginAt: number,
): void {
  const remainingMs = Math.max(
    0,
    ADMIN_ABSOLUTE_TIMEOUT_MS - (Date.now() - loginAt),
  );
  res.cookies.set({
    name: ADMIN_LOGIN_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.ceil(remainingMs / 1000),
  });
}

/** Menghapus cookie login window. */
export function clearAdminLoginCookie(res: NextResponse): void {
  res.cookies.set({
    name: ADMIN_LOGIN_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
