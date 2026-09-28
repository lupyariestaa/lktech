import type { MediaItem } from "@/lib/media-types";

/** Peta slug proyek → daftar gambar (cover + galeri). */
export type ProjectMediaMap = Record<
  string,
  { cover: MediaItem; gallery: MediaItem[] }
>;

/**
 * Mengelompokkan media portofolio berdasarkan `projectSlug`.
 * Gambar pertama (yang terbaru) menjadi cover, sisanya menjadi galeri.
 */
export function groupMediaByProject(items: MediaItem[]): ProjectMediaMap {
  const map: ProjectMediaMap = {};

  for (const item of items) {
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
 * mengembalikan peta slug → URL gambar. Aman dipanggil di server component.
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
        category: d.category ?? "lainnya",
        title: d.title ?? "",
        projectSlug: d.projectSlug || undefined,
        createdAt: d.createdAtISO ?? null,
      };
    });

    items.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

    return groupMediaByProject(items);
  } catch (err) {
    console.error("[portfolio-media] gagal memuat media:", err);
    return {};
  }
}
