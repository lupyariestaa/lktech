import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell } from "../src/lib/csv.ts";

/**
 * Uji mitigasi CSV formula injection (ADM-06).
 * Jalankan: `npm run test:csv`
 */

test("csvCell: formula prefix dinetralkan", () => {
  assert.equal(csvCell("=HYPERLINK(\"http://evil\")"), "\"'=HYPERLINK(\"\"http://evil\"\")\"");
  assert.equal(csvCell("+SUM(A1:A2)"), "\"'+SUM(A1:A2)\"");
  assert.equal(csvCell("-2+3"), "\"'-2+3\"");
  assert.equal(csvCell("@cmd"), "\"'@cmd\"");
  assert.equal(csvCell("\t=1+1"), "\"'\t=1+1\"");
  assert.equal(csvCell("\r=1+1"), "\"'\r=1+1\"");
});

test("csvCell: angka murni tetap angka", () => {
  assert.equal(csvCell(-123), "\"-123\"");
  assert.equal(csvCell("+628123456789"), "\"+628123456789\"");
  assert.equal(csvCell("0"), "\"0\"");
  assert.equal(csvCell("-1,5"), "\"-1,5\"");
});

test("csvCell: quote, koma, newline, dan nilai kosong", () => {
  assert.equal(csvCell('Budi "Budi"'), "\"Budi \"\"Budi\"\"\"");
  assert.equal(csvCell("a,b"), "\"a,b\"");
  assert.equal(csvCell("baris 1\nbaris 2"), "\"baris 1\nbaris 2\"");
  assert.equal(csvCell(null), "\"\"");
  assert.equal(csvCell(undefined), "\"\"");
});
