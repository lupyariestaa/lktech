import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateReservationLines,
  normalizeStockReservation,
  planStockDecrement,
  planStockIncrement,
  reservationKey,
  shouldReleaseStock,
} from "../src/lib/stock-pure.ts";

/**
 * Uji logika MURNI reservasi stok (Sprint 2 / O-01).
 * Jalankan: `npm run test:stock-reservation`
 */

/* -------------------------------------------------------------------------- */
/* Agregasi baris keranjang                                                    */
/* -------------------------------------------------------------------------- */

test("reservationKey: membedakan produk & varian", () => {
  assert.equal(reservationKey({ slug: "a" }), "a::");
  assert.equal(reservationKey({ slug: "a", variantSlug: "basic" }), "a::basic");
  assert.notEqual(
    reservationKey({ slug: "a", variantSlug: "basic" }),
    reservationKey({ slug: "a", variantSlug: "pro" }),
  );
});

test("aggregateReservationLines: menjumlahkan duplikat (produk tunggal)", () => {
  const out = aggregateReservationLines([
    { slug: "a", qty: 1 },
    { slug: "a", qty: 2 },
  ]);
  assert.deepEqual(out, [{ slug: "a", qty: 3 }]);
});

test("aggregateReservationLines: varian berbeda tetap terpisah", () => {
  const out = aggregateReservationLines([
    { slug: "a", variantSlug: "basic", qty: 1 },
    { slug: "a", variantSlug: "pro", qty: 2 },
    { slug: "a", variantSlug: "basic", qty: 4 },
  ]);
  assert.deepEqual(out, [
    { slug: "a", variantSlug: "basic", qty: 5 },
    { slug: "a", variantSlug: "pro", qty: 2 },
  ]);
});

test("aggregateReservationLines: membuang baris tak valid", () => {
  const out = aggregateReservationLines([
    { slug: "  ", qty: 2 },
    { slug: "a", qty: 0 },
    { slug: "b", qty: -3 },
    { slug: "c", qty: 1.9 },
  ]);
  assert.deepEqual(out, [{ slug: "c", qty: 1 }]);
});

/* -------------------------------------------------------------------------- */
/* Perencanaan pengurangan / penambahan stok                                   */
/* -------------------------------------------------------------------------- */

test("planStockDecrement: stok tak diisi → unlimited (tak direservasi)", () => {
  assert.deepEqual(planStockDecrement(undefined, 3), { kind: "unlimited" });
  assert.deepEqual(planStockDecrement(NaN, 3), { kind: "unlimited" });
});

test("planStockDecrement: cukup → reserved dengan sisa baru", () => {
  assert.deepEqual(planStockDecrement(5, 2), { kind: "reserved", next: 3 });
  assert.deepEqual(planStockDecrement(5, 5), { kind: "reserved", next: 0 });
});

test("planStockDecrement: kurang → insufficient + sisa", () => {
  assert.deepEqual(planStockDecrement(3, 4), { kind: "insufficient", left: 3 });
  assert.deepEqual(planStockDecrement(0, 1), { kind: "insufficient", left: 0 });
  assert.deepEqual(planStockDecrement(-2, 1), { kind: "insufficient", left: 0 });
});

test("planStockIncrement: menambah; undefined tetap undefined", () => {
  assert.equal(planStockIncrement(3, 2), 5);
  assert.equal(planStockIncrement(0, 4), 4);
  assert.equal(planStockIncrement(undefined, 2), undefined);
  assert.equal(planStockIncrement(NaN, 2), undefined);
});

/* -------------------------------------------------------------------------- */
/* Normalisasi field order                                                     */
/* -------------------------------------------------------------------------- */

test("normalizeStockReservation: menyaring & merapikan baris", () => {
  const out = normalizeStockReservation([
    { slug: " a ", qty: 2 },
    { slug: "b", variantSlug: " pro ", qty: 1.5 },
    { slug: "", qty: 1 },
    { slug: "c", qty: 0 },
    { nope: true },
  ]);
  assert.deepEqual(out, [
    { slug: "a", qty: 2 },
    { slug: "b", variantSlug: "pro", qty: 1 },
  ]);
});

test("normalizeStockReservation: kosong/invalid → undefined", () => {
  assert.equal(normalizeStockReservation(undefined), undefined);
  assert.equal(normalizeStockReservation([]), undefined);
  assert.equal(normalizeStockReservation("x"), undefined);
  assert.equal(normalizeStockReservation([{ slug: "", qty: 0 }]), undefined);
});

/* -------------------------------------------------------------------------- */
/* Keputusan pelepasan stok                                                    */
/* -------------------------------------------------------------------------- */

test("shouldReleaseStock: dibatalkan/kedaluwarsa melepas", () => {
  assert.equal(shouldReleaseStock("menunggu_bayar", "dibatalkan"), true);
  assert.equal(shouldReleaseStock("menunggu_bayar", "kedaluwarsa"), true);
  assert.equal(shouldReleaseStock("dibayar", "dibatalkan"), true);
});

test("shouldReleaseStock: lunas/selesai/tanpa perubahan tidak melepas", () => {
  assert.equal(shouldReleaseStock("menunggu_bayar", "dibayar"), false);
  assert.equal(shouldReleaseStock("dibayar", "selesai"), false);
  assert.equal(shouldReleaseStock("dibatalkan", "dibatalkan"), false);
  assert.equal(shouldReleaseStock("selesai", "dibatalkan"), false);
});
