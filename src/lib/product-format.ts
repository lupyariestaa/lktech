import type { Product, ProductVariant } from "@/lib/product-types";

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

/** Apakah produk punya varian/paket (multi-harga). */
export function hasVariants(product: Pick<Product, "variants">): boolean {
  return Array.isArray(product.variants) && product.variants.length > 0;
}

/** Varian termurah dari sebuah produk (untuk label "mulai dari"). */
export function cheapestVariant(
  product: Pick<Product, "variants" | "price">,
): ProductVariant | null {
  if (!hasVariants(product)) return null;
  const inStock = product.variants.filter((v) => !v.soldOut);
  const pool = inStock.length > 0 ? inStock : product.variants;
  return pool.reduce(
    (min, v) => (v.price < min.price ? v : min),
    pool[0],
  );
}

/** Varian termahal. */
export function priciestVariant(
  product: Pick<Product, "variants">,
): ProductVariant | null {
  if (!hasVariants(product)) return null;
  return product.variants.reduce(
    (max, v) => (v.price > max.price ? v : max),
    product.variants[0],
  );
}

/** Ambil varian berdasarkan slug (null bila tak ada). */
export function findVariant(
  product: Pick<Product, "variants">,
  variantSlug: string,
): ProductVariant | null {
  return product.variants.find((v) => v.slug === variantSlug) ?? null;
}

/**
 * Label harga untuk sebuah produk:
 * - Produk multi-varian dengan rentang harga → "Mulai Rp 250.000".
 * - Produk multi-varian satu harga → harga itu.
 * - Produk tunggal → harga produk.
 */
export function productPriceLabel(
  product: Pick<Product, "variants" | "price">,
): string {
  if (!hasVariants(product)) return formatPrice(product.price);

  const min = cheapestVariant(product);
  const max = priciestVariant(product);
  if (!min) return formatPrice(product.price);

  if (max && max.price > min.price) {
    return `Mulai ${formatPrice(min.price)}`;
  }
  return formatPrice(min.price);
}

/** Apakah produk (atau varian) bisa dibeli online. */
export function isPurchasable(target: {
  price: number;
  soldOut: boolean;
}): boolean {
  return target.price > 0 && !target.soldOut;
}

/**
 * Apakah produk punya minimal satu varian yang bisa dibeli.
 * Untuk produk tunggal, cek harga & stok produk.
 */
export function productIsPurchasable(
  product: Pick<Product, "variants" | "price" | "soldOut">,
): boolean {
  if (!hasVariants(product)) return isPurchasable(product);
  return product.variants.some((v) => isPurchasable(v));
}

/* -------------------------------------------------------------------------- */
/* Stok nyata (FASE P4)                                                        */
/* -------------------------------------------------------------------------- */

/** Ambang "stok menipis" agar badge "Sisa N" ditampilkan (data nyata). */
export const LOW_STOCK_THRESHOLD = 5;

/**
 * Label badge stok JUJUR (FASE P4) untuk sebuah produk/varian:
 * - `soldOut` → "Stok habis".
 * - `stock` diisi & ≤ `threshold` (default 5) → "Sisa N".
 * - Sisanya → null (tak ada badge; TIDAK menampilkan angka palsu).
 */
export function stockBadge(
  target: { soldOut: boolean; stock?: number },
  threshold = LOW_STOCK_THRESHOLD,
): { label: string; kind: "out" | "low" } | null {
  if (target.soldOut) return { label: "Stok habis", kind: "out" };
  if (
    typeof target.stock === "number" &&
    Number.isFinite(target.stock) &&
    target.stock >= 0 &&
    target.stock <= threshold
  ) {
    return { label: `Sisa ${target.stock}`, kind: "low" };
  }
  return null;
}

/**
 * Stok gabungan suatu produk (FASE P4):
 * - multi-varian → jumlah `stock` varian yang memiliki stok (stok terbatas);
 *   null bila tak ada varian yang menetapkan `stock`.
 * - tunggal → `product.stock` (bila ada).
 */
export function productTotalStock(
  product: Pick<Product, "variants" | "stock">,
): number | null {
  if (hasVariants(product)) {
    const known = product.variants.filter(
      (v) => typeof v.stock === "number" && Number.isFinite(v.stock),
    );
    if (known.length === 0) return null;
    return known.reduce((sum, v) => sum + (v.stock ?? 0), 0);
  }
  return typeof product.stock === "number" && Number.isFinite(product.stock)
    ? product.stock
    : null;
}
