/** Satu baris spesifikasi produk (mis. "RAM" → "8 GB"). */
export type ProductSpec = {
  label: string;
  value: string;
};

/** Satu fitur/keunggulan produk yang ditampilkan sebagai poin. */
export type ProductFeature = {
  title: string;
  description: string;
};

export const PRODUCT_CATEGORIES = [
  "template",
  "software",
  "aplikasi",
  "ebook",
  "jasa",
  "lainnya",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_CATEGORY_LABEL: Record<ProductCategory, string> = {
  template: "Template",
  software: "Software",
  aplikasi: "Aplikasi",
  ebook: "E-Book",
  jasa: "Jasa Digital",
  lainnya: "Lainnya",
};

/**
 * Produk yang dijual (berbeda dari Layanan/Service).
 *
 * Produk bersifat "siap beli": harga transparan, spesifikasi, dan bisa
 * langsung dipesan (checkout ke WhatsApp).
 */
export type Product = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  /** Harga dalam Rupiah. 0 berarti "Hubungi kami". */
  price: number;
  /** Harga sebelum diskon (opsional, untuk menampilkan coret). */
  originalPrice?: number;
  /** URL cover Cloudinary (atau "default"). */
  cover: string;
  /** publicId Cloudinary cover — untuk hapus aset (opsional). */
  coverPublicId?: string;
  /** Galeri gambar tambahan. */
  gallery: string[];
  /** Badge kecil, mis. "Terlaris". */
  badge?: string;
  /** Fitur/keunggulan utama. */
  features: ProductFeature[];
  /** Spesifikasi teknis (label → nilai). */
  specs: ProductSpec[];
  /** Tools / teknologi yang dipakai. */
  tools: string[];
  /** Isi paket / yang didapat pembeli. */
  includes: string[];
  /** Estimasi pengiriman/pengerjaan, mis. "Instan (download)". */
  delivery?: string;
  /** Tampilkan sebagai "tidak tersedia" bila true. */
  soldOut: boolean;
  /** Tampilkan sebagai produk unggulan di daftar. */
  featured: boolean;
  /** Aktif/nonaktif produk di halaman publik. */
  active: boolean;
  /** Pesan WhatsApp khusus (bila kosong, sistem menyusun otomatis). */
  waMessage?: string;
};

/** Produk tersimpan di Firestore (dengan id dokumen). */
export type StoredProduct = Product & { id: string };
