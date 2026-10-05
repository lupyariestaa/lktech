import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPaidStatus,
  isTerminalStatus,
  shouldRestoreCoupon,
  shouldSendStatusEmail,
} from "../src/lib/order-status-pure.ts";

/**
 * Uji transisi & klasifikasi status order (FASE P6, DoD §9.1).
 * Jalankan: `npm run test:status`
 */

test("isPaidStatus: dibayar/diproses/selesai → true", () => {
  assert.equal(isPaidStatus("dibayar"), true);
  assert.equal(isPaidStatus("diproses"), true);
  assert.equal(isPaidStatus("selesai"), true);
});

test("isPaidStatus: status lain → false", () => {
  for (const s of ["baru", "menunggu_bayar", "menunggu_konfirmasi", "dibatalkan", "kedaluwarsa"]) {
    assert.equal(isPaidStatus(s), false, s);
  }
});

test("isTerminalStatus: dibatalkan/kedaluwarsa/selesai → true", () => {
  assert.equal(isTerminalStatus("dibatalkan"), true);
  assert.equal(isTerminalStatus("kedaluwarsa"), true);
  assert.equal(isTerminalStatus("selesai"), true);
});

test("isTerminalStatus: status aktif → false", () => {
  for (const s of ["baru", "menunggu_bayar", "dibayar", "menunggu_konfirmasi", "diproses"]) {
    assert.equal(isTerminalStatus(s), false, s);
  }
});

test("shouldRestoreCoupon: ke dibatalkan/kedaluwarsa dari status aktif → true", () => {
  assert.equal(shouldRestoreCoupon("menunggu_bayar", "dibatalkan"), true);
  assert.equal(shouldRestoreCoupon("menunggu_bayar", "kedaluwarsa"), true);
  assert.equal(shouldRestoreCoupon("menunggu_konfirmasi", "dibatalkan"), true);
});

test("shouldRestoreCoupon: status tidak berubah → false", () => {
  assert.equal(shouldRestoreCoupon("dibatalkan", "dibatalkan"), false);
});

test("shouldRestoreCoupon: dari status final → false (cegah restore ganda)", () => {
  assert.equal(shouldRestoreCoupon("kedaluwarsa", "dibatalkan"), false);
  assert.equal(shouldRestoreCoupon("selesai", "dibatalkan"), false);
});

test("shouldRestoreCoupon: ke status non-restore → false", () => {
  assert.equal(shouldRestoreCoupon("menunggu_bayar", "dibayar"), false);
  assert.equal(shouldRestoreCoupon("diproses", "selesai"), false);
});

test("shouldSendStatusEmail: status berubah & bukan 'baru' → true", () => {
  assert.equal(shouldSendStatusEmail("menunggu_bayar", "dibayar"), true);
  assert.equal(shouldSendStatusEmail("diproses", "selesai"), true);
});

test("shouldSendStatusEmail: status sama → false (idempoten)", () => {
  assert.equal(shouldSendStatusEmail("dibayar", "dibayar"), false);
});

test("shouldSendStatusEmail: ke 'baru' → false", () => {
  assert.equal(shouldSendStatusEmail("diproses", "baru"), false);
});
