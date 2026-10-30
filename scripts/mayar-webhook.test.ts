import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extension.
import { extractMayarPaymentEvent, validateMayarPayment, coerceMayarAmount, coerceMayarExpiry, isMayarInvoicePaid } from "../src/lib/mayar-webhook-pure.ts";

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

/* ---- F-11: normalisasi `expiredAt` (detik vs milidetik vs ISO) ---- */

const EXPIRY_ISO = "2026-10-30T12:00:00.000Z";

test("coerceMayarExpiry: epoch detik, milidetik, dan ISO → ISO yang sama", () => {
  const ms = Date.parse(EXPIRY_ISO);
  assert.equal(coerceMayarExpiry(ms), EXPIRY_ISO);
  assert.equal(coerceMayarExpiry(Math.floor(ms / 1000)), EXPIRY_ISO);
  assert.equal(coerceMayarExpiry(EXPIRY_ISO), EXPIRY_ISO);
});

test("coerceMayarExpiry: nilai invalid → undefined (pakai fallback TTL)", () => {
  assert.equal(coerceMayarExpiry(undefined), undefined);
  assert.equal(coerceMayarExpiry(null), undefined);
  assert.equal(coerceMayarExpiry(""), undefined);
  assert.equal(coerceMayarExpiry("abc"), undefined);
  assert.equal(coerceMayarExpiry(0), undefined);
  assert.equal(coerceMayarExpiry(-5), undefined);
});

/* ---- F-12: pemetaan status invoice (fail-safe) ---- */

test("isMayarInvoicePaid: status lunas dikenal, sisanya false", () => {
  for (const status of ["paid", "settled", "success", "succeeded", " PAID "]) {
    assert.equal(isMayarInvoicePaid(status), true, status);
  }
  for (const status of ["unpaid", "pending", "closed", "expired", "", undefined]) {
    assert.equal(isMayarInvoicePaid(status), false, String(status));
  }
});
