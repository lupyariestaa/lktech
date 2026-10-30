import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { AggregateField, FieldValue, type Query, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import {
  isOrderExpired,
  isPayableStatus,
  normalizeOrder,
  ORDER_STATUSES,
  type Order,
  type OrderStatus,
} from "@/lib/order-types";
import { evaluateStatusTransition } from "@/lib/order-status-pure";
import { stripUndefined } from "@/lib/firestore-sanitize-pure";
import {
  applyFilterAndSort,
  attentionReasons,
  dateRangeForPreset,
  defaultFilter as defaultOrdersFilter,
  type OrdersFilter,
  type OrdersSort,
} from "@/lib/orders-filter-pure";
import { dayKeyInTz as analyticsDayKey, dropDayAggregate } from "@/lib/analytics-daily";
import { invalidateSalesAnalyticsCache } from "@/lib/sales-analytics";
import {
  invalidateCouponStatsCache,
  restoreCouponUsageInTransaction,
} from "@/lib/coupons";
import {
  applyStockRelease,
  invalidateProductStockCache,
  readStockRelease,
  releaseStockInTransaction,
} from "@/lib/stock";
import { shouldReleaseStock } from "@/lib/stock-pure";

const COLLECTION = "orders";

/**
 * `AN-P3` — tandai agregat harian satu hari "kotor" (hapus) agar dihitung ulang.
 * Kunci hari diturunkan dari `createdAtISO` order (zona `Asia/Jakarta`), sama
 * dengan yang dipakai `analytics_daily`. Non-fatal & fire-and-forget.
 */
function invalidateAnalyticsForOrder(createdAtISO: string | undefined): void {
  if (!createdAtISO) return;
  const d = new Date(createdAtISO);
  if (Number.isNaN(d.getTime())) return;
  void dropDayAggregate(analyticsDayKey(d));
}

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
  const payload: Record<string, unknown> = {
    uid: data.uid,
    buyerName: data.buyerName,
    buyerEmail: data.buyerEmail,
    items: data.items,
    subtotal: data.subtotal,
    total: data.total,
    status: data.status ?? "baru",
    whatsapp: data.whatsapp,
    message: data.message,
    createdAtISO: nowISO,
  };
  if (data.buyerPhotoUrl) payload.buyerPhotoUrl = data.buyerPhotoUrl;
  if (data.coupon) payload.coupon = data.coupon;
  if (data.payment) payload.payment = data.payment;
  if (data.servicePayment) payload.servicePayment = data.servicePayment;
  if (data.fulfillment) payload.fulfillment = data.fulfillment;
  if (data.stockReservation && data.stockReservation.length > 0) {
    payload.stockReservation = data.stockReservation;
  }

  const ref = await db.collection(COLLECTION).add(payload);
  invalidateOrderDerivedCaches();
  invalidateAnalyticsForOrder(nowISO);
  return normalizeOrder({ ...payload, id: ref.id, createdAtISO: nowISO });
}

/**
 * Apakah error Firestore menandakan composite index belum dibuat
 * (`FAILED_PRECONDITION` / "requires an index"). Dipakai untuk fallback aman.
 */
function isMissingIndexError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /requires an index/i.test(msg) ||
    /FAILED_PRECONDITION/i.test(msg) ||
    /failed-precondition/i.test(msg)
  );
}

