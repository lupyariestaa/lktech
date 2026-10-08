import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildImageSnippet,
  extractImageUrls,
  insertBlock,
} from "../src/lib/markdown-insert.ts";
import { parseMarkdown, safeImageSrc } from "../src/lib/markdown-parse.ts";

test("safeImageSrc di markdown-parse menolak sumber luar (sumber kebenaran)", () => {
  assert.equal(safeImageSrc("https://evil.com/a.jpg"), null);
});

const CLOUD = "https://res.cloudinary.com/demo/image/upload/v1/lktech/blog/a.jpg";

test("B1.4 buildImageSnippet: alt kosong ditolak", () => {
  assert.equal(buildImageSnippet("   ", CLOUD, false), null);
});

test("buildImageSnippet: sumber tak aman ditolak", () => {
  assert.equal(buildImageSnippet("Foto", "https://evil.com/a.jpg", false), null);
  assert.equal(buildImageSnippet("Foto", "javascript:alert(1)", false), null);
});

test("buildImageSnippet: alt dibersihkan dari karakter sintaks", () => {
  const s = buildImageSnippet('Foto "tim" [A](b)', CLOUD, false);
  assert.equal(s, `![Foto tim A b](${CLOUD})`);
});

test("B1.5 buildImageSnippet: wide menambah title", () => {
  assert.equal(buildImageSnippet("Banner", CLOUD, true), `![Banner](${CLOUD} "wide")`);
});

test("snippet hasil build bisa di-parse kembali jadi gambar", () => {
  const s = buildImageSnippet("Diagram alur", CLOUD, true);
  assert.ok(s);
  const [b] = parseMarkdown(s);
  assert.equal(b.t, "img");
  assert.equal(b.t === "img" && b.wide, true);
  assert.equal(b.t === "img" && b.alt, "Diagram alur");
});

test("insertBlock: sisip di tengah teks memberi baris kosong di kedua sisi", () => {
  const text = "Paragraf satu.\n\nParagraf dua.";
  const pos = text.indexOf("Paragraf dua");
  const r = insertBlock(text, pos, pos, "![x](/a.png)");
  assert.equal(r.text, "Paragraf satu.\n\n![x](/a.png)\n\nParagraf dua.");
  // Kursor tepat setelah sisipan (sebelum trailing "\n\n").
  assert.equal(r.cursor, "Paragraf satu.\n\n![x](/a.png)".length);
});

test("insertBlock: menggantikan seleksi", () => {
  const r = insertBlock("abc XYZ def", 4, 7, "![g](/g.png)");
  assert.equal(r.text, "abc \n\n![g](/g.png)\n\n def");
});

test("insertBlock: di awal dokumen tanpa baris kosong di depan", () => {
  const r = insertBlock("isi", 0, 0, "![g](/g.png)");
  assert.equal(r.text, "![g](/g.png)\n\nisi");
});

test("insertBlock: kursor di posisi akhir sisipan", () => {
  const r = insertBlock("", 0, 0, "![g](/g.png)");
  assert.equal(r.cursor, "![g](/g.png)".length);
});

test("extractImageUrls: kumpulkan semua URL gambar unik dari body", () => {
  const body = `Teks ![a](${CLOUD}) lalu ![b](/x.png)\n\n![a lagi](${CLOUD})`;
  assert.deepEqual(extractImageUrls(body), [CLOUD, "/x.png"]);
});

test("extractImageUrls: tautan biasa bukan gambar", () => {
  assert.deepEqual(extractImageUrls("[link](https://x.com)"), []);
});
