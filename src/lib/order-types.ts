import {
  PAYMENT_STATUSES,
  type FulfillmentType,
  type OrderPayment,
  type InvoiceRecovery,
  type PaymentStatus,
} from "@/lib/payment-types";
import { coerceISODate } from "@/lib/order-time-pure";
import { ORDER_STATUS_LIST } from "@/lib/order-status-pure";
import type { PrintPricing } from "@/lib/product-types";
import { normalizePrintFinishing } from "@/lib/order-item-display";
import { normalizeInvoiceRecovery } from "@/lib/invoice-recovery-pure";
import { normalizeStockReservation, type StockReservationLine } from "@/lib/stock-pure";

// Re-export agar konsumen order cukup impor dari satu tempat.
export type { FulfillmentType, OrderPayment, InvoiceRecovery, StockReservationLine };

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
  // F-G18: `diproses` dibedakan dari `menunggu_bayar` (yang memakai amber) agar
  // "uang belum masuk" vs "sedang dikerjakan" tidak tertukar.
  diproses: "bg-indigo-50 text-indigo-600 border-indigo-100",
  // F-G18: `selesai` dibedakan dari `dibayar` (yang memakai emerald).
  selesai: "bg-teal-50 text-teal-700 border-teal-100",
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
  /** Fulfillment snapshot per item; absent on historical orders. */
  fulfillment?: FulfillmentType;
  /** Proportional share of order coupon discount, in whole Rupiah. */
  discountShare?: number;
  /** Slug varian terpilih (kosong untuk produk tunggal). */
  variantSlug?: string;
  /** Nama varian terpilih (kosong untuk produk tunggal). */
  variantName?: string;
  printOptions?: {
    widthM?: number;
    heightM?: number;
    finishingIds: string[];
  };
  /** Label finishing saat checkout; snapshot agar tetap terbaca setelah katalog berubah. */
  printFinishing?: Array<{ id: string; name: string }>;
  printPricing?: PrintPricing;
};

