/**
 * Logika MURNI reservasi stok (Sprint 2 / O-01) — bebas impor runtime agar
 * dapat diuji Node tanpa alias resolver.
 *
 * **Model stok (Opsi A):** stok NYATA (`product.stock` / `variant.stock`)
 * dikurangi saat order DIBUAT (reservasi), dikembalikan bila order
 * dibatalkan/kedaluwarsa/dihapus, dan tetap terpakai saat order lunas.
 *
 * Stok yang TIDAK diisi (`undefined`) berarti tak terbatas/unknown → tidak
 * direservasi (lihat `planStockDecrement`).
 */

/** Satu baris reservasi: sejumlah `qty` untuk (produk, varian opsional). */
export type StockReservationLine = {
  slug: string;
  variantSlug?: string;
  qty: number;
};

/** Transisi status yang WAJIB melepas reservasi stok (analog `KP-C2`). */
export const STOCK_RELEASE_STATUSES = ["dibatalkan", "kedaluwarsa"] as const;

/** Status final yang menandakan stok sudah "dipakai" (tidak dilepas). */
const STOCK_CONSUMED_STATUSES: readonly string[] = ["selesai"];

/** Kunci unik (produk, varian) untuk menggabungkan baris keranjang. */
export function reservationKey(line: { slug: string; variantSlug?: string }): string {
  return `${line.slug}::${line.variantSlug ?? ""}`;
}

/**
 * Menggabungkan baris keranjang menjadi reservasi per (produk, varian):
 * baris duplikat dijumlahkan, baris tidak valid (slug kosong / qty ≤ 0) dibuang.
 * Urutan kemunculan pertama dipertahankan (deterministik).
 */
export function aggregateReservationLines(
  lines: readonly { slug: string; variantSlug?: string; qty: number }[],
): StockReservationLine[] {
  const map = new Map<string, StockReservationLine>();
  for (const line of lines) {
    const slug = (line.slug ?? "").trim();
    if (!slug) continue;
    const qty = Math.floor(line.qty);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const variantSlug = line.variantSlug?.trim() || undefined;
    const key = reservationKey({ slug, variantSlug });
    const existing = map.get(key);
    if (existing) existing.qty += qty;
    else map.set(key, variantSlug ? { slug, variantSlug, qty } : { slug, qty });
  }
  return [...map.values()];
}

/** Hasil perencanaan pengurangan stok untuk satu target. */
export type StockDecrementPlan =
  | { kind: "unlimited" }
  | { kind: "insufficient"; left: number }
  | { kind: "reserved"; next: number };

/**
 * Menghitung stok baru setelah pengurangan `qty`.
 * - stok tak diisi (`undefined`/non-number) → `unlimited` (tidak direservasi).
 * - `qty` > sisa → `insufficient` (dengan sisa stok).
 * - sisanya → `reserved` dengan nilai stok berikutnya.
 */
export function planStockDecrement(
  stock: number | undefined,
  qty: number,
): StockDecrementPlan {
  if (typeof stock !== "number" || !Number.isFinite(stock)) {
    return { kind: "unlimited" };
  }
  const available = Math.max(0, Math.floor(stock));
  if (qty > available) return { kind: "insufficient", left: available };
  return { kind: "reserved", next: available - qty };
}

/**
 * Menghitung stok baru setelah pelepasan (penambahan) `qty`.
 * `undefined` bila stok pada dokumen tidak lagi terbatas (jangan menulis).
 */
export function planStockIncrement(
  stock: number | undefined,
  qty: number,
): number | undefined {
  if (typeof stock !== "number" || !Number.isFinite(stock)) return undefined;
  return Math.max(0, Math.floor(stock)) + qty;
}

/**
 * Apakah transisi dari `previous` ke `next` harus MELEPAS reservasi stok.
 * Benar hanya bila status berubah, `next` termasuk `STOCK_RELEASE_STATUSES`,
 * dan order sebelumnya belum "mengonsumsi" stok (belum `selesai`).
 */
export function shouldReleaseStock(previous: string, next: string): boolean {
  if (previous === next) return false;
  if (!(STOCK_RELEASE_STATUSES as readonly string[]).includes(next)) return false;
  return !STOCK_CONSUMED_STATUSES.includes(previous);
}

/**
 * Menormalkan data mentah `stockReservation` dari Firestore menjadi daftar
 * baris valid. Kosong/tidak valid → `undefined` (agar field tidak tertulis).
 */
export function normalizeStockReservation(
  value: unknown,
): StockReservationLine[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: StockReservationLine[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const d = entry as Record<string, unknown>;
    const slug = typeof d.slug === "string" ? d.slug.trim() : "";
    const qty =
      typeof d.qty === "number" && Number.isFinite(d.qty) ? Math.floor(d.qty) : 0;
    if (!slug || qty <= 0) continue;
    const variantSlug =
      typeof d.variantSlug === "string" && d.variantSlug.trim()
        ? d.variantSlug.trim()
        : undefined;
    out.push(variantSlug ? { slug, variantSlug, qty } : { slug, qty });
  }
  return out.length > 0 ? out : undefined;
}
