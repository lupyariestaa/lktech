export type SocialLink = {
  label: string;
  href: string;
  icon: string;
};

/** Pengaturan SEO global (opsional). */
export type SeoSettings = {
  title?: string;
  description?: string;
  ogImage?: string;
  searchConsoleId?: string;
};

/** Pengaturan mode pemeliharaan (opsional). */
export type MaintenanceSettings = {
  enabled?: boolean;
  title?: string;
  message?: string;
  imageUrl?: string;
  imageAlt?: string;
  etaISO?: string;
  contactEmail?: string;
};

/** Pengaturan situs yang dapat diubah dari dashboard. */
export type SiteSettings = {
  email: string;
  whatsapp: string; // format internasional tanpa + (mis. 6283159688549)
  location: string;
  socials: SocialLink[];
  /** Kirim email konfirmasi pesanan ke pembeli (default: aktif). */
  notifyBuyerOnOrder: boolean;
  /** Kirim email update status pesanan ke pembeli (default: aktif). */
  notifyBuyerOnStatus: boolean;
  /** Kirim email pengingat keranjang terbengkalai (FASE P5, default: aktif). */
  notifyCartReminders: boolean;
  /** Nama brand (opsional) — dipakai di metadata/identitas. */
  brandName?: string;
  /** Tagline singkat brand (opsional). */
  tagline?: string;
  /** Pengaturan SEO global. */
  seo?: SeoSettings;
  /** Mode pemeliharaan situs. */
  maintenance?: MaintenanceSettings;
};

/** Nilai default (dipakai bila Firestore kosong / belum dikonfigurasi). */
export const DEFAULT_SETTINGS: SiteSettings = {
  email: "lupyariestaa@gmail.com",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "6283159688549",
  location: "Padakembang, Tasikmalaya, Jawa Barat",
  socials: [],
  notifyBuyerOnOrder: true,
  notifyBuyerOnStatus: true,
  notifyCartReminders: true,
  brandName: "LKTech",
  tagline: "Jasa Pembuatan Website, Aplikasi Mobile & Produk Digital",
  seo: {},
  maintenance: { enabled: false, title: "Sedang Pemeliharaan" },
};
