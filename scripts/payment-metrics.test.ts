import { test } from "node:test";
import assert from "node:assert/strict";
import { computePaymentMetrics } from "../src/lib/payment-metrics-pure.ts";

/**
 * Uji metrik pembayaran murni (fase S5).
 * Jalankan: `npm run test:payment`
 */

test("computePaymentMetrics: hitung dibayar/menunggu/kedaluwarsa", () => {
  const m = computePaymentMetrics([
    { status: "dibayar", total: 100_000, payment: { provider: "mayar", status: "dibayar" } },
    { status: "menunggu_bayar", total: 50_000, payment: { provider: "mayar", status: "menunggu" } },
    { status: "kedaluwarsa", total: 70_000, payment: { provider: "mayar", status: "menunggu" } },
  ]);
  assert.equal(m.gatewayOrders, 3);
  assert.equal(m.paid, 1);
  assert.equal(m.pending, 2); // baris menunggu + kedaluwarsa sama-sama payment.status "menunggu"
  assert.equal(m.expired, 1);
  assert.equal(m.paidAmount, 100_000);
});

test("computePaymentMetrics: konversi = paid / (paid + expired)", () => {
  const m = computePaymentMetrics([
    { status: "dibayar", total: 100, payment: { status: "dibayar" } },
    { status: "selesai", total: 100, payment: { status: "dibayar" } },
    { status: "kedaluwarsa", total: 100, payment: { status: "menunggu" } },
  ]);
  // paid = 2 (dibayar, selesai) ; expired = 1 → 2/3
  assert.ok(Math.abs(m.conversionRate - 2 / 3) < 1e-9);
});

test("computePaymentMetrics: mismatch dihitung", () => {
  const m = computePaymentMetrics([
    { status: "menunggu_bayar", total: 100, payment: { status: "menunggu" }, paymentMismatch: { received: 50, expected: 100 } },
  ]);
  assert.equal(m.mismatch, 1);
});

test("computePaymentMetrics: order tanpa gateway tak dihitung gatewayOrders", () => {
  const m = computePaymentMetrics([{ status: "baru", total: 100, payment: null }]);
  assert.equal(m.gatewayOrders, 0);
  assert.equal(m.paid, 0);
});

test("computePaymentMetrics: kosong → nol", () => {
  const m = computePaymentMetrics([]);
  assert.deepEqual(m, {
    gatewayOrders: 0,
    paid: 0,
    pending: 0,
    expired: 0,
    mismatch: 0,
    paidAmount: 0,
    conversionRate: 0,
  });
});
