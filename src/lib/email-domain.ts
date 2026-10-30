import "server-only";
import { getFromEmail, getResendApiKey } from "@/lib/email-config";
import {
  evaluateSendingDomain,
  type ResendDomainRecord,
  type SendingDomainHealth,
} from "@/lib/email-domain-pure";

/**
 * Diagnostik domain pengirim Resend (F-14) — SERVER-ONLY.
 *
 * Memanggil `GET https://api.resend.com/domains` (read-only) untuk mengetahui
 * apakah domain pada `EMAIL_FROM` sudah terverifikasi. Ini menjelaskan akar
 * masalah `403` pada email pembeli tanpa menebak.
 *
 * Keamanan:
 * - API key TIDAK pernah dikembalikan; hanya nama/status domain.
 * - Body respons provider tidak diteruskan (hanya di-log kode status).
 * - Fail-soft: kegagalan jaringan/izin → `verdict: "unknown"`, bukan error.
 */

const RESEND_DOMAINS_ENDPOINT = "https://api.resend.com/domains";

/** Ambil daftar domain (subset aman) dari Resend. `null` bila gagal. */
async function fetchResendDomains(apiKey: string): Promise<ResendDomainRecord[] | null> {
  try {
    const res = await fetch(RESEND_DOMAINS_ENDPOINT, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[email-domain] Resend /domains gagal:", res.status);
      return null;
    }
    const json = (await res.json()) as { data?: unknown };
    if (!Array.isArray(json.data)) return [];

    return json.data
      .map((entry) => (entry && typeof entry === "object" ? (entry as Record<string, unknown>) : null))
      .filter((entry): entry is Record<string, unknown> => entry !== null)
      .filter((entry) => typeof entry.name === "string" && entry.name.trim() !== "")
      .map((entry) => ({
        name: String(entry.name),
        status: typeof entry.status === "string" ? entry.status : "",
      }));
  } catch (err) {
    console.error("[email-domain] gagal memanggil Resend /domains:", err);
    return null;
  }
}

/**
 * Kesehatan domain pengirim saat ini. Tidak melempar.
 *
 * - Tanpa `RESEND_API_KEY` → `unknown` (tidak ada yang bisa diperiksa).
 * - Dengan key → cocokkan domain `EMAIL_FROM` dengan daftar domain Resend.
 */
export async function getSendingDomainHealth(): Promise<SendingDomainHealth> {
  const from = getFromEmail();
  const apiKey = getResendApiKey();

  if (!apiKey) {
    return evaluateSendingDomain({ from, domains: [], domainsAvailable: false });
  }

  const domains = await fetchResendDomains(apiKey);
  return evaluateSendingDomain({
    from,
    domains: domains ?? [],
    domainsAvailable: domains !== null,
  });
}