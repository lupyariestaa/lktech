import "server-only";
import { randomUUID } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAdminDb } from "@/lib/firebase-admin";
import { getOwnerEmails } from "@/lib/admins";
import {
  BACKUP_SOURCES,
  BACKUP_VERSION,
  planImport,
  type BackupBundle,
  type BackupSource,
} from "@/lib/backup-pure";
import {
  listSnapshotManifestData,
  readSnapshotChunk,
  readSnapshotManifestData,
  recordSnapshotSource,
  snapshotOneSource,
  writeBackupOperations,
} from "@/lib/backup";
import {
  RESTORE_JOB_ID_PATTERN,
  SNAPSHOT_STAMP_PATTERN,
  isRestoreTerminal,
  parseSnapshotManifest,
  snapshotIncompleteReason,
  snapshotRestoreTotals,
  summarizeSnapshot,
  type BackupRestoreJob,
  type RestoreJobPhase,
  type RestoreJobStatus,
  type SnapshotSummary,
} from "@/lib/backup-restore-pure";
import { recordAdminAudit } from "@/lib/admin-audit";
import { ALL_CACHE_TAGS, REVALIDATE_NOW } from "@/lib/cache-tags";
import { invalidateSalesAnalyticsCache } from "@/lib/sales-analytics";

/**
 * RESTORE SNAPSHOT BERTAHAP (ADM-12).
 *
 * Restore file besar tidak lagi bergantung pada satu request panjang:
 * - job disimpan di `_backup_restore_jobs` (tanpa isi baris/PII),
 * - tiap langkah membuat snapshot pengaman satu sumber atau menulis satu
 *   chunk (≤400 operasi), lalu menyimpan checkpoint,
 * - UI memanggil langkah berikutnya; cron worker juga dapat melanjutkan job
 *   saat tab ditutup,
 * - lock mencegah dua worker memproses unit yang sama.
 */

const JOBS_COLLECTION = "_backup_restore_jobs";
const JOB_LOCK_MS = 2 * 60 * 1000;
const MAX_WORKER_STEPS = 20;
const MAX_WORKER_MS = 20_000;

export class BackupRestoreError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "BackupRestoreError";
    this.status = status;
  }
}

const STATUSES: RestoreJobStatus[] = ["queued", "running", "completed", "failed"];
const PHASES: RestoreJobPhase[] = ["snapshot", "restore"];

function numberField(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : fallback;
}

const VALID_BACKUP_SOURCES = new Set<string>(BACKUP_SOURCES);

function parseJob(
  id: string,
  raw: Record<string, unknown>,
): BackupRestoreJob {
  const status = STATUSES.includes(raw.status as RestoreJobStatus)
    ? (raw.status as RestoreJobStatus)
    : "queued";
  const phase = PHASES.includes(raw.phase as RestoreJobPhase)
    ? (raw.phase as RestoreJobPhase)
    : "restore";
  const restoreSources = Array.isArray(raw.restoreSources)
    ? raw.restoreSources.filter(
        (source): source is BackupSource =>
          typeof source === "string" && VALID_BACKUP_SOURCES.has(source),
      )
    : [];
  const snapshotSources = Array.isArray(raw.snapshotSources)
    ? raw.snapshotSources.filter(
        (source): source is BackupSource =>
          typeof source === "string" &&
          restoreSources.includes(source as BackupSource),
      )
    : [];
  const chunkCounts = Array.isArray(raw.chunkCounts)
    ? raw.chunkCounts.map((value) => numberField(value))
    : restoreSources.map(() => 0);
  const createdAtISO =
    typeof raw.createdAtISO === "string"
      ? raw.createdAtISO
      : new Date().toISOString();

  return {
    id,
    stamp: typeof raw.stamp === "string" ? raw.stamp : "",
    requestedBy: typeof raw.requestedBy === "string" ? raw.requestedBy : "",
    status,
    phase,
    preSnapshotStamp:
      typeof raw.preSnapshotStamp === "string" ? raw.preSnapshotStamp : "",
    restoreSources,
    chunkCounts,
    snapshotSources,
    sourceIndex: numberField(raw.sourceIndex),
    chunkIndex: numberField(raw.chunkIndex),
    processedUnits: numberField(raw.processedUnits),
    totalUnits: numberField(raw.totalUnits),
    written: numberField(raw.written),
    failed: numberField(raw.failed),
    skipped: numberField(raw.skipped),
    truncated: raw.truncated === true,
    totalRows: numberField(raw.totalRows),
    createdAtISO,
    updatedAtISO:
      typeof raw.updatedAtISO === "string"
        ? raw.updatedAtISO
        : createdAtISO,
    ...(typeof raw.completedAtISO === "string"
      ? { completedAtISO: raw.completedAtISO }
      : {}),
    ...(typeof raw.error === "string" ? { error: raw.error } : {}),
    ...(typeof raw.lockUntilISO === "string"
      ? { lockUntilISO: raw.lockUntilISO }
      : {}),
    ...(raw.effectsApplied === true ? { effectsApplied: true } : {}),
  };
}

