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

/**
 * Batas keras jumlah baris pada ekspor daftar user (Sprint 11 / ADM-15).
 *
 * Ekspor berjalan server-side dengan memanggil paginasi `listAdminUsers`
 * berulang. Cap ini menjaga memori, kuota baca, dan waktu respons. Bila
 * tersentuh, hasil ditandai `truncated` agar admin tidak mengira CSV-nya
 * lengkap.
 */
export const ADMIN_USERS_EXPORT_CAP = 5000;

/**
 * Hitung jumlah baris yang boleh diminta pada satu halaman ekspor.
 *
 * - `collected` = baris yang sudah terkumpul.
 * - `cap` = batas keras total.
 * - `maxLimit` = batas maksimum satuan halaman (`listAdminUsers` = 200).
 *
 * Mengembalikan `0` bila tidak ada sisa kuota (pemanggil berhenti).
 */
export function exportPageLimit(input: {
  collected: number;
  cap: number;
  maxLimit: number;
}): number {
  const maxLimit = Math.floor(input.maxLimit);
  if (!Number.isFinite(maxLimit) || maxLimit <= 0) return 0;
  const remaining = Math.floor(input.cap - input.collected);
  if (!Number.isFinite(remaining) || remaining <= 0) return 0;
  return Math.min(maxLimit, remaining);
}

/**
 * Tentukan apakah loop ekspor berhenti dan apakah hasil akhirnya terpotong.
 *
 * `sourceTruncated` dipakai ketika pemindaian sumber sendiri sudah dibatasi
 * (mis. pencarian substring hanya memindai 5.000 profil). Itu **tidak**
 * menghentikan paginasi — halaman berikutnya mungkin masih berisi kecocokan
 * dalam jendela yang dipindai — tetapi hasil akhir harus jujur menyatakan
 * `truncated`.
 */
export function nextExportStep(input: {
  collected: number;
  added: number;
  hasMore: boolean;
  sourceTruncated: boolean;
  cap: number;
}): { done: boolean; truncated: boolean } {
  const total = input.collected + input.added;
  if (total >= input.cap) {
    // Cap tepat habis bersama sumber = lengkap (kecuali sumber sendiri
    // terpotong); masih ada halaman/kelebihan = terpotong.
    return {
      done: true,
      truncated: input.sourceTruncated || input.hasMore || total > input.cap,
    };
  }
  if (!input.hasMore) {
    return { done: true, truncated: input.sourceTruncated };
  }
  return { done: false, truncated: input.sourceTruncated };
}
