/**
 * Tipe data pembayaran (safe untuk klien — tanpa dependensi server-only).
 *
 * Dipakai bersama oleh server (`@/lib/mayar`, order API) dan UI (keranjang,
 * `/akun`, admin) tanpa menarik modul server ke bundle klien.
 */

/** Metode/kanal pembayaran yang didukung gateway (ringkas). */
export const PAYMENT_METHODS = [
  "qris",
  "va",
  "ewallet",
  "retail",
  "lainnya",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Status pembayaran sebuah order (bebas dari status fulfillment/order). */
export const PAYMENT_STATUSES = [
  "belum_bayar",
  "menunggu",
  "dibayar",
  "kedaluwarsa",
  "gagal",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  belum_bayar: "Belum dibayar",
  menunggu: "Menunggu pembayaran",
  dibayar: "Dibayar",
  kedaluwarsa: "Kedaluwarsa",
  gagal: "Gagal",
};

export const PAYMENT_STATUS_STYLE: Record<PaymentStatus, string> = {
  belum_bayar: "bg-slate-100 text-slate-600 border-slate-200",
  menunggu: "bg-amber-50 text-amber-600 border-amber-100",
  dibayar: "bg-emerald-50 text-emerald-600 border-emerald-100",
  kedaluwarsa: "bg-slate-100 text-slate-500 border-slate-200",
  gagal: "bg-rose-50 text-rose-600 border-rose-100",
};

/**
 * Info pembayaran yang disimpan pada order (`order.payment`).
 * Semua waktu dalam ISO string; `amount` = nominal yang diterima (Rp).
 */
export type OrderPayment = {
  /** Nama penyedia pembayaran, mis. "mayar". */
  provider: string;
  /** Status pembayaran (lihat `PaymentStatus`). */
  status: PaymentStatus;
  /** ID invoice di sisi gateway (korelasi webhook). */
  invoiceId?: string;
  /** ID transaksi gateway (untuk audit). */
  transactionId?: string;
  /** URL halaman pembayaran yang diarahkan ke pembeli. */
  payUrl?: string;
  /** Waktu kedaluwarsa invoice (ISO). */
  expiresAt?: string;
  /** Nominal yang benar-benar diterima (Rp) — diisi saat webhook masuk. */
  amount?: number;
  /** Metode/kode kanal bila diketahui (mis. "qris", "va/bni"). */
  method?: string;
  /** Waktu pembayaran diterima (ISO). */
  paidAt?: string;
  /** Invoice dibuat manual oleh admin (FASE P2), bukan dari checkout. */
  manual?: boolean;
};

/** Jenis fulfillment order: INSTAN (unduh) atau JASA (konsultasi). */
export type FulfillmentType = "instan" | "jasa";

/**
 * Hasil pembuatan invoice Mayar (dikembalikan `createInvoice`).
 * `expiredAt` = epoch millis (sesuai respons gateway).
 */
export type CreatedInvoice = {
  invoiceId: string;
  transactionId: string;
  payUrl: string;
  expiredAt: number;
};

/** Hasil pengambilan detail invoice (subset yang dipakai sistem). */
export type InvoiceDetail = {
  invoiceId: string;
  amount: number;
  /** Status gateway mentah, mis. "paid" | "unpaid" | "closed". */
  status: string;
  payUrl?: string;
  expiredAt?: number;
};
