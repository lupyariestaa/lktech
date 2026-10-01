import {
  defaultSiteContent,
  DEFAULT_HERO_SHOWCASE,
  type HeroShowcase,
  type HeroShowcaseEffect,
  type HeroShowcaseImage,
  type ManagedFaq,
  type ManagedPricing,
  type ManagedProcess,
  type ManagedService,
  type ManagedStat,
  type ManagedTechnology,
  type ManagedTestimonial,
  type ManagedWhyUs,
  type SiteContent,
} from "@/lib/content-types";

const COLLECTION = "content";
export const CONTENT_DOC_ID = "site";

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;

const bool = (v: unknown): boolean => v === true;

const strArr = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "")
    : [];

function normalizeService(raw: unknown): ManagedService | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const slug = str(d.slug).trim();
  if (!slug) return null;

  const detail = (d.detail ?? {}) as Record<string, unknown>;

  return {
    slug,
    title: str(d.title),
    tagline: str(d.tagline),
    description: str(d.description),
    icon: str(d.icon, "globe"),
    accent: str(d.accent, "from-[#004EDF] to-[#4D82EC]"),
    waMessage: str(d.waMessage),
    detail: {
      heroDescription: str(detail.heroDescription),
      highlights: strArr(detail.highlights),
      deliverables: Array.isArray(detail.deliverables)
        ? detail.deliverables
            .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
            .map((x) => ({
              title: str(x.title),
              description: str(x.description),
            }))
            .filter((x) => x.title || x.description)
        : [],
      features: Array.isArray(detail.features)
        ? detail.features
            .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
            .map((x) => ({
              title: str(x.title),
              description: str(x.description),
              icon: str(x.icon, "sparkles"),
            }))
            .filter((x) => x.title || x.description)
        : [],
      steps: Array.isArray(detail.steps)
        ? detail.steps
            .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
            .map((x) => ({
              title: str(x.title),
              description: str(x.description),
            }))
            .filter((x) => x.title || x.description)
        : [],
      techStack: strArr(detail.techStack),
      packages: Array.isArray(detail.packages)
        ? detail.packages
            .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
            .map((x) => ({
              name: str(x.name),
              suitedFor: str(x.suitedFor),
              points: strArr(x.points),
            }))
            .filter((x) => x.name || x.suitedFor || x.points.length > 0)
        : [],
      faqs: Array.isArray(detail.faqs)
        ? detail.faqs
            .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
            .map((x) => ({
              question: str(x.question),
              answer: str(x.answer),
            }))
            .filter((x) => x.question || x.answer)
        : [],
    },
  };
}

function normalizeFaq(raw: unknown): ManagedFaq | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const question = str(d.question).trim();
  if (!question) return null;
  return { question, answer: str(d.answer) };
}

function normalizePricing(raw: unknown): ManagedPricing | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const name = str(d.name).trim();
  if (!name) return null;
  return {
    name,
    description: str(d.description),
    features: strArr(d.features),
    highlight: bool(d.highlight),
  };
}

function normalizeHeroImage(raw: unknown): HeroShowcaseImage | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const url = str(d.url).trim();
  if (!url) return null;
  return {
    url,
    publicId: str(d.publicId),
    alt: str(d.alt),
  };
}

/** Menormalkan bagian `hero` (carousel mockup) dengan default yang aman. */
export function normalizeHeroShowcase(raw: unknown): HeroShowcase {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_HERO_SHOWCASE };
  const d = raw as Record<string, unknown>;

  const intervalRaw =
    typeof d.interval === "number" ? d.interval : Number(d.interval);
  const interval = Number.isFinite(intervalRaw)
    ? Math.min(15, Math.max(2, Math.round(intervalRaw)))
    : DEFAULT_HERO_SHOWCASE.interval;

  const effect: HeroShowcaseEffect =
    d.effect === "slide" ? "slide" : "fade";

  const browser = Array.isArray(d.browser)
    ? d.browser.map(normalizeHeroImage).filter((x): x is HeroShowcaseImage => !!x)
    : [];
  const mobile = Array.isArray(d.mobile)
    ? d.mobile.map(normalizeHeroImage).filter((x): x is HeroShowcaseImage => !!x)
    : [];

  return {
    // `enabled` default true bila belum pernah diatur.
    enabled: typeof d.enabled === "boolean" ? d.enabled : DEFAULT_HERO_SHOWCASE.enabled,
    interval,
    effect,
    browser,
    mobile,
  };
}

