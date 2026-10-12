import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { checkRateLimit } from "@/lib/rate-limit";
import { isMayarConfigured, getMayarMode, pingMayar } from "@/lib/mayar";
import { isEmailConfigured, sendTestEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/integrations/test — uji koneksi (PING) sebuah layanan.
 * Fase S5. Hanya uji aman (tanpa transaksi berbiaya). Rate-limited.
 */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const rl = await checkRateLimit(`inttest:${check.uid}`, 20, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan uji. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: { service?: string };
  try {
    body = (await req.json()) as { service?: string };
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const service = body.service;

  try {
    if (service === "mayar") {
      if (!isMayarConfigured()) {
        return NextResponse.json({ service, ok: false, detail: "MAYAR_API_KEY belum diisi." });
      }
      const res = await pingMayar();
      return NextResponse.json({ service, ok: res.ok, mode: getMayarMode(), detail: res.detail });
    }

    if (service === "email") {
      if (!isEmailConfigured) {
        return NextResponse.json({ service, ok: false, detail: "RESEND_API_KEY belum diisi." });
      }
      // Kirim email uji ke alamat admin yang login (aman, tidak menerima alamat dari body).
      const result = await sendTestEmail(check.email);
      return NextResponse.json({
        service,
        ok: result.ok,
        detail: result.ok
          ? `Email uji dikirim ke ${check.email}.`
          : `Gagal: ${result.error ?? "unknown"}`,
      });
    }

    if (service === "cloudinary") {
      const { isCloudinaryConfigured, cloudinary } = await import("@/lib/cloudinary");
      if (!isCloudinaryConfigured) {
        return NextResponse.json({ service, ok: false, detail: "Kredensial Cloudinary belum lengkap." });
      }
      const res = await cloudinary.api.ping();
      return NextResponse.json({ service, ok: true, detail: `Ping OK (${res.status ?? "ok"}).` });
    }

    if (service === "upstash") {
      const { isDistributedRateLimitConfigured, pingUpstash } = await import("@/lib/rate-limit");
      if (!isDistributedRateLimitConfigured()) {
        return NextResponse.json({
          service,
          ok: false,
          detail: "Upstash belum dikonfigurasi (rate-limit pakai in-memory).",
        });
      }
      const res = await pingUpstash();
      return NextResponse.json({ service, ok: res.ok, detail: res.detail });
    }

    return NextResponse.json({ error: "Layanan tidak dikenal." }, { status: 400 });
  } catch (err) {
    console.error("[api/admin/integrations/test] gagal:", err);
    return NextResponse.json({ service, ok: false, detail: "Terjadi kesalahan saat uji." });
  }
}
