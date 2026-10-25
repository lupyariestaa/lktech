/**
 * WORKFLOW SEO & KONTEN — logika murni (fase D5), bebas impor runtime.
 *
 * Tujuan: memberi admin PANDUAN dan PREVIEW yang mencerminkan aturan metadata
 * yang benar-benar dipakai aplikasi, tanpa memblokir publish dan tanpa
 * mengklaim batas pasti Google.
 *
 * Prinsip:
 * - **Panduan, bukan validasi keras**: rentang panjang judul/deskripsi adalah
 *   rekomendasi; tidak ada `blocking` kecuali aturan bisnis disetujui.
 * - **Preview = aturan nyata**: preview snipppet memakai judul/deskripsi hasil
 *   resolusi (meta bila ada, fallback judul/ringkasan) seperti yang dipakai
 *   metadata halaman.
 * - **Tanpa efek samping**: modul murni; tidak mengubah konten apa pun.
 */

/* ============================================================
 * Panduan panjang (satu sumber kebenaran untuk semua form)
 * ============================================================ */

/**
 * Rentang panjang rekomendasi (karakter). Ini HEURISTIK tampilan, bukan batas
 * resmi Google — beberapa judul di luar rentang tetap tampil utuh.
 */
export const SNIPPET_GUIDE = {
  title: { min: 30, max: 60 },
  description: { min: 70, max: 160 },
} as const;

export type SnippetField = keyof typeof SNIPPET_GUIDE;
export type SnippetFieldStatus = "kosong" | "pendek" | "ok" | "panjang";

/** Status panjang teks terhadap rentang rekomendasi. */
export function snippetStatus(
  length: number,
  range: { min: number; max: number },
): SnippetFieldStatus {
  if (length <= 0) return "kosong";
  if (length < range.min) return "pendek";
  if (length > range.max) return "panjang";
  return "ok";
}

/** Potong teks di batas kata terdekat ≤ `max` (untuk preview). */
export function truncateForDisplay(
  value: string,
  max: number,
): { text: string; truncated: boolean } {
  const clean = (value ?? "").trim();
  if (clean.length <= max) return { text: clean, truncated: false };
  const slice = clean.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return { text: `${cut.trimEnd()}…`, truncated: true };
}

/* ============================================================
 * Preview snippet gaya hasil pencarian
 * ============================================================ */

export type SnippetPreview = {
  /** Judul setelah dipotong sesuai lebar tampilan. */
  title: string;
  /** Deskripsi setelah dipotong. */
  description: string;
  /** URL yang ditampilkan (breadcrumb tanpa skema). */
  displayUrl: string;
  titleTruncated: boolean;
  descriptionTruncated: boolean;
};

/** Ubah origin + path menjadi breadcrumb ringkas ("lktech.id › blog › slug"). */
export function formatBreadcrumbUrl(origin: string, path: string): string {
  let host = (origin ?? "").replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (!host) host = "lktech.id";
  const segments = (path ?? "/")
    .split("?")[0]
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
  return [host, ...segments].join(" › ");
}

/**
 * Bangun preview snippet. Judul/deskripsi HARUS sudah diresolusi pemanggil
 * (mis. `seoTitle`/`seoDescription`), agar preview sama dengan metadata nyata.
 */
export function buildSnippetPreview(input: {
  title: string;
  description: string;
  path?: string;
  origin?: string;
  /** Judul fallback bila kosong (mis. judul artikel). */
  titleFallback?: string;
  /** Deskripsi fallback bila kosong (mis. ringkasan). */
  descriptionFallback?: string;
}): SnippetPreview {
  const title = (input.title?.trim() || input.titleFallback?.trim() || "").trim();
  const description = (
    input.description?.trim() ||
    input.descriptionFallback?.trim() ||
    ""
  ).trim();
  const titleCut = truncateForDisplay(title, SNIPPET_GUIDE.title.max);
  const descCut = truncateForDisplay(description, SNIPPET_GUIDE.description.max * 2);
  return {
    title: titleCut.text,
    description: descCut.text,
    displayUrl: formatBreadcrumbUrl(input.origin ?? "", input.path ?? "/"),
    titleTruncated: titleCut.truncated,
    descriptionTruncated: descCut.truncated,
  };
}

/* ============================================================
 * Analisis field meta (panduan + status)
 * ============================================================ */

