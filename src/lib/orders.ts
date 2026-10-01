import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { normalizeOrder, type Order, type OrderStatus } from "@/lib/order-types";

const COLLECTION = "orders";

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
