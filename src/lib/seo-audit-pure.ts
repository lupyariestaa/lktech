/**
 * AUDIT SEO TEKNIS BERBASIS INVENTARIS URL (fase D4) — logika murni, bebas
 * impor runtime agar dapat diuji Node tanpa jaringan.
 *
 * Prinsip (lihat `docs/2026-10-25-planning-pengembangan-seo-dashboard.md`):
 * - **Hanya URL publik same-origin**: setiap pemeriksaan lewat crawler wajib
 *   divalidasi origin terhadap situs; URL asing/port lain/skema aneh ditolak
 *   (pencegahan SSRF). Modul ini memuat guard `isSameOriginAllowed`.
 * - **Bukan kesimpulan indexing**: tidak ada datanya status indexing Google di
 *   sini. Laporan hanya membedakan "tidak ada di sitemap" dari pemeriksaan HTTP.
 *   "Tidak terindeks Google" TIDAK dapat disimpulkan dari audit ini.
 * - **Heuristik transparan**: batas panjang judul/deskripsi ditandai `heuristic`
 *   dan bukan aturan resmi Google.
 * - **Deterministik & teruji**: seluruh keputusan berbasis fakta yang diberikan
 *   pemanggil (status, HTML, header), sehingga hasil dapat direproduksi.
 */

/** Versi aturan audit; disimpan bersama hasil agar perubahan aturan terlacak. */
export const SEO_AUDIT_RULE_VERSION = "d4.1";

/* ============================================================
 * Tipe dasar
 * ============================================================ */

export type SeoAuditSeverity = "critical" | "high" | "medium" | "low";

/** Peringkat keparahan (kecil = lebih mendesak). */
export const SEO_AUDIT_SEVERITY_RANK: Record<SeoAuditSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export type SeoAuditIssueCode =
  | "fetch_failed"
  | "http_error"
  | "redirect_external"
  | "redirect"
  | "noindex"
  | "canonical_missing"
  | "canonical_mismatch"
  | "title_missing"
  | "title_length"
  | "description_missing"
  | "description_length"
  | "og_incomplete"
  | "jsonld_invalid"
  | "not_in_sitemap"
  | "not_checked";

export const SEO_AUDIT_ISSUE_LABEL: Record<SeoAuditIssueCode, string> = {
  fetch_failed: "Gagal mengambil halaman",
  http_error: "HTTP error (4xx/5xx)",
  redirect_external: "Redirect ke luar situs",
  redirect: "URL di-redirect",
  noindex: "Tidak boleh diindeks (noindex)",
  canonical_missing: "Canonical tidak ada",
  canonical_mismatch: "Canonical menunjuk URL lain",
  title_missing: "Judul (title) kosong",
  title_length: "Panjang judul di luar rentang wajar",
  description_missing: "Meta description kosong",
  description_length: "Panjang meta description di luar rentang wajar",
  og_incomplete: "Open Graph tidak lengkap",
  jsonld_invalid: "JSON-LD tidak dapat diparse",
  not_in_sitemap: "Tidak ditemukan di sitemap",
  not_checked: "Tidak diperiksa (batas waktu audit)",
};

export type SeoAuditIssue = {
  code: SeoAuditIssueCode;
  severity: SeoAuditSeverity;
  /** Penjelasan singkat, aman ditampilkan (tanpa data sensitif). */
  message: string;
  /** `true` bila ambang/penilaian bersifat heuristik internal (bukan standar resmi). */
  heuristic?: boolean;
  /** Detail pendek opsional (mis. nilai yang ditemukan). */
  detail?: string;
};

/* ============================================================
 * Grup inventaris (dipakai UI & server; satu sumber kebenaran)
 * ============================================================ */

export type AuditInventoryGroup =
  | "Halaman statis"
  | "Layanan"
  | "Layanan × Kota"
  | "Portofolio"
  | "Artikel"
  | "Produk"
  | "Kategori blog"
  | "Tag blog";

