import * as Sentry from "@sentry/nextjs";

/**
 * Registrasi Sentry per-runtime (dipanggil sekali oleh Next.js).
 *
 * - `nodejs`  → server (Node)
 * - `edge`    → middleware & edge routes
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    // Fail-loud: catat status env sekali saat startup (tidak crash).
    const { logEnvHealth } = await import("./lib/env-check");
    logEnvHealth();
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Tangkap error server (Server Components, route handlers) dan laporkan
 * ke Sentry. No-op bila Sentry tidak aktif (tanpa DSN).
 */
export const onRequestError = Sentry.captureRequestError;
