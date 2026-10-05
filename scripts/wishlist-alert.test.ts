import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diffProductAlerts,
  toProductState,
  inCooldown,
} from "../src/lib/wishlist-alert-pure.ts";

/**
 * Uji logika alert wishlist (Tema 2.4, FASE R3).
 * Jalankan: `npm run test:wishlist`
 */

test("tanpa state sebelumnya → tidak ada alert", () => {
  assert.deepEqual(
    diffProductAlerts({ slug: "a", price: 100000 }, null),
    [],
  );
});

test("harga turun → alert price_drop", () => {
  const alerts = diffProductAlerts(
    { slug: "a", price: 80000 },
    { price: 100000, soldOut: false },
  );
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "price_drop");
  assert.equal(alerts[0].oldPrice, 100000);
  assert.equal(alerts[0].newPrice, 80000);
});

test("harga sama/naik → tidak ada alert", () => {
  assert.deepEqual(
    diffProductAlerts({ slug: "a", price: 100000 }, { price: 100000, soldOut: false }),
    [],
  );
  assert.deepEqual(
    diffProductAlerts({ slug: "a", price: 120000 }, { price: 100000, soldOut: false }),
    [],
  );
});

test("stok kembali (soldOut → tersedia) → back_in_stock", () => {
  const alerts = diffProductAlerts(
    { slug: "a", price: 100000, soldOut: false },
    { price: 100000, soldOut: true },
  );
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "back_in_stock");
});

test("stok kembali dari stock 0 → back_in_stock", () => {
  const alerts = diffProductAlerts(
    { slug: "a", price: 100000, stock: 5, soldOut: false },
    { price: 100000, stock: 0, soldOut: false },
  );
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, "back_in_stock");
});

test("back_in_stock diprioritaskan atas price_drop", () => {
  const alerts = diffProductAlerts(
    { slug: "a", price: 80000, soldOut: false },
    { price: 100000, soldOut: true },
  );
  assert.equal(alerts[0].type, "back_in_stock");
});

test("masih habis → tidak ada alert", () => {
  assert.deepEqual(
    diffProductAlerts({ slug: "a", price: 80000, soldOut: true }, { price: 100000, soldOut: true }),
    [],
  );
});

test("toProductState: ringkas", () => {
  assert.deepEqual(toProductState({ slug: "a", price: 1000, soldOut: false, stock: 3 }), {
    price: 1000,
    soldOut: false,
    stock: 3,
  });
});

test("inCooldown: dalam & lewat jendela", () => {
  const now = new Date("2026-06-10T12:00:00Z");
  assert.equal(inCooldown(new Date(now.getTime() - 3600_000).toISOString(), now), true);
  assert.equal(inCooldown(new Date(now.getTime() - 100 * 3600_000).toISOString(), now), false);
  assert.equal(inCooldown(undefined, now), false);
});
