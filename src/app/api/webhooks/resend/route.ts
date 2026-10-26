import { NextResponse } from "next/server";
import { recordEmailDelivery } from "@/lib/email-events";
import { logEvent } from "@/lib/observability";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseResendEvent, verifySvixSignature } from "@/lib/resend-webhook-pure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/resend — menerima event pengiriman email dari Resend
 * (`EM-P2`): `email.sent/delivered/delivery_delayed/bounced/complained`.
 *
 * Keamanan (fail-safe):
 * 1. **Verifikasi tanda tangan Svix** memakai `RESEND_WEBHOOK_SECRET`. Bila
 *    secret BELUM diisi, endpoint **menolak** (503 `webhook_not_configured`) —
 *    tidak pernah menerima payload tak terverifikasi.
 * 2. Tanda tangan tak cocok / stempel waktu kedaluwarsa → **401**.
 *
 * Keandalan:
 * - Selalu balas **2xx** untuk payload yang sah (termasuk event tak dikenal &
 *   email di luar jejak) agar Resend tidak menumpuk retry.
 * - Korelasi via indeks `email_sends` (doc id = id Resend) → tandai order +
 *   tambah riwayat `delivered/bounced` di `orders/{id}/emails`.
 * - Tanpa PII di log: hanya tipe event, status, dan ada/tidaknya kecocokan.
 */
export async function POST(req: Request) {
  const rl = await checkRateLimit("webhook:resend", 60, 60_000);
  if (!rl.ok) {
    console.warn("[webhook/resend] rate limited", rl.retryAfter);
    return NextResponse.json({ ok: true, throttled: true });
  }

  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("[webhook/resend] RESEND_WEBHOOK_SECRET belum diisi — menolak.");
    logEvent("resend_webhook", { outcome: "not_configured" });
    return NextResponse.json(
      { ok: false, error: "webhook_not_configured" },
      { status: 503 },
    );
  }

  // Body mentah (string) WAJIB dipakai apa adanya untuk verifikasi tanda tangan.
  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ ok: true, ignored: "unreadable_body" });
  }

  const verified = verifySvixSignature({
    secret,
    id: req.headers.get("svix-id") ?? "",
    timestamp: req.headers.get("svix-timestamp") ?? "",
    signature: req.headers.get("svix-signature") ?? "",
    body: rawBody,
    nowSec: Math.floor(Date.now() / 1000),
  });
  if (!verified) {
    console.warn("[webhook/resend] tanda tangan tidak valid — ditolak.");
    logEvent("resend_webhook", { outcome: "bad_signature" });
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true, ignored: "invalid_json" });
  }

  const event = parseResendEvent(parsed);
  if (!event) {
    return NextResponse.json({ ok: true, ignored: "unhandled_event" });
  }
  if (event.outcome === "ignored") {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  try {
    const result = await recordEmailDelivery({
      resendId: event.emailId,
      outcome: event.outcome,
      eventType: event.type,
    });
    return NextResponse.json({ ok: true, matched: result.matched });
  } catch (err) {
    console.error("[webhook/resend] gagal memproses:", err);
    // 200 agar Resend tidak menumpuk retry pada error tak terduga.
    return NextResponse.json({ ok: true, error: "processing_failed" });
  }
}

/** GET untuk cek ketersediaan endpoint (tidak membocorkan apa pun). */
export function GET() {
  return NextResponse.json({ ok: true, endpoint: "resend-webhook" });
}