export type SnippetFieldCheck = {
  value: string;
  length: number;
  status: SnippetFieldStatus;
  /** Pesan panduan untuk admin (bukan error validasi). */
  guidance: string;
};

function fieldCheck(
  field: SnippetField,
  raw: string,
  fallback: string,
): SnippetFieldCheck {
  const value = (raw?.trim() || fallback?.trim() || "").trim();
  const range = SNIPPET_GUIDE[field];
  const status = snippetStatus(value.length, range);
  const guidance =
    status === "kosong"
      ? field === "title"
        ? "Judul kosong — mesin pencari akan memakai judul halaman."
        : "Deskripsi kosong — mesin pencari dapat menyusun sendiri cuplikan."
      : status === "ok"
        ? `Panjang ideal (${range.min}–${range.max} karakter).`
        : status === "pendek"
          ? `Lebih pendek dari rekomendasi ${range.min}–${range.max} karakter.`
          : `Lebih panjang dari rekomendasi ${range.min}–${range.max} karakter; bagian akhir bisa terpotong di hasil pencarian.`;
  return { value, length: value.length, status, guidance };
}

/** Analisis judul & deskripsi untuk preview/panduan. */
export function analyzeSnippet(input: {
  title: string;
  description: string;
  titleFallback?: string;
  descriptionFallback?: string;
}): { title: SnippetFieldCheck; description: SnippetFieldCheck } {
  return {
    title: fieldCheck("title", input.title, input.titleFallback ?? ""),
    description: fieldCheck("description", input.description, input.descriptionFallback ?? ""),
  };
}

/* ============================================================
 * Validasi gambar Open Graph (aman, tanpa memuat gambar)
 * ============================================================ */

export type OgImageCheck = {
  status: "ok" | "warn" | "invalid";
  reason?: string;
};

/** Ekstensi gambar yang umum didukung crawler sosial. */
export const OG_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "avif"] as const;

/**
 * Validasi URL/`path` gambar OG secara statis (tanpa request).
 * - Kesalahan bentuk (skema aneh, spasi) → `invalid`.
 * - Ekstensi tidak dikenal / tanpa ekstensi → `warn` (mungkin tetap valid).
 */
