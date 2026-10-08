import { NextResponse } from "next/server";
import { getArticles, matchesSearch, paginate } from "@/lib/articles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/articles — daftar artikel yang tayang (publik).
 * Query opsional:
 * - `q`      pencarian judul/excerpt/tag/kategori (B5.4)
 * - `limit`  jumlah per halaman, default 12, maks 50 (B5.5)
 * - `cursor` dari `nextCursor` respons sebelumnya (B5.5)
 *
 * Tanpa query apa pun, respons tetap `{ articles }` (kompatibel mundur).
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").slice(0, 100);
  const limitParam = sp.get("limit");
  const cursor = sp.get("cursor");
  const paged = limitParam !== null || cursor !== null;

  const all = await getArticles();
  const filtered = q ? all.filter((a) => matchesSearch(a, q)) : all;

  const headers = {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  };

  if (!paged) {
    return NextResponse.json({ articles: filtered }, { headers });
  }

  const page = paginate(filtered, Number(limitParam ?? 12), cursor);
  return NextResponse.json(
    { articles: page.items, nextCursor: page.nextCursor },
    { headers },
  );
}
