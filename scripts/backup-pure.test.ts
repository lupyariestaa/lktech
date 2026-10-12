import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateBackupBundle,
  summarizeBackup,
  BACKUP_VERSION,
  BACKUP_SOURCES,
} from "../src/lib/backup-pure.ts";

/**
 * Uji logika murni backup (fase S7).
 * Jalankan: `npm run test:backup`
 */

function bundle(over: Record<string, unknown> = {}) {
  return {
    meta: { version: BACKUP_VERSION, createdAtISO: "2026-11-01T00:00:00Z", by: "a@b.com", sources: ["settings", "products"] },
    data: { settings: [{ _id: "site" }], products: [{ _id: "p1" }, { _id: "p2" }] },
    ...over,
  };
}

test("validateBackupBundle: bundle valid", () => {
  const r = validateBackupBundle(bundle());
  assert.equal(r.ok, true);
});

test("validateBackupBundle: bukan objek", () => {
  assert.equal(validateBackupBundle(null).ok, false);
  assert.equal(validateBackupBundle("x").ok, false);
});

test("validateBackupBundle: versi tak didukung", () => {
  const r = validateBackupBundle(bundle({ meta: { version: 999, sources: [] } }));
  assert.equal(r.ok, false);
});

test("validateBackupBundle: sumber tak dikenal", () => {
  const r = validateBackupBundle(bundle({ meta: { version: BACKUP_VERSION, sources: ["ngawur"] }, data: {} }));
  assert.equal(r.ok, false);
});

test("validateBackupBundle: data sumber tak dikenal", () => {
  const r = validateBackupBundle(
    bundle({ data: { rahasia: [] } }),
  );
  assert.equal(r.ok, false);
});

test("validateBackupBundle: data bukan array", () => {
  const r = validateBackupBundle(bundle({ data: { products: { a: 1 } } }));
  assert.equal(r.ok, false);
});

test("summarizeBackup: jumlah per sumber", () => {
  const r = validateBackupBundle(bundle());
  assert.equal(r.ok, true);
  if (r.ok) {
    const s = summarizeBackup(r.bundle);
    assert.deepEqual(
      s.sort((a, b) => a.source.localeCompare(b.source)),
      [
        { source: "products", count: 2 },
        { source: "settings", count: 1 },
      ],
    );
  }
});

test("BACKUP_SOURCES: berisi sumber inti", () => {
  for (const s of ["settings", "products", "coupons", "orders"]) {
    assert.ok((BACKUP_SOURCES as readonly string[]).includes(s));
  }
});
