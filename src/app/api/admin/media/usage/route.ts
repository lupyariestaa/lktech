import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { getMediaItem } from "@/lib/media";
import { scanMediaUsage, usagesForItem } from "@/lib/media-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/media/usage?id=xxx
 * Kembalikan daftar pemakaian (usedIn) sebuah aset media dari pemindaian
 * konten terkini (bukan dari nilai denormalisasi yang mungkin basi).
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  try {
    const item = await getMediaItem(db, id);
    if (!item) {
      return NextResponse.json({ error: "Media tidak ditemukan." }, { status: 404 });
    }
    const index = await scanMediaUsage(db);
    const usedIn = usagesForItem(index, item);
    return NextResponse.json({ ok: true, usageCount: usedIn.length, usedIn });
  } catch (err) {
    console.error("[api/admin/media/usage] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal memindai pemakaian." },
      { status: 500 },
    );
  }
}
