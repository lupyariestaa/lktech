/** Satu baris spesifikasi (mis. "Hosting" → "Gratis 1 bulan"). */
export type ProductSpec = {
  label: string;
  value: string;
};

/** Satu fitur/keunggulan yang ditampilkan sebagai poin. */
export type ProductFeature = {
  title: string;
  description: string;
};

/**
 * Satu langkah pada "Alur Pembuatan" produk (mis. cara memesan & menerima
 * hasil). Ditampilkan di halaman detail produk.
 */
export type ProductProcessStep = {
  /** Nomor/penanda langkah, mis. "1" atau "01". */
  step: string;
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
 * Satu VARIAN/PAKET dari sebuah produk (mis. "Portfolio Basic",
 * "Portfolio Profesional", "Portfolio Custom").
 *
 * Setiap varian punya harga, harga coret, fitur, spesifikasi, isi paket, dan
 * BATASAN tersendiri. Varian inilah yang dipilih pembeli saat checkout.
 */
export type ProductVariant = {
  /** Slug unik GLOBAL per varian (jadi kunci di keranjang/order). */
  slug: string;
  /** Nama paket, mis. "Portfolio Profesional". */
  name: string;
  /** Ringkasan singkat paket (opsional). */
  tagline?: string;
  /** Harga jual (Rupiah). 0 = "Hubungi kami". */
  price: number;
  /** Harga sebelum diskon (opsional, untuk menampilkan coret). */
  originalPrice?: number;
  /** Badge kecil, mis. "Paling Populer". */
  badge?: string;
  /**
   * Tandai paket unggulan/rekomendasi. Idealnya hanya satu varian `true`
   * per produk. UI akan menyorot varian ini.
   */
  highlight: boolean;
  /** Tidak tersedia bila true. */
  soldOut: boolean;
  /** Keunggulan paket (poin). */
  features: ProductFeature[];
  /** Spesifikasi teknis (label → nilai). */
  specs: ProductSpec[];
  /** Isi paket / yang didapat pembeli. */
  includes: string[];
  /**
   * Batasan paket (sering "batasan tidak tertulis" yang penting dikomunikasikan
   * ke pembeli, mis. "Tidak termasuk penulisan konten").
   */
  limits: string[];
  /** Estimasi pengerjaan, mis. "1–3 hari kerja". */
  delivery?: string;
  /** Pesan WhatsApp khusus paket (bila kosong, sistem menyusun otomatis). */
  waMessage?: string;
};

/**
 * Satu berkas unduhan produk digital (mis. template `.zip`, source code).
 * URL harus dapat diakses server/CDN (mis. Cloudinary).
 */
export type ProductDownloadFile = {
  /** Nama tampilan berkas, mis. "Template-LandingPage.zip". */
  name: string;
  /** URL berkas (Cloudinary/aman). */
  url: string;
  /** Ukuran (byte) — opsional, untuk tampilan. */
  size?: number;
};

/**
 * Konfigurasi produk digital INSTAN (unduhan otomatis setelah bayar).
 * Bila `enabled` true & `files` tidak kosong, pembeli menerima link unduhan
 * bertoken setelah order berstatus `dibayar`.
 */
export type ProductDownloadable = {
  enabled: boolean;
  files: ProductDownloadFile[];
  /** Masa berlaku link unduhan (hari). Default dari `DOWNLOAD_LINK_DAYS`. */
  linkDays?: number;
  /** Batas jumlah unduh per link. Default dari `DOWNLOAD_MAX_HITS`. */
  maxDownloads?: number;
  /** Instruksi singkat yang tampil di halaman unduhan (opsional). */
  note?: string;
};

/**
 * Produk yang dijual.
 *
 * Produk mendukung DUA mode:
 * - **Multi-varian** (mis. "Paket Website Portfolio" dengan Basic/Profesional/
 *   Custom): isi `variants[]`. `price`/`originalPrice` pada level produk
 *   diabaikan (dianggap "mulai dari" harga varian termurah).
 * - **Tunggal** (produk lama: template/software): `variants` kosong, memakai
 *   `price`/`originalPrice`/`features`/`specs` di level produk seperti biasa.
 */
export type Product = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  /**
   * Harga produk (mode tunggal). Untuk produk multi-varian, ini boleh 0 —
   * harga sebenarnya berasal dari `variants[]`.
   */
  price: number;
  /** Harga sebelum diskon (mode tunggal). */
  originalPrice?: number;
  /** URL cover Cloudinary (atau "default"). */
  cover: string;
  /** publicId Cloudinary cover — untuk hapus aset (opsional). */
  coverPublicId?: string;
  /** Teks alternatif cover (a11y/SEO, diisi dari media `alt`). */
  coverAlt?: string;
  /** Galeri gambar tambahan. */
  gallery: string[];
  /** Badge kecil, mis. "Terlaris". */
  badge?: string;
  /** Fitur/keunggulan utama (mode tunggal / info umum). */
  features: ProductFeature[];
  /** Spesifikasi teknis (mode tunggal / info umum). */
  specs: ProductSpec[];
  /** Tools / teknologi yang dipakai. */
  tools: string[];
  /** Isi paket / yang didapat pembeli (mode tunggal). */
  includes: string[];
  /** Estimasi pengiriman/pengerjaan default, mis. "Instan (download)". */
  delivery?: string;
  /** Alur/langkah pembuatan atau pembelian (opsional). */
  process: ProductProcessStep[];
  /** Catatan penting (mis. cara pengiriman data, kebijakan revisi). */
  notes: string[];
  /** Varian/paket produk. Kosong = produk tunggal. */
  variants: ProductVariant[];
  /** Tampilkan sebagai "tidak tersedia" bila true (produk tunggal). */
  soldOut: boolean;
  /** Tampilkan sebagai produk unggulan di daftar. */
  featured: boolean;
  /** Aktif/nonaktif produk di halaman publik. */
  active: boolean;
  /**
   * Konfigurasi unduhan otomatis (produk digital INSTAN). Opsional —
   * produk lama tanpa field ini tetap valid (tidak ada unduhan otomatis).
   */
  downloadable?: ProductDownloadable;
  /**
   * Slug produk lain yang relevan / sering dibeli bersama (FASE P3).
   * Dipakai untuk section "Sering dibeli bersama" & saran cross-sell.
   * Opsional (produk lama tetap valid).
   */
  relatedSlugs?: string[];
  /** Pesan WhatsApp khusus (bila kosong, sistem menyusun otomatis). */
  waMessage?: string;
};

/** Produk tersimpan di Firestore (dengan id dokumen). */
export type StoredProduct = Product & { id: string };
