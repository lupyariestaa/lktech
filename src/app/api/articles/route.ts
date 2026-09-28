import { NextResponse } from "next/server";
import { getArticles } from "@/lib/articles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/articles — daftar artikel published (publik).
 */
export async function GET() {
  const articles = await getArticles();
  return NextResponse.json(
    { articles },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
