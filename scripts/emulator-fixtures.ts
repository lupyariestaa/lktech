/**
 * Fixture E2E auth — dipakai seed emulator dan test Playwright.
 *
 * Jangan memakai email/password ini di produksi. Semua akun hanya hidup di
 * Firebase Emulator lokal.
 */

export const EMULATOR_PROJECT_ID = "lktech-emulator";
export const EMULATOR_AUTH_HOST = "127.0.0.1:9099";
export const EMULATOR_FIRESTORE_HOST = "127.0.0.1:8080";

/** Secret HMAC cookie login admin untuk E2E (bukan secret produksi). */
export const E2E_ADMIN_SESSION_SECRET =
  "lktech-e2e-admin-session-secret-min-32-chars";

export type EmulatorAccount = {
  email: string;
  password: string;
  displayName: string;
};

export const E2E_ACCOUNTS = {
  owner: {
    email: "owner@lktech.test",
    password: "OwnerPass123!",
    displayName: "E2E Owner",
  },
  admin: {
    email: "admin@lktech.test",
    password: "AdminPass123!",
    displayName: "E2E Admin",
  },
  user: {
    email: "user@lktech.test",
    password: "UserPass123!",
    displayName: "E2E User",
  },
} satisfies Record<string, EmulatorAccount>;
