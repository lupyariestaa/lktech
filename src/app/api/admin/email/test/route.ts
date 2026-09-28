import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { isEmailConfigured, sendTestEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/email/test — kirim email percobaan (dilindungi admin).
 * Body opsional: { to?: string }
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

  let to = check.email;
  try {
    const body = await req.json();
    if (typeof body?.to === "string" && body.to.trim()) to = body.to.trim();
  } catch {
    /* body opsional */
  }

  const result = await sendTestEmail(to);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Gagal mengirim email test." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, to });
}
