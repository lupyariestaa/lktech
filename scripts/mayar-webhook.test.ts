import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extension.
import { validateMayarPayment } from "../src/lib/mayar-webhook-pure.ts";

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

test("requires invoice evidence when the order has a stored Mayar invoice", () => {
  assert.deepEqual(validateMayarPayment({ amount: 125000 }, order), {
    ok: false,
    reason: "invoice_missing",
  });
  assert.deepEqual(validateMayarPayment({ amount: 125000 }, { total: 125000 }), {
    ok: true,
    amount: 125000,
  });
});
