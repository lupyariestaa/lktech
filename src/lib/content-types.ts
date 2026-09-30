import {
  FAQS,
  PRICING,
  PROCESS as DEFAULT_PROCESS,
  SERVICES,
  SERVICES_DETAIL,
  STATS as DEFAULT_STATS,
  TESTIMONIALS as DEFAULT_TESTIMONIALS,
  WHY_US as DEFAULT_WHY_US,
  type Service,
  type ServiceDetail,
} from "@/lib/content";

/** Layanan lengkap (kartu + detail) yang dapat dikelola dari dashboard. */
export type ManagedService = Service & {
  detail: Omit<ServiceDetail, "slug">;
};

/** FAQ umum halaman beranda. */
export type ManagedFaq = {
  question: string;
  answer: string;
};

/** Paket harga halaman beranda. */
export type ManagedPricing = {
  name: string;
  description: string;
  features: string[];
  highlight: boolean;
};

/** Satu gambar pada carousel mockup hero. */
export type HeroShowcaseImage = {
  /** URL Cloudinary (secure_url). */
  url: string;
  /** publicId Cloudinary — untuk keperluan hapus aset. */
  publicId: string;
  /** Teks alternatif (aksesibilitas / SEO). */
  alt: string;
};

/** Efek transisi antar gambar carousel. */
export type HeroShowcaseEffect = "fade" | "slide";

/** Pengaturan carousel gambar pada mockup hero (beranda). */
export type HeroShowcase = {
  /** Aktif/nonaktif seluruh carousel. */
  enabled: boolean;
  /** Interval ganti gambar (detik). */
  interval: number;
  /** Efek transisi antar gambar. */
  effect: HeroShowcaseEffect;
  /** Gambar untuk mockup browser (desktop), urut. */
  browser: HeroShowcaseImage[];
  /** Gambar untuk mockup ponsel, urut. */
  mobile: HeroShowcaseImage[];
};

export const HERO_SHOWCASE_EFFECTS: HeroShowcaseEffect[] = ["fade", "slide"];

export const DEFAULT_HERO_SHOWCASE: HeroShowcase = {
  enabled: true,
  interval: 4,
  effect: "fade",
  browser: [],
  mobile: [],
};

/** Keunggulan ("Kenapa memilih kami") di beranda. */
export type ManagedWhyUs = {
  title: string;
  description: string;
  icon: string;
};

/** Satu langkah pada alur kerja (beranda & halaman layanan). */
export type ManagedProcess = {
  step: string;
  title: string;
  description: string;
};

/** Satu statistik marketing pada beranda. */
export type ManagedStat = {
  value: number;
  suffix: string;
  label: string;
};

/** Satu testimoni klien pada beranda. */
export type ManagedTestimonial = {
  name: string;
  role: string;
  quote: string;
  rating: number;
};

/** Seluruh konten yang dapat dikelola dari dashboard. */
export type SiteContent = {
  services: ManagedService[];
  faqs: ManagedFaq[];
  pricing: ManagedPricing[];
  hero: HeroShowcase;
  whyUs: ManagedWhyUs[];
  process: ManagedProcess[];
  stats: ManagedStat[];
  testimonials: ManagedTestimonial[];
};

/**
 * Menggabungkan `SERVICES` (kartu) dengan `SERVICES_DETAIL` (detail) menjadi
 * satu daftar `ManagedService` sebagai nilai default / fallback.
 */
function buildDefaultServices(): ManagedService[] {
  return SERVICES.map((service) => {
    const detail =
      SERVICES_DETAIL.find((d) => d.slug === service.slug) ??
      emptyDetail(service.slug);
    const { slug: _slug, ...rest } = detail;
    void _slug;
    return { ...service, detail: rest };
  });
}

function emptyDetail(slug: string): ServiceDetail {
  return {
    slug,
    heroDescription: "",
    highlights: [],
    deliverables: [],
    features: [],
    steps: [],
    techStack: [],
    packages: [],
    faqs: [],
  };
}

export function defaultSiteContent(): SiteContent {
  return {
    services: buildDefaultServices(),
    faqs: FAQS.map((f) => ({ ...f })),
    pricing: PRICING.map((p) => ({ ...p, features: [...p.features] })),
    hero: { ...DEFAULT_HERO_SHOWCASE, browser: [], mobile: [] },
    // `structuredClone` agar detail bersarang tidak berbagi referensi dengan
    // konstanta statis (menghindari mutasi tak sengaja pada nilai default).
    whyUs: structuredClone(DEFAULT_WHY_US),
    process: structuredClone(DEFAULT_PROCESS),
    stats: structuredClone(DEFAULT_STATS),
    testimonials: structuredClone(DEFAULT_TESTIMONIALS),
  };
}
