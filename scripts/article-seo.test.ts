import { test } from "node:test";
import assert from "node:assert/strict";
import {
  absolutize,
  blocksToHtml,
  cdata,
  htmlEscape,
  wordCountFromMarkdown,
} from "../src/lib/markdown-html.ts";
import { parseMarkdown } from "../src/lib/markdown-parse.ts";

/** Helper uji: Markdown → HTML lewat parser dan renderer. */
function markdownToHtml(source: string, siteUrl: string): string {
  return blocksToHtml(parseMarkdown(source), siteUrl);
}

const SITE = "https://lktech.id";

test("B7.3 htmlEscape: karakter berbahaya di-escape", () => {
  assert.equal(htmlEscape(`<a href="x">&'`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
});

test("B7.3 absolutize: path relatif jadi absolut, URL absolut dibiarkan", () => {
  assert.equal(absolutize("/img/a.png", SITE), "https://lktech.id/img/a.png");
  assert.equal(absolutize("https://res.cloudinary.com/x.jpg", SITE), "https://res.cloudinary.com/x.jpg");
});

test("B7.3 markdownToHtml: heading ber-id, paragraf, daftar", () => {
  const html = markdownToHtml("## Judul\n\nTeks **tebal**.\n\n- satu\n- dua", SITE);
  assert.match(html, /<h2 id="judul">Judul<\/h2>/);
  assert.match(html, /<p>Teks <strong>tebal<\/strong>\.<\/p>/);
  assert.match(html, /<ul><li>satu<\/li><li>dua<\/li><\/ul>/);
});

test("B7.3 markdownToHtml: gambar relatif jadi absolut di RSS", () => {
  const html = markdownToHtml("![Diagram](/d.png)", SITE);
  assert.equal(html, `<figure><img src="https://lktech.id/d.png" alt="Diagram" /></figure>`);
});

test("B7.3 markdownToHtml: teks mentah HTML tidak dieksekusi (di-escape)", () => {
  const html = markdownToHtml("<script>alert(1)</script>", SITE);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("B7.3 markdownToHtml: tautan skema berbahaya jadi teks biasa", () => {
  const html = markdownToHtml("[klik](javascript:alert(1))", SITE);
  assert.doesNotMatch(html, /href/);
  assert.match(html, /klik/);
});

test("B7.3 markdownToHtml: kode & kutipan", () => {
  assert.match(markdownToHtml("> kutipan", SITE), /<blockquote>kutipan<\/blockquote>/);
  assert.match(markdownToHtml("```\na<b\n```", SITE), /<pre><code>a&lt;b<\/code><\/pre>/);
});

test("B7.3 cdata: `]]>` di isi tidak menutup CDATA lebih awal", () => {
  const out = cdata("a]]>b");
  assert.equal(out, "<![CDATA[a]]]]><![CDATA[>b]]>");
});

test("B7.5 wordCountFromMarkdown: simbol & blok kode diabaikan", () => {
  assert.equal(wordCountFromMarkdown("## Judul **tebal**\n```\nkode banyak\n```"), 2);
  assert.equal(wordCountFromMarkdown(""), 0);
});
