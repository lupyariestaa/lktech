export type MayarPaymentEvidence = {
  amount?: number;
  invoiceId?: string;
  transactionId?: string;
};

export type MayarOrderPaymentReference = {
  total: number;
  invoiceId?: string;
  transactionId?: string;
};

export type MayarPaymentValidation =
  | { ok: true; amount: number }
  | { ok: false; reason: "amount_missing" | "amount_invalid" | "amount_mismatch" | "invoice_missing" | "invoice_mismatch" | "transaction_mismatch" };

/** Verify payment evidence without guessing a missing amount from the order. */
export function validateMayarPayment(
  evidence: MayarPaymentEvidence,
  order: MayarOrderPaymentReference,
): MayarPaymentValidation {
  if (typeof evidence.amount !== "number") return { ok: false, reason: "amount_missing" };
  if (!Number.isSafeInteger(evidence.amount) || evidence.amount <= 0) {
    return { ok: false, reason: "amount_invalid" };
  }
  if (!Number.isSafeInteger(order.total) || order.total <= 0 || evidence.amount !== order.total) {
    return { ok: false, reason: "amount_mismatch" };
  }

  if (order.invoiceId) {
    if (!evidence.invoiceId) return { ok: false, reason: "invoice_missing" };
    if (evidence.invoiceId !== order.invoiceId) return { ok: false, reason: "invoice_mismatch" };
  }
  if (evidence.transactionId && order.transactionId && evidence.transactionId !== order.transactionId) {
    return { ok: false, reason: "transaction_mismatch" };
  }

  return { ok: true, amount: evidence.amount };
}
