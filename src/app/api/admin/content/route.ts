import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import {
  normalizeSiteContent,
  readSiteContent,
  saveSiteContent,
} from "@/lib/site-content";
import {
  firstSiteContentIssue,
  MAX_SITE_CONTENT_BYTES,
  siteContentSchema,
} from "@/lib/site-content-schema";
import { CACHE_TAGS, REVALIDATE_NOW } from "@/lib/cache-tags";
import { recordAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/content — konten situs SEGAR untuk dashboard (dilindungi admin).
 * Selalu no-store agar dashboard selalu melihat data terbaru, bukan versi cache.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  try {
    const content = await readSiteContent();
    return NextResponse.json(
      { content },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/admin/content] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal memuat konten." },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/content — simpan seluruh konten situs (layanan, FAQ, harga, hero).
 * Body: SiteContent
 */
export async function PUT(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_SITE_CONTENT_BYTES) {
    return NextResponse.json(
      { error: "Payload konten terlalu besar." },
      { status: 413 },
    );
  }

  let rawText: string;
  try {
    rawText = await req.text();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  if (Buffer.byteLength(rawText, "utf8") > MAX_SITE_CONTENT_BYTES) {
    return NextResponse.json(
      { error: "Payload konten terlalu besar." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = siteContentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: firstSiteContentIssue(parsed.error),
        details: parsed.error.issues.slice(0, 8),
      },
      { status: 400 },
    );
  }

  const content = normalizeSiteContent(
    parsed.data as Record<string, unknown>,
  );

  try {
    await saveSiteContent(content, check.email);
    await recordAdminAudit({
      action: "content.update",
      actor: check.email,
      target: "site-content",
    });

    // Invalidasi cache halaman publik agar konten baru langsung tampil.
    revalidateTag(CACHE_TAGS.content, REVALIDATE_NOW);
    revalidatePath("/");
    revalidatePath("/layanan");
    revalidatePath("/blog");
    revalidatePath("/portofolio");
    revalidatePath("/kontak");

    return NextResponse.json(
      { ok: true, content },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api/admin/content] PUT gagal:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan konten." },
      { status: 500 },
    );
  }
}
