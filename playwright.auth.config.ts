import { defineConfig, devices } from "@playwright/test";
import {
  E2E_ACCOUNTS,
  E2E_ADMIN_SESSION_SECRET,
  EMULATOR_AUTH_HOST,
  EMULATOR_FIRESTORE_HOST,
  EMULATOR_PROJECT_ID,
} from "./scripts/emulator-fixtures";

/**
 * E2E auth ber-kredensial (P1) — memakai Firebase Emulator.
 *
 * Jalankan dari root:
 *   npm run test:e2e:auth
 *
 * Script tersebut membungkus Playwright dengan `firebase emulators:exec`,
 * sehingga Auth + Firestore emulator hidup, lalu `seed:emulator` membuat akun
 * OWNER/ADMIN/user sebelum test. Build produksi harus sudah ada (`npm run build`).
 */
const PORT = Number(process.env.E2E_AUTH_PORT ?? 3200);
const BASE_URL =
  process.env.E2E_AUTH_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e/auth",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_AUTH_BASE_URL
    ? undefined
    : {
        command: `npx next start -H 127.0.0.1 -p ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          NEXT_TELEMETRY_DISABLED: "1",
          ADMIN_USE_FIREBASE_EMULATOR: "1",
          ADMIN_EMAILS: E2E_ACCOUNTS.owner.email,
          ADMIN_SESSION_SECRET: E2E_ADMIN_SESSION_SECRET,
          FIREBASE_ADMIN_PROJECT_ID: EMULATOR_PROJECT_ID,
          GCLOUD_PROJECT: EMULATOR_PROJECT_ID,
          FIREBASE_AUTH_EMULATOR_HOST:
            process.env.FIREBASE_AUTH_EMULATOR_HOST ?? EMULATOR_AUTH_HOST,
          FIRESTORE_EMULATOR_HOST:
            process.env.FIRESTORE_EMULATOR_HOST ?? EMULATOR_FIRESTORE_HOST,
          NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: EMULATOR_PROJECT_ID,
        },
      },
});
