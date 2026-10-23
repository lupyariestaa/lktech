import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

test("emulator E2E: Admin SDK hanya memakai emulator lewat opt-in test", () => {
  const src = read("src/lib/firebase-admin.ts");
  assert.match(src, /ADMIN_USE_FIREBASE_EMULATOR/);
  assert.match(src, /FIREBASE_AUTH_EMULATOR_HOST/);
  assert.match(src, /FIRESTORE_EMULATOR_HOST/);
  assert.match(src, /initializeApp\(\{ projectId: emulatorProjectId \}\)/);
  assert.match(src, /isAdminConfigured =/);
});

test("emulator E2E: Playwright auth memakai host & akun emulator", () => {
  const config = read("playwright.auth.config.ts");
  assert.match(config, /ADMIN_USE_FIREBASE_EMULATOR: "1"/);
  assert.match(config, /ADMIN_EMAILS: E2E_ACCOUNTS\.owner\.email/);
  assert.match(config, /FIREBASE_AUTH_EMULATOR_HOST/);
  assert.match(config, /FIRESTORE_EMULATOR_HOST/);
  assert.match(config, /testDir: "\.\/e2e\/auth"/);
});

test("emulator E2E: smoke publik tidak menjalankan auth E2E", () => {
  const config = read("playwright.config.ts");
  assert.match(config, /testIgnore: \["auth\/\*\*"\]/);
});

test("emulator E2E: seed fail-closed dan membuat admin DB aktif", () => {
  const seed = read("scripts/seed-emulator.ts");
  assert.match(seed, /assertEmulatorEnv/);
  assert.match(seed, /FIREBASE_AUTH_EMULATOR_HOST/);
  assert.match(seed, /FIRESTORE_EMULATOR_HOST/);
  assert.match(seed, /collection\("admins"\)/);
  assert.match(seed, /active: true/);
});

test("emulator E2E: spec mencakup 401/403/OWNER/session/logout", () => {
  const spec = read("e2e/auth/admin-rbac.spec.ts");
  assert.match(spec, /tanpa token/);
  assert.match(spec, /user biasa/);
  assert.match(spec, /ADMIN: role ADMIN/);
  assert.match(spec, /OWNER: role OWNER/);
  assert.match(spec, /absolute timeout/);
  assert.match(spec, /idle expiry/);
  assert.match(spec, /logout ADMIN mencabut token lama/);
});

test("emulator E2E: cookie pendek & cleanup port tersedia", () => {
  const helper = read("e2e/auth/helpers.ts");
  const pkg = read("package.json");
  assert.match(helper, /createSessionCookie/);
  assert.match(helper, /ttlSeconds/);
  assert.match(pkg, /pretest:e2e:auth/);
  assert.match(pkg, /cleanup:emulator/);
});
