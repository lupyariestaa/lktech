import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPaidStatus,
  isTerminalStatus,
  isPayableStatus,
  isAwaitingPayment,
  isPaymentExpired,
  isTransitionAllowed,
  evaluateStatusTransition,
  shouldRestoreCoupon,
  shouldSendStatusEmail,
  ORDER_STATUS_LIST,
  ALLOWED_TRANSITIONS,
} from "../src/lib/order-status-pure.ts";

/**
 * Uji transisi & klasifikasi status order (FASE P6, DoD §9.1; Batch 1 OR-A2/A3).
 * Jalankan: `npm run test:status`
 */

test("isPaidStatus: dibayar/diproses/selesai → true", () => {
  assert.equal(isPaidStatus("dibayar"), true);
  assert.equal(isPaidStatus("diproses"), true);
  assert.equal(isPaidStatus("selesai"), true);
});

test("evaluateStatusTransition: membedakan no-op, transisi valid, dan konflik", () => {
  assert.equal(evaluateStatusTransition("menunggu_bayar", "menunggu_bayar"), "unchanged");
  assert.equal(evaluateStatusTransition("menunggu_bayar", "dibayar"), "allowed");
  assert.equal(evaluateStatusTransition("kedaluwarsa", "dibayar"), "invalid");
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

/* -------------------------------------------------------------------------- */
/* OR-A2: isPayableStatus (invariant uang)                                     */
/* -------------------------------------------------------------------------- */

test("isPayableStatus: baru/menunggu_bayar/menunggu_konfirmasi → true", () => {
  assert.equal(isPayableStatus("baru"), true);
  assert.equal(isPayableStatus("menunggu_bayar"), true);
  assert.equal(isPayableStatus("menunggu_konfirmasi"), true);
});

test("isPayableStatus: sudah bayar / terminal → false", () => {
  for (const s of ["dibayar", "diproses", "selesai", "dibatalkan", "kedaluwarsa"]) {
    assert.equal(isPayableStatus(s), false, s);
  }
});

/* -------------------------------------------------------------------------- */
/* OR-A3: isTransitionAllowed (matriks transisi)                               */
/* -------------------------------------------------------------------------- */

test("isTransitionAllowed: no-op (status sama) → true", () => {
  for (const s of [
    "baru",
    "menunggu_bayar",
    "dibayar",
    "menunggu_konfirmasi",
    "diproses",
    "selesai",
    "dibatalkan",
    "kedaluwarsa",
  ]) {
    assert.equal(isTransitionAllowed(s, s), true, s);
  }
});

test("isTransitionAllowed: alur normal INSTAN", () => {
  assert.equal(isTransitionAllowed("menunggu_bayar", "dibayar"), true);
  assert.equal(isTransitionAllowed("dibayar", "diproses"), true);
  assert.equal(isTransitionAllowed("diproses", "selesai"), true);
});

test("isTransitionAllowed: alur normal JASA", () => {
  assert.equal(isTransitionAllowed("menunggu_konfirmasi", "diproses"), true);
  assert.equal(isTransitionAllowed("menunggu_konfirmasi", "selesai"), true);
  assert.equal(isTransitionAllowed("menunggu_konfirmasi", "dibayar"), true);
});

test("isTransitionAllowed: terminal tidak boleh berubah", () => {
  assert.equal(isTransitionAllowed("selesai", "baru"), false);
  assert.equal(isTransitionAllowed("selesai", "dibatalkan"), false);
  assert.equal(isTransitionAllowed("dibatalkan", "dibayar"), false);
  assert.equal(isTransitionAllowed("kedaluwarsa", "dibayar"), false);
});

test("isTransitionAllowed: tak boleh mundur ke 'baru' dari alur lanjut", () => {
  assert.equal(isTransitionAllowed("menunggu_bayar", "baru"), false);
  assert.equal(isTransitionAllowed("dibayar", "baru"), false);
  assert.equal(isTransitionAllowed("diproses", "baru"), false);
});

test("isTransitionAllowed: tak boleh lompat bayar dari diproses/selesai", () => {
  assert.equal(isTransitionAllowed("diproses", "dibayar"), false);
  assert.equal(isTransitionAllowed("selesai", "dibayar"), false);
});

/* -------------------------------------------------------------------------- */
/* OR-B2: isAwaitingPayment (tombol "Bayar sekarang")                          */
/* -------------------------------------------------------------------------- */

test("isAwaitingPayment: menunggu_bayar + payUrl → true", () => {
  assert.equal(
    isAwaitingPayment({ status: "menunggu_bayar", payment: { status: "menunggu", payUrl: "https://x" } }),
    true,
  );
});

test("isAwaitingPayment: menunggu_konfirmasi (jasa invoice manual) → true", () => {
  assert.equal(
    isAwaitingPayment({ status: "menunggu_konfirmasi", payment: { status: "menunggu", payUrl: "https://x" } }),
    true,
  );
});

test("isAwaitingPayment: tanpa payUrl → false", () => {
  assert.equal(
    isAwaitingPayment({ status: "menunggu_bayar", payment: { status: "menunggu" } }),
    false,
  );
});

test("isAwaitingPayment: sudah dibayar → false", () => {
  assert.equal(
    isAwaitingPayment({ status: "dibayar", payment: { status: "dibayar", payUrl: "https://x" } }),
    false,
  );
});

test("isAwaitingPayment: status terminal → false (cegah tombol bayar hantu)", () => {
  for (const s of ["dibatalkan", "kedaluwarsa", "selesai"]) {
    assert.equal(
      isAwaitingPayment({ status: s, payment: { status: "menunggu", payUrl: "https://x" } }),
      false,
      s,
    );
  }
});

/* ---- F-05: invoice lewat jatuh tempo tidak boleh menawarkan pembayaran ---- */

const NOW_05 = new Date("2026-10-30T12:00:00.000Z");

test("isPaymentExpired: lewat → true, belum → false, invalid → false", () => {
  assert.equal(isPaymentExpired("2026-10-30T11:00:00.000Z", NOW_05), true);
  assert.equal(isPaymentExpired("2026-10-30T12:00:00.000Z", NOW_05), true);
  assert.equal(isPaymentExpired("2026-10-30T13:00:00.000Z", NOW_05), false);
  assert.equal(isPaymentExpired(undefined, NOW_05), false);
  assert.equal(isPaymentExpired("bukan-tanggal", NOW_05), false);
});

test("isAwaitingPayment: expiresAt sudah lewat → false", () => {
  assert.equal(
    isAwaitingPayment(
      {
        status: "menunggu_bayar",
        payment: {
          status: "menunggu",
          payUrl: "https://x",
          expiresAt: "2026-10-30T11:00:00.000Z",
        },
      },
      NOW_05,
    ),
    false,
  );
});

test("isAwaitingPayment: expiresAt belum lewat → true", () => {
  assert.equal(
    isAwaitingPayment(
      {
        status: "menunggu_bayar",
        payment: {
          status: "menunggu",
          payUrl: "https://x",
          expiresAt: "2026-10-30T13:00:00.000Z",
        },
      },
      NOW_05,
    ),
    true,
  );
});

/* -------------------------------------------------------------------------- */
/* OR-E3: konsistensi definisi status (single source)                          */
/* -------------------------------------------------------------------------- */

test("ORDER_STATUS_LIST: 8 status kanonik", () => {
  assert.equal(ORDER_STATUS_LIST.length, 8);
  assert.deepEqual([...ORDER_STATUS_LIST].sort(), [
    "baru",
    "dibatalkan",
    "dibayar",
    "diproses",
    "kedaluwarsa",
    "menunggu_bayar",
    "menunggu_konfirmasi",
    "selesai",
  ]);
});

test("ALLOWED_TRANSITIONS: kunci tepat sama dengan ORDER_STATUS_LIST", () => {
  assert.deepEqual(
    Object.keys(ALLOWED_TRANSITIONS).sort(),
    [...ORDER_STATUS_LIST].sort(),
  );
});

test("ALLOWED_TRANSITIONS: setiap daftar tujuan berisi status valid", () => {
  for (const [from, targets] of Object.entries(ALLOWED_TRANSITIONS)) {
    for (const to of targets) {
      assert.ok(
        (ORDER_STATUS_LIST as readonly string[]).includes(to),
        `${from} → ${to} bukan status valid`,
      );
    }
    // no-op (tetap di status yang sama) selalu ada.
    assert.ok(
      (targets as readonly string[]).includes(from),
      `${from} harus punya transisi no-op`,
    );
  }
});
