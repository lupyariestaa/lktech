/** Satu stok terbatas pada produk atau variannya. */
export type LowStockItem = {
  productSlug: string;
  productName: string;
  variantSlug?: string;
  variantName?: string;
  stock: number;
  soldOut: boolean;
};

/** Subset bentuk produk yang diperlukan; sengaja tidak mengimpor modul aplikasi. */
export type LowStockProduct = {
  slug: string;
  name: string;
  active: boolean;
  stock?: number;
  soldOut: boolean;
  variants: Array<{
    slug: string;
    name: string;
    stock?: number;
    soldOut: boolean;
  }>;
};

/**
 * Susun alert untuk stok terbatas yang tersisa <= ambang.
 * Stok undefined/non-finite berarti tak dibatasi/tidak diketahui dan diabaikan.
 * Produk nonaktif diabaikan; stok nol dan flag soldOut tetap muncul.
 */
export function findLowStock(
  products: readonly LowStockProduct[],
  threshold = 5,
): LowStockItem[] {
  const limit = Number.isFinite(threshold) ? Math.max(0, Math.floor(threshold)) : 5;
  const result: LowStockItem[] = [];

  for (const product of products) {
    if (!product.active) continue;

    if (product.variants.length > 0) {
      for (const variant of product.variants) {
        const hasStock = typeof variant.stock === "number" && Number.isFinite(variant.stock);
        if (!hasStock && !variant.soldOut) continue;
        const stock = hasStock ? Math.max(0, Math.floor(variant.stock!)) : 0;
        if (stock <= limit || variant.soldOut) {
          result.push({
            productSlug: product.slug,
            productName: product.name,
            variantSlug: variant.slug,
            variantName: variant.name,
            stock,
            soldOut: variant.soldOut || stock === 0,
          });
        }
      }
      continue;
    }

    const hasStock = typeof product.stock === "number" && Number.isFinite(product.stock);
    if (!hasStock && !product.soldOut) continue;
    const stock = hasStock ? Math.max(0, Math.floor(product.stock!)) : 0;
    if (stock <= limit || product.soldOut) {
      result.push({
        productSlug: product.slug,
        productName: product.name,
        stock,
        soldOut: product.soldOut || stock === 0,
      });
    }
  }

  return result.sort(
    (a, b) => Number(b.soldOut) - Number(a.soldOut) || a.stock - b.stock ||
      a.productName.localeCompare(b.productName) ||
      (a.variantName ?? "").localeCompare(b.variantName ?? ""),
  );
}
