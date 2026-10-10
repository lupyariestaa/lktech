import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  addOrderActivity,
  listOrderActivities,
  type OrderActivityType,
} from "@/lib/order-activities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: readonly OrderActivityType[] = [
  "catatan",
  "status",
  "invoice",
  "email",
  "sistem",
];

/** GET /api/admin/orders/[id]/activities — timeline aktivitas pesanan (FASE O6). */
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
    const activities = await listOrderActivities(id);
    return NextResponse.json(
      { activities },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/admin/orders/activities] GET gagal:", err);
    return NextResponse.json({ error: "Gagal memuat aktivitas." }, { status: 500 });
  }
}

/** POST /api/admin/orders/[id]/activities — tambah catatan internal (FASE O6). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  let body: { type?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!note) {
    return NextResponse.json({ error: "Catatan wajib diisi." }, { status: 400 });
  }
  const type: OrderActivityType =
    body.type && (TYPES as readonly string[]).includes(body.type)
      ? (body.type as OrderActivityType)
      : "catatan";

  const ok = await addOrderActivity(id, { type, note, actor: check.email });
  if (!ok) {
    return NextResponse.json({ error: "Gagal menyimpan catatan." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}