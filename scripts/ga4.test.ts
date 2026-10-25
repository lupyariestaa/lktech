import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GA4_ERROR_MESSAGE,
  GA4_MAX_RANGE_DAYS,
  MAX_CONVERSION_EVENTS,
  buildRunReportBody,
  ga4ErrorCode,
  ga4Status,
  isValidGa4Response,
  normalizeGa4Rows,
  normalizeGa4Summary,
  normalizePropertyId,
  parseConversionEvents,
  previousGa4Range,
  redactSecrets,
  resolveGa4Range,
} from "../src/lib/ga4-pure.ts";

/**
 * Uji logika murni Google Analytics 4 (fase D6) — rentang tanggal, body
 * `runReport`, normalisasi respons, kode error aman, dan redaksi rahasia.
 * Jalankan: `npm run test:ga4`
 */

const NOW = new Date("2026-10-12T10:00:00Z");

test("normalizePropertyId: menerima numerik, membuang prefix, menolak non-numerik", () => {
  assert.equal(normalizePropertyId("123456789"), "123456789");
  assert.equal(normalizePropertyId("properties/987654321"), "987654321");
  assert.equal(normalizePropertyId(" 42 "), "42");
  assert.equal(normalizePropertyId("G-HQDT6937K4"), null);
  assert.equal(normalizePropertyId(""), null);
  assert.equal(normalizePropertyId(undefined), null);
});

test("resolveGa4Range: preset mengecualikan jeda 1 hari GA4", () => {
  const r = resolveGa4Range({ days: 28, now: NOW });
  assert.equal(r?.endDate, "2026-10-11");
  assert.equal(r?.startDate, "2026-09-14");
});

test("resolveGa4Range: clamp rentang maksimum", () => {
  const r = resolveGa4Range({ days: 9999, now: NOW });
  const start = new Date(`${r!.startDate}T00:00:00.000Z`);
  const end = new Date(`${r!.endDate}T00:00:00.000Z`);
  const span = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  assert.equal(span, GA4_MAX_RANGE_DAYS);
});

test("resolveGa4Range: rentang kustom inklusif & validasi batas", () => {
  assert.deepEqual(
    resolveGa4Range({ startDate: "2026-10-01", endDate: "2026-10-11", now: NOW }),
    { startDate: "2026-10-01", endDate: "2026-10-11" },
  );
  assert.equal(resolveGa4Range({ startDate: "2026-10-11", endDate: "2026-10-01", now: NOW }), null);
  assert.equal(resolveGa4Range({ startDate: "2026-10-01", endDate: "2026-10-12", now: NOW }), null);
  assert.equal(resolveGa4Range({ startDate: "bukan-tanggal", endDate: "2026-10-11", now: NOW }), null);
  assert.equal(resolveGa4Range({ startDate: "2026-01-01", endDate: "2026-10-11", now: NOW }), null);
});

test("previousGa4Range: panjang sama & tidak tumpang tindih", () => {
  const prev = previousGa4Range({ startDate: "2026-09-14", endDate: "2026-10-11" });
  assert.equal(prev.endDate, "2026-09-13");
  assert.equal(prev.startDate, "2026-08-17");
});

test("parseConversionEvents: trim, dedupe, batasi 3, tolak nama invalid", () => {
  assert.deepEqual(parseConversionEvents("purchase, generate_lead ,whatsapp_click"), [
    "purchase",
    "generate_lead",
    "whatsapp_click",
  ]);
  assert.equal(parseConversionEvents("a,b,c,d,e").length, MAX_CONVERSION_EVENTS);
  assert.deepEqual(parseConversionEvents("purchase,purchase,generate_lead"), ["purchase", "generate_lead"]);
  assert.deepEqual(parseConversionEvents("1bad, has space, ok_event"), ["ok_event"]);
  assert.deepEqual(parseConversionEvents(undefined), []);
});

test("buildRunReportBody: bentuk metrics/dimensions & limit string", () => {
  const body = buildRunReportBody({
    startDate: "2026-10-01",
    endDate: "2026-10-11",
    metrics: ["screenPageViews", "sessions"],
    dimensions: ["date"],
    limit: 400,
    orderBys: [{ dimension: "date" }],
  });
  assert.deepEqual(body.dateRanges, [{ startDate: "2026-10-01", endDate: "2026-10-11" }]);
  assert.deepEqual(body.metrics, [{ name: "screenPageViews" }, { name: "sessions" }]);
  assert.deepEqual(body.dimensions, [{ name: "date" }]);
  assert.equal(body.limit, "400");
  assert.deepEqual(body.orderBys, [{ dimension: { dimensionName: "date" }, desc: false }]);
});

