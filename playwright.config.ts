import { defineConfig, devices } from "@playwright/test";

/**
 * Konfigurasi E2E (FASE P3, B5).
 *
 * Menjalankan **build produksi** (`next start`) lalu smoke test halaman publik +
 * endpoint kunci. Sengaja TIDAK menyentuh alur ber-kredensial (checkout/admin) —
 * uji itu butuh data & auth nyata (di luar cakupan smoke).
 *
 * Env WAJIB kosong/dummy: halaman publik fail-safe tanpa kredensial (data kosong,
 * bukan error) — lihat `env-check.ts`.
 */
const PORT = Number(process.env.PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run start -- -p ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          NEXT_TELEMETRY_DISABLED: "1",
          // Tanpa kredensial: halaman publik tetap render (fail-safe).
          CRON_SECRET: "",
        },
      },
});