/** Urutkan order terbaru lebih dulu (pakai `createdAt` yang sudah dinormalisasi). */
function sortByCreatedAtDesc(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Mengambil pesanan milik satu user (terbaru lebih dulu). */
export async function getOrdersByUser(uid: string): Promise<Order[]> {
  const db = getAdminDb();
  if (!db) return [];

  // Jalur utama: query NATIVE dengan orderBy (index `uid`+`createdAtISO` sudah
  // dideklarasikan di `firestore.indexes.json`). Fallback ke memori bila index
  // belum dipublikasikan (deploy lama) agar riwayat pembeli tidak tampak kosong.
  try {
    const snap = await db
      .collection(COLLECTION)
      .where("uid", "==", uid)
      .orderBy("createdAtISO", "desc")
      .get();
    return snap.docs.map((doc) =>
      normalizeOrder({ id: doc.id, ...(doc.data() as Record<string, unknown>) }),
    );
  } catch (err) {
    if (!isMissingIndexError(err)) throw err;
    console.warn(
      "[orders] index uid+createdAtISO belum tersedia — fallback urut di memori.",
    );
    const snap = await db.collection(COLLECTION).where("uid", "==", uid).get();
    return sortByCreatedAtDesc(
      snap.docs.map((doc) =>
        normalizeOrder({ id: doc.id, ...(doc.data() as Record<string, unknown>) }),
      ),
    );
  }
}

// ===== Admin: daftar, ringkasan, ubah status =====

/** Ringkasan jumlah pesanan per status + total omzet. */
export type OrdersSummary = {
  total: number;
  baru: number;
  menunggu_bayar: number;
  dibayar: number;
  menunggu_konfirmasi: number;
  diproses: number;
  selesai: number;
  dibatalkan: number;
  kedaluwarsa: number;
  /**
   * Total omzet (Rp) untuk pesanan berstatus "selesai" SEPANJANG WAKTU
   * (netto setelah diskon). Berbeda dari omzet "periode" di Analitik —
   * lihat spesifikasi metrik di `@/lib/metrics-spec` (`XL-1`).
   */
  omzet: number;
};

/**
 * Ringkasan pesanan untuk badge sidebar & metrik dashboard.
 * - Count per status via count() aggregation (tanpa unduh dokumen).
 * - Omzet pesanan "selesai": utamakan SUM aggregation (server-side); fallback ke
 *   proyeksi `select("total")` bila versi SDK/emulator tak mendukung.
 * - OR-C2: hasil di-CACHE singkat (in-memory + TTL) & di-dedupe antar-panggilan
 *   bersamaan, karena ringkasan dipanggil sering (sidebar polling + tiap ubah
 *   status). TTL kecil menjaga data tetap segar.
 */
const SUMMARY_TTL_MS = 60_000;
let summaryCache: { at: number; value: OrdersSummary } | null = null;
let summaryInflight: Promise<OrdersSummary> | null = null;

export function invalidateOrdersSummaryCache(): void {
  summaryCache = null;
}

/**
 * Segarkan SEMUA cache turunan pesanan (ringkasan + analitik penjualan).
 * Dipanggil setiap kali pesanan dibuat/diubah/dihapus agar dashboard langsung
 * menampilkan angka terbaru tanpa menunggu TTL.
 */
function invalidateOrderDerivedCaches(): void {
  invalidateOrdersSummaryCache();
  invalidateSalesAnalyticsCache();
}

export async function getOrdersSummary(
  opts: { bypassCache?: boolean } = {},
): Promise<OrdersSummary> {
  const empty: OrdersSummary = {
    total: 0,
    baru: 0,
    menunggu_bayar: 0,
    dibayar: 0,
    menunggu_konfirmasi: 0,
    diproses: 0,
    selesai: 0,
    dibatalkan: 0,
    kedaluwarsa: 0,
    omzet: 0,
  };
  const db = getAdminDb();
  if (!db) return empty;

  const now = Date.now();
  if (!opts.bypassCache) {
    if (summaryCache && now - summaryCache.at < SUMMARY_TTL_MS) {
      return summaryCache.value;
    }
    if (summaryInflight) return summaryInflight;
  }

  const compute = async (): Promise<OrdersSummary> => {
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

    // Omzet: SUM aggregation server-side untuk pesanan "selesai".
    let omzet = 0;
    try {
      const agg = await col
        .where("status", "==", "selesai")
        .aggregate({ total: AggregateField.sum("total") })
        .get();
      const sum = (agg.data() as { total?: number }).total;
      if (typeof sum === "number" && Number.isFinite(sum)) omzet = sum;
      else throw new Error("sum_unavailable");
    } catch {
      // Fallback: proyeksi field `total` lalu jumlahkan (kompatibel luas).
      try {
        const snap = await col.where("status", "==", "selesai").select("total").get();
        snap.forEach((doc) => {
          const t = doc.get("total");
          if (typeof t === "number" && Number.isFinite(t)) omzet += t;
        });
      } catch (err) {
        console.error("[orders] gagal menghitung omzet:", err);
      }
    }

    return {
      total: counts.total ?? 0,
      baru: counts.baru ?? 0,
      menunggu_bayar: counts.menunggu_bayar ?? 0,
      dibayar: counts.dibayar ?? 0,
      menunggu_konfirmasi: counts.menunggu_konfirmasi ?? 0,
      diproses: counts.diproses ?? 0,
      selesai: counts.selesai ?? 0,
      dibatalkan: counts.dibatalkan ?? 0,
      kedaluwarsa: counts.kedaluwarsa ?? 0,
      omzet,
    };
  };

  const p = compute()
    .then((value) => {
      summaryCache = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      summaryInflight = null;
    });
  summaryInflight = p;
  return p;
}

/** Opsi paginasi/filter daftar pesanan admin. */
export type OrdersPageQuery = {
  status?: OrderStatus | "semua";
  cursor?: string | null;
  limit?: number;
  /** Filter lanjutan (FASE O2/O3). Bila ada → mode bernomor (page-based). */
  filter?: OrdersFilter;
  /** Urutan hasil (FASE O2). Default `date_desc`. */
  sort?: OrdersSort;
  /** Halaman 1-based (mode filter). */
  page?: number;
  /**
   * Kembalikan SELURUH hasil filter (tanpa potong halaman) — untuk ekspor CSV
   * (F-G4). `total` tetap jumlah hasil terfilter; `truncated` bila batas pindai.
   */
  all?: boolean;
};

/** Hasil daftar pesanan; field `total`/`page*` hanya ada di mode filter. */
export type OrdersPageResult = {
  orders: Order[];
  nextCursor: string | null;
  /** Mode filter bernomor. */
  total?: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
  /** `true` bila pemindaian menyentuh batas (hasil mungkin belum lengkap). */
  truncated?: boolean;
};

/** Batas pemindaian saat memakai penyaringan memori (mode filter). */
const FILTER_SCAN_CAP = 500;

/** Ubah `yyyy-mm-dd` (lokal) ke batas ISO [awal hari, akhir hari]. */
function dayBoundsISO(fromDay: string, toDay: string): { fromISO?: string; toISO?: string } {
  const out: { fromISO?: string; toISO?: string } = {};
  if (fromDay) {
    const d = new Date(`${fromDay}T00:00:00`);
    if (!Number.isNaN(d.getTime())) out.fromISO = d.toISOString();
  }
  if (toDay) {
    const d = new Date(`${toDay}T23:59:59.999`);
    if (!Number.isNaN(d.getTime())) out.toISO = d.toISOString();
  }
  return out;
}

/**
 * Daftar seluruh pesanan (admin).
 *
 * Dua mode:
 * - **Cursor** (default, `filter` kosong): query native `orderBy(createdAtISO)`
 *   + cursor; dipakai alur lama.
 * - **Filter bernomor** (`filter`/`sort`/`page` diisi — FASE O2/O3): menyaring &
 *   mengurutkan di memori atas window yang dipersempit query native (status +
 *   rentang tanggal) agar TIDAK bergantung banyak composite index. Mengembalikan
 *   `total` (dalam batas pemindaian) + `truncated` bila batas tersentuh.
 *
 * Bila index belum dipublikasikan → fallback otomatis ke penyaringan memori.
 */
export async function getOrdersPage(
  query: OrdersPageQuery = {},
): Promise<OrdersPageResult> {
  const db = getAdminDb();
  if (!db) return { orders: [], nextCursor: null };

  // ===== Mode filter bernomor (FASE O2/O3/O7) =====
  if (query.filter || query.sort || query.page) {
    const filter = query.filter ?? defaultOrdersFilter();
    const sort = query.sort ?? "date_desc";
    const pageSize = Math.min(Math.max(query.limit ?? ORDERS_PAGE_SIZE, 1), 100);
    const page = Math.max(query.page ?? 1, 1);
    const now = new Date();

    const { from, to } = dateRangeForPreset(filter.datePreset, now, {
      from: filter.from,
      to: filter.to,
    });
    const { fromISO, toISO } = dayBoundsISO(from, to);

    let base: Query = db.collection(COLLECTION);
    if (filter.status !== "semua") base = base.where("status", "==", filter.status);
    if (fromISO) base = base.where("createdAtISO", ">=", fromISO);
    if (toISO) base = base.where("createdAtISO", "<=", toISO);
    base = base.orderBy("createdAtISO", "desc");

    let docs: QueryDocumentSnapshot[] = [];
    let truncated = false;
    try {
      const snap = await base.limit(FILTER_SCAN_CAP).get();
      docs = snap.docs;
      truncated = docs.length >= FILTER_SCAN_CAP;
    } catch (err) {
      if (!isMissingIndexError(err)) throw err;
      console.warn(
        "[orders] index filter belum tersedia — fallback saring di memori (tanpa rentang native).",
      );
      const snap = await db
        .collection(COLLECTION)
        .orderBy("createdAtISO", "desc")
        .limit(FILTER_SCAN_CAP)
        .get();
      docs = snap.docs;
      truncated = docs.length >= FILTER_SCAN_CAP;
    }

    const all = docs.map((doc) =>
      normalizeOrder({ id: doc.id, ...(doc.data() as Record<string, unknown>) }),
    );
    const filtered = applyFilterAndSort(all, filter, sort, now);
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    // Mode ekspor (F-G4): kembalikan seluruh hasil filter (satu "halaman").
    const orders = query.all ? filtered : filtered.slice(start, start + pageSize);
    return {
      orders,
      nextCursor: null,
      total,
      page,
      pageSize: query.all ? total : pageSize,
      hasMore: query.all ? false : start + pageSize < total,
      truncated,
    };
  }

  // ===== Mode cursor (lama) =====
  const limit = Math.min(Math.max(query.limit ?? ORDERS_PAGE_SIZE, 1), 100);
  const status = query.status && query.status !== "semua" ? query.status : null;

  try {
    let ref: Query = db.collection(COLLECTION);
    if (status) ref = ref.where("status", "==", status);
    ref = ref.orderBy("createdAtISO", "desc");
    if (query.cursor) ref = ref.startAfter(query.cursor);

    const snap = await ref.limit(limit + 1).get();
    const docs = snap.docs;
    const hasMore = docs.length > limit;
    const pageDocs = hasMore ? docs.slice(0, limit) : docs;

    const orders = pageDocs.map((doc) =>
      normalizeOrder({ id: doc.id, ...(doc.data() as Record<string, unknown>) }),
    );
    const nextCursor =
      hasMore && pageDocs.length > 0
        ? (pageDocs[pageDocs.length - 1].get("createdAtISO") as string)
        : null;

    return { orders, nextCursor };
  } catch (err) {
    if (!isMissingIndexError(err)) throw err;
    console.warn(
      "[orders] index status+createdAtISO belum tersedia — fallback saring di memori.",
    );
  }

  const fetchLimit = status ? Math.min(limit * 4, 200) : limit;
  let ref: Query = db.collection(COLLECTION).orderBy("createdAtISO", "desc");
  if (query.cursor) ref = ref.startAfter(query.cursor);
  const snap = await ref.limit(fetchLimit + 1).get();

  let docs = snap.docs;
  const hasMoreServer = docs.length > fetchLimit;
  if (hasMoreServer) docs = docs.slice(0, fetchLimit);

  const all = docs.map((doc) =>
    normalizeOrder({ id: doc.id, ...(doc.data() as Record<string, unknown>) }),
  );

  const filtered = status ? all.filter((o) => o.status === status) : all;
  const page = filtered.slice(0, limit);
  const moreInPage = filtered.length > limit;
  const nextCursor =
    (moreInPage || hasMoreServer) && docs.length > 0
      ? (docs[docs.length - 1].get("createdAtISO") as string)
      : null;

  return { orders: page, nextCursor };
}

/** Ambil banyak pesanan sekaligus berdasarkan id (untuk aksi massal). */
export async function getOrdersByIds(ids: string[]): Promise<Order[]> {
  const db = getAdminDb();
  if (!db || ids.length === 0) return [];
  const unique = [...new Set(ids)].slice(0, 50);
  const refs = unique.map((id) => db.collection(COLLECTION).doc(id));
  const snaps = await db.getAll(...refs);
  return snaps
    .filter((s) => s.exists)
    .map((s) => normalizeOrder({ id: s.id, ...(s.data() as Record<string, unknown>) }));
}

/**
 * Lengkapi `buyerPhotoUrl` untuk order yang belum menyimpannya (order lama /
 * dibuat sebelum fitur foto). Diambil dari dokumen `users/{uid}` (satu kali per
 * uid unik). Best-effort: bila Admin SDK/uid kosong, order dikembalikan apa adanya.
 */
export async function attachBuyerPhotos(orders: Order[]): Promise<Order[]> {
  const missing = orders.filter((o) => !o.buyerPhotoUrl && o.uid);
  if (missing.length === 0) return orders;
  const db = getAdminDb();
  if (!db) return orders;

  const uids = [...new Set(missing.map((o) => o.uid))].slice(0, 50);
  let photoByUid = new Map<string, string>();
  try {
    const snaps = await db.getAll(...uids.map((uid) => db.collection("users").doc(uid)));
    photoByUid = new Map(
      snaps
        .map((s) => {
          const v = s.exists ? s.get("photoURL") : undefined;
          return [s.id, typeof v === "string" ? v.trim() : ""] as const;
        })
        .filter(([, v]) => Boolean(v)),
    );
  } catch (err) {
    console.error("[orders] gagal memuat foto pembeli:", err);
    return orders;
  }

  if (photoByUid.size === 0) return orders;
  return orders.map((o) =>
    o.buyerPhotoUrl || !o.uid
      ? o
      : { ...o, buyerPhotoUrl: photoByUid.get(o.uid) || undefined },
  );
}

/**
 * Ringkasan "butuh perhatian" (FASE O5) — hitung order yang butuh tindakan admin,
 * dari pemindaian window (cap `FILTER_SCAN_CAP`). Best-effort; `truncated` menandai
 * bila batas tersentuh.
 */
export type AttentionSummary = {
  jasa_menunggu: number;
  bayar_segera: number;
  /** Lewat `expiresAt` tetapi status masih `menunggu_bayar` (F-04). */
  terlambat_bayar: number;
  kurang_bayar: number;
  masalah_pembayaran: number;
  belum_dipenuhi: number;
  email_gagal: number;
  total: number;
  truncated: boolean;
};

export async function getOrdersAttentionSummary(): Promise<AttentionSummary> {
  const empty: AttentionSummary = {
    jasa_menunggu: 0,
    bayar_segera: 0,
    terlambat_bayar: 0,
    kurang_bayar: 0,
    masalah_pembayaran: 0,
    belum_dipenuhi: 0,
    email_gagal: 0,
    total: 0,
    truncated: false,
  };
  const db = getAdminDb();
  if (!db) return empty;
  try {
    const snap = await db
      .collection(COLLECTION)
      .orderBy("createdAtISO", "desc")
      .limit(FILTER_SCAN_CAP)
      .get();
    const truncated = snap.docs.length >= FILTER_SCAN_CAP;
    const now = new Date();
    const count: AttentionSummary = { ...empty, truncated };
    const flagged = new Set<string>();
    for (const doc of snap.docs) {
      const order = normalizeOrder({ id: doc.id, ...(doc.data() as Record<string, unknown>) });
      const reasons = attentionReasons(order, now);
      for (const r of reasons) {
        if (r in count && typeof count[r as keyof AttentionSummary] === "number") {
          (count[r as keyof AttentionSummary] as number) += 1;
        }
        flagged.add(order.id);
      }
    }
    count.total = flagged.size;
    return count;
  } catch (err) {
    console.error("[orders] gagal menghitung attention:", err);
    return empty;
  }
}

/**
 * Mengubah status sebuah pesanan + mencatat updater. **ATOMIK** (OR-A3):
 * dijalankan dalam transaksi dengan RE-CHECK status di dalam transaksi, sehingga
 * perubahan bersamaan tidak saling menimpa.
 *
 * Mengembalikan `{ previousStatus, changed, notFound? }`:
 * - `previousStatus` — status SEBELUM perubahan (untuk idempotensi email `EM-C3`
 *   & pengembalian kuota kupon `KP-C2`).
 * - `changed` — `false` bila status sudah sama, transisi tak diizinkan, atau order tak ada.
 * - `notFound` — `true` bila order tidak ditemukan.
 * - `invalidTransition` + `previousStatus` — status aktual tidak mengizinkan transisi.
 *
 * Validasi transisi ejaan/status dan penulisan dilakukan dalam transaksi yang sama
 * agar dua request bersamaan tidak dapat memakai status usang.
 */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  updatedBy: string,
): Promise<{
  previousStatus: OrderStatus | null;
  changed: boolean;
  notFound?: boolean;
  invalidTransition?: boolean;
  /** Stok dilepas pada transisi ini (O-01). */
  stockReleased?: boolean;
}> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  const ref = db.collection(COLLECTION).doc(id);
  let createdAtISO: string | undefined;

  const result = await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) {
      return { previousStatus: null, changed: false, notFound: true };
    }
    const data = doc.data() as Record<string, unknown>;
    createdAtISO = String(data.createdAtISO ?? "");
    const current = normalizeOrder({ id: doc.id, ...data });
    const previousStatus = current.status;

    const transition = evaluateStatusTransition(previousStatus, status);
    if (transition === "unchanged") {
      return { previousStatus, changed: false };
    }

    if (transition === "invalid") {
      return { previousStatus, changed: false, invalidTransition: true };
    }

    // O-01: transisi → `dibatalkan`/`kedaluwarsa` MELEPAS reservasi stok.
    // Idempoten via `stockReleasedAtISO` (cegah pengembalian ganda).
    const reservation = current.stockReservation ?? [];
    const releaseStock =
      reservation.length > 0 &&
      !current.stockReleasedAtISO &&
      shouldReleaseStock(previousStatus, status);
    let releasedAtISO: string | undefined;
    if (releaseStock) {
      await releaseStockInTransaction(tx, reservation);
      releasedAtISO = new Date().toISOString();
    }

    tx.update(ref, {
      status,
      updatedAtISO: new Date().toISOString(),
      updatedBy,
      ...(releasedAtISO ? { stockReleasedAtISO: releasedAtISO } : {}),
    });
    return { previousStatus, changed: true, stockReleased: releaseStock };
  });
  if (result.changed) {
    invalidateOrderDerivedCaches();
    invalidateAnalyticsForOrder(createdAtISO);
    if (result.stockReleased) invalidateProductStockCache();
  }
  return result;
}

