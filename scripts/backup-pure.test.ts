import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateBackupBundle,
  summarizeBackup,
  sanitizeBackupRow,
  planImport,
  IMPORT_CAP,
  SETTINGS_DOC_ID,
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

// ===== G2/G3 — sanitizeBackupRow (keamanan impor) =====

const OWNER = ["owner@lktech.id"];

test("sanitizeBackupRow: admins — OWNER dilindungi (ditolak)", () => {
  const r = sanitizeBackupRow("admins", { _id: "owner@lktech.id", active: false }, OWNER);
  assert.equal(r.ok, false);
});

test("sanitizeBackupRow: admins — paksa active:true (anti-lockout)", () => {
  const r = sanitizeBackupRow("admins", { _id: "Admin@LKTech.id", active: false }, OWNER);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.id, "admin@lktech.id");
    assert.equal(r.data.active, true);
    assert.equal(r.data.email, "admin@lktech.id");
  }
});

test("sanitizeBackupRow: admins — _id bukan email ditolak", () => {
  const r = sanitizeBackupRow("admins", { _id: "bukan-email" }, OWNER);
  assert.equal(r.ok, false);
});

test("sanitizeBackupRow: settings — _id dipaksa SETTINGS_DOC_ID", () => {
  const r = sanitizeBackupRow("settings", { _id: "suntikan-lain", email: "x@y.z" }, OWNER);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.id, SETTINGS_DOC_ID);
  }
});

test("sanitizeBackupRow: _id kosong / baris bukan objek ditolak", () => {
  assert.equal(sanitizeBackupRow("products", { _id: "" }, []).ok, false);
  assert.equal(sanitizeBackupRow("products", null, []).ok, false);
  assert.equal(sanitizeBackupRow("products", [1, 2], []).ok, false);
});

// ===== G4 — planImport (batas & ringkasan) =====

test("planImport: menghitung accepted/skipped & membuang _id dari data", () => {
  const b = validateBackupBundle(bundle());
  assert.equal(b.ok, true);
  if (b.ok) {
    const plan = planImport(b.bundle, OWNER);
    assert.equal(plan.operations.length, 3); // 1 settings + 2 products
    assert.equal(plan.truncated, false);
    const prod = plan.operations.find((o) => o.source === "products");
    assert.ok(prod);
    assert.equal("_id" in prod!.data, false);
  }
});

test("planImport: menandai truncated saat melebihi IMPORT_CAP", () => {
  const rows = Array.from({ length: IMPORT_CAP + 5 }, (_, i) => ({ _id: `p${i}` }));
  const b = validateBackupBundle(
    bundle({ data: { products: rows }, meta: { version: BACKUP_VERSION, sources: ["products"] } }),
  );
  assert.equal(b.ok, true);
  if (b.ok) {
    const plan = planImport(b.bundle, OWNER);
    assert.equal(plan.truncated, true);
    assert.equal(plan.operations.length, IMPORT_CAP);
  }
});

test("planImport: admins — OWNER dihitung skipped", () => {
  const b = validateBackupBundle(
    bundle({
      data: { admins: [{ _id: "owner@lktech.id" }, { _id: "a@b.com" }] },
      meta: { version: BACKUP_VERSION, sources: ["admins"] },
    }),
  );
  assert.equal(b.ok, true);
  if (b.ok) {
    const plan = planImport(b.bundle, OWNER);
    assert.equal(plan.operations.length, 1);
    assert.equal(plan.skipped, 1);
  }
});
