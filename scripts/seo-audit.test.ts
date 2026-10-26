import { test } from "node:test";
import assert from "node:assert/strict";
import {
  absoluteAuditUrl,
  analyzePage,
  buildAuditReport,
  decodeEntities,
  groupIssuesByCode,
  isNoindex,
  isSameOriginAllowed,
  normalizeAuditPath,
  pageSeverity,
  parseHtmlFacts,
  parseSitemapXml,
  sitemapPaths,
  sortAuditPages,
  summarizeAudit,
  DEFAULT_SEO_AUDIT_LIMITS,
  SEO_AUDIT_RULE_VERSION,
  TITLE_LENGTH_RANGE,
  type SeoAuditPage,
  type SeoAuditPageFacts,
} from "../src/lib/seo-audit-pure.ts";
import { seoAuditRunSchema } from "../src/lib/api-schemas.ts";

/**
 * Uji audit SEO teknis (fase D4) — memastikan guard SSRF, parsing HTML, aturan
 * heuristik transparan, agregasi, dan skema API berperilaku benar.
 * Jalankan: `npm run test:seo-audit`
 */

const ORIGIN = "https://lktech.id";

function facts(overrides: Partial<SeoAuditPageFacts> = {}): SeoAuditPageFacts {
  return {
    path: "/blog/contoh",
    group: "Artikel",
    httpStatus: 200,
    finalUrl: `${ORIGIN}/blog/contoh`,
    redirected: false,
    redirectExternal: false,
    contentType: "text/html",
    html: "<html><head><title>Judul contoh yang cukup panjang</title></head></html>",
    inSitemap: true,
    checkedAt: "2026-10-25T00:00:00.000Z",
    ...overrides,
  };
}

function codes(page: SeoAuditPage): string[] {
  return page.issues.map((i) => i.code);
}

/* ---------- Guard SSRF ---------- */

test("isSameOriginAllowed: hanya origin identik yang lolos", () => {
  assert.equal(isSameOriginAllowed(ORIGIN, `${ORIGIN}/blog/x`), true);
  assert.equal(isSameOriginAllowed(ORIGIN, "https://evil.example/x"), false);
  assert.equal(isSameOriginAllowed(ORIGIN, "https://sub.lktech.id/x"), false);
  assert.equal(isSameOriginAllowed(ORIGIN, "http://lktech.id/x"), false);
  assert.equal(isSameOriginAllowed(ORIGIN, "https://lktech.id:8443/x"), false);
  assert.equal(isSameOriginAllowed(ORIGIN, "https://user:pass@lktech.id/x"), false);
  assert.equal(isSameOriginAllowed(ORIGIN, "ftp://lktech.id/x"), false);
  assert.equal(isSameOriginAllowed(ORIGIN, "/relatif"), false);
  assert.equal(isSameOriginAllowed(ORIGIN, "javascript:alert(1)"), false);
  assert.equal(isSameOriginAllowed(undefined, `${ORIGIN}/x`), false);
});

test("normalizeAuditPath: memvalidasi & membersihkan path internal", () => {
  assert.equal(normalizeAuditPath("/blog/x"), "/blog/x");
  assert.equal(normalizeAuditPath("/blog/x#frag"), "/blog/x");
  assert.equal(normalizeAuditPath("  /a  "), "/a");
  assert.equal(normalizeAuditPath("//evil.example"), null);
  assert.equal(normalizeAuditPath("/a b"), null);
  assert.equal(normalizeAuditPath("/a\\b"), null);
  assert.equal(normalizeAuditPath("relatif"), null);
  assert.equal(normalizeAuditPath(""), null);
  assert.equal(normalizeAuditPath("/" + "a".repeat(600)), null);
});

test("absoluteAuditUrl: menggabungkan origin + path dan menolak yang asing", () => {
  assert.equal(absoluteAuditUrl(ORIGIN, "/blog/x"), `${ORIGIN}/blog/x`);
  assert.equal(absoluteAuditUrl(ORIGIN, "//evil.example/x"), null);
});

/* ---------- Parsing HTML ---------- */

