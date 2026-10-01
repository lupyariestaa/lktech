import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { normalizeMediaItem, toPublicMediaItem } from "@/lib/media-normalize";
import type { MediaItem } from "@/lib/media-types";

export const runtime = "nodejs";
export const revalidate = 60;

/** Batas jumlah item yang dikembalikan endpoint publik. */
const PUBLIC_LIMIT = 60;

/**
 * GET /api/media?category=portofolio
 * Endpoint PUBLIK: mengembalikan daftar gambar (non-sensitif) untuk
 * ditampilkan di website. Hanya aset `status=active` yang aman dipublikasikan.
 */
export async function GET(req: Request) {
  const category = new URL(req.url).searchParams.get("category");
  const db = getAdminDb();

  if (!db) {
    return NextResponse.json({ items: [] });
  }

  try {
    const snap = await db.collection("media").get();

    let items: MediaItem[] = snap.docs
      .map((doc) => normalizeMediaItem(doc.id, doc.data()))
      .filter((it) => it.status === "active")
      // Sembunyikan field internal + publicId.
      .map((it) => toPublicMediaItem(it));

    if (category) {
      items = items.filter((it) => it.category === category);
    }

    // Urutkan terbaru lebih dulu + batasi jumlah (MED-11).
    items.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    items = items.slice(0, PUBLIC_LIMIT);

    return NextResponse.json(
      { items },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (err) {
    console.error("[api/media] GET gagal:", err);
    return NextResponse.json({ items: [] });
  }
}
