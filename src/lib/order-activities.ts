import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * Timeline aktivitas pesanan (FASE O6) — data layer (server-only).
 *
 * Disimpan sebagai SUBKOLEKSI `orders/{id}/activities/{autoId}` (bukan field
 * pada dokumen order) agar catatan internal admin TIDAK ikut terbaca saat order
 * dibaca pembeli.
 *
 * Best-effort & aman tanpa Admin SDK (no-op).
 */

const COLLECTION = "orders";
const SUB = "activities";

export type OrderActivityType = "catatan" | "status" | "invoice" | "email" | "sistem";

export type OrderActivity = {
  id: string;
  type: OrderActivityType;
  note: string;
  actor: string;
  atISO: string;
};

const ALLOWED: readonly OrderActivityType[] = [
  "catatan",
  "status",
  "invoice",
  "email",
  "sistem",
];

function normalizeActivity(id: string, raw: unknown): OrderActivity | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const type = typeof d.type === "string" ? d.type : "catatan";
  return {
    id,
    type: (ALLOWED.includes(type as OrderActivityType)
      ? type
      : "sistem") as OrderActivityType,
    note: typeof d.note === "string" ? d.note : "",
    actor: typeof d.actor === "string" ? d.actor : "",
    atISO: typeof d.atISO === "string" ? d.atISO : "",
  };
}

/** Tambah satu aktivitas ke timeline order (best-effort). */
export async function addOrderActivity(
  orderId: string,
  entry: { type: OrderActivityType; note: string; actor: string },
): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  try {
    await db
      .collection(COLLECTION)
      .doc(orderId)
      .collection(SUB)
      .add({
        type: ALLOWED.includes(entry.type) ? entry.type : "catatan",
        note: entry.note.slice(0, 1000),
        actor: entry.actor,
        atISO: new Date().toISOString(),
      });
    return true;
  } catch (err) {
    console.error("[order-activities] gagal menambah aktivitas:", err);
    return false;
  }
}

/** Baca aktivitas order (terbaru lebih dulu, maks 200). */
export async function listOrderActivities(
  orderId: string,
): Promise<OrderActivity[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection(COLLECTION)
      .doc(orderId)
      .collection(SUB)
      .orderBy("atISO", "desc")
      .limit(200)
      .get();
    return snap.docs
      .map((d) => normalizeActivity(d.id, d.data()))
      .filter((a): a is OrderActivity => a !== null);
  } catch (err) {
    console.error("[order-activities] gagal membaca aktivitas:", err);
    return [];
  }
}