/**
 * Menyimpan/memperbarui info pembayaran pada order (mis. setelah invoice Mayar
 * dibuat di checkout). Tidak mengubah status order.
 */
export async function updateOrderPayment(
  id: string,
  payment: NonNullable<Order["payment"]>,
  component: "goods" | "service" | "order" = "order",
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  payment.component = component;
  await db.collection(COLLECTION).doc(id).update({
    ...(component === "service" ? { servicePayment: payment } : { payment }),
    updatedAtISO: new Date().toISOString(),
  });
}

export async function recordInvoiceRecovery(
  id: string,
  recovery: NonNullable<Order["invoiceRecovery"]>,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  const ref = db.collection(COLLECTION).doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Pesanan tidak ditemukan.");
    const existing = snap.get("invoiceRecovery") as Record<string, unknown> | undefined;
    if (
      recovery.state === "creating" &&
      existing?.state === "creating" &&
      existing.startedAt !== recovery.startedAt
    ) {
      throw new Error("Invoice sedang dibuat atau status sebelumnya belum direkonsiliasi.");
    }
    if (recovery.state === "creating" && existing?.state === "orphaned") {
      throw new Error("Invoice orphan harus direkonsiliasi sebelum membuat invoice baru.");
    }
    tx.update(ref, {
      invoiceRecovery: recovery.state === "creating"
        ? {
            ...recovery,
            attemptCount: recovery.startedAt === existing?.startedAt
              ? Number(existing?.attemptCount ?? 1)
              : Number(existing?.attemptCount ?? 0) + 1,
          }
        : recovery,
      updatedAtISO: new Date().toISOString(),
    });
  });
}

