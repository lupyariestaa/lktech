import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computePaymentMetrics,
  clampDays,
  DEFAULT_METRIC_DAYS,
  MIN_METRIC_DAYS,
  MAX_METRIC_DAYS,
} from "../src/lib/payment-metrics-pure.ts";

/**
 * Uji metrik pembayaran murni (fase S5 + gap G15/G16).
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
  // G15: sumber tunggal = status ORDER. menunggu_bayar = pending; kedaluwarsa = expired.
  assert.equal(m.pending, 1);
  assert.equal(m.expired, 1);
  assert.equal(m.paidAmount, 100_000);
});

test("G15: order dibatalkan setelah bayar TIDAK dihitung paid (pakai status order)", () => {
  const m = computePaymentMetrics([
    // payment.status "dibayar" tapi order sudah dibatalkan → tidak boleh counted.
    { status: "dibatalkan", total: 200_000, payment: { provider: "mayar", status: "dibayar" } },
    { status: "selesai", total: 100_000, payment: { provider: "mayar", status: "dibayar" } },
  ]);
  assert.equal(m.paid, 1);
  assert.equal(m.paidAmount, 100_000);
});

test("G15: omzet & konversi memakai definisi 'dibayar' yang sama", () => {
  const m = computePaymentMetrics([
    { status: "diproses", total: 100, payment: { status: "dibayar" } },
    { status: "menunggu_bayar", total: 100, payment: { status: "menunggu" } },
  ]);
  assert.equal(m.paid, 1);
  assert.equal(m.paidAmount, 100);
  // konversi = paid / (paid + expired) = 1 / (1 + 0) = 1
  assert.equal(m.conversionRate, 1);
});

test("clampDays: default & clamp rentang (G16)", () => {
  assert.equal(clampDays(undefined), DEFAULT_METRIC_DAYS);
  assert.equal(clampDays("abc"), DEFAULT_METRIC_DAYS);
  assert.equal(clampDays(-5), MIN_METRIC_DAYS);
  assert.equal(clampDays(99999), MAX_METRIC_DAYS);
  assert.equal(clampDays(7), 7);
  assert.equal(clampDays("30"), 30);
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
