import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { BACKUP_SOURCES } from "../src/lib/backup-pure.ts";
import {
  isRestoreTerminal,
  parseSnapshotManifest,
  restoreJobProgress,
  snapshotIncompleteReason,
  snapshotRestoreSources,
  snapshotRestoreTotals,
  summarizeSnapshot,
  type BackupRestoreJob,
  type SnapshotManifest,
} from "../src/lib/backup-restore-pure.ts";

/**
 * Regresi ADM-12: manifest snapshot, daftar sumber, progres job, dan wiring
 * UI/worker restore bertahap. Bukan pengganti uji volume produksi.
 * Jalankan: `npm run test:unit`
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

function manifest(over: Partial<SnapshotManifest> = {}): SnapshotManifest {
  return {
    stamp: "pre-restore-2026-10-24T10-00-00-000Z",
    createdAtISO: "2026-10-24T10:00:00.000Z",
    sources: {
      products: { rows: 3, chunks: 1 },
      orders: { rows: 450, chunks: 2 },
    },
    ...over,
  };
}

test("ADM-12: manifest snapshot valid + ringkasan", () => {
  const parsed = parseSnapshotManifest({
    stamp: manifest().stamp,
    manifest: true,
    createdAtISO: manifest().createdAtISO,
    sources: manifest().sources,
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const summary = summarizeSnapshot(parsed.manifest);
  assert.equal(summary.rows, 453);
  assert.equal(summary.chunks, 3);
  assert.equal(summary.incompleteReason, null);
  assert.deepEqual(
    summary.sources.map((source) => source.source),
    ["products", "orders"],
  );
});

test("ADM-12: manifest menolak ID/sumber tidak aman", () => {
  assert.equal(
    parseSnapshotManifest({
      stamp: "../evil",
      manifest: true,
      createdAtISO: manifest().createdAtISO,
      sources: {},
    }).ok,
    false,
  );
  assert.equal(
    parseSnapshotManifest({
      stamp: manifest().stamp,
      manifest: true,
      createdAtISO: manifest().createdAtISO,
      sources: { secrets: { rows: 1, chunks: 1 } },
    }).ok,
    false,
  );
  assert.equal(
    parseSnapshotManifest({
      stamp: manifest().stamp,
      manifest: true,
      createdAtISO: "bukan-tanggal",
      sources: {},
    }).ok,
    false,
  );
});

test("ADM-12: snapshot dengan chunk gagal ditandai tidak lengkap", () => {
  const parsed = parseSnapshotManifest({
    stamp: manifest().stamp,
    manifest: true,
    createdAtISO: manifest().createdAtISO,
    sources: {
      products: { rows: 3, chunks: 1 },
      orders: { rows: 450, chunks: 2, failedChunks: 1 },
    },
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.match(
    snapshotIncompleteReason(parsed.manifest) ?? "",
    /orders.*tidak lengkap/i,
  );
});

test("ADM-12: sumber 0 chunk walau gagal baca tetap terdeteksi tidak lengkap", () => {
  const parsed = parseSnapshotManifest({
    stamp: manifest().stamp,
    manifest: true,
    createdAtISO: manifest().createdAtISO,
    sources: {
      products: { rows: 0, chunks: 0, failedChunks: 1 },
    },
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.match(snapshotIncompleteReason(parsed.manifest) ?? "", /products/);
});

test("ADM-12: total & urutan sumber mengikuti BACKUP_SOURCES", () => {
  const parsed = parseSnapshotManifest({
    stamp: manifest().stamp,
    manifest: true,
    createdAtISO: manifest().createdAtISO,
    sources: {
      reviews: { rows: 1, chunks: 1 },
      products: { rows: 2, chunks: 1 },
      orders: { rows: 3, chunks: 1 },
    },
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const totals = snapshotRestoreTotals(parsed.manifest);
  const expected = BACKUP_SOURCES.filter((source) =>
    ["reviews", "products", "orders"].includes(source),
  );
  assert.deepEqual(totals.sources, expected);
  assert.deepEqual(totals.chunkCounts, [1, 1, 1]);
  assert.equal(totals.totalRows, 6);
  assert.equal(totals.totalChunks, 3);
  assert.deepEqual(snapshotRestoreSources(parsed.manifest), expected);
});

function job(over: Partial<BackupRestoreJob> = {}): BackupRestoreJob {
  return {
    id: "00000000-0000-4000-8000-000000000000",
    stamp: manifest().stamp,
    requestedBy: "owner@lktech.test",
    status: "running",
    phase: "restore",
    preSnapshotStamp: "pre-restore-2026-10-24T10-00-01-000Z",
    restoreSources: ["products", "orders"],
    chunkCounts: [1, 2],
    snapshotSources: ["products", "orders"],
    sourceIndex: 0,
    chunkIndex: 0,
    processedUnits: 1,
    totalUnits: 5,
    written: 0,
    failed: 0,
    skipped: 0,
    truncated: false,
    totalRows: 453,
    createdAtISO: "2026-10-24T10:00:00.000Z",
    updatedAtISO: "2026-10-24T10:00:00.000Z",
    effectsApplied: false,
    ...over,
  };
}

test("ADM-12: progres job & status terminal", () => {
  assert.equal(restoreJobProgress(job()), 20);
  assert.equal(restoreJobProgress(job({ processedUnits: 5 })), 100);
  assert.equal(restoreJobProgress(job({ status: "completed" })), 100);
  assert.equal(isRestoreTerminal("completed"), true);
  assert.equal(isRestoreTerminal("failed"), true);
  assert.equal(isRestoreTerminal("running"), false);
});

test("ADM-12: wiring UI, route, worker, dan lock checkpoint", () => {
  const snapshotsRoute = read("src/app/api/admin/backup/snapshots/route.ts");
  const jobRoute = read(
    "src/app/api/admin/backup/snapshots/[jobId]/route.ts",
  );
  const worker = read("src/lib/backup-restore.ts");
  const backup = read("src/lib/backup.ts");
  const ui = read("src/components/admin/settings/settings-backup.tsx");
  const cronRoute = read("src/app/api/cron/backup-restore/route.ts");
  const workflow = read(".github/workflows/cron.yml");

  assert.match(snapshotsRoute, /requireFreshOwner/);
  assert.match(snapshotsRoute, /listSnapshotSummaries/);
  assert.match(snapshotsRoute, /startSnapshotRestore/);
  assert.match(jobRoute, /requireOwner/);
  assert.match(jobRoute, /runRestoreJobStep/);
  assert.match(worker, /_backup_restore_jobs/);
  assert.match(worker, /lockUntilISO/);
  assert.match(worker, /processedUnits/);
  assert.match(worker, /runBackupRestoreWorker/);
  assert.match(worker, /applyRestoreCompletionEffects/);
  assert.match(backup, /snapshotOneSource/);
  assert.match(backup, /readSnapshotChunk/);
  assert.match(ui, /Restore dari Snapshot/);
  assert.match(ui, /runRestoreLoop/);
  assert.match(ui, /snapshots\/\$\{encodeURIComponent\(jobId\)\}/);
  assert.match(cronRoute, /CRON_SECRET/);
  assert.match(cronRoute, /runBackupRestoreWorker/);
  assert.match(workflow, /backup-restore/);
});