test("parseHtmlFacts: mengekstrak title, description, canonical, robots, og, jsonld", () => {
  const html = `
    <html><head>
      <title>  Halo &amp; Dunia  </title>
      <meta name="description" content="Deskripsi contoh">
      <meta name="robots" content="index, follow">
      <link rel="canonical" href="https://lktech.id/blog/x">
      <meta property="og:title" content="OG Judul">
      <meta property="og:image" content="https://lktech.id/og.png">
      <script type="application/ld+json">{"@type":"WebPage"}</script>
      <script type="application/ld+json">{ rusak </script>
    </head></html>`;
  const parsed = parseHtmlFacts(html);
  assert.equal(parsed.title, "Halo & Dunia");
  assert.equal(parsed.description, "Deskripsi contoh");
  assert.equal(parsed.robots, "index, follow");
  assert.equal(parsed.canonical, "https://lktech.id/blog/x");
  assert.equal(parsed.og.title, "OG Judul");
  assert.equal(parsed.og.image, "https://lktech.id/og.png");
  assert.equal(parsed.jsonLdCount, 2);
  assert.equal(parsed.jsonLdInvalidCount, 1);
});

test("decodeEntities: mendekode entitas umum", () => {
  assert.equal(decodeEntities("a &lt;b&gt; &amp; &#39;c&#39;"), "a <b> & 'c'");
});

test("isNoindex: mendeteksi noindex, none, dan header", () => {
  assert.equal(isNoindex("index, follow"), false);
  assert.equal(isNoindex("noindex"), true);
  assert.equal(isNoindex("none"), true);
  assert.equal(isNoindex(null, "NOINDEX, NOFOLLOW"), true);
  assert.equal(isNoindex(null, null), false);
});

/* ---------- Aturan per halaman ---------- */

test("analyzePage: noindex ditandai kritis", () => {
  const page = analyzePage(
    facts({ html: `<title>Judul</title><meta name="robots" content="noindex">` }),
    ORIGIN,
  );
  assert.ok(codes(page).includes("noindex"));
  assert.equal(page.issues.find((i) => i.code === "noindex")?.severity, "critical");
});

test("analyzePage: judul hilang dan panjang di luar rentang wajar (heuristik)", () => {
  const missing = analyzePage(facts({ html: "<p>tanpa title</p>" }), ORIGIN);
  assert.ok(codes(missing).includes("title_missing"));

  const short = analyzePage(facts({ html: "<title>Pendek</title>" }), ORIGIN);
  const lengthIssue = short.issues.find((i) => i.code === "title_length");
  assert.ok(lengthIssue);
  assert.equal(lengthIssue?.heuristic, true);
  assert.ok("Pendek".length < TITLE_LENGTH_RANGE.min);
});

test("analyzePage: canonical lintas host = kritis, path beda = tinggi", () => {
  const external = analyzePage(
    facts({ html: `<title>Judul</title><link rel="canonical" href="https://evil.example/x">` }),
    ORIGIN,
  );
  assert.equal(
    external.issues.find((i) => i.code === "canonical_mismatch")?.severity,
    "critical",
  );

  const wrongPath = analyzePage(
    facts({ html: `<title>Judul</title><link rel="canonical" href="/blog/lain">` }),
    ORIGIN,
  );
  assert.equal(
    wrongPath.issues.find((i) => i.code === "canonical_mismatch")?.severity,
    "high",
  );

  const ok = analyzePage(
    facts({ html: `<title>Judul</title><link rel="canonical" href="${ORIGIN}/blog/contoh">` }),
    ORIGIN,
  );
  assert.equal(codes(ok).includes("canonical_mismatch"), false);
});

test("analyzePage: JSON-LD rusak ditandai tinggi", () => {
  const page = analyzePage(
    facts({ html: `<title>Judul</title><script type="application/ld+json">{ rusak </script>` }),
    ORIGIN,
  );
  assert.equal(page.issues.find((i) => i.code === "jsonld_invalid")?.severity, "high");
});

test("analyzePage: tidak ada di sitemap ditandai (bukan klaim indexing)", () => {
  const page = analyzePage(facts({ inSitemap: false }), ORIGIN);
  const issue = page.issues.find((i) => i.code === "not_in_sitemap");
  assert.ok(issue);
  assert.match(issue?.message ?? "", /bukan berarti tidak terindeks/i);
});

