import { z } from "zod";

/** Satu item yang dikirim klien saat checkout (hanya slug/varians/qty yang dipercaya). */
export const checkoutItemSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  /**
   * Slug varian terpilih (produk multi-varian). Opsional untuk produk tunggal.
   *
   * String kosong dianggap "tanpa varian" (bukan alasan menolak checkout):
   * keranjang lama di `localStorage` dapat menyimpan `""`. Produk multi-varian
   * tetap ditolak server dengan pesan jelas (`variant_required`) saat varian
   * benar-benar dibutuhkan.
   */
  variantSlug: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value ? value : undefined)),
  /**
   * Opsi cetak (produk percetakan).
   *
   * **Tidak** `strict`: keranjang lama menyimpan salinan tampilan (mis.
   * `finishing`) di dalam `printOptions`. Server hanya membaca
   * `widthM`/`heightM`/`finishingIds` dan menghitung ulang harga dari Firestore,
   * jadi kunci tambahan tidak berpengaruh pada keamanan — dan tidak boleh
   * membuat checkout gagal. Semua nilai tetap divalidasi ketat di atas.
   */
  printOptions: z
    .object({
      widthM: z.number().finite().positive().max(100).optional(),
      heightM: z.number().finite().positive().max(100).optional(),
      finishingIds: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
    })
    .optional(),
  qty: z.number().int().min(1).max(999),
});

/**
 * Body checkout. Harga/nama produk TIDAK dikirim klien — server mengambil &
 * memverifikasi ulang dari Firestore agar tidak bisa dimanipulasi.
 * `buyerName` hanya untuk tampilan (dibersihkan server); email diambil dari token.
 * `couponCode` opsional — kode kupon; diskon dihitung SERVER.
 *
 * `couponCode` dinormalisasi (uppercase, buang non-A-Z0-9) di schema (audit K13)
 * agar konsisten dgn `normalizeCouponCode` di server; server tetap memvalidasi.
 */
export const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1).max(50),
  buyerName: z.string().trim().max(80).optional(),
  couponCode: z
    .string()
    .trim()
    .max(40)
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
