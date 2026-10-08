import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getStoredArticles } from "@/lib/articles";
import { taxonomySlug } from "@/lib/article-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Jendela ke belakang yang dianggap "baru jatuh tempo" (ms). */
const DUE_WINDOW_MS = 2 * 60 * 60 * 1000;

/**
 * GET/POST /api/cron/articles — revalidate halaman blog untuk artikel terjadwal
 * yang baru jatuh tempo (B5.3). Tanpa ini, halaman cache bisa menampilkan
 * artikel terjadwal lama sampai revalidate berikutnya.
 *
 * KEAMANAN: sama dengan cron lain. `CRON_SECRET` wajib; kosong → 503 (fail-closed).
 * PENJADWALAN: cron eksternal, misalnya tiap jam (bukan vercel.json).
 */
async function run(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "cron_disabled", hint: "Set CRON_SECRET." },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  const queryToken = new URL(req.url).searchParams.get("token") ?? "";
  if ((bearer || queryToken) !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const now = Date.now();
    const articles = await getStoredArticles();
    const due = articles.filter((a) => {
      const t = Date.parse(a.scheduledAt ?? a.publishedAt);
      return a.status === "published" && !Number.isNaN(t) && t <= now && now - t <= DUE_WINDOW_MS;
    });

    const paths = new Set<string>(["/blog", "/blog/rss.xml", "/sitemap.xml"]);
    for (const a of due) {
      paths.add(`/blog/${a.slug}`);
      if (a.category) paths.add(`/blog/kategori/${taxonomySlug(a.category)}`);
      for (const t of a.tags) paths.add(`/blog/tag/${taxonomySlug(t)}`);
    }
    for (const p of paths) revalidatePath(p);

    return NextResponse.json(
      { ok: true, due: due.length, revalidated: paths.size, atISO: new Date(now).toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/cron/articles] gagal:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
