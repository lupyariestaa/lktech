import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_PAID_ORDER_STATUSES,
  addOrderToAggregate,
  emptyOrderAggregate,
  isPaidOrderStatus,
} from "../src/lib/admin-users-pure.ts";
import { PAID_ORDER_STATUSES } from "../src/lib/metrics-spec.ts";

/**
 * Regresi ADM-10: metrik user harus memakai status berbayar yang sama dengan
 * metrik resmi, bukan seluruh order (termasuk batal/kedaluwarsa).
 */

test("daftar status berbayar admin selaras dengan metrics-spec", () => {
  assert.deepEqual(ADMIN_PAID_ORDER_STATUSES, PAID_ORDER_STATUSES);
});

test("hanya dibayar/diproses/selesai yang dihitung berbayar", () => {
  for (const status of ["dibayar", "diproses", "selesai"]) {
    assert.equal(isPaidOrderStatus(status), true, status);
  }
  for (const status of [
    "baru",
    "menunggu_bayar",
    "menunggu_konfirmasi",
    "dibatalkan",
    "kedaluwarsa",
    "tidak_dikenal",
    null,
    undefined,
  ]) {
    assert.equal(isPaidOrderStatus(status), false, String(status));
  }
});

test("agregat menghitung semua order tetapi total belanja hanya yang berbayar", () => {
  const agg = emptyOrderAggregate();
  addOrderToAggregate(agg, "menunggu_bayar", 150_000);
  addOrderToAggregate(agg, "dibatalkan", 200_000);
  addOrderToAggregate(agg, "dibayar", 100_000);
  addOrderToAggregate(agg, "diproses", 50_000);
  addOrderToAggregate(agg, "selesai", 75_000);

  assert.deepEqual(agg, {
    allCount: 5,
    allTotal: 575_000,
    paidCount: 3,
    paidTotal: 225_000,
  });
});

test("total tidak valid tidak merusak agregat", () => {
  const agg = emptyOrderAggregate();
  addOrderToAggregate(agg, "dibayar", "100000");
  addOrderToAggregate(agg, "dibayar", Number.NaN);
  addOrderToAggregate(agg, "dibayar", undefined);

  assert.equal(agg.paidCount, 3);
  assert.equal(agg.paidTotal, 0);
});
