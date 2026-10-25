import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DESCRIPTION_LENGTH_RANGE,
  TITLE_LENGTH_RANGE,
  analyzePage,
  isNoindex,
  parseHtmlFacts,
  type SeoAuditIssueCode,
  type SeoAuditPageFacts,
} from "../src/lib/seo-audit-pure.ts";

/**
 * QA metadata (fase D7) — memeriksa canonical/robots/JSON-LD pada SAMPEL rute
 * statis & dinamis memakai fixture, memakai aturan yang SAMA dengan audit
 * produksi (`parseHtmlFacts`/`analyzePage`/`isNoindex`). Ini bukan crawl situs
 * dan bukan pemeriksaan status indexing Google.
 *
 * Jalankan: `npm run test:seo-metadata`
 */

const ORIGIN = "https://lktech.id";

const GOOD_TITLE = "LKTech — Jasa Pembuatan Website Profesional";
const GOOD_DESC =
  "LKTech menyediakan jasa pembuatan website, aplikasi, dan digital marketing untuk bisnis Anda di Indonesia dengan hasil terukur.";

/** Bangun dokumen HTML sampel; bagian yang `undefined` sengaja dihilangkan. */
function htmlDocument(parts: {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string;
  og?: boolean;
  jsonLd?: string | string[] | null;
}): string {
  const lines = ["<!doctype html><html lang=\"id\"><head>"];
  if (parts.title !== undefined) lines.push(`<title>${parts.title}</title>`);
  if (parts.description !== undefined) {
    lines.push(`<meta name="description" content="${parts.description}">`);
  }
  if (parts.robots !== undefined) lines.push(`<meta name="robots" content="${parts.robots}">`);
  if (parts.canonical !== undefined) {
    lines.push(`<link rel="canonical" href="${parts.canonical}">`);
  }
  if (parts.og !== false) {
    lines.push('<meta property="og:title" content="LKTech">');
    lines.push('<meta property="og:description" content="Deskripsi singkat.">');
    lines.push('<meta property="og:image" content="https://lktech.id/og.png">');
  }
  const blocks =
    parts.jsonLd === undefined
      ? ['{"@context":"https://schema.org","@type":"WebPage"}']
      : parts.jsonLd === null
        ? []
        : Array.isArray(parts.jsonLd)
          ? parts.jsonLd
          : [parts.jsonLd];
  for (const block of blocks) {
    lines.push(`<script type="application/ld+json">${block}</script>`);
  }
  lines.push("</head><body><h1>Contoh</h1></body></html>");
  return lines.join("");
}

/** Fakta halaman dengan default "sehat"; overrides untuk kasus negatif. */
function facts(input: {
  path: string;
  group: string;
  html?: string | null;
  inSitemap?: boolean;
  httpStatus?: number;
  xRobotsTag?: string | null;
  finalUrl?: string | null;
  redirected?: boolean;
  redirectExternal?: boolean;
}): SeoAuditPageFacts {
  return {
    path: input.path,
    group: input.group,
    httpStatus: input.httpStatus ?? 200,
    fetchError: null,
    finalUrl:
      input.finalUrl === undefined
        ? new URL(input.path, ORIGIN).toString()
        : input.finalUrl,
    redirected: input.redirected ?? false,
    redirectExternal: input.redirectExternal ?? false,
    contentType: "text/html; charset=utf-8",
    html: input.html ?? null,
    xRobotsTag: input.xRobotsTag ?? null,
    inSitemap: input.inSitemap ?? true,
    checkedAt: "2026-10-25T00:00:00.000Z",
  };
}

function codesOf(input: Parameters<typeof facts>[0]): SeoAuditIssueCode[] {
  return analyzePage(facts(input), ORIGIN).issues.map((issue) => issue.code);
}

/* ============================================================
 * Sampel rute statis & dinamis (metadata lengkap → tanpa isu)
 * ============================================================ */

