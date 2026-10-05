import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shouldRemind,
  normalizeCartDraftItems,
  DEFAULT_REMIND_AFTER_HOURS,
} from "../src/lib/cart-draft-pure.ts";

/**
 * Uji logika pengingat keranjang (FASE P5) — murni, tanpa I/O.
 * Jalankan: `npm run test:cart`
 */

const NOW = new Date("2026-06-10T12:00:00.000Z");
const item = [{ slug: "a", name: "A", price: 1000, qty: 1 }];

function at(hoursAgo: number): string {
  return new Date(NOW.getTime() - hoursAgo * 3_600_000).toISOString();
}

test("draft dengan item, > 24 jam, belum dipulihkan → ingatkan", () => {
  assert.equal(
    shouldRemind({ items: item, updatedAtISO: at(25) }, NOW),
    true,
  );
});

test("belum lewat jendela (H+1) → jangan", () => {
  assert.equal(
    shouldRemind({ items: item, updatedAtISO: at(DEFAULT_REMIND_AFTER_HOURS - 1) }, NOW),
    false,
  );
});

test("tanpa item → jangan", () => {
  assert.equal(shouldRemind({ items: [], updatedAtISO: at(48) }, NOW), false);
});

test("sudah dipulihkan → jangan", () => {
  assert.equal(
    shouldRemind({ items: item, updatedAtISO: at(48), recoveredAtISO: at(2) }, NOW),
    false,
  );
});

test("opt-out → jangan", () => {
  assert.equal(
    shouldRemind({ items: item, updatedAtISO: at(48), optedOut: true }, NOW),
    false,
  );
});

test("terlalu tua (> maxAgeDays) → jangan", () => {
  assert.equal(
    shouldRemind({ items: item, updatedAtISO: at(24 * 30) }, NOW),
    false,
  );
});

test("cooldown: sudah diingatkan < 24 jam lalu → jangan", () => {
  assert.equal(
    shouldRemind(
      { items: item, updatedAtISO: at(48), remindedAtISO: at(2) },
      NOW,
    ),
    false,
  );
});

test("cooldown lewat: diingatkan > 24 jam lalu → boleh lagi", () => {
  assert.equal(
    shouldRemind(
      { items: item, updatedAtISO: at(200), remindedAtISO: at(48) },
      NOW,
    ),
    true,
  );
});

test("updatedAtISO tak valid → jangan", () => {
  assert.equal(shouldRemind({ items: item, updatedAtISO: "bukan-tanggal" }, NOW), false);
});

test("normalizeCartDraftItems: buang tak valid & normalisasi qty", () => {
  const items = normalizeCartDraftItems([
    { slug: "a", name: "A", price: 1000, qty: 2.9 },
    { slug: "", name: "x", price: 5, qty: 1 },
    { slug: "b", price: 500 },
    "invalid",
  ]);
  assert.equal(items.length, 2);
  assert.equal(items[0].qty, 2);
  assert.equal(items[1].slug, "b");
  assert.equal(items[1].qty, 1);
});
