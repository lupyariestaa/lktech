import { test } from "node:test";
import assert from "node:assert/strict";
import {
  countWords,
  draftStorageKey,
  insertAt,
  isoToWibInput,
  lengthStatus,
  prefixLines,
  readingMinutes,
  wibInputToIso,
  wrapSelection,
} from "../src/lib/article-editor.ts";

test("B3.1 wrapSelection: membungkus seleksi & seleksi baru di dalam bungkus", () => {
  const r = wrapSelection("halo dunia", 5, 10, "**", "**");
  assert.equal(r.text, "halo **dunia**");
  assert.equal(r.text.slice(r.start, r.end), "dunia");
});

test("B3.1 wrapSelection: tanpa seleksi memakai placeholder", () => {
  const r = wrapSelection("", 0, 0, "*", "*", "miring");
  assert.equal(r.text, "*miring*");
  assert.equal(r.text.slice(r.start, r.end), "miring");
});

test("B3.1 prefixLines: heading pada satu baris", () => {
  const r = prefixLines("judul\nisi", 0, 0, () => "## ");
  assert.equal(r.text, "## judul\nisi");
});

test("B3.1 prefixLines: beberapa baris terseleksi jadi daftar", () => {
  const text = "satu\ndua\ntiga";
  const r = prefixLines(text, 0, text.length, () => "- ");
  assert.equal(r.text, "- satu\n- dua\n- tiga");
});

test("B3.1 prefixLines: daftar bernomor memakai indeks baris", () => {
  const text = "a\nb";
  const r = prefixLines(text, 0, text.length, (i) => `${i + 1}. `);
  assert.equal(r.text, "1. a\n2. b");
});

test("B3.1 prefixLines: toggle lepas bila semua baris sudah berawalan", () => {
  const text = "> a\n> b";
  const r = prefixLines(text, 0, text.length, () => "> ", /^> /);
  assert.equal(r.text, "a\nb");
});

test("B3.1 prefixLines: seleksi di baris kedua tidak menyentuh baris pertama", () => {
  const text = "pertama\nkedua";
  const pos = text.indexOf("kedua");
  const r = prefixLines(text, pos, pos + 3, () => "## ");
  assert.equal(r.text, "pertama\n## kedua");
});

test("B3.1 prefixLines: awal dokumen dengan newline tidak salah hitung baris", () => {
  const r = prefixLines("\nisi", 0, 0, () => "- ");
  assert.equal(r.text, "- \nisi");
});

test("insertAt: sisipkan dengan baris kosong di kedua sisi", () => {
  const text = "A\n\nB";
  const pos = text.indexOf("B");
  const r = insertAt(text, pos, pos, "![x](/a.png)");
  assert.equal(r.text, "A\n\n![x](/a.png)\n\nB");
});

test("countWords: simbol markdown tidak dihitung sebagai kata", () => {
  assert.equal(countWords("## Judul **tebal** - daftar"), 3);
  assert.equal(countWords(""), 0);
});

test("countWords: blok kode diabaikan", () => {
  assert.equal(countWords("satu dua\n```\nbanyak kata di kode\n```"), 2);
});

test("readingMinutes: minimal 1 menit", () => {
  assert.equal(readingMinutes(""), 1);
  assert.equal(readingMinutes("kata ".repeat(401)), 3);
});

test("B3.6 lengthStatus: kosong / pendek / ok / panjang", () => {
  assert.equal(lengthStatus(0, 50, 60), "kosong");
  assert.equal(lengthStatus(10, 50, 60), "pendek");
  assert.equal(lengthStatus(55, 50, 60), "ok");
  assert.equal(lengthStatus(70, 50, 60), "panjang");
});

test("B3.7 isoToWibInput: UTC → WIB (+7)", () => {
  assert.equal(isoToWibInput("2026-10-09T00:00:00.000Z"), "2026-10-09T07:00");
});

test("B3.7 isoToWibInput: kosong/tidak valid → \"\"", () => {
  assert.equal(isoToWibInput(undefined), "");
  assert.equal(isoToWibInput("bukan-tanggal"), "");
});

test("B3.7 wibInputToIso: WIB → UTC ISO", () => {
  assert.equal(wibInputToIso("2026-10-09T07:00"), "2026-10-09T00:00:00.000Z");
});

test("B3.7 wibInputToIso: kosong → kosong, format salah → null", () => {
  assert.equal(wibInputToIso(""), "");
  assert.equal(wibInputToIso("09/10/2026 07:00"), null);
});

test("B3.7 round-trip ISO ↔ WIB input konsisten", () => {
  const iso = "2026-12-31T23:30:00.000Z";
  assert.equal(wibInputToIso(isoToWibInput(iso)), iso);
});

test("B3.4 draftStorageKey: slug atau 'baru'", () => {
  assert.equal(draftStorageKey("abc"), "lktech:article-draft:abc");
  assert.equal(draftStorageKey(""), "lktech:article-draft:baru");
});