function jobsCollection() {
  const db = getAdminDb();
  if (!db) throw new BackupRestoreError("Admin SDK tidak tersedia.", 503);
  return db.collection(JOBS_COLLECTION);
}

/** Job aktif (queued/running) untuk ditampilkan/dilanjutkan UI. */
export async function listActiveRestoreJobs(): Promise<BackupRestoreJob[]> {
  const snap = await jobsCollection()
    .where("status", "in", ["queued", "running"])
    .limit(20)
    .get();
  return snap.docs
    .map((doc) => parseJob(doc.id, doc.data()))
    .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
}

export async function getActiveRestoreJob(): Promise<BackupRestoreJob | null> {
  return (await listActiveRestoreJobs())[0] ?? null;
}

export async function getRestoreJob(jobId: string): Promise<BackupRestoreJob | null> {
  if (!RESTORE_JOB_ID_PATTERN.test(jobId)) {
    throw new BackupRestoreError("ID job restore tidak valid.", 400);
  }
  const doc = await jobsCollection().doc(jobId).get();
  if (!doc.exists) return null;
  return parseJob(doc.id, doc.data() as Record<string, unknown>);
}

/** Daftar snapshot terbaru (metadata saja, tanpa isi baris). */
export async function listSnapshotSummaries(limit = 50): Promise<SnapshotSummary[]> {
  const manifests = await listSnapshotManifestData(limit);
  const summaries: SnapshotSummary[] = [];
  for (const raw of manifests) {
    const parsed = parseSnapshotManifest(raw);
    if (parsed.ok) summaries.push(summarizeSnapshot(parsed.manifest));
    else console.warn("[backup-restore] manifest snapshot rusak:", parsed.error);
  }
  return summaries;
}

/**
 * Mulai job restore dari snapshot. Validasi manifest + cegah duplikasi job
 * aktif untuk snapshot yang sama.
 */
export async function startSnapshotRestore(
  stamp: string,
  actor: string,
): Promise<BackupRestoreJob> {
  if (!SNAPSHOT_STAMP_PATTERN.test(stamp)) {
    throw new BackupRestoreError("ID snapshot tidak valid.", 400);
  }

  const raw = await readSnapshotManifestData(stamp);
  if (!raw) throw new BackupRestoreError("Snapshot tidak ditemukan.", 404);

  const parsed = parseSnapshotManifest(raw, stamp);
  if (!parsed.ok) throw new BackupRestoreError(parsed.error, 400);

  const incomplete = snapshotIncompleteReason(parsed.manifest);
  if (incomplete) throw new BackupRestoreError(incomplete, 409);

  const totals = snapshotRestoreTotals(parsed.manifest);
  if (totals.sources.length === 0) {
    throw new BackupRestoreError("Snapshot tidak berisi data untuk direstore.", 400);
  }

  const already = (await listActiveRestoreJobs()).find(
    (job) => job.stamp === stamp,
  );
  if (already) return already;

  const snapshotSources = totals.sources;
  const now = new Date().toISOString();
  const jobId = randomUUID();
  const job: BackupRestoreJob = {
    id: jobId,
    stamp,
    requestedBy: actor,
    status: "queued",
    phase: snapshotSources.length > 0 ? "snapshot" : "restore",
    preSnapshotStamp: `pre-restore-${now.replace(/[:.]/g, "-")}-${jobId.slice(0, 8)}`,
    restoreSources: totals.sources,
    chunkCounts: totals.chunkCounts,
    snapshotSources,
    sourceIndex: 0,
    chunkIndex: 0,
    processedUnits: 0,
    totalUnits: snapshotSources.length + totals.totalChunks,
    written: 0,
    failed: 0,
    skipped: 0,
    truncated: totals.sources.some(
      (source) => parsed.manifest.sources[source]?.truncated === true,
    ),
    totalRows: totals.totalRows,
    createdAtISO: now,
    updatedAtISO: now,
    effectsApplied: false,
  };

  await jobsCollection().doc(job.id).set(job);
  return job;
}

function bundleForChunk(
  source: BackupSource,
  rows: unknown[],
  createdAtISO: string,
  stamp: string,
): BackupBundle {
  return {
    meta: {
      version: BACKUP_VERSION,
      createdAtISO,
      by: `snapshot:${stamp}`,
      sources: [source],
    },
    data: { [source]: rows },
  };
}

