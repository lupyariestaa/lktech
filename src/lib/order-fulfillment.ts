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
 * - **CETAK** — kategori percetakan: barang fisik; bayar dulu, produksi setelah
 *   approval desain, pickup; campuran dengan barang digital tetap memakai jalur digital.
 */
export function fulfillmentTypeForCategory(
  category: ProductCategory | string,
): FulfillmentType {
  if (category === "jasa") return "jasa";
  if (category === "percetakan") return "cetak";
  return "instan";
}

/**
 * Menentukan jalur fulfillment untuk SELURUH isi keranjang/order.
 * Jasa mengambil alih order campuran; cetak terpisah dari order digital.
 */
export function fulfillmentTypeForCategories(
  categories: readonly string[],
): FulfillmentType {
  if (categories.includes("jasa")) return "jasa";
  if (categories.length > 0 && categories.every((category) => category === "percetakan")) return "cetak";
  return "instan";
}

/** A legacy/root label for mixed orders; item-level fulfillment is authoritative. */
export function summarizeFulfillment(categories: readonly string[]): FulfillmentType {
  if (categories.includes("jasa")) return "jasa";
  return fulfillmentTypeForCategories(categories);
}

/** Allocate an order-wide discount proportionally, with exact integer totals. */
export function allocateDiscountByItem(
  subtotals: readonly number[],
  discount: number,
): number[] {
  if (!Number.isSafeInteger(discount) || discount < 0) {
    throw new Error("Diskon harus berupa bilangan bulat non-negatif.");
  }
  if (subtotals.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new Error("Subtotal item harus berupa bilangan bulat non-negatif.");
  }
  const total = subtotals.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(discount * Math.max(...subtotals, 0))) {
    throw new Error("Nominal terlalu besar untuk alokasi diskon yang aman.");
  }
  if (discount > total) throw new Error("Diskon melebihi subtotal order.");
  if (discount === 0 || total === 0) return subtotals.map(() => 0);

  const shares = subtotals.map((subtotal, index) => {
    const raw = (discount * subtotal) / total;
    const base = Math.floor(raw);
    return { index, base, remainder: raw - base };
  });
  const remainder = discount - shares.reduce((sum, share) => sum + share.base, 0);
  const ranking = [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let i = 0; i < remainder; i += 1) ranking[i].base += 1;
  return shares.sort((a, b) => a.index - b.index).map((share) => share.base);
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
  if (fulfillment === "jasa" || fulfillment === "cetak") return fulfillment;
  return "instan";
}

export const FULFILLMENT_LABEL: Record<FulfillmentType, string> = {
  instan: "Produk instan (unduh)",
  jasa: "Jasa (konsultasi/konfirmasi)",
  cetak: "Produk cetak (pickup)",
};
