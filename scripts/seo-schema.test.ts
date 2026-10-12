import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildFaqPage,
  buildBreadcrumb,
  buildItemList,
} from "../src/lib/structured-data-pure.ts";

/**
 * Uji pembangun JSON-LD murni (fase S2).
 * Jalankan: `npm run test:seo-schema`
 */

/* ---- buildFaqPage ---- */

test("buildFaqPage: null bila kosong", () => {
  assert.equal(buildFaqPage([]), null);
});

test("buildFaqPage: FAQ valid → node FAQPage", () => {
  const node = buildFaqPage([{ question: "Apa itu LKTech?", answer: "Jasa digital." }]);
  assert.equal(node?.["@type"], "FAQPage");
  const me = node?.mainEntity as Array<Record<string, unknown>>;
  assert.equal(me.length, 1);
  assert.equal(me[0].name, "Apa itu LKTech?");
  const ans = me[0].acceptedAnswer as Record<string, unknown>;
  assert.equal(ans.text, "Jasa digital.");
});

test("buildFaqPage: buang entri kosong & strip HTML", () => {
  const node = buildFaqPage([
    { question: "", answer: "x" },
    { question: "Q", answer: "" },
    { question: "<b>Judul</b>", answer: "<p>Jawab <a href='#'>ini</a></p>" },
  ]);
  const me = node?.mainEntity as Array<Record<string, unknown>>;
  assert.equal(me.length, 1);
  assert.equal(me[0].name, "Judul");
  assert.equal((me[0].acceptedAnswer as Record<string, unknown>).text, "Jawab ini");
});

test("buildFaqPage: semua kosong → null", () => {
  assert.equal(buildFaqPage([{ question: " ", answer: " " }]), null);
});

/* ---- buildBreadcrumb ---- */

test("buildBreadcrumb: null bila < 2 item", () => {
  assert.equal(buildBreadcrumb([{ label: "Beranda", href: "/" }], "https://x.id"), null);
  assert.equal(buildBreadcrumb([], "https://x.id"), null);
});

test("buildBreadcrumb: item relatif → absolut; absolut tetap", () => {
  const node = buildBreadcrumb(
    [
      { label: "Beranda", href: "/" },
      { label: "Layanan", href: "/layanan" },
      { label: "Web" },
    ],
    "https://x.id/",
  );
  const items = node?.itemListElement as Array<Record<string, unknown>>;
  assert.equal(items.length, 3);
  assert.equal(items[0].item, "https://x.id");
  assert.equal(items[1].item, "https://x.id/layanan");
  // Item terakhir tanpa href → tanpa `item`.
  assert.equal("item" in items[2], false);
  assert.equal(items[2].position, 3);
});

/* ---- buildItemList ---- */

test("buildItemList: null bila kosong", () => {
  assert.equal(buildItemList([]), null);
  assert.equal(buildItemList([{ name: "", url: "x" }]), null);
});

test("buildItemList: nomor & jumlah", () => {
  const node = buildItemList(
    [
      { name: "A", url: "https://x.id/a" },
      { name: "B", url: "https://x.id/b" },
    ],
    "Katalog",
  );
  assert.equal(node?.["@type"], "ItemList");
  assert.equal(node?.numberOfItems, 2);
  assert.equal(node?.name, "Katalog");
  const items = node?.itemListElement as Array<Record<string, unknown>>;
  assert.equal(items[0].position, 1);
  assert.equal(items[1].url, "https://x.id/b");
});