/**
 * Proses SATU unit job:
 * - fase snapshot: snapshot pengaman satu koleksi,
 * - fase restore: tulis satu chunk (≤400 operasi).
 */
async function advanceJob(job: BackupRestoreJob): Promise<BackupRestoreJob> {
  if (job.phase === "snapshot") {
    if (job.sourceIndex >= job.snapshotSources.length) {
      return { ...job, phase: "restore", sourceIndex: 0, chunkIndex: 0 };
    }

    const source = job.snapshotSources[job.sourceIndex];
    const entry = await snapshotOneSource(
      source,
      job.preSnapshotStamp,
      job.createdAtISO,
    );
    await recordSnapshotSource(job.preSnapshotStamp, source, entry);
    if ((entry.failedChunks ?? 0) > 0) {
      throw new BackupRestoreError(
        `Snapshot pengaman "${source}" gagal; restore dibatalkan.`,
        500,
      );
    }

    const sourceIndex = job.sourceIndex + 1;
    const done = sourceIndex >= job.snapshotSources.length;
    return {
      ...job,
      phase: done ? "restore" : "snapshot",
      sourceIndex: done ? 0 : sourceIndex,
      chunkIndex: 0,
      processedUnits: job.processedUnits + 1,
      truncated: job.truncated || entry.truncated === true,
      updatedAtISO: new Date().toISOString(),
    };
  }

  if (job.sourceIndex >= job.restoreSources.length) {
    return { ...job, updatedAtISO: new Date().toISOString() };
  }

  const source = job.restoreSources[job.sourceIndex];
  const chunks = job.chunkCounts[job.sourceIndex] ?? 0;
  if (job.chunkIndex >= chunks) {
    return {
      ...job,
      sourceIndex: job.sourceIndex + 1,
      chunkIndex: 0,
      updatedAtISO: new Date().toISOString(),
    };
  }

  const rows = await readSnapshotChunk(job.stamp, source, job.chunkIndex);
  const plan = planImport(
    bundleForChunk(source, rows, job.createdAtISO, job.stamp),
    getOwnerEmails(),
    { allowAdmins: true },
  );
  const result = await writeBackupOperations(plan.operations);

  return {
    ...job,
    chunkIndex: job.chunkIndex + 1,
    processedUnits: job.processedUnits + 1,
    written: job.written + result.written,
    failed: job.failed + result.failed,
    skipped: job.skipped + plan.skipped,
    truncated: job.truncated || plan.truncated,
    updatedAtISO: new Date().toISOString(),
  };
}

/**
 * Jalankan satu langkah dengan lock Firestore. Bila worker lain masih
 * memegang lock, kembalikan job apa adanya dengan `busy: true`.
 */
export async function runRestoreJobStep(jobId: string): Promise<{
  job: BackupRestoreJob;
  busy: boolean;
}> {
  if (!RESTORE_JOB_ID_PATTERN.test(jobId)) {
    throw new BackupRestoreError("ID job restore tidak valid.", 400);
  }
  const ref = jobsCollection().doc(jobId);
  const db = getAdminDb();
  if (!db) throw new BackupRestoreError("Admin SDK tidak tersedia.", 503);

  const claim = await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) {
      throw new BackupRestoreError("Job restore tidak ditemukan.", 404);
    }

    const job = parseJob(doc.id, doc.data() as Record<string, unknown>);
    if (isRestoreTerminal(job.status)) {
      return { job, busy: true };
    }

    const now = Date.now();
    const lockUntil = job.lockUntilISO ? Date.parse(job.lockUntilISO) : 0;
    if (Number.isFinite(lockUntil) && lockUntil > now) {
      return { job, busy: true };
    }

    const locked: BackupRestoreJob = {
      ...job,
      status: "running",
      lockUntilISO: new Date(now + JOB_LOCK_MS).toISOString(),
      updatedAtISO: new Date(now).toISOString(),
    };
    tx.set(ref, locked);
    return { job: locked, busy: false };
  });

  if (claim.busy) {
    // Bisa terjadi bila worker menyelesaikan job tepat sebelum langkah ini:
    // pastikan cache/audit tetap diterapkan meski tidak ada langkah baru.
    if (claim.job.status === "completed") {
      try {
        await applyRestoreCompletionEffects(claim.job);
      } catch (effectErr) {
        console.error("[backup-restore] efek penyelesaian gagal:", effectErr);
      }
    }
    return claim;
  }

  const job = claim.job;
  try {
    let next = await advanceJob(job);
    const nowISO = new Date().toISOString();
    if (
      next.phase === "restore" &&
      next.sourceIndex >= next.restoreSources.length
    ) {
      next = {
        ...next,
        status: "completed",
        completedAtISO: nowISO,
        updatedAtISO: nowISO,
        lockUntilISO: "",
      };
    } else {
      next = {
        ...next,
        status: "running",
        updatedAtISO: nowISO,
        lockUntilISO: "",
      };
    }
    await ref.set(next, { merge: true });
    if (next.status === "completed") {
      // Efek samping (cache/audit) tidak boleh membalik status restore yang
      // datanya sudah selesai ditulis.
      try {
        await applyRestoreCompletionEffects(next);
      } catch (effectErr) {
        console.error("[backup-restore] efek penyelesaian gagal:", effectErr);
      }
    }
    return { job: next, busy: false };
  } catch (err) {
    const message =
      err instanceof BackupRestoreError
        ? err.message
        : "Restore snapshot gagal.";
    const failed: BackupRestoreJob = {
      ...job,
      status: "failed",
      error: message,
      updatedAtISO: new Date().toISOString(),
      lockUntilISO: "",
    };
    await ref.set(failed, { merge: true });
    console.error("[backup-restore] job gagal:", err);
    return { job: failed, busy: false };
  }
}

