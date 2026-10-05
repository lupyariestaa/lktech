import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { listAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/audit — daftar audit log admin (terbaru dulu).
 *   Query: ?action=<aksi> ?actor=<email> ?q=<kata kunci> ?limit=<1..500>
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get("limit"));
  try {
    const entries = await listAdminAudit({
      action: url.searchParams.get("action") ?? undefined,
      actor: url.searchParams.get("actor") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 200,
    });
    return NextResponse.json(
      { entries },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/admin/audit] GET gagal:", err);
    return NextResponse.json({ error: "Gagal memuat audit log." }, { status: 500 });
  }
}
