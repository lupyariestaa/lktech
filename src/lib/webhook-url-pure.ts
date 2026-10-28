/**
 * Utilitas URL webhook Mayar (fungsi murni — dapat diuji tanpa jaringan/env).
 *
 * Dipakai untuk:
 * - mencocokkan token pada URL webhook yang terdaftar di Mayar dengan token
 *   server (`MAYAR_WEBHOOK_TOKEN`) TANPA membocorkan nilainya;
 * - menyusun URL webhook yang benar agar didaftarkan kembali ke Mayar.
 */

/** Path endpoint webhook kita. */
export const WEBHOOK_PATH = "/api/webhooks/mayar";

/**
 * Normalisasi nilai token: buang spasi/tanda kutip pembungkus dan dekode
 * sekali (toleran bila gateway mengirim nilai ter-encode).
 */
export function normalizeTokenValue(raw: string | null | undefined): string {
  if (typeof raw !== "string") return "";
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value;
  }
}

/** Ambil nilai `token` dari URL webhook. `null` bila tidak ada. */
export function extractWebhookUrlToken(
  rawUrl: string | null | undefined,
): string | null {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return null;
  try {
    const token = new URL(rawUrl).searchParams.get("token");
    return token && token.trim() ? token : null;
  } catch {
    return null;
  }
}

/** Apakah token pada URL webhook sama dengan token server. */
export function webhookTokensMatch(
  urlToken: string | null,
  serverToken: string | null | undefined,
): boolean {
  const a = normalizeTokenValue(urlToken);
  const b = normalizeTokenValue(serverToken);
  return a.length > 0 && a === b;
}

/** Susun URL webhook absolut + token (untuk didaftarkan ke Mayar). */
export function buildWebhookUrl(origin: string, token: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}${WEBHOOK_PATH}?token=${encodeURIComponent(token)}`;
}

/** URL webhook dengan nilai token disamarkan (aman untuk ditampilkan). */
export function redactWebhookUrl(rawUrl: string | null | undefined): string {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return "";
  return rawUrl.replace(/([?&]token=)[^&]*/i, "$1***");
}
