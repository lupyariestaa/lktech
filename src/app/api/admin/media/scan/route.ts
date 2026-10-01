import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { refreshMediaUsage } from "@/lib/media-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/media/scan
 * Pindai ulang seluruh konten, hitung pemakaian tiap aset, dan simpan
 * hasil denormalisasi (`usageCount` + `usedIn`) ke dokumen media.
 */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  try {
    const result = await refreshMediaUsage(db);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[api/admin/media/scan] POST gagal:", err);
    return NextResponse.json(
      { error: "Gagal memindai penggunaan media." },
      { status: 500 },
    );
  }
}
