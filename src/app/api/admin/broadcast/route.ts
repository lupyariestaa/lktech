import { NextResponse } from "next/server";
import { assertFreshAuth, requireAdmin } from "@/lib/admin-guard";
import { isAdminEmail } from "@/lib/admins";
import { checkRateLimit } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site";
import {
  getBroadcastOverview,
  listSubscribers,
  resolveSegmentEmails,
  signNewsletterUnsub,
} from "@/lib/newsletter";
import { listBroadcastLogs, recordBroadcastLog } from "@/lib/broadcast-log";
import { sendBroadcast, sendTestBroadcast } from "@/lib/email-broadcast";
import { validateBroadcast } from "@/lib/newsletter-pure";
import { recordAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bangun URL unsubscribe bertanda tangan untuk sebuah email. */
function unsubUrlFor(email: string): string {
  const u = new URL("/api/newsletter/unsubscribe", SITE_URL);
  u.searchParams.set("email", email);
  u.searchParams.set("sig", signNewsletterUnsub(email));
  return u.toString();
}

/**
 * GET /api/admin/broadcast — data admin newsletter.
 *   ?list=1    → daftar subscriber
 *   ?history=1 → riwayat broadcast
 *   (default)  → ringkasan + jumlah per segmen
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const url = new URL(req.url);
  const noStore = { headers: { "Cache-Control": "no-store" } };
  try {
    if (url.searchParams.get("list") === "1") {
      const subscribers = await listSubscribers();
      return NextResponse.json({ subscribers }, noStore);
    }
    if (url.searchParams.get("history") === "1") {
      const history = await listBroadcastLogs(50);
      return NextResponse.json({ history }, noStore);
    }
    const overview = await getBroadcastOverview();
    return NextResponse.json(overview, noStore);
  } catch (err) {
    console.error("[api/admin/broadcast] GET gagal:", err);
    return NextResponse.json({ error: "Gagal memuat data." }, { status: 500 });
  }
}

/**
 * POST /api/admin/broadcast — kirim broadcast / email uji.
 * Body: { action?: "send"|"test", subject, body, segment, ctaLabel?, ctaUrl?, testEmail? }
 */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const action = body.action === "test" ? "test" : "send";

  // Broadcast massal = aksi sensitif → wajib re-auth Google yang masih baru.
  if (action === "send") {
    const fresh = assertFreshAuth(check);
    if (!fresh.ok) return fresh.response;
  }

  // ADM-07: batasi spam/kuota email. Broadcast massal lebih ketat daripada uji.
  const rl = await checkRateLimit(
    `broadcast-${action}:${check.uid}`,
    action === "test" ? 10 : 5,
    10 * 60 * 1000,
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  // Validasi murni (pesan error seragam dgn UI).
  const validated = validateBroadcast({
    subject: body.subject,
    body: body.body,
    segment: body.segment,
    ctaLabel: body.ctaLabel,
    ctaUrl: body.ctaUrl,
  });
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const draft = validated.draft;

  // ===== Kirim email uji ke alamat tertentu (tidak menyentuh subscriber) =====
  if (action === "test") {
    const to =
      typeof body.testEmail === "string" && body.testEmail.trim()
        ? body.testEmail.trim().toLowerCase()
        : check.email;

    // Cegah endpoint uji dipakai mengirim ke alamat publik sembarang.
    const self = check.email.trim().toLowerCase();
    if (to !== self && !(await isAdminEmail(to))) {
      return NextResponse.json(
        { error: "Email uji harus alamat admin aktif." },
        { status: 403 },
      );
    }

    const result = await sendTestBroadcast({
      to,
      subject: draft.subject,
      body: draft.body,
      ctaLabel: draft.ctaLabel,
      ctaUrl: draft.ctaUrl,
      unsubUrl: unsubUrlFor(to),
    });
    if (result.skipped) {
      return NextResponse.json(
        { error: "Pengiriman email belum dikonfigurasi (RESEND_API_KEY kosong)." },
        { status: 503 },
      );
    }
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Gagal mengirim email uji." },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, test: true, to });
  }

  // ===== Kirim broadcast ke segmen =====
  try {
    const recipients = await resolveSegmentEmails(draft.segment);
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada penerima pada segmen ini." },
        { status: 409 },
      );
    }

    const result = await sendBroadcast({
      recipients,
      subject: draft.subject,
      body: draft.body,
      ctaLabel: draft.ctaLabel,
      ctaUrl: draft.ctaUrl,
      unsubUrlFor,
    });

    if (result.skipped) {
      return NextResponse.json(
        { error: "Pengiriman email belum dikonfigurasi (RESEND_API_KEY kosong)." },
        { status: 503 },
      );
    }

    await recordBroadcastLog({
      subject: draft.subject,
      segment: draft.segment,
      recipients: result.requested,
      sent: result.sent,
      failed: result.failed,
      actor: check.email,
    });

    // F-N8: aksi audit khusus (bukan lagi `settings.update`).
    await recordAdminAudit({
      action: "broadcast.send",
      actor: check.email,
      target: `broadcast:${draft.segment}`,
      meta: {
        sent: result.sent,
        failed: result.failed,
        recipients: result.requested,
        subject: draft.subject,
      },
    });

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
      recipients: result.requested,
      truncated: result.truncated ?? false,
    });
  } catch (err) {
    console.error("[api/admin/broadcast] POST gagal:", err);
    return NextResponse.json({ error: "Gagal mengirim broadcast." }, { status: 500 });
  }
}
