/**
 * Logika MURNI alert wishlist (Tema 2.4, FASE R3).
 * Bebas impor runtime agar dapat diuji Node tanpa alias resolver.
 */

/** Snapshot harga/stok produk untuk perbandingan alert. */
export type ProductSnapshot = {
  slug: string;
  price: number;
  originalPrice?: number;
  soldOut?: boolean;
  stock?: number;
};

/** Keadaan tersimpan sebelumnya (per produk) untuk deteksi perubahan. */
export type ProductState = {
  price: number;
  soldOut: boolean;
  stock?: number;
};

/** Jenis alert. */
export type WishlistAlertType = "price_drop" | "back_in_stock";

export type WishlistAlert = {
  slug: string;
  type: WishlistAlertType;
  oldPrice: number;
  newPrice: number;
};

/**
 * Bandingkan snapshot produk sekarang dengan keadaan tersimpan, hasilkan alert:
 * - `price_drop`: harga turun dibanding simpanan (dan > 0).
 * - `back_in_stock`: sebelumnya habis/soldOut (atau stok 0), sekarang tersedia.
 *
 * Murni & deterministik. `prev` null → tidak ada alert (pertama kali disimpan).
 */
export function diffProductAlerts(
  current: ProductSnapshot,
  prev: ProductState | null,
): WishlistAlert[] {
  if (!prev) return [];
  const alerts: WishlistAlert[] = [];

  const nowAvailable =
    !current.soldOut && (current.stock === undefined || current.stock > 0);
  const wasAvailable = !prev.soldOut && (prev.stock === undefined || prev.stock > 0);

  if (nowAvailable && !wasAvailable) {
    alerts.push({
      slug: current.slug,
      type: "back_in_stock",
      oldPrice: prev.price,
      newPrice: current.price,
    });
  } else if (
    nowAvailable &&
    wasAvailable &&
    Number.isFinite(current.price) &&
    Number.isFinite(prev.price) &&
    current.price < prev.price &&
    current.price > 0
  ) {
    alerts.push({
      slug: current.slug,
      type: "price_drop",
      oldPrice: prev.price,
      newPrice: current.price,
    });
  }

  return alerts;
}

/** Snapshot keadaan saat ini untuk disimpan. */
export function toProductState(snap: ProductSnapshot): ProductState {
  return { price: snap.price, soldOut: Boolean(snap.soldOut), stock: snap.stock };
}

/** Apakah alert masih dalam cooldown (hindari spam). */
export function inCooldown(
  lastSentISO: string | undefined,
  now: Date,
  cooldownHours = 72,
): boolean {
  if (!lastSentISO) return false;
  const t = new Date(lastSentISO).getTime();
  if (!Number.isFinite(t)) return false;
  return now.getTime() - t < cooldownHours * 3_600_000;
}
