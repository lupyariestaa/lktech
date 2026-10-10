import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildModerationPatch,
  computeRatingSummary,
  MODERATION_DELETE,
  normalizeRatingSummary,
  isValidRating,
  ratingPercent,
  emptyRatingSummary,
} from "../src/lib/review-types.ts";

/**
 * Uji logika agregat rating ulasan (FASE R).
 * Jalankan: `npm run test:reviews`
 */

test("isValidRating: 1..5 integer → valid", () => {
  for (const n of [1, 2, 3, 4, 5]) assert.equal(isValidRating(n), true, String(n));
});

test("isValidRating: di luar rentang / bukan integer → invalid", () => {
  for (const n of [0, 6, -1, 3.5, NaN, "4", null, undefined]) {
    assert.equal(isValidRating(n as never), false, String(n));
  }
});

test("computeRatingSummary: rata-rata & distribusi", () => {
  const s = computeRatingSummary([5, 5, 4, 3, 1]);
  assert.equal(s.count, 5);
  assert.equal(s.avg, 3.6); // (5+5+4+3+1)/5 = 3.6
  assert.equal(s.distribution[5], 2);
  assert.equal(s.distribution[4], 1);
  assert.equal(s.distribution[3], 1);
  assert.equal(s.distribution[2], 0);
  assert.equal(s.distribution[1], 1);
});

test("computeRatingSummary: kosong → avg 0, count 0", () => {
  const s = computeRatingSummary([]);
  assert.deepEqual(s, emptyRatingSummary());
});

test("computeRatingSummary: pembulatan 1 desimal", () => {
  // (5+4)/1? → 4.5; (5+5+4)/3 = 4.666.. → 4.7
  assert.equal(computeRatingSummary([5, 5, 4]).avg, 4.7);
  assert.equal(computeRatingSummary([4, 5]).avg, 4.5);
});

test("computeRatingSummary: mengabaikan rating tak valid", () => {
  const s = computeRatingSummary([5, 0, 7, 4, NaN] as number[]);
  assert.equal(s.count, 2);
  assert.equal(s.avg, 4.5);
});

test("normalizeRatingSummary: dokumen valid", () => {
  const s = normalizeRatingSummary({
    avg: 4.5,
    count: 2,
    distribution: { 5: 1, 4: 1 },
  });
  assert.equal(s?.avg, 4.5);
  assert.equal(s?.count, 2);
  assert.equal(s?.distribution[5], 1);
  assert.equal(s?.distribution[1], 0);
});

test("normalizeRatingSummary: kosong/nol → undefined (backward-compat)", () => {
  assert.equal(normalizeRatingSummary(undefined), undefined);
  assert.equal(normalizeRatingSummary({ avg: 0, count: 0 }), undefined);
  assert.equal(normalizeRatingSummary("x"), undefined);
});

test("ratingPercent: hitung persen & jaga dari pembagi 0", () => {
  assert.equal(ratingPercent(1, 4), 25);
  assert.equal(ratingPercent(3, 3), 100);
  assert.equal(ratingPercent(0, 0), 0);
});

/* ---------- buildModerationPatch (anti-undefined; bug moderasi) ---------- */

test("buildModerationPatch: approve tidak memuat nilai undefined", () => {
  const p = buildModerationPatch("approved", "admin@x.com", "2026-10-10T00:00:00Z");
  assert.equal(p.status, "approved");
  assert.equal(p.moderatedBy, "admin@x.com");
  // Approve → tandai hapus alasan penolakan lama (bukan undefined).
  assert.equal(p.rejectionReason, MODERATION_DELETE);
  for (const [k, v] of Object.entries(p)) {
    assert.notEqual(v, undefined, `field ${k} bernilai undefined`);
  }
});

test("buildModerationPatch: reject dengan alasan menyimpan alasan", () => {
  const p = buildModerationPatch("rejected", "admin@x.com", "2026-10-10T00:00:00Z", "  spam  ");
  assert.equal(p.status, "rejected");
  assert.equal(p.rejectionReason, "spam");
});

test("buildModerationPatch: reject tanpa alasan tidak set rejectionReason (tanpa undefined)", () => {
  const p = buildModerationPatch("rejected", "admin@x.com", "2026-10-10T00:00:00Z");
  assert.equal("rejectionReason" in p, false);
  for (const [k, v] of Object.entries(p)) {
    assert.notEqual(v, undefined, `field ${k} bernilai undefined`);
  }
});
