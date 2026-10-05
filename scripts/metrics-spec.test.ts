import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeCompletionRate,
  computePaymentConversion,
} from "../src/lib/metrics-spec.ts";

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

test("completionRate menghitung status pembayaran baru di penyebut", () => {
  const rate = computeCompletionRate({
    baru: 0,
    menunggu_bayar: 2,
    dibayar: 3,
    menunggu_konfirmasi: 1,
    diproses: 1,
    selesai: 3,
    dibatalkan: 0,
    kedaluwarsa: 0,
  });
  // 3 / (2 + 3 + 1 + 1 + 3) = 3 / 10
  assert.equal(rate, 0.3);
});

test("completionRate mengecualikan kedaluwarsa (terminal non-penghasil)", () => {
  // Total 7, minus dibatalkan(1)+kedaluwarsa(2) = 4 → 2/4 = 0.5
  const rate = computeCompletionRate({
    baru: 0,
    menunggu_bayar: 0,
    dibayar: 1,
    menunggu_konfirmasi: 0,
    diproses: 1,
    selesai: 2,
    dibatalkan: 1,
    kedaluwarsa: 2,
  });
  assert.equal(rate, 0.5);
});

test("paymentConversion = paid / (paid + expired)", () => {
  const c = computePaymentConversion({
    menunggu_bayar: 4,
    dibayar: 3,
    diproses: 1,
    selesai: 2,
    kedaluwarsa: 2,
    dibatalkan: 5,
  });
  // paid = 3 + 1 + 2 = 6; expired = 2 ? 6 / 8 = 0.75
  assert.equal(c.paid, 6);
  assert.equal(c.expired, 2);
  assert.equal(c.rate, 0.75);
});

test("paymentConversion 0 bila tak ada dibayar/kedaluwarsa (penyebut 0)", () => {
  const c = computePaymentConversion({ menunggu_bayar: 3, dibatalkan: 1 });
  assert.equal(c.paid, 0);
  assert.equal(c.expired, 0);
  assert.equal(c.rate, 0);
});

test("paymentConversion tidak menghukum pesanan yang masih menunggu bayar", () => {
  const c = computePaymentConversion({ menunggu_bayar: 100, selesai: 1, kedaluwarsa: 0 });
  // paid = 1; expired = 0 ? rate = 1 (menunggu_bayar tak masuk penyebut)
  assert.equal(c.rate, 1);
});

test("paymentConversion initiated mencakup jalur pembayaran online", () => {
  const c = computePaymentConversion({
    baru: 5,
    menunggu_bayar: 2,
    dibayar: 1,
    diproses: 1,
    selesai: 1,
    kedaluwarsa: 1,
    dibatalkan: 1,
  });
  // initiated = menunggu_bayar(2)+dibayar(1)+diproses(1)+selesai(1)+kedaluwarsa(1)+dibatalkan(1) = 7
  assert.equal(c.initiated, 7);
});
