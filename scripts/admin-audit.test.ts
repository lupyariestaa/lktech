import { test } from "node:test";
import assert from "node:assert/strict";
import { ADMIN_AUDIT_ACTIONS, ADMIN_AUDIT_ACTION_LABEL } from "../src/lib/admin-audit-types.ts";

/**
 * Uji bentuk & kelengkapan konstanta audit log (Tema 4.1).
 * Jalankan: `npm run test:audit`
 */

test("ADMIN_AUDIT_ACTIONS: semua aksi punya label", () => {
  for (const a of ADMIN_AUDIT_ACTIONS) {
    assert.equal(
      typeof ADMIN_AUDIT_ACTION_LABEL[a],
      "string",
      `label untuk ${a}`,
    );
    assert.ok(ADMIN_AUDIT_ACTION_LABEL[a].length > 0);
  }
});

test("ADMIN_AUDIT_ACTIONS: tak ada duplikat", () => {
  const set = new Set(ADMIN_AUDIT_ACTIONS);
  assert.equal(set.size, ADMIN_AUDIT_ACTIONS.length);
});

test("ADMIN_AUDIT_ACTION_LABEL: tak ada kunci berlebih", () => {
  const labelKeys = Object.keys(ADMIN_AUDIT_ACTION_LABEL).sort();
  const actionKeys = [...ADMIN_AUDIT_ACTIONS].sort();
  assert.deepEqual(labelKeys, actionKeys);
});