/**
 * Efek sekali jalan setelah job selesai: buang cache publik + audit.
 * `effectsApplied` mencegah duplikasi saat UI & cron berlomba.
 */
export async function applyRestoreCompletionEffects(
  job: BackupRestoreJob,
): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  const ref = db.collection(JOBS_COLLECTION).doc(job.id);

  const shouldApply = await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) return false;
    const current = parseJob(doc.id, doc.data() as Record<string, unknown>);
    if (current.status !== "completed" || current.effectsApplied) return false;
    tx.update(ref, { effectsApplied: true });
    return true;
  });
  if (!shouldApply) return;

  for (const tag of ALL_CACHE_TAGS) revalidateTag(tag, REVALIDATE_NOW);
  invalidateSalesAnalyticsCache();
  revalidatePath("/", "layout");
  revalidatePath("/");
  await recordAdminAudit({
    action: "settings.restore",
    actor: job.requestedBy,
    target: job.stamp,
    meta: {
      mode: "snapshot",
      written: job.written,
      failed: job.failed,
      skipped: job.skipped,
      truncated: job.truncated,
    },
  });
}

/**
 * Terapkan efek untuk job completed yang belum sempat diproses (mis. proses
 * mati setelah checkpoint terakhir). Idempoten lewat `effectsApplied`.
 */
export async function applyPendingRestoreEffects(limit = 5): Promise<number> {
  const snap = await jobsCollection()
    .where("effectsApplied", "==", false)
    .limit(Math.max(1, Math.min(limit, 20)))
    .get();
  let applied = 0;
  for (const doc of snap.docs) {
    const job = parseJob(doc.id, doc.data() as Record<string, unknown>);
    if (job.status !== "completed") continue;
    try {
      await applyRestoreCompletionEffects(job);
      applied += 1;
    } catch (err) {
      console.error("[backup-restore] efek pending gagal:", err);
    }
  }
  return applied;
}

/**
 * Worker cron: lanjutkan job aktif secara bertahap dalam batas waktu.
 * Lock per job membuat worker aman berjalan bersamaan dengan UI.
 */
export async function runBackupRestoreWorker(opts: {
  maxSteps?: number;
  maxMs?: number;
} = {}): Promise<{
  steps: number;
  completed: number;
  failed: number;
  busy: number;
  effects: number;
}> {
  const maxSteps = Math.max(1, Math.min(opts.maxSteps ?? MAX_WORKER_STEPS, 50));
  const maxMs = Math.max(1_000, Math.min(opts.maxMs ?? MAX_WORKER_MS, 50_000));
  const started = Date.now();
  let steps = 0;
  let completed = 0;
  let failed = 0;
  let busy = 0;
  let effects = 0;

  try {
    effects += await applyPendingRestoreEffects();
  } catch (err) {
    console.error("[backup-restore] sapu efek pending gagal:", err);
  }

  while (steps < maxSteps && Date.now() - started < maxMs) {
    const jobs = await listActiveRestoreJobs();
    if (jobs.length === 0) break;

    let progressed = false;
    for (const job of jobs) {
      const result = await runRestoreJobStep(job.id);
      if (result.busy) {
        busy += 1;
        continue;
      }
      progressed = true;
      steps += 1;
      if (result.job.status === "completed") completed += 1;
      if (result.job.status === "failed") failed += 1;
      if (Date.now() - started >= maxMs || steps >= maxSteps) break;
      break;
    }
    if (!progressed) break;
  }

  try {
    effects += await applyPendingRestoreEffects();
  } catch (err) {
    console.error("[backup-restore] sapu efek pending gagal:", err);
  }

  return { steps, completed, failed, busy, effects };
}
