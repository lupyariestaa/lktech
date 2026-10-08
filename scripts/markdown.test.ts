import { test } from "node:test";
import assert from "node:assert/strict";
import {
  headingId,
  parseInline,
  parseMarkdown,
  safeHref,
  safeImageSrc,
} from "../src/lib/markdown-parse.ts";

test("safeHref: skema aman lolos, javascript: ditolak", () => {
  assert.equal(safeHref("https://lktech.id"), "https://lktech.id");
  assert.equal(safeHref("/layanan"), "/layanan");
  assert.equal(safeHref("mailto:a@b.co"), "mailto:a@b.co");
  assert.equal(safeHref("javascript:alert(1)"), null);
  assert.equal(safeHref("//evil.com"), null);
});

test("safeImageSrc: hanya path internal atau Cloudinary", () => {
  assert.equal(safeImageSrc("/img/a.png"), "/img/a.png");
  assert.equal(
    safeImageSrc("https://res.cloudinary.com/x/image/upload/a.jpg"),
    "https://res.cloudinary.com/x/image/upload/a.jpg",
  );
  assert.equal(safeImageSrc("https://evil.com/a.jpg"), null);
  assert.equal(safeImageSrc("javascript:alert(1)"), null);
});

test("B2.1 gambar: alt wajib & host aman", () => {
  const ok = parseMarkdown("![Foto tim](https://res.cloudinary.com/x/a.jpg)");
  assert.deepEqual(ok, [
    { t: "img", src: "https://res.cloudinary.com/x/a.jpg", alt: "Foto tim", wide: false },
  ]);

  // Alt kosong → tidak dirender.
  assert.deepEqual(parseMarkdown("![](https://res.cloudinary.com/x/a.jpg)"), []);
  // Host tak diizinkan → tidak dirender.
  assert.deepEqual(parseMarkdown("![x](https://evil.com/a.jpg)"), []);
});

test("B1.5 gambar lebar lewat title \"wide\"", () => {
  const [b] = parseMarkdown('![Banner](/img/b.png "wide")');
  assert.equal(b.t, "img");
  assert.equal(b.t === "img" && b.wide, true);
});

test("gambar inline di tengah paragraf jadi node img", () => {
  const [p] = parseMarkdown("Teks awal ![Diagram](/d.png) teks akhir");
  assert.equal(p.t, "p");
  const kinds = p.t === "p" ? p.inline.map((n) => n.t) : [];
  assert.deepEqual(kinds, ["text", "img", "text"]);
});

test("B2.2 blockquote: baris berurutan jadi satu kutipan", () => {
  const blocks = parseMarkdown("> Baris satu\n> baris dua");
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].t, "quote");
});

test("B2.3 kode fenced: isi tidak diparse sebagai markdown", () => {
  const blocks = parseMarkdown("```js\n**bukan tebal** <script>\n```");
  assert.deepEqual(blocks, [
    { t: "code", lang: "js", code: "**bukan tebal** <script>" },
  ]);
});

test("B2.3 kode inline dengan tanda bintang di dalamnya", () => {
  const nodes = parseInline("pakai `a*b*c` di sini");
  assert.equal(nodes[1].t, "code");
  assert.equal(nodes[1].t === "code" && nodes[1].v, "a*b*c");
});

test("B2.4 daftar bernomor", () => {
  const [list] = parseMarkdown("1. satu\n2. dua\n3. tiga");
  assert.equal(list.t, "ol");
  assert.equal(list.t === "ol" && list.items.length, 3);
});

test("B2.5 heading #### dan id anchor dari teks", () => {
  const blocks = parseMarkdown("## Mulai dari Mana?\n#### Detail Kecil");
  assert.equal(blocks[0].t === "h" && blocks[0].level, 2);
  assert.equal(blocks[0].t === "h" && blocks[0].id, "mulai-dari-mana");
  assert.equal(blocks[1].t === "h" && blocks[1].level, 4);
});

test("headingId: aman untuk atribut id", () => {
  assert.equal(headingId("Tips & Trik!"), "tips-trik");
  assert.equal(headingId("  Ganda   Spasi  "), "ganda-spasi");
});

test("teks HTML mentah tetap jadi teks (tidak dieksekusi)", () => {
  const [p] = parseMarkdown("<img src=x onerror=alert(1)>");
  assert.equal(p.t, "p");
  assert.deepEqual(p.t === "p" ? p.inline : [], [
    { t: "text", v: "<img src=x onerror=alert(1)>" },
  ]);
});

test("tautan skema berbahaya jadi teks biasa", () => {
  const [p] = parseMarkdown("[klik](javascript:alert(1))");
  assert.deepEqual(p.t === "p" ? p.inline : [], [{ t: "text", v: "klik" }]);
});

test("tautan eksternal ditandai external", () => {
  const [p] = parseMarkdown("[LKTech](https://lktech.id)");
  const node = p.t === "p" ? p.inline[0] : null;
  assert.equal(node?.t, "a");
  assert.equal(node?.t === "a" && node.external, true);
});

test("daftar tak-bernomor & paragraf tetap berfungsi (regresi)", () => {
  const blocks = parseMarkdown("Paragraf satu\n\n- a\n- b\n\n---\n\nAkhir");
  assert.deepEqual(blocks.map((b) => b.t), ["p", "ul", "hr", "p"]);
});

test("tidak loop tak terbatas pada input aneh", () => {
  assert.doesNotThrow(() => parseMarkdown("#\n>\n```\n*\n1.\n!["));
});
