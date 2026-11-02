import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extension.
import {
  TEXT_LIMITS,
  cleanText,
  countTextStats,
  indentValue,
  normalizeLineEndings,
  sortKeysDeep,
  transformText,
} from "../src/lib/tools/text-pure.ts";

/**
 * Uji logika murni Formatter Teks (F2d).
 * Jalankan: `npm run test:tools-text`
 */

test("countTextStats: kosong, kata, baris, byte UTF-8", () => {
  assert.deepEqual(countTextStats(""), { chars: 0, words: 0, lines: 0, bytes: 0 });
  assert.deepEqual(countTextStats("halo dunia"), {
    chars: 10,
    words: 2,
    lines: 1,
    bytes: 10,
  });
  assert.deepEqual(countTextStats("a\nb\r\nc"), {
    chars: 6,
    words: 3,
    lines: 3,
    bytes: 6,
  });
  const accented = countTextStats("é");
  assert.equal(accented.chars, 1);
  assert.equal(accented.bytes, 2);
});

test("indentValue: 2, 4, dan tab", () => {
  assert.equal(indentValue(2), 2);
  assert.equal(indentValue(4), 4);
  assert.equal(indentValue("tab"), "\t");
  assert.equal(indentValue(undefined), 2);
});

test("sortKeysDeep: objek rekursif, array tetap", () => {
  const input = { b: 1, a: { d: 2, c: 3 }, list: [{ z: 1, y: 2 }] };
  assert.deepEqual(sortKeysDeep(input), {
    a: { c: 3, d: 2 },
    b: 1,
    list: [{ y: 2, z: 1 }],
  });
  assert.equal(sortKeysDeep(5), 5);
  assert.equal(sortKeysDeep(null), null);
});

test("normalizeLineEndings: LF <-> CRLF", () => {
  assert.equal(normalizeLineEndings("a\r\nb\rc", "lf"), "a\nb\nc");
  assert.equal(normalizeLineEndings("a\nb", "crlf"), "a\r\nb");
});

test("cleanText: buang spasi akhir & ringkas baris kosong", () => {
  assert.equal(
    cleanText("\n  halo   \n\n\n\n dunia\t\n"),
    "  halo\n\n dunia",
  );
  assert.equal(cleanText("a\r\nb"), "a\nb");
  assert.equal(cleanText(""), "");
});

test("transformText json-pretty: indentasi & validasi", () => {
  const result = transformText('{"b":1,"a":[2,3]}', { mode: "json-pretty" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.output, '{\n  "b": 1,\n  "a": [\n    2,\n    3\n  ]\n}');
  assert.ok(result.stats.lines > 1);

  const four = transformText('{"a":1}', { mode: "json-pretty", indent: 4 });
  assert.equal(four.ok, true);
  if (four.ok) assert.equal(four.output, '{\n    "a": 1\n}');

  const tab = transformText('{"a":1}', { mode: "json-pretty", indent: "tab" });
  assert.equal(tab.ok, true);
  if (tab.ok) assert.equal(tab.output, '{\n\t"a": 1\n}');
});

test("transformText json-pretty: sortKeys", () => {
  const result = transformText('{"b":1,"a":2}', {
    mode: "json-pretty",
    sortKeys: true,
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.output, '{\n  "a": 2,\n  "b": 1\n}');
});

test("transformText json-minify: satu baris", () => {
  const result = transformText('{\n  "a": 1,\n  "b": [2, 3]\n}', {
    mode: "json-minify",
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.output, '{"a":1,"b":[2,3]}');
});

test("transformText: JSON tidak valid melaporkan error", () => {
  const result = transformText("{ a: 1 }", { mode: "json-pretty" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /JSON tidak valid/);
});

test("transformText: text-clean tidak mem-parse JSON", () => {
  const result = transformText("  { a: 1 }  \n\n\n", { mode: "text-clean" });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.output, "  { a: 1 }");
});

test("transformText: batas input dilaporkan jujur", () => {
  const big = "a".repeat(TEXT_LIMITS.maxInputChars + 1);
  const result = transformText(big, { mode: "text-clean" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /terlalu besar/);
});