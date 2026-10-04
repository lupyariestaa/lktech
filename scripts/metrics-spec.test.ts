import { test } from "node:test";
import assert from "node:assert/strict";
import { computeCompletionRate } from "../src/lib/metrics-spec.ts";

/**
 * Uji rumus metrik analitik (`AN-C1`).
 * Rumus resmi: selesai / (total periode − dibatalkan).
 * Jalankan: `npm run test:metrics`
 * (Node ≥22 dengan type stripping — tanpa dependensi tambahan.)
 */

test("completionRate = selesai / (total − dibatalkan)", () => {
  const rate = computeCompletionRate({
    baru: 3,
    diproses: 2,
    selesai: 5,
    dibatalkan: 4,
  });
  // 5 / (3 + 2 + 5) = 5 / 10 = 0.5
  assert.equal(rate, 0.5);
});

test("completionRate 0 bila tak ada order (penyebut 0)", () => {
  assert.equal(
    computeCompletionRate({ baru: 0, diproses: 0, selesai: 0, dibatalkan: 0 }),
    0,
  );
});

test("completionRate = 1 bila semua selesai", () => {
  assert.equal(
    computeCompletionRate({ baru: 0, diproses: 0, selesai: 7, dibatalkan: 5 }),
    1,
  );
});

test("completionRate tidak dipengaruhi jumlah dibatalkan (dikecualikan)", () => {
  const a = computeCompletionRate({ baru: 0, diproses: 0, selesai: 2, dibatalkan: 0 });
  const b = computeCompletionRate({ baru: 0, diproses: 0, selesai: 2, dibatalkan: 100 });
  assert.equal(a, b);
});
