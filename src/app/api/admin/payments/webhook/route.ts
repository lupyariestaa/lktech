import { NextResponse } from "next/server";
import { assertFreshAuth, requireAdmin } from "@/lib/admin-guard";
import { guardAdminMutation } from "@/lib/admin-rate-limit";
import { recordAdminAudit } from "@/lib/admin-audit";
import { getMayarMode, registerMayarWebhookUrl } from "@/lib/mayar";
import { SITE_URL } from "@/lib/site";
import { buildWebhookUrl, redactWebhookUrl } from "@/lib/webhook-url-pure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/payments/webhook — sinkronkan URL webhook ke Mayar.
 *
 * Menyusun URL `SITE_URL + /api/webhooks/mayar?token=<MAYAR_WEBHOOK_TOKEN>` dan
 * mendaftarkannya langsung ke Mayar (`/webhooks/update`). Ini menghilangkan
 * penyebab paling umum webhook ditolak 401: token pada URL terdaftar berbeda
 * dengan token server. Token disusun server-side dan TIDAK pernah dikirim ke
 * klien (respons hanya memuat URL yang disamarkan).
 */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const fresh = assertFreshAuth(check);
  if (!fresh.ok) return fresh.response;

  const limited = await guardAdminMutation(check.uid, "payment.webhook.sync", {
    limit: 10,
  });
  if (limited) return limited;

  const token = process.env.MAYAR_WEBHOOK_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "MAYAR_WEBHOOK_TOKEN belum diisi di environment. Isi dulu nilainya, lalu ulangi.",
        code: "no_webhook_token",
      },
      { status: 409 },
    );
  }

  // Pakai origin request (deployment yang sedang dipakai admin) agar webhook
  // menunjuk ke host yang benar-benar melayani aplikasi ini. Fallback SITE_URL.
  let origin = SITE_URL;
  try {
    const requested = new URL(req.url);
    if (
      requested.protocol === "https:" ||
      requested.hostname === "localhost" ||
      requested.hostname === "127.0.0.1"
    ) {
      origin = requested.origin;
    }
  } catch {
    /* pakai SITE_URL */
  }

  const url = buildWebhookUrl(origin, token);

  try {
    await registerMayarWebhookUrl(url);
  } catch (err) {
    console.error("[api/admin/payments/webhook] sinkronisasi gagal:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Gagal mendaftarkan URL webhook ke Mayar.",
      },
      { status: 502 },
    );
  }

  await recordAdminAudit({
    action: "payment.webhook.sync",
    actor: check.email,
    target: "mayar",
    meta: { mode: getMayarMode(), url: redactWebhookUrl(url) },
  });

  return NextResponse.json({
    ok: true,
    mode: getMayarMode(),
    url: redactWebhookUrl(url),
    message:
      "URL webhook tersinkron dengan token server. Coba bayar lagi lalu muat riwayat webhook.",
  });
}
