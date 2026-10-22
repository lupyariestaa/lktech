import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Guard regresi batch P1 lanjutan:
 * - role 2 tingkat OWNER/ADMIN,
 * - sesi 12 jam absolut + idle 60 menit + re-auth aksi sensitif,
 * - blokir user (tanpa hapus permanen),
 * - backup + ekspor PII massal khusus OWNER.
 *
 * Ini UJI WIRING (membaca source), bukan pengganti E2E ber-kredensial.
 * Jalankan: `npm run test:admin-security`
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

test("kebijakan sesi: 12 jam absolut, idle 60 menit, re-auth 10 menit", () => {
  const constants = read("src/lib/session-constants.ts");
  assert.match(constants, /ADMIN_IDLE_TIMEOUT_MS\s*=\s*60\s*\*\s*60\s*\*\s*1000/);
  assert.match(
    constants,
    /ADMIN_ABSOLUTE_TIMEOUT_MS\s*=\s*12\s*\*\s*60\s*\*\s*60\s*\*\s*1000/,
  );
  assert.match(
    constants,
    /ADMIN_REAUTH_WINDOW_MS\s*=\s*10\s*\*\s*60\s*\*\s*1000/,
  );

  const session = read("src/lib/session.ts");
  assert.match(session, /SESSION_MAX_AGE_MS\s*=\s*ADMIN_IDLE_TIMEOUT_MS/);
  assert.match(session, /auth_time/);
  assert.match(session, /ADMIN_ABSOLUTE_TIMEOUT_MS/);
});

