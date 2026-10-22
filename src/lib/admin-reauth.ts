"use client";

import { GoogleAuthProvider, reauthenticateWithPopup } from "firebase/auth";
import { getClientAuth } from "@/lib/auth";
import { ADMIN_REAUTH_WINDOW_MS } from "@/lib/session-constants";

/**
 * Membaca `auth_time` (detik) dari ID token Firebase tanpa memverifikasi
 * signature — verifikasi sebenarnya tetap di server. Dipakai hanya untuk
 * memutuskan apakah popup re-auth perlu ditampilkan.
 */
export function authTimeFromIdToken(token: string): number | null {
  const encoded = token.split(".")[1];
  if (!encoded) return null;
  try {
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { auth_time?: unknown };
    const authTime = Number(payload.auth_time);
    return Number.isFinite(authTime) && authTime > 0 ? authTime : null;
  } catch {
    return null;
  }
}

/** True bila token masih dalam jendela auth baru. */
export function hasFreshAuth(
  token: string,
  now = Date.now(),
  maxAgeMs = ADMIN_REAUTH_WINDOW_MS,
): boolean {
  const authTime = authTimeFromIdToken(token);
  if (!authTime) return false;
  return now - authTime * 1000 <= maxAgeMs;
}

/**
 * Memastikan aksi sensitif memakai autentikasi Google yang masih baru.
 *
 * Bila `auth_time` sudah lebih dari 10 menit, buka popup re-auth Google,
 * lalu paksa ID token baru. Server tetap memeriksa `auth_time` dan menolak
 * dengan `reauth_required` bila klien melewati langkah ini.
 *
 * Catatan: popup harus dipanggil dari handler klik pengguna agar tidak
 * diblokir browser.
 */
export async function ensureRecentAdminAuth(
  maxAgeMs = ADMIN_REAUTH_WINDOW_MS,
): Promise<void> {
  const auth = getClientAuth();
  const user = auth?.currentUser;
  if (!auth || !user) {
    throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");
  }

  const currentToken = await user.getIdToken();
  if (hasFreshAuth(currentToken, Date.now(), maxAgeMs)) return;

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    await reauthenticateWithPopup(user, provider);
    const refreshedToken = await user.getIdToken(true);
    if (!hasFreshAuth(refreshedToken, Date.now(), maxAgeMs)) {
      throw new Error("Verifikasi ulang tidak menghasilkan sesi baru.");
    }
  } catch {
    throw new Error(
      "Verifikasi ulang Google dibatalkan atau gagal. Aksi sensitif tidak dijalankan.",
    );
  }
}
