import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import type { Query } from "firebase-admin/firestore";
import {
  normalizeOrder,
  ORDER_STATUSES,
  type Order,
  type OrderStatus,
} from "@/lib/order-types";

const COLLECTION = "orders";

/** Jumlah item default per halaman admin. */
export const ORDERS_PAGE_SIZE = 25;

/**
 * Menyimpan pesanan baru. Mengembalikan `Order` lengkap dengan id dokumen.
 * Semua nilai (harga, nama produk, total) WAJIB sudah diverifikasi/dihitung
 * server sebelum memanggil fungsi ini.
 */
export async function createOrder(
  data: Omit<Order, "id" | "createdAt" | "status"> & {
    status?: OrderStatus;
  },
): Promise<Order> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");

  const nowISO = new Date().toISOString();
  const payload = {
    uid: data.uid,
    buyerName: data.buyerName,
    buyerEmail: data.buyerEmail,
    items: data.items,
    total: data.total,
    status: data.status ?? "baru",
    whatsapp: data.whatsapp,
    message: data.message,
    createdAtISO: nowISO,
  };

  const ref = await db.collection(COLLECTION).add(payload);
  return normalizeOrder({ ...payload, id: ref.id, createdAtISO: nowISO });
}

/** Mengambil pesanan milik satu user (terbaru lebih dulu). */
export async function getOrdersByUser(uid: string): Promise<Order[]> {
  const db = getAdminDb();
  if (!db) return [];

  const snap = await db
    .collection(COLLECTION)
    .where("uid", "==", uid)
    .orderBy("createdAtISO", "desc")
    .get();

  return snap.docs.map((doc) =>
    normalizeOrder({ id: doc.id, ...(doc.data() as Record<string, unknown>) }),
  );
}

// ===== Admin: daftar, ringkasan, ubah status =====

/** Ringkasan jumlah pesanan per status + total omzet. */
export type OrdersSummary = {
  total: number;
  baru: number;
  diproses: number;
  selesai: number;
  dibatalkan: number;
  /** Total omzet (Rp) untuk pesanan berstatus "selesai". */
  omzet: number;
};

/**
 * Ringkasan pesanan untuk badge sidebar & metrik dashboard.
 * Memakai count() aggregation (tanpa mengunduh dokumen). Omzet dihitung
 * dari jumlah `total` pesanan berstatus "selesai" (query terbatas, hanya
 * field yang dibutuhkan).
 */
export async function getOrdersSummary(): Promise<OrdersSummary> {
  const empty: OrdersSummary = {
    total: 0,
    baru: 0,
    diproses: 0,
    selesai: 0,
    dibatalkan: 0,
    omzet: 0,
  };
  const db = getAdminDb();
  if (!db) return empty;

  const col = db.collection(COLLECTION);
  const [total, ...byStatus] = await Promise.all([
    col.count().get(),
    ...ORDER_STATUSES.map((status) =>
      col.where("status", "==", status).count().get(),
    ),
  ]);

  const counts = { total: total.data().count } as Record<string, number>;
  ORDER_STATUSES.forEach((status, i) => {
    counts[status] = byStatus[i].data().count;
  });

  // Omzet: jumlahkan `total` pesanan "selesai" (proyeksi field `total` saja).
  let omzet = 0;
  try {
    const snap = await col.where("status", "==", "selesai").select("total").get();
    snap.forEach((doc) => {
      const t = doc.get("total");
      if (typeof t === "number" && Number.isFinite(t)) omzet += t;
    });
  } catch (err) {
    console.error("[orders] gagal menghitung omzet:", err);
  }

  return {
    total: counts.total ?? 0,
    baru: counts.baru ?? 0,
    diproses: counts.diproses ?? 0,
    selesai: counts.selesai ?? 0,
    dibatalkan: counts.dibatalkan ?? 0,
    omzet,
  };
}

/** Opsi paginasi/filter daftar pesanan admin. */
export type OrdersPageQuery = {
  status?: OrderStatus | "semua";
  cursor?: string | null;
  limit?: number;
};

/**
 * Daftar seluruh pesanan (admin), terbaru lebih dulu, dengan cursor
 * pagination. `nextCursor` = `createdAtISO` item terakhir bila masih ada lagi.
 */
export async function getOrdersPage(
  query: OrdersPageQuery = {},
): Promise<{ orders: Order[]; nextCursor: string | null }> {
  const db = getAdminDb();
  if (!db) return { orders: [], nextCursor: null };

  const limit = Math.min(Math.max(query.limit ?? ORDERS_PAGE_SIZE, 1), 100);
  let ref: Query = db
    .collection(COLLECTION)
    .orderBy("createdAtISO", "desc");
  if (query.status && query.status !== "semua") {
    ref = ref.where("status", "==", query.status);
  }
  if (query.cursor) {
    ref = ref.startAfter(query.cursor);
  }
  // Ambil limit+1 untuk tahu apakah masih ada halaman berikutnya.
  const snap = await ref.limit(limit + 1).get();
  const docs = snap.docs.slice(0, limit);
  const orders = docs.map((doc) =>
    normalizeOrder({ id: doc.id, ...(doc.data() as Record<string, unknown>) }),
  );
  const nextCursor =
    snap.docs.length > limit && docs.length > 0
      ? (docs[docs.length - 1].get("createdAtISO") as string)
      : null;

  return { orders, nextCursor };
}

/** Mengubah status sebuah pesanan + mencatat updater. */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  updatedBy: string,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  await db.collection(COLLECTION).doc(id).update({
    status,
    updatedAtISO: new Date().toISOString(),
    updatedBy,
  });
}

/** Menghapus pesanan (permanen). */
export async function deleteOrder(id: string): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  await db.collection(COLLECTION).doc(id).delete();
}
