import { NextResponse } from "next/server";
import type { Query } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import type { MediaItem } from "@/lib/media-types";

export const runtime = "nodejs";
export const revalidate = 60;

/**
 * GET /api/media?category=portofolio
 * Endpoint PUBLIK: mengembalikan daftar gambar (non-sensitif) untuk
 * ditampilkan di website. Hanya mengembalikan aset yang aman dipublikasikan.
 */
export async function GET(req: Request) {
  const category = new URL(req.url).searchParams.get("category");
  const db = getAdminDb();

  if (!db) {
    return NextResponse.json({ items: [] });
  }

  try {
    let query: Query = db.collection("media");
    if (category) {
      query = query.where("category", "==", category);
    }

    const snap = await query.get();

    const items: MediaItem[] = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        // `publicId` TIDAK diungkap ke publik (hanya dipakai server/dashboard).
        publicId: "",
        secureUrl: d.secureUrl,
        width: d.width ?? 0,
        height: d.height ?? 0,
        format: d.format ?? "",
        bytes: d.bytes ?? 0,
        category: d.category ?? "lainnya",
        title: d.title ?? "",
        projectSlug: d.projectSlug || undefined,
        createdAt: d.createdAtISO ?? null,
      };
    });

    // Urutkan terbaru lebih dulu (tanpa index Firestore tambahan).
    items.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

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
