import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { listMedia } from "@/lib/media";
import { findOrphans, scanMediaUsage } from "@/lib/media-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/media/orphans?limit=
 * Daftar aset media (status aktif) yang TIDAK dipakai di konten mana pun.
 * Berguna untuk pembersihan penyimpanan.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  const limitRaw = new URL(req.url).searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : 200;

  try {
    const index = await scanMediaUsage(db);
    // Ambil semua media aktif (bukan trashed) lalu filter yang tak terpakai.
    const { items } = await listMedia(db, {
      status: "active",
      limit: Number.isFinite(limit) && limit > 0 ? limit : 200,
      sort: "newest",
    });
    const orphans = findOrphans(items, index);
    return NextResponse.json({ ok: true, count: orphans.length, items: orphans });
  } catch (err) {
    console.error("[api/admin/media/orphans] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal memuat aset yatim." },
      { status: 500 },
    );
  }
}
