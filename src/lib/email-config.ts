import "server-only";

/**
 * OR-E6 — Konfigurasi email terpusat (Resend).
 *
 * Menghindari duplikasi endpoint & alamat default di banyak modul email
 * (`email.ts`, `email-order.ts`, `email-cart.ts`, `email-broadcast.ts`,
 * `email-report.ts`, `email-wishlist.ts`).
 */

/** Endpoint kirim email Resend (satu sumber). */
export const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Kunci API Resend (kosong → email dinonaktifkan, fail-safe). */
export function getResendApiKey(): string | undefined {
  return process.env.RESEND_API_KEY;
}

/** Alamat pengirim default (bila `EMAIL_FROM` kosong). */
export function getFromEmail(): string {
  return process.env.EMAIL_FROM ?? "LKTech <onboarding@resend.dev>";
}

/** Alamat balasan (agar jawaban masuk ke admin, bukan ke diri sendiri). */
export function getReplyTo(): string | undefined {
  return process.env.ORDER_REPLY_TO || process.env.SMTP_REPLY_TO || undefined;
}
