/**
 * SPESIFIKASI METRIK PENJUALAN — satu sumber kebenaran (docs-as-code).
 *
 * Modul ini AMAN untuk klien (tanpa `server-only`) dan dipakai lintas halaman:
 * `getOrdersSummary` (Ringkasan/Pesanan), `getSalesAnalytics` (Analitik), dan
 * UI (label/tooltip/hint) agar tidak ada angka "omzet"/"tingkat selesai" yang
 * saling bertentangan tanpa penjelasan. Lihat `docs/2026-10-05-audit-email-kupon-analitik.md`
 * (temuan `XL-1`, `AN-P4`).
 *
 * === Definisi resmi ===
 *
 * 1. **Omzet (netto)** — Σ `order.total` = Σ(`subtotal` − diskon). Yang dipakai
 *    di SEMUA perhitungan omzet (Ringkasan "Omzet (selesai)", Analitik
 *    "Omzet Periode", AOV, grafik omzet harian).
 * 2. **Omzet bruto (produk)** — Σ `orderItem.subtotal` (sebelum diskon). Dipakai
 *    HANYA pada peringkat "Produk Terlaris" (per unit), dan dilabeli eksplisit
 *    sebagai *bruto* agar tidak direkonsiliasi keliru dengan omzet netto.
 * 3. **Omzet periode vs sepanjang waktu** — Ringkasan/Pesanan = sepanjang waktu
 *    (semua order `selesai`). Analitik = hanya jendela `days` terakhir.
 *    Perbedaan ini WAJIB dilabeli di UI ("sepanjang waktu" / "periode ini").
 * 4. **AOV (Average Order Value)** — omzet netto ÷ jumlah order penghasil omzet
 *    pada periode yang sama. Tidak lintas-halaman (khusus Analitik).
 * 5. **Tingkat Penyelesaian (completionRate)** — `selesai ÷ (total order dalam
 *    jendela − dibatalkan)`. Pembilang & penyebut SELALU dari jendela periode
 *    yang sama (bukan seluruh riwayat). Order `dibatalkan` dikecualikan dari
 *    penyebut karena secara operasional bukan kegagalan penyelesaian.
 * 6. **Zona waktu** — Semua bucket harian memakai zona `Asia/Jakarta` agar
 *    konsisten antara server (UTC di Vercel) & admin (WIB).
 */

/** Zona waktu resmi untuk bucket harian analitik. */
export const ANALYTICS_TIMEZONE = "Asia/Jakarta";

/** Label resmi tiap metrik (dipakai di UI agar konsisten). */
export const METRIC_LABEL = {
  /** Omzet netto sepanjang waktu (Ringkasan/Pesanan). */
  omzetAllTime: "Omzet (selesai, sepanjang waktu)",
  /** Omzet netto dalam jendela periode (Analitik). */
  omzetPeriod: "Omzet Periode",
  /** Jumlah order yang menghasilkan omzet (per mode) dalam jendela. */
  ordersRevenue: "Pesanan Penghasil Omzet",
  /** Total seluruh order dalam jendela (semua status). */
  ordersTotal: "Total Pesanan Periode",
  /** Rata-rata nilai order. */
  aov: "Rata-rata / Pesanan",
  /** Tingkat penyelesaian. */
  completion: "Tingkat Penyelesaian",
} as const;

/** Penjelasan singkat rumus metrik (untuk tooltip/hint UI). */
export const METRIC_HINT = {
  omzetAllTime:
    "Jumlah total pesanan berstatus selesai sepanjang waktu (setelah diskon).",
  omzetPeriod:
    "Jumlah total pesanan yang menghasilkan omzet pada periode ini (setelah diskon).",
  ordersRevenue:
    "Jumlah pesanan yang menghasilkan omzet pada periode ini (sesuai sumber omzet terpilih).",
  ordersTotal: "Semua pesanan pada periode ini, termasuk yang dibatalkan.",
  aov: "Omzet periode dibagi jumlah pesanan penghasil omzet.",
  completion:
    "Pesanan selesai ÷ (semua pesanan periode − dibatalkan). Dibulatkan ke persen.",
} as const;

/**
 * Hitung tingkat penyelesaian dari distribusi status DALAM JENDELA.
 * Rumus resmi: `selesai / (total − dibatalkan − kedaluwarsa)`; 0 bila penyebut ≤ 0.
 * Status `dibatalkan` & `kedaluwarsa` adalah terminal NON-penghasil (tak
 * dihitung sebagai "belum selesai"). Status antara (menunggu_bayar, dibayar,
 * menunggu_konfirmasi, diproses, baru) dihitung di penyebut karena masih
 * berpotensi selesai.
 * (Menggantikan perhitungan lama yang memakai seluruh riwayat — `AN-C1`.)
 */
export function computeCompletionRate(
  breakdown: Record<string, number>,
): number {
  const selesai = breakdown.selesai ?? 0;
  const excluded = (breakdown.dibatalkan ?? 0) + (breakdown.kedaluwarsa ?? 0);
  const total = Object.values(breakdown).reduce((n, v) => n + (v || 0), 0);
  const denominator = total - excluded;
  if (denominator <= 0) return 0;
  return selesai / denominator;
}
