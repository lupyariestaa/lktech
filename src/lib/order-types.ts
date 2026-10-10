import {
  PAYMENT_STATUSES,
  type FulfillmentType,
  type OrderPayment,
  type PaymentStatus,
} from "@/lib/payment-types";
import { coerceISODate } from "@/lib/order-time-pure";
import { ORDER_STATUS_LIST } from "@/lib/order-status-pure";

// Re-export agar konsumen order cukup impor dari satu tempat.
export type { FulfillmentType, OrderPayment };

/**
 * STATUS pesanan (OR-E3): diturunkan dari daftar kanonik di `order-status-pure`
 * agar tidak ada duplikasi definisi yang bisa drift.
 *
 * - **JASA**: `baru` → `menunggu_konfirmasi` → `diproses` → `selesai`.
 * - **INSTAN**: `baru` → `menunggu_bayar` → `dibayar` → (`diproses`/`selesai`).
 * - `menunggu_bayar` → `kedaluwarsa` (otomatis). `*` → `dibatalkan`.
 *
 * Status lama (`baru|diproses|selesai|dibatalkan`) tetap valid untuk order
 * yang dibuat sebelum fitur pembayaran online (backward-compatible).
 */
export const ORDER_STATUSES = ORDER_STATUS_LIST;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Label tampilan status pesanan. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  baru: "Baru",
  menunggu_bayar: "Menunggu Bayar",
  dibayar: "Dibayar",
  menunggu_konfirmasi: "Menunggu Konfirmasi",
  diproses: "Diproses",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
  kedaluwarsa: "Kedaluwarsa",
};

/** Kelas badge status pesanan (konsisten dengan pola lead). */
export const ORDER_STATUS_STYLE: Record<OrderStatus, string> = {
  baru: "bg-blue-50 text-blue-600 border-blue-100",
  menunggu_bayar: "bg-amber-50 text-amber-600 border-amber-100",
  dibayar: "bg-emerald-50 text-emerald-600 border-emerald-100",
  menunggu_konfirmasi: "bg-purple-50 text-purple-600 border-purple-100",
  diproses: "bg-amber-50 text-amber-600 border-amber-100",
  selesai: "bg-emerald-50 text-emerald-600 border-emerald-100",
  dibatalkan: "bg-slate-100 text-slate-500 border-slate-200",
  kedaluwarsa: "bg-slate-100 text-slate-500 border-slate-200",
};

/**
 * Status yang menandakan order "menunggu bayar" (bukan uang/klaim final).
 * Dipakai untuk gating alur pembayaran & kalkulasi kedaluwarsa.
 * (Sebelumnya berupa array `PENDING_PAYMENT_STATUSES`; kini cukup konstanta
 * tunggal agar tidak ada ekspor mati.)
 */
export const PENDING_PAYMENT_STATUS: OrderStatus = "menunggu_bayar";

/** Satu item pesanan dengan harga yang SUDAH diverifikasi server. */
export type OrderItem = {
  slug: string;
  name: string;
  /** Harga satuan (Rupiah) saat order dibuat — dari server, bukan klien. */
  price: number;
  qty: number;
  /** Subtotal = price * qty. */
  subtotal: number;
  /** Slug varian terpilih (kosong untuk produk tunggal). */
  variantSlug?: string;
  /** Nama varian terpilih (kosong untuk produk tunggal). */
  variantName?: string;
};

/** Kupon yang tercatat pada sebuah order (snapshot saat checkout). */
export type OrderCoupon = {
  code: string;
  type: "percent" | "amount";
  /** Jumlah diskon (Rupiah) yang diterapkan. */
  discount: number;
  /**
   * ID dokumen kupon (`coupons/{id}`) saat checkout — dipakai untuk
   * mengembalikan kuota bila order dibatalkan/dihapus (KP-C2) & audit.
   * Opsional untuk order lama yang dibuat sebelum field ini ada.
   */
  couponId?: string;
};

/** Pesanan tersimpan di Firestore (`orders/{id}`). */
export type Order = {
  id: string;
  uid: string;
  buyerName: string;
  buyerEmail: string;
  items: OrderItem[];
  /** Subtotal sebelum diskon (Rp). Untuk order lama: = `total`. */
  subtotal: number;
  /** Kupon yang dipakai (bila ada). */
  coupon?: OrderCoupon;
  /** Total akhir = subtotal − diskon. */
  total: number;
  status: OrderStatus;
/** Info pembayaran online (bila ada). Order lama: undefined. */
  payment?: OrderPayment;
  /**
   * Catatan kurang bayar (OR-A6): nominal webhook < total order. Order tetap
   * `menunggu_bayar`; ini penanda agar admin melihatnya di panel "butuh perhatian".
   */
  paymentMismatch?: {
    received?: number;
    expected?: number;
    atISO?: string;
  };
  /** Jalur fulfillment: "instan" (unduh) atau "jasa" (konsultasi). */
  fulfillment?: FulfillmentType;
  /**
   * ID token unduhan (`downloads/{tokenId}`) yang dibuat setelah pembayaran
   * lunas (FASE P1). Dipakai untuk menampilkan link unduhan di `/akun`.
   */
  downloadTokenId?: string;
  /** Nomor WhatsApp tujuan checkout (dari settings situs). */
  whatsapp: string;
  /** Pesan WhatsApp kanonik yang dikirim ke admin (untuk audit/ulang kirim). */
  message: string;
  createdAt: string;
  /* ---- Observability email transaksional (`EM-C2`) ---- */
  /** Waktu email konfirmasi terakhir dicoba/dikirim (ISO). */
  confirmationEmailAt?: string;
  /** Status kirim email konfirmasi: sent | skipped | failed. */
  confirmationEmailStatus?: string;
  /** Waktu email update status terakhir dicoba/dikirim (ISO). */
  lastStatusEmailAt?: string;
  /** Status kirim email update status: sent | skipped | failed. */
  lastStatusEmailStatus?: string;
  /** Status pesanan terakhir yang sudah dinotifikasi ke pembeli (`EM-C3`). */
  lastNotifiedStatus?: OrderStatus;
};

