import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  deleteOrder,
  getOrdersPage,
  getOrdersSummary,
  updateOrderStatus,
} from "@/lib/orders";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/orders — daftar pesanan (terbaru dulu) + filter & paginasi.
 *   Query: ?status=baru|diproses|selesai|dibatalkan|semua
 *          ?limit=<1..100>  ?cursor=<createdAtISO>
 * GET /api/admin/orders?summary=1 — ringkasan jumlah per status + omzet
 *   (untuk badge sidebar & metrik dashboard).
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const url = new URL(req.url);

  // Ringkasan (badge/metrik) — tanpa mengunduh daftar.
  if (url.searchParams.get("summary") === "1") {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: "Admin SDK tidak tersedia." },
        { status: 503 },
      );
    }
    try {
      const summary = await getOrdersSummary();
      return NextResponse.json(
        { summary },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (err) {
      console.error("[api/admin/orders] summary gagal:", err);
      return NextResponse.json(
        { error: "Gagal menghitung pesanan." },
        { status: 500 },
      );
    }
  }

  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && statusParam !== "semua"
      ? (ORDER_STATUSES as readonly string[]).includes(statusParam)
        ? (statusParam as OrderStatus)
        : undefined
      : "semua";
  const cursor = url.searchParams.get("cursor");
  const limitRaw = Number(url.searchParams.get("limit"));

  try {
    const { orders, nextCursor } = await getOrdersPage({
      status,
      cursor,
      limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined,
    });
    return NextResponse.json(
      { orders, nextCursor },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/admin/orders] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data pesanan." },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/orders — ubah status sebuah pesanan.
 * Body: { id: string, status: OrderStatus }
 */
export async function PATCH(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  let body: { id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const { id, status } = body;
  if (!id || !status) {
    return NextResponse.json(
      { error: "id dan status wajib diisi." },
      { status: 400 },
    );
  }
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
  }

  try {
    await updateOrderStatus(id, status as OrderStatus, check.email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/orders] PATCH gagal:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui status pesanan." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/orders?id=xxx — hapus sebuah pesanan (permanen).
 */
export async function DELETE(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  try {
    await deleteOrder(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/orders] DELETE gagal:", err);
    return NextResponse.json(
      { error: "Gagal menghapus pesanan." },
      { status: 500 },
    );
  }
}