export async function resolveInvoiceRecovery(id: string): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  const ref = db.collection(COLLECTION).doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Pesanan tidak ditemukan.");
    const data = snap.data() as Record<string, unknown>;
    const recovery = data.invoiceRecovery as Record<string, unknown> | undefined;
    if (!recovery || !["orphaned", "creating"].includes(String(recovery.state))) throw new Error("Tidak ada invoice yang perlu direkonsiliasi.");
    tx.update(ref, {
      invoiceRecovery: { ...recovery, state: "failed", updatedAt: new Date().toISOString(), error: "Admin mengonfirmasi invoice tidak ditemukan di Mayar." },
      updatedAtISO: new Date().toISOString(),
    });
  });
}

export async function relinkRecoveredInvoice(id: string, input: {
  invoiceId: string;
  transactionId?: string;
  payUrl?: string;
  expiresAt?: string;
}): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  const ref = db.collection(COLLECTION).doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Pesanan tidak ditemukan.");
    const data = snap.data() as Record<string, unknown>;
    const recovery = data.invoiceRecovery as Record<string, unknown> | undefined;
    if (!recovery || !["orphaned", "creating"].includes(String(recovery.state))) throw new Error("Tidak ada invoice orphan yang perlu diselesaikan.");
    if (recovery.invoiceId && recovery.invoiceId !== input.invoiceId) throw new Error("ID invoice tidak cocok dengan bukti invoice yang sudah tercatat.");
    const field = recovery.component === "service" ? "servicePayment" : "payment";
    const oldPayment = (data[field] && typeof data[field] === "object" ? data[field] : {}) as Record<string, unknown>;
    tx.update(ref, {
      [field]: {
        ...oldPayment,
        provider: "mayar",
        status: "menunggu",
        component: recovery.component,
        amountExpected: recovery.amountExpected,
        invoiceId: input.invoiceId,
        ...(input.transactionId ? { transactionId: input.transactionId } : {}),
        ...(input.payUrl ? { payUrl: input.payUrl } : {}),
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
      },
      invoiceRecovery: { ...recovery, state: "linked", ...input, updatedAt: new Date().toISOString() },
      updatedAtISO: new Date().toISOString(),
    });
  });
}

