export type InvoiceRecoveryState = "creating" | "orphaned" | "linked" | "failed";
export type InvoiceRecoveryComponent = "goods" | "service" | "order";

export type InvoiceRecoveryRecord = {
  state: InvoiceRecoveryState;
  component: InvoiceRecoveryComponent;
  amountExpected: number;
  correlationId: string;
  startedAt: string;
  updatedAt: string;
  error?: string;
  invoiceId?: string;
  transactionId?: string;
  payUrl?: string;
  expiresAt?: string;
  attemptCount?: number;
};

export function normalizeInvoiceRecovery(value: unknown): InvoiceRecoveryRecord | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  if (!["creating", "orphaned", "linked", "failed"].includes(String(raw.state))) return undefined;
  const state = raw.state as InvoiceRecoveryState;
  const component: InvoiceRecoveryComponent = raw.component === "goods" || raw.component === "service" ? raw.component : "order";
  const amountExpected = typeof raw.amountExpected === "number" && Number.isSafeInteger(raw.amountExpected) && raw.amountExpected >= 0 ? raw.amountExpected : 0;
  const string = (item: unknown) => typeof item === "string" ? item : "";
  return {
    state,
    component,
    amountExpected,
    correlationId: string(raw.correlationId),
    startedAt: string(raw.startedAt),
    updatedAt: string(raw.updatedAt),
    error: string(raw.error) || undefined,
    invoiceId: string(raw.invoiceId) || undefined,
    transactionId: string(raw.transactionId) || undefined,
    payUrl: string(raw.payUrl) || undefined,
    expiresAt: string(raw.expiresAt) || undefined,
    attemptCount: Number.isSafeInteger(raw.attemptCount) ? Number(raw.attemptCount) : undefined,
  };
}