/** Grup yang dapat dipilih admin saat menjalankan audit. */
export const AUDIT_INVENTORY_GROUPS: AuditInventoryGroup[] = [
  "Halaman statis",
  "Layanan",
  "Layanan × Kota",
  "Portofolio",
  "Artikel",
  "Produk",
  "Kategori blog",
  "Tag blog",
];

/* ============================================================
 * Batas crawler (dokumentasi cakupan & keamanan)
 * ============================================================ */

export type SeoAuditLimits = {
  /** Maksimum URL yang diaudit per run. */
  maxUrls: number;
  /** Timeout per permintaan (ms). */
  timeoutMs: number;
  /** Maksimum byte body yang dibaca per halaman. */
  maxBodyBytes: number;
  /** Maksimum redirect yang diikuti (dan tetap harus same-origin). */
  maxRedirects: number;
  /** Maksimum permintaan paralel. */
  concurrency: number;
  /**
   * Anggaran waktu TOTAL untuk seluruh audit (ms), termasuk pengambilan sitemap.
   * Setelah terlampaui, URL yang belum diproses ditandai `not_checked` (bukan
   * dianggap error halaman) sehingga respons tetap selesai sebelum batas fungsi.
   */
  budgetMs: number;
};

export const DEFAULT_SEO_AUDIT_LIMITS: SeoAuditLimits = {
  maxUrls: 60,
  timeoutMs: 8000,
  maxBodyBytes: 512 * 1024,
  maxRedirects: 3,
  concurrency: 4,
  /** Sisa ~15s untuk simpan hasil + audit log sebelum `maxDuration` route (60s). */
  budgetMs: 45_000,
};

/** Batas rentang panjang judul (heuristik, bukan aturan resmi Google). */
export const TITLE_LENGTH_RANGE = { min: 15, max: 60 } as const;
/** Batas rentang panjang meta description (heuristik). */
export const DESCRIPTION_LENGTH_RANGE = { min: 50, max: 160 } as const;

/* ============================================================
 * Guard SSRF: hanya origin situs yang boleh diaudit
 * ============================================================ */

/**
 * `true` bila `candidate` adalah URL http(s) absolut yang origin-nya persis sama
 * dengan `origin`, tanpa kredensial. Menolak skema non-http, host asing, port
 * berbeda, dan `user:pass@` (mencegah crawler diarahkan ke jaringan internal).
 */
export function isSameOriginAllowed(
  origin: string | undefined | null,
  candidate: string,
): boolean {
  if (!origin) return false;
  try {
    const base = new URL(origin);
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    return url.origin === base.origin;
  } catch {
    return false;
  }
}

/**
 * Validasi path internal untuk inventaris: harus dimulai "/" dan bukan
 * protocol-relative ("//"), tanpa backslash/whitespace/kontrol. Mengembalikan
 * path ternormalisasi atau `null`.
 */
