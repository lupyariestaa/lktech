import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("tool open analytics distinguishes actual workspace views from click intent", () => {
  const analytics = read("src/lib/analytics.ts");
  const workspace = read("src/components/tools/tool-workspace.tsx");
  const navigationSources = [
    "src/components/tools/tools-catalog.tsx",
    "src/components/tools/landing/tools-showcase.tsx",
    "src/components/tools/dashboard/tools-shell.tsx",
    "src/components/tools/dashboard/tools-dashboard-overview.tsx",
  ];

  assert.match(analytics, /trackEvent\("tools_tool_open",\s*\{\s*tool: props\.tool,\s*\}\)/);
  assert.match(analytics, /trackEvent\("tools_tool_open_intent"/);
  assert.match(workspace, /trackToolsToolOpen\(\{ tool: tool\.slug \}\)/);
  assert.doesNotMatch(workspace, /trackToolsToolOpen\(\{[^}]*source:/s);
  assert.match(
    workspace,
    /trackToolsToolOpenIntent\(\{\s*tool: picked\.slug,\s*source: "related",\s*\}\)/,
  );

  for (const path of navigationSources) {
    const source = read(path);
    assert.match(source, /trackToolsToolOpenIntent/);
    assert.doesNotMatch(source, /trackToolsToolOpen\(/);
  }
});

test("drawer trigger only controls a dialog while the dialog is mounted", () => {
  const topbar = read("src/components/tools/dashboard/tools-mobile-topbar.tsx");
  const drawer = read("src/components/tools/dashboard/tools-mobile-drawer.tsx");
  assert.match(topbar, /aria-controls=\{drawerOpen \? "tools-drawer" : undefined\}/);
  assert.match(drawer, /if \(!open\) return null/);
  assert.match(drawer, /id="tools-drawer"/);
});

test("logout failure is announced and returns the control to an enabled state", () => {
  const footer = read("src/components/tools/dashboard/tools-sidebar-footer.tsx");
  assert.match(footer, /setSignOutError\("Tidak dapat keluar\./);
  assert.match(footer, /role="alert"/);
  assert.match(footer, /catch \{\s*setSigningOut\(false\);\s*setSignOutError/);
});

test("workspace visit updates in-memory snapshots even when storage writes fail", () => {
  const storage = read("src/lib/tools-storage.ts");
  const record = storage.slice(storage.indexOf("export function recordToolOpen"));
  assert.match(record, /getRecentToolsSnapshot\(\)/);
  assert.match(record, /getToolUsageSnapshot\(\)/);
  assert.doesNotMatch(record, /readRecentTools\(\)/);
  assert.doesNotMatch(record, /readToolUsage\(\)/);
  assert.match(storage, /getToolsStorageAvailabilitySnapshot/);
  assert.match(storage, /toolsStorageUnavailable = true/);
});

test("dashboard E2E signs in through the Google Auth Emulator UI", () => {
  const spec = read("e2e/auth/tools-dashboard.spec.ts");
  const fixtures = read("scripts/emulator-fixtures.ts");
  const seed = read("scripts/seed-emulator.ts");
  const config = read("playwright.auth.config.ts");
  const auth = read("src/lib/auth.ts");

  assert.match(spec, /getByRole\("button", \{ name: "Lanjutkan dengan Google" \}\)/);
  assert.match(spec, /loginThroughGoogleEmulator/);
  assert.match(spec, /127\\\.0\\\.0\\\.1:9099\\\/emulator\\\/auth\\\/handler/);
  assert.match(spec, /getByRole\("button", \{ name: "Buka menu tools" \}\)/);
  assert.match(fixtures, /tools:\s*\{/);
  assert.match(seed, /E2E_ACCOUNTS\.owner/);
  assert.match(seed, /E2E_ACCOUNTS\.admin/);
  assert.match(seed, /E2E_ACCOUNTS\.user/);
  assert.match(seed, /FIREBASE_AUTH_EMULATOR_HOST/);
  assert.match(seed, /accounts:signUp/);
  assert.match(seed, /linkProviderUserInfo/);
  assert.match(auth, /connectAuthEmulator/);
  assert.match(auth, /E2E Auth wajib memakai emulator pada loopback lokal/);
  assert.match(config, /NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST/);
  assert.match(config, /NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_KEY/);
});
