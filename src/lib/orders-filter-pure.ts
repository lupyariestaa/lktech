/**
 * Logika MURNI filter/sort daftar pesanan admin (FASE O1–O3) — bebas impor
 * runtime agar dapat diuji Node tanpa alias resolver.
 *
 * Dipakai bersama klien (`orders-toolbar`) & server (`getOrdersPage` fallback)
 * sehingga perilaku filter identik walau index Firestore belum tersedia.
 *
 * Tipe order di sini STRUKTURAL (subset field yang relevan) — sengaja tak mengimpor
 * `@/lib/order-types` agar modul tetap murni.
 */

/** Bentuk minimal order yang dibutuhkan filter/tampilan. */
export type FilterableOrder = {
  id: string;
  uid?: string;
  buyerName?: string;
  buyerEmail?: string;
  status: string;
  total: number;
  fulfillment?: string;
  payment?: {
    status?: string;
    amount?: number;
    expiresAt?: string;
    paidAt?: string;
  } | null;
  paymentMismatch?: { received?: number; expected?: number; atISO?: string } | null;
  downloadTokenId?: string;
  coupon?: { code?: string } | null;
  createdAt?: string;
  confirmationEmailStatus?: string;
  lastStatusEmailStatus?: string;
};

export type OrdersSort =
  | "date_desc"
  | "date_asc"
  | "total_desc"
  | "total_asc"
  | "status";

export type FulfillmentFilter = "semua" | "instan" | "jasa";
export type CouponFilter = "semua" | "ada" | "tanpa";
export type DatePreset =
  | "semua"
  | "hari_ini"
  | "7_hari"
  | "30_hari"
  | "bulan_ini"
  | "kustom";

export type OrdersFilter = {
  status: string; // "semua" | OrderStatus
  datePreset: DatePreset;
  from: string; // yyyy-mm-dd
  to: string; // yyyy-mm-dd
  fulfillment: FulfillmentFilter;
  paymentStatus: string; // "semua" | PaymentStatus
  coupon: CouponFilter;
  minTotal: number | null;
  maxTotal: number | null;
  attention: boolean;
  q: string;
};

export const ORDER_SORTS: readonly OrdersSort[] = [
  "date_desc",
  "date_asc",
  "total_desc",
  "total_asc",
  "status",
];

export const ORDERS_SORT_LABEL: Record<OrdersSort, string> = {
  date_desc: "Tanggal (baru → lama)",
  date_asc: "Tanggal (lama → baru)",
  total_desc: "Total (besar → kecil)",
  total_asc: "Total (kecil → besar)",
  status: "Status",
};

export function defaultFilter(): OrdersFilter {
  return {
    status: "semua",
    datePreset: "semua",
    from: "",
    to: "",
    fulfillment: "semua",
    paymentStatus: "semua",
    coupon: "semua",
    minTotal: null,
    maxTotal: null,
    attention: false,
    q: "",
  };
}