export async function clearFailedInvoiceRecovery(id: string): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  const ref = db.collection(COLLECTION).doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.get("invoiceRecovery.state") !== "failed") throw new Error("Status rekonsiliasi belum mengizinkan retry.");
    tx.update(ref, { invoiceRecovery: null, updatedAtISO: new Date().toISOString() });
  });
}

/**
 * Menyimpan id token unduhan pada order (setelah fulfillment, FASE P1).
 */
export async function setOrderDownloadToken(
  id: string,
  downloadTokenId: string,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  await db.collection(COLLECTION).doc(id).update({
    downloadTokenId,
    updatedAtISO: new Date().toISOString(),
  });
}

/**
 * Catat masalah bukti pembayaran pada order (untuk panel "butuh perhatian").
 *
 * - `kind: "mismatch"` — nominal diterima tidak sama dengan tagihan (mis. kurang
 *   bayar). Menimpa `paymentMismatch` dan membersihkan `paymentIssue` lama.
 * - `kind: "issue"` — bukti invoice/transaksi bermasalah (bukan soal nominal);
 *   TIDAK boleh tampil sebagai "Nominal kurang bayar".
 *
 * Tidak pernah mengubah status pembayaran; hanya anotasi agar admin menindak.
 */
export async function recordPaymentProblem(
  id: string,
  problem:
    | { kind: "mismatch"; received: number; expected: number; reason?: string }
    | { kind: "issue"; reason: string },
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  const atISO = new Date().toISOString();
  const ref = db.collection(COLLECTION).doc(id);
  if (problem.kind === "mismatch") {
    await ref.set(
      {
        paymentMismatch: {
          received: problem.received,
          expected: problem.expected,
          reason: problem.reason ?? "amount_mismatch",
          atISO,
        },
        paymentIssue: FieldValue.delete(),
      },
      { merge: true },
    );
  } else {
    await ref.set(
      {
        paymentMismatch: FieldValue.delete(),
        paymentIssue: { reason: problem.reason, atISO },
      },
      { merge: true },
    );
  }
}

