import "server-only";
import type { CreatedInvoice, InvoiceDetail } from "@/lib/payment-types";
import { checkTrustedUrl } from "@/lib/trusted-url";

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

/**
 * Base URL efektif (override > preset mode).
 *
 * Keamanan (gap G19): override `MAYAR_BASE_URL` DITOLAK bila host-nya bukan
 * domain resmi Mayar (`*.mayar.id`/`*.mayar.io`) — agar API key tidak terkirim ke
 * host asing. Bila override tak aman, fallback ke preset mode resmi.
 */
function getBaseUrl(): string {
  const override = process.env.MAYAR_BASE_URL?.trim();
  if (override) {
    const check = checkTrustedUrl(override, "mayar");
    if (check.ok) return check.url;
    console.error(
      `[mayar] MAYAR_BASE_URL tidak tepercaya (${check.reason}) — memakai preset mode.`,
    );
  }
  return DEFAULT_BASE_URLS[getMayarMode()];
}

/** Host Mayar aktif (aman untuk diagnostik; tidak memuat kredensial/path). */
export function getMayarApiHost(): string {
  try {
    return new URL(getBaseUrl()).host;
  } catch {
    return "unknown";
  }
}

/** Status HTTP Mayar tanpa menampilkan body/provider detail ke pembeli. */
export function getMayarErrorStatus(error: unknown): number | undefined {
  return error instanceof MayarError ? error.status : undefined;
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
 * Menormalkan nomor HP ke format yang diterima Mayar (`mobile` WAJIB diisi).
 * - Buang spasi/tanda hubung/karakter non-digit.
 * - Bila kosong/invalid → fallback (disediakan pemanggil). Mayar menolak
 *   request tanpa `mobile` (HTTP 400 Validation Error).
 */
function normalizeMobile(raw?: string): string {
  const digits = (raw ?? "").replace(/[^\d]/g, "");
  return digits;
}

/**
 * Membuat invoice di Mayar. Mengembalikan id, transactionId, link bayar, &
 * waktu kedaluwarsa (epoch millis dari gateway).
 *
 * PENTING: `mobile` REQUIRED oleh Mayar. Pemanggil harus menyuplai nomor valid
 * (mis. nomor WhatsApp pembeli, fallback ke nomor situs).
 */
export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<CreatedInvoice> {
  const expiredAt =
    input.expiredAt ??
    new Date(Date.now() + getInvoiceTtlMinutes() * 60_000).toISOString();

  const mobile = normalizeMobile(input.mobile);
  if (!mobile) {
    throw new MayarError(
      "Nomor HP (mobile) wajib untuk membuat invoice Mayar.",
      400,
    );
  }

  const payload: Record<string, unknown> = {
    name: input.name,
    email: input.email,
    mobile,
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

/**
 * Uji koneksi dan izin tulis Mayar tanpa membuat invoice.
 * GET memeriksa autentikasi dasar. POST dengan body kosong sengaja invalid,
 * sehingga API hanya memvalidasi akses endpoint tanpa membuat transaksi.
 * Tidak pernah melempar (mengembalikan `{ ok, detail }`).
 */
export async function pingMayar(): Promise<{ ok: boolean; detail: string }> {
  if (!isMayarConfigured()) {
    return { ok: false, detail: "MAYAR_API_KEY belum diisi." };
  }
  try {
    const res = await fetch(`${getBaseUrl()}/invoices?limit=1`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.MAYAR_API_KEY?.trim()}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, detail: `Mayar menolak API key untuk mode ${getMayarMode()} (HTTP ${res.status}). Periksa API key dari lingkungan yang sama.` };
    }
    if (!res.ok) return { ok: false, detail: `Tes koneksi Mayar gagal (HTTP ${res.status}).` };

    // Body kosong tidak memenuhi schema invoice. 400 berarti kredensial
    // diterima dan endpoint POST terjangkau; invoice tidak mungkin tercipta.
    let writeRes: Response;
    try {
      writeRes = await fetch(`${getBaseUrl()}/invoices/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MAYAR_API_KEY?.trim()}`,
          "Content-Type": "application/json",
        },
        body: "{}",
        cache: "no-store",
      });
    } catch (err) {
      return {
        ok: false,
        detail: `Gagal menguji izin POST ke Mayar (${getMayarMode()}): ${err instanceof Error ? err.message : "network error"}`,
      };
    }
    if (writeRes.status === 401 || writeRes.status === 403) {
      return {
        ok: false,
        detail: `API key dapat membaca Mayar tetapi tidak diizinkan membuat invoice (HTTP ${writeRes.status}). Pastikan key Read & Write dari lingkungan ${getMayarMode()} dan redeploy Production.`,
      };
    }
    if (writeRes.status === 400) {
      return {
        ok: true,
        detail: `Tes akses berhasil (${getMayarMode()}): GET diterima dan POST ditolak sebagai body tidak valid, sesuai harapan. Tidak ada invoice yang dibuat.`,
      };
    }
    if (writeRes.ok) {
      return {
        ok: false,
        detail: `Mayar menerima tes POST kosong tanpa error (HTTP ${writeRes.status}); mohon jangan gunakan tes ini untuk checkout sampai respons diverifikasi.`,
      };
    }
    return { ok: false, detail: `Tes izin membuat invoice Mayar merespons HTTP ${writeRes.status}.` };
  } catch (err) {
    return {
      ok: false,
      detail: `Gagal menghubungi Mayar: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}
