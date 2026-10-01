import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { aggregateTags } from "@/lib/media-collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/media/tags
 * Daftar tag unik (dari media aktif) beserta jumlah pemakaiannya.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  try {
    const items = await aggregateTags(db);
    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error("[api/admin/media/tags] GET gagal:", err);
    return NextResponse.json({ error: "Gagal memuat tag." }, { status: 500 });
  }
}
