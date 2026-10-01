import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { isCloudinaryConfigured, destroyAsset } from "@/lib/cloudinary";
import {
  MEDIA_CATEGORIES,
  MEDIA_SORT_KEYS,
  MEDIA_STATUS_FILTERS,
  type MediaCategory,
  type MediaItem,
  type MediaSortKey,
  type MediaStatusFilter,
} from "@/lib/media-types";
import { mediaCreateSchema, mediaUpdateSchema } from "@/lib/api-schemas";
import {
  deleteMediaDoc,
  getMediaItem,
  listMedia,
  restoreMediaItem,
  trashMediaItem,
  updateMediaItem,
} from "@/lib/media";
import { scanMediaUsage, usagesForItem } from "@/lib/media-usage";
import { revalidateMediaPaths } from "@/lib/media-revalidate";
import { recordMediaAudit } from "@/lib/media-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/media
 * Daftar aset media terpaginasi.
 * Query: q, category, collectionId, tag, status, sort, cursor, limit.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  const sp = new URL(req.url).searchParams;
  const categoryRaw = sp.get("category");
  const sortRaw = sp.get("sort");
  const statusRaw = sp.get("status");
  const limitRaw = sp.get("limit");

  const category = MEDIA_CATEGORIES.includes(categoryRaw as MediaCategory)
    ? (categoryRaw as MediaCategory)
    : undefined;
  const sort = MEDIA_SORT_KEYS.includes(sortRaw as MediaSortKey)
    ? (sortRaw as MediaSortKey)
    : undefined;
  const status = MEDIA_STATUS_FILTERS.includes(statusRaw as MediaStatusFilter)
    ? (statusRaw as MediaStatusFilter)
    : undefined;
  const limit = limitRaw ? Number(limitRaw) : undefined;

  try {
    const result = await listMedia(db, {
      q: sp.get("q") ?? undefined,
      category,
      collectionId: sp.get("collectionId") ?? undefined,
      tag: sp.get("tag") ?? undefined,
      favorite: sp.get("favorite") === "true" ? true : undefined,
      status,
      sort,
      cursor: sp.get("cursor") ?? undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/admin/media] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data media." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/media — simpan metadata aset yang sudah diunggah.
 * Body: { publicId, secureUrl, width, height, format, bytes, category, title, … }
 */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  let body: Partial<MediaItem>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = mediaCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "publicId dan secureUrl wajib diisi." },
      { status: 400 },
    );
  }

  const {
    publicId,
    secureUrl,
    width,
    height,
    format,
    bytes,
    category,
    title,
    alt,
    description,
    tags,
    projectSlug,
    productSlug,
    articleSlug,
  } = parsed.data;

  const cat: MediaCategory = MEDIA_CATEGORIES.includes(
    category as MediaCategory,
  )
    ? (category as MediaCategory)
    : "lainnya";

  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

  try {
    const now = new Date().toISOString();
    const cleanTitle = typeof title === "string" ? title.trim() : "";
    const ref = await db.collection("media").add({
      publicId,
      secureUrl,
      width: num(width),
      height: num(height),
      format: typeof format === "string" ? format : "",
      bytes: num(bytes),
      category: cat,
      title: cleanTitle,
      // `alt` default = judul bila tidak diisi (backward-compat a11y).
      alt: (typeof alt === "string" && alt.trim()) || cleanTitle,
      description: typeof description === "string" ? description : "",
      tags: Array.isArray(tags) ? tags : [],
      projectSlug: typeof projectSlug === "string" ? projectSlug : "",
      productSlug: typeof productSlug === "string" ? productSlug : "",
      articleSlug: typeof articleSlug === "string" ? articleSlug : "",
      favorite: false,
      status: "active",
      usageCount: 0,
      usedIn: [],
      createdAtISO: now,
      updatedAtISO: now,
      uploadedBy: check.email,
    });

    revalidateMediaPaths();
    await recordMediaAudit(db, {
      action: "upload",
      mediaId: ref.id,
      publicId,
      actor: check.email,
      meta: { category: cat, title: cleanTitle },
    });
    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error("[api/admin/media] POST gagal:", err);
    return NextResponse.json({ error: "Gagal menyimpan media." }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/media?id=xxx
 * Perbarui metadata media (partial) atau pulihkan (status: "active").
 */
export async function PATCH(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  // Pulihkan dari trash: status=active (bukan bagian mediaUpdateSchema).
  if (body.status === "active") {
    try {
      const item = await restoreMediaItem(db, id);
      if (!item) {
        return NextResponse.json({ error: "Media tidak ditemukan." }, { status: 404 });
      }
      revalidateMediaPaths();
      await recordMediaAudit(db, {
        action: "restore",
        mediaId: id,
        publicId: item.publicId,
        actor: check.email,
      });
      return NextResponse.json({ ok: true, item });
    } catch (err) {
      console.error("[api/admin/media] PATCH restore gagal:", err);
      return NextResponse.json({ error: "Gagal memulihkan media." }, { status: 500 });
    }
  }

  const parsed = mediaUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data update tidak valid." },
      { status: 400 },
    );
  }

  try {
    const item = await updateMediaItem(db, id, parsed.data);
    if (!item) {
      return NextResponse.json({ error: "Media tidak ditemukan." }, { status: 404 });
    }
    revalidateMediaPaths();
    await recordMediaAudit(db, {
      action: "update",
      mediaId: id,
      publicId: item.publicId,
      actor: check.email,
      meta: { fields: Object.keys(parsed.data) },
    });
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    console.error("[api/admin/media] PATCH gagal:", err);
    return NextResponse.json({ error: "Gagal memperbarui media." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/media?id=xxx[&publicId=yyy][&hard=true]
 *
 * Default: soft delete (trash) — hanya menandai `status=trashed`.
 * `hard=true`: hapus permanen (metadata + aset Cloudinary).
 *
 * Catatan: guard "aset masih dipakai" ditambahkan di FASE M3.
 */
export async function DELETE(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const publicIdParam = url.searchParams.get("publicId");
  const hard = url.searchParams.get("hard") === "true";

  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  try {
    // Soft delete: tandai trashed, jangan sentuh Cloudinary.
    if (!hard) {
      const item = await trashMediaItem(db, id);
      if (!item) {
        return NextResponse.json({ error: "Media tidak ditemukan." }, { status: 404 });
      }
      revalidateMediaPaths();
      await recordMediaAudit(db, {
        action: "trash",
        mediaId: id,
        publicId: item.publicId,
        actor: check.email,
      });
      return NextResponse.json({ ok: true, trashed: true, item });
    }

    // Hard delete: ambil publicId dari dokumen (lebih tepercaya dari query).
    const existing = await getMediaItem(db, id);
    if (!existing) {
      return NextResponse.json({ error: "Media tidak ditemukan." }, { status: 404 });
    }
    const publicId = existing.publicId || publicIdParam || "";

    // GUARD (MED-04): tolak hapus permanen bila aset masih dipakai di konten.
    // `?force=true` untuk mengabaikan (dipakai hanya bila admin benar-benar tahu).
    const force = url.searchParams.get("force") === "true";
    if (!force) {
      const index = await scanMediaUsage(db);
      const usedIn = usagesForItem(index, existing);
      if (usedIn.length > 0) {
        return NextResponse.json(
          {
            error: "Aset masih dipakai di konten. Hapus referensinya dulu.",
            usedIn,
          },
          { status: 409 },
        );
      }
    }

    const removed = await deleteMediaDoc(db, id);
    if (!removed) {
      return NextResponse.json({ error: "Media tidak ditemukan." }, { status: 404 });
    }

    if (publicId && isCloudinaryConfigured) {
      try {
        await destroyAsset(publicId);
      } catch (err) {
        console.error("[api/admin/media] gagal hapus di Cloudinary:", err);
        // Metadata tetap terhapus; aset Cloudinary bisa dibersihkan manual.
      }
    }

    revalidateMediaPaths();
    // Catat audit SEBELUM dokumen media benar-benar tiada (mediaId tetap dicatat).
    await recordMediaAudit(db, {
      action: "delete",
      mediaId: id,
      publicId,
      actor: check.email,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/media] DELETE gagal:", err);
    return NextResponse.json({ error: "Gagal menghapus media." }, { status: 500 });
  }
}
