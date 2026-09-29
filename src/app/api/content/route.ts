import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/site-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/content — konten publik (layanan, FAQ, harga, hero) untuk komponen client.
 * Data tidak sensitif (memang ditampilkan di website).
 *
 * Sengaja `no-store`: agar perubahan dari dashboard langsung terlihat, tanpa
 * tertahan cache edge (sebelumnya s-maxage=300 yang menyebabkan data basi).
 */
export async function GET() {
  const content = await getSiteContent();
  return NextResponse.json(
    { content },
    { headers: { "Cache-Control": "no-store" } },
  );
}
