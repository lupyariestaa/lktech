import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { normalizeOrder, ORDER_STATUSES, type OrderStatus } from "@/lib/order-types";
import { ANALYTICS_TIMEZONE } from "@/lib/metrics-spec";
import {
  aggregateDay,
  type AnalyticsDailyDoc,
  type DailyOrderInput,
  type DailyStatusTotals,
} from "@/lib/analytics-daily-pure";

/**
 * Persistensi agregasi harian analitik (`AN-P3`) — server-only.
 *
 * Alur:
 * - **Tulis**: `backfillDailyAggregates(days)` meringkas order per hari ke
 *   `analytics_daily/{yyyy-mm-dd}` (dipanggil cron). `dropDayAggregate(key)`
 *   dipanggil saat order berubah agar hari itu dihitung ulang.
 * - **Baca**: `loadExistingDocs(keys)` mengembalikan dokumen yang SUDAH ada;
 *   bila ada hari hilang, pemanggil (`sales-analytics`) jatuh ke perhitungan
 *   LIVE — sehingga angka tidak pernah "menebak" bila agregat belum lengkap.
 *
 * Semua kegagalan bersifat non-fatal (log + lanjut); pembacaan live tetap benar.
 */

const COLLECTION = "analytics_daily";

/** Kunci hari zona analitik (yyyy-mm-dd) — sama dengan sales-analytics. */
export function dayKeyInTz(d: Date, timeZone: string = ANALYTICS_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Tengah malam (UTC) dari kunci hari — cermin sales-analytics `startOfWindow`. */
export function dayStartMsFromKey(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Kunci hari berurutan untuk `days` hari terakhir (termasuk hari ini). */
export function windowDayKeys(days: number, now: Date = new Date()): string[] {
  const startMs = dayStartMsFromKey(dayKeyInTz(now));
  const keys: string[] = [];
  for (let i = 0; i < days; i++) {
    keys.push(dayKeyInTz(new Date(startMs + i * 86_400_000)));
  }
  return keys;
}

/** Ubah data Firestore mentah → `AnalyticsDailyDoc` yang aman. */
function normalizeDoc(v: unknown): AnalyticsDailyDoc {
  const d = (v ?? {}) as Record<string, unknown>;
  const statusTotals: DailyStatusTotals = {};
  const rawStatus = (d.statusTotals ?? {}) as Record<string, unknown>;
  for (const s of ORDER_STATUSES) {
    const t = rawStatus[s] as { count?: unknown; total?: unknown } | undefined;
    if (t && typeof t.count === "number") {
      statusTotals[s as OrderStatus] = {
        count: t.count,
        total: typeof t.total === "number" ? t.total : 0,
      };
    }
  }
  return {
    dateISO: String(d.dateISO ?? ""),
    statusTotals,
    productsCompleted:
      (d.productsCompleted as AnalyticsDailyDoc["productsCompleted"]) ?? {},
    productsAll: (d.productsAll as AnalyticsDailyDoc["productsAll"]) ?? {},
  };
}

/** Ringkas order `[startMs, endMs)` menjadi doc harian (baca Firestore). */
async function computeDayFromDb(dateISO: string): Promise<AnalyticsDailyDoc> {
  const db = getAdminDb();
  if (!db) return { dateISO, statusTotals: {}, productsCompleted: {}, productsAll: {} };

  // Ambil jendela LEBAR (hari UTC sebelum+sesusudah) lalu FILTER ke hari zona
  // analitik agar pengelompokan PERSIS sama dengan jalur live (`dayKeyInTz`).
  // (Hari zona bisa bergeser ≤1 hari dari hari UTC.)
  const startMs = dayStartMsFromKey(dateISO);
  const snap = await db
    .collection("orders")
    .where("createdAtISO", ">=", new Date(startMs - 86_400_000).toISOString())
    .where("createdAtISO", "<", new Date(startMs + 2 * 86_400_000).toISOString())
    .select("status", "total", "items", "createdAtISO")
    .get();

  const rows: DailyOrderInput[] = [];
  for (const doc of snap.docs) {
    const order = normalizeOrder({ id: doc.id, ...(doc.data() as Record<string, unknown>) });
    const d = new Date(order.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    if (dayKeyInTz(d) !== dateISO) continue;
    rows.push({
      status: order.status,
      total: order.total,
      items: order.items.map((it) => ({
        slug: it.slug,
        name: it.name,
        qty: it.qty,
        subtotal: it.subtotal,
        variantSlug: it.variantSlug,
      })),
    });
  }

  return aggregateDay(dateISO, rows);
}

/**
 * Tulis ulang agregat untuk `days` hari terakhir (cron). Mengembalikan jumlah
 * hari yang berhasil ditulis.
 */
export async function backfillDailyAggregates(days = 3): Promise<number> {
  const db = getAdminDb();
  if (!db) return 0;
  const keys = windowDayKeys(days);
  let written = 0;
  for (const key of keys) {
    try {
      const doc = await computeDayFromDb(key);
      await db.collection(COLLECTION).doc(key).set(doc, { merge: false });
      written += 1;
    } catch (err) {
      console.error("[analytics-daily] backfill gagal:", key, err);
    }
  }
  return written;
}

/** Hapus agregat satu hari (dipanggil saat order berubah). Non-fatal. */
export async function dropDayAggregate(dateISO: string): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  try {
    await db.collection(COLLECTION).doc(dateISO).delete();
  } catch (err) {
    console.error("[analytics-daily] drop gagal:", dateISO, err);
  }
}

/**
 * Muat dokumen agregat untuk `keys` — HANYA yang sudah ada (tanpa menghitung
 * live). Pemanggil memeriksa kelengkapan; bila ada hari hilang → pakai jalur
 * perhitungan LIVE (jangan menebak angka).
 */
export async function loadExistingDocs(
  keys: readonly string[],
): Promise<Record<string, AnalyticsDailyDoc>> {
  const db = getAdminDb();
  const map: Record<string, AnalyticsDailyDoc> = {};
  if (!db || keys.length === 0) return map;
  try {
    const refs = keys.map((k) => db.collection(COLLECTION).doc(k));
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) {
      if (snap.exists) map[snap.id] = normalizeDoc(snap.data());
    }
  } catch (err) {
    console.error("[analytics-daily] baca agregat gagal:", err);
  }
  return map;
}