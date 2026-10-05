import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateOrders,
  percentDelta,
  isPaidStatus,
} from "../src/lib/report-pure.ts";

/**
 * Uji agregat laporan mingguan (Tema 3.3, FASE L4).
 * Jalankan: `npm run test:report`
 */

const ORDERS = [
  { status: "selesai", total: 100000, couponDiscount: 10000, items: [{ name: "A", qty: 2, subtotal: 120000 }] },
  { status: "dibayar", total: 50000, items: [{ name: "B", qty: 1, subtotal: 50000 }] },
  { status: "diproses", total: 30000, items: [{ name: "A", qty: 1, subtotal: 30000 }] },
  { status: "kedaluwarsa", total: 40000 },
  { status: "dibatalkan", total: 20000 },
  { status: "menunggu_bayar", total: 70000 },
];

test("isPaidStatus: dibayar/diproses/selesai → true", () => {
  assert.equal(isPaidStatus("dibayar"), true);
  assert.equal(isPaidStatus("diproses"), true);
  assert.equal(isPaidStatus("selesai"), true);
  assert.equal(isPaidStatus("kedaluwarsa"), false);
});

test("aggregateOrders: hitung total/paid/completed/cancelled/expired", () => {
  const a = aggregateOrders(ORDERS);
  assert.equal(a.total, 6);
  assert.equal(a.paid, 3); // selesai, dibayar, diproses
  assert.equal(a.completed, 1);
  assert.equal(a.cancelled, 1);
  assert.equal(a.expired, 1);
});

test("aggregateOrders: omzet hanya dari order dibayar (netto)", () => {
  const a = aggregateOrders(ORDERS);
  assert.equal(a.revenue, 100000 + 50000 + 30000); // 180000
});

test("aggregateOrders: AOV = omzet / paid (dibulatkan)", () => {
  const a = aggregateOrders(ORDERS);
  assert.equal(a.aov, Math.round(180000 / 3)); // 60000
});

test("aggregateOrders: kupon & diskon", () => {
  const a = aggregateOrders(ORDERS);
  assert.equal(a.couponsUsing, 1);
  assert.equal(a.discountGiven, 10000);
});

test("aggregateOrders: produk terlaris diurut unit lalu omzet", () => {
  const a = aggregateOrders(ORDERS);
  assert.equal(a.topProducts[0].name, "A"); // 3 unit
  assert.equal(a.topProducts[0].units, 3);
  assert.equal(a.topProducts[0].revenue, 150000);
});

test("aggregateOrders: kosong → nol semua", () => {
  const a = aggregateOrders([]);
  assert.equal(a.total, 0);
  assert.equal(a.revenue, 0);
  assert.equal(a.aov, 0);
  assert.deepEqual(a.topProducts, []);
});

test("aggregateOrders: topN membatasi jumlah", () => {
  const a = aggregateOrders(ORDERS, 1);
  assert.equal(a.topProducts.length, 1);
});

test("percentDelta: hitung & null bila pembanding 0", () => {
  assert.equal(percentDelta(120, 100), 0.2);
  assert.equal(percentDelta(80, 100), -0.2);
  assert.equal(percentDelta(5, 0), null);
});
