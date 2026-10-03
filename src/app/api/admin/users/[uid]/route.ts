import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAdminUserDetail } from "@/lib/admin-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users/[uid] — detail satu user + daftar pesanannya.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  const { uid } = await params;
  if (!uid) {
    return NextResponse.json({ error: "uid wajib diisi." }, { status: 400 });
  }

  try {
    const detail = await getAdminUserDetail(uid);
    if (!detail) {
      return NextResponse.json(
        { error: "User tidak ditemukan." },
        { status: 404 },
      );
    }
    return NextResponse.json(detail, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api/admin/users/[uid]] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal mengambil detail user." },
      { status: 500 },
    );
  }
}
