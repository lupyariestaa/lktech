import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  ANALYTICS_RANGES,
  getSalesAnalytics,
  type AnalyticsMode,
  type AnalyticsRange,
} from "@/lib/sales-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/analytics?days=7|30|90&mode=completed|all
 * Ringkasan analitik penjualan (agregasi server-side).
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  const url = new URL(req.url);
  const daysRaw = Number(url.searchParams.get("days"));
  const days = ANALYTICS_RANGES.includes(daysRaw as AnalyticsRange)
    ? (daysRaw as number)
    : 30;
  const mode: AnalyticsMode =
    url.searchParams.get("mode") === "all" ? "all" : "completed";

  try {
    const analytics = await getSalesAnalytics({ days, mode });
    return NextResponse.json(
      { analytics },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/admin/analytics] gagal:", err);
    return NextResponse.json(
      { error: "Gagal menghitung analitik penjualan." },
      { status: 500 },
    );
  }
}
