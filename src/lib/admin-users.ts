import "server-only";
import {
  FieldPath,
  type Firestore,
} from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { buildUserProfile } from "@/lib/user-profile";
import { normalizeOrder, type Order } from "@/lib/order-types";
import {
  addOrderToAggregate,
  emptyOrderAggregate,
  type AdminOrderAggregate,
} from "@/lib/admin-users-pure";
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
 * Daftar rutin membaca halaman user dan hanya join order milik uid halaman.
 * Summary tetap menghitung seluruh sumber dan disimpan cache 60 detik.
 * Pencarian substring scan profil (Firestore tak punya `contains`), dengan
 * batas 5.000 hasil dan flag pemotongan.
 */

const USERS = "users";
const ORDERS = "orders";

/** Interval 30 hari (ms) untuk "user baru". */
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SUMMARY_TTL_MS = 60_000;

/** Ambil seluruh profil user; hanya dipakai pencarian substring dan summary. */
async function fetchAllUsers(db: Firestore): Promise<UserProfile[]> {
  const snap = await db.collection(USERS).get();
  const users = snap.docs.map((doc) =>
    buildUserProfile(doc.id, (doc.data() ?? {}) as Record<string, unknown>),
  );
  return users.sort(
    (a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? "") ||
      b.uid.localeCompare(a.uid),
  );
}

/**
 * Agregasi pesanan per uid.
 *
 * `all*` untuk konteks total riwayat, `paid*` hanya status berbayar resmi
 * (`dibayar`/`diproses`/`selesai`). Jangan memakai seluruh order untuk
 * "Total Belanja" (ADM-10).
 */
async function fetchOrderAggregates(
  db: Firestore,
): Promise<Map<string, AdminOrderAggregate>> {
  const snap = await db
    .collection(ORDERS)
    .select("uid", "total", "status")
    .get();
  const map = new Map<string, AdminOrderAggregate>();
  snap.forEach((doc) => {
    const uid = doc.get("uid");
    if (typeof uid !== "string" || !uid) return;
    const agg = map.get(uid) ?? emptyOrderAggregate();
    addOrderToAggregate(agg, doc.get("status"), doc.get("total"));
    map.set(uid, agg);
  });
  return map;
}

/** Ubah profil + agregat menjadi baris admin. */
function toRow(
  user: UserProfile,
  agg?: AdminOrderAggregate,
): AdminUserRow {
  const allCount = agg?.allCount ?? user.orderCount ?? 0;
  const paidCount = agg?.paidCount ?? 0;
  const paidTotal = agg?.paidTotal ?? 0;
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
    orderCount: allCount,
    paidOrderCount: paidCount,
    totalSpent: paidTotal,
    paidTotal,
    hasOrders: paidCount > 0,
  };
}

/** Filter status pesanan untuk daftar user. */
export type AdminUsersFilter = "semua" | "sudah" | "belum";

export type AdminUsersQuery = {
  q?: string;
  filter?: AdminUsersFilter;
  limit?: number;
  cursor?: string;
};

export type AdminUsersPage = {
  users: AdminUserRow[];
  nextCursor: string | null;
  truncated: boolean;
};

/** Batas default, maksimum halaman, dan maksimum scan pencarian substring. */
export const ADMIN_USERS_DEFAULT_LIMIT = 50;
export const ADMIN_USERS_MAX_LIMIT = 200;
const MAX_SEARCH_SCAN = 5_000;

/**
 * Daftar user (untuk dashboard admin) dengan pencarian & filter.
 * Pencarian mencakup nama, email, dan nomor WhatsApp.
 */
