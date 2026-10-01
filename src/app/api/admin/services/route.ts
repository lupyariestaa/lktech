import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSiteContent } from "@/lib/site-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/services — daftar layanan RINGKAS (slug + judul) untuk
 * dropdown di dashboard. Menghindari memuat seluruh dokumen `SiteContent`
 * hanya untuk mendapatkan daftar layanan.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  try {
    const { services } = await getSiteContent();
    return NextResponse.json(
      { services: services.map((s) => ({ slug: s.slug, title: s.title })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/admin/services] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal memuat layanan." },
      { status: 500 },
    );
  }
}
