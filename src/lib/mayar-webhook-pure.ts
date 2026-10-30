export type MayarPaymentEvidence = {
  amount?: number;
  /** Optional: Mayar's documented payment webhook payload may omit this. */
  invoiceId?: string;
  transactionId?: string;
};

export type MayarPaymentEvent = {
  orderId: string;
  amount?: number;
  method?: string;
  transactionId?: string;
  /** Invoice reference, only when explicitly supplied by Mayar. */
  invoiceId?: string;
  /** data.id is documented as the webhook event ID, not necessarily invoice ID. */
  webhookId?: string;
};

export type MayarOrderPaymentReference = {
  total: number;
  invoiceId?: string;
  transactionId?: string;
};

export type MayarPaymentValidation =
  | { ok: true; amount: number }
  | { ok: false; reason: "amount_missing" | "amount_invalid" | "amount_mismatch" | "invoice_missing" | "invoice_mismatch" | "transaction_mismatch" };

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/**
 * Mengubah nominal dari Mayar menjadi `number` yang aman. Mayar dapat mengirim
 * `number` maupun `string` (mis. `"180000"`); nilai lain / tak terhingga →
 * `undefined`. Dipakai webhook (bukti pembayaran) DAN `getInvoice` (rekonsiliasi
 * admin) agar perbandingan nominal tidak pernah gagal karena perbedaan tipe.
 */
export function coerceMayarAmount(raw: unknown): number | undefined {
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim()
        ? Number(raw)
        : undefined;
  return value !== undefined && Number.isFinite(value) ? value : undefined;
}

/** Parse only documented/explicit identifiers; never treat data.id as invoiceId. */
export function extractMayarPaymentEvent(body: unknown): MayarPaymentEvent | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  const event = typeof root.event === "string" ? root.event : "";
  if (event && event !== "payment.received") return null;

  const data = root.data && typeof root.data === "object"
    ? root.data as Record<string, unknown>
    : root;
  const extra = data.extraData && typeof data.extraData === "object"
    ? data.extraData as Record<string, unknown>
    : undefined;
  const orderId = firstString(extra?.orderId, data.orderId, data.productId);
  if (!orderId) return null;

  const rawAmount = data.amount;
  const amount = coerceMayarAmount(rawAmount);

  return {
    orderId,
    amount,
    method: firstString(data.paymentMethod, data.channel, data.method) || undefined,
    // Do not infer invoiceId from data.id: Mayar documents that as webhook ID.
    invoiceId: firstString(data.invoiceId, data.invoice_id) || undefined,
    webhookId: firstString(data.id, data.webhookId) || undefined,
    transactionId: firstString(data.transactionId, data.transaction_id) || undefined,
  };
}

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

  // Mayar's documented payment.received payload does not guarantee an
  // invoiceId field. Exact amount + order correlation + webhook auth remain
  // mandatory; compare invoiceId strictly whenever the provider supplies it.
  if (evidence.invoiceId && order.invoiceId && evidence.invoiceId !== order.invoiceId) {
    return { ok: false, reason: "invoice_mismatch" };
  }
  if (evidence.transactionId && order.transactionId && evidence.transactionId !== order.transactionId) {
    return { ok: false, reason: "transaction_mismatch" };
  }

  return { ok: true, amount: evidence.amount };
}