test("buildRunReportBody: filter eventName & clamp limit", () => {
  const body = buildRunReportBody({
    startDate: "a",
    endDate: "b",
    metrics: ["eventCount"],
    eventNames: ["purchase", "generate_lead"],
    limit: 0,
  });
  assert.deepEqual(body.dimensionFilter, {
    filter: { fieldName: "eventName", inListFilter: { values: ["purchase", "generate_lead"] } },
  });
  assert.equal(body.limit, "1");
});

test("isValidGa4Response & normalizeGa4Rows: parsing & bentuk rusak", () => {
  const ok = {
    rows: [
      { dimensionValues: [{ value: "20261001" }], metricValues: [{ value: "120" }, { value: "40" }] },
    ],
  };
  assert.equal(isValidGa4Response(ok), true);
  assert.equal(isValidGa4Response({}), true);
  assert.equal(isValidGa4Response({ rows: "nope" }), false);
  assert.equal(isValidGa4Response({ rows: [{ metricValues: "x" }] }), false);

  const rows = normalizeGa4Rows(ok);
  assert.deepEqual(rows, [{ dimensions: ["20261001"], metrics: [120, 40] }]);
  assert.deepEqual(normalizeGa4Rows({}), []);
  assert.deepEqual(normalizeGa4Rows(null), []);
});

test("normalizeGa4Summary: kosong valid → nol; rusak → null", () => {
  assert.deepEqual(normalizeGa4Summary({}), {
    pageViews: 0,
    sessions: 0,
    activeUsers: 0,
    engagedSessions: 0,
    engagementRate: 0,
  });
  const parsed = normalizeGa4Summary({
    rows: [{ metricValues: [{ value: "1000" }, { value: "300" }, { value: "250" }, { value: "180" }, { value: "0.6" }] }],
  });
  assert.deepEqual(parsed, {
    pageViews: 1000,
    sessions: 300,
    activeUsers: 250,
    engagedSessions: 180,
    engagementRate: 0.6,
  });
  assert.equal(normalizeGa4Summary({ rows: [{ metricValues: [{ value: "x" }] }] }), null);
  assert.equal(normalizeGa4Summary({ rows: "nope" }), null);
});

test("ga4ErrorCode: memetakan status provider tanpa detail", () => {
  assert.equal(ga4ErrorCode(400), "invalid_credentials");
  assert.equal(ga4ErrorCode(401), "invalid_credentials");
  assert.equal(ga4ErrorCode(403), "permission_denied");
  assert.equal(ga4ErrorCode(429), "quota_limited");
  assert.equal(ga4ErrorCode(503), "provider_unavailable");
  assert.equal(ga4ErrorCode(404), "request_failed");
});

test("ga4Status: hampir semua gagal → error; sebagian → partial", () => {
  assert.equal(ga4Status({ configured: false, failureCount: 0, hasData: false }), "not_configured");
  assert.equal(ga4Status({ configured: true, failureCount: 3, hasData: false }), "error");
  assert.equal(ga4Status({ configured: true, failureCount: 1, hasData: false }), "partial");
  assert.equal(ga4Status({ configured: true, failureCount: 0, hasData: true }), "connected");
  assert.equal(ga4Status({ configured: true, failureCount: 0, hasData: false }), "no_data");
});

test("GA4_ERROR_MESSAGE: pesan aman, tanpa URL/token", () => {
  for (const message of Object.values(GA4_ERROR_MESSAGE)) {
    assert.equal(/https?:\/\//.test(message), false);
    assert.equal(/Bearer\s/.test(message), false);
    assert.equal(/-----BEGIN/.test(message), false);
  }
});

test("redactSecrets: menyembunyikan kunci/token/Bearer", () => {
  const raw = JSON.stringify({
    client_email: "svc@proj.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\nSECRET\n-----END PRIVATE KEY-----\n",
    access_token: "ya29.abcdef",
  });
  const redacted = redactSecrets(`${raw} Authorization: Bearer ya29.abcdef`);
  assert.equal(redacted.includes("SECRET"), false);
  assert.equal(redacted.includes("ya29.abcdef"), false);
  assert.ok(redacted.includes("svc@proj.iam.gserviceaccount.com"));
  assert.ok(redacted.includes("[redacted]"));
});
