/**
 * Validasi URL tepercaya untuk kredensial pihak ketiga (gap G19).
 *
 * Masalah: beberapa klien mengirim header `Authorization: Bearer <token>` ke URL
 * yang berasal dari ENV (mis. `MAYAR_BASE_URL`, `UPSTASH_REDIS_REST_URL`). Bila
 * ENV salah-set / dibajak, token bisa terkirim ke host asing (kebocoran rahasia).
 *
 * Solusi: SEBELUM mengirim kredensial, pastikan host URL berada di allowlist
 * domain resmi layanan terkait. Modul ini murni (bebas impor runtime) agar mudah
 * diuji.
 */

/** Host yang diizinkan (suffix, lowercase, tanpa leading dot). */
export const TRUSTED_HOSTS = {
  mayar: ["mayar.id", "mayar.io"],
  upstash: ["upstash.io"],
  cloudinary: ["cloudinary.com"],
} as const;

export type TrustedService = keyof typeof TRUSTED_HOSTS;

/** `true` bila `host` sama dengan atau subdomain dari salah satu suffix. */
function hostMatches(host: string, suffixes: readonly string[]): boolean {
  const h = host.toLowerCase();
  return suffixes.some((s) => h === s || h.endsWith(`.${s}`));
}

/**
 * Memeriksa apakah URL aman untuk menerima kredensial layanan `service`.
 * Wajib HTTPS (dan tidak boleh mengandung userinfo `@`). Mengembalikan detail
 * alasan bila tidak aman (untuk pesan kesalahan yang jelas).
 */
export function checkTrustedUrl(
  rawUrl: string | undefined | null,
  service: TrustedService,
): { ok: true; url: string } | { ok: false; reason: string } {
  const raw = (rawUrl ?? "").trim();
  if (!raw) return { ok: false, reason: "URL kosong." };

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "URL tidak valid." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "URL harus memakai HTTPS." };
  }
  // Tolak userinfo (mis. https://user:pass@host) — bisa menyamarkan host asli.
  if (parsed.username || parsed.password) {
    return { ok: false, reason: "URL tidak boleh memuat kredensial (user@host)." };
  }

  if (!hostMatches(parsed.hostname, TRUSTED_HOSTS[service])) {
    return {
      ok: false,
      reason: `Host "${parsed.hostname}" bukan domain resmi ${service} (${TRUSTED_HOSTS[service]
        .map((h) => `*.${h}`)
        .join(", ")}).`,
    };
  }

  return { ok: true, url: raw.replace(/\/+$/, "") };
}
