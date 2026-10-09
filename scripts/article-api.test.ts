import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSlugHistory,
  decideAuditAction,
  isCronAuthorized,
  revalidationPaths,
} from "../src/lib/article-api-logic.ts";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ---------- Riwayat slug (B5.7) ---------- */

test("G3 buildSlugHistory: tanpa rename, riwayat lama dipertahankan", () => {
  assert.deepEqual(
    buildSlugHistory({ slug: "baru", currentHistory: ["lama-1"] }),
    ["lama-1"],
  );
});

test("G3 buildSlugHistory: rename menambah slug asal ke riwayat", () => {
  assert.deepEqual(
    buildSlugHistory({ slug: "baru", renamedFrom: "lama" }),
    ["lama"],
  );
});

test("G3 buildSlugHistory: rename ke slug yang sama tidak menambah riwayat", () => {
  assert.deepEqual(buildSlugHistory({ slug: "a", renamedFrom: "a" }), []);
});

test("G3 buildSlugHistory: slug aktif tidak boleh ada di riwayat (A→B→A)", () => {
  // Artikel kembali ke slug A: A dihapus dari riwayat, B masuk.
  const h = buildSlugHistory({
    slug: "a",
    currentHistory: ["a"],
    renamedFrom: "b",
  });
  assert.equal(h.includes("a"), false);
  assert.equal(h.includes("b"), true);
});

test("G3 buildSlugHistory: riwayat dari slug asal digabung tanpa duplikat", () => {
  const h = buildSlugHistory({
    slug: "c",
    currentHistory: ["x"],
    renamedFrom: "b",
    renamedFromHistory: ["x", "a"],
  });
  assert.deepEqual([...h].sort(), ["a", "b", "x"]);
});

/* ---------- Aksi audit (B4.8) ---------- */

test("G3 decideAuditAction: duplikat bila sumber ada & tanpa versi sebelumnya", () => {
  assert.equal(
    decideAuditAction({ hasPrevious: false, nextStatus: "draft", duplicatedFrom: "a" }),
    "article.duplicate",
  );
});

test("G3 decideAuditAction: sumber duplikat diabaikan bila artikel sudah ada", () => {
  assert.equal(
    decideAuditAction({ hasPrevious: true, previousStatus: "draft", nextStatus: "draft", duplicatedFrom: "a" }),
    "article.save",
  );
});

test("G3 decideAuditAction: draft → published = publish", () => {
  assert.equal(
    decideAuditAction({ hasPrevious: true, previousStatus: "draft", nextStatus: "published" }),
    "article.publish",
  );
});

test("G3 decideAuditAction: published → draft = unpublish", () => {
  assert.equal(
    decideAuditAction({ hasPrevious: true, previousStatus: "published", nextStatus: "draft" }),
    "article.unpublish",
  );
});

test("G3 decideAuditAction: status tetap = save", () => {
  assert.equal(
    decideAuditAction({ hasPrevious: true, previousStatus: "published", nextStatus: "published" }),
    "article.save",
  );
});

test("G3 decideAuditAction: artikel baru tanpa sumber = save", () => {
  assert.equal(decideAuditAction({ hasPrevious: false, nextStatus: "published" }), "article.save");
});

/* ---------- Revalidate ---------- */

test("G3 revalidationPaths: selalu menyertakan list, RSS, sitemap", () => {
  const p = revalidationPaths([], slugify);
  assert.deepEqual(p, ["/blog", "/blog/rss.xml", "/sitemap.xml"]);
});

test("G3 revalidationPaths: detail, kategori, dan tag tiap artikel, tanpa duplikat", () => {
  const p = revalidationPaths(
    [
      { slug: "a", category: "Tips & Trik", tags: ["ai", "ai"] },
      { slug: "b", category: "Tips & Trik", tags: ["seo"] },
    ],
    slugify,
  );
  assert.ok(p.includes("/blog/a"));
  assert.ok(p.includes("/blog/b"));
  assert.ok(p.includes("/blog/kategori/tips-trik"));
  assert.ok(p.includes("/blog/tag/ai"));
  assert.ok(p.includes("/blog/tag/seo"));
  assert.equal(p.filter((x) => x === "/blog/kategori/tips-trik").length, 1);
});

test("G3 revalidationPaths: entri undefined (versi lama tak ada) dilewati", () => {
  const p = revalidationPaths([undefined], slugify);
  assert.deepEqual(p, ["/blog", "/blog/rss.xml", "/sitemap.xml"]);
});

/* ---------- Cron (CRON_SECRET, fail-closed) ---------- */

test("G3 isCronAuthorized: tanpa secret → selalu ditolak (fail-closed)", () => {
  assert.equal(
    isCronAuthorized({ secret: undefined, authorizationHeader: "Bearer x", queryToken: null }),
    false,
  );
  assert.equal(
    isCronAuthorized({ secret: "   ", authorizationHeader: "Bearer ", queryToken: null }),
    false,
  );
});

test("G3 isCronAuthorized: bearer benar → diizinkan", () => {
  assert.equal(
    isCronAuthorized({ secret: "s3cret", authorizationHeader: "Bearer s3cret", queryToken: null }),
    true,
  );
});

test("G3 isCronAuthorized: token query benar → diizinkan", () => {
  assert.equal(
    isCronAuthorized({ secret: "s3cret", authorizationHeader: null, queryToken: "s3cret" }),
    true,
  );
});

test("G3 isCronAuthorized: token salah / kosong → ditolak", () => {
  assert.equal(
    isCronAuthorized({ secret: "s3cret", authorizationHeader: "Bearer salah", queryToken: null }),
    false,
  );
  assert.equal(
    isCronAuthorized({ secret: "s3cret", authorizationHeader: null, queryToken: null }),
    false,
  );
});

test("G3 isCronAuthorized: skema 'Basic' tidak diterima sebagai bearer", () => {
  assert.equal(
    isCronAuthorized({ secret: "s3cret", authorizationHeader: "Basic s3cret", queryToken: null }),
    false,
  );
});
