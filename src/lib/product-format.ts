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

/**
 * Apakah produk (atau varian) bisa dibeli online.
 * Stok dianggap mengikat bila diisi (`stock ≤ 0` → habis) — GAP-P4-1.
 */
export function isPurchasable(target: {
  price: number;
  soldOut: boolean;
  stock?: number;
}): boolean {
  return target.price > 0 && !isStockOut(target);
}

/**
 * Apakah produk punya minimal satu varian yang bisa dibeli.
 * Untuk produk tunggal, cek harga & stok produk.
 */
export function productIsPurchasable(
  product: Pick<Product, "variants" | "price" | "soldOut" | "stock">,
): boolean {
  if (!hasVariants(product)) return isPurchasable(product);
  return product.variants.some((v) => isPurchasable(v));
}

/* -------------------------------------------------------------------------- */
/* Evaluasi kelayakan beli TERPUSAT (OR-B4/B5)                                 */
/* -------------------------------------------------------------------------- */

/** Kode alasan item tidak bisa dibeli (dipakai server untuk respons jelas). */
export type PurchaseIssueCode =
  | "product_inactive"
  | "variant_required"
  | "variant_not_found"
  | "soldout"
  | "out_of_stock"
  | "insufficient_stock"
  | "no_price";

/** Hasil evaluasi kelayakan beli satu item. */
export type PurchaseEvaluation =
  | { ok: true; price: number; variantSlug?: string; variantName?: string }
  | { ok: false; code: PurchaseIssueCode; message: string };

type EvaluatableVariant = Pick<
  ProductVariant,
  "slug" | "name" | "price" | "soldOut" | "stock"
>;

type EvaluatableProduct = Pick<
  Product,
  "slug" | "name" | "price" | "soldOut" | "stock" | "active"
> & {
  variants: EvaluatableVariant[];
};

/**
 * Evaluasi kelayakan satu item keranjang (produk + varian opsional + qty).
 * Satu sumber kebenaran untuk aturan "boleh dibeli" — dipakai server checkout
 * agar aturan tidak tersebar & konsisten. Mengembalikan harga final (terverifikasi
 * dari produk/varian, bukan klien) atau kode alasan yang spesifik.
 *
 * Aturan (seragam produk tunggal & multi-varian):
 * - Produk nonaktif → `product_inactive`.
 * - Produk multi-varian: wajib pilih varian; varian harus ada.
 * - `soldOut` (produk ATAU varian) → `soldout`.
 * - `stock` diisi & ≤ 0 → `out_of_stock`.
 * - qty melebihi stok (bila stok diisi) → `insufficient_stock`.
 * - harga ≤ 0 → `no_price`.
 */
export function evaluatePurchase(
  product: EvaluatableProduct,
  opts: { variantSlug?: string | null; qty: number },
): PurchaseEvaluation {
  if (!product.active) {
    return { ok: false, code: "product_inactive", message: `Produk "${product.name}" sudah tidak dijual.` };
  }

  const qty = Math.max(1, Math.floor(opts.qty));

  // ===== Multi-varian =====
  if (product.variants.length > 0) {
    const variantSlug = opts.variantSlug?.trim();
    if (!variantSlug) {
      return { ok: false, code: "variant_required", message: `Pilih paket untuk "${product.name}" sebelum checkout.` };
    }
    const variant = product.variants.find((v) => v.slug === variantSlug);
    if (!variant) {
      return { ok: false, code: "variant_not_found", message: "Paket yang dipilih tidak ditemukan. Muat ulang halaman." };
    }
    if (variant.soldOut || product.soldOut) {
      return { ok: false, code: "soldout", message: `Paket "${variant.name}" sedang tidak tersedia.` };
    }
    if (isStockOut(variant) || isStockOut(product)) {
      return { ok: false, code: "out_of_stock", message: `Paket "${variant.name}" sedang stok habis.` };
    }
    const left = effectiveStock(variant);
    if (left !== null && qty > left) {
      return { ok: false, code: "insufficient_stock", message: `Stok paket "${variant.name}" tersisa ${left}. Silakan kurangi jumlah.` };
    }
    if (variant.price <= 0) {
      return { ok: false, code: "no_price", message: `Paket "${variant.name}" belum bisa dipesan online.` };
    }
    return { ok: true, price: variant.price, variantSlug: variant.slug, variantName: variant.name };
  }

  // ===== Produk tunggal =====
  if (product.soldOut) {
    return { ok: false, code: "soldout", message: `Produk "${product.name}" sedang stok habis.` };
  }
  if (isStockOut(product)) {
    return { ok: false, code: "out_of_stock", message: `Produk "${product.name}" sedang stok habis.` };
  }
  const left = effectiveStock(product);
  if (left !== null && qty > left) {
    return { ok: false, code: "insufficient_stock", message: `Stok "${product.name}" tersisa ${left}. Silakan kurangi jumlah.` };
  }
  if (product.price <= 0) {
    return { ok: false, code: "no_price", message: `Produk "${product.name}" belum bisa dipesan online (harga belum tersedia).` };
  }
  return { ok: true, price: product.price };
}

/* -------------------------------------------------------------------------- */
/* Stok nyata (FASE P4)                                                        */
/* -------------------------------------------------------------------------- */

/** Ambang "stok menipis" agar badge "Sisa N" ditampilkan (data nyata). */
export const LOW_STOCK_THRESHOLD = 5;

/**
 * Apakah target (produk/varian) benar-benar HABIS:
 * - `soldOut` true, ATAU
 * - `stock` diisi & ≤ 0 (stok mengikat saat diisi — GAP-P4-1).
 * `stock` yang tidak diisi (undefined) = tak dibatasi/unknown → tidak dianggap habis.
 */
export function isStockOut(target: { soldOut: boolean; stock?: number }): boolean {
  if (target.soldOut) return true;
  return (
    typeof target.stock === "number" &&
    Number.isFinite(target.stock) &&
    target.stock <= 0
  );
}

/**
 * Label badge stok JUJUR (FASE P4, diselaraskan GAP-P4-1):
 * - habis (`soldOut` atau `stock ≤ 0`) → "Stok habis".
 * - `stock` diisi & ≤ `threshold` (default 5) → "Sisa N".
 * - Sisanya → null (tak ada badge; TIDAK menampilkan angka palsu).
 */
export function stockBadge(
  target: { soldOut: boolean; stock?: number },
  threshold = LOW_STOCK_THRESHOLD,
): { label: string; kind: "out" | "low" } | null {
  if (isStockOut(target)) return { label: "Stok habis", kind: "out" };
  if (
    typeof target.stock === "number" &&
    Number.isFinite(target.stock) &&
    target.stock <= threshold
  ) {
    return { label: `Sisa ${target.stock}`, kind: "low" };
  }
  return null;
}

/**
 * Sisa stok efektif untuk pembelian (GAP-P4-1):
 * - `null` → stok tak dibatasi / tidak diketahui (boleh beli berapa pun).
 * - angka ≥ 0 → batas stok nyata (checkout menolak qty > nilai ini).
 */
export function effectiveStock(target: { stock?: number }): number | null {
  return typeof target.stock === "number" && Number.isFinite(target.stock)
    ? Math.max(0, Math.floor(target.stock))
    : null;
}

/**
 * Stok gabungan suatu produk (FASE P4) — dipakai untuk badge ringkas "Sisa N"
 * di kartu produk multi-varian:
 * - multi-varian → Σ `stock` varian yang menetapkan `stock`; null bila tak ada.
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