test("analyzePage: gagal ambil & HTTP error dibedakan", () => {
  const failed = analyzePage(facts({ httpStatus: 0, fetchError: "request_timeout" }), ORIGIN);
  assert.equal(failed.issues.find((i) => i.code === "fetch_failed")?.severity, "critical");

  const notFound = analyzePage(facts({ httpStatus: 404 }), ORIGIN);
  assert.equal(notFound.issues.find((i) => i.code === "http_error")?.severity, "high");
});

test("analyzePage: redirect eksternal kritis, redirect internal rendah", () => {
  const external = analyzePage(facts({ redirected: true, redirectExternal: true }), ORIGIN);
  assert.equal(external.issues.find((i) => i.code === "redirect_external")?.severity, "critical");

  const internal = analyzePage(facts({ redirected: true, finalUrl: `${ORIGIN}/blog/final` }), ORIGIN);
  assert.equal(internal.issues.find((i) => i.code === "redirect")?.severity, "low");
});

test("analyzePage: halaman bersih tidak punya masalah", () => {
  const page = analyzePage(
    facts({
      html: `<head><title>Judul yang cukup panjang untuk lolos ambang</title>
        <meta name="description" content="${"D".repeat(80)}">
        <link rel="canonical" href="${ORIGIN}/blog/contoh">
        <meta property="og:title" content="t">
        <meta property="og:description" content="d">
        <meta property="og:image" content="i"></head>`,
    }),
    ORIGIN,
  );
  assert.deepEqual(page.issues, []);
  assert.equal(pageSeverity(page), null);
});

/* ---------- Sitemap ---------- */

test("parseSitemapXml & sitemapPaths: menghimpun path same-origin", () => {
  const xml = `<urlset><url><loc>${ORIGIN}/blog/a</loc></url><url><loc>${ORIGIN}/prod</loc></url><url><loc>https://evil.example/x</loc></url></urlset>`;
  const urls = parseSitemapXml(xml);
  assert.deepEqual(urls, [`${ORIGIN}/blog/a`, `${ORIGIN}/prod`, "https://evil.example/x"]);
  const paths = sitemapPaths(urls, ORIGIN);
  assert.equal(paths.has("/blog/a"), true);
  assert.equal(paths.has("/prod"), true);
  assert.equal(paths.has("/x"), false);
});

/* ---------- Agregasi & laporan ---------- */

test("summarizeAudit & sortAuditPages: mengurutkan berdasar keparahan/dampak", () => {
  const critical = analyzePage(facts({ path: "/a", html: `<meta name="robots" content="noindex">` }), ORIGIN);
  const clean = analyzePage(
    facts({
      path: "/b",
      html: `<title>Judul yang cukup panjang untuk lolos ambang</title><meta name="description" content="${"D".repeat(80)}"><link rel="canonical" href="${ORIGIN}/blog/contoh"><meta property="og:title" content="t"><meta property="og:description" content="d"><meta property="og:image" content="i">`,
    }),
    ORIGIN,
  );
  const sorted = sortAuditPages([clean, critical]);
  assert.equal(sorted[0].path, "/a");

  const summary = summarizeAudit([clean, critical]);
  assert.equal(summary.pages, 2);
  assert.equal(summary.ok, 1);
  assert.ok(summary.bySeverity.critical >= 1);
});

test("groupIssuesByCode: mengelompokkan & mengurutkan berdasar keparahan", () => {
  const noindex = analyzePage(facts({ path: "/a", html: `<meta name="robots" content="noindex">` }), ORIGIN);
  const missing = analyzePage(facts({ path: "/b", html: "<p>tanpa title</p>" }), ORIGIN);
  const grouped = groupIssuesByCode([noindex, missing]);
  assert.ok(grouped.length > 0);
  assert.equal(grouped[0].severity, "critical");
  assert.equal(grouped[0].code, "noindex");
});