const HEALTHY_ROUTES: Array<{
  kind: "statis" | "dinamis";
  path: string;
  group: string;
}> = [
  { kind: "statis", path: "/", group: "Sitemap statis" },
  { kind: "statis", path: "/tentang", group: "Sitemap statis" },
  { kind: "statis", path: "/kontak", group: "Sitemap statis" },
  { kind: "dinamis", path: "/layanan/web-development", group: "Layanan" },
  { kind: "dinamis", path: "/layanan/web-development/jakarta", group: "Layanan × Kota" },
  { kind: "dinamis", path: "/blog/panduan-seo-teknis", group: "Artikel" },
  { kind: "dinamis", path: "/produk/website-bisnis", group: "Produk" },
];

for (const route of HEALTHY_ROUTES) {
  test(`rute ${route.kind} ${route.path}: metadata lengkap → tanpa isu`, () => {
    const html = htmlDocument({
      title: GOOD_TITLE,
      description: GOOD_DESC,
      canonical: `${ORIGIN}${route.path === "/" ? "/" : route.path}`,
      robots: "index, follow",
    });
    const codes = codesOf({ path: route.path, group: route.group, html });
    assert.deepEqual(codes, []);
  });
}

/* ============================================================
 * Kasus negatif per kelompok aturan
 * ============================================================ */

test("robots: meta noindex terdeteksi", () => {
  const html = htmlDocument({
    title: GOOD_TITLE,
    description: GOOD_DESC,
    canonical: `${ORIGIN}/tentang`,
    robots: "noindex, nofollow",
  });
  assert.ok(codesOf({ path: "/tentang", group: "Sitemap statis", html }).includes("noindex"));
});

test("robots: header X-Robots-Tag noindex terdeteksi tanpa meta", () => {
  const html = htmlDocument({
    title: GOOD_TITLE,
    description: GOOD_DESC,
    canonical: `${ORIGIN}/tentang`,
    robots: "index, follow",
  });
  const codes = codesOf({
    path: "/tentang",
    group: "Sitemap statis",
    html,
    xRobotsTag: "noindex",
  });
  assert.ok(codes.includes("noindex"));
});

test("robots: nilai `none` setara noindex", () => {
  assert.equal(isNoindex("none"), true);
  assert.equal(isNoindex("noindex"), true);
  assert.equal(isNoindex("index, follow"), false);
  assert.equal(isNoindex(null, undefined, ""), false);
});

test("canonical: hilang → canonical_missing", () => {
  const html = htmlDocument({ title: GOOD_TITLE, description: GOOD_DESC, canonical: undefined });
  assert.ok(codesOf({ path: "/tentang", group: "Sitemap statis", html }).includes("canonical_missing"));
});

test("canonical: menunjuk path berbeda → canonical_mismatch", () => {
  const html = htmlDocument({
    title: GOOD_TITLE,
    description: GOOD_DESC,
    canonical: `${ORIGIN}/halaman-lain`,
  });
  assert.ok(codesOf({ path: "/tentang", group: "Sitemap statis", html }).includes("canonical_mismatch"));
});

test("canonical: menunjuk host asing → canonical_mismatch (kritis)", () => {
  const html = htmlDocument({
    title: GOOD_TITLE,
    description: GOOD_DESC,
    canonical: "https://situs-lain.com/tentang",
  });
  const page = analyzePage(facts({ path: "/tentang", group: "Sitemap statis", html }), ORIGIN);
  const issue = page.issues.find((i) => i.code === "canonical_mismatch");
  assert.equal(issue?.severity, "critical");
});

test("jsonld: blok tidak valid → jsonld_invalid; blok kosong juga dihitung", () => {
  const html = htmlDocument({
    title: GOOD_TITLE,
    description: GOOD_DESC,
    canonical: `${ORIGIN}/blog/panduan-seo-teknis`,
    jsonLd: ['{"@type":"Article"', '{"@type":"BreadcrumbList"}'],
  });
  assert.ok(
    codesOf({ path: "/blog/panduan-seo-teknis", group: "Artikel", html }).includes("jsonld_invalid"),
  );
});

