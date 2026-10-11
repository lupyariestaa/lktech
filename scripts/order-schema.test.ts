import { test } from "node:test";
import assert from "node:assert/strict";
import { checkoutSchema } from "../src/lib/order-schema.ts";

/**
 * Uji normalisasi kode kupon pada schema checkout (audit K13).
 * Jalankan: `npm run test:order-schema`
 */

test("couponCode: dinormalisasi uppercase & buang non-A-Z0-9", () => {
  const r = checkoutSchema.parse({
    items: [{ slug: "produk-a", qty: 1 }],
    couponCode: "promo 10!",
  });
  assert.equal(r.couponCode, "PROMO10");
});

test("couponCode: kosong/spasi → string kosong (bukan undefined)", () => {
  const r = checkoutSchema.parse({
    items: [{ slug: "produk-a", qty: 1 }],
    couponCode: "   ",
  });
  assert.equal(r.couponCode, "");
});

test("couponCode: tidak diberikan → undefined", () => {
  const r = checkoutSchema.parse({ items: [{ slug: "produk-a", qty: 1 }] });
  assert.equal(r.couponCode, undefined);
});

test("items: minimal 1 & maksimal 50", () => {
  assert.equal(checkoutSchema.safeParse({ items: [] }).success, false);
  const tooMany = Array.from({ length: 51 }, (_, i) => ({ slug: `s${i}`, qty: 1 }));
  assert.equal(checkoutSchema.safeParse({ items: tooMany }).success, false);
});

test("couponCode: lebih dari 40 char ditolak", () => {
  const r = checkoutSchema.safeParse({
    items: [{ slug: "a", qty: 1 }],
    couponCode: "A".repeat(41),
  });
  assert.equal(r.success, false);
});
