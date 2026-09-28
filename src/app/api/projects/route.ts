import { NextResponse } from "next/server";
import { getProjects } from "@/lib/projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/projects — daftar proyek portofolio (publik, non-sensitif).
 * Selalu fresh karena dikelola dari dashboard (Firestore).
 */
export async function GET() {
  const projects = await getProjects();
  return NextResponse.json(
    { projects },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    },
  );
}
