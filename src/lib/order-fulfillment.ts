import type { ProductCategory } from "@/lib/product-types";
import type { FulfillmentType } from "@/lib/payment-types";

/**
 * Menentukan jalur fulfillment sebuah produk dari kategorinya.
 *
 * Keputusan produk (lihat `docs/2026-10-06-fase-konversi-closing.md` §2.3):
 * - **INSTAN** — template/software/ebook/aplikasi/lainnya: barang digital →
 *   pembayaran online otomatis → akses/unduhan otomatis.
 * - **JASA** — kategori `jasa`: layanan manusia → tidak lewat invoice otomatis
 *   (kepatuhan Mayar MoR yang tak mendukung "entirely human services");
 *   order masuk `menunggu_konfirmasi`, admin menghubungi pembeli.
 */
export function fulfillmentTypeForCategory(
  category: ProductCategory | string,
): FulfillmentType {
  return category === "jasa" ? "jasa" : "instan";
}

/**
 * Menentukan jalur fulfillment untuk SELURUH isi keranjang/order.
 * Jika ada minimal satu item JASA → seluruh order JASA (jalur aman:
 * konsultasi dulu), karena jasa tak bisa dicampur invoice otomatis.
 */
export function fulfillmentTypeForCategories(
  categories: readonly string[],
): FulfillmentType {
  return categories.some((c) => c === "jasa") ? "jasa" : "instan";
}

/**
 * Fulfillment EFEKTIF sebuah order untuk tampilan/aksi (OR-B7).
 * Order lama (dibuat sebelum fitur fulfillment) dapat `undefined` — padahal
 * produknya digital. Default-kan ke `instan` agar aksi unduhan tetap tersedia;
 * server tetap memvalidasi (`releaseOrderDownload` mencari berkas & menolak bila
 * tak ada). Field yang benar-benar `jasa` tetap dihormati.
 */
export function effectiveFulfillment(
  fulfillment: FulfillmentType | undefined,
): FulfillmentType {
  return fulfillment === "jasa" ? "jasa" : "instan";
}

export const FULFILLMENT_LABEL: Record<FulfillmentType, string> = {
  instan: "Produk instan (unduh)",
  jasa: "Jasa (konsultasi/konfirmasi)",
};
