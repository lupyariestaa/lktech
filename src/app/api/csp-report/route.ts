import { NextResponse } from "next/server";
import { parseCspReports } from "@/lib/csp-report-pure";
import { logEvent } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Batas muatan agar endpoint publik ini tidak bisa dipakai membanjiri log. */
const MAX_BODY_BYTES = 32 * 1024;

/**
 * POST /api/csp-report — pengumpul laporan pelanggaran CSP (ADM-05).
 *
 * Endpoint PUBLIK (dipanggil browser, tanpa auth) yang menerima laporan
 * `Content-Security-Policy-Report-Only`. Berguna untuk mengumpulkan bukti
 * pelanggaran nyata sebelum CSP penuh di-*enforce*.
 *
 * Aman & hemat: muatan dibatasi, entri dibatasi, hanya **origin** yang dicatat
 * (path/query/token dibuang), dan selalu membalas `204` (browser mengabaikan
 * isi balasan). Tidak ada data sensitif yang disimpan.
 */
export async function POST(req: Request) {
  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }

  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length === 0 || text.length > MAX_BODY_BYTES) {
      return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    }
    raw = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }

  const violations = parseCspReports(raw);
  for (const v of violations) {
    logEvent("csp_violation", {
      directive: v.directive,
      blocked: v.blocked,
      document: v.document,
    });
  }

  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

/** Browsers kadang memakai GET untuk probe; tolak dengan tenang. */
export function GET() {
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
