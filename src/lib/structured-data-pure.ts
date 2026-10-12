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
