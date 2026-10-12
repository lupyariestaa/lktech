import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/maintenance-status — status mode pemeliharaan (publik, ringan).
 * Dipakai middleware untuk mengarahkan pengunjung saat maintenance aktif.
 * Hanya boolean + versi (untuk cache) — tanpa data sensitif.
 */
export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json(
    {
      enabled: settings.maintenance?.enabled === true,
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}
