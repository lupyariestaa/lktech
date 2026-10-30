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

/** Batas heuristik epoch: nilai < 1e12 hampir pasti DETIK, bukan milidetik. */
const EPOCH_SECONDS_CEILING = 1_000_000_000_000;

/**
 * Status invoice Mayar yang PASTI berarti uang sudah diterima.
 *
 * Sengaja daftar eksplisit (bukan "selain unpaid"): status tak dikenal harus
 * diperlakukan BELUM lunas agar tidak pernah menandai pesanan lunas tanpa bukti.
 */
export const MAYAR_PAID_INVOICE_STATUSES = [
  "paid",
  "settled",
  "success",
  "succeeded",
] as const;

/** Apakah status invoice Mayar berarti lunas (case/whitespace-insensitive). */
export function isMayarInvoicePaid(status: string | undefined): boolean {
  if (typeof status !== "string") return false;
  const normalized = status.trim().toLowerCase();
  return (MAYAR_PAID_INVOICE_STATUSES as readonly string[]).includes(normalized);
}

/**
 * Menormalkan `expiredAt` invoice Mayar menjadi ISO yang valid.
 *
 * Mayar dapat mengirim epoch **milidetik**, epoch **detik**, atau string ISO.
 * Tanpa normalisasi, `new Date(...)` bisa menghasilkan `Invalid Date` atau tahun
 * 1970 (bila detik diperlakukan sebagai milidetik) sehingga order langsung
 * "kedaluwarsa" (F-11). Nilai tak dikenali → `undefined` (pemanggil memakai
 * fallback TTL).
 */
export function coerceMayarExpiry(raw: unknown): string | undefined {
  if (typeof raw === "string" && raw.trim() && !/^\d+$/.test(raw.trim())) {
    const t = Date.parse(raw);
    return Number.isFinite(t) ? new Date(t).toISOString() : undefined;
  }
  const n = coerceMayarAmount(raw);
  if (n === undefined || n <= 0) return undefined;
  const ms = n < EPOCH_SECONDS_CEILING ? n * 1000 : n;
  const d = new Date(ms);
  return Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
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
