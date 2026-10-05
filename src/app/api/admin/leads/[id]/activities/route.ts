import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { listLeadActivities } from "@/lib/lead-crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/leads/[id]/activities — timeline aktivitas sebuah lead.
 * Menambah entri memakai `PATCH /api/admin/leads { id, activity }`.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  try {
    const activities = await listLeadActivities(id);
    return NextResponse.json(
      { activities },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/admin/leads/activities] GET gagal:", err);
    return NextResponse.json({ error: "Gagal memuat aktivitas." }, { status: 500 });
  }
}
