/**
 * Identitas dan penggabungan item keranjang tanpa efek samping.
 * File sengaja bebas dari import runtime agar logikanya dapat diuji langsung.
 */

export type CartIdentityItem = {
  slug: string;
  variantSlug?: string;
  printOptions?: {
    widthM?: number;
    heightM?: number;
    finishingIds: string[];
  };
};

/**
 * Kunci mewakili satu konfigurasi yang dapat dibeli.
 * Opsi cetak merupakan bagian identitas, bukan sekadar atribut tampilan:
 * ukuran, varian/bahan, dan finishing berbeda harus tetap menjadi baris terpisah.
 */
export function cartIdentityKey(item: CartIdentityItem): string {
  const printOptions = item.printOptions
    ? [
        item.printOptions.widthM ?? null,
        item.printOptions.heightM ?? null,
        [...item.printOptions.finishingIds].sort(),
      ]
    : null;

  // Tuple encoding avoids ambiguous separator collisions in admin-defined IDs.
  return JSON.stringify([item.slug, item.variantSlug ?? null, printOptions]);
}

/**
 * Gabungkan dua keranjang berdasarkan konfigurasi lengkap.
 * Urutan keranjang akun dipertahankan; item guest baru ditambahkan setelahnya.
 * Input tidak dimutasi.
 */
export function mergeCartItems<T extends CartIdentityItem & { qty: number }>(
  existingItems: readonly T[],
  incomingItems: readonly T[],
): T[] {
  const merged = existingItems.map((item) => ({ ...item })) as T[];
  const indexByKey = new Map(
    merged.map((item, index) => [cartIdentityKey(item), index]),
  );

  for (const incoming of incomingItems) {
    const key = cartIdentityKey(incoming);
    const existingIndex = indexByKey.get(key);

    if (existingIndex === undefined) {
      indexByKey.set(key, merged.length);
      merged.push({ ...incoming } as T);
      continue;
    }

    merged[existingIndex] = {
      ...merged[existingIndex],
      qty: merged[existingIndex].qty + incoming.qty,
    };
  }

  return merged;
}
