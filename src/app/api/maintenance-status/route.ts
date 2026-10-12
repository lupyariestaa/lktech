import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/maintenance-status — status mode pemeliharaan (publik, ringan).
 * Dipakai proxy untuk mengarahkan pengunjung saat maintenance aktif.
 * Hanya boolean — tanpa data sensitif.
 *
 * Cache (G7): sebelumnya `s-maxage=30` membuat status "basi" ~30–90s setelah
 * admin men-toggle (toggle → tes masih tampak normal). Endpoint ini sangat
 * ringan (baca satu dokumen), jadi kini **tanpa cache sama sekali**
 * (`no-store`) agar perubahan maintenance langsung berlaku di proxy.
 */
export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json(
    {
      enabled: settings.maintenance?.enabled === true,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
