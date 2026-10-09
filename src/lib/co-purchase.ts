/**
 * Logika murni "sering dibeli bersama" (BR-1). Tanpa Firestore, tanpa alias "@/".
 * Input: daftar slug produk per pesanan. Set unik per pesanan (K3), sehingga satu
 * pesanan yang memuat produk sama dua kali tidak dihitung ganda.
 */

/** Status pesanan yang dihitung sebagai bukti pembelian (K2). */
export const CO_PURCHASE_STATUSES = ["dibayar", "diproses", "selesai"] as const;

/** Ambang minimum jumlah pesanan bersama (K4). */
export const CO_PURCHASE_MIN = 2;

/** Peta: slug A → (slug B → jumlah pesanan yang memuat A dan B). */
export type CoPurchaseMap = Map<string, Map<string, number>>;

/** Bangun peta pasangan dari daftar slug per pesanan (K3: set unik per pesanan). */
export function coPurchasePairs(orders: string[][]): CoPurchaseMap {
  const map: CoPurchaseMap = new Map();
  for (const order of orders) {
    const unique = Array.from(new Set(order.filter((s) => typeof s === "string" && s)));
    for (const a of unique) {
      for (const b of unique) {
        if (a === b) continue;
        let row = map.get(a);
        if (!row) {
          row = new Map();
          map.set(a, row);
        }
        row.set(b, (row.get(b) ?? 0) + 1);
      }
    }
  }
  return map;
}

/**
 * Ranking rekomendasi untuk `productSlug`: slug pasangan dengan jumlah ≥ `minCount`,
 * diurutkan menurun berdasarkan jumlah (seri → urutan abjad agar deterministik).
 * `productSlug` sendiri tidak pernah ikut.
 */
export function rankCoPurchases(
  productSlug: string,
  pairs: CoPurchaseMap,
  minCount = CO_PURCHASE_MIN,
): string[] {
  const row = pairs.get(productSlug);
  if (!row) return [];
  return Array.from(row.entries())
    .filter(([slug, count]) => slug !== productSlug && count >= minCount)
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .map(([slug]) => slug);
}

/** Pesanan memenuhi syarat dihitung (K2)? */
export function isCoPurchaseStatus(status: unknown): boolean {
  return typeof status === "string" && (CO_PURCHASE_STATUSES as readonly string[]).includes(status);
}
