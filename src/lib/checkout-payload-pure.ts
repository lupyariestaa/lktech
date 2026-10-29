/**
 * Penyusun payload checkout dari item keranjang (fungsi murni, tanpa dependensi
 * runtime agar dapat diuji langsung).
 *
 * Tujuan: kirim HANYA field yang dikenali server checkout.
 *
 * Keranjang disimpan di `localStorage` dan dapat berisi field tambahan dari versi
 * lama (mis. snapshot `finishing` yang dulu ikut tersimpan di dalam
 * `printOptions`). Field seperti itu tidak dipakai server — server membaca
 * `widthM`/`heightM`/`finishingIds` lalu menghitung ulang harga dari Firestore —
 * jadi mengirimkannya hanya berisiko membuat checkout ditolak tanpa manfaat.
 */

/** Satu item payload checkout (bentuk yang diterima `checkoutSchema`). */
export type CheckoutPayloadItem = {
  slug: string;
  variantSlug?: string;
  printOptions?: { widthM?: number; heightM?: number; finishingIds: string[] };
  qty: number;
};

/** Opsi cetak pada item keranjang; field lain diabaikan. */
export type CheckoutSourcePrintOptions = {
  widthM?: number;
  heightM?: number;
  finishingIds?: readonly string[];
  [key: string]: unknown;
};

/** Item keranjang minimal yang dibutuhkan untuk menyusun payload checkout. */
export type CheckoutSourceItem = {
  slug: string;
  qty: number;
  variantSlug?: string;
  printOptions?: CheckoutSourcePrintOptions | null;
};

/**
 * Ubah satu item keranjang menjadi payload checkout.
 * - `variantSlug` kosong/spasi → dibuang (setara "tanpa varian").
 * - `printOptions` hanya membawa lebar/tinggi/finishingIds (duplikat dibuang).
 */
export function toCheckoutItem(item: CheckoutSourceItem): CheckoutPayloadItem {
  const payload: CheckoutPayloadItem = { slug: item.slug, qty: item.qty };

  const variantSlug = item.variantSlug?.trim();
  if (variantSlug) payload.variantSlug = variantSlug;

  if (item.printOptions) {
    const { widthM, heightM } = item.printOptions;
    payload.printOptions = {
      ...(typeof widthM === "number" ? { widthM } : {}),
      ...(typeof heightM === "number" ? { heightM } : {}),
      finishingIds: Array.from(new Set(item.printOptions.finishingIds ?? [])),
    };
  }

  return payload;
}

export function toCheckoutItems(
  items: readonly CheckoutSourceItem[],
): CheckoutPayloadItem[] {
  return items.map(toCheckoutItem);
}