/**
 * Menandai order sebagai DIBAYAR secara **idempoten & ATOMIK**.
 *
 * ATOMIK (OR-A1): dijalankan dalam **transaksi Firestore** dengan RE-CHECK status
 * DI DALAM transaksi. Ini mencegah balapan dengan cron kedaluwarsa / perubahan
 * status bersamaan: bila order sudah berpindah dari status yang boleh dibayar
 * (mis. sudah `kedaluwarsa`/`dibatalkan`), transaksi dibatalkan & status terminal
 * TIDAK ditimpa (uang/kuota kupon tetap konsisten).
 *
 * Guard status (OR-A2): hanya status ∈ `PAYABLE_STATUSES` (`baru`, `menunggu_bayar`,
 * `menunggu_konfirmasi`) yang boleh ditandai lunas. Order yang sudah `dibayar`
 * (idempoten) atau terminal ditolak dengan `applied: false` + `reason`.
 *
 * Mengembalikan `{ applied, order, reason? }`:
 * - `applied: true` — status berhasil diubah menjadi `dibayar`.
 * - `applied: false` + `reason: "already_paid"` — order sudah lunas (idempoten).
 * - `applied: false` + `reason: "not_payable"` — status tidak boleh dibayar
 *   (terminal: `dibatalkan`/`kedaluwarsa`/`selesai`, atau `diproses`).
 * - `applied: false` + `reason: "not_found"` — order tidak ada.
 */
export async function markOrderPaid(
  id: string,
  info: { amount?: number; method?: string; transactionId?: string; invoiceId?: string; at?: string },
  orderStatus: OrderStatus = "dibayar",
): Promise<{
  applied: boolean;
  order: Order | null;
  reason?: "already_paid" | "not_payable" | "not_found";
}> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  const ref = db.collection(COLLECTION).doc(id);
  const at = info.at ?? new Date().toISOString();

  try {
    const result = await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) {
        return { applied: false, order: null, reason: "not_found" as const };
      }

      const current = normalizeOrder({
        id: doc.id,
        ...(doc.data() as Record<string, unknown>),
      });

      // Idempoten: sudah dibayar → tidak ada aksi.
      const payRef = current.servicePayment?.invoiceId === info.invoiceId && info.invoiceId
        ? current.servicePayment
        : current.payment;
      if (payRef?.status === "dibayar") {
        return { applied: false, order: current, reason: "already_paid" as const };
      }
      if (!payRef || (info.invoiceId && payRef.invoiceId !== info.invoiceId)) {
        return { applied: false, order: current, reason: "not_payable" as const };
      }

      const mixed = current.items.some((item) => item.fulfillment === "jasa") && current.items.some((item) => item.fulfillment !== "jasa");
      const componentPayment = payRef.component === "service" || payRef.component === "goods";
      // Mixed component invoices may settle independently; terminal orders remain blocked.
      if ((!componentPayment && !isPayableStatus(current.status)) || ["dibatalkan", "kedaluwarsa", "selesai"].includes(current.status)) {
        return { applied: false, order: current, reason: "not_payable" as const };
      }

      // PENTING: `payRef` berasal dari `normalizeOrderPayment`, yang mengembalikan
      // SEMUA kunci opsional (bernilai `undefined` bila tak ada di dokumen).
      // Menyebarnya langsung ke `tx.update()` membuat Firestore menolak SELURUH
      // transaksi ("Cannot use \"undefined\" as a Firestore value"). `stripUndefined`
      // membuang kunci kosong tanpa menyentuh sentinel `FieldValue.delete()`.
      const payment = stripUndefined({
        ...payRef,
        provider: payRef.provider ?? "mayar",
        status: "dibayar" as const,
        transactionId: info.transactionId ?? payRef.transactionId,
        method: info.method ?? payRef.method,
        amount: typeof info.amount === "number" ? info.amount : payRef.amount,
        paidAt: at,
        ...(current.payment?.manual ? { manual: true } : {}),
      });

      const mixedGoodsPaid = mixed && payment.component === "goods";
      const settled = mixedGoodsPaid ? current.servicePayment?.status === "dibayar" : payment.component === "service" && mixed
        ? current.payment?.status === "dibayar"
        : true;
      const nextPayment = stripUndefined(
        payRef.component === "service"
          ? { payment: current.payment, servicePayment: payment }
          : { payment, servicePayment: current.servicePayment },
      );
      tx.update(ref, stripUndefined({
        ...(settled ? { status: orderStatus } : {}),
        ...nextPayment,
        paymentMismatch: FieldValue.delete(),
        paymentIssue: FieldValue.delete(),
        updatedAtISO: at,
        updatedBy: "system:markOrderPaid",
      }));

      const order = normalizeOrder({
        id: doc.id,
        ...(doc.data() as Record<string, unknown>),
        status: orderStatus,
        ...nextPayment,
        paymentMismatch: undefined,
        paymentIssue: undefined,
        ...(settled ? { status: orderStatus } : {}),
      });
      return { applied: true, order };
    });
    if (result.applied) {
      invalidateOrderDerivedCaches();
      invalidateAnalyticsForOrder(result.order?.createdAt);
    }
    return result;
  } catch (err) {
    console.error("[orders] markOrderPaid gagal:", id, err);
    throw err;
  }
}

