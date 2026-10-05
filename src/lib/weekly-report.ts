import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { normalizeOrder, type Order } from "@/lib/order-types";
import { aggregateOrders, percentDelta } from "@/lib/report-pure";

/**
 * LAPORAN MINGGUAN (Tema 3.3, FASE L4).
 *
 * Menyusun ringkasan bisnis 7 hari terakhir dari data NYATA (orders + leads +
 * kupon), plus perbandingan dengan 7 hari sebelumnya. Dipakai cron
 * `/api/cron/weekly-report` untuk kirim email ke admin.
 *
 * Aman tanpa Admin SDK → laporan kosong (best-effort).
 */

export type WeeklyReport = {
  /** Rentang waktu laporan (ISO). */
  fromISO: string;
  toISO: string;
  windowDays: number;
  orders: {
    total: number;
    paid: number;
    completed: number;
    cancelled: number;
    expired: number;
    /** Omzet netto (Σ total) dari order yang DIBAYAR (dibayar/diproses/selesai). */
    revenue: number;
    aov: number;
  };
  /** Perbandingan vs periode sebelumnya (persen, null bila pembanding 0). */
  deltas: {
    revenue: number | null;
    orders: number | null;
    leads: number | null;
  };
  leads: {
    new: number;
    won: number;
  };
  coupons: {
    /** Jumlah order yang memakai kupon pada periode. */
    ordersUsing: number;
    /** Σ diskon yang diberikan (Rp). */
    discountGiven: number;
  };
  topProducts: Array<{ name: string; units: number; revenue: number }>;
};

function pct(curr: number, prev: number): number | null {
  return percentDelta(curr, prev);
}

/** Ringkas order → bagian `orders` laporan (murni via report-pure). */
function summarize(orders: Order[]): WeeklyReport["orders"] {
  const agg = aggregateOrders(
    orders.map((o) => ({
      status: o.status,
      total: o.total,
      couponDiscount: o.coupon?.discount ?? 0,
      items: o.items.map((it) => ({ name: it.name, qty: it.qty, subtotal: it.subtotal })),
    })),
  );
  return {
    total: agg.total,
    paid: agg.paid,
    completed: agg.completed,
    cancelled: agg.cancelled,
    expired: agg.expired,
    revenue: agg.revenue,
    aov: agg.aov,
  };
}

/**
 * Bangun laporan mingguan. `now` dapat diinjeksi (untuk pengujian).
 */
export async function buildWeeklyReport(
  now: Date = new Date(),
  windowDays = 7,
): Promise<WeeklyReport> {
  const toMs = now.getTime();
  const fromMs = toMs - windowDays * 86_400_000;
  const prevFromMs = fromMs - windowDays * 86_400_000;

  const empty: WeeklyReport = {
    fromISO: new Date(fromMs).toISOString(),
    toISO: new Date(toMs).toISOString(),
    windowDays,
    orders: { total: 0, paid: 0, completed: 0, cancelled: 0, expired: 0, revenue: 0, aov: 0 },
    deltas: { revenue: null, orders: null, leads: null },
    leads: { new: 0, won: 0 },
    coupons: { ordersUsing: 0, discountGiven: 0 },
    topProducts: [],
  };

  const db = getAdminDb();
  if (!db) return empty;

  try {
    // Ambil order sejak awal periode sebelumnya (2× jendela).
    const cutoffISO = new Date(prevFromMs).toISOString();
    const snap = await db
      .collection("orders")
      .where("createdAtISO", ">=", cutoffISO)
      .get();
    const all = snap.docs.map((doc) =>
      normalizeOrder({ id: doc.id, ...(doc.data() as Record<string, unknown>) }),
    );

    const current: Order[] = [];
    const previous: Order[] = [];
    for (const o of all) {
      const t = new Date(o.createdAt).getTime();
      if (!Number.isFinite(t)) continue;
      if (t >= fromMs) current.push(o);
      else if (t >= prevFromMs) previous.push(o);
    }

    const cur = summarize(current);
    const prev = summarize(previous);

    // Kupon + produk terlaris — dari satu agregat (sumber tunggal report-pure).
    const agg = aggregateOrders(
      current.map((o) => ({
        status: o.status,
        total: o.total,
        couponDiscount: o.coupon?.discount ?? 0,
        items: o.items.map((it) => ({ name: it.name, qty: it.qty, subtotal: it.subtotal })),
      })),
    );
    const ordersUsing = agg.couponsUsing;
    const discountGiven = agg.discountGiven;
    const topProducts = agg.topProducts;

    // Lead baru & menang pada periode ini.
    let leadsNew = 0;
    let leadsWon = 0;
    let prevLeads = 0;
    try {
      const leadSnap = await db
        .collection("leads")
        .where("createdAtISO", ">=", cutoffISO)
        .get();
      leadSnap.forEach((doc) => {
        const created = new Date(String(doc.get("createdAtISO") ?? "")).getTime();
        if (!Number.isFinite(created)) return;
        if (created >= fromMs) {
          leadsNew += 1;
          const stage = doc.get("stage");
          const status = doc.get("status");
          if (stage === "menang" || status === "selesai") leadsWon += 1;
        } else if (created >= prevFromMs) {
          prevLeads += 1;
        }
      });
    } catch (err) {
      console.error("[weekly-report] gagal memuat leads:", err);
    }

    return {
      fromISO: new Date(fromMs).toISOString(),
      toISO: new Date(toMs).toISOString(),
      windowDays,
      orders: cur,
      deltas: {
        revenue: pct(cur.revenue, prev.revenue),
        orders: pct(cur.total, prev.total),
        leads: pct(leadsNew, prevLeads),
      },
      leads: { new: leadsNew, won: leadsWon },
      coupons: { ordersUsing, discountGiven },
      topProducts,
    };
  } catch (err) {
    console.error("[weekly-report] gagal membangun laporan:", err);
    return empty;
  }
}