test("buildAuditReport: menyusun laporan bertipe dengan versi aturan", () => {
  const page = analyzePage(facts(), ORIGIN);
  const report = buildAuditReport({
    origin: ORIGIN,
    pages: [page],
    startedAt: "2026-10-25T00:00:00.000Z",
    finishedAt: "2026-10-25T00:00:02.000Z",
    truncated: false,
    inventorySize: 5,
    sitemapChecked: true,
    sitemapError: null,
    limits: DEFAULT_SEO_AUDIT_LIMITS,
  });
  assert.equal(report.ruleVersion, SEO_AUDIT_RULE_VERSION);
  assert.equal(report.durationMs, 2000);
  assert.equal(report.summary.pages, 1);
  assert.ok(report.limitations.length >= 3);
});

/* ---------- Anggaran waktu audit (AUD-01) ---------- */

test("DEFAULT_SEO_AUDIT_LIMITS: menyertakan anggaran waktu positif", () => {
  assert.ok(Number.isFinite(DEFAULT_SEO_AUDIT_LIMITS.budgetMs));
  assert.ok(DEFAULT_SEO_AUDIT_LIMITS.budgetMs > 0);
});

test("analyzePage: budget_exceeded → not_checked (bukan fetch_failed)", () => {
  const page = analyzePage(
    facts({ httpStatus: 0, fetchError: "budget_exceeded", html: null, finalUrl: null, inSitemap: true }),
    ORIGIN,
  );
  assert.deepEqual(codes(page), ["not_checked"]);
  assert.equal(page.issues[0].severity, "low");
  assert.equal(page.inSitemap, true);
});

test("summarizeAudit: halaman not_checked tidak dihitung sebagai error", () => {
  const unchecked = analyzePage(
    facts({ httpStatus: 0, fetchError: "budget_exceeded", html: null, finalUrl: null, inSitemap: true }),
    ORIGIN,
  );
  const okPage = analyzePage(
    facts({
      html: "<html><head><title>Judul contoh yang cukup panjang</title>" +
        '<meta name="description" content="' + "D".repeat(80) + '">' +
        `<link rel="canonical" href="${ORIGIN}/blog/contoh">` +
        '<meta property="og:title" content="t"><meta property="og:description" content="d">' +
        '<meta property="og:image" content="https://lktech.id/og.png"></head></html>',
    }),
    ORIGIN,
  );
  const summary = summarizeAudit([unchecked, okPage]);
  assert.equal(summary.errors, 0);
  assert.equal(summary.byCode.not_checked, 1);
});

test("buildAuditReport: menandai budgetExceeded & menambah keterbatasan", () => {
  const page = analyzePage(
    facts({ httpStatus: 0, fetchError: "budget_exceeded", html: null, finalUrl: null, inSitemap: true }),
    ORIGIN,
  );
  const report = buildAuditReport({
    origin: ORIGIN,
    pages: [page],
    startedAt: "2026-10-25T00:00:00.000Z",
    finishedAt: "2026-10-25T00:00:45.000Z",
    truncated: false,
    inventorySize: 5,
    sitemapChecked: true,
    limits: DEFAULT_SEO_AUDIT_LIMITS,
  });
  assert.equal(report.budgetExceeded, true);
  assert.equal(report.unchecked, 1);
  assert.ok(report.limitations.some((l) => /batas waktu audit/i.test(l)));
  assert.equal(report.limits.budgetMs, DEFAULT_SEO_AUDIT_LIMITS.budgetMs);
});

/* ---------- Skema API ---------- */

test("seoAuditRunSchema: menerima opsi sah & menolak yang tak dikenal", () => {
  assert.equal(seoAuditRunSchema.safeParse({}).success, true);
  assert.equal(
    seoAuditRunSchema.safeParse({ groups: ["Artikel", "Produk"], maxUrls: 10, save: true }).success,
    true,
  );
  assert.equal(seoAuditRunSchema.safeParse({ groups: ["TidakAda"] }).success, false);
  assert.equal(seoAuditRunSchema.safeParse({ maxUrls: 999 }).success, false);
  assert.equal(seoAuditRunSchema.safeParse({ maxUrls: 0 }).success, false);
  assert.equal(seoAuditRunSchema.safeParse({ save: "ya" }).success, false);
});
