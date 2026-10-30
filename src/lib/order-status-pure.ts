/**
 * Logika MURNI transisi & klasifikasi status order (FASE P6) — bebas impor
 * runtime agar dapat diuji Node tanpa alias resolver.
 *
 * Melengkapi `order-types.ts` (yang berisi konstanta/label) dengan predikat
 * yang dipakai lintas alur: restore kupon, status final, status dibayar.
 */

/**
 * Daftar status ORDER kanonik (OR-E3) — SATU sumber kebenaran. `order-types.ts`
 * menurunkan `ORDER_STATUSES` dari sini agar tidak ada duplikasi yang bisa drift.
 */
export const ORDER_STATUS_LIST = [
  "baru",
  "menunggu_bayar",
  "dibayar",
  "menunggu_konfirmasi",
  "diproses",
  "selesai",
  "dibatalkan",
  "kedaluwarsa",
] as const;

/** Nama status order (turunan dari daftar kanonik). */
export type OrderStatusName = (typeof ORDER_STATUS_LIST)[number];

/** Status yang menandakan order SUDAH dibayar (uang masuk). */
export const PAID_STATUSES: readonly OrderStatusName[] = [
  "dibayar",
  "diproses",
  "selesai",
];

/**
 * Status FINAL/terminal: tidak lagi berpotensi menghasilkan pesanan baru.
 * - `dibatalkan` (manual), `kedaluwarsa` (auto), `selesai` (tuntas).
 */
export const TERMINAL_STATUSES: readonly OrderStatusName[] = [
  "dibatalkan",
  "kedaluwarsa",
  "selesai",
];

/**
 * Transisi yang WAJIB mengembalikan kuota kupon (`KP-C2`): ke `dibatalkan`
 * atau `kedaluwarsa` — terminal NON-penghasil yang membatalkan komitmen.
 */
export const RESTORE_COUPON_STATUSES: readonly OrderStatusName[] = [
  "dibatalkan",
  "kedaluwarsa",
];

/**
 * Status yang BOLEH menerima pembayaran (INVARIAN UANG).
 *
 * Pembayaran hanya sah untuk order yang masih menunggu uang: `baru` (order lama)
 * atau `menunggu_bayar` (INSTAN) atau `menunggu_konfirmasi` (JASA ber-invoice
 * manual). Order yang sudah `dibayar`/`diproses`/`selesai` (uang sudah diterima),
 * `dibatalkan`, atau `kedaluwarsa` TIDAK boleh ditandai lunas lagi.
 *
 * Ini mencegah "late payment" menimpa status terminal (mis. cron kedaluwarsa
 * sudah mengembalikan kuota kupon lalu webhook telat menandai lunas → kupon bocor).
 */
export const PAYABLE_STATUSES: readonly OrderStatusName[] = [
  "baru",
  "menunggu_bayar",
  "menunggu_konfirmasi",
];

/** Apakah order sudah dibayar. */
export function isPaidStatus(status: string): boolean {
  return (PAID_STATUSES as readonly string[]).includes(status);
}

