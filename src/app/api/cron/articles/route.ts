import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getStoredArticles } from "@/lib/articles";
import { taxonomySlug } from "@/lib/article-types";
import { isCronAuthorized, revalidationPaths } from "@/lib/article-api-logic";

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

  if (
    !isCronAuthorized({
      secret,
      authorizationHeader: req.headers.get("authorization"),
      queryToken: new URL(req.url).searchParams.get("token"),
    })
  ) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const now = Date.now();
    const articles = await getStoredArticles();
    const due = articles.filter((a) => {
      const t = Date.parse(a.scheduledAt ?? a.publishedAt);
      return a.status === "published" && !Number.isNaN(t) && t <= now && now - t <= DUE_WINDOW_MS;
    });

    const paths = revalidationPaths(due, taxonomySlug);
    for (const p of paths) revalidatePath(p);

    return NextResponse.json(
      { ok: true, due: due.length, revalidated: paths.length, atISO: new Date(now).toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/cron/articles] gagal:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
