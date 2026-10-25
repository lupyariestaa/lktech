import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node strip-types runner needs explicit extension.
import { normalizeInvoiceRecovery } from "../src/lib/invoice-recovery-pure.ts";

test("invoice recovery fields round-trip for orphan and linked invoice evidence", () => {
  const normalized = normalizeInvoiceRecovery({
      state: "orphaned",
      component: "goods",
      amountExpected: 5000,
      correlationId: "order-1",
      startedAt: "2026-10-25T00:00:00.000Z",
      updatedAt: "2026-10-25T00:01:00.000Z",
      invoiceId: "invoice-1",
      payUrl: "https://pay.example/invoice-1",
      attemptCount: 1,
  });
  assert.equal(normalized?.state, "orphaned");
  assert.equal(normalized?.invoiceId, "invoice-1");
  assert.equal(normalized?.amountExpected, 5000);
  assert.equal(normalized?.attemptCount, 1);
});

test("legacy order without invoice recovery remains valid", () => {
  assert.equal(normalizeInvoiceRecovery(undefined), undefined);
});