/** Mengambil satu pesanan berdasarkan id (null bila tidak ada). */
export async function getOrderById(id: string): Promise<Order | null> {
  const db = getAdminDb();
  if (!db) return null;
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return normalizeOrder({ id: doc.id, ...(doc.data() as Record<string, unknown>) });
}

/**
 * Status order yang dianggap "sudah dibayar / layak diulas" (FASE R).
 * Pelanggan boleh mengulas bila pembayaran sudah diterima dan order belum
 * dibatalkan/kedaluwarsa. `menunggu_bayar` & `menunggu_konfirmasi` (JASA belum
 * dikonfirmasi) TIDAK termasuk.
 */
export const REVIEW_ELIGIBLE_STATUSES: readonly OrderStatus[] = [
  "dibayar",
  "diproses",
  "selesai",
];

/**
 * Cari order MILIK `uid` yang memuat produk `slug` dan sudah dibayar/layak diulas
 * (status ∈ REVIEW_ELIGIBLE_STATUSES). Mengembalikan order pertama yang cocok,
 * atau null. Menyaring di memori (jumlah order per user kecil) agar tidak
 * bergantung index komposit `uid`+status+items.
 */
export async function findCompletedOrderForProduct(
  uid: string,
  productSlug: string,
): Promise<Order | null> {
  const db = getAdminDb();
  if (!db) return null;
  // Ambil semua order user, saring status & produk di memori.
  const snap = await db.collection(COLLECTION).where("uid", "==", uid).get();
  const orders = snap.docs
    .map((doc) =>
      normalizeOrder({ id: doc.id, ...(doc.data() as Record<string, unknown>) }),
    )
    .filter((o) => (REVIEW_ELIGIBLE_STATUSES as readonly string[]).includes(o.status))
    .filter((o) => o.items.some((it) => it.slug === productSlug))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return orders[0] ?? null;
}

/**
 * Daftar pesanan pada satu hari zona waktu (untuk drill-down analitik `AN-P2`).
 * `dateKey` = "yyyy-mm-dd" (zona `Asia/Jakarta`). Menyaring di memori agar
 * tak bergantung index; jumlah order satu hari wajar.
 */