export function normalizeAuditPath(raw: string | undefined | null): string | null {
  const value = (raw ?? "").trim();
  if (!value || !value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (/[\\\s]/.test(value)) return null;
  // Buang hash; pertahankan query agar URL kanonik yang memakai query tetap utuh.
  const withoutHash = value.split("#")[0];
  if (withoutHash.length === 0 || withoutHash.length > 500) return null;
  return withoutHash;
}

/** Gabungkan origin + path menjadi URL absolut. Mengembalikan `null` bila tak valid. */
export function absoluteAuditUrl(origin: string, path: string): string | null {
  const normalized = normalizeAuditPath(path);
  if (!normalized) return null;
  try {
    const url = new URL(normalized, origin);
    return isSameOriginAllowed(origin, url.toString()) ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Bandingkan dua path tanpa membedakan trailing slash (kecuali root). */
export function comparablePath(pathname: string): string {
  const p = pathname || "/";
  if (p === "/") return "/";
  return p.replace(/\/+$/, "");
}

/* ============================================================
 * Parsing HTML (bounded, regex sederhana)
 * ============================================================ */

export type ParsedHtmlFacts = {
  title: string | null;
  description: string | null;
  robots: string | null;
  canonical: string | null;
  og: { title: string | null; description: string | null; image: string | null };
  jsonLdCount: number;
  jsonLdInvalidCount: number;
};

/** Dekode entitas HTML dasar yang umum pada judul/deskripsi. */
export function decodeEntities(input: string): string {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ambil nilai atribut dari string tag HTML (mis. `<meta name="x" content="y">`). */
function attr(tag: string, name: string): string | null {
  const re = new RegExp(
    `${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>=]+))`,
    "i",
  );
  const m = re.exec(tag);
  if (!m) return null;
  const value = m[1] ?? m[2] ?? m[3] ?? "";
  return decodeEntities(value);
}

/**
 * Parse fakta SEO dari sampel HTML. Mengembalikan nilai `null` bila tidak ada.
 * Aman untuk HTML terpotong: pemanggil sudah membatasi ukuran body.
 */
export function parseHtmlFacts(html: string): ParsedHtmlFacts {
  const source = html ?? "";

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(source);
  const title = titleMatch ? decodeEntities(titleMatch[1]) : null;

  let description: string | null = null;
  let ogTitle: string | null = null;
  let ogDescription: string | null = null;
  let ogImage: string | null = null;
  const metaRe = /<meta\b[^>]*>/gi;
  let metaMatch: RegExpExecArray | null;
  while ((metaMatch = metaRe.exec(source)) !== null) {
    const tag = metaMatch[0];
    const name = (attr(tag, "name") ?? "").toLowerCase();
    const property = (attr(tag, "property") ?? "").toLowerCase();
    const content = attr(tag, "content");
    if (!content) continue;
    if (name === "description" && description === null) description = content;
    else if (property === "og:title" && ogTitle === null) ogTitle = content;
    else if (property === "og:description" && ogDescription === null) ogDescription = content;
    else if (property === "og:image" && ogImage === null) ogImage = content;
  }

  let robots: string | null = null;
  let canonical: string | null = null;
  const linkRe = /<link\b[^>]*>/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRe.exec(source)) !== null) {
    const tag = linkMatch[0];
    const rel = (attr(tag, "rel") ?? "").toLowerCase();
    if (rel === "canonical" && canonical === null) canonical = attr(tag, "href");
  }
  // `robots` juga bisa ada di `<meta name="robots">` — ambil dari meta loop kedua.
  const robotsMetaRe = /<meta\b[^>]*>/gi;
  let robotsMatch: RegExpExecArray | null;
  while ((robotsMatch = robotsMetaRe.exec(source)) !== null) {
    const tag = robotsMatch[0];
    if ((attr(tag, "name") ?? "").toLowerCase() === "robots") {
      robots = attr(tag, "content");
      break;
    }
  }

  let jsonLdCount = 0;
  let jsonLdInvalidCount = 0;
  const jsonLdRe =
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch: RegExpExecArray | null;
  while ((jsonLdMatch = jsonLdRe.exec(source)) !== null) {
    jsonLdCount += 1;
    const body = jsonLdMatch[1].trim();
    if (body.length === 0) {
      jsonLdInvalidCount += 1;
      continue;
    }
    try {
      JSON.parse(body);
    } catch {
      jsonLdInvalidCount += 1;
    }
  }

  return {
    title,
    description,
    robots,
    canonical,
    og: { title: ogTitle, description: ogDescription, image: ogImage },
    jsonLdCount,
    jsonLdInvalidCount,
  };
}

/** `true` bila konten meta robots / header X-Robots-Tag melarang indexing. */
export function isNoindex(...directives: Array<string | null | undefined>): boolean {
  return directives.some((d) => {
    const value = (d ?? "").toLowerCase();
    if (!value) return false;
    if (/\bnoindex\b/.test(value)) return true;
    // `none` setara dengan "noindex, nofollow".
    return /\bnone\b/.test(value);
  });
}

/* ============================================================
 * Evaluasi satu halaman
 * ============================================================ */

export type SeoAuditPageFacts = {
  /** Path internal (mis. "/blog/foo"). */
  path: string;
  /** Grup inventaris (mis. "Artikel", "Produk"). */
  group: string;
  /** Status HTTP akhir; 0 bila permintaan gagal. */
  httpStatus: number;
  /** Error permintaan (kode aman), bila ada. */
  fetchError?: string | null;
  finalUrl: string | null;
  redirected: boolean;
  redirectExternal: boolean;
  /** Content-Type respons (tanpa charset). */
  contentType?: string | null;
  html: string | null;
  /** Header `X-Robots-Tag`. */
  xRobotsTag?: string | null;
  inSitemap: boolean;
  /** Waktu pemeriksaan ISO. */
  checkedAt: string;
};

export type SeoAuditPage = {
  path: string;
  group: string;
  httpStatus: number;
  finalUrl: string | null;
  redirected: boolean;
  inSitemap: boolean;
  checkedAt: string;
  /** Judul yang terdeteksi (untuk tampilan), bila ada. */
  title: string | null;
  issues: SeoAuditIssue[];
};

function push(
  issues: SeoAuditIssue[],
  issue: SeoAuditIssue,
): void {
  issues.push(issue);
}

/**
 * Evaluasi satu halaman dari fakta yang sudah dikumpulkan crawler.
 * `origin` dipakai untuk memvalidasi canonical (anti-canonical lintas host).
 */
export function analyzePage(facts: SeoAuditPageFacts, origin: string): SeoAuditPage {
  const issues: SeoAuditIssue[] = [];

  if (facts.fetchError === "budget_exceeded") {
    push(issues, {
      code: "not_checked",
      severity: "low",
      message:
        "Halaman tidak diperiksa karena batas waktu audit tercapai. Jalankan ulang atau pilih grup yang lebih kecil.",
      detail: "budget_exceeded",
    });
  } else if (facts.fetchError || facts.httpStatus === 0) {
    push(issues, {
      code: "fetch_failed",
      severity: "critical",
      message: "Halaman tidak dapat diambil, status tidak dapat diverifikasi.",
      detail: facts.fetchError ?? undefined,
    });
  } else if (facts.httpStatus >= 400) {
    push(issues, {
      code: "http_error",
      severity: "high",
      message: `Halaman mengembalikan status HTTP ${facts.httpStatus}.`,
    });
  }

  if (facts.redirectExternal) {
    push(issues, {
      code: "redirect_external",
      severity: "critical",
      message: "URL mengarah (redirect) ke luar origin situs.",
    });
  } else if (facts.redirected) {
    push(issues, {
      code: "redirect",
      severity: "low",
      message: "URL di-redirect; sebaiknya sitemap menunjuk URL final.",
      detail: facts.finalUrl ? `final: ${facts.finalUrl}` : undefined,
    });
  }

  const hasHtml = typeof facts.html === "string" && facts.html.length > 0;
  const parsed = hasHtml ? parseHtmlFacts(facts.html as string) : null;

  if (parsed) {
    if (isNoindex(parsed.robots, facts.xRobotsTag)) {
      push(issues, {
        code: "noindex",
        severity: "critical",
        message: "Halaman bertanda noindex; tidak akan diindeks mesin pencari.",
        detail: (parsed.robots ?? facts.xRobotsTag ?? undefined) || undefined,
      });
    }

    if (!parsed.title) {
      push(issues, { code: "title_missing", severity: "high", message: "Tag <title> tidak ditemukan atau kosong." });
    } else if (parsed.title.length < TITLE_LENGTH_RANGE.min || parsed.title.length > TITLE_LENGTH_RANGE.max) {
      push(issues, {
        code: "title_length",
        severity: "low",
        message: `Panjang judul ${parsed.title.length} karakter di luar rentang wajar ${TITLE_LENGTH_RANGE.min}–${TITLE_LENGTH_RANGE.max}.`,
        heuristic: true,
      });
    }

    if (!parsed.description) {
      push(issues, {
        code: "description_missing",
        severity: "medium",
        message: "Meta description tidak ditemukan atau kosong.",
      });
    } else if (
      parsed.description.length < DESCRIPTION_LENGTH_RANGE.min ||
      parsed.description.length > DESCRIPTION_LENGTH_RANGE.max
    ) {
      push(issues, {
        code: "description_length",
        severity: "low",
        message: `Panjang meta description ${parsed.description.length} karakter di luar rentang wajar ${DESCRIPTION_LENGTH_RANGE.min}–${DESCRIPTION_LENGTH_RANGE.max}.`,
        heuristic: true,
      });
    }

    if (!parsed.canonical) {
      push(issues, { code: "canonical_missing", severity: "medium", message: "Tautan canonical tidak ditemukan." });
    } else {
      const canonicalIssue = checkCanonical(parsed.canonical, facts.finalUrl ?? absoluteAuditUrl(origin, facts.path), origin);
      if (canonicalIssue) push(issues, canonicalIssue);
    }

    if (!parsed.og.title || !parsed.og.description || !parsed.og.image) {
      const missing = [
        !parsed.og.title ? "og:title" : null,
        !parsed.og.description ? "og:description" : null,
        !parsed.og.image ? "og:image" : null,
      ].filter((v): v is string => v !== null);
      push(issues, {
        code: "og_incomplete",
        severity: "low",
        message: `Open Graph tidak lengkap (${missing.join(", ")}).`,
        detail: missing.join(", "),
      });
    }

    if (parsed.jsonLdInvalidCount > 0) {
      push(issues, {
        code: "jsonld_invalid",
        severity: "high",
        message: `${parsed.jsonLdInvalidCount} blok JSON-LD gagal diparse (structured data rusak).`,
      });
    }
  }

  if (!facts.inSitemap) {
    push(issues, {
      code: "not_in_sitemap",
      severity: "medium",
      message: "URL tidak ditemukan di sitemap.xml. Ini bukan berarti tidak terindeks Google.",
    });
  }

  return {
    path: facts.path,
    group: facts.group,
    httpStatus: facts.httpStatus,
    finalUrl: facts.finalUrl,
    redirected: facts.redirected,
    inSitemap: facts.inSitemap,
    checkedAt: facts.checkedAt,
    title: parsed?.title ?? null,
    issues,
  };
}

/** Periksa canonical: host asing = critical, path berbeda = high, sama = tidak apa-apa. */
function checkCanonical(
  canonical: string,
  finalUrl: string | null,
  origin: string,
): SeoAuditIssue | null {
  let resolved: URL;
  try {
    resolved = new URL(canonical, finalUrl ?? origin);
  } catch {
    return {
      code: "canonical_mismatch",
      severity: "high",
      message: "Canonical bukan URL yang valid.",
      detail: canonical.slice(0, 200),
    };
  }

  if (!isSameOriginAllowed(origin, resolved.toString())) {
    return {
      code: "canonical_mismatch",
      severity: "critical",
      message: "Canonical menunjuk origin/host lain (berisiko duplikasi/kebocoran).",
      detail: canonical.slice(0, 200),
    };
  }

  if (finalUrl) {
    try {
      const finalPath = comparablePath(new URL(finalUrl).pathname);
      const canonicalPath = comparablePath(resolved.pathname);
      if (finalPath !== canonicalPath) {
        return {
          code: "canonical_mismatch",
          severity: "high",
          message: "Canonical menunjuk path berbeda dari URL yang diaudit.",
          detail: `${canonicalPath} ≠ ${finalPath}`,
        };
      }
    } catch {
      /* finalUrl tidak valid → lewati perbandingan path */
    }
  }
  return null;
}

/* ============================================================
 * Sitemap
 * ============================================================ */

/** Ambil semua `<loc>` dari XML sitemap. Aman untuk XML terpotong. */
export function parseSitemapXml(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([\s\S]*?)\s*<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml ?? "")) !== null) {
    const url = match[1].replace(/&amp;/g, "&").trim();
    if (url) out.push(url);
  }
  return out;
}

