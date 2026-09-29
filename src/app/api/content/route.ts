import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/site-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/content — konten publik (layanan, FAQ, harga) untuk komponen client.
 * Data tidak sensitif (memang ditampilkan di website).
 */
export async function GET() {
  const content = await getSiteContent();
  return NextResponse.json(
    { content },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
