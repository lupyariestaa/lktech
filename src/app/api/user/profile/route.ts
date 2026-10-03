import { NextResponse } from "next/server";
import { requireUser } from "@/lib/admin-guard";
import {
  getUserProfile,
  updateUserProfileFields,
  upsertUserProfile,
} from "@/lib/user-profile";
import { profileUpdateSchema, userProfileSchema } from "@/lib/api-schemas";

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

  const parsed = userProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data profil tidak valid." }, { status: 400 });
  }

  try {
    const profile = await upsertUserProfile({
      uid: check.uid,
      email: check.email,
      displayName: parsed.data.displayName,
      photoURL: parsed.data.photoURL,
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

/**
 * PATCH /api/user/profile — perbarui profil (nama tampilan +/atau nomor WhatsApp).
 * Email/uid tetap dari token dan tidak bisa diubah.
 */
export async function PATCH(req: Request) {
  const check = await requireUser(req);
  if (!check.ok) return check.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data profil tidak valid." },
      { status: 400 },
    );
  }

  try {
    const profile = await updateUserProfileFields(check.uid, {
      displayName: parsed.data.displayName,
      whatsapp: parsed.data.whatsapp,
    });
    if (!profile) {
      return NextResponse.json(
        { error: "Profil tidak ditemukan." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, profile });
  } catch (err) {
    console.error("[api/user/profile] PATCH gagal:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui profil." },
      { status: 500 },
    );
  }
}
