import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  GA4_QUERY_PARAMS,
  checkGa4QueryParams,
  defaultGa4Range,
  resolveGa4Range,
} from "../src/lib/ga4-pure.ts";
import { SEO_FEATURES, resolveSeoFlags } from "../src/lib/seo-flags-pure.ts";

/**
 * Uji endpoint SEO (AUD-04) — validasi parameter (whitelist/ganda), fallback
 * rentang GA4 (AUD-05), gating kill switch 503, dan wiring panel status.
 *
 * Ini uji murni + wiring sumber, BUKAN pengganti E2E terautentikasi.
 * Jalankan: `npm run test:seo-endpoints`
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

const NOW = new Date("2026-10-12T10:00:00Z");

test("checkGa4QueryParams: menerima parameter yang dikenal & tunggal", () => {
  assert.equal(checkGa4QueryParams(new URLSearchParams("days=28")), null);
  assert.equal(
    checkGa4QueryParams(new URLSearchParams("startDate=2026-10-01&endDate=2026-10-11")),
    null,
  );
  assert.equal(checkGa4QueryParams(new URLSearchParams("")), null);
  assert.deepEqual([...GA4_QUERY_PARAMS], ["days", "startDate", "endDate"]);
});

test("checkGa4QueryParams: menolak parameter tak dikenal & ganda (400)", () => {
  assert.match(checkGa4QueryParams(new URLSearchParams("foo=1")) ?? "", /tidak dikenal/);
  assert.match(checkGa4QueryParams(new URLSearchParams("days=7&days=28")) ?? "", /ganda/);
  // Parameter valid + satu tak dikenal → tetap ditolak.
  assert.match(checkGa4QueryParams(new URLSearchParams("days=7&evil=1")) ?? "", /tidak dikenal/);
});

test("defaultGa4Range: rentang fallback yang selalu sah (AUD-05)", () => {
  const fallback = defaultGa4Range(NOW);
  assert.deepEqual(fallback, { startDate: "2026-09-14", endDate: "2026-10-11" });
  // Sama dengan preset default `resolveGa4Range` tanpa argumen.
  assert.deepEqual(fallback, resolveGa4Range({ now: NOW }));
});

test("wiring: endpoint GA4 memvalidasi parameter & menolak rentang tak sah", () => {
  const route = read("src/app/api/admin/seo/ga4/route.ts");
  assert.match(route, /checkGa4QueryParams\(params\)/);
  assert.match(route, /status:\s*400/);
  assert.match(route, /resolveGa4Range\(/);
});

test("wiring: endpoint SEO memakai gating kill switch 503", () => {
  const gsc = read("src/app/api/admin/seo/route.ts");
  assert.match(gsc, /isSeoFeatureEnabledFromEnv\("gsc"\)/);
  assert.match(gsc, /seoFeatureDisabledResponse\("gsc"\)/);

  const audit = read("src/app/api/admin/seo/audit/route.ts");
  assert.match(audit, /isSeoFeatureEnabledFromEnv\("audit"\)/);
  assert.match(audit, /seoFeatureDisabledResponse\("audit"\)/);

  const ga4 = read("src/app/api/admin/seo/ga4/route.ts");
  assert.match(ga4, /isSeoFeatureEnabledFromEnv\("ga4"\)/);
  assert.match(ga4, /seoFeatureDisabledResponse\("ga4"\)/);

  // Respons kill switch memakai status 503 tanpa cache.
  const flags = read("src/lib/seo-flags.ts");
  assert.match(flags, /status:\s*503/);
  assert.match(flags, /seo_feature_disabled/);
});

test("wiring: prune audit dijadwalkan setelah respons (AUD-08)", () => {
  const audit = read("src/app/api/admin/seo/audit/route.ts");
  assert.match(audit, /after\(\(\)\s*=>\s*pruneSeoAudits\(\)\)/);
  assert.match(audit, /import\s*\{\s*NextResponse,\s*after\s*\}\s*from\s*"next\/server"/);
});

test("wiring: panel status ada & halaman meresolusi flag di server (AUD-03/AUD-10)", () => {
  const page = read("src/app/admin/(dashboard)/seo/page.tsx");
  assert.match(page, /resolveSeoFlags\(parseDisabledFeatures\(process\.env\.SEO_DISABLED_FEATURES\)\)/);
  assert.match(page, /FeatureDisabledNotice/);
  assert.match(page, /SeoOpsPanel/);
  assert.match(page, /flags\.gsc/);
  assert.match(page, /flags\.audit/);
  assert.match(page, /flags\.ga4/);

  const panel = read("src/components/admin/seo-ops-panel.tsx");
  assert.match(panel, /fetchSeoObservability\(\)/);
});

test("wiring: endpoint observabilitas dilindungi admin", () => {
  const route = read("src/app/api/admin/seo/observability/route.ts");
  assert.match(route, /requireAdmin\(req\)/);
  assert.match(route, /getObservabilitySnapshot\(\)/);
  assert.match(route, /resolveSeoFlags\(/);
});

test("flags: resolveSeoFlags menonaktifkan hanya fitur yang didaftarkan", () => {
  const flags = resolveSeoFlags(["ga4"]);
  assert.equal(flags.ga4, false);
  for (const feature of SEO_FEATURES.filter((f) => f !== "ga4")) {
    assert.equal(flags[feature], true);
  }
});