function toInt(v: string | null): number | null {
  if (v === null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

/** Bangun filter dari query string (dipakai agar filter bisa di-bookmark). */
export function parseOrdersFilter(
  params: URLSearchParams | Record<string, string | undefined>,
): OrdersFilter {
  const get = (k: string): string | null => {
    if (params instanceof URLSearchParams) return params.get(k);
    const v = params[k];
    return v === undefined ? null : v;
  };
  const oneOf = <T extends string>(v: string | null, allowed: readonly T[], dflt: T): T =>
    v && (allowed as readonly string[]).includes(v) ? (v as T) : dflt;

  return {
    status: get("status")?.trim() || "semua",
    datePreset: oneOf(
      get("datePreset"),
      ["semua", "hari_ini", "7_hari", "30_hari", "bulan_ini", "kustom"] as const,
      "semua",
    ),
    from: get("from")?.trim() ?? "",
    to: get("to")?.trim() ?? "",
    fulfillment: oneOf(
      get("fulfillment"),
      ["semua", "instan", "jasa"] as const,
      "semua",
    ),
    paymentStatus: get("paymentStatus")?.trim() || "semua",
    coupon: oneOf(get("coupon"), ["semua", "ada", "tanpa"] as const, "semua"),
    minTotal: toInt(get("minTotal")),
    maxTotal: toInt(get("maxTotal")),
    attention: get("attention") === "1",
    q: get("q")?.trim() ?? "",
  };
}

/** Serialisasi filter ke query string (kosongkan nilai default agar URL bersih). */
export function ordersFilterToParams(f: OrdersFilter): URLSearchParams {
  const p = new URLSearchParams();
  if (f.status !== "semua") p.set("status", f.status);
  if (f.datePreset !== "semua") {
    p.set("datePreset", f.datePreset);
    if (f.datePreset === "kustom") {
      if (f.from) p.set("from", f.from);
      if (f.to) p.set("to", f.to);
    }
  }
  if (f.fulfillment !== "semua") p.set("fulfillment", f.fulfillment);
  if (f.paymentStatus !== "semua") p.set("paymentStatus", f.paymentStatus);
  if (f.coupon !== "semua") p.set("coupon", f.coupon);
  if (f.minTotal !== null) p.set("minTotal", String(f.minTotal));
  if (f.maxTotal !== null) p.set("maxTotal", String(f.maxTotal));
  if (f.attention) p.set("attention", "1");
  if (f.q) p.set("q", f.q);
  return p;
}

/** apakah ada filter aktif (selain default) — untuk indikator & tombol reset. */
export function hasActiveFilter(f: OrdersFilter): boolean {
  return (
    f.status !== "semua" ||
    f.datePreset !== "semua" ||
    f.fulfillment !== "semua" ||
    f.paymentStatus !== "semua" ||
    f.coupon !== "semua" ||
    f.minTotal !== null ||
    f.maxTotal !== null ||
    f.attention ||
    f.q !== ""
  );
}

/** yyyy-mm-dd (waktu lokal) dari sebuah tanggal/ISO. */
export function localDateKey(input: Date | string): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Rentang tanggal [from, to] (yyyy-mm-dd, inklusif) untuk sebuah preset.
 * `kustom` mengembalikan `from`/`to` apa adanya. `semua` → keduanya "".
 */
export function dateRangeForPreset(
  preset: DatePreset,
  now: Date = new Date(),
  custom: { from?: string; to?: string } = {},
): { from: string; to: string } {
  const today = localDateKey(now);
  switch (preset) {
    case "hari_ini":
      return { from: today, to: today };
    case "7_hari": {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { from: localDateKey(start), to: today };
    }
    case "30_hari": {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return { from: localDateKey(start), to: today };
    }
    case "bulan_ini": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: localDateKey(start), to: today };
    }
    case "kustom":
      return { from: custom.from ?? "", to: custom.to ?? "" };
    default:
      return { from: "", to: "" };
  }
}

/**
 * Alasan "butuh perhatian" sebuah order (FASE O5). Daftar kosong = normal.
 * Ambang: JASA menunggu konfirmasi > 24 jam; menunggu bayar kedaluwarsa < 6 jam;
 * nominal kurang bayar; order instan sudah dibayar tapi belum dipenuhi; email gagal.
 */
