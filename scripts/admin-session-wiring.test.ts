import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Guard regresi ADM-04 — memastikan jalur logout admin tetap mencabut sesi
 * server (bukan hanya menghapus cookie). Test ini murah dan tidak membutuhkan
 * kredensial; verifikasi runtime dengan akun admin nyata tetap manual.
 *
 * Jalankan: `npm run test:admin-session`
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

test("ADM-04: logout admin mencabut refresh token & tetap menghapus cookie", () => {
  const route = read("src/app/api/admin/session/route.ts");
  const session = read("src/lib/session.ts");
  const client = read("src/lib/admin-fetch.ts");
  const shell = read("src/components/admin/admin-shell.tsx");

  // Sesi diverifikasi dengan checkRevoked=true agar cookie lama langsung mati.
  assert.match(session, /verifySessionCookie\(token, true\)/);
  assert.match(session, /revokeRefreshTokens\(uid\)/);

  // Endpoint logout memverifikasi Bearer (checkRevoked) lalu mencabut uid.
  assert.match(route, /verifyIdToken\(token, true\)/);
  assert.match(route, /revokeAdminSessions\(uid\)/);
  assert.match(route, /clearSessionCookie\(res\)/);
  assert.match(route, /req\.cookies\.get\(ADMIN_SESSION_COOKIE\)/);

  // Klien mengirim Bearer saat logout admin; shell meminta revocation.
  assert.match(client, /if \(opts\.revoke\)/);
  assert.match(client, /Authorization: `Bearer \$\{token\}`/);
  assert.match(shell, /clearAdminSession\(\{ revoke: true \}\)/);
});
