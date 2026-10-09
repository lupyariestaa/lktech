import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { deleteArticleBySlug, getStoredArticles, saveArticle } from "@/lib/articles";
import { taxonomySlug, type Article } from "@/lib/article-types";
import { BULK_ACTIONS, normalizeBulkSlugs, type BulkAction } from "@/lib/article-manage";
import { recordAdminAudit } from "@/lib/admin-audit";
import { revalidationPaths } from "@/lib/article-api-logic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bulkSchema = z.object({
  action: z.enum(BULK_ACTIONS),
  slugs: z.unknown(),
});

/**
 * POST /api/admin/articles/bulk — aksi massal (B4.3).
 * Body: { action: "publish" | "unpublish" | "delete", slugs: string[] } (maks 50).
 * Setiap item dicatat di audit. Kegagalan satu item tidak membatalkan item lain;
 * hasil per item dikembalikan.
 */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = bulkSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  }
  const list = normalizeBulkSlugs(parsed.data.slugs);
  if (!list.ok) {
    return NextResponse.json({ error: list.error }, { status: 400 });
  }

  const action: BulkAction = parsed.data.action;
  const all = await getStoredArticles();
  const byslug = new Map(all.map((a) => [a.slug, a]));

  const results: Array<{ slug: string; ok: boolean; error?: string }> = [];
  for (const slug of list.slugs) {
    const current = byslug.get(slug);
    if (!current) {
      results.push({ slug, ok: false, error: "Tidak ditemukan." });
      continue;
    }
    try {
      if (action === "delete") {
        await deleteArticleBySlug(slug);
      } else {
        // `id` (doc id) bukan bagian dari artikel; jangan ikut tersimpan.
        const { id: _docId, ...rest } = current;
        void _docId;
        const next: Article = {
          ...rest,
          status: action === "publish" ? "published" : "draft",
        };
        await saveArticle(next, check.email);
      }
      await recordAdminAudit({
        action: "article.bulk",
        actor: check.email,
        target: slug,
        meta: { bulk: action },
      });
      results.push({ slug, ok: true });
    } catch (err) {
      console.error("[api/admin/articles/bulk] gagal:", slug, err);
      results.push({ slug, ok: false, error: "Gagal memproses." });
    }
  }

  // Revalidate halaman terkait untuk semua item yang berhasil.
  const touched = all.filter((a) => results.some((r) => r.ok && r.slug === a.slug));
  for (const p of revalidationPaths(touched, taxonomySlug)) revalidatePath(p);

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({ ok: true, action, done: okCount, failed: results.length - okCount, results });
}