function normalizeWhyUs(raw: unknown): ManagedWhyUs | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const title = str(d.title).trim();
  if (!title) return null;
  return {
    title,
    description: str(d.description),
    icon: str(d.icon, "sparkles"),
  };
}

function normalizeProcess(raw: unknown): ManagedProcess | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const title = str(d.title).trim();
  if (!title) return null;
  return {
    step: str(d.step),
    title,
    description: str(d.description),
  };
}

function normalizeStat(raw: unknown): ManagedStat | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const label = str(d.label).trim();
  if (!label) return null;
  const valueRaw = typeof d.value === "number" ? d.value : Number(d.value);
  return {
    value: Number.isFinite(valueRaw) ? valueRaw : 0,
    suffix: str(d.suffix),
    label,
  };
}

function normalizeTestimonial(raw: unknown): ManagedTestimonial | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const name = str(d.name).trim();
  if (!name) return null;
  const ratingRaw = typeof d.rating === "number" ? d.rating : Number(d.rating);
  const rating = Number.isFinite(ratingRaw)
    ? Math.min(5, Math.max(1, Math.round(ratingRaw)))
    : 5;
  return {
    name,
    role: str(d.role),
    quote: str(d.quote),
    rating,
  };
}

function normalizeTechnology(raw: unknown): ManagedTechnology | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const name = str(d.name).trim();
  if (!name) return null;
  return {
    name,
    logo: str(d.logo).trim(),
    color: str(d.color, "#64748B"),
    wordmark: bool(d.wordmark),
  };
}

/**
 * Menormalkan daftar: bila `raw` bukan array → pakai default (belum diatur).
 * Bila array (termasuk kosong) → hormati isinya, sehingga admin bisa
 * mengosongkan daftar dengan sengaja (undefined vs `[]`).
 */
function normalizeList<T>(
  raw: unknown,
  map: (x: unknown) => T | null,
  fallback: T[],
): T[] {
  if (!Array.isArray(raw)) return fallback;
  return raw.map(map).filter((x): x is T => !!x);
}

/** Menormalkan data mentah Firestore menjadi `SiteContent` yang valid. */
export function normalizeSiteContent(raw: Record<string, unknown>): SiteContent {
  const defaults = defaultSiteContent();

  return {
    // Daftar: `undefined` → pakai default (belum diatur); array (termasuk `[]`)
    // → hormati isinya (admin bisa sengaja mengosongkan).
    services: normalizeList(raw.services, normalizeService, defaults.services),
    faqs: normalizeList(raw.faqs, normalizeFaq, defaults.faqs),
    pricing: normalizeList(raw.pricing, normalizePricing, defaults.pricing),
    whyUs: normalizeList(raw.whyUs, normalizeWhyUs, defaults.whyUs),
    process: normalizeList(raw.process, normalizeProcess, defaults.process),
    stats: normalizeList(raw.stats, normalizeStat, defaults.stats),
    testimonials: normalizeList(
      raw.testimonials,
      normalizeTestimonial,
      defaults.testimonials,
    ),
    technologies: normalizeList(
      raw.technologies,
      normalizeTechnology,
      defaults.technologies,
    ),
    hero: normalizeHeroShowcase(raw.hero),
  };
}

/**
 * Mengambil konten situs (layanan, FAQ, harga) dari Firestore (server-side).
 * Fallback ke nilai default di content.ts bila kosong / belum dikonfigurasi.
 */
export async function getSiteContent(): Promise<SiteContent> {
  try {
    const { getAdminDb } = await import("@/lib/firebase-admin");
    const db = getAdminDb();
    if (!db) return defaultSiteContent();

    const snap = await db.collection(COLLECTION).doc(CONTENT_DOC_ID).get();
    if (!snap.exists) return defaultSiteContent();

    return normalizeSiteContent(snap.data() as Record<string, unknown>);
  } catch (err) {
    console.error("[site-content] gagal memuat:", err);
    return defaultSiteContent();
  }
}

/** Menyimpan seluruh konten situs sebagai satu dokumen. */
export async function saveSiteContent(
  content: SiteContent,
  updatedBy: string,
): Promise<void> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");

  await db
    .collection(COLLECTION)
    .doc(CONTENT_DOC_ID)
    .set(
      {
        services: content.services,
        faqs: content.faqs,
        pricing: content.pricing,
        hero: content.hero,
        whyUs: content.whyUs,
        process: content.process,
        stats: content.stats,
        testimonials: content.testimonials,
        technologies: content.technologies,
        updatedAtISO: new Date().toISOString(),
        updatedBy,
      },
      { merge: true },
    );
}
