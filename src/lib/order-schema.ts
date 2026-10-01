import { z } from "zod";

/** Satu item yang dikirim klien saat checkout (hanya slug/varians/qty yang dipercaya). */
export const checkoutItemSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  /** Slug varian terpilih (produk multi-varian). Opsional untuk produk tunggal. */
  variantSlug: z.string().trim().min(1).max(200).optional(),
  qty: z.number().int().min(1).max(999),
});

/**
 * Body checkout. Harga/nama produk TIDAK dikirim klien — server mengambil &
 * memverifikasi ulang dari Firestore agar tidak bisa dimanipulasi.
 * `buyerName` hanya untuk tampilan (dibersihkan server); email diambil dari token.
 */
export const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1).max(50),
  buyerName: z.string().trim().max(80).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
