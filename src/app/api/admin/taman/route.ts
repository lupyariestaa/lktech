import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { listTamanTestimonials, getTamanPrivate } from "@/lib/taman-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/taman — daftar testimoni termasuk pending/hidden & sample (admin).
 * Admin melihat nama lengkap dan email dari `taman_private`. Respons tidak di-cache.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  try {
    const items = await listTamanTestimonials();
    const withPrivate = await Promise.all(
      items.map(async (t) => {
        const priv = await getTamanPrivate(t.id);
        return {
          ...t,
          email: priv?.email ?? null,
          evidenceNote: priv?.evidenceNote ?? null,
          evidenceBy: priv?.evidenceBy ?? null,
          consentText: priv?.consentText ?? null,
        };
      }),
    );
    return NextResponse.json({ items: withPrivate }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/admin/taman] GET gagal:", err);
    return NextResponse.json({ error: "Gagal memuat testimoni." }, { status: 500 });
  }
}
