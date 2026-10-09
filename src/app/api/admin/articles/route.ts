import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import {
  deleteArticleBySlug,
  getStoredArticles,
  saveArticle,
} from "@/lib/articles";
import { taxonomySlug, type Article } from "@/lib/article-types";
import { estimateReadingTime } from "@/lib/article-logic";
import { buildSlugHistory, decideAuditAction, revalidationPaths } from "@/lib/article-api-logic";
import { findHistoryConflict } from "@/lib/slug-conflict";
import { recordAdminAudit } from "@/lib/admin-audit";
import { articleSchema } from "@/lib/api-schemas";
import { sanitizeSlug } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Revalidate halaman blog terkait artikel (sumber path: `revalidationPaths`). */
function revalidateBlog(
  ...articles: Array<Pick<Article, "slug" | "category" | "tags"> | undefined>
) {
  for (const p of revalidationPaths(articles, taxonomySlug)) revalidatePath(p);
}
/** GET /api/admin/articles — daftar artikel (termasuk draft). */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  try {
    const articles = await getStoredArticles();
    return NextResponse.json({ articles });
  } catch (err) {
    console.error("[api/admin/articles] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal memuat artikel." },
      { status: 500 },
    );
  }
}

/** POST /api/admin/articles — buat/perbarui artikel. */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = articleSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data artikel tidak valid." },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const title = body.title.trim();
  const slug = sanitizeSlug(body.slug?.trim() || title);
  if (!slug) {
    return NextResponse.json({ error: "Slug tidak valid." }, { status: 400 });
  }


  const articleBody = body.body ?? "";

  // B5.7: slug berubah → slug lama masuk riwayat (redirect 301 di halaman).
  const existingList = await getStoredArticles();

  // G4: slug yang masih jadi riwayat redirect artikel lain tidak boleh dipakai
  // (akan menghapus redirect itu diam-diam).
  const conflict = findHistoryConflict(slug, existingList);
  if (conflict) {
    return NextResponse.json(
      {
        error: `Slug "${slug}" masih dipakai sebagai redirect oleh artikel "${conflict.slug}". Pilih slug lain.`,
      },
      { status: 409 },
    );
  }
  const previousBySlug = existingList.find((a) => a.slug === slug);
  const renamedFrom = typeof body.renamedFrom === "string" ? sanitizeSlug(body.renamedFrom) : "";
  const previousRename = renamedFrom
    ? existingList.find((a) => a.slug === renamedFrom)
    : undefined;
  const history = buildSlugHistory({
    slug,
    currentHistory: previousBySlug?.slugHistory,
    renamedFrom: previousRename ? renamedFrom : undefined,
    renamedFromHistory: previousRename?.slugHistory,
  });

  const article: Article = {
    slug,
    title,
    excerpt: (body.excerpt ?? "").trim(),
    body: articleBody,
    readingTime: estimateReadingTime(articleBody),
    metaTitle: body.metaTitle?.trim() || undefined,
    metaDescription: body.metaDescription?.trim() || undefined,
    scheduledAt: body.scheduledAt || undefined,
    slugHistory: history,
    category: (body.category ?? "Artikel").trim(),
    tags: Array.isArray(body.tags) ? body.tags.filter(Boolean) : [],
    cover: (body.cover ?? "default").trim(),
    coverImage:
      typeof body.coverImage === "string" && body.coverImage
        ? body.coverImage
        : undefined,
    coverAlt: body.coverAlt?.trim() || undefined,
    author: (body.author ?? "LKTech").trim(),
    status: body.status === "draft" ? "draft" : "published",
    publishedAt: body.publishedAt || new Date().toISOString(),
  };

  try {
    // Versi sebelumnya (jika ada) ikut di-revalidate: kategori/tag lama bisa berubah.
    // Saat rename, versi sebelumnya ada di slug lama (previousRename).
    const previous = previousBySlug ?? previousRename;
    await saveArticle(article, check.email);
    revalidateBlog(previous, article);

    const duplicatedFrom =
      typeof body.duplicatedFrom === "string" ? sanitizeSlug(body.duplicatedFrom) : "";
    const action = decideAuditAction({
      hasPrevious: previous !== undefined,
      previousStatus: previous?.status,
      nextStatus: article.status,
      duplicatedFrom: duplicatedFrom || undefined,
    });
    await recordAdminAudit({
      action,
      actor: check.email,
      target: slug,
      meta: {
        ...(previous ? { from: previous.status } : { baru: true }),
        to: article.status,
        ...(renamedFrom ? { renamedFrom } : {}),
        ...(duplicatedFrom ? { duplicatedFrom } : {}),
      },
    });
    return NextResponse.json({ ok: true, article });
  } catch (err) {
    console.error("[api/admin/articles] POST gagal:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan artikel." },
      { status: 500 },
    );
  }
}

/** DELETE /api/admin/articles?slug=xxx */
export async function DELETE(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug wajib diisi." }, { status: 400 });
  }

  try {
    const previous = (await getStoredArticles()).find((a) => a.slug === slug);
    await deleteArticleBySlug(slug);
    revalidateBlog(previous ?? { slug, category: "", tags: [] });
    await recordAdminAudit({ action: "article.delete", actor: check.email, target: slug });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/articles] DELETE gagal:", err);
    return NextResponse.json(
      { error: "Gagal menghapus artikel." },
      { status: 500 },
    );
  }
}
