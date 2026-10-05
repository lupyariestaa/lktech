import { test } from "node:test";
import assert from "node:assert/strict";
import { isOrderExpired } from "../src/lib/order-expiry-pure.ts";

/**
 * Uji logika KEDALUWARSA order (FASE P2).
 * - Hanya order `menunggu_bayar` yang bisa kedaluwarsa.
 * - Waktu dari `payment.expiresAt`, fallback `createdAt + TTL`.
 * Jalankan: `npm run test:expiry`
 */

const TTL = 24 * 60 * 60 * 1000;
const now = new Date("2026-06-01T12:00:00.000Z");

function order(overrides: Record<string, unknown> = {}) {
  return {
    status: "menunggu_bayar" as const,
    createdAt: "2026-06-01T11:00:00.000Z",
    payment: undefined as undefined | { expiresAt?: string },
    ...overrides,
  };
}

test("menunggu_bayar tanpa expiresAt, lewat TTL → kedaluwarsa", () => {
  // createdAt 2026-06-01T11:00Z; now 12:00Z → baru 1 jam (< 24 jam) → TIDAK.
  assert.equal(isOrderExpired(order(), now, TTL), false);
});

test("createdAt jauh lampau (fallback TTL) → kedaluwarsa", () => {
  assert.equal(
    isOrderExpired(
      order({ createdAt: "2026-05-30T12:00:00.000Z" }),
      now,
      TTL,
    ),
    true,
  );
});

test("pakai payment.expiresAt bila ada", () => {
  const o = order({
    createdAt: "2026-06-01T11:59:00.000Z",
    payment: { provider: "mayar", status: "menunggu", expiresAt: "2026-06-01T11:59:30.000Z" },
  });
  assert.equal(isOrderExpired(o, now, TTL), true);
});

test("expiresAt belum lewat → belum kedaluwarsa", () => {
  const o = order({
    payment: { provider: "mayar", status: "menunggu", expiresAt: "2026-06-01T13:00:00.000Z" },
  });
  assert.equal(isOrderExpired(o, now, TTL), false);
});

test("status non-menunggu_bayar TIDAK pernah kedaluwarsa", () => {
  for (const status of ["dibayar", "diproses", "selesai", "dibatalkan", "menunggu_konfirmasi"]) {
    const o = order({
      status,
      createdAt: "2020-01-01T00:00:00.000Z",
      payment: { provider: "mayar", status: "menunggu", expiresAt: "2020-01-01T01:00:00.000Z" },
    });
    assert.equal(isOrderExpired(o, now, TTL), false, `status ${status}`);
  }
});
