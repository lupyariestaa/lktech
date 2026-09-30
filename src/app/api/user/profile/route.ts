import { NextResponse } from "next/server";
import { requireUser } from "@/lib/admin-guard";
import { getUserProfile, upsertUserProfile } from "@/lib/user-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/user/profile — ambil profil user yang sedang login. */
export async function GET(req: Request) {
  const check = await requireUser(req);
  if (!check.ok) return check.response;

  try {
    const profile = await getUserProfile(check.uid);
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("[api/user/profile] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal memuat profil." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/user/profile — simpan/perbarui profil user (dipanggil setelah
 * login Google). Email & uid diambil dari token yang terverifikasi, bukan dari
 * body, agar tidak bisa dipalsukan.
 */
export async function POST(req: Request) {
  const check = await requireUser(req);
  if (!check.ok) return check.response;

  let body: { displayName?: string; photoURL?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const profile = await upsertUserProfile({
      uid: check.uid,
      email: check.email,
      displayName: body.displayName,
      photoURL: body.photoURL,
    });
    return NextResponse.json({ ok: true, profile });
  } catch (err) {
    console.error("[api/user/profile] POST gagal:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan profil." },
      { status: 500 },
    );
  }
}
