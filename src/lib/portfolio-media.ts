import type { MediaItem } from "@/lib/media-types";
import { normalizeMediaItem } from "@/lib/media-normalize";

/** Peta slug proyek → daftar gambar (cover + galeri). */
export type ProjectMediaMap = Record<
  string,
  { cover: MediaItem; gallery: MediaItem[] }
>;

/**
 * Mengelompokkan media portofolio berdasarkan `projectSlug`.
 *
 * Urutan gambar: `order` manual (bila diisi, angka kecil lebih dulu), lalu
 * baru->lama sebagai fallback. Gambar pertama menjadi cover, sisanya galeri.
 */
export function groupMediaByProject(items: MediaItem[]): ProjectMediaMap {
  const map: ProjectMediaMap = {};

  const sorted = [...items].sort((a, b) => {
    const oa = typeof a.order === "number" ? a.order : Number.POSITIVE_INFINITY;
    const ob = typeof b.order === "number" ? b.order : Number.POSITIVE_INFINITY;
    if (oa !== ob) return oa - ob;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });

  for (const item of sorted) {
    const slug = item.projectSlug;
    if (!slug) continue;

    if (!map[slug]) {
      map[slug] = { cover: item, gallery: [] };
    } else {
      map[slug].gallery.push(item);
    }
  }

  return map;
}

/**
 * Mengambil media portofolio dari Firestore (server-side) dan
 * mengembalikan peta slug → media (cover + galeri). Aman dipanggil di server.
 */
export async function getPortfolioMediaMap(): Promise<ProjectMediaMap> {
  try {
    const { getAdminDb } = await import("@/lib/firebase-admin");
    const db = getAdminDb();
    if (!db) return {};

    const snap = await db
      .collection("media")
      .where("category", "==", "portofolio")
      .get();

    const items: MediaItem[] = snap.docs
      .map((doc) => normalizeMediaItem(doc.id, doc.data()))
      .filter((it) => it.status === "active");

    return groupMediaByProject(items);
  } catch (err) {
    console.error("[portfolio-media] gagal memuat media:", err);
    return {};
  }
}
