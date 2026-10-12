/**
 * Pembangun JSON-LD (schema.org) murni (fase S2) — bebas impor runtime agar dapat
 * diuji Node. Menghasilkan node untuk `FAQPage`, `BreadcrumbList`, dan `ItemList`.
 *
 * Catatan SEO: `FAQPage` hanya untuk FAQ yang BENAR-BENAR ditampilkan di halaman
 * (sesuai pedoman Google). `BreadcrumbList` harus mencerminkan breadcrumb UI.
 */

/** Satu pasang tanya-jawab. */
export type FaqPair = { question: string; answer: string };

/** Satu item breadcrumb. `href` opsional (item terakhir biasanya tanpa tautan). */
export type BreadcrumbItem = { label: string; href?: string };

/** Item untuk `ItemList`. */
export type ListItem = { name: string; url: string };

export type JsonLd = Record<string, unknown>;

/** Buang tag HTML sederhana & rapikan spasi (FAQ answer bisa berisi markup ringan). */
function plainText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Bangun node `FAQPage`. Mengembalikan `null` bila tidak ada FAQ valid — agar
 * pemanggil tidak merender script kosong.
 */
export function buildFaqPage(faqs: readonly FaqPair[]): JsonLd | null {
  const items = (faqs ?? [])
    .map((f) => ({
      question: plainText(f?.question ?? ""),
      answer: plainText(f?.answer ?? ""),
    }))
    .filter((f) => f.question.length > 0 && f.answer.length > 0);

  if (items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/**
 * Bangun node `BreadcrumbList` dari item breadcrumb UI.
 *
 * @param items  Daftar breadcrumb (urut dari beranda).
 * @param baseUrl URL absolut situs (mis. "https://lktech.id").
 *
 * Mengembalikan `null` bila kurang dari 2 item (breadcrumb tunggal tak bermakna).
 * `href` relatif (diawali "/") otomatis dijadikan absolut dengan `baseUrl`.
 */
export function buildBreadcrumb(
  items: readonly BreadcrumbItem[],
  baseUrl: string,
): JsonLd | null {
  const base = baseUrl.replace(/\/+$/, "");
  const elements = (items ?? [])
    .filter((it) => it && it.label)
    .map((it, i) => {
      const node: Record<string, unknown> = {
        "@type": "ListItem",
        position: i + 1,
        name: it.label,
      };
      if (it.href) {
        node.item = it.href.startsWith("http") ? it.href : `${base}${it.href === "/" ? "" : it.href}`;
      }
      return node;
    });

  if (elements.length < 2) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: elements,
  };
}

/**
 * Bangun node `ItemList` (representasi katalog/daftar). Mengembalikan `null`
 * bila tidak ada item.
 */
export function buildItemList(
  items: readonly ListItem[],
  name?: string,
): JsonLd | null {
  const elements = (items ?? [])
    .filter((it) => it && it.name && it.url)
    .map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.url,
    }));

  if (elements.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    ...(name ? { name } : {}),
    numberOfItems: elements.length,
    itemListElement: elements,
  };
}

/** Serialisasi aman untuk `<script type="application/ld+json">`. */
export function jsonLdString(node: JsonLd): string {
  return JSON.stringify(node);
}

/* ============================================================
 * Fase S3 — pembangun tambahan (murni & teruji)
 * ============================================================ */

/** Satu ulasan minimal untuk node `Review`. */
export type ReviewInput = {
  buyerName?: string;
  rating: number;
  title?: string;
  body?: string;
  createdAtISO: string;
};

/**
 * Bangun array node `Review` untuk schema `Product.review` (fase S3).
 * Hanya menyertakan ulasan dengan rating valid (1..5). Mengembalikan `[]` bila
 * tidak ada yang valid (pemanggil tak menyertakan field `review`).
 */
export function buildReviewNodes(reviews: readonly ReviewInput[]): JsonLd[] {
  return (reviews ?? [])
    .filter((r) => Number.isFinite(r?.rating) && r.rating >= 1 && r.rating <= 5)
    .map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.buyerName?.trim() || "Pembeli LKTech" },
      datePublished: r.createdAtISO,
      ...(r.title ? { name: plainText(r.title) } : {}),
      reviewBody: plainText(r.body || r.title || "Ulasan pembeli terverifikasi."),
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
    }));
}

/** Spesifikasi jam operasional (input). */
export type OpeningHoursInput = {
  days: readonly string[];
  opens: string;
  closes: string;
};

/** Bangun array `OpeningHoursSpecification` (fase S3). */
export function buildOpeningHours(hours: readonly OpeningHoursInput[]): JsonLd[] {
  return (hours ?? [])
    .filter((h) => h && h.days?.length > 0 && h.opens && h.closes)
    .map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [...h.days],
      opens: h.opens,
      closes: h.closes,
    }));
}

/**
 * Bangun node `SearchAction` (sitelinks searchbox) untuk `WebSite.potentialAction`
 * (fase S3). `urlTemplate` harus memuat placeholder `{search_term_string}`.
 */
export function buildSearchAction(
  urlTemplate: string,
  queryInputName = "search_term_string",
): JsonLd {
  return {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate },
    "query-input": `required name=${queryInputName}`,
  };
}

/** Normalisasi daftar URL sosial menjadi `sameAs` (hanya http/https, unik). */
export function buildSameAs(urls: readonly (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls ?? []) {
    const u = (raw ?? "").trim();
    if (!u || !/^https?:\/\//i.test(u) || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

/** Tanggal `priceValidUntil` (yyyy-mm-dd) — N hari dari `from` (default 365). */
export function priceValidUntil(from: Date, days = 365): string {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}
