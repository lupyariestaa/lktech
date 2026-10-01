import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { getMediaAudit } from "@/lib/media-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/media/audit?mediaId=xxx
 * Riwayat perubahan sebuah aset media (audit trail), terbaru lebih dulu.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  const mediaId = new URL(req.url).searchParams.get("mediaId");
  if (!mediaId) {
    return NextResponse.json({ error: "mediaId wajib diisi." }, { status: 400 });
  }

  try {
    const items = await getMediaAudit(db, mediaId);
    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error("[api/admin/media/audit] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal memuat riwayat aset." },
      { status: 500 },
    );
  }
}