test("judul/deskripsi: kosong → title_missing & description_missing", () => {
  const html = htmlDocument({ title: undefined, description: undefined, canonical: `${ORIGIN}/tentang` });
  const codes = codesOf({ path: "/tentang", group: "Sitemap statis", html });
  assert.ok(codes.includes("title_missing"));
  assert.ok(codes.includes("description_missing"));
});

test("judul/deskripsi: panjang di luar rentang ditandai HEURISTIK, bukan error", () => {
  const longTitle = "T".repeat(TITLE_LENGTH_RANGE.max + 5);
  const shortDesc = "terlalu singkat";
  const html = htmlDocument({
    title: longTitle,
    description: shortDesc,
    canonical: `${ORIGIN}/tentang`,
  });
  const page = analyzePage(facts({ path: "/tentang", group: "Sitemap statis", html }), ORIGIN);
  const titleIssue = page.issues.find((i) => i.code === "title_length");
  const descIssue = page.issues.find((i) => i.code === "description_length");
  assert.equal(titleIssue?.heuristic, true);
  assert.equal(descIssue?.heuristic, true);
  assert.ok(shortDesc.length < DESCRIPTION_LENGTH_RANGE.min);
});

test("sitemap: URL tidak ada di sitemap → not_in_sitemap (bukan klaim indexing)", () => {
  const html = htmlDocument({
    title: GOOD_TITLE,
    description: GOOD_DESC,
    canonical: `${ORIGIN}/produk/website-bisnis`,
  });
  const page = analyzePage(
    facts({ path: "/produk/website-bisnis", group: "Produk", html, inSitemap: false }),
    ORIGIN,
  );
  const issue = page.issues.find((i) => i.code === "not_in_sitemap");
  assert.ok(issue);
  // Pesannya harus menegaskan bahwa ini TIDAK menyimpulkan status indexing.
  assert.match(issue!.message, /bukan berarti tidak terindeks/i);
});

test("http error: status 4xx/5xx dilaporkan sebagai http_error", () => {
  const codes = codesOf({ path: "/tentang", group: "Sitemap statis", html: null, httpStatus: 500 });
  assert.ok(codes.includes("http_error"));
});

/* ============================================================
 * Parsing fakta HTML (langsung)
 * ============================================================ */

test("parseHtmlFacts: mengekstrak title/description/canonical/robots/OG/JSON-LD", () => {
  const html = htmlDocument({
    title: GOOD_TITLE,
    description: GOOD_DESC,
    canonical: `${ORIGIN}/tentang`,
    robots: "index, follow",
    jsonLd: ['{"@type":"WebPage"}', '{"@type":"Organization"}'],
  });
  const parsed = parseHtmlFacts(html);
  assert.equal(parsed.title, GOOD_TITLE);
  assert.equal(parsed.description, GOOD_DESC);
  assert.equal(parsed.canonical, `${ORIGIN}/tentang`);
  assert.equal(parsed.robots, "index, follow");
  assert.equal(parsed.og.image, "https://lktech.id/og.png");
  assert.equal(parsed.jsonLdCount, 2);
  assert.equal(parsed.jsonLdInvalidCount, 0);
});

test("parseHtmlFacts: HTML kosong → nilai null & jumlah nol", () => {
  const parsed = parseHtmlFacts("");
  assert.equal(parsed.title, null);
  assert.equal(parsed.description, null);
  assert.equal(parsed.canonical, null);
  assert.equal(parsed.robots, null);
  assert.equal(parsed.jsonLdCount, 0);
  assert.equal(parsed.jsonLdInvalidCount, 0);
  assert.deepEqual(parsed.og, { title: null, description: null, image: null });
});
