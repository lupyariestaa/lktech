import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { deleteUserProfile, setUserBlocked } from "@/lib/user-profile";
import { getAdminUsersSummary, listAdminUsers, type AdminUsersFilter } from "@/lib/admin-users";
import { userBlockSchema } from "@/lib/api-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_FILTERS: AdminUsersFilter[] = ["semua", "sudah", "belum"];

/**
 * GET /api/admin/users — daftar user (dashboard admin).
 *   Query: ?q=<cari nama/email/whatsapp> ?filter=semua|sudah|belum ?limit=<1..200>
 * GET /api/admin/users?summary=1 — statistik ringkas (kartu & badge).
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  const url = new URL(req.url);

  if (url.searchParams.get("summary") === "1") {
    try {
      const summary = await getAdminUsersSummary();
      return NextResponse.json(
        { summary },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (err) {
      console.error("[api/admin/users] summary gagal:", err);
      return NextResponse.json(
        { error: "Gagal menghitung ringkasan user." },
        { status: 500 },
      );
    }
  }

  const filterRaw = url.searchParams.get("filter");
  const filter: AdminUsersFilter = VALID_FILTERS.includes(filterRaw as AdminUsersFilter)
    ? (filterRaw as AdminUsersFilter)
    : "semua";
  const limitRaw = Number(url.searchParams.get("limit"));

  try {
    const users = await listAdminUsers({
      q: url.searchParams.get("q") ?? undefined,
      filter,
      limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined,
    });
    return NextResponse.json(
      { users },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/admin/users] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data user." },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/users — blokir / buka blokir user.
 * Body: { id: string, blocked: boolean }
 */
export async function PATCH(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = userBlockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  try {
    const ok = await setUserBlocked(parsed.data.id, parsed.data.blocked);
    if (!ok) {
      return NextResponse.json(
        { error: "User tidak ditemukan." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/users] PATCH gagal:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui status user." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/users?id=xxx — hapus dokumen user (profil).
 * Catatan: pesanan user TIDAK dihapus (menjaga integritas riwayat penjualan).
 */
export async function DELETE(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  try {
    const ok = await deleteUserProfile(id);
    if (!ok) {
      return NextResponse.json(
        { error: "User tidak ditemukan." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/users] DELETE gagal:", err);
    return NextResponse.json({ error: "Gagal menghapus user." }, { status: 500 });
  }
}
