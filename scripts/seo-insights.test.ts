import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeSeoInsights,
  sameOriginUrl,
  stableInsightId,
  DEFAULT_SEO_INSIGHT_CONFIG,
  MAX_INSIGHTS,
  SEO_INSIGHT_DECISIONS,
  type SeoInsight,
} from "../src/lib/seo-insights-pure.ts";
import { seoInsightActionSchema } from "../src/lib/api-schemas.ts";

/**
 * Uji insight SEO berbasis aturan (fase D3) — memastikan insight transparan,
 * tidak ada skor black-box, ambang terlihat, dan tidak ada klaim sebab-akibat.
 * Jalankan: `npm run test:seo-insights`
 */

const range = { startDate: "2026-10-01", endDate: "2026-10-07" };

function rules(insights: SeoInsight[]): string[] {
  return insights.map((i) => i.rule);
}

test("insight: klik menurun terdeteksi dari periode pembanding", () => {
  const insights = computeSeoInsights({
    range,
    queries: [{ keys: ["jasa website"], clicks: 4, impressions: 500, ctr: 0.008, position: 8 }],
    pages: [],
    previousQueries: [{ keys: ["jasa website"], clicks: 20, impressions: 480, ctr: 0.04, position: 7 }],
  });
  const found = insights.find((i) => i.rule === "declining_clicks");
  assert.ok(found, "aturan penurunan harus terpicu");
  assert.equal(found?.kind, "query");
  assert.equal(found?.comparison?.clicks, 20);
  assert.equal(found?.comparison?.clickChange, -16);
  assert.equal(found?.heuristic, true);
  assert.deepEqual(found?.range, range);
  assert.ok((found?.limitations.length ?? 0) >= 3);
});

test("insight: penurunan kecil atau tanpa data pembanding tidak dipicu", () => {
  // Turun 1 klik dari 20 (di bawah rasio) → tidak dipicu.
  const small = computeSeoInsights({
    range,
    queries: [{ keys: ["poster"], clicks: 19, impressions: 500, ctr: 0.04, position: 3 }],
    pages: [],
    previousQueries: [{ keys: ["poster"], clicks: 20, impressions: 500, ctr: 0.04, position: 3 }],
  });
  assert.equal(rules(small).includes("declining_clicks"), false);
  // Tanpa data pembanding, aturan penurunan dilewati (bukan dianggap nol).
  const none = computeSeoInsights({
    range,
    queries: [{ keys: ["poster"], clicks: 0, impressions: 10, ctr: 0, position: 3 }],
    pages: [],
  });
  assert.equal(rules(none).includes("declining_clicks"), false);
});

test("insight: impresi tanpa klik memakai ambang yang terlihat", () => {
  const insights = computeSeoInsights({
    range,
    queries: [{ keys: ["cetak spanduk"], clicks: 0, impressions: 300, ctr: 0, position: 12 }],
    pages: [],
  });
  const found = insights.find((i) => i.rule === "impressions_without_clicks");
  assert.ok(found);
  assert.equal(found?.thresholds.zeroClickMinImpressions, DEFAULT_SEO_INSIGHT_CONFIG.zeroClickMinImpressions);
  assert.match(found?.trigger ?? "", /300/);
});

test("insight: CTR rendah relatif memakai rata-rata berbobot impresi, bukan angka tetap", () => {
  const insights = computeSeoInsights({
    range,
    queries: [
      // CTR 1% vs rata-rata himpunan ~5% → relatif rendah.
      { keys: ["low"], clicks: 10, impressions: 1000, ctr: 0.01, position: 9 },
      { keys: ["high"], clicks: 100, impressions: 1000, ctr: 0.1, position: 2 },
    ],
    pages: [],
  });
  const found = insights.find((i) => i.rule === "low_ctr_high_impressions");
  assert.equal(found?.subject, "low");
  assert.ok((found?.thresholds.averageCtrReference ?? 0) > 0);
  // Item dengan CTR di atas cutoff tidak masuk.
  assert.equal(insights.some((i) => i.subject === "high" && i.rule === "low_ctr_high_impressions"), false);
});

test("insight: posisi dekat halaman pertama memakai rentang yang terlihat", () => {
  const insights = computeSeoInsights({
    range,
    queries: [
      { keys: ["dekat"], clicks: 5, impressions: 200, ctr: 0.025, position: 11 },
      { keys: ["jauh"], clicks: 5, impressions: 200, ctr: 0.025, position: 45 },
    ],
    pages: [],
  });
  const subjects = insights.filter((i) => i.rule === "striking_distance").map((i) => i.subject);
  assert.deepEqual(subjects, ["dekat"]);
});

