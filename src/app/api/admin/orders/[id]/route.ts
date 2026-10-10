import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getOrderById } from "@/lib/orders";
import { listOrderEmails } from "@/lib/email-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/orders/[id] — detail satu pesanan + riwayat email (FASE O6).
 * Dipakai halaman detail `/admin/orders/[id]`.
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
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }
    const emails = await listOrderEmails(id).catch(() => []);
    return NextResponse.json(
      { order, emails },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/admin/orders/[id]] GET gagal:", err);
    return NextResponse.json({ error: "Gagal mengambil pesanan." }, { status: 500 });
  }
}