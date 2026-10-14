import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { invalidateOrdersSummaryCache } from "@/lib/orders";
import { invalidateSalesAnalyticsCache } from "@/lib/sales-analytics";
import { invalidateCouponStatsCache } from "@/lib/coupons";
import { ALL_CACHE_TAGS, REVALIDATE_NOW } from "@/lib/cache-tags";
import { recordAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/settings/cache — bersihkan cache internal (fase S6).
 * Meng-invalidate cache ringkasan pesanan & statistik kupon + revalidate rute publik.
 */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  try {
    invalidateOrdersSummaryCache();
    invalidateSalesAnalyticsCache();
    invalidateCouponStatsCache();
    // Buang cache data publik (settings, konten, artikel, produk, proyek, promo).
    for (const tag of ALL_CACHE_TAGS) revalidateTag(tag, REVALIDATE_NOW);
    // Segarkan halaman publik yang bergantung data dinamis.
    revalidatePath("/", "layout");
    revalidatePath("/");

    await recordAdminAudit({
      action: "settings.cache_clear",
      actor: check.email,
      target: "cache",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/settings/cache] gagal:", err);
    return NextResponse.json({ error: "Gagal membersihkan cache." }, { status: 500 });
  }
}