test("insight: satu insight per subjek dengan aturan prioritas tertinggi", () => {
  const insights = computeSeoInsights({
    range,
    queries: [{ keys: ["dup"], clicks: 2, impressions: 400, ctr: 0.005, position: 6 }],
    pages: [],
    previousQueries: [{ keys: ["dup"], clicks: 15, impressions: 400, ctr: 0.04, position: 6 }],
  });
  const matches = insights.filter((i) => i.subject === "dup");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].rule, "declining_clicks");
});

test("insight: impresi di bawah ambang tidak dipertimbangkan", () => {
  const insights = computeSeoInsights({
    range,
    queries: [{ keys: ["sepi"], clicks: 0, impressions: 5, ctr: 0, position: 9 }],
    pages: [],
  });
  assert.deepEqual(insights, []);
});

test("insight: ambang dapat dikonfigurasi dan tetap terlihat", () => {
  const insights = computeSeoInsights({
    range,
    config: { minImpressions: 10, zeroClickMinImpressions: 10 },
    queries: [{ keys: ["sepi"], clicks: 0, impressions: 12, ctr: 0, position: 9 }],
    pages: [],
  });
  assert.equal(insights.length, 1);
  assert.equal(insights[0].thresholds.minImpressions, 10);
});

test("insight: batas per aturan diterapkan", () => {
  const queries = Array.from({ length: 20 }, (_, i) => ({
    keys: [`q${i}`],
    clicks: 0,
    impressions: 1000 - i,
    ctr: 0,
    position: 15,
  }));
  const insights = computeSeoInsights({ range, queries, pages: [] });
  const zeroClick = insights.filter((i) => i.rule === "impressions_without_clicks");
  assert.equal(zeroClick.length, DEFAULT_SEO_INSIGHT_CONFIG.maxPerRule);
  assert.ok(insights.length <= MAX_INSIGHTS);
});

test("insight: ID stabil untuk subjek & rentang yang sama", () => {
  const a = stableInsightId(["low_ctr_high_impressions", "query", "x", "2026-10-01", "2026-10-07"]);
  const b = stableInsightId(["low_ctr_high_impressions", "query", "x", "2026-10-01", "2026-10-07"]);
  const c = stableInsightId(["low_ctr_high_impressions", "query", "y", "2026-10-01", "2026-10-07"]);
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("sameOriginUrl: hanya menerima origin situs yang sama", () => {
  assert.equal(sameOriginUrl("https://lktech.id", "https://lktech.id/produk/x"), "https://lktech.id/produk/x");
  assert.equal(sameOriginUrl("https://lktech.id", "https://lktech.id/produk/x#frag"), "https://lktech.id/produk/x");
  assert.equal(sameOriginUrl("https://lktech.id", "https://jahat.example/produk"), null);
  assert.equal(sameOriginUrl("https://lktech.id", "javascript:alert(1)"), null);
  assert.equal(sameOriginUrl("https://lktech.id", "https://user:pass@lktech.id/x"), null);
  assert.equal(sameOriginUrl(undefined, "https://lktech.id/x"), null);
  assert.equal(sameOriginUrl("https://lktech.id", "bukan url"), null);
});

test("tindakan editorial hanya nilai yang disetujui", () => {
  assert.deepEqual([...SEO_INSIGHT_DECISIONS], ["review_title", "update_content", "ignore"]);
});

test("skema tindak lanjut insight: valid, dan menolak nilai tak dikenal", () => {
  const base = {
    insightId: "1a2b3c4d",
    rule: "low_ctr_high_impressions",
    kind: "query",
    subject: "jasa website",
    decision: "review_title",
  };
  assert.equal(seoInsightActionSchema.safeParse(base).success, true);
  assert.equal(seoInsightActionSchema.safeParse({ ...base, decision: "hapus_semua" }).success, false);
  assert.equal(seoInsightActionSchema.safeParse({ ...base, kind: "halaman" }).success, false);
  assert.equal(seoInsightActionSchema.safeParse({ ...base, insightId: "XYZ" }).success, false);
  assert.equal(seoInsightActionSchema.safeParse({ ...base, subject: "" }).success, false);
  assert.equal(seoInsightActionSchema.safeParse({ ...base, subject: "a".repeat(400) }).success, false);
  assert.equal(seoInsightActionSchema.safeParse({ ...base, reason: "a".repeat(400) }).success, false);
});