/** Apakah status bersifat final/terminal (tanpa potensi lanjut). */
export function isTerminalStatus(status: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

/** Apakah order boleh menerima pembayaran (invariant uang). */
export function isPayableStatus(status: string): boolean {
  return (PAYABLE_STATUSES as readonly string[]).includes(status);
}

/**
 * Perubahan `orderCount` user saat status order berpindah dari `previous` ke
 * `next` (Sprint 3 / O-02).
 *
 * Sejak Sprint 3, `orderCount` = jumlah order yang **PERNAH LUNAS** — sumber
 * `isFirstPurchase` untuk kupon audience (`baru`/`lama`). Bukan lagi jumlah
 * checkout, sehingga keranjang yang ditinggalkan tak lagi menghanguskan hak
 * "pelanggan baru".
 *
 * - masuk status lunas (`dibayar`/`diproses`/`selesai`) → `+1`
 * - keluar dari status lunas (mis. `dibayar → dibatalkan`) → `-1`
 * - sisanya (termasuk antar-status lunas) → `0`
 */
export function orderCountDelta(previous: string, next: string): number {
  if (previous === next) return 0;
  const wasPaid = isPaidStatus(previous);
  const nowPaid = isPaidStatus(next);
  if (!wasPaid && nowPaid) return 1;
  if (wasPaid && !nowPaid) return -1;
  return 0;
}

/**
 * Apakah transisi DARI `previous` KE `next` harus mengembalikan kuota kupon.
 * Benar hanya bila: status berubah, `next` termasuk `RESTORE_COUPON_STATUSES`,
 * dan order sebelumnya BELUM final (hindari restore ganda).
 */
export function shouldRestoreCoupon(
  previous: string,
  next: string,
): boolean {
  if (previous === next) return false;
  if (!(RESTORE_COUPON_STATUSES as readonly string[]).includes(next)) return false;
  return !isTerminalStatus(previous);
}

/**
 * Apakah transisi DARI `previous` KE `next` memicu EMAIL status (hindari
 * email ganda untuk status sama — `EM-C3`). `baru` tak pernah memicu.
 */
export function shouldSendStatusEmail(previous: string, next: string): boolean {
  if (previous === next) return false;
  if (next === "baru") return false;
  return true;
}

/* -------------------------------------------------------------------------- */
/* Matriks transisi status (OR-A3)                                             */
/* -------------------------------------------------------------------------- */

/**
 * Transisi status yang DIIZINKAN (dari → daftar tujuan). Tujuan transisi selalu
 * mencakup status saat ini (no-op) agar perubahan "ke status yang sama" aman.
 *
 * Aturan:
 * - `baru` (order lama): → `menunggu_bayar`, `menunggu_konfirmasi`, `diproses`,
 *   `selesai`, `dibatalkan`.
 * - `menunggu_bayar` (INSTAN belum bayar): → `dibayar`, `dibatalkan`,
 *   `kedaluwarsa`. (Boleh mundur ke `baru`? tidak — hindari loop.)
 * - `menunggu_konfirmasi` (JASA): → `dibayar`, `diproses`, `selesai`,
 *   `dibatalkan`.
 * - `dibayar`: → `diproses`, `selesai`, `dibatalkan`.
 * - `diproses`: → `selesai`, `dibatalkan`.
 * - `selesai` / `dibatalkan` / `kedaluwarsa`: TERMINAL → tidak boleh berubah lagi
 *   (hanya no-op). Bila admin butuh memperbaiki, gunakan alur khusus (belum ada).
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatusName, readonly OrderStatusName[]> = {
  baru: [
    "baru",
    "menunggu_bayar",
    "menunggu_konfirmasi",
    "diproses",
    "selesai",
    "dibatalkan",
  ],
  menunggu_bayar: ["menunggu_bayar", "dibayar", "dibatalkan", "kedaluwarsa"],
  menunggu_konfirmasi: [
    "menunggu_konfirmasi",
    "dibayar",
    "diproses",
    "selesai",
    "dibatalkan",
  ],
  dibayar: ["dibayar", "diproses", "selesai", "dibatalkan"],
  diproses: ["diproses", "selesai", "dibatalkan"],
  selesai: ["selesai"],
  dibatalkan: ["dibatalkan"],
  kedaluwarsa: ["kedaluwarsa"],
};

/**
 * Apakah transisi DARI `previous` KE `next` diizinkan oleh matriks.
 * Transisi "ke status yang sama" (no-op) selalu diizinkan.
 */
export function isTransitionAllowed(previous: string, next: string): boolean {
  if (previous === next) return true;
  const allowed = ALLOWED_TRANSITIONS[previous as OrderStatusName];
  if (!allowed) return false;
  return (allowed as readonly string[]).includes(next);
}

/** Pure decision for callers that need to distinguish a no-op from a conflict. */
export function evaluateStatusTransition(
  previous: string,
  next: string,
): "unchanged" | "allowed" | "invalid" {
  if (previous === next) return "unchanged";
  return isTransitionAllowed(previous, next) ? "allowed" : "invalid";
}

/* -------------------------------------------------------------------------- */
/* Predikat tampilan pembayaran (OR-B2)                                        */
/* -------------------------------------------------------------------------- */

/**
 * Status order yang MASIH boleh dibayar (dipakai untuk menampilkan tombol
 * "Bayar sekarang"). Sama dengan alur `PAYABLE_STATUSES`, TAPI untuk tampilan
 * juga memperbolehkan `menunggu_konfirmasi` (JASA ber-invoice manual).
 */
export const AWAITING_PAYMENT_STATUSES: readonly OrderStatusName[] = [
  "baru",
  "menunggu_bayar",
  "menunggu_konfirmasi",
];

/**
 * Apakah `expiresAt` (ISO) sudah LEWAT pada `now`. Nilai kosong/tidak valid →
 * `false` (jangan menyembunyikan tombol hanya karena data waktu rusak).
 */
export function isPaymentExpired(
  expiresAt: string | undefined,
  now: Date = new Date(),
): boolean {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  return Number.isFinite(t) && t <= now.getTime();
}

/**
 * Apakah order layak menampilkan tombol "Bayar sekarang": punya `payUrl`,
 * pembayaran belum lunas, BELUM lewat `expiresAt`, dan status order masih
 * memungkinkan pembayaran.
 * Satu sumber kebenaran (klien & server) agar tidak ada tombol bayar "hantu"
 * pada order yang sudah dibatalkan/kedaluwarsa/selesai atau invoice yang mati.
 */
export function isAwaitingPayment(
  order: {
    status: string;
    payment?: { status?: string; payUrl?: string; expiresAt?: string } | null;
  },
  now: Date = new Date(),
): boolean {
  const payUrl = order.payment?.payUrl;
  if (!payUrl) return false;
  if (order.payment?.status === "dibayar") return false;
  if (isPaymentExpired(order.payment?.expiresAt, now)) return false;
  return (AWAITING_PAYMENT_STATUSES as readonly string[]).includes(order.status);
}
