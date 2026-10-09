import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BULK_MAX,
  bulkConfirmText,
  duplicateSlug,
  manageStatus,
  matchesManageFilter,
  normalizeBulkSlugs,
} from "../src/lib/article-manage.ts";

const NOW = Date.parse("2026-10-09T12:00:00Z");

type M = {
  title: string;
  slug: string;
  category: string;
  tags: string[];
  status: "draft" | "published";
  scheduledAt?: string;
};

function art(over: Partial<M> = {}): M {
  return {
    title: "Gemini AI untuk Bisnis",
    slug: "gemini-ai-untuk-bisnis",
    category: "Teknologi",
    tags: ["ai", "bisnis"],
    status: "published",
    ...over,
  };
}

test("B4.5 manageStatus: draft → draft", () => {
  assert.equal(manageStatus(art({ status: "draft" }), NOW), "draft");
});

test("B4.5 manageStatus: published tanpa jadwal → published", () => {
  assert.equal(manageStatus(art(), NOW), "published");
});

test("B4.5 manageStatus: jadwal di masa depan → terjadwal", () => {
  assert.equal(
    manageStatus(art({ scheduledAt: "2026-10-20T00:00:00Z" }), NOW),
    "terjadwal",
  );
});

test("B4.5 manageStatus: jadwal sudah lewat → published", () => {
  assert.equal(
    manageStatus(art({ scheduledAt: "2026-10-01T00:00:00Z" }), NOW),
    "published",
  );
});

test("B4.1 filter: tanpa filter → semua cocok", () => {
  assert.equal(matchesManageFilter(art(), {}, NOW), true);
});

test("B4.1 filter: kata kunci cocok judul, slug, dan tag (AND)", () => {
  assert.equal(matchesManageFilter(art(), { q: "gemini" }, NOW), true);
  assert.equal(matchesManageFilter(art(), { q: "gemini-ai" }, NOW), true);
  assert.equal(matchesManageFilter(art(), { q: "bisnis ai" }, NOW), true);
  assert.equal(matchesManageFilter(art(), { q: "gemini kucing" }, NOW), false);
});

test("B4.1 filter: status terjadwal", () => {
  const sched = art({ scheduledAt: "2026-10-20T00:00:00Z" });
  assert.equal(matchesManageFilter(sched, { status: "terjadwal" }, NOW), true);
  assert.equal(matchesManageFilter(sched, { status: "published" }, NOW), false);
});

test("B4.1 filter: kategori & tag", () => {
  assert.equal(matchesManageFilter(art(), { category: "Teknologi" }, NOW), true);
  assert.equal(matchesManageFilter(art(), { category: "Panduan" }, NOW), false);
  assert.equal(matchesManageFilter(art(), { tag: "ai" }, NOW), true);
  assert.equal(matchesManageFilter(art(), { tag: "seo" }, NOW), false);
});

test("B4.1 filter: 'semua' tidak membatasi", () => {
  assert.equal(matchesManageFilter(art(), { status: "semua", category: "semua" }, NOW), true);
});

test("B4.4 duplicateSlug: slug bebas → '-salinan'", () => {
  assert.equal(duplicateSlug("abc", new Set(["abc"])), "abc-salinan");
});

test("B4.4 duplicateSlug: bentrok → '-salinan-2', '-3', ...", () => {
  const taken = new Set(["abc", "abc-salinan", "abc-salinan-2"]);
  assert.equal(duplicateSlug("abc", taken), "abc-salinan-3");
});

test("B4.3 normalizeBulkSlugs: buang kosong & duplikat", () => {
  const r = normalizeBulkSlugs(["a", "a", " ", "b", 3 as unknown as string]);
  assert.deepEqual(r, { ok: true, slugs: ["a", "b"] });
});

test("B4.3 normalizeBulkSlugs: kosong → error", () => {
  assert.equal(normalizeBulkSlugs([]).ok, false);
  assert.equal(normalizeBulkSlugs("bukan-array").ok, false);
});

test("B4.3 normalizeBulkSlugs: lebih dari batas → error", () => {
  const many = Array.from({ length: BULK_MAX + 1 }, (_, i) => `s${i}`);
  assert.equal(normalizeBulkSlugs(many).ok, false);
  assert.equal(normalizeBulkSlugs(many.slice(0, BULK_MAX)).ok, true);
});

test("B4.3 bulkConfirmText: pesan sesuai aksi", () => {
  assert.match(bulkConfirmText("delete", 2), /dihapus permanen/);
  assert.match(bulkConfirmText("publish", 2), /diterbitkan/);
  assert.match(bulkConfirmText("unpublish", 2), /draft/);
});
