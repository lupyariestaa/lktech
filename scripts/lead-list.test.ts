import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extension.
import {
  hasLeadFilter,
  matchesLeadQuery,
  normalizeLeadQuery,
  paginateLeads,
} from "../src/lib/lead-list-pure.ts";

/**
 * Uji pencarian/filter & paginasi lead (Sprint 12 / ADM-16).
 * Jalankan: `npm run test:lead-list`
 */

const lead = (over: Partial<{
  id: string;
  name: string;
  email: string;
  service: string;
  message: string;
  status: string;
}> = {}) => ({
  id: "l1",
  name: "Budi Santoso",
  email: "budi@contoh.id",
  service: "Website Company Profile",
  message: "Butuh website untuk usaha kami.",
  status: "baru",
  ...over,
});

test("normalizeLeadQuery: trim + lowercase", () => {
  assert.equal(normalizeLeadQuery("  BUdi "), "budi");
  assert.equal(normalizeLeadQuery(undefined), "");
});

test("matchesLeadQuery: tanpa filter mencocokkan semua", () => {
  assert.equal(matchesLeadQuery(lead(), {}), true);
  assert.equal(matchesLeadQuery(lead(), { q: "   ", status: "semua" }), true);
});

test("matchesLeadQuery: filter status ketat", () => {
  assert.equal(matchesLeadQuery(lead({ status: "baru" }), { status: "baru" }), true);
  assert.equal(matchesLeadQuery(lead({ status: "baru" }), { status: "selesai" }), false);
});

test("matchesLeadQuery: lead tanpa status dianggap baru", () => {
  const legacy = { name: "Lama", email: "a@b.id", service: "X", message: "Y" };
  assert.equal(matchesLeadQuery(legacy, { status: "baru" }), true);
  assert.equal(matchesLeadQuery(legacy, { status: "arsip" }), false);
});

test("matchesLeadQuery: kata kunci dicari di nama/email/layanan/pesan", () => {
  assert.equal(matchesLeadQuery(lead(), { q: "budi" }), true);
  assert.equal(matchesLeadQuery(lead(), { q: "CONTOH.ID" }), true);
  assert.equal(matchesLeadQuery(lead(), { q: "company" }), true);
  assert.equal(matchesLeadQuery(lead(), { q: "usaha" }), true);
  assert.equal(matchesLeadQuery(lead(), { q: "tidak-ada" }), false);
});

test("matchesLeadQuery: status & kata kunci digabung (AND)", () => {
  assert.equal(
    matchesLeadQuery(lead({ status: "diproses" }), { q: "budi", status: "diproses" }),
    true,
  );
  assert.equal(
    matchesLeadQuery(lead({ status: "diproses" }), { q: "budi", status: "selesai" }),
    false,
  );
});

test("hasLeadFilter: hanya true bila ada q/status efektif", () => {
  assert.equal(hasLeadFilter({}), false);
  assert.equal(hasLeadFilter({ q: "  ", status: "semua" }), false);
  assert.equal(hasLeadFilter({ q: "budi" }), true);
  assert.equal(hasLeadFilter({ status: "baru" }), true);
});

test("paginateLeads: halaman pertama + kursor berikutnya", () => {
  const list = [lead({ id: "a" }), lead({ id: "b" }), lead({ id: "c" })];
  const page = paginateLeads({
    filtered: list,
    cursorId: null,
    limit: 2,
    scanExhausted: true,
  });
  assert.deepEqual(page.items.map((i) => i.id), ["a", "b"]);
  assert.equal(page.nextCursor, "b");
  assert.equal(page.truncated, false);
});

test("paginateLeads: melanjutkan setelah kursor", () => {
  const list = [lead({ id: "a" }), lead({ id: "b" }), lead({ id: "c" })];
  const page = paginateLeads({
    filtered: list,
    cursorId: "b",
    limit: 2,
    scanExhausted: true,
  });
  assert.deepEqual(page.items.map((i) => i.id), ["c"]);
  assert.equal(page.nextCursor, null);
});

test("paginateLeads: kursor tak ditemukan → mulai dari awal (tidak hilang data)", () => {
  const list = [lead({ id: "a" }), lead({ id: "b" })];
  const page = paginateLeads({
    filtered: list,
    cursorId: "hilang",
    limit: 1,
    scanExhausted: true,
  });
  assert.deepEqual(page.items.map((i) => i.id), ["a"]);
});

test("paginateLeads: pemindaian belum habis → truncated=true", () => {
  const page = paginateLeads({
    filtered: [lead({ id: "a" })],
    cursorId: null,
    limit: 10,
    scanExhausted: false,
  });
  assert.equal(page.truncated, true);
});

test("paginateLeads: limit tak valid dinormalkan (>=1)", () => {
  const page = paginateLeads({
    filtered: [lead({ id: "a" }), lead({ id: "b" })],
    cursorId: null,
    limit: 0,
    scanExhausted: true,
  });
  assert.equal(page.items.length, 1);
});