/** Kupon yang tercatat pada sebuah order (snapshot saat checkout). */
export type OrderCoupon = {
  code: string;
  type: "percent" | "amount" | "tiered";
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
  /**
   * URL foto profil pembeli (snapshot dari `users/{uid}.photoURL` saat checkout).
   * Kosong untuk order lama / guest — tampilan memakai fallback inisial.
   */
  buyerPhotoUrl?: string;
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
  /** Additional invoice for the service component of a mixed order. */
  servicePayment?: OrderPayment;
  invoiceRecovery?: InvoiceRecovery;
  /**
   * Catatan kurang bayar (OR-A6): nominal webhook < total order. Order tetap
   * `menunggu_bayar`; ini penanda agar admin melihatnya di panel "butuh perhatian".
   */
  paymentMismatch?: {
    received?: number;
    expected?: number;
    reason?: string;
    atISO?: string;
  };
  /** Payment webhook was rejected for evidence other than amount mismatch. */
  paymentIssue?: {
    reason?: string;
    atISO?: string;
  };
  /**
   * F-08: pembayaran masuk untuk order yang sudah TERMINAL (`dibatalkan`/
   * `kedaluwarsa`/`selesai`). Uang diterima tetapi status sengaja tidak ditimpa →
   * perlu tindakan admin (refund/manual). Ditulis oleh webhook Mayar.
   */
  paymentLate?: {
    amount?: number;
    atISO?: string;
    orderStatus?: string;
    reason?: string;
    /**
     * Sprint 5: kapan admin menandai kasus ini SELESAI (refund/manual/abaikan).
     * Selama kosong, order tetap muncul di panel "butuh perhatian".
     */
    resolvedAtISO?: string;
    resolution?: "refunded" | "handled" | "ignored";
    resolvedBy?: string;
    note?: string;
  };
  /** Jalur fulfillment: unduh, jasa, atau pickup cetak. */
  fulfillment?: FulfillmentType;
  /**
   * ID token unduhan (`downloads/{tokenId}`) yang dibuat setelah pembayaran
   * lunas (FASE P1). Dipakai untuk menampilkan link unduhan di `/akun`.
   */
  downloadTokenId?: string;
  /**
   * Stok yang DIRESERVASI (dikurangi) saat order dibuat (Sprint 2 / O-01).
   * Berisi daftar PERSIS baris yang dikurangi agar pelepasan idempoten — hanya
   * ada untuk produk dengan stok terbatas. Order lama: undefined.
   */
  stockReservation?: StockReservationLine[];
  /** Waktu reservasi stok dilepas (ISO) — penanda idempotensi pelepasan. */
  stockReleasedAtISO?: string;
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
    component: d.component === "goods" || d.component === "service" || d.component === "order" ? d.component : undefined,
    baseAmount: typeof d.baseAmount === "number" && Number.isSafeInteger(d.baseAmount) ? d.baseAmount : undefined,
    discountAmount: typeof d.discountAmount === "number" && Number.isSafeInteger(d.discountAmount) ? d.discountAmount : undefined,
    amountExpected: typeof d.amountExpected === "number" && Number.isSafeInteger(d.amountExpected) ? d.amountExpected : undefined,
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
      const rawPrintOptions = it.printOptions && typeof it.printOptions === "object"
        ? it.printOptions as Record<string, unknown>
        : null;
      return {
        slug: str(it.slug),
        name: str(it.name),
        price,
        qty,
        subtotal: num(it.subtotal) || price * qty,
        fulfillment:
          it.fulfillment === "instan" || it.fulfillment === "jasa" || it.fulfillment === "cetak"
            ? it.fulfillment
            : undefined,
        discountShare:
          typeof it.discountShare === "number" && Number.isSafeInteger(it.discountShare) && it.discountShare >= 0
            ? it.discountShare
            : undefined,
        variantSlug: str(it.variantSlug) || undefined,
        printOptions:
          rawPrintOptions
            ? {
                widthM: num(rawPrintOptions.widthM) || undefined,
                heightM: num(rawPrintOptions.heightM) || undefined,
                finishingIds: Array.isArray(rawPrintOptions.finishingIds)
                  ? rawPrintOptions.finishingIds.filter((id): id is string => typeof id === "string")
                  : [],
              }
            : undefined,
        printPricing: normalizePrintPricing(it.printPricing),
        printFinishing: normalizePrintFinishing(it.printFinishing),
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
  const servicePayment = normalizeOrderPayment(data.servicePayment);
  const invoiceRecovery: InvoiceRecovery | undefined = normalizeInvoiceRecovery(data.invoiceRecovery);
  const fulfillment =
    data.fulfillment === "instan" || data.fulfillment === "jasa" || data.fulfillment === "cetak"
      ? (data.fulfillment as FulfillmentType)
      : undefined;

  let coupon: OrderCoupon | undefined;
  if (data.coupon && typeof data.coupon === "object") {
    const c = data.coupon as Record<string, unknown>;
    const code = str(c.code);
    if (code) {
      coupon = {
        code,
        type:
          str(c.type) === "amount"
            ? "amount"
            : str(c.type) === "tiered"
              ? "tiered"
              : "percent",
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
    buyerPhotoUrl: str(data.buyerPhotoUrl) || undefined,
    items,
    subtotal,
    coupon,
    total,
status,
    payment,
    servicePayment,
    invoiceRecovery,
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
              reason: str(m.reason) || undefined,
              atISO: str(m.atISO) || undefined,
            };
          })()
        : undefined,
    paymentIssue: (() => {
      const explicitIssue = data.paymentIssue && typeof data.paymentIssue === "object"
        ? data.paymentIssue as Record<string, unknown>
        : undefined;
      const legacyMismatch = data.paymentMismatch && typeof data.paymentMismatch === "object"
        ? data.paymentMismatch as Record<string, unknown>
        : undefined;
      const issue = explicitIssue ?? (legacyMismatch &&
        str(legacyMismatch.reason) !== "amount_mismatch" &&
        !(typeof legacyMismatch.received === "number" && typeof legacyMismatch.expected === "number" &&
          legacyMismatch.received < legacyMismatch.expected)
        ? legacyMismatch
        : undefined);
      return issue
        ? { reason: str(issue.reason) || undefined, atISO: str(issue.atISO) || undefined }
        : undefined;
    })(),
    paymentLate: (() => {
      if (!data.paymentLate || typeof data.paymentLate !== "object") return undefined;
      const l = data.paymentLate as Record<string, unknown>;
      const resolution =
        l.resolution === "refunded" || l.resolution === "handled" || l.resolution === "ignored"
          ? l.resolution
          : undefined;
      return {
        amount: typeof l.amount === "number" && Number.isFinite(l.amount) ? l.amount : undefined,
        atISO: str(l.atISO) || undefined,
        orderStatus: str(l.orderStatus) || undefined,
        reason: str(l.reason) || undefined,
        resolvedAtISO: str(l.resolvedAtISO) || undefined,
        resolution,
        resolvedBy: str(l.resolvedBy) || undefined,
        note: str(l.note) || undefined,
      };
    })(),
    fulfillment,
    downloadTokenId: str(data.downloadTokenId) || undefined,
    stockReservation: normalizeStockReservation(data.stockReservation),
    stockReleasedAtISO: str(data.stockReleasedAtISO) || undefined,
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

function normalizePrintPricing(value: unknown): PrintPricing | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = value as Record<string, unknown>;
  if (data.method === "area" && Number.isFinite(Number(data.ratePerM2)) && Number(data.ratePerM2) > 0) {
    return { method: "area", ratePerM2: Number(data.ratePerM2) };
  }
  if (data.method === "sheet" && Number.isFinite(Number(data.pricePerSheet)) && Number(data.pricePerSheet) > 0) {
    return {
      method: "sheet",
      pricePerSheet: Number(data.pricePerSheet),
      description: typeof data.description === "string" ? data.description : undefined,
    };
  }
  return undefined;
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
  isPaymentExpired,
  isTransitionAllowed,
  orderCountDelta,
  shouldRestoreCoupon,
  shouldSendStatusEmail,
} from "@/lib/order-status-pure";
