import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, SENTRY_ENVIRONMENT } from "@/lib/sentry";

/**
 * Inisialisasi Sentry untuk sisi klien (browser).
 *
 * Aktif hanya bila `NEXT_PUBLIC_SENTRY_DSN` tersedia. Tanpa DSN, file ini
 * tidak melakukan apa pun sehingga tidak ada noise di build/dev.
 */
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    tracesSampleRate: 0.1,
    ignoreErrors: ["NEXT_NOT_FOUND", "NEXT_REDIRECT"],
  });
}

/** Instrumentasi router untuk tracing navigasi (dipakai Next.js). */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