export function validateOgImageUrl(raw: string): OgImageCheck {
  const value = (raw ?? "").trim();
  if (!value) return { status: "ok" };
  if (value === "default") return { status: "warn", reason: "Nilai \"default\" = tanpa gambar kustom." };
  if (/\s/.test(value)) return { status: "invalid", reason: "URL mengandung spasi." };

  const isRelative = value.startsWith("/");
  if (!isRelative && !/^https?:\/\//i.test(value)) {
    return { status: "invalid", reason: "Gunakan URL http(s) atau path internal (diawali \"/\")." };
  }

  try {
    // Validasi bentuk URL untuk nilai absolut.
    if (!isRelative) new URL(value);
  } catch {
    return { status: "invalid", reason: "URL tidak valid." };
  }

  const withoutQuery = value.split("?")[0].split("#")[0].toLowerCase();
  const ext = withoutQuery.includes(".") ? withoutQuery.slice(withoutQuery.lastIndexOf(".") + 1) : "";
  if (!ext) {
    return { status: "warn", reason: "Tanpa ekstensi gambar; pastikan Content-Type benar." };
  }
  if (!(OG_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
    return { status: "warn", reason: `Ekstensi ".${ext}" bukan format gambar yang umum.` };
  }
  return { status: "ok" };
}

/* ============================================================
 * Checklist pra-terbit
 * ============================================================ */

export type SeoChecklistStatus = "ok" | "warn" | "missing";

export type SeoChecklistItem = {
  id: string;
  label: string;
  status: SeoChecklistStatus;
  detail: string;
  /**
   * `true` hanya bila aturan bisnis yang DISETUJUI menghalangi publish.
   * Secara default SELALU `false` (lihat `SEO_CHECKLIST_BLOCKING_ENABLED`).
   */
  blocking: boolean;
};

/**
 * Saklar aturan pemblokiran. Sengaja `false`: checklist bersifat bantuan, bukan
 * penghalang. Ubah hanya bila pemilik produk menyetujui aturan bisnis eksplisit.
 */
export const SEO_CHECKLIST_BLOCKING_ENABLED = false;

export type SeoChecklistKind = "article" | "product" | "service";

export type SeoChecklistInput = {
  kind: SeoChecklistKind;
  /** Judul tampilan (fallback bila meta judul kosong). */
  title: string;
  /** Judul SEO terkait (`metaTitle`), bila ada. */
  metaTitle?: string;
  /** Deskripsi/ringkasan yang dipakai bila meta deskripsi kosong. */
  excerpt?: string;
  /** Deskripsi SEO (`metaDescription`), bila ada. */
  metaDescription?: string;
  slug?: string;
  /** Jumlah tautan internal (mis. dihitung dari body). `undefined` = tidak diperiksa. */
  internalLinkCount?: number;
  imageUrl?: string;
  imageAlt?: string;
  /** Hasil pemeriksaan unik judul oleh pemanggil. `undefined` = tidak diperiksa. */
  titleDuplicate?: boolean;
  slugDuplicate?: boolean;
  /** Path kanonik halaman (mis. "/blog/slug"). */
  canonicalPath?: string;
  /** `false` = halaman sengaja noindex. */
  indexable?: boolean;
  hasStructuredData?: boolean;
};

/** Struktur data yang diharapkan per jenis konten (untuk pesan checklist). */
export const SEO_STRUCTURED_DATA_BY_KIND: Record<SeoChecklistKind, string> = {
  article: "Article/BlogPosting",
  product: "Product (harga, ketersediaan, rating)",
  service: "Service/LocalBusiness",
};

/** Susun checklist pra-terbit. Tidak memblokir publish kecuali diaktifkan. */
export function buildSeoChecklist(input: SeoChecklistInput): SeoChecklistItem[] {
  const items: SeoChecklistItem[] = [];
  const blocking = SEO_CHECKLIST_BLOCKING_ENABLED;
  const add = (item: Omit<SeoChecklistItem, "blocking">) =>
    items.push({ ...item, blocking });

  const effectiveTitle = (input.metaTitle?.trim() || input.title?.trim() || "").trim();
  const effectiveDescription = (
    input.metaDescription?.trim() ||
    input.excerpt?.trim() ||
    ""
  ).trim();

  // Judul
  const titleStatus = snippetStatus(effectiveTitle.length, SNIPPET_GUIDE.title);
  add({
    id: "title.present",
    label: "Judul tersedia",
    status: effectiveTitle.length > 0 ? "ok" : "missing",
    detail: effectiveTitle.length > 0 ? effectiveTitle : "Belum ada judul.",
  });
  add({
    id: "title.length",
    label: "Panjang judul",
    status: titleStatus === "ok" ? "ok" : titleStatus === "kosong" ? "missing" : "warn",
    detail:
      titleStatus === "ok"
        ? `${effectiveTitle.length} karakter (ideal ${SNIPPET_GUIDE.title.min}–${SNIPPET_GUIDE.title.max}).`
        : `${effectiveTitle.length} karakter, di luar rekomendasi ${SNIPPET_GUIDE.title.min}–${SNIPPET_GUIDE.title.max}.`,
  });
  if (typeof input.titleDuplicate === "boolean") {
    add({
      id: "title.unique",
      label: "Judul unik",
      status: input.titleDuplicate ? "warn" : "ok",
      detail: input.titleDuplicate
        ? "Ada konten lain dengan judul serupa — pertimbangkan membedakan."
        : "Tidak ada judul serupa yang terdeteksi.",
    });
  }

  // Deskripsi
  const descStatus = snippetStatus(effectiveDescription.length, SNIPPET_GUIDE.description);
  add({
    id: "description.present",
    label: "Deskripsi tersedia",
    status: effectiveDescription.length > 0 ? "ok" : "missing",
    detail:
      effectiveDescription.length > 0
        ? effectiveDescription
        : "Belum ada deskripsi/ringkasan.",
  });
  add({
    id: "description.length",
    label: "Panjang deskripsi",
    status: descStatus === "ok" ? "ok" : descStatus === "kosong" ? "missing" : "warn",
    detail:
      descStatus === "ok"
        ? `${effectiveDescription.length} karakter (ideal ${SNIPPET_GUIDE.description.min}–${SNIPPET_GUIDE.description.max}).`
        : `${effectiveDescription.length} karakter, di luar rekomendasi ${SNIPPET_GUIDE.description.min}–${SNIPPET_GUIDE.description.max}.`,
  });

  // Slug
  if (input.slug !== undefined) {
    const slug = input.slug.trim();
    const cleanSlug = slug.length > 0 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
    add({
      id: "slug.valid",
      label: "Slug URL bersih",
      status: slug.length === 0 ? "warn" : cleanSlug ? "ok" : "warn",
      detail:
        slug.length === 0
          ? "Slug kosong — akan dibuat otomatis dari judul."
          : cleanSlug
            ? `/${slug}`
            : "Gunakan huruf kecil, angka, dan tanda hubung saja.",
    });
    if (typeof input.slugDuplicate === "boolean") {
      add({
        id: "slug.unique",
        label: "Slug unik",
        status: input.slugDuplicate ? "warn" : "ok",
        detail: input.slugDuplicate ? "Slug ini sudah dipakai konten lain." : "Slug belum dipakai.",
      });
    }
  }

  // Indexability & canonical
  if (input.indexable !== undefined) {
    add({
      id: "indexable",
      label: "Boleh diindeks",
      status: input.indexable ? "ok" : "warn",
      detail: input.indexable
        ? "Tidak ada noindex pada halaman ini."
        : "Halaman ditandai noindex — tidak akan muncul di hasil pencarian.",
    });
  }
  if (input.canonicalPath !== undefined) {
    add({
      id: "canonical",
      label: "Canonical",
      status: input.canonicalPath.trim() ? "ok" : "warn",
      detail: input.canonicalPath.trim() || "Canonical belum ditetapkan.",
    });
  }

  // Gambar & alt
  if (input.imageUrl !== undefined) {
    const og = validateOgImageUrl(input.imageUrl);
    add({
      id: "image.og",
      label: "Gambar Open Graph",
      status: og.status === "ok" ? "ok" : og.status === "warn" ? "warn" : "warn",
      detail: og.reason ?? (input.imageUrl.trim() || "Belum ada gambar; akan memakai gambar default situs."),
    });
  }
  if (input.imageAlt !== undefined) {
    add({
      id: "image.alt",
      label: "Teks alternatif gambar",
      status: input.imageAlt.trim() ? "ok" : "warn",
      detail: input.imageAlt.trim() || "Alt kosong — penting untuk a11y dan konteks gambar.",
    });
  }

  // Tautan internal
  if (typeof input.internalLinkCount === "number") {
    add({
      id: "internal.links",
      label: "Tautan internal",
      status: input.internalLinkCount > 0 ? "ok" : "warn",
      detail:
        input.internalLinkCount > 0
          ? `${input.internalLinkCount} tautan internal di body.`
          : "Belum ada tautan internal — membantu navigasi & konteks.",
    });
  }

  // Structured data
  if (typeof input.hasStructuredData === "boolean") {
    add({
      id: "structured.data",
      label: "Structured data",
      status: input.hasStructuredData ? "ok" : "warn",
      detail: input.hasStructuredData
        ? `Menyertakan ${SEO_STRUCTURED_DATA_BY_KIND[input.kind]}.`
        : `Belum menyertakan ${SEO_STRUCTURED_DATA_BY_KIND[input.kind]}.`,
    });
  }

  return items;
}

export type SeoChecklistSummary = {
  ok: number;
  warn: number;
  missing: number;
  total: number;
  blocking: number;
};

/** Ringkas status checklist. */
export function summarizeChecklist(
  items: readonly SeoChecklistItem[],
): SeoChecklistSummary {
  const summary: SeoChecklistSummary = { ok: 0, warn: 0, missing: 0, total: items.length, blocking: 0 };
  for (const item of items) {
    summary[item.status] += 1;
    if (item.blocking) summary.blocking += 1;
  }
  return summary;
}

/* ============================================================
 * Utilitas body
 * ============================================================ */

/**
 * Hitung tautan internal di body Markdown/HTML: tautan yang diawali "/" atau
 * menunjuk ke origin situs. Aman untuk teks kosong.
 */
export function countInternalLinks(body: string, origin?: string): number {
  const source = body ?? "";
  const host = (origin ?? "").replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  const re = /\[[^\]]*\]\(\s*([^)\s]+)/g;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const href = m[1];
    if (href.startsWith("/") && !href.startsWith("//")) count += 1;
    else if (host && /^https?:\/\//i.test(href) && href.includes(`://${host}`)) count += 1;
  }
  return count;
}
