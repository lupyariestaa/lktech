/**
 * Helper format produk yang aman dipakai di Client Component
 * (tidak mengimpor Firebase Admin / server-only).
 */

/** Format harga Rupiah. 0 → "Hubungi kami". */
export function formatPrice(price: number): string {
  if (!price) return "Hubungi kami";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Apakah produk bisa dibeli online.
 * Produk dengan harga 0 ("Hubungi kami") atau stok habis TIDAK bisa dibeli
 * langsung (harus lewat konsultasi WhatsApp).
 */
export function isPurchasable(product: {
  price: number;
  soldOut: boolean;
}): boolean {
  return product.price > 0 && !product.soldOut;
}

