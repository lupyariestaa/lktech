import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { isOwnerEmail } from "@/lib/admins";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/me — memverifikasi bahwa pengguna yang login benar-benar
 * admin (email ada di whitelist ADMIN_EMAILS). Dipakai `AuthGuard` di dashboard
 * untuk menampilkan pesan "tidak punya akses" alih-alih UI kosong/rusak.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const isOwner = isOwnerEmail(check.email);
  return NextResponse.json(
    {
      ok: true,
      uid: check.uid,
      email: check.email,
      isOwner,
      role: isOwner ? "OWNER" : "ADMIN",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
