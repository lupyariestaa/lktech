import * as Sentry from "@sentry/nextjs";
import { baseSentryOptions } from "@/lib/sentry";

/**
 * Inisialisasi Sentry untuk runtime Edge (middleware & route edge).
 * Aktif hanya bila DSN tersedia.
 */
if (baseSentryOptions.dsn) {
  Sentry.init(baseSentryOptions);
}
