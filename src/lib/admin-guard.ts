import "server-only";
import { NextResponse } from "next/server";
import { getAdminAuth, isAdminConfigured } from "@/lib/firebase-admin";

export type AdminCheck =
  | { ok: true; uid: string; email: string }
  | { ok: false; response: NextResponse };

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
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
            "Admin SDK belum dikonfigurasi. Isi FIREBASE_ADMIN_* di .env.local.",
        },
        { status: 503 },
      ),
    };
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Tidak terautentikasi." },
        { status: 401 },
      ),
    };
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Admin SDK tidak tersedia." },
        { status: 503 },
      ),
    };
  }

  try {
    // `checkRevoked: true` memastikan token yang sudah dicabut/di-logout
    // tidak bisa dipakai lagi.
    const decoded = await adminAuth.verifyIdToken(token, true);
    const email = (decoded.email ?? "").toLowerCase();
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

    return { ok: true, uid: decoded.uid, email };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Token tidak valid atau kedaluwarsa." },
        { status: 401 },
      ),
    };
  }
}
