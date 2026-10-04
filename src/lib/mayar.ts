import "server-only";
import type { CreatedInvoice, InvoiceDetail } from "@/lib/payment-types";

/**
 * Klien Mayar.id (Headless API V2) — SERVER-ONLY.
 *
 * Desain aman:
 * - Bila `MAYAR_API_KEY` kosong → `isMayarConfigured()` false; seluruh fungsi
 *   melempar error yang jelas dan pemanggil (checkout) menanganinya dengan
 *   fallback (order tetap dibuat, alur WhatsApp tetap jalan). Tidak pernah
 *   memanggil jaringan tanpa konfigurasi.
 * - Base URL ditentukan `MAYAR_MODE` (sandbox/production) atau override
 *   `MAYAR_BASE_URL` — tidak pernah hardcode.
 *
 * Dokumentasi: https://docs.mayar.id/api-reference-v2/invoice/create
 */

const DEFAULT_BASE_URLS: Record<string, string> = {
  sandbox: "https://api.mayar.io/hl/v2",
  production: "https://api.mayar.id/hl/v2",
};

/** Apakah kredensial Mayar tersedia (API key terisi). */
export function isMayarConfigured(): boolean {
  return Boolean(process.env.MAYAR_API_KEY?.trim());
}

/** Mode aktif (untuk logging/banner) — "sandbox" | "production". */
export function getMayarMode(): "sandbox" | "production" {
  return process.env.MAYAR_MODE?.trim() === "production"
    ? "production"
    : "sandbox";
}

/** Base URL efektif (override > preset mode). */
function getBaseUrl(): string {
  const override = process.env.MAYAR_BASE_URL?.trim();
  if (override) return override.replace(/\/+$/, "");
  return DEFAULT_BASE_URLS[getMayarMode()];
}

/** Berapa menit invoice berlaku sebelum kedaluwarsa (default 24 jam). */
export function getInvoiceTtlMinutes(): number {
  const raw = Number(process.env.MAYAR_INVOICE_TTL_MINUTES);
  if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  return 24 * 60;
}

class MayarError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "MayarError";
  }
}

/** Item invoice yang dikirim ke Mayar. */
export type MayarInvoiceItem = {
  quantity: number;
  rate: number;
  description: string;
};

export type CreateInvoiceInput = {
  name: string;
  email: string;
  mobile?: string;
  description?: string;
  items: MayarInvoiceItem[];
  /** Data tambahan yang di-echo balik saat webhook (mis. `{ orderId }`). */
  extraData?: Record<string, string>;
  /** Kedaluwarsa (ISO) — bila kosong, dihitung dari TTL env. */
  expiredAt?: string;
  /** Batasi metode bayar (mis. "qris", "va/bni"). Opsional. */
  paymentMethod?: string;
};

async function mayarFetch<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const apiKey = process.env.MAYAR_API_KEY?.trim();
  if (!apiKey) {
    throw new MayarError("Mayar belum dikonfigurasi (MAYAR_API_KEY kosong).");
  }

  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers ?? {}),
    },
    // Selalu ambil data terbaru.
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new MayarError(`Respons Mayar tidak valid (HTTP ${res.status}).`, res.status);
  }

  const body = json as { statusCode?: number; messages?: string; data?: T };
  if (!res.ok) {
    throw new MayarError(
      `Mayar error (HTTP ${res.status}): ${body?.messages ?? "tidak diketahui"}`,
      res.status,
    );
  }
  if (body?.data === undefined) {
    throw new MayarError("Respons Mayar tanpa data.");
  }
  return body.data;
}

/**
 * Membuat invoice di Mayar. Mengembalikan id, transactionId, link bayar, &
 * waktu kedaluwarsa (epoch millis dari gateway).
 */
export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<CreatedInvoice> {
  const expiredAt =
    input.expiredAt ??
    new Date(Date.now() + getInvoiceTtlMinutes() * 60_000).toISOString();

  const payload: Record<string, unknown> = {
    name: input.name,
    email: input.email,
    mobile: input.mobile ?? "",
    description: input.description ?? "",
    expiredAt,
    items: input.items,
  };
  if (input.extraData) payload.extraData = input.extraData;
  if (input.paymentMethod) payload.paymentMethod = input.paymentMethod;

  const data = await mayarFetch<{
    id: string;
    transactionId: string;
    link: string;
    expiredAt: number;
  }>("/invoices/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    invoiceId: data.id,
    transactionId: data.transactionId,
    payUrl: data.link,
    expiredAt: data.expiredAt,
  };
}

/** Mengambil detail & status sebuah invoice (untuk verifikasi/fallback). */
export async function getInvoice(invoiceId: string): Promise<InvoiceDetail> {
  const data = await mayarFetch<{
    id: string;
    amount: number;
    status: string;
    paymentUrl?: string;
    expiredAt?: number;
  }>(`/invoices/${encodeURIComponent(invoiceId)}`, { method: "GET" });

  return {
    invoiceId: data.id,
    amount: data.amount,
    status: data.status,
    payUrl: data.paymentUrl,
    expiredAt: data.expiredAt,
  };
}
