import { adminFetch } from "@/lib/admin-fetch";
import type { SeoInsight, SeoInsightConfig, SeoInsightDecision } from "@/lib/seo-insights-pure";

/** Status integrasi (fase S5). Tanpa rahasia — hanya boolean/mode. */
export type IntegrationsStatus = {
  mayar: { configured: boolean; mode: string; webhookTokenSet: boolean };
  email: { configured: boolean };
  cloudinary: { configured: boolean };
  upstash: { configured: boolean };
  cron: { configured: boolean };
  download: { configured: boolean };
};

/** Ambil status integrasi. */
export async function fetchIntegrations(): Promise<IntegrationsStatus> {
  return adminFetch<IntegrationsStatus>("/api/admin/integrations");
}

/** Hasil uji koneksi satu layanan. */
export type IntegrationTestResult = {
  service: string;
  ok: boolean;
  detail?: string;
  mode?: string;
};

/** Uji koneksi (ping) sebuah layanan. */
export async function testIntegration(
  service: "mayar" | "email" | "cloudinary" | "upstash",
): Promise<IntegrationTestResult> {
  return adminFetch<IntegrationTestResult>("/api/admin/integrations/test", {
    method: "POST",
    body: JSON.stringify({ service }),
  });
}

/* ---- Manajemen admin (fase S4) ---- */

export type AdminMember = {
  email: string;
  name?: string;
  isOwner: boolean;
  addedBy?: string;
  addedAtISO?: string;
};

export async function fetchAdmins(): Promise<{ admins: AdminMember[]; me: string }> {
  return adminFetch<{ admins: AdminMember[]; me: string }>("/api/admin/admins");
}

export async function addAdmin(input: {
  email: string;
  name?: string;
}): Promise<AdminMember> {
  const data = await adminFetch<{ member: AdminMember }>("/api/admin/admins", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.member;
}

export async function removeAdmin(email: string): Promise<void> {
  await adminFetch<{ ok: boolean }>(
    `/api/admin/admins?email=${encodeURIComponent(email)}`,
    { method: "DELETE" },
  );
}

/* ---- Pembayaran / Mayar (fase S5) ---- */

export type PaymentMetrics = {
  gatewayOrders: number;
  paid: number;
  pending: number;
  expired: number;
  mismatch: number;
  paidAmount: number;
  conversionRate: number;
};

export type PaymentMetricsResult = {
  metrics: PaymentMetrics;
  health: { configured: boolean; mode: string; webhookTokenSet: boolean };
  days: number;
};

export async function fetchPaymentMetrics(days = 30): Promise<PaymentMetricsResult> {
  return adminFetch<PaymentMetricsResult>(`/api/admin/payments/metrics?days=${days}`);
}

/** Bersihkan cache internal (fase S6). */
export async function clearCache(): Promise<void> {
  await adminFetch<{ ok: boolean }>("/api/admin/settings/cache", { method: "POST" });
}

/* ---- SEO / Search Console (fase S6) ---- */

export type GscRow = {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchConsoleReport = {
  status: "not_configured" | "connected" | "no_data" | "partial" | "error";
  errorCode?:
    | "invalid_credentials"
    | "permission_denied"
    | "quota_limited"
    | "provider_unavailable"
    | "request_timeout"
    | "invalid_response"
    | "request_failed";
  range: { startDate: string; endDate: string };
  fetchedAt: string;
  summary?: { clicks: number; impressions: number; ctr: number; averagePosition: number };
  unavailableSections?: Array<"summary" | "queries" | "pages" | "trend" | "comparison" | "declines">;
  topQueries: GscRow[];
  topPages: GscRow[];
  previousRange?: { startDate: string; endDate: string };
  comparisonSummary?: { clicks: number; impressions: number; ctr: number; averagePosition: number };
  trend: GscRow[];
  /** Insight berbasis aturan (fase D3) — heuristik & transparan. */
  insights: SeoInsight[];
  /** Ambang heuristik aktif yang dipakai server untuk `insights`. */
  insightConfig: SeoInsightConfig;
};

export type SeoReportRequest = {
  days?: number;
  startDate?: string;
  endDate?: string;
  country?: string;
  device?: "DESKTOP" | "MOBILE" | "TABLET";
  searchType?: "web" | "image" | "video" | "news";
  query?: string;
  page?: string;
  /** Ambang impresi minimum untuk insight (0 = pakai default server). */
  minImpressions?: number;
};

/** Laporan Search Console dengan filter yang divalidasi ulang di server. */
export async function fetchSeoReport(options: SeoReportRequest = {}): Promise<SearchConsoleReport> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return adminFetch<SearchConsoleReport>(`/api/admin/seo?${params.toString()}`);
}

/**
 * Catat tindak lanjut editorial atas insight SEO (fase D3). Tidak mengubah
 * konten apa pun; hanya menulis entri audit non-PII.
 */
export async function submitSeoInsightAction(input: {
  insightId: string;
  rule: SeoInsight["rule"];
  kind: SeoInsight["kind"];
  subject: string;
  decision: SeoInsightDecision;
  reason?: string;
}): Promise<{ ok: boolean }> {
  return adminFetch<{ ok: boolean }>("/api/admin/seo", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
