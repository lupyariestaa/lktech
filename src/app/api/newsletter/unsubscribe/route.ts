import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { parseToken } from "@/lib/download-token";
import { unsubscribeEmail } from "@/lib/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/newsletter/unsubscribe?email=<email>&sig=<hmac> — berhenti
 * berlangganan newsletter (Tema 2.2). Fail-closed bila secret kosong.
 */
function secret(): string {
  return (
    process.env.NEWSLETTER_UNSUB_SECRET?.trim() ||
    process.env.DOWNLOAD_TOKEN_SECRET?.trim() ||
    process.env.MAYAR_API_KEY?.trim() ||
    ""
  );
}

function page(title: string, body: string, status: number) {
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex"/><title>${title} — LKTech</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;margin:0;padding:48px 16px">
<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;text-align:center">
<h1 style="font-size:20px;color:#0a0f1e;margin:0 0 12px">${title}</h1>
<p style="color:#475569;font-size:14px;line-height:1.6;margin:0">${body}</p>
<p style="margin-top:24px"><a href="/" style="color:#004EDF;font-size:14px;font-weight:600">Kembali ke LKTech</a></p>
</div></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase() ?? "";
  const sig = url.searchParams.get("sig")?.trim() ?? "";
  const s = secret();

  if (!s) return page("Belum siap", "Endpoint belum dikonfigurasi.", 503);
  if (!email || !sig) return page("Tautan tidak valid", "Parameter tidak lengkap.", 400);

  const verified = parseToken(`${email}.${sig}`, s);
  if (verified !== email) {
    return page("Tautan tidak valid", "Signature tidak cocok.", 401);
  }

  const db = getAdminDb();
  if (!db) return page("Belum siap", "Server belum dikonfigurasi.", 503);

  try {
    await unsubscribeEmail(email);
    return page("Berhasil berhenti berlangganan", "Anda tidak akan lagi menerima email promo/konten dari kami.", 200);
  } catch (err) {
    console.error("[api/newsletter/unsubscribe] gagal:", err);
    return page("Terjadi kesalahan", "Coba lagi nanti.", 500);
  }
}
