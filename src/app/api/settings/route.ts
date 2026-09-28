import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/settings — pengaturan publik (kontak) untuk komponen client.
 * Data tidak sensitif (hanya info kontak yang memang ditampilkan di website).
 */
export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json(
    { settings },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
