import "server-only";
import type { CreatedInvoice, InvoiceDetail } from "@/lib/payment-types";
import { checkTrustedUrl } from "@/lib/trusted-url";
import { coerceMayarAmount } from "@/lib/mayar-webhook-pure";

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
    /** Mayar dapat mengirim number atau string numerik. */
    amount: number | string;
    status: string;
    paymentUrl?: string;
    expiredAt?: number;
    transactionId?: string;
  }>(`/invoices/${encodeURIComponent(invoiceId)}`, { method: "GET" });

  return {
    invoiceId: data.id,
    // F-07: normalisasi tipe. `NaN` menandakan nominal tidak terbaca; pemanggil
    // WAJIB memperlakukannya sebagai bukan-lunas (jangan pernah menebak).
    amount: coerceMayarAmount(data.amount) ?? Number.NaN,
    status: data.status,
    payUrl: data.paymentUrl,
    expiredAt: data.expiredAt,
    transactionId: data.transactionId,
  };
}

/** Status invoice Mayar yang dianggap lunas (dokumentasi: `paid`). */
export function isInvoicePaid(status: string | undefined): boolean {
  return typeof status === "string" && status.trim().toLowerCase() === "paid";
}

/**
 * Satu pengiriman webhook dari Mayar (untuk diagnostik admin).
 * TIDAK memuat API key; hanya metadata pengiriman + ringkasan payload.
 */
export type MayarWebhookDelivery = {
  id: string;
  createdAt: string | null;
  updatedAt: string | null;
  nextDelivery: string | null;
  type: string;
  status: string;
  urlDestination: string;
  /** Respons yang dikembalikan endpoint kita (mis. `{"ok":true}` atau 401). */
  responsePayload: string | null;
  /** Ringkasan payload: event & bukti korelasi/pembayaran bila dapat diparsing. */
  event?: string;
  orderId?: string;
  amount?: number;
  transactionStatus?: string;
  paymentUrl?: string;
};

/** Ambil ringkasan aman dari payload webhook (string JSON) Mayar. */
function summarizeWebhookPayload(raw: unknown): Pick<
  MayarWebhookDelivery,
  "event" | "orderId" | "amount" | "transactionStatus" | "paymentUrl"
> {
  if (typeof raw !== "string" || !raw.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object") return {};
  const root = parsed as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : {};
  const extra =
    data.extraData && typeof data.extraData === "object"
      ? (data.extraData as Record<string, unknown>)
      : {};
  const firstString = (...values: unknown[]): string => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
  };
  const rawAmount = data.amount;
  const amount =
    typeof rawAmount === "number"
      ? rawAmount
      : typeof rawAmount === "string" && rawAmount.trim()
        ? Number(rawAmount)
        : undefined;
  return {
    event: firstString(root.event) || undefined,
    orderId: firstString(extra.orderId, data.orderId, data.productId) || undefined,
    amount: amount !== undefined && Number.isFinite(amount) ? amount : undefined,
    transactionStatus: firstString(data.transactionStatus, data.status) || undefined,
    paymentUrl: firstString(data.paymentUrl) || undefined,
  };
}

/**
 * Riwayat pengiriman webhook terbaru dari Mayar (endpoint `/webhooks/new-history`).
 * Read-only untuk diagnostik admin: membantu memastikan apakah Mayar benar-benar
 * mengirim event pembayaran dan apa balasan endpoint kita.
 */
export async function getMayarWebhookDeliveries(
  limit = 15,
): Promise<MayarWebhookDelivery[]> {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50);
  const rows = await mayarFetch<
    Array<{
      id?: string;
      createdAt?: string | number;
      updatedAt?: string | null;
      nextDelivery?: string | null;
      type?: string;
      status?: string;
      urlDestination?: string;
      responsePayload?: string | null;
      payload?: string | null;
    }>
  >(`/webhooks/new-history?limit=${safeLimit}`, { method: "GET" });

  return (Array.isArray(rows) ? rows : []).map((row) => {
    const createdAt =
      typeof row.createdAt === "number"
        ? new Date(row.createdAt).toISOString()
        : (row.createdAt ?? null);
    return {
      id: row.id ?? "",
      createdAt,
      updatedAt: row.updatedAt ?? null,
      nextDelivery: row.nextDelivery ?? null,
      type: row.type ?? "",
      status: row.status ?? "",
      urlDestination: row.urlDestination ?? "",
      responsePayload: row.responsePayload ?? null,
      ...summarizeWebhookPayload(row.payload),
    };
  });
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

/**
 * Mendaftarkan URL webhook ke Mayar (`POST /webhooks/update`). Aksi admin.
 *
 * Tujuan: menjamin token pada URL webhook yang tersimpan di Mayar SAMA dengan
 * `MAYAR_WEBHOOK_TOKEN` server, sehingga verifikasi webhook tidak lagi ditolak.
 * `urlHook` disusun server-side (bukan dari input pengguna) agar tidak ada
 * kesalahan penyalinan token.
 *
 * Respons endpoint ini (`{statusCode, messages}`) tidak memuat `data`, jadi
 * tidak memakai `mayarFetch` yang mensyaratkan `data`.
 */
export async function registerMayarWebhookUrl(urlHook: string): Promise<void> {
  const apiKey = process.env.MAYAR_API_KEY?.trim();
  if (!apiKey) {
    throw new MayarError("Mayar belum dikonfigurasi (MAYAR_API_KEY kosong).");
  }
  const res = await fetch(`${getBaseUrl()}/webhooks/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ urlHook }),
    cache: "no-store",
  });
  const text = await res.text();
  let messages = "";
  try {
    const json = text ? (JSON.parse(text) as { messages?: string }) : {};
    messages = typeof json?.messages === "string" ? json.messages : "";
  } catch {
    /* abaikan body non-JSON */
  }
  if (!res.ok) {
    throw new MayarError(
      `Mayar gagal memperbarui URL webhook (HTTP ${res.status})${messages ? `: ${messages}` : "."}`,
      res.status,
    );
  }
}