/**
 * Ubah daftar URL sitemap menjadi himpunan path same-origin (ternormalisasi).
 * URL di luar origin diabaikan (sitemap seharusnya hanya berisi origin situs).
 */
export function sitemapPaths(urls: readonly string[], origin: string): Set<string> {
  const set = new Set<string>();
  for (const raw of urls) {
    if (!isSameOriginAllowed(origin, raw)) continue;
    try {
      const url = new URL(raw);
      const path = comparablePath(url.pathname);
      set.add(url.search ? `${path}${url.search}` : path);
    } catch {
      /* lewati */
    }
  }
  return set;
}

/* ============================================================
 * Ringkasan & pengurutan
 * ============================================================ */

export type SeoAuditSummary = {
  pages: number;
  ok: number;
  withIssues: number;
  errors: number;
  inSitemap: number;
  notInSitemap: number;
  bySeverity: Record<SeoAuditSeverity, number>;
  byCode: Record<string, number>;
};

/** Keparahan tertinggi sebuah halaman (untuk pengurutan dampak). */
export function pageSeverity(page: SeoAuditPage): SeoAuditSeverity | null {
  let worst: SeoAuditSeverity | null = null;
  for (const issue of page.issues) {
    if (worst === null || SEO_AUDIT_SEVERITY_RANK[issue.severity] < SEO_AUDIT_SEVERITY_RANK[worst]) {
      worst = issue.severity;
    }
  }
  return worst;
}

