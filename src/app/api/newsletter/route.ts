import { NextResponse } from "next/server";
import { subscribeEmail } from "@/lib/newsletter";
import { newsletterSchema } from "@/lib/api-schemas";
import { clientIp, checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/newsletter — daftar newsletter (opt-in publik).
 * Body: { email, name?, website? (honeypot) }
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = await checkRateLimit(`newsletter:${ip}`, 6, 10 * 60 * 1000);
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

  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Email tidak valid." },
      { status: 400 },
    );
  }

  // Honeypot: bila terisi → anggap bot, balas sukses palsu tanpa menyimpan.
  if (parsed.data.website && parsed.data.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const ok = await subscribeEmail(parsed.data.email, {
    name: parsed.data.name,
    source: parsed.data.source ?? "website",
  });
  if (!ok) {
    return NextResponse.json(
      { error: "Gagal mendaftar. Coba lagi." },
      { status: 503 },
    );
  }
  return NextResponse.json({
    ok: true,
    message: "Terima kasih! Anda berlangganan info & promo LKTech.",
  });
}