export async function getOrdersForDay(dateKey: string): Promise<Order[]> {
  const db = getAdminDb();
  if (!db) return [];
  // Ambil rentang longgar ±1 hari dari tanggal tersebut, lalu saring presisi.
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return [];
  const dayStartMs = Date.UTC(y, m - 1, d) - 86_400_000;
  const cutoffISO = new Date(dayStartMs).toISOString();

  const snap = await db
    .collection(COLLECTION)
    .where("createdAtISO", ">=", cutoffISO)
    .get();

  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return snap.docs
    .map((doc) =>
      normalizeOrder({ id: doc.id, ...(doc.data() as Record<string, unknown>) }),
    )
    .filter((o) => {
      const dt = new Date(o.createdAt);
      return !Number.isNaN(dt.getTime()) && fmt.format(dt) === dateKey;
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export type DeleteOrderResult =
  | {
      ok: true;
      status: OrderStatus;
      couponRestored: boolean;
      /** Stok dilepas saat penghapusan (O-01). */
      stockReleased?: boolean;
      /** Hanya untuk invalidasi agregat harian; tidak dikirim ke klien. */
      createdAtISO: string;
    }
  | {
      ok: false;
      reason: "not_found" | "delete_blocked";
      status?: OrderStatus;
    };

/**
 * Menghapus pesanan (permanen) secara ATOMIK dengan pengembalian kuota kupon
 * (ADM-09). Order dan dokumen kupon/redemption/daily ditulis dalam satu
 * transaksi Firestore: tidak ada lagi state "order terhapus tetapi kuota belum
 * kembali" atau sebaliknya.
 *
 * `allowedStatuses` diperiksa ulang di dalam transaksi agar perubahan status
 * yang bersamaan tidak bisa melewati aturan hard-delete.
 */
export async function deleteOrder(
  id: string,
  allowedStatuses: readonly OrderStatus[],
): Promise<DeleteOrderResult> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");

  const result = await db.runTransaction(async (tx) => {
    const ref = db.collection(COLLECTION).doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists) {
      return { ok: false, reason: "not_found" } as const;
    }

    const order = normalizeOrder({
      id,
      ...(snap.data() as Record<string, unknown>),
    });
    if (!allowedStatuses.includes(order.status)) {
      return {
        ok: false,
        reason: "delete_blocked",
        status: order.status,
      } as const;
    }

    // O-01: baca produk SEBELUM penulisan kupon — transaksi Firestore mewajibkan
    // SEMUA pembacaan selesai sebelum penulisan pertama.
    const stockWrites =
      order.stockReservation &&
      order.stockReservation.length > 0 &&
      !order.stockReleasedAtISO
        ? await readStockRelease(tx, order.stockReservation)
        : [];

    const couponId = order.coupon?.couponId;
    const couponRestored = couponId
      ? // Semua baca kupon dilakukan di dalam transaksi yang sama, sebelum
        // `tx.delete(order)` ditulis.
        await restoreCouponUsageInTransaction(tx, couponId, order.uid)
      : false;

    // Tulis stok yang dilepas, lalu hapus order (semua tulis setelah semua baca).
    applyStockRelease(tx, stockWrites);
    tx.delete(ref);
    return {
      ok: true,
      status: order.status,
      couponRestored,
      stockReleased: stockWrites.length > 0,
      createdAtISO: order.createdAt,
    } as const;
  });

  if (result.ok) {
    invalidateOrderDerivedCaches();
    invalidateAnalyticsForOrder(result.createdAtISO);
    if (result.couponRestored) invalidateCouponStatsCache();
    if (result.stockReleased) invalidateProductStockCache();
  }
  return result;
}

// ===== Kedaluwarsa otomatis (FASE P2) =====

/**
 * Ambil order berstatus `menunggu_bayar` yang sudah melewati `expiresAt`
 * (dari `payment.expiresAt`, atau fallback `paymentTtlMs` sejak `createdAt`
 * bila invoice tak punya waktu kedaluwarsa). Menyaring di MEMORI agar tak
 * bergantung composite index; hanya mengambil status yang menunggu bayar.
 *
 * Aman tanpa Admin SDK → mengembalikan daftar kosong.
 */
export async function getExpiredPendingOrders(
  now: Date = new Date(),
  fallbackTtlMs = 24 * 60 * 60 * 1000,
  maxScan = 500,
): Promise<Order[]> {
  const db = getAdminDb();
  if (!db) return [];

  const snap = await db
    .collection(COLLECTION)
    .where("status", "==", "menunggu_bayar")
    .limit(maxScan)
    .get();

  return snap.docs
    .map((doc) =>
      normalizeOrder({ id: doc.id, ...(doc.data() as Record<string, unknown>) }),
    )
    .filter((o) => isOrderExpired(o, now, fallbackTtlMs));
}

/**
 * Menandai order sebagai `kedaluwarsa` (idempoten): hanya berlaku bila order
 * masih `menunggu_bayar`. Mengembalikan `{ applied, order }`.
 * Memperbarui `payment.status` = `kedaluwarsa` agar panel pembayaran konsisten.
 *
 * ATOMIK (GAP-1): dijalankan dalam **transaksi Firestore** dengan RE-CHECK
 * status di dalam transaksi. Ini mencegah balapan dengan webhook/pembayaran:
 * bila order sudah berpindah dari `menunggu_bayar` (mis. baru saja `dibayar`),
 * transaksi dibatalkan dan TIDAK menimpa status final (uang masuk tetap aman).
 */
export async function markOrderExpired(
  id: string,
): Promise<{ applied: boolean; order: Order | null }> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  const ref = db.collection(COLLECTION).doc(id);

  try {
    const result = await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) return { applied: false, order: null };

      const current = normalizeOrder({
        id: doc.id,
        ...(doc.data() as Record<string, unknown>),
      });
      // Re-check di dalam transaksi: hanya `menunggu_bayar` yang boleh expire.
      if (current.status !== "menunggu_bayar") {
        return { applied: false, order: current };
      }

      const atISO = new Date().toISOString();
      // `current.payment` hasil normalisasi memuat kunci opsional `undefined`;
      // bersihkan sebelum disebar ke `tx.update()` agar Firestore tidak menolak
      // seluruh transaksi (gejala "invoice kedaluwarsa tetap menunggu bayar").
      const payment = current.payment
        ? stripUndefined({ ...current.payment, status: "kedaluwarsa" as const })
        : undefined;

      // O-01: order kedaluwarsa MELEPAS reservasi stok. Semua BACA harus
      // selesai sebelum TULIS, jadi baca produk lebih dulu lalu tulis di akhir.
      const reservation = current.stockReservation ?? [];
      const releaseStock = reservation.length > 0 && !current.stockReleasedAtISO;
      const stockWrites = releaseStock
        ? await readStockRelease(tx, reservation)
        : [];

      applyStockRelease(tx, stockWrites);
      tx.update(ref, stripUndefined({
        status: "kedaluwarsa",
        ...(payment ? { payment } : {}),
        ...(releaseStock ? { stockReleasedAtISO: atISO } : {}),
        updatedAtISO: atISO,
        updatedBy: "system:expire",
      }));

      return {
        applied: true,
        order: normalizeOrder({
          id: doc.id,
          ...(doc.data() as Record<string, unknown>),
          status: "kedaluwarsa",
          ...(payment ? { payment } : {}),
          ...(releaseStock ? { stockReleasedAtISO: atISO } : {}),
        }),
      };
    });
    if (result.applied) {
      invalidateOrderDerivedCaches();
      invalidateAnalyticsForOrder(result.order?.createdAt);
      if (result.order?.stockReleasedAtISO) invalidateProductStockCache();
    }
    return result;
  } catch (err) {
    console.error("[orders] markOrderExpired gagal:", id, err);
    throw err;
  }
}
