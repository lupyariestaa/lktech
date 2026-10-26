import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SEO_PROVIDER_LOG_EVENT,
  buildProviderLogEvent,
  createMetricsRegistry,
  recordProviderCall,
  snapshotMetrics,
} from "../src/lib/seo-observability-pure.ts";
import {
  SEO_FEATURES,
  isSeoFeatureEnabled,
  parseDisabledFeatures,
  resolveSeoFlags,
  seoFeatureEnabled,
} from "../src/lib/seo-flags-pure.ts";

/**
 * Uji observabilitas & feature flag SEO (fase D7) — metrik per provider,
 * log aman, dan kill switch fitur.
 * Jalankan: `npm run test:seo-ops`
 */

test("metrics: mencatat sukses/gagal, kode error, quota, dan latency", () => {
  const reg = createMetricsRegistry();
  recordProviderCall(reg, { provider: "GSC", ok: true, latencyMs: 100 });
  recordProviderCall(reg, { provider: "gsc", ok: true, latencyMs: 200 });
  recordProviderCall(reg, { provider: "gsc", ok: false, errorCode: "quota_limited", latencyMs: 50 });
  recordProviderCall(reg, { provider: "ga4", ok: false, errorCode: "permission_denied", latencyMs: 30, at: new Date("2026-10-25T00:00:00Z") });

  const snap = snapshotMetrics(reg, new Date("2026-10-25T01:00:00Z"));
  assert.equal(snap.scope, "process");
  assert.ok(snap.note.length > 0);
  assert.deepEqual(snap.providers.map((p) => p.provider), ["ga4", "gsc"]);

  const gsc = snap.providers.find((p) => p.provider === "gsc")!;
  assert.equal(gsc.success, 2);
  assert.equal(gsc.failure, 1);
  assert.equal(gsc.byErrorCode.quota_limited, 1);
  assert.equal(gsc.quotaLimited, 1);
  assert.deepEqual(gsc.latencyMs, { count: 3, min: 50, max: 200, avg: 117 });
  assert.ok(gsc.lastAtISO);

  const ga4 = snap.providers.find((p) => p.provider === "ga4")!;
  assert.equal(ga4.success, 0);
  assert.equal(ga4.failure, 1);
  assert.equal(ga4.quotaLimited, 0);
  assert.equal(ga4.lastAtISO, "2026-10-25T00:00:00.000Z");
});

test("metrics: latency negatif/tak valid diklem", () => {
  const reg = createMetricsRegistry();
  recordProviderCall(reg, { provider: "gsc", ok: true, latencyMs: -5 });
  recordProviderCall(reg, { provider: "gsc", ok: true, latencyMs: Number.NaN });
  const gsc = snapshotMetrics(reg).providers[0];
  assert.deepEqual(gsc.latencyMs, { count: 2, min: 0, max: 0, avg: 0 });
});

test("log event: hanya kunci aman, tanpa detail permintaan", () => {
  assert.equal(SEO_PROVIDER_LOG_EVENT, "seo.provider_call");
  const failure = buildProviderLogEvent({ provider: "GSC", ok: false, errorCode: "request_timeout", latencyMs: 1234 });
  assert.deepEqual(failure, {
    provider: "gsc",
    ok: false,
    errorCode: "request_timeout",
    latencyMs: 1234,
  });
  const success = buildProviderLogEvent({ provider: "ga4", ok: true, latencyMs: 10 });
  assert.deepEqual(success, { provider: "ga4", ok: true, latencyMs: 10 });
  const serialized = JSON.stringify(failure);
  for (const forbidden of ["Bearer", "private_key", "access_token", "https://", "query", "page"]) {
    assert.equal(serialized.includes(forbidden), false, `log memuat "${forbidden}"`);
  }
});

test("flags: parse daftar nonaktif (abaikan tak dikenal, dedupe, urut)", () => {
  assert.deepEqual(parseDisabledFeatures("audit, ga4"), ["audit", "ga4"]);
  assert.deepEqual(parseDisabledFeatures("ga4,audit,ga4,unknown"), ["audit", "ga4"]);
  assert.deepEqual(parseDisabledFeatures(""), []);
  assert.deepEqual(parseDisabledFeatures(undefined), []);
  assert.deepEqual(parseDisabledFeatures("AUDIT"), ["audit"]);
});

test("flags: default aktif; hanya yang didaftarkan nonaktif", () => {
  const all = resolveSeoFlags([]);
  for (const feature of SEO_FEATURES) assert.equal(all[feature], true);

  const flags = resolveSeoFlags(["ga4"]);
  assert.equal(isSeoFeatureEnabled(flags, "ga4"), false);
  assert.equal(isSeoFeatureEnabled(flags, "gsc"), true);
  assert.equal(seoFeatureEnabled("ga4", "ga4"), false);
  assert.equal(seoFeatureEnabled("audit", "ga4"), true);
});
