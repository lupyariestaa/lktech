import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  getCouponById,
  listCouponRedemptions,
  getCouponStats,
  getCouponDayUsage,
  getCouponAnalytics,
} from "@/lib/coupons";
import type { CouponStat } from "@/lib/coupon-pure";
import { listAdminAudit } from "@/lib/admin-audit";
import type { AdminAuditEntry } from "@/lib/admin-audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/coupons/[id] — detail satu kupon + statistik + daftar pemakai +
 * timeline (audit) — FASE C5/K9. Dipakai halaman detail `/admin/coupons/[id]`.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  try {
    const coupon = await getCouponById(id);
    if (!coupon) {
      return NextResponse.json({ error: "Kupon tidak ditemukan." }, { status: 404 });
    }

    const [redemptions, stats, dayUsage, audit] = await Promise.all([
      listCouponRedemptions(id).catch(() => []),
      getCouponStats().catch(() => ({}) as Record<string, CouponStat>),
      getCouponDayUsage(id).catch(() => 0),
      listAdminAudit({ limit: 500 }).catch(() => [] as AdminAuditEntry[]),
    ]);

    // Timeline: aksi audit yang menyasar kupon ini (by kode ATAU id dokumen).
    const code = coupon.code;
    const timeline = audit.filter(
      (e) => e.target === code || e.target === id,
    );

    const stat = stats[id] ?? stats[`code:${code}`] ?? null;

    // Analitik (C6) — hanya bila diminta (query berat).
    const url = new URL(req.url);
    let analytics = null;
    if (url.searchParams.get("analytics") === "1") {
      const days = Number(url.searchParams.get("days")) || 30;
      analytics = await getCouponAnalytics(id, days).catch(() => null);
    }

    return NextResponse.json(
      {
        coupon,
        stat,
        redemptions,
        dayUsage,
        analytics,
        timeline: timeline.slice(0, 100),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/admin/coupons/[id]] GET gagal:", err);
    return NextResponse.json({ error: "Gagal mengambil kupon." }, { status: 500 });
  }
}
