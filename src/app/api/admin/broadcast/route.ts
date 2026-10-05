import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { SITE_URL } from "@/lib/site";
import {
  getSubscribersSummary,
  listSubscribers,
  resolveSegmentEmails,
  signNewsletterUnsub,
} from "@/lib/newsletter";
import { sendBroadcast } from "@/lib/email-broadcast";
import { broadcastSchema } from "@/lib/api-schemas";
import { recordAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/broadcast — ringkasan subscriber + daftar (admin).
 *   ?summary=1 (ringkasan), ?list=1 (daftar email)
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const url = new URL(req.url);
  try {
    if (url.searchParams.get("list") === "1") {
      const subscribers = await listSubscribers();
      return NextResponse.json(
        { subscribers },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const summary = await getSubscribersSummary();
    const segmentCounts = {
      semua: (await resolveSegmentEmails("semua")).length,
    };
    return NextResponse.json(
      { summary, segmentCounts },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/admin/broadcast] GET gagal:", err);
    return NextResponse.json({ error: "Gagal memuat data." }, { status: 500 });
  }
}

/**
 * POST /api/admin/broadcast — kirim broadcast ke segmen terpilih.
 * Body: { subject, body, segment, ctaLabel?, ctaUrl? }
 */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = broadcastSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid." },
      { status: 400 },
    );
  }

  try {
    const recipients = await resolveSegmentEmails(parsed.data.segment);
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada penerima pada segmen ini." },
        { status: 409 },
      );
    }

    const result = await sendBroadcast({
      recipients,
      subject: parsed.data.subject,
      body: parsed.data.body,
      ctaLabel: parsed.data.ctaLabel,
      ctaUrl: parsed.data.ctaUrl,
      unsubUrlFor: (email) => {
        const u = new URL("/api/newsletter/unsubscribe", SITE_URL);
        u.searchParams.set("email", email);
        u.searchParams.set("sig", signNewsletterUnsub(email));
        return u.toString();
      },
    });

    await recordAdminAudit({
      action: "settings.update", // reuse aksi audit terdekat (broadcast)
      actor: check.email,
      target: `broadcast:${parsed.data.segment}`,
      meta: { sent: result.sent, failed: result.failed, subject: parsed.data.subject },
    });

    if (result.skipped) {
      return NextResponse.json(
        { error: "Pengiriman email belum dikonfigurasi (RESEND_API_KEY kosong).", result },
        { status: 503 },
      );
    }
    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
      recipients: recipients.length,
    });
  } catch (err) {
    console.error("[api/admin/broadcast] POST gagal:", err);
    return NextResponse.json({ error: "Gagal mengirim broadcast." }, { status: 500 });
  }
}
