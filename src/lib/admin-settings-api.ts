import { adminFetch } from "@/lib/admin-fetch";

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
