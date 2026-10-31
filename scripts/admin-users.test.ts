import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_PAID_ORDER_STATUSES,
  ADMIN_USERS_EXPORT_CAP,
  addOrderToAggregate,
  emptyOrderAggregate,
  exportPageLimit,
  isPaidOrderStatus,
  nextExportStep,
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

/**
 * Sprint 11 / ADM-15: ekspor user memakai paginasi berulang dengan cap keras
 * 5.000 baris. Logika batas & tanda `truncated` diuji tanpa Firestore.
 */

test("ADMIN_USERS_EXPORT_CAP = 5000", () => {
  assert.equal(ADMIN_USERS_EXPORT_CAP, 5000);
});

test("exportPageLimit dibatasi maxLimit dan sisa kuota", () => {
  assert.equal(exportPageLimit({ collected: 0, cap: 5000, maxLimit: 200 }), 200);
  assert.equal(
    exportPageLimit({ collected: 4_950, cap: 5000, maxLimit: 200 }),
    50,
  );
  assert.equal(exportPageLimit({ collected: 4_999, cap: 5000, maxLimit: 200 }), 1);
});

test("exportPageLimit = 0 saat cap sudah/terlewati atau maxLimit invalid", () => {
  assert.equal(exportPageLimit({ collected: 5_000, cap: 5000, maxLimit: 200 }), 0);
  assert.equal(exportPageLimit({ collected: 6_000, cap: 5000, maxLimit: 200 }), 0);
  assert.equal(exportPageLimit({ collected: 0, cap: 5000, maxLimit: 0 }), 0);
  assert.equal(exportPageLimit({ collected: 0, cap: 5000, maxLimit: -5 }), 0);
});

test("nextExportStep lanjut selama di bawah cap dan masih ada halaman", () => {
  assert.deepEqual(
    nextExportStep({
      collected: 0,
      added: 200,
      hasMore: true,
      sourceTruncated: false,
      cap: 5000,
    }),
    { done: false, truncated: false },
  );
});

test("nextExportStep selesai tanpa terpotong saat sumber habis", () => {
  assert.deepEqual(
    nextExportStep({
      collected: 1_800,
      added: 200,
      hasMore: false,
      sourceTruncated: false,
      cap: 5000,
    }),
    { done: true, truncated: false },
  );
});

test("nextExportStep ditandai terpotong saat cap tercapai dan masih ada halaman", () => {
  assert.deepEqual(
    nextExportStep({
      collected: 4_800,
      added: 200,
      hasMore: true,
      sourceTruncated: false,
      cap: 5000,
    }),
    { done: true, truncated: true },
  );
});

test("nextExportStep: tepat cap tanpa halaman berikutnya = lengkap", () => {
  assert.deepEqual(
    nextExportStep({
      collected: 4_800,
      added: 200,
      hasMore: false,
      sourceTruncated: false,
      cap: 5000,
    }),
    { done: true, truncated: false },
  );
});

test("nextExportStep: sumber sendiri terpotong selalu ditandai (jujur)", () => {
  assert.deepEqual(
    nextExportStep({
      collected: 0,
      added: 30,
      hasMore: false,
      sourceTruncated: true,
      cap: 5000,
    }),
    { done: true, truncated: true },
  );
});

test("nextExportStep: sumber terpotong tetap lanjut selama ada halaman", () => {
  assert.deepEqual(
    nextExportStep({
      collected: 0,
      added: 200,
      hasMore: true,
      sourceTruncated: true,
      cap: 5000,
    }),
    { done: false, truncated: true },
  );
});

test("nextExportStep: kelebihan defensif di atas cap ditandai terpotong", () => {
  assert.deepEqual(
    nextExportStep({
      collected: 4_950,
      added: 100,
      hasMore: false,
      sourceTruncated: false,
      cap: 5000,
    }),
    { done: true, truncated: true },
  );
});
