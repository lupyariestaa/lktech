import "server-only";
import { NextResponse } from "next/server";
import { getAdminAuth, isAdminConfigured } from "@/lib/firebase-admin";

export type AdminCheck =
  | { ok: true; uid: string; email: string }
  | { ok: false; response: NextResponse };

/** Sama bentuknya dengan `AdminCheck`, dipakai untuk user biasa (bukan admin). */
export type UserCheck = AdminCheck;

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Mengekstrak token `Bearer` dari header Authorization. */
export function bearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization") ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

/**
 * Satu langkah verifikasi ID token Firebase (dipakai `requireAdmin` &
 * `requireUser`). Mengembalikan `{ uid, email }` bila valid, atau `null`.
 */
async function verifyToken(req: Request): Promise<{
  uid: string;
  email: string;
} | null> {
  const token = bearerToken(req);
  if (!token) return null;
  const adminAuth = getAdminAuth();
  if (!adminAuth) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    return { uid: decoded.uid, email: (decoded.email ?? "").toLowerCase() };
  } catch {
    return null;
  }
}

/**
 * Memverifikasi bahwa permintaan datang dari user yang sudah login
 * (akun Google mana pun). Tidak memeriksa whitelist admin.
 */
export async function requireUser(req: Request): Promise<UserCheck> {
  if (!isAdminConfigured) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Layanan belum dikonfigurasi di server.",
        },
        { status: 503 },
      ),
    };
  }

  const token = bearerToken(req);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Tidak terautentikasi." },
        { status: 401 },
      ),
    };
  }

  const verified = await verifyToken(req);
  if (!verified) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Token tidak valid atau kedaluwarsa." },
        { status: 401 },
      ),
    };
  }

  return { ok: true, uid: verified.uid, email: verified.email };
}

/**
 * Memverifikasi permintaan admin:
 * 1. Admin SDK harus dikonfigurasi.
 * 2. Header Authorization: Bearer <idToken> harus valid.
 * 3. Email pengguna harus ada di whitelist ADMIN_EMAILS.
 */
export async function requireAdmin(req: Request): Promise<AdminCheck> {
  if (!isAdminConfigured) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Layanan belum dikonfigurasi di server.",
        },
        { status: 503 },
      ),
    };
  }

  const token = bearerToken(req);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Tidak terautentikasi." },
        { status: 401 },
      ),
    };
  }

  const verified = await verifyToken(req);
  if (!verified) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Token tidak valid atau kedaluwarsa." },
        { status: 401 },
      ),
    };
  }

  const email = verified.email;
  const allowed = getAdminEmails();

  if (!email || !allowed.includes(email)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Akun ini tidak memiliki akses admin." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, uid: verified.uid, email };
}
