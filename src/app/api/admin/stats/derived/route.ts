import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getProjects } from "@/lib/projects";
import { SERVICES } from "@/lib/services";
import { getLocationSlugs } from "@/lib/locations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/stats/derived — angka statistik TURUNAN yang objektif (S4).
 *
 * Hanya menghitung jumlah dari sumber data yang sudah ada:
 * - `projects`: jumlah proyek portofolio (`getProjects()`);
 * - `services`: jumlah layanan (`SERVICES`);
 * - `locations`: jumlah kota (`getLocationSlugs()`).
 *
 * "Klien Puas"/klaim sosial lain TIDAK dihitung di sini (tetap manual). Endpoint
 * ini hanya membaca (read-only), dilindungi admin, dan tidak menyimpan apa pun.
 * Editor memakainya untuk mengisi angka lewat tombol "Sinkronkan angka turunan".
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  try {
    const projects = await getProjects();
    const counts = {
      projects: projects.length,
      services: SERVICES.length,
      locations: getLocationSlugs().length,
    };
    return NextResponse.json(
      { counts, asOf: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/admin/stats/derived] gagal menghitung angka turunan:", err);
    return NextResponse.json(
      { error: "Gagal menghitung angka turunan." },
      { status: 500 },
    );
  }
}
