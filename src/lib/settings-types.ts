export type SocialLink = {
  label: string;
  href: string;
  icon: string;
};

/** Pengaturan situs yang dapat diubah dari dashboard. */
export type SiteSettings = {
  email: string;
  whatsapp: string; // format internasional tanpa + (mis. 6283159688549)
  location: string;
  socials: SocialLink[];
};

/** Nilai default (dipakai bila Firestore kosong / belum dikonfigurasi). */
export const DEFAULT_SETTINGS: SiteSettings = {
  email: "lupyariestaa@gmail.com",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "6283159688549",
  location: "Padakembang, Tasikmalaya, Jawa Barat",
  socials: [],
};
