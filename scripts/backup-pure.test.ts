import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateBackupBundle,
  summarizeBackup,
  sanitizeBackupRow,
  planImport,
  assessExportLimits,
  IMPORT_CAP,
  EXPORT_CAP,
  BACKUP_NEAR_LIMIT_RATIO,
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
    const plan = planImport(b.bundle, OWNER, { allowAdmins: true });
    assert.equal(plan.operations.length, 1);
    assert.equal(plan.skipped, 1);
  }
});

test("planImport: non-OWNER dilarang menulis admins (fail-closed)", () => {
  const b = validateBackupBundle(
    bundle({
      data: {
        admins: [
          { _id: "attacker@example.com" },
          { _id: "owner@lktech.id" },
        ],
      },
      meta: { version: BACKUP_VERSION, sources: ["admins"] },
    }),
  );
  assert.equal(b.ok, true);
  if (b.ok) {
    const plan = planImport(b.bundle, OWNER); // default allowAdmins=false
    assert.equal(plan.operations.length, 0);
    assert.equal(plan.skipped, 2);
    assert.equal(plan.perSource[0].accepted, 0);
    assert.equal(plan.perSource[0].skipped, 2);
  }
});

test("planImport: blokir admins tidak memblokir sumber lain", () => {
  const b = validateBackupBundle(
    bundle({
      data: {
        products: [{ _id: "p1" }],
        admins: [{ _id: "attacker@example.com" }],
      },
      meta: { version: BACKUP_VERSION, sources: ["products", "admins"] },
    }),
  );
  assert.equal(b.ok, true);
  if (b.ok) {
    const plan = planImport(b.bundle, OWNER, { allowAdmins: false });
    assert.equal(plan.operations.length, 1);
    assert.equal(plan.operations[0].source, "products");
    assert.equal(plan.skipped, 1);
  }
});

/* ---------- Batas ekspor & kedekatan batas (ADM-07) ---------- */

test("assessExportLimits: mendeteksi dekat & melewati batas ekspor", () => {
  const cap = 100;
  const { nearLimit, overLimit } = assessExportLimits(
    [
      { source: "products", count: 79 }, // di bawah ambang 80%
      { source: "orders", count: Math.ceil(cap * BACKUP_NEAR_LIMIT_RATIO) }, // tepat ambang
      { source: "users", count: cap }, // mencapai batas
      { source: "reviews", count: cap + 5 }, // melewati batas
    ],
    cap,
  );
  assert.deepEqual(nearLimit, ["orders"]);
  assert.deepEqual(overLimit, ["users", "reviews"]);
});

test("assessExportLimits: batas default = EXPORT_CAP & sumber kosong aman", () => {
  assert.equal(EXPORT_CAP, 5000);
  assert.equal(BACKUP_NEAR_LIMIT_RATIO, 0.8);
  const { nearLimit, overLimit } = assessExportLimits([], EXPORT_CAP);
  assert.deepEqual(nearLimit, []);
  assert.deepEqual(overLimit, []);
});

test("validateBackupBundle: menerima meta dengan field batas ekspor (ADM-07)", () => {
  const r = validateBackupBundle(
    bundle({
      meta: {
        version: BACKUP_VERSION,
        createdAtISO: "2026-11-01T00:00:00Z",
        by: "a@b.com",
        sources: ["products"],
        cap: EXPORT_CAP,
        perSourceCounts: [{ source: "products", count: 2 }],
        nearLimitSources: ["orders"],
      },
    }),
  );
  assert.equal(r.ok, true);
  // Field tambahan tidak ikut tersimpan di bundle tervalidasi (aman).
  if (r.ok) assert.equal("cap" in r.bundle.meta, false);
});