test("login window bertanda tangan mengikat cookie sesi & absolute timeout", () => {
  const loginCookie = read("src/lib/admin-login-cookie.ts");
  assert.match(loginCookie, /ADMIN_LOGIN_COOKIE/);
  assert.match(loginCookie, /createHmac\("sha256"/);
  assert.match(loginCookie, /timingSafeEqual/);
  assert.match(loginCookie, /ADMIN_ABSOLUTE_TIMEOUT_MS/);

  const sessionRoute = read("src/app/api/admin/session/route.ts");
  assert.match(sessionRoute, /verifyAdminLoginToken/);
  assert.match(sessionRoute, /setAdminLoginCookie/);
  assert.match(sessionRoute, /clearAdminLoginCookie/);

  const serverGuard = read("src/components/admin/admin-server-guard.tsx");
  assert.match(serverGuard, /ADMIN_LOGIN_COOKIE/);
  assert.match(serverGuard, /verifyAdminLoginToken/);
});

test("guard API menolak sesi >12 jam dan mewajibkan re-auth aksi sensitif", () => {
  const guard = read("src/lib/admin-guard.ts");
  assert.match(guard, /ADMIN_ABSOLUTE_TIMEOUT_MS/);
  assert.match(guard, /requireFreshAdmin/);
  assert.match(guard, /requireFreshOwner/);
  assert.match(guard, /reauth_required/);
  assert.match(guard, /assertFreshAuth/);
});

test("klien memantau idle, refresh saat aktif, dan re-auth Google", () => {
  const keepalive = read(
    "src/components/admin/use-admin-session-keepalive.ts",
  );
  assert.match(keepalive, /ADMIN_IDLE_TIMEOUT_MS/);
  assert.match(keepalive, /ADMIN_SESSION_REFRESH_MS/);
  assert.match(keepalive, /clearAdminSession\(\{ revoke: true \}\)/);
  assert.match(keepalive, /signOutUser/);

  const reauth = read("src/lib/admin-reauth.ts");
  assert.match(reauth, /reauthenticateWithPopup/);
  assert.match(reauth, /auth_time/);
  assert.match(reauth, /ADMIN_REAUTH_WINDOW_MS/);

  const authGuard = read("src/components/admin/auth-guard.tsx");
  assert.match(authGuard, /useAdminSessionKeepalive/);
  assert.match(authGuard, /isOwner/);
  assert.match(authGuard, /AdminAccessProvider/);
});

test("role 2 tingkat: /me mengekspos OWNER dan UI menyembunyikan menu OWNER", () => {
  const me = read("src/app/api/admin/me/route.ts");
  assert.match(me, /isOwnerEmail/);
  assert.match(me, /isOwner/);
  assert.match(me, /role/);

  const settingsNav = read("src/lib/settings-nav.ts");
  assert.match(settingsNav, /ownerOnly:\s*true/);

  const sidebar = read("src/components/admin/sidebar/sidebar-nav.tsx");
  assert.match(sidebar, /canViewOwnerOnly/);
  assert.match(sidebar, /useAdminAccess/);

  const palette = read("src/components/admin/command-palette.tsx");
  assert.match(palette, /canViewOwnerOnly/);

  const overview = read("src/components/admin/settings/settings-overview.tsx");
  assert.match(overview, /canViewOwnerOnly/);
});

test("backup ekspor/impor khusus OWNER + re-auth", () => {
  const route = read("src/app/api/admin/backup/route.ts");
  assert.match(route, /requireFreshOwner/);
  assert.doesNotMatch(route, /requireAdmin/);
  assert.doesNotMatch(route, /isOwnerEmail/);

  const page = read("src/app/admin/(dashboard)/settings/backup/page.tsx");
  assert.match(page, /isOwnerEmail/);
  assert.match(page, /redirect\("\/admin\/settings"\)/);

  const ui = read("src/components/admin/settings/settings-backup.tsx");
  assert.match(ui, /ensureRecentAdminAuth/);
});

test("hapus user dinonaktifkan; UI hanya menyediakan blokir", () => {
  const route = read("src/app/api/admin/users/route.ts");
  assert.match(route, /user_delete_disabled/);
  assert.match(route, /status:\s*405/);
  assert.doesNotMatch(route, /deleteUserProfile/);

  const manager = read("src/components/admin/users-manager.tsx");
  assert.doesNotMatch(manager, /deleteUser/);
  assert.doesNotMatch(manager, /Trash2/);
  assert.doesNotMatch(manager, /Hapus pengguna ini/);
  assert.match(manager, /Blokir user/);
});

test("hapus order massal/tunggal wajib re-auth; ekspor massal OWNER-only", () => {
  const route = read("src/app/api/admin/orders/route.ts");
  assert.match(route, /requireFreshAdmin/);
  assert.match(route, /assertFreshAuth\(check\)/);
  assert.match(route, /export.*OWNER|OWNER.*export/is);
  assert.match(route, /isOwnerEmail\(check\.email\)/);

  const manager = read("src/components/admin/orders-manager.tsx");
  assert.match(manager, /ensureRecentAdminAuth/);
  assert.match(manager, /isOwner/);

  const detail = read("src/components/admin/orders/order-detail-dialog.tsx");
  assert.match(detail, /ensureRecentAdminAuth/);

  const toolbar = read("src/components/admin/orders/orders-toolbar.tsx");
  assert.match(toolbar, /isOwner/);

  const bulk = read("src/components/admin/orders/orders-bulk-bar.tsx");
  assert.match(bulk, /isOwner/);
});

test("broadcast massal + kelola admin memakai re-auth", () => {
  const broadcast = read("src/app/api/admin/broadcast/route.ts");
  assert.match(broadcast, /assertFreshAuth\(check\)/);

  const broadcastUi = read(
    "src/components/admin/broadcast/broadcast-composer.tsx",
  );
  assert.match(broadcastUi, /ensureRecentAdminAuth/);

  const admins = read("src/app/api/admin/admins/route.ts");
  assert.match(admins, /requireFreshOwner/);

  const adminsUi = read(
    "src/components/admin/settings/settings-keamanan.tsx",
  );
  assert.match(adminsUi, /ensureRecentAdminAuth/);
});

test("ekspor PII klien (user/lead/subscriber/redemption) hanya OWNER", () => {
  const files = [
    "src/components/admin/users-manager.tsx",
    "src/components/admin/leads-manager.tsx",
    "src/components/admin/broadcast/subscribers-panel.tsx",
    "src/components/admin/coupons/coupon-detail-client.tsx",
  ];
  for (const file of files) {
    const source = read(file);
    assert.match(source, /useAdminAccess/, `${file} harus membaca role`);
    assert.match(source, /isOwner/, `${file} harus memfilter ekspor`);
  }
});