/** Urutkan halaman: keparahan tertinggi dulu, lalu jumlah masalah, lalu path. */
export function sortAuditPages(pages: readonly SeoAuditPage[]): SeoAuditPage[] {
  const rank = (p: SeoAuditPage) => {
    const s = pageSeverity(p);
    return s === null ? 99 : SEO_AUDIT_SEVERITY_RANK[s];
  };
  return [...pages].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      b.issues.length - a.issues.length ||
      a.path.localeCompare(b.path),
  );
}

/** Hitung ringkasan agregat dari daftar halaman. */
export function summarizeAudit(pages: readonly SeoAuditPage[]): SeoAuditSummary {
  const bySeverity: Record<SeoAuditSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  const byCode: Record<string, number> = {};
  let ok = 0;
  let errors = 0;
  let inSitemap = 0;

  for (const page of pages) {
    const unchecked = page.issues.some((issue) => issue.code === "not_checked");
    if (page.inSitemap) inSitemap += 1;
    if (page.issues.length === 0) ok += 1;
    // Halaman yang sengaja dilewati karena batas waktu BUKAN error halaman.
    if (!unchecked && (page.httpStatus === 0 || page.httpStatus >= 400)) errors += 1;
    for (const issue of page.issues) {
      bySeverity[issue.severity] += 1;
      byCode[issue.code] = (byCode[issue.code] ?? 0) + 1;
    }
  }

  return {
    pages: pages.length,
    ok,
    withIssues: pages.length - ok,
    errors,
    inSitemap,
    notInSitemap: pages.length - inSitemap,
    bySeverity,
    byCode,
  };
}

