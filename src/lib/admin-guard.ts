import "server-only";
import { NextResponse } from "next/server";
import { getAdminAuth, isAdminConfigured } from "@/lib/firebase-admin";

export type AdminCheck =
  | { ok: true; uid: string; email: string }
  | { ok: false; response: NextResponse };

/** Sama bentuknya dengan `AdminCheck`, dipakai untuk user biasa (bukan admin). */
export type UserCheck = AdminCheck;

/** Mengekstrak token `Bearer` dari header Authorization. */
export function bearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization") ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

/**
 * Satu langkah verifikasi ID token Firebase (dipakai `requireAdmin` &
 * `requireUser`). Mengembalikan `{ uid, email, emailVerified }` bila valid,
 * atau `null`. `emailVerified` diambil dari klaim `email_verified` token.
 */
async function verifyToken(req: Request): Promise<{
  uid: string;
  email: string;
  emailVerified: boolean;
} | null> {
  const token = bearerToken(req);
  if (!token) return null;
  const adminAuth = getAdminAuth();
  if (!adminAuth) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
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

  // G5 — tolak admin bila email belum diverifikasi (klaim `email_verified`).
  // Mencegah email yang belum terbukti dimiliki lolos sebagai admin.
  if (!verified.emailVerified) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Email akun belum diverifikasi." },
        { status: 403 },
      ),
    };
  }

  const email = verified.email;

  // OWNER/whitelist env (`ADMIN_EMAILS`) ATAU admin terdaftar di DB
  // (`admins/{email}` aktif) — sumber tunggal `isAdminEmail` (gap G6/G17).
  const { isAdminEmail } = await import("@/lib/admins");
  const isAdmin = await isAdminEmail(email);

  if (!isAdmin) {
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

/**
 * Seperti `requireAdmin`, tetapi HANYA menerima OWNER (env `ADMIN_EMAILS`).
 * Dipakai untuk aksi sensitif (kelola admin).
 */
export async function requireOwner(req: Request): Promise<AdminCheck> {
  const check = await requireAdmin(req);
  if (!check.ok) return check;
  const { isOwnerEmail } = await import("@/lib/admins");
  if (!isOwnerEmail(check.email)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Hanya OWNER yang dapat melakukan aksi ini." },
        { status: 403 },
      ),
    };
  }
  return check;
}

/**
 * Seperti `requireUser`, tetapi juga MENOLAK user yang diblokir (mis. spam).
 *
 * Dipakai pada aksi transaksi (checkout, wishlist, alamat) agar user yang
 * diblokir admin tidak bisa bertindak. Mengembalikan 403 dengan pesan jelas.
 */
export async function requireActiveUser(
  req: Request,
): Promise<AdminCheck> {
  const check = await requireUser(req);
  if (!check.ok) return check;

  const { getUserProfile } = await import("@/lib/user-profile");
  const profile = await getUserProfile(check.uid);
  if (profile?.blocked) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Akun Anda sedang diblokir. Hubungi kami via WhatsApp untuk info lebih lanjut.",
          code: "user_blocked",
        },
        { status: 403 },
      ),
    };
  }

  return check;
}