/** Membangun objek `OrderPayment` yang aman dari data mentah Firestore. */
export function normalizeOrderPayment(v: unknown): OrderPayment | undefined {
  if (!v || typeof v !== "object") return undefined;
  const d = v as Record<string, unknown>;
  const provider = str(d.provider);
  if (!provider) return undefined;
  const status = (PAYMENT_STATUSES as readonly string[]).includes(str(d.status))
    ? (d.status as PaymentStatus)
    : "belum_bayar";
  return {
    provider,
    status,
    invoiceId: str(d.invoiceId) || undefined,
    transactionId: str(d.transactionId) || undefined,
    payUrl: str(d.payUrl) || undefined,
    expiresAt: str(d.expiresAt) || undefined,
    amount: typeof d.amount === "number" && Number.isFinite(d.amount) ? d.amount : undefined,
    method: str(d.method) || undefined,
    paidAt: str(d.paidAt) || undefined,
    manual: d.manual === true ? true : undefined,
  };
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0;
}

/** Menormalkan data order mentah (dari Firestore) menjadi `Order`. */
export function normalizeOrder(data: Record<string, unknown>): Order {
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items: OrderItem[] = rawItems
    .filter((it): it is Record<string, unknown> => Boolean(it && typeof it === "object"))
    .map((it) => {
      const price = num(it.price);
      const qty = Math.max(1, Math.floor(num(it.qty)));
      return {
        slug: str(it.slug),
        name: str(it.name),
        price,
        qty,
        subtotal: num(it.subtotal) || price * qty,
        variantSlug: str(it.variantSlug) || undefined,
        variantName: str(it.variantName) || undefined,
      };
    });

  const status = (ORDER_STATUSES as readonly string[]).includes(str(data.status))
    ? (data.status as OrderStatus)
    : "baru";

  const total = num(data.total);
  // OR-B6: pakai nilai `subtotal` bila memang ada (number valid), else fallback
  // ke `total` (order lama). Menghindari `||` yang menutupi subtotal 0 valid.
  const subtotal =
    typeof data.subtotal === "number" && Number.isFinite(data.subtotal)
      ? data.subtotal
      : total;

  const payment = normalizeOrderPayment(data.payment);
  const fulfillment =
    data.fulfillment === "instan" || data.fulfillment === "jasa"
      ? (data.fulfillment as FulfillmentType)
      : undefined;

  let coupon: OrderCoupon | undefined;
  if (data.coupon && typeof data.coupon === "object") {
    const c = data.coupon as Record<string, unknown>;
    const code = str(c.code);
    if (code) {
      coupon = {
        code,
        type: str(c.type) === "amount" ? "amount" : "percent",
        discount: num(c.discount),
        couponId: str(c.couponId) || undefined,
      };
    }
  }

  return {
    id: str(data.id),
    uid: str(data.uid),
    buyerName: str(data.buyerName),
    buyerEmail: str(data.buyerEmail),
    items,
    subtotal,
    coupon,
    total,
status,
    payment,
    paymentMismatch:
      data.paymentMismatch && typeof data.paymentMismatch === "object"
        ? (() => {
            const m = data.paymentMismatch as Record<string, unknown>;
            return {
              received:
                typeof m.received === "number" && Number.isFinite(m.received)
                  ? m.received
                  : undefined,
              expected:
                typeof m.expected === "number" && Number.isFinite(m.expected)
                  ? m.expected
                  : undefined,
              atISO: str(m.atISO) || undefined,
            };
          })()
        : undefined,
    fulfillment,
    downloadTokenId: str(data.downloadTokenId) || undefined,
    whatsapp: str(data.whatsapp),
    message: str(data.message),
    createdAt:
      coerceISODate(data.createdAtISO) || coerceISODate(data.createdAt),
    confirmationEmailAt: str(data.confirmationEmailAt) || undefined,
    confirmationEmailStatus: str(data.confirmationEmailStatus) || undefined,
    lastStatusEmailAt: str(data.lastStatusEmailAt) || undefined,
    lastStatusEmailStatus: str(data.lastStatusEmailStatus) || undefined,
    lastNotifiedStatus: (ORDER_STATUSES as readonly string[]).includes(
      str(data.lastNotifiedStatus),
    )
      ? (data.lastNotifiedStatus as OrderStatus)
      : undefined,
  };
}

// Logika kedaluwarsa dipindah ke modul murni (bebas impor runtime) agar dapat
// diuji Node tanpa resolver alias — lihat `@/lib/order-expiry-pure`.
export { isOrderExpired, DEFAULT_EXPIRY_TTL_MS } from "@/lib/order-expiry-pure";

// Predikat status (murni) juga di-reekspor agar konsumen order cukup impor dari
// satu tempat. Lihat `@/lib/order-status-pure`.
export {
  isPaidStatus,
  isTerminalStatus,
  isPayableStatus,
  isAwaitingPayment,
  isTransitionAllowed,
  shouldRestoreCoupon,
  shouldSendStatusEmail,
} from "@/lib/order-status-pure";

