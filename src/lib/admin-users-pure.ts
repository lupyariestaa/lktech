/**
 * Salinan status berbayar resmi dari `metrics-spec`. Modul ini sengaja
 * mandiri agar bisa diimpor langsung `node --test` tanpa resolver alias Next;
 * regresi kesamaan daftar dijaga oleh `scripts/admin-users.test.ts`.
 */
export const ADMIN_PAID_ORDER_STATUSES = [
  "dibayar",
  "diproses",
  "selesai",
] as const;

/**
 * Agregasi pesanan untuk daftar user admin.
 *
 * `all*` menghitung seluruh riwayat untuk konteks, sedangkan `paid*` hanya
 * status yang benar-benar menghasilkan uang. Sumber status resmi ada di
 * `metrics-spec` agar angka user konsisten dengan dashboard/analitik.
 */
export type AdminOrderAggregate = {
  allCount: number;
  allTotal: number;
  paidCount: number;
  paidTotal: number;
};

export function emptyOrderAggregate(): AdminOrderAggregate {
  return { allCount: 0, allTotal: 0, paidCount: 0, paidTotal: 0 };
}

/** Status order yang dianggap sudah dibayar (uang masuk). */
export function isPaidOrderStatus(status: unknown): boolean {
  return (
    typeof status === "string" &&
    (ADMIN_PAID_ORDER_STATUSES as readonly string[]).includes(status)
  );
}

/**
 * Tambahkan satu order ke agregat. Nilai total yang tidak valid dianggap 0,
 * tetapi order tetap dihitung untuk transparansi jumlah.
 */
export function addOrderToAggregate(
  agg: AdminOrderAggregate,
  status: unknown,
  total: unknown,
): void {
  const amount =
    typeof total === "number" && Number.isFinite(total) ? total : 0;
  agg.allCount += 1;
  agg.allTotal += amount;
  if (isPaidOrderStatus(status)) {
    agg.paidCount += 1;
    agg.paidTotal += amount;
  }
}
