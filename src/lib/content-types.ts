import {
  FAQS,
  PRICING,
  PROCESS as DEFAULT_PROCESS,
  STATS as DEFAULT_STATS,
  TECH_STACK as DEFAULT_TECH_STACK,
  TESTIMONIALS as DEFAULT_TESTIMONIALS,
  WHY_US as DEFAULT_WHY_US,
  type Service,
  type ServiceDetail,
} from "@/lib/content";
import { SERVICES as HARDCODED_SERVICES } from "@/lib/services";

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

/** Satu teknologi pada marquee "Teknologi yang kami gunakan". */
export type ManagedTechnology = {
  name: string;
  /** Path logo di public/ (mis. "/tech/react.svg"). Kosong = placeholder inisial. */
  logo: string;
  /** Warna brand (hex) untuk placeholder & aksen. */
  color: string;
  /** `true` bila SVG sudah memuat nama brand (sembunyikan label teks). */
  wordmark: boolean;
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
  technologies: ManagedTechnology[];
};

/**
 * Membangun daftar `ManagedService` default untuk beranda/footer/navbar.
 *
 * SUMBER TUNGGAL (FASE H3): data kartu layanan diturunkan dari modul
 * **`@/lib/services`** (`SERVICES`) — modul yang sama yang dipakai halaman
 * `/layanan` & sitemap. Ini menghapus duplikasi lama (`SERVICES` +
 * `SERVICES_DETAIL` di `content.ts`) sehingga judul/tagline kartu beranda
 * selalu konsisten dengan halaman layanan.
 *
 * `detail` disertakan hanya untuk kompatibilitas tipe `SiteContent` (tidak
 * dikonsumsi komponen beranda — halaman detail layanan membaca modul
 * hardcoded secara langsung). Dashboard tetap dapat menimpa `services`
 * (backward-compatible via `normalizeSiteContent`).
 */
function buildDefaultServices(): ManagedService[] {
  return HARDCODED_SERVICES.map((service) => {
    const { detail: _detail, landingPoints: _lp, image: _img, imageAlt: _alt, ...card } =
      service;
    void _detail;
    void _lp;
    void _img;
    void _alt;
    return {
      ...card,
      detail: emptyDetail(service.slug),
    };
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
    technologies: DEFAULT_TECH_STACK.map((t) => ({ ...t, wordmark: t.wordmark ?? false })),
  };
}

/**
 * Apakah daftar testimoni masih sama dengan nilai contoh bawaan (placeholder)?
 * Dipakai dashboard untuk menampilkan peringatan agar diganti data asli.
 */
export function isDefaultTestimonials(list: ManagedTestimonial[]): boolean {
  return (
    JSON.stringify(list) === JSON.stringify(structuredClone(DEFAULT_TESTIMONIALS))
  );
}

/** Apakah daftar statistik masih sama dengan nilai contoh bawaan. */
export function isDefaultStats(list: ManagedStat[]): boolean {
  return JSON.stringify(list) === JSON.stringify(structuredClone(DEFAULT_STATS));
}
