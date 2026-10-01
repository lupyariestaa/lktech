import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import { isCloudinaryConfigured, destroyAsset } from "@/lib/cloudinary";
import {
  MEDIA_CATEGORIES,
  type MediaCategory,
  type MediaItem,
} from "@/lib/media-types";
import { mediaCreateSchema } from "@/lib/api-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/media — daftar aset media. */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  try {
    const snap = await db
      .collection("media")
      .orderBy("createdAtISO", "desc")
      .get();

    const items: MediaItem[] = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        publicId: d.publicId,
        secureUrl: d.secureUrl,
        width: d.width ?? 0,
        height: d.height ?? 0,
        format: d.format ?? "",
        bytes: d.bytes ?? 0,
        category: (d.category as MediaCategory) ?? "lainnya",
        title: d.title ?? "",
        projectSlug: d.projectSlug ?? undefined,
        createdAt: d.createdAtISO ?? null,
      };
    });

    return NextResponse.json({ items });
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
 * Body: { publicId, secureUrl, width, height, format, bytes, category, title }
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

  const { publicId, secureUrl, width, height, format, bytes, category, title, projectSlug } =
    parsed.data;

  const cat: MediaCategory = MEDIA_CATEGORIES.includes(
    category as MediaCategory,
  )
    ? (category as MediaCategory)
    : "lainnya";

  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

  try {
    const now = new Date().toISOString();
    const ref = await db.collection("media").add({
      publicId,
      secureUrl,
      width: num(width),
      height: num(height),
      format: typeof format === "string" ? format : "",
      bytes: num(bytes),
      category: cat,
      title: typeof title === "string" ? title : "",
      projectSlug: typeof projectSlug === "string" ? projectSlug : "",
      createdAtISO: now,
      uploadedBy: check.email,
    });

    revalidatePath("/portofolio");
    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error("[api/admin/media] POST gagal:", err);
    return NextResponse.json({ error: "Gagal menyimpan media." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/media?id=xxx&publicId=yyy
 * Menghapus metadata (dan aset Cloudinary bila publicId diberikan).
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
  const publicId = url.searchParams.get("publicId");

  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  try {
    await db.collection("media").doc(id).delete();

    if (publicId && isCloudinaryConfigured) {
      try {
        await destroyAsset(publicId);
      } catch (err) {
        console.error("[api/admin/media] gagal hapus di Cloudinary:", err);
        // Metadata tetap terhapus; aset Cloudinary bisa dibersihkan manual.
      }
    }

    revalidatePath("/portofolio");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/media] DELETE gagal:", err);
    return NextResponse.json({ error: "Gagal menghapus media." }, { status: 500 });
  }
}