/** Satu masalah teragregasi lintas URL (untuk daftar prioritas di UI). */
export type SeoAuditGroupedIssue = {
  code: SeoAuditIssueCode;
  label: string;
  severity: SeoAuditSeverity;
  count: number;
  paths: string[];
};

/** Kelompokkan masalah per kode, terurut berdasarkan dampak teknis. */
export function groupIssuesByCode(
  pages: readonly SeoAuditPage[],
  maxPaths = 20,
): SeoAuditGroupedIssue[] {
  const map = new Map<SeoAuditIssueCode, SeoAuditGroupedIssue>();
  for (const page of pages) {
    for (const issue of page.issues) {
      const existing = map.get(issue.code);
      if (existing) {
        existing.count += 1;
        if (existing.paths.length < maxPaths) existing.paths.push(page.path);
        if (SEO_AUDIT_SEVERITY_RANK[issue.severity] < SEO_AUDIT_SEVERITY_RANK[existing.severity]) {
          existing.severity = issue.severity;
        }
      } else {
        map.set(issue.code, {
          code: issue.code,
          label: SEO_AUDIT_ISSUE_LABEL[issue.code],
          severity: issue.severity,
          count: 1,
          paths: [page.path],
        });
      }
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      SEO_AUDIT_SEVERITY_RANK[a.severity] - SEO_AUDIT_SEVERITY_RANK[b.severity] ||
      b.count - a.count ||
      a.code.localeCompare(b.code),
  );
}

/* ============================================================
 * Laporan
 * ============================================================ */

export type SeoAuditReport = {
  ruleVersion: string;
  origin: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  /** `true` bila inventaris dipotong karena batas `maxUrls`. */
  truncated: boolean;
  /** Jumlah URL di inventaris sebelum pemotongan. */
  inventorySize: number;
  /** `true` bila sitemap.xml berhasil diambil & diparse. */
  sitemapChecked: boolean;
  /** Error sitemap (kode aman), bila ada — membedakan "tidak ada di sitemap" dari "sitemap gagal". */
  sitemapError?: string | null;
  /** `true` bila sebagian URL tidak diperiksa karena batas waktu audit tercapai. */
  budgetExceeded: boolean;
  /** Jumlah URL yang tidak diperiksa karena batas waktu. */
  unchecked: number;
  limits: SeoAuditLimits;
  summary: SeoAuditSummary;
  grouped: SeoAuditGroupedIssue[];
  pages: SeoAuditPage[];
  /** Catatan keterbatasan tetap (ditampilkan di UI). */
  limitations: string[];
};

export const SEO_AUDIT_BASE_LIMITATIONS = [
  "Audit ini memeriksa HTML yang dilayani publik, bukan status indexing Google.",
  "\"Tidak ada di sitemap\" berbeda dari \"tidak terindeks Google\" — keduanya tidak dapat disimpulkan satu sama lain.",
  "Halaman yang dirender sepenuhnya di klien (CSR) mungkin tidak menampilkan metadata lengkap pada HTML awal.",
  "Batas panjang judul/deskripsi adalah heuristik internal LKTech, bukan aturan resmi Google.",
];

/** Susun laporan audit lengkap dari hasil per halaman. */
export function buildAuditReport(input: {
  origin: string;
  pages: readonly SeoAuditPage[];
  startedAt: string;
  finishedAt: string;
  truncated: boolean;
  inventorySize: number;
  sitemapChecked: boolean;
  sitemapError?: string | null;
  limits: SeoAuditLimits;
}): SeoAuditReport {
  const pages = sortAuditPages(input.pages);
  const start = Date.parse(input.startedAt);
  const end = Date.parse(input.finishedAt);
  const unchecked = pages.filter((page) => page.issues.some((issue) => issue.code === "not_checked")).length;
  const budgetExceeded = unchecked > 0;
  return {
    ruleVersion: SEO_AUDIT_RULE_VERSION,
    origin: input.origin,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    durationMs: Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : 0,
    truncated: input.truncated,
    inventorySize: input.inventorySize,
    sitemapChecked: input.sitemapChecked,
    sitemapError: input.sitemapError ?? null,
    budgetExceeded,
    unchecked,
    limits: input.limits,
    summary: summarizeAudit(pages),
    grouped: groupIssuesByCode(pages),
    pages,
    limitations: budgetExceeded
      ? [
          ...SEO_AUDIT_BASE_LIMITATIONS,
          "Sebagian halaman tidak diperiksa karena batas waktu audit; jalankan ulang atau pilih grup inventaris yang lebih kecil.",
        ]
      : [...SEO_AUDIT_BASE_LIMITATIONS],
  };
}
