import { z } from "zod";

/**
 * Batas nilai statistik — diselaraskan dengan `src/lib/stats-pure.ts`.
 * Ditaruh inline (bukan impor) agar berkas ini tetap dapat dimuat langsung
 * oleh Node pada tes tanpa resolver alias/ekstensi (lihat `scripts/*.test.ts`).
 */
const STAT_MAX_VALUE = 1_000_000;
const STAT_MAX_SUFFIX = 8;

/**
 * Skema payload `PUT /api/admin/content` (ADM-14).
 *
 * Tujuan:
 * - menolak tipe/field yang salah dengan 400 yang jelas, bukan dinormalisasi
 *   diam-diam menjadi string kosong;
 * - membatasi panjang string/jumlah item agar tidak melebihi batas dokumen
 *   Firestore (1 MiB) dan tidak membebani render publik.
 *
 * Field opsional dipertahankan agar payload lama/parsial tetap bisa dipakai;
 * `normalizeSiteContent` yang mengisi nilai default.
 */

const MAX_TEXT = 5_000;
const MAX_SHORT = 300;
const MAX_URL = 2_000;
const MAX_ITEMS = 100;

const shortText = z.string().max(MAX_SHORT);
const text = z.string().max(MAX_TEXT);
const slug = z.string().trim().min(1).max(120);

const deliverableSchema = z.object({
  title: shortText.optional(),
  description: text.optional(),
});

const featureSchema = z.object({
  title: shortText.optional(),
  description: text.optional(),
  icon: z.string().max(80).optional(),
});

const stepSchema = z.object({
  title: shortText.optional(),
  description: text.optional(),
});

const packageSchema = z.object({
  name: shortText.optional(),
  suitedFor: text.optional(),
  points: z.array(shortText).max(50).optional(),
});

const serviceFaqSchema = z.object({
  question: text.optional(),
  answer: text.optional(),
});

const serviceDetailSchema = z.object({
  slug: z.string().max(120).optional(),
  heroDescription: text.optional(),
  highlights: z.array(shortText).max(50).optional(),
  deliverables: z.array(deliverableSchema).max(MAX_ITEMS).optional(),
  features: z.array(featureSchema).max(MAX_ITEMS).optional(),
  steps: z.array(stepSchema).max(MAX_ITEMS).optional(),
  techStack: z.array(shortText).max(100).optional(),
  packages: z.array(packageSchema).max(50).optional(),
  faqs: z.array(serviceFaqSchema).max(100).optional(),
});

const serviceSchema = z.object({
  slug,
  title: shortText.optional(),
  tagline: text.optional(),
  description: text.optional(),
  icon: z.string().max(80).optional(),
  accent: z.string().max(200).optional(),
  waMessage: text.optional(),
  detail: serviceDetailSchema.optional(),
});

const faqSchema = z.object({
  question: z.string().trim().min(1).max(MAX_TEXT),
  answer: text.optional(),
});

const pricingSchema = z.object({
  name: z.string().trim().min(1).max(MAX_SHORT),
  description: text.optional(),
  features: z.array(shortText).max(100).optional(),
  highlight: z.boolean().optional(),
});

const whyUsSchema = z.object({
  title: z.string().trim().min(1).max(MAX_SHORT),
  description: text.optional(),
  icon: z.string().max(80).optional(),
});

const processSchema = z.object({
  step: z.string().max(40).optional(),
  title: z.string().trim().min(1).max(MAX_SHORT),
  description: text.optional(),
});

const statSchema = z.object({
  value: z.number().int().min(0).max(STAT_MAX_VALUE),
  suffix: z.string().max(STAT_MAX_SUFFIX).optional(),
  label: z.string().trim().min(1).max(MAX_SHORT),
  verified: z.boolean().optional(),
  featured: z.boolean().optional(),
  note: z.string().max(200).optional(),
  // Penanda angka turunan (S4). Ditulis inline (bukan impor `src`) agar berkas
  // ini tetap dapat dimuat langsung oleh tes Node — selaras `stats-pure.ts`.
  source: z.enum(["projects", "services", "locations"]).optional(),
});

const technologySchema = z.object({
  name: z.string().trim().min(1).max(MAX_SHORT),
  logo: z.string().max(MAX_URL).optional(),
  color: z.string().max(40).optional(),
  wordmark: z.boolean().optional(),
});

const heroImageSchema = z.object({
  url: z.string().trim().min(1).max(MAX_URL),
  publicId: z.string().max(MAX_URL).optional(),
  alt: z.string().max(MAX_SHORT).optional(),
});

const heroShowcaseSchema = z.object({
  enabled: z.boolean().optional(),
  interval: z.number().int().min(2).max(15).optional(),
  effect: z.enum(["fade", "slide"]).optional(),
  browser: z.array(heroImageSchema).max(30).optional(),
  mobile: z.array(heroImageSchema).max(30).optional(),
});

export const siteContentSchema = z.object({
  services: z.array(serviceSchema).max(MAX_ITEMS).optional(),
  faqs: z.array(faqSchema).max(MAX_ITEMS).optional(),
  pricing: z.array(pricingSchema).max(MAX_ITEMS).optional(),
  hero: heroShowcaseSchema.optional(),
  whyUs: z.array(whyUsSchema).max(MAX_ITEMS).optional(),
  process: z.array(processSchema).max(MAX_ITEMS).optional(),
  stats: z.array(statSchema).max(MAX_ITEMS).optional(),
  statsAsOf: z.string().max(40).optional(),
  technologies: z.array(technologySchema).max(MAX_ITEMS).optional(),
});

export type SiteContentPayload = z.infer<typeof siteContentSchema>;

/** Batas aman di bawah 1 MiB dokumen Firestore (UTF-8). */
export const MAX_SITE_CONTENT_BYTES = 900_000;

/** Pesan error pertama yang bisa ditampilkan ke admin. */
export function firstSiteContentIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Data konten tidak valid.";
  const path = issue.path.length > 0 ? issue.path.join(".") : "body";
  return `${path}: ${issue.message}`;
}
