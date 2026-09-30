import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/settings — pengaturan publik (kontak) untuk komponen client.
 * Data tidak sensitif (hanya info kontak yang memang ditampilkan di website).
 *
 * `no-store`: pengaturan dikelola dari dashboard dan harus SELALU segar —
 * cache sebelumnya (`s-maxage=300`) menyebabkan bug "data basi" (perubahan
 * kontak baru tampil setelah 5 menit). Sama seperti `/api/content`.
 */
export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json(
    { settings },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
