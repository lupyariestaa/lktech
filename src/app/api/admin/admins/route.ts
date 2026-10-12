import { NextResponse } from "next/server";
import { requireAdmin, requireOwner } from "@/lib/admin-guard";
import { addAdmin, listAdmins, removeAdmin, isOwnerEmail } from "@/lib/admins";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAdminAudit } from "@/lib/admin-audit";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/admins — daftar admin (owner env + admin DB).
 * Dilindungi admin.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;
  const admins = await listAdmins();
  return NextResponse.json({ admins, me: check.email }, { headers: { "Cache-Control": "no-store" } });
}

const addSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email tidak valid").max(200),
  name: z.string().trim().max(80).optional(),
});

/**
 * POST /api/admin/admins — tambah admin. HANYA OWNER.
 */
export async function POST(req: Request) {
  const check = await requireOwner(req);
  if (!check.ok) return check.response;

  const rl = await checkRateLimit(`admins:${check.uid}`, 20, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  try {
    const member = await addAdmin(parsed.data.email, {
      addedBy: check.email,
      name: parsed.data.name,
    });
    await recordAdminAudit({
      action: "admin.add",
      actor: check.email,
      target: member.email,
      meta: { name: member.name ?? "" },
    });
    return NextResponse.json({ ok: true, member });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menambah admin.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}

/**
 * DELETE /api/admin/admins?email= — hapus admin. HANYA OWNER. OWNER tak bisa dihapus.
 */
export async function DELETE(req: Request) {
  const check = await requireOwner(req);
  if (!check.ok) return check.response;

  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
  if (!email) {
    return NextResponse.json({ error: "email wajib diisi." }, { status: 400 });
  }
  if (isOwnerEmail(email)) {
    return NextResponse.json(
      { error: "OWNER tidak dapat dihapus (root of trust)." },
      { status: 409 },
    );
  }

  try {
    const ok = await removeAdmin(email);
    if (!ok) {
      return NextResponse.json({ error: "Admin tidak ditemukan." }, { status: 404 });
    }
    await recordAdminAudit({
      action: "admin.remove",
      actor: check.email,
      target: email,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menghapus admin.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}
