import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  countMediaByCollection,
  createCollection,
  deleteCollection,
  listCollections,
  updateCollection,
} from "@/lib/media-collections";
import {
  mediaCollectionCreateSchema,
  mediaCollectionUpdateSchema,
} from "@/lib/api-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/media/collections
 * Daftar koleksi + jumlah media aktif per koleksi.
 */
export async function GET(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  try {
    const [collections, counts] = await Promise.all([
      listCollections(db),
      countMediaByCollection(db),
    ]);
    const items = collections.map((c) => ({
      ...c,
      mediaCount: counts.get(c.id) ?? 0,
    }));
    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error("[api/admin/media/collections] GET gagal:", err);
    return NextResponse.json(
      { error: "Gagal memuat koleksi." },
      { status: 500 },
    );
  }
}

/** POST /api/admin/media/collections — buat koleksi baru. */
export async function POST(req: Request) {
  const check = await requireAdmin(req);
  if (!check.ok) return check.response;

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Admin SDK tidak tersedia." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = mediaCollectionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nama koleksi wajib diisi." },
      { status: 400 },
    );
  }

  try {
    const collection = await createCollection(db, parsed.data);
    return NextResponse.json({ ok: true, collection });
  } catch (err) {
    console.error("[api/admin/media/collections] POST gagal:", err);
    return NextResponse.json(
      { error: "Gagal membuat koleksi." },
      { status: 500 },
    );
  }
}

/** PATCH /api/admin/media/collections?id=xxx — ubah koleksi. */
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const parsed = mediaCollectionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  try {
    const collection = await updateCollection(db, id, parsed.data);
    if (!collection) {
      return NextResponse.json({ error: "Koleksi tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, collection });
  } catch (err) {
    console.error("[api/admin/media/collections] PATCH gagal:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui koleksi." },
      { status: 500 },
    );
  }
}

/** DELETE /api/admin/media/collections?id=xxx — hapus koleksi. */
export async function DELETE(req: Request) {
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

  try {
    const removed = await deleteCollection(db, id);
    if (!removed) {
      return NextResponse.json({ error: "Koleksi tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/media/collections] DELETE gagal:", err);
    return NextResponse.json(
      { error: "Gagal menghapus koleksi." },
      { status: 500 },
    );
  }
}
