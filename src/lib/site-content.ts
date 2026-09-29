import {
  defaultSiteContent,
  DEFAULT_HERO_SHOWCASE,
  type HeroShowcase,
  type HeroShowcaseEffect,
  type HeroShowcaseImage,
  type ManagedFaq,
  type ManagedPricing,
  type ManagedService,
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

/** Menormalkan data mentah Firestore menjadi `SiteContent` yang valid. */
export function normalizeSiteContent(raw: Record<string, unknown>): SiteContent {
  const services = Array.isArray(raw.services)
    ? raw.services.map(normalizeService).filter((x): x is ManagedService => !!x)
    : [];
  const faqs = Array.isArray(raw.faqs)
    ? raw.faqs.map(normalizeFaq).filter((x): x is ManagedFaq => !!x)
    : [];
  const pricing = Array.isArray(raw.pricing)
    ? raw.pricing.map(normalizePricing).filter((x): x is ManagedPricing => !!x)
    : [];

  const defaults = defaultSiteContent();
  return {
    services: services.length > 0 ? services : defaults.services,
    faqs: faqs.length > 0 ? faqs : defaults.faqs,
    pricing: pricing.length > 0 ? pricing : defaults.pricing,
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
        updatedAtISO: new Date().toISOString(),
        updatedBy,
      },
      { merge: true },
    );
}
