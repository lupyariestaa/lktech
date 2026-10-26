import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  CSP_REPORT_MAX_ENTRIES,
  parseCspReports,
} from "../src/lib/csp-report-pure.ts";

/**
 * Uji pengumpul laporan pelanggaran CSP (ADM-05) — parser murni (privasi:
 * hanya origin) + wiring kebijakan report-only. Ini bukan pengganti E2E.
 * Jalankan: `npm run test:csp`
 */

const here = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(resolve(here, "..", rel), "utf8");
}

test("parseCspReports: format application/csp-report (origin-only, tanpa query)", () => {
  const out = parseCspReports({
    "csp-report": {
      "effective-directive": "script-src",
      "blocked-uri": "https://evil.example.com/track.js?token=secret",
      "document-uri":
        "https://situssaya.example/unduhan/RAHASIA-Token?utm=abc#frag",
    },
  });
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], {
    directive: "script-src",
    blocked: "https://evil.example.com",
    document: "https://situssaya.example",
  });
  // Path/query/token TIDAK boleh ikut.
  const serialized = JSON.stringify(out);
  for (const forbidden of ["secret", "RAHASIA", "utm", "track.js", "unduhan"]) {
    assert.equal(serialized.includes(forbidden), false, `bocor: ${forbidden}`);
  }
});

test("parseCspReports: format application/reports+json (array) & dedupe", () => {
  const out = parseCspReports([
    {
      type: "csp-violation",
      body: {
        effectiveDirective: "img-src",
        blockedURL: "https://cdn.example.com",
        documentURL: "https://situssaya.example/produk",
      },
    },
    {
      type: "csp-violation",
      body: {
        effectiveDirective: "img-src",
        blockedURL: "https://other.example.com",
        documentURL: "https://situssaya.example/lain",
      },
    },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].directive, "img-src");
  assert.equal(out[0].document, "https://situssaya.example");

  // Dua pelanggaran identik (origin sama) → satu entri (dedupe).
  const dupes = parseCspReports([
    { body: { effectiveDirective: "img-src", blockedURL: "https://cdn.example.com", documentURL: "https://situssaya.example/a" } },
    { body: { effectiveDirective: "img-src", blockedURL: "https://cdn.example.com", documentURL: "https://situssaya.example/b" } },
  ]);
  assert.equal(dupes.length, 1);
});

test("parseCspReports: keyword CSP (inline/eval) tetap dibaca, tak dianggap URL", () => {
  const out = parseCspReports({
    "csp-report": { "violated-directive": "style-src", "blocked-uri": "inline" },
  });
  assert.deepEqual(out, [{ directive: "style-src", blocked: "inline", document: "" }]);
});

test("parseCspReports: payload rusak/aneh tidak melempar", () => {
  assert.deepEqual(parseCspReports(null), []);
  assert.deepEqual(parseCspReports("bukan objek"), []);
  assert.deepEqual(parseCspReports({}), []);
  assert.deepEqual(parseCspReports({ "csp-report": { } }), []);
  assert.deepEqual(parseCspReports([{ body: 5 }, null, "x"]), []);
});

test("parseCspReports: membatasi jumlah entri", () => {
  const many = Array.from({ length: CSP_REPORT_MAX_ENTRIES + 10 }, (_, i) => ({
    "csp-report": {
      "effective-directive": "script-src",
      "blocked-uri": `https://host${i}.example.com`,
      "document-uri": "https://situssaya.example",
    },
  }));
  const out = parseCspReports(many);
  assert.equal(out.length, CSP_REPORT_MAX_ENTRIES);
});

test("wiring: endpoint & report-uri terpasang (ADM-05)", () => {
  const config = read("next.config.ts");
  assert.match(config, /report-uri \/api\/csp-report/);
  // CSP penuh tetap report-only (belum enforce).
  assert.match(config, /Content-Security-Policy-Report-Only/);

  const route = read("src/app/api/csp-report/route.ts");
  assert.match(route, /parseCspReports\(raw\)/);
  assert.match(route, /logEvent\("csp_violation"/);
  assert.match(route, /MAX_BODY_BYTES/);
  assert.match(route, /status: 204/);
  // Endpoint publik: TIDAK boleh memakai requireAdmin.
  assert.doesNotMatch(route, /requireAdmin/);
});
