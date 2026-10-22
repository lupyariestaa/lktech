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
import {
  BROADCAST_MAX_PER_RUN,
  isBroadcastConfigured,
  sendBroadcast,
  sendTestBroadcast,
} from "@/lib/email-broadcast";
import { validateBroadcast } from "@/lib/newsletter-pure";
import { recordAdminAudit } from "@/lib/admin-audit";
import { normalizeBroadcastIdempotencyKey } from "@/lib/broadcast-idempotency-pure";
import {
  beginBroadcastRequest,
  completeBroadcastRequest,
  markBroadcastRequestIndeterminate,
  releaseBroadcastRequest,
} from "@/lib/broadcast-idempotency";
import { reserveBroadcastQuota } from "@/lib/broadcast-quota";

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
    await recordAdminAudit({
      action: "email.test",
      actor: check.email,
      target: to,
      meta: { kind: "broadcast" },
    });
    return NextResponse.json({ ok: true, test: true, to });
  }

  // ===== Kirim broadcast ke segmen (idempotent, ADM-07) =====
  const idempotencyKey = normalizeBroadcastIdempotencyKey(
    req.headers.get("idempotency-key") ?? body.idempotencyKey,
  );
  if (!idempotencyKey) {
    return NextResponse.json(
      {
        error:
          "idempotencyKey wajib diisi (8–128 karakter: huruf, angka, titik dua, garis bawah, atau tanda hubung).",
        code: "idempotency_key_required",
      },
      { status: 400 },
    );
  }

  // Reservasi SEBELUM kirim. Bila penyimpanan tidak tersedia, tolak kirim:
  // tanpa reservation, retry bisa mengirim email ganda.
  const begin = await beginBroadcastRequest({
    uid: check.uid,
    key: idempotencyKey,
    actor: check.email,
    draft,
  });

  if (begin.state === "completed") {
    return NextResponse.json({ ...begin.result, replayed: true });
  }
  if (begin.state === "processing") {
    return NextResponse.json(
      {
        error: "Broadcast dengan key ini sedang diproses. Tunggu, lalu muat ulang riwayat.",
        code: "broadcast_in_progress",
      },
      { status: 409, headers: { "Retry-After": "30" } },
    );
  }
  if (begin.state === "indeterminate") {
    return NextResponse.json(
      {
        error:
          "Status pengiriman sebelumnya belum pasti. Periksa riwayat broadcast; jangan kirim ulang dengan key yang sama.",
        code: "broadcast_outcome_unknown",
      },
      { status: 409 },
    );
  }
  if (begin.state === "conflict") {
    return NextResponse.json(
      {
        error:
          "idempotencyKey sudah dipakai untuk konten yang berbeda. Muat ulang komposer sebelum mengirim.",
        code: "idempotency_conflict",
      },
      { status: 409 },
    );
  }
  if (begin.state !== "new") {
    return NextResponse.json(
      {
        error:
          "Penyimpanan idempotency tidak tersedia. Broadcast tidak dikirim agar tidak terjadi duplikasi.",
      },
      { status: 503 },
    );
  }

  const requestId = begin.docId;
  let recipients: string[];
  try {
    recipients = await resolveSegmentEmails(draft.segment);
  } catch (err) {
    console.error("[api/admin/broadcast] resolve segmen gagal:", err);
    await releaseBroadcastRequest(requestId).catch(() => {});
    return NextResponse.json({ error: "Gagal memuat penerima." }, { status: 500 });
  }
  if (recipients.length === 0) {
    await releaseBroadcastRequest(requestId).catch(() => {});
    return NextResponse.json(
      { error: "Tidak ada penerima pada segmen ini." },
      { status: 409 },
    );
  }

  if (!isBroadcastConfigured()) {
    await releaseBroadcastRequest(requestId).catch(() => {});
    return NextResponse.json(
      { error: "Pengiriman email belum dikonfigurasi (RESEND_API_KEY kosong)." },
      { status: 503 },
    );
  }

  // ADM-07: guard kuota harian (opt-in via BROADCAST_DAILY_QUOTA). Reserve
  // sejumlah email yang benar-benar akan dicoba (maks per-run).
  const quota = await reserveBroadcastQuota(
    Math.min(recipients.length, BROADCAST_MAX_PER_RUN),
  );
  if (!quota.ok) {
    await releaseBroadcastRequest(requestId).catch(() => {});
    if (quota.code === "quota_exceeded") {
      return NextResponse.json(
        {
          error:
            "Kuota email broadcast harian tidak cukup. Kurangi penerima atau coba lagi setelah kuota direset.",
          code: "broadcast_quota_exceeded",
          used: quota.used,
          limit: quota.limit,
          requested: quota.requested,
        },
        { status: 429, headers: { "Retry-After": "3600" } },
      );
    }
    return NextResponse.json(
      {
        error:
          "Guard kuota broadcast tidak tersedia. Pengiriman dibatalkan agar kuota tidak terlampaui tanpa terukur.",
        code: "broadcast_quota_unavailable",
      },
      { status: 503 },
    );
  }

  let result: Awaited<ReturnType<typeof sendBroadcast>>;
  try {
    result = await sendBroadcast({
      recipients,
      subject: draft.subject,
      body: draft.body,
      ctaLabel: draft.ctaLabel,
      ctaUrl: draft.ctaUrl,
      unsubUrlFor,
    });
  } catch (err) {
    // Bisa jadi sebagian email sudah terkirim. Jangan izinkan key ini dipakai
    // ulang otomatis; admin harus memeriksa riwayat.
    console.error("[api/admin/broadcast] hasil pengiriman tidak pasti:", err);
    await markBroadcastRequestIndeterminate(requestId).catch(() => {});
    return NextResponse.json(
      {
        error:
          "Hasil pengiriman belum pasti (mungkin sebagian email sudah terkirim). Periksa riwayat sebelum mencoba lagi.",
        code: "broadcast_outcome_unknown",
      },
      { status: 502 },
    );
  }

  if (result.skipped) {
    // Belum ada email yang dicoba: aman melepas key agar bisa dicoba ulang
    // setelah konfigurasi email diperbaiki.
    await releaseBroadcastRequest(requestId).catch(() => {});
    return NextResponse.json(
      { error: "Pengiriman email belum dikonfigurasi (RESEND_API_KEY kosong)." },
      { status: 503 },
    );
  }

  const responseResult = {
    ok: true,
    sent: result.sent,
    failed: result.failed,
    recipients: result.requested,
    truncated: result.truncated ?? false,
  };

  // Simpan hasil lebih dulu agar retry setelah response hilang mengembalikan
  // hasil yang sama, bukan mengirim ulang email.
  await completeBroadcastRequest(requestId, responseResult).catch((err) => {
    console.error("[api/admin/broadcast] gagal menyimpan hasil idempotency:", err);
  });

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
      idempotencyKey: idempotencyKey.slice(0, 12),
    },
  });

  return NextResponse.json({ ...responseResult, replayed: false });
}
