import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { isEmailConfigured, sendTestEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/email/test — kirim email percobaan (dilindungi admin).
 *
 * Tujuan email SELALU alamat admin yang login (`check.email`) — tidak menerima
 * alamat dari body agar endpoint tidak disalahgunakan untuk mengirim ke
 * alamat sembarangan.
 */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  if (!isEmailConfigured) {
    return NextResponse.json(
      { error: "Email belum dikonfigurasi (RESEND_API_KEY kosong)." },
      { status: 503 },
    );
  }

  const to = check.email;

  const result = await sendTestEmail(to);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Gagal mengirim email test." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, to });
}
