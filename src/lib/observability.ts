/**
 * Observability terstruktur (FASE P6).
 *
 * Membantu mengukur & memantau peristiwa penting di SERVER (yang tak bisa
 * dikirim ke Vercel Analytics dari klien) — mis. pembayaran diterima lewat
 * webhook. Semua entri di-log sebagai JSON satu baris dengan tag `[obs]`
 * sehingga mudah difilter di log Vercel.
 *
 * Tidak mengirim data sensitif (tanpa email/nama/isi) — hanya id/nilai.
 */

type ObsProps = Record<string, string | number | boolean | null | undefined>;

/** Catat satu event observability (JSON satu baris). Tidak pernah melempar. */
export function logEvent(event: string, props: ObsProps = {}): void {
  try {
    const clean: Record<string, string | number | boolean | null> = {};
    for (const [k, v] of Object.entries(props)) {
      clean[k] = v ?? null;
    }
    console.log(
      `[obs] ${event} ${JSON.stringify({ event, ...clean, atISO: new Date().toISOString() })}`,
    );
  } catch {
    /* observability tidak boleh menggagalkan alur */
  }
}

/** Event terketik agar nama & properti konsisten. */
export const obs = {
  paymentReceived: (props: {
    orderId: string;
    amount?: number;
    method?: string;
    provider?: string;
  }) =>
    logEvent("payment_received", {
      order: props.orderId,
      amount: props.amount ?? null,
      method: props.method ?? null,
      provider: props.provider ?? "mayar",
    }),
  paymentMismatch: (props: {
    orderId: string;
    received: number;
    expected: number;
  }) =>
    logEvent("payment_mismatch", {
      order: props.orderId,
      received: props.received,
      expected: props.expected,
    }),
  orderExpired: (props: { count: number; couponsRestored: number }) =>
    logEvent("orders_expired", {
      count: props.count,
      coupons: props.couponsRestored,
    }),
  cartReminded: (props: { count: number; failed: number }) =>
    logEvent("cart_reminders_sent", { count: props.count, failed: props.failed }),
};
