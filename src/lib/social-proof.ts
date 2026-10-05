import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * BUKTI SOSIAL NYATA (FASE P4).
 *
 * Menghitung jumlah pembeli NYATA dalam jendela waktu (default 7 hari) dari
 * koleksi `orders` — TANPA angka palsu. Prinsip etika (lihat dokumen fase §5):
 * hanya menampilkan data yang benar; bila jumlah kecil (< ambang) → `null`
 * (jangan menampilkan angka yang bisa merendahkan kepercayaan).
 *
 * Cache ringan: hasil disimpan di memori proses selama TTL singkat agar tidak
 * memukul Firestore tiap request. Halaman yang memakai juga punya `revalidate`.
 */

export type SocialProof = {
  /** Jumlah pembeli unik (per `uid`) pada jendela waktu. */
  buyers: number;
  /** Jumlah pesanan (bukan dibatalkan) pada jendela waktu. */
  orders: number;
  /** Panjang jendela (hari). */
  windowDays: number;
  /** Label siap-tampil, mis. "12 pembeli dalam 7 hari terakhir" — atau null. */
  label: string | null;
};

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 menit
let cache: { at: number; value: SocialProof } | null = null;

/** Ambang minimum agar angka ditampilkan (hindari angka terlalu kecil). */
const MIN_ORDERS_TO_SHOW = 3;

/**
 * Hitung bukti sosial (dewasa ini selalu best-effort: kegagalan → nilai nol).
 * Aman tanpa Admin SDK → nol.
 */
export async function getSocialProof(
  windowDays = 7,
): Promise<SocialProof> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS && cache.value.windowDays === windowDays) {
    return cache.value;
  }

  const empty: SocialProof = {
    buyers: 0,
    orders: 0,
    windowDays,
    label: null,
  };

  const db = getAdminDb();
  if (!db) return empty;

  try {
    const cutoffISO = new Date(now - windowDays * 86_400_000).toISOString();
    const snap = await db
      .collection("orders")
      .where("createdAtISO", ">=", cutoffISO)
      .select("uid", "status")
      .get();

    const buyers = new Set<string>();
    let orders = 0;
    snap.forEach((doc) => {
      const status = doc.get("status");
      // Abaikan pesanan yang batal (bukan bukti pembelian).
      if (status === "dibatalkan") return;
      orders += 1;
      const uid = doc.get("uid");
      if (typeof uid === "string" && uid) buyers.add(uid);
    });

    const value: SocialProof = {
      buyers: buyers.size,
      orders,
      windowDays,
      label: null,
    };
    // Tampilkan hanya bila cukup banyak (menghindari angka kecil/palsu).
    if (orders >= MIN_ORDERS_TO_SHOW) {
      value.label = `${orders} pesanan dalam ${windowDays} hari terakhir`;
    }

    cache = { at: now, value };
    return value;
  } catch (err) {
    console.error("[social-proof] gagal menghitung:", err);
    return empty;
  }
}
