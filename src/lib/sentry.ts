import * as Sentry from "@sentry/nextjs";

/**
 * Konfigurasi bersama Sentry (client/server/edge).
 *
 * Sentry hanya aktif bila `NEXT_PUBLIC_SENTRY_DSN` (atau `SENTRY_DSN`) diisi.
 * Tanpa DSN, `Sentry.init` tidak dipanggil → tidak ada pengiriman event apa pun
 * (aman untuk dev & build tanpa akun Sentry).
 */

/** DSN publik (client) — boleh tersedia di bundle. */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** Nama environment untuk memisahkan error dev/preview/produksi. */
export const SENTRY_ENVIRONMENT =
  process.env.NEXT_PUBLIC_VERCEL_ENV ??
  process.env.VERCEL_ENV ??
  process.env.NODE_ENV;

/** Sampel tracing performa (kecil — cukup untuk gambaran umum). */
export const SENTRY_TRACES_SAMPLE_RATE = 0.1;

/**
 * Opsi dasar yang dipakai semua runtime. Sengaja konservatif:
 * hanya mengirim error, tidak mengirim data sensitif (PII) apa pun
 * (Sentry secara default tidak mengirim PII).
 */
export const baseSentryOptions: Sentry.BrowserOptions & Sentry.NodeOptions = {
  dsn: SENTRY_DSN,
  environment: SENTRY_ENVIRONMENT,
  tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
  // Hindari mengirim error 404 sebagai "error" (bukan bug).
  ignoreErrors: ["NEXT_NOT_FOUND", "NEXT_REDIRECT"],
};