export async function listAdminUsers(
  query: AdminUsersQuery = {},
): Promise<AdminUsersPage> {
  const db = getAdminDb();
  if (!db) return { users: [], nextCursor: null, truncated: false };
  const q = (query.q ?? "").trim().toLowerCase();
  const filter: AdminUsersFilter = query.filter ?? "semua";
  const limit = Math.min(
    Math.max(query.limit ?? ADMIN_USERS_DEFAULT_LIMIT, 1),
    ADMIN_USERS_MAX_LIMIT,
  );

  // Pencarian substring dibatasi 5.000 profil; paid filter dipaginasi setelah
  // agregasi hanya untuk batch uid yang sedang diperiksa.
  if (q) {
    const [cursorCreatedAt, cursorUid] = query.cursor
      ? decodeUserCursor(query.cursor)
      : ["", ""];
    const searchSnap = await db
      .collection(USERS)
      .limit(MAX_SEARCH_SCAN + 1)
      .get();
    const scannedUsers = searchSnap.docs
      .slice(0, MAX_SEARCH_SCAN)
      .map((doc) =>
        buildUserProfile(doc.id, (doc.data() ?? {}) as Record<string, unknown>),
      );
    const matchingUsers = scannedUsers
      .filter((u) =>
        [u.displayName, u.email, u.whatsapp].some((value) =>
          value.toLowerCase().includes(q),
        ),
      )
      .sort((a, b) =>
        (b.createdAt ? 1 : 0) - (a.createdAt ? 1 : 0) ||
        (b.createdAt ?? "").localeCompare(a.createdAt ?? "") ||
        b.uid.localeCompare(a.uid),
      )
      .filter((user) => {
        if (!query.cursor) return true;
        const userHasDate = Boolean(user.createdAt);
        const cursorHasDate = Boolean(cursorCreatedAt);
        if (userHasDate !== cursorHasDate) return !userHasDate;
        return userHasDate
          ? user.createdAt! < cursorCreatedAt ||
              (user.createdAt === cursorCreatedAt && user.uid < cursorUid)
          : user.uid < cursorUid;
      });
    const searchTruncated = searchSnap.size > MAX_SEARCH_SCAN;
    if (query.cursor && !cursorUid) {
      return { users: [], nextCursor: null, truncated: searchTruncated };
    }
    const result: AdminUserRow[] = [];
    let index = 0;
    let lastProcessed: UserProfile | null = null;
    while (index < matchingUsers.length && result.length < limit) {
      const batch = matchingUsers.slice(index, index + 30);
      const aggs = await fetchOrderAggregatesForUids(db, batch.map((u) => u.uid));
      let reachedLimit = false;
      for (const user of batch) {
        lastProcessed = user;
        index += 1;
        const row = toRow(user, aggs.get(user.uid));
        if (filter === "semua" || (filter === "sudah" ? row.hasOrders : !row.hasOrders)) {
          result.push(row);
          if (result.length === limit) {
            reachedLimit = true;
            break;
          }
        }
      }
      if (reachedLimit) break;
    }
    return {
      users: result,
      nextCursor:
        index < matchingUsers.length && lastProcessed
          ? encodeUserCursor(lastProcessed.createdAt ?? "", lastProcessed.uid)
          : null,
      truncated: searchTruncated,
    };
  }

  const result: AdminUserRow[] = [];
  let scanCursor = query.cursor;
  let hasMore = false;
  while (true) {
    let pageQuery = db
      .collection(USERS)
      .orderBy("createdAtISO", "desc")
      .orderBy(FieldPath.documentId(), "desc");
    if (scanCursor) {
      const [createdAt, uid] = decodeUserCursor(scanCursor);
      if (createdAt && uid) pageQuery = pageQuery.startAfter(createdAt, uid);
    }
    const snap = await pageQuery.limit(31).get();
    if (snap.empty) break;
    const pageUsers = snap.docs.slice(0, 30).map((doc) =>
      buildUserProfile(doc.id, (doc.data() ?? {}) as Record<string, unknown>),
    );
    const aggs = await fetchOrderAggregatesForUids(db, pageUsers.map((u) => u.uid));
    let reachedLimit = false;
    let hasMoreOnPage = false;
    for (const [index, user] of pageUsers.entries()) {
      const row = toRow(user, aggs.get(user.uid));
      const userCursor = encodeUserCursor(user.createdAt ?? "", user.uid);
      scanCursor = userCursor;
      if (filter === "semua" || (filter === "sudah" ? row.hasOrders : !row.hasOrders)) {
        result.push(row);
        if (result.length === limit) {
          reachedLimit = true;
          hasMoreOnPage = index < pageUsers.length - 1 || snap.docs.length > 30;
          break;
        }
      }
    }
    if (reachedLimit) {
      hasMore = hasMoreOnPage;
      break;
    }
    if (snap.docs.length <= 30) break;
  }
  const nextCursor = hasMore ? (scanCursor ?? null) : null;
  return { users: result, nextCursor, truncated: false };
}

function encodeUserCursor(createdAt: string, uid: string): string {
  return Buffer.from(`${createdAt}\n${uid}`).toString("base64url");
}

function decodeUserCursor(cursor: string): [string, string] {
  try {
    const [createdAt, uid] = Buffer.from(cursor, "base64url")
      .toString("utf8")
      .split("\n");
    return [createdAt ?? "", uid ?? ""];
  } catch {
    return ["", ""];
  }
}

async function fetchOrderAggregatesForUids(
  db: Firestore,
  uids: string[],
): Promise<Map<string, AdminOrderAggregate>> {
  const map = new Map<string, AdminOrderAggregate>();
  for (let i = 0; i < uids.length; i += 30) {
    const chunk = uids.slice(i, i + 30);
    if (chunk.length === 0) continue;
    const snap = await db
      .collection(ORDERS)
      .where("uid", "in", chunk)
      .select("uid", "total", "status")
      .get();
    snap.forEach((doc) => {
      const uid = doc.get("uid");
      if (typeof uid !== "string" || !uid) return;
      const agg = map.get(uid) ?? emptyOrderAggregate();
      addOrderToAggregate(agg, doc.get("status"), doc.get("total"));
      map.set(uid, agg);
    });
  }
  return map;
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

  if (summaryCache && summaryCache.expiresAt > Date.now()) {
    return { ...summaryCache.value };
  }

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
    if ((agg?.paidCount ?? 0) > 0) withOrders += 1;
  }

  const summary = {
    total: users.length,
    newLast30Days,
    withOrders,
    withoutOrders: users.length - withOrders,
  };
  summaryCache = { value: summary, expiresAt: Date.now() + SUMMARY_TTL_MS };
  return { ...summary };
}

let summaryCache: { value: AdminUsersSummary; expiresAt: number } | null = null;

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