export function attentionReasons(
  order: FilterableOrder,
  now: Date = new Date(),
): string[] {
  const reasons: string[] = [];
  const nowMs = now.getTime();

  if (
    order.fulfillment === "jasa" &&
    order.status === "menunggu_konfirmasi" &&
    order.createdAt
  ) {
    const t = Date.parse(order.createdAt);
    if (Number.isFinite(t) && nowMs - t > 24 * 60 * 60 * 1000) {
      reasons.push("jasa_menunggu");
    }
  }

  if (order.status === "menunggu_bayar" && order.payment?.expiresAt) {
    const t = Date.parse(order.payment.expiresAt);
    if (Number.isFinite(t)) {
      const left = t - nowMs;
      if (left > 0 && left < 6 * 60 * 60 * 1000) reasons.push("bayar_segera");
    }
  }

  if (order.paymentMismatch) reasons.push("kurang_bayar");

  if (
    order.fulfillment !== "jasa" &&
    order.status === "dibayar" &&
    !order.downloadTokenId
  ) {
    reasons.push("belum_dipenuhi");
  }

  if (
    order.confirmationEmailStatus === "failed" ||
    order.lastStatusEmailStatus === "failed"
  ) {
    reasons.push("email_gagal");
  }

  return reasons;
}

export const ATTENTION_LABEL: Record<string, string> = {
  jasa_menunggu: "Jasa belum dikonfirmasi > 24 jam",
  bayar_segera: "Pembayaran kedaluwarsa < 6 jam",
  kurang_bayar: "Nominal kurang bayar",
  belum_dipenuhi: "Dibayar, belum dipenuhi",
  email_gagal: "Email gagal terkirim",
};

/** Apakah order lolos seluruh filter (tanggal, status, fulfillment, dst). */
export function matchesFilter(
  order: FilterableOrder,
  f: OrdersFilter,
  now: Date = new Date(),
): boolean {
  if (f.status !== "semua" && order.status !== f.status) return false;

  if (f.fulfillment !== "semua") {
    const eff = order.fulfillment === "jasa" ? "jasa" : "instan";
    if (eff !== f.fulfillment) return false;
  }

  if (f.paymentStatus !== "semua") {
    const ps = order.payment?.status ?? "belum_bayar";
    if (ps !== f.paymentStatus) return false;
  }

  if (f.coupon === "ada" && !order.coupon?.code) return false;
  if (f.coupon === "tanpa" && order.coupon?.code) return false;

  if (f.minTotal !== null && order.total < f.minTotal) return false;
  if (f.maxTotal !== null && order.total > f.maxTotal) return false;

  if (f.attention && attentionReasons(order, now).length === 0) return false;

  if (f.datePreset !== "semua" && order.createdAt) {
    const { from, to } = dateRangeForPreset(f.datePreset, now, {
      from: f.from,
      to: f.to,
    });
    const key = localDateKey(order.createdAt);
    if (from && key && key < from) return false;
    if (to && key && key > to) return false;
  }

  if (f.q) {
    const q = f.q.toLowerCase();
    const code = order.id.slice(0, 8).toLowerCase();
    const ok =
      code.includes(q) ||
      order.id.toLowerCase().includes(q) ||
      (order.buyerEmail ?? "").toLowerCase().includes(q) ||
      (order.buyerName ?? "").toLowerCase().includes(q);
    if (!ok) return false;
  }

  return true;
}

/** Urutkan daftar order sesuai `sort` (murni — kembalikan salinan baru). */
export function sortOrders<T extends FilterableOrder>(
  orders: T[],
  sort: OrdersSort,
): T[] {
  const arr = [...orders];
  switch (sort) {
    case "date_asc":
      return arr.sort((a, b) => (a.createdAt ?? "") .localeCompare(b.createdAt ?? ""));
    case "total_desc":
      return arr.sort((a, b) => b.total - a.total);
    case "total_asc":
      return arr.sort((a, b) => a.total - b.total);
    case "status":
      return arr.sort(
        (a, b) =>
          a.status.localeCompare(b.status) ||
          (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      );
    default:
      return arr.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }
}

/** Terapkan filter + sort sekaligus (dipakai fallback memori di server). */
export function applyFilterAndSort<T extends FilterableOrder>(
  orders: T[],
  f: OrdersFilter,
  sort: OrdersSort,
  now: Date = new Date(),
): T[] {
  return sortOrders(
    orders.filter((o) => matchesFilter(o, f, now)),
    sort,
  );
}