import { NextResponse } from "next/server";
import { listTamanTestimonials } from "@/lib/taman-store";
import { publicPool, MIN_TO_SHOW } from "@/lib/taman-logic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/taman — testimoni publik (whitelist, lihat `publicView`).
 * - Hanya `real` + `published` + persetujuan tercatat. Sample tidak pernah keluar di sini (D2).
 * - Tidak mengembalikan email, uid, nama lengkap, atau catatan bukti.
 * - Cache publik singkat (CDN); klien tetap mendapat data segar setelah penerbitan.
 */
export async function GET() {
  const all = await listTamanTestimonials();
  const items = publicPool(all);
  return NextResponse.json(
    { items, total: items.length, minToShow: MIN_TO_SHOW },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
