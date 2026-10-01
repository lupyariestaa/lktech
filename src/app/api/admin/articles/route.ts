import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import {
  deleteArticleBySlug,
  getStoredArticles,
  saveArticle,
} from "@/lib/articles";
import type { Article } from "@/lib/article-types";
import { articleSchema } from "@/lib/api-schemas";
import { sanitizeSlug } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const article: Article = {
    slug,
    title,
    excerpt: (body.excerpt ?? "").trim(),
    body: body.body ?? "",
    category: (body.category ?? "Artikel").trim(),
    tags: Array.isArray(body.tags) ? body.tags.filter(Boolean) : [],
    cover: (body.cover ?? "default").trim(),
    coverImage:
      typeof body.coverImage === "string" && body.coverImage
        ? body.coverImage
        : undefined,
    author: (body.author ?? "LKTech").trim(),
    status: body.status === "draft" ? "draft" : "published",
    publishedAt: body.publishedAt || new Date().toISOString(),
  };

  try {
    await saveArticle(article, check.email);
    revalidatePath("/blog");
    revalidatePath(`/blog/${article.slug}`);
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
    await deleteArticleBySlug(slug);
    revalidatePath("/blog");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/articles] DELETE gagal:", err);
    return NextResponse.json(
      { error: "Gagal menghapus artikel." },
      { status: 500 },
    );
  }
}
