import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { normalizeSiteContent, saveSiteContent } from "@/lib/site-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUT /api/admin/content — simpan seluruh konten situs (layanan, FAQ, harga).
 * Body: SiteContent
 */
export async function PUT(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const content = normalizeSiteContent(body);

  try {
    await saveSiteContent(content, check.email);
    return NextResponse.json({ ok: true, content });
  } catch (err) {
    console.error("[api/admin/content] PUT gagal:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan konten." },
      { status: 500 },
    );
  }
}
