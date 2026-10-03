import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { buildUserProfile } from "@/lib/user-profile";
import { normalizeOrder, type Order } from "@/lib/order-types";
import type {
  AdminUserRow,
  AdminUsersSummary,
  UserProfile,
} from "@/lib/user-types";

/**
 * Data layer admin "Kelola User".
 *
 * Menggabungkan koleksi `users` (profil) dengan `orders` (agregat pesanan)
 * untuk menghasilkan baris ringkas siap tampil. Semua akses via Admin SDK
 * (server-only); klien tidak pernah menyentuh Firestore.
 *
 * Catatan skala: saat user/order masih ribuan, join dilakukan di memori
 * (hindari composite index). Bila tumbuh besar, ganti dengan agregasi
 * denormalisasi atau collection group.
 */

const USERS = "users";
const ORDERS = "orders";

/** Interval 30 hari (ms) untuk "user baru". */
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type OrderAgg = { count: number; total: number; hasOrders: boolean };

/** Ambil seluruh profil user (terbaru lebih dulu berdasarkan `createdAtISO`). */
async function fetchAllUsers(db: Firestore): Promise<UserProfile[]> {
  const snap = await db.collection(USERS).get();
  const users = snap.docs.map((doc) =>
    buildUserProfile(doc.id, (doc.data() ?? {}) as Record<string, unknown>),
  );
  // Urutkan di memori (dokumen lama mungkin tanpa createdAtISO).
  return users.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/** Agregasi pesanan per uid (jumlah + total rupiah). */
async function fetchOrderAggregates(db: Firestore): Promise<Map<string, OrderAgg>> {
  const snap = await db.collection(ORDERS).select("uid", "total").get();
  const map = new Map<string, OrderAgg>();
  snap.forEach((doc) => {
    const uid = doc.get("uid");
    if (typeof uid !== "string" || !uid) return;
    const total = doc.get("total");
    const amount = typeof total === "number" && Number.isFinite(total) ? total : 0;
    const prev = map.get(uid) ?? { count: 0, total: 0, hasOrders: false };
    prev.count += 1;
    prev.total += amount;
    prev.hasOrders = true;
    map.set(uid, prev);
  });
  return map;
}

/** Ubah profil + agregat menjadi baris admin. */
function toRow(user: UserProfile, agg?: OrderAgg): AdminUserRow {
  return {
    uid: user.uid,
    displayName: user.displayName || "(Tanpa nama)",
    email: user.email,
    photoURL: user.photoURL,
    provider: user.provider,
    whatsapp: user.whatsapp,
    blocked: user.blocked,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    orderCount: agg?.count ?? user.orderCount ?? 0,
    totalSpent: agg?.total ?? 0,
    hasOrders: agg?.hasOrders ?? (user.orderCount ?? 0) > 0,
  };
}

/** Filter status pesanan untuk daftar user. */
export type AdminUsersFilter = "semua" | "sudah" | "belum";

export type AdminUsersQuery = {
  q?: string;
  filter?: AdminUsersFilter;
  limit?: number;
};

/** Batas default & maksimum jumlah baris. */
export const ADMIN_USERS_DEFAULT_LIMIT = 50;
export const ADMIN_USERS_MAX_LIMIT = 200;

/**
 * Daftar user (untuk dashboard admin) dengan pencarian & filter.
 * Pencarian mencakup nama, email, dan nomor WhatsApp.
 */
export async function listAdminUsers(
  query: AdminUsersQuery = {},
): Promise<AdminUserRow[]> {
  const db = getAdminDb();
  if (!db) return [];

  const [users, aggs] = await Promise.all([
    fetchAllUsers(db),
    fetchOrderAggregates(db),
  ]);

  const rows = users.map((u) => toRow(u, aggs.get(u.uid)));

  const q = (query.q ?? "").trim().toLowerCase();
  const filter: AdminUsersFilter = query.filter ?? "semua";

  const filtered = rows.filter((r) => {
    if (filter === "sudah" && !r.hasOrders) return false;
    if (filter === "belum" && r.hasOrders) return false;
    if (!q) return true;
    return (
      r.displayName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.whatsapp.toLowerCase().includes(q)
    );
  });

  const limit = Math.min(
    Math.max(query.limit ?? ADMIN_USERS_DEFAULT_LIMIT, 1),
    ADMIN_USERS_MAX_LIMIT,
  );
  return filtered.slice(0, limit);
}

/** Ringkasan statistik user (kartu & badge). */
export async function getAdminUsersSummary(): Promise<AdminUsersSummary> {
  const empty: AdminUsersSummary = {
    total: 0,
    newLast30Days: 0,
    withOrders: 0,
    withoutOrders: 0,
  };
  const db = getAdminDb();
  if (!db) return empty;

  const [users, aggs] = await Promise.all([
    fetchAllUsers(db),
    fetchOrderAggregates(db),
  ]);

  const cutoff = Date.now() - THIRTY_DAYS_MS;
  let newLast30Days = 0;
  let withOrders = 0;

  for (const u of users) {
    const created = u.createdAt ? new Date(u.createdAt).getTime() : 0;
    if (created && created >= cutoff) newLast30Days += 1;
    const agg = aggs.get(u.uid);
    if (agg?.hasOrders || (u.orderCount ?? 0) > 0) withOrders += 1;
  }

  return {
    total: users.length,
    newLast30Days,
    withOrders,
    withoutOrders: users.length - withOrders,
  };
}

/** Detail user + daftar pesanannya (untuk dialog detail admin). */
export async function getAdminUserDetail(uid: string): Promise<{
  user: UserProfile | null;
  orders: Order[];
} | null> {
  const db = getAdminDb();
  if (!db) return null;

  const doc = await db.collection(USERS).doc(uid).get();
  if (!doc.exists) return null;
  const user = buildUserProfile(uid, (doc.data() ?? {}) as Record<string, unknown>);

  // Pesanan user (tanpa orderBy — hindari composite index; urutkan di memori).
  const snap = await db.collection(ORDERS).where("uid", "==", uid).get();
  const orders = snap.docs
    .map((d) => normalizeOrder({ id: d.id, ...(d.data() as Record<string, unknown>) }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return { user, orders };
}
