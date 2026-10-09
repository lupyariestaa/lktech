import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  coPurchasePairs,
  CO_PURCHASE_STATUSES,
  isCoPurchaseStatus,
  type CoPurchaseMap,
} from "@/lib/co-purchase";

/**
 * Data layer "sering dibeli bersama" dari riwayat pesanan (BR-2).
 *
 * Privasi: hanya membaca `items` (slug produk) dan `status` pesanan. Tidak ada
 * uid, nama, email, atau alamat yang dibaca atau disimpan.
 * Cache memori singkat (pola bukti sosial P4). Best-effort: tanpa Admin SDK
 * atau error → peta kosong, sehingga fallback kategori tetap berjalan.
 */

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 menit
/** Jendela pesanan yang dibaca (hari). Membatasi jumlah dokumen yang dipindai. */
const WINDOW_DAYS = 180;

let cache: { at: number; map: CoPurchaseMap } | null = null;

export async function getCoPurchaseMap(): Promise<CoPurchaseMap> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.map;

  const empty: CoPurchaseMap = new Map();
  const db = getAdminDb();
  if (!db) return empty;

  try {
    const cutoffISO = new Date(now - WINDOW_DAYS * 86_400_000).toISOString();
    // Filter jendela waktu tanpa orderBy (hindari composite index).
    const snap = await db
      .collection("orders")
      .where("createdAtISO", ">=", cutoffISO)
      .select("items", "status")
      .get();

    const orders: string[][] = [];
    snap.forEach((doc) => {
      const status = doc.get("status");
      if (!isCoPurchaseStatus(status)) return;
      const items = doc.get("items");
      if (!Array.isArray(items)) return;
      const slugs = items
        .map((it: unknown) =>
          it && typeof it === "object" && typeof (it as { slug?: unknown }).slug === "string"
            ? (it as { slug: string }).slug
            : "",
        )
        .filter(Boolean);
      if (slugs.length > 1) orders.push(slugs);
    });

    const map = coPurchasePairs(orders);
    cache = { at: now, map };
    return map;
  } catch (err) {
    console.error("[co-purchase] gagal memuat riwayat:", err);
    return empty;
  }
}

/** Untuk pengujian/invalidasi cache (mis. setelah pesanan baru). */
export function clearCoPurchaseCache(): void {
  cache = null;
}

export { CO_PURCHASE_STATUSES };
