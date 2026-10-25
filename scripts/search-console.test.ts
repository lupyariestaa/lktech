import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseServiceAccount,
  dateRange,
  buildQueryBody,
  normalizeGscRows,
  normalizeGscSummary,
  isValidGscResponse,
  gscErrorCode,
  reportStatus,
  summarizeGsc,
} from "../src/lib/search-console-pure.ts";

/**
 * Uji logika murni Search Console (fase S6).
 * Jalankan: `npm run test:search-console`
 */

const VALID_SA = JSON.stringify({
  client_email: "svc@proj.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
  project_id: "proj",
});

test("parseServiceAccount: valid", () => {
  const sa = parseServiceAccount(VALID_SA);
  assert.equal(sa?.client_email, "svc@proj.iam.gserviceaccount.com");
  assert.ok(sa?.private_key.includes("BEGIN PRIVATE KEY"));
});

test("parseServiceAccount: kosong / invalid / field kurang", () => {
  assert.equal(parseServiceAccount(""), null);
  assert.equal(parseServiceAccount("bukan json"), null);
  assert.equal(parseServiceAccount(JSON.stringify({ client_email: "x" })), null);
});

test("dateRange: N hari, end mengecualikan jeda 3 hari GSC", () => {
  const r = dateRange(28, new Date("2026-10-12T10:00:00Z"));
  assert.equal(r.endDate, "2026-10-09");
  assert.equal(r.startDate, "2026-09-12");
});

test("dateRange: clamp rentang", () => {
  const r = dateRange(9999, new Date("2026-10-12T00:00:00Z"));
  // clamp max 180 hari, dengan jeda akhir tiga hari.
  assert.equal(r.endDate, "2026-10-09");
  assert.equal(r.startDate, "2026-04-13");
});

test("buildQueryBody: rowLimit clamp & dimensi", () => {
  const b = buildQueryBody({ startDate: "a", endDate: "b", dimensions: ["query"], rowLimit: 999 });
  assert.equal(b.rowLimit, 100);
  assert.deepEqual(b.dimensions, ["query"]);
  const b2 = buildQueryBody({ startDate: "a", endDate: "b", dimensions: ["page"] });
  assert.equal(b2.rowLimit, 25);
});

test("normalizeGscRows: parsing & buang kosong", () => {
  const rows = normalizeGscRows({
    rows: [
      { keys: ["jasa website"], clicks: 10, impressions: 100, ctr: 0.1, position: 3.2 },
      { keys: [], clicks: 0, impressions: 0, ctr: 0, position: 0 },
    ],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].keys?.[0], "jasa website");
  assert.equal(rows[0].clicks, 10);
});

test("normalizeGscRows: bukan objek rows → []", () => {
  assert.deepEqual(normalizeGscRows(null), []);
  assert.deepEqual(normalizeGscRows({}), []);
});

test("isValidGscResponse distingue una respuesta vacía válida de una respuesta malformada", () => {
  assert.equal(isValidGscResponse({}), true);
  assert.equal(isValidGscResponse({ rows: [] }), true);
  assert.equal(isValidGscResponse({ rows: "bad" }), false);
  assert.equal(isValidGscResponse(null), false);
});

test("normalizeGscSummary toma la fila agregada y acepta respuesta vacía", () => {
  assert.deepEqual(
    normalizeGscSummary({ rows: [{ clicks: 12, impressions: 240, ctr: 0.05, position: 7.2 }] }),
    { clicks: 12, impressions: 240, ctr: 0.05, averagePosition: 7.2 },
  );
  assert.deepEqual(normalizeGscSummary({}), {
    clicks: 0,
    impressions: 0,
    ctr: 0,
    averagePosition: 0,
  });
  assert.equal(normalizeGscSummary({ rows: "bad" }), null);
});

test("gscErrorCode maps upstream status without exposing provider details", () => {
  assert.equal(gscErrorCode(401), "invalid_credentials");
  assert.equal(gscErrorCode(403), "permission_denied");
  assert.equal(gscErrorCode(429), "quota_limited");
  assert.equal(gscErrorCode(503), "provider_unavailable");
});

test("reportStatus membedakan not configured, no data, partial, dan error", () => {
  assert.equal(reportStatus({ configured: false, failureCount: 0, hasData: false }), "not_configured");
  assert.equal(reportStatus({ configured: true, failureCount: 0, hasData: false }), "no_data");
  assert.equal(reportStatus({ configured: true, failureCount: 1, hasData: true }), "partial");
  assert.equal(reportStatus({ configured: true, failureCount: 3, hasData: false }), "error");
  assert.equal(reportStatus({ configured: true, failureCount: 0, hasData: true }), "connected");
});

test("summarizeGsc: total & CTR & posisi berbobot impresi", () => {
  const s = summarizeGsc([
    { clicks: 10, impressions: 100, ctr: 0.1, position: 2 },
    { clicks: 0, impressions: 300, ctr: 0, position: 6 },
  ]);
  assert.equal(s.clicks, 10);
  assert.equal(s.impressions, 400);
  assert.equal(s.ctr, 10 / 400);
  // posisi berbobot: (2*100 + 6*300)/400 = 5
  assert.equal(s.avgPosition, 5);
});

test("summarizeGsc: kosong → aman", () => {
  const s = summarizeGsc([]);
  assert.deepEqual(s, { clicks: 0, impressions: 0, ctr: 0, avgPosition: 0 });
});
