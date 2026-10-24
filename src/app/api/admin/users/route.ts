import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { setUserBlocked } from "@/lib/user-profile";
import { getAdminUsersSummary, listAdminUsers, type AdminUsersFilter } from "@/lib/admin-users";
import { userBlockSchema } from "@/lib/api-schemas";
import { recordAdminAudit } from "@/lib/admin-audit";
import { guardAdminMutation } from "@/lib/admin-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_FILTERS: AdminUsersFilter[] = ["semua", "sudah", "belum"];

/**
 * GET /api/admin/users — daftar user (dashboard admin).
 *   Query: ?q=<cari nama/email/whatsapp> ?filter=semua|sudah|belum ?limit=<1..200> ?cursor=<opaque>
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
  const cursor = url.searchParams.get("cursor");
  if (cursor && (cursor.length > 1500 || !/^[\w-]+$/.test(cursor))) {
    return NextResponse.json({ error: "Cursor tidak valid." }, { status: 400 });
  }
  if (cursor) {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const separator = decoded.indexOf("\n");
    const createdAt = decoded.slice(0, separator);
    const uid = decoded.slice(separator + 1);
    const hasSearch = Boolean(url.searchParams.get("q")?.trim());
    if (
      separator < 0 ||
      !uid ||
      (!hasSearch && !createdAt) ||
      Buffer.from(decoded).toString("base64url") !== cursor
    ) {
      return NextResponse.json({ error: "Cursor tidak valid." }, { status: 400 });
    }
  }

  try {
    const page = await listAdminUsers({
      q: url.searchParams.get("q") ?? undefined,
      filter,
      limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined,
      cursor: cursor ?? undefined,
    });
    return NextResponse.json(
      page,
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

  const limited = await guardAdminMutation(check.uid, "user.block", {
    limit: 30,
  });
  if (limited) return limited;

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
    await recordAdminAudit({
      action: "user.block",
      actor: check.email,
      target: parsed.data.id,
      meta: { blocked: parsed.data.blocked },
    });
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
 * DELETE /api/admin/users — DINONAKTIFKAN.
 *
 * Keputusan pemilik (ADM-08): semantik yang dipakai adalah **blokir**, bukan
 * hapus permanen. Menghapus profil saja membuat akun Auth tetap hidup dan bisa
 * membuat profil baru, sehingga menyesatkan. Penghapusan akun + retensi order
 * baru akan dipertimbangkan setelah kebijakan retensi ditetapkan.
 */
export async function DELETE(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  return NextResponse.json(
    {
      error:
        "Penghapusan permanen user dinonaktifkan. Gunakan Blokir (PATCH) agar profil tetap ada dan akses dicabut.",
      code: "user_delete_disabled",
    },
    { status: 405, headers: { Allow: "GET, PATCH" } },
  );
}
