import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extension.
import { extractMayarPaymentEvent, validateMayarPayment, coerceMayarAmount } from "../src/lib/mayar-webhook-pure.ts";

const order = { total: 125000, invoiceId: "inv-123", transactionId: "txn-456" };

test("rejects payment event without amount; does not infer from order total", () => {
  assert.deepEqual(validateMayarPayment({ invoiceId: "inv-123" }, order), {
    ok: false,
    reason: "amount_missing",
  });
});

test("rejects invalid and lower amounts", () => {
  assert.deepEqual(validateMayarPayment({ amount: 0 }, order), { ok: false, reason: "amount_invalid" });
  assert.deepEqual(validateMayarPayment({ amount: 124999 }, order), { ok: false, reason: "amount_mismatch" });
});

test("accepts exact amount and matching invoice/transaction references", () => {
  assert.deepEqual(validateMayarPayment({
    amount: 125000,
    invoiceId: "inv-123",
    transactionId: "txn-456",
  }, order), { ok: true, amount: 125000 });
});

test("rejects an overpayment unless it exactly matches the invoiced total", () => {
  assert.deepEqual(validateMayarPayment({ amount: 125001 }, order), { ok: false, reason: "amount_mismatch" });
});

test("rejects invoice or transaction reference mismatches", () => {
  assert.deepEqual(validateMayarPayment({ amount: 125000, invoiceId: "other-invoice" }, order), {
    ok: false,
    reason: "invoice_mismatch",
  });
  assert.deepEqual(validateMayarPayment({ amount: 125000, invoiceId: "inv-123", transactionId: "other-transaction" }, order), {
    ok: false,
    reason: "transaction_mismatch",
  });
});

test("allows omitted invoice reference but keeps amount and order reference required", () => {
  assert.deepEqual(validateMayarPayment({ amount: 125000 }, order), {
    ok: true,
    amount: 125000,
  });
  assert.deepEqual(validateMayarPayment({ amount: 125000 }, { total: 125000 }), {
    ok: true,
    amount: 125000,
  });
});

test("extracts Mayar event while keeping data.id separate from invoiceId", () => {
  assert.deepEqual(extractMayarPaymentEvent({
    event: "payment.received",
    data: {
      id: "webhook-789",
      amount: "125000",
      extraData: { orderId: "order-123" },
      transactionId: "txn-456",
    },
  }), {
    orderId: "order-123",
    amount: 125000,
    method: undefined,
    invoiceId: undefined,
    webhookId: "webhook-789",
    transactionId: "txn-456",
  });
});

test("rejects explicitly mismatched invoice reference", () => {
  const parsed = extractMayarPaymentEvent({
    event: "payment.received",
    data: {
      id: "webhook-789",
      invoiceId: "other-invoice",
      amount: 125000,
      extraData: { orderId: "order-123" },
    },
  });
  assert.equal(parsed?.invoiceId, "other-invoice");
  assert.deepEqual(validateMayarPayment({ amount: parsed?.amount, invoiceId: parsed?.invoiceId }, order), {
    ok: false,
    reason: "invoice_mismatch",
  });
});

/* ---- F-07: normalisasi nominal dari GET /invoices (number | string) ---- */

test("coerceMayarAmount: number dan string numerik diterima setara", () => {
  assert.equal(coerceMayarAmount(180000), 180000);
  assert.equal(coerceMayarAmount("180000"), 180000);
  assert.equal(coerceMayarAmount(" 149000 "), 149000);
});

test("coerceMayarAmount: nilai tak valid → undefined (jangan menebak)", () => {
  assert.equal(coerceMayarAmount(undefined), undefined);
  assert.equal(coerceMayarAmount(null), undefined);
  assert.equal(coerceMayarAmount(""), undefined);
  assert.equal(coerceMayarAmount("   "), undefined);
  assert.equal(coerceMayarAmount("abc"), undefined);
  assert.equal(coerceMayarAmount(Number.NaN), undefined);
  assert.equal(coerceMayarAmount(Number.POSITIVE_INFINITY), undefined);
  assert.equal(coerceMayarAmount({ amount: 1 }), undefined);
});

test("coerceMayarAmount: rekonsiliasi string vs total tidak lagi mismatch palsu", () => {
  const detailAmount = coerceMayarAmount("180000");
  const expected = 180000;
  assert.equal(detailAmount, expected);
  assert.equal(Number.isFinite(detailAmount), true);
});
