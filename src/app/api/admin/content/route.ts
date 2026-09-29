import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { getSiteContent, normalizeSiteContent, saveSiteContent } from "@/lib/site-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/content — konten situs SEGAR untuk dashboard (dilindungi admin).
 * Selalu no-store agar dashboard selalu melihat data terbaru, bukan versi cache.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  try {
    const content = await getSiteContent();
    return NextResponse.json(
      { content },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/admin/content] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal memuat konten." },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/content — simpan seluruh konten situs (layanan, FAQ, harga, hero).
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

    // Invalidasi cache halaman publik agar konten baru langsung tampil.
    revalidatePath("/");
    revalidatePath("/layanan");
    revalidatePath("/blog");
    revalidatePath("/portofolio");
    revalidatePath("/kontak");

    return NextResponse.json(
      { ok: true, content },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/admin/content] PUT gagal:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan konten." },
      { status: 500 },
    );
  }
}
