import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  broadcastRequestFingerprint,
  createBroadcastIdempotencyKey,
  normalizeBroadcastIdempotencyKey,
} from "../src/lib/broadcast-idempotency-pure.ts";
import { chunkSnapshotRows } from "../src/lib/backup-pure.ts";
import { decideBroadcastQuota } from "../src/lib/broadcast-quota-pure.ts";

/**
 * Regresi P1 lanjutan:
 * - ADM-13: audit coverage + kegagalan audit terlihat,
 * - ADM-09: hapus order + restore kuota kupon atomik,
 * - ADM-07: idempotency broadcast.
 *
 * Uji wiring + logika murni. Ini bukan pengganti E2E terautentikasi.
 * Jalankan: `npm run test:admin-p1`
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

test("ADM-13: mutation routes memanggil audit untuk lead/proyek/konten/media", () => {
  const leads = read("src/app/api/admin/leads/route.ts");
  assert.match(leads, /recordAdminAudit/);
  assert.match(leads, /action:\s*"lead\.status"/);
  assert.match(leads, /action:\s*"lead\.activity"/);
  assert.match(leads, /action:\s*"lead\.delete"/);

  const projects = read("src/app/api/admin/projects/route.ts");
  assert.match(projects, /action:\s*"project\.save"/);
  assert.match(projects, /action:\s*"project\.delete"/);

  const content = read("src/app/api/admin/content/route.ts");
  assert.match(content, /action:\s*"content\.update"/);

  const media = read("src/app/api/admin/media/collections/route.ts");
  assert.match(media, /action:\s*"media\.collection"/);
  assert.match(media, /op:\s*"create"/);
  assert.match(media, /op:\s*"update"/);
  assert.match(media, /op:\s*"delete"/);
});

test("ADM-13: login/logout/email test tercatat, kegagalan audit dikirim ke Sentry", () => {
  const session = read("src/app/api/admin/session/route.ts");
  assert.match(session, /action:\s*"admin\.login"/);
  assert.match(session, /action:\s*"admin\.logout"/);
  assert.match(session, /if\s*\(!existingLogin\)/);

  const emailTest = read("src/app/api/admin/email/test/route.ts");
  assert.match(emailTest, /action:\s*"email\.test"/);

  const audit = read("src/lib/admin-audit.ts");
  assert.match(audit, /Sentry\.captureException/);
  assert.match(audit, /area:\s*"admin-audit"/);
});

test("ADM-09: hapus order memakai transaksi + restore kupon dalam transaksi", () => {
  const orders = read("src/lib/orders.ts");
  assert.match(orders, /export async function deleteOrder\(/);
  assert.match(orders, /db\.runTransaction/);
  assert.match(orders, /restoreCouponUsageInTransaction/);
  assert.match(orders, /allowedStatuses/);

  const coupons = read("src/lib/coupons.ts");
  assert.match(coupons, /restoreCouponUsageInTransaction/);
  assert.match(coupons, /type Transaction/);
  // Semua baca harus sebelum tulis: counter harian dibaca sebelum tx.update.
  assert.match(coupons, /const daily = needsDaily \? await tx\.get\(dailyRef\)/);

  const route = read("src/app/api/admin/orders/route.ts");
  assert.match(route, /deleteOrder\(order\.id, DELETABLE_STATUSES\)/);
  assert.match(route, /deleteOrder\(id, DELETABLE_STATUSES\)/);
  assert.doesNotMatch(route, /coupon_restore_failed/);
  assert.doesNotMatch(
    route,
    /await deleteOrder\(order\.id\);[\s\S]{0,400}restoreCouponUsage/,
  );
});

test("ADM-12: snapshot dipecah per chunk & impor memakai batch + fallback", () => {
  const rows = [
    { _id: "a", blob: "x".repeat(40) },
    { _id: "b", blob: "x".repeat(40) },
    { _id: "c", blob: "x".repeat(40) },
  ];
  const chunks = chunkSnapshotRows(rows, { maxBytes: 80, maxRows: 2 });
  assert.ok(chunks.length >= 2);
  assert.equal(chunks.flat().length, rows.length);
  assert.ok(chunks.every((c) => c.length <= 2));

  const backup = read("src/lib/backup.ts");
  assert.match(backup, /chunkSnapshotRows/);
  assert.match(backup, /SNAPSHOT_COLLECTION/);
  assert.match(backup, /IMPORT_BATCH_SIZE/);
  assert.match(backup, /db\.batch\(\)/);
  assert.match(backup, /fallback per-dokumen/);
  assert.doesNotMatch(backup, /\.set\(\{\s*\[name\]: rows\s*\}/);

  const backupRoute = read("src/app/api/admin/backup/route.ts");
  assert.match(backupRoute, /alertBackupLimit/);
  assert.match(backupRoute, /Sentry\.captureMessage/);
});

test("ADM-05: CSP penuh tersedia sebagai report-only", () => {
  const config = read("next.config.ts");
  assert.match(config, /Content-Security-Policy-Report-Only/);
  assert.match(config, /default-src 'self'/);
  assert.match(config, /connect-src 'self'/);
  // Kebijakan lama yang memblokir frame tetap dipertahankan.
  assert.match(config, /frame-ancestors 'none'/);
});

test("ADM-07: kuota broadcast menolak kelebihan & alarm tepat di ambang", () => {
  const disabled = decideBroadcastQuota(10, 10, 0);
  assert.equal(disabled.ok, true);
  assert.equal(disabled.ok && disabled.disabled, true);

  const below = decideBroadcastQuota(79, 1, 100);
  assert.equal(below.ok, true);
  assert.equal(below.ok && below.used, 80);
  assert.equal(below.ok && below.alert, true);

  const above = decideBroadcastQuota(80, 1, 100);
  assert.equal(above.ok, true);
  assert.equal(above.ok && above.alert, undefined);

  const rejected = decideBroadcastQuota(95, 10, 100);
  assert.equal(rejected.ok, false);
  assert.equal(!rejected.ok && rejected.code, "quota_exceeded");
});

test("ADM-07: aksi destruktif memakai guard rate-limit per uid", () => {
  const helper = read("src/lib/admin-rate-limit.ts");
  assert.match(helper, /checkRateLimit/);
  assert.match(helper, /admin-mutation:/);

  const routes: Array<[string, string]> = [
    ["src/app/api/admin/orders/route.ts", "order.delete"],
    ["src/app/api/admin/users/route.ts", "user.block"],
    ["src/app/api/admin/products/route.ts", "product.delete"],
    ["src/app/api/admin/articles/route.ts", "article.delete"],
    ["src/app/api/admin/reviews/route.ts", "review.delete"],
    ["src/app/api/admin/coupons/route.ts", "coupon.delete"],
    ["src/app/api/admin/leads/route.ts", "lead.delete"],
  ];
  for (const [file, action] of routes) {
    const source = read(file);
    assert.match(source, /guardAdminMutation/);
    assert.match(
      source,
      new RegExp(
        `guardAdminMutation\\(check\\.uid, "${action.replace(".", "\\.")}"`,
      ),
    );
  }
});

test("ADM-07: key idempotency divalidasi dan fingerprint stabil", () => {
  const key = createBroadcastIdempotencyKey();
  assert.equal(normalizeBroadcastIdempotencyKey(key), key);
  assert.equal(normalizeBroadcastIdempotencyKey("  short  "), null);
  assert.equal(normalizeBroadcastIdempotencyKey("spasi tidak boleh"), null);
  assert.equal(normalizeBroadcastIdempotencyKey("x".repeat(129)), null);
  assert.equal(
    normalizeBroadcastIdempotencyKey("abc_DEF-123:456"),
    "abc_DEF-123:456",
  );

  const a = broadcastRequestFingerprint({
    subject: "Promo",
    body: "Halo",
    segment: "semua",
  });
  const b = broadcastRequestFingerprint({
    subject: "Promo",
    body: "Halo",
    segment: "semua",
  });
  const c = broadcastRequestFingerprint({
    subject: "Promo",
    body: "Halo baru",
    segment: "semua",
  });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("ADM-07: route mewajibkan reservation sebelum kirim dan UI memakai key", () => {
  const route = read("src/app/api/admin/broadcast/route.ts");
  assert.match(route, /normalizeBroadcastIdempotencyKey/);
  assert.match(route, /beginBroadcastRequest/);
  assert.match(route, /completeBroadcastRequest/);
  assert.match(route, /markBroadcastRequestIndeterminate/);
  assert.match(route, /idempotency_key_required/);
  assert.match(route, /broadcast_in_progress/);
  assert.match(route, /broadcast_outcome_unknown/);
  assert.match(route, /reserveBroadcastQuota/);
  assert.match(route, /broadcast_quota_exceeded/);
  assert.match(route, /isBroadcastConfigured/);

  const server = read("src/lib/broadcast-idempotency.ts");
  assert.match(server, /status:\s*"processing"/);
  assert.match(server, /status:\s*"completed"/);
  assert.match(server, /status:\s*"indeterminate"/);
  assert.match(server, /createHash\("sha256"\)/);

  const api = read("src/lib/admin-broadcast-api.ts");
  assert.match(api, /idempotencyKey:\s*string/);

  const ui = read("src/components/admin/broadcast/broadcast-composer.tsx");
  assert.match(ui, /idempotencyKeyRef/);
  assert.match(ui, /idempotencyKey:\s*idempotencyKeyRef\.current/);
  assert.match(ui, /createBroadcastIdempotencyKey/);
});
