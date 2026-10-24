/**
 * Logika murni untuk RESTORE SNAPSHOT (ADM-12).
 *
 * Snapshot pre-restore disimpan sebagai manifest + chunk. Modul ini memvalidasi
 * manifest dan menghitung progres job tanpa menyentuh Firestore, sehingga bisa
 * diuji dengan `node --test`.
 */
import type { BackupSource } from "@/lib/backup-pure";

/**
 * Salinan urutan sumber milik `backup-pure` agar modul ini tetap bisa diimpor
 * langsung oleh `node --test` (tanpa resolver alias Next). Regresi kesamaan
 * urutan dijaga oleh `scripts/backup-restore.test.ts`.
 */
const BACKUP_SOURCES: readonly BackupSource[] = [
  "settings",
  "admins",
  "products",
  "coupons",
  "orders",
  "projects",
  "articles",
  "content",
  "users",
  "subscribers",
  "reviews",
] as const;

const VALID_SOURCES = new Set<string>(BACKUP_SOURCES);

/** ID dokumen snapshot hanya boleh memakai karakter aman (tanpa `/`). */
export const SNAPSHOT_STAMP_PATTERN = /^[A-Za-z0-9._-]{1,120}$/;

/** ID job restore dibuat server (`crypto.randomUUID()`). */
export const RESTORE_JOB_ID_PATTERN = /^[a-f0-9-]{36}$/;

export type SnapshotSourceEntry = {
  rows: number;
  chunks: number;
  failedChunks?: number;
  /** `true` bila sumber dipotong karena melewati batas baca snapshot. */
  truncated?: boolean;
};

export type SnapshotManifest = {
  stamp: string;
  createdAtISO: string;
  sources: Partial<Record<BackupSource, SnapshotSourceEntry>>;
};

export type SnapshotSummary = {
  stamp: string;
  createdAtISO: string;
  rows: number;
  chunks: number;
  truncated: boolean;
  incompleteReason: string | null;
  sources: Array<{
    source: BackupSource;
    rows: number;
    chunks: number;
    failedChunks: number;
    truncated: boolean;
  }>;
};

export type SnapshotParseResult =
  | { ok: true; manifest: SnapshotManifest }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonNegativeInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

/**
 * Validasi bentuk manifest. Manifest yang `failedChunks > 0` tetap bisa
 * ditampilkan sebagai "tidak lengkap", tetapi tidak boleh direstore.
 */
export function parseSnapshotManifest(
  input: unknown,
  expectedStamp?: string,
): SnapshotParseResult {
  if (!isRecord(input)) {
    return { ok: false, error: "Manifest snapshot tidak valid." };
  }
  if (input.manifest !== true) {
    return { ok: false, error: "Dokumen ini bukan manifest snapshot." };
  }

  const stamp = typeof input.stamp === "string" ? input.stamp.trim() : "";
  if (!SNAPSHOT_STAMP_PATTERN.test(stamp)) {
    return { ok: false, error: "ID snapshot tidak valid." };
  }
  if (expectedStamp && stamp !== expectedStamp) {
    return { ok: false, error: "ID snapshot tidak cocok dengan dokumen." };
  }

  const createdAtISO =
    typeof input.createdAtISO === "string" ? input.createdAtISO : "";
  if (!createdAtISO || Number.isNaN(Date.parse(createdAtISO))) {
    return { ok: false, error: "Waktu snapshot tidak valid." };
  }

  if (!isRecord(input.sources)) {
    return { ok: false, error: "Daftar sumber snapshot tidak valid." };
  }

  const sources: SnapshotManifest["sources"] = {};
  for (const [source, rawEntry] of Object.entries(input.sources)) {
    if (!VALID_SOURCES.has(source)) {
      return { ok: false, error: `Sumber snapshot tidak dikenal: ${source}.` };
    }
    if (!isRecord(rawEntry)) {
      return { ok: false, error: `Metadata sumber "${source}" tidak valid.` };
    }

    const rows = nonNegativeInt(rawEntry.rows);
    const chunks = nonNegativeInt(rawEntry.chunks);
    if (rows === null || chunks === null) {
      return { ok: false, error: `Jumlah baris/chunk "${source}" tidak valid.` };
    }

    const failedRaw = rawEntry.failedChunks;
    const failedChunks =
      failedRaw === undefined ? 0 : nonNegativeInt(failedRaw);
    if (failedChunks === null) {
      return { ok: false, error: `Jumlah chunk gagal "${source}" tidak valid.` };
    }

    sources[source as BackupSource] = {
      rows,
      chunks,
      ...(failedChunks > 0 ? { failedChunks } : {}),
      ...(rawEntry.truncated === true ? { truncated: true } : {}),
    };
  }

  return {
    ok: true,
    manifest: { stamp, createdAtISO, sources },
  };
}

/** Sumber yang benar-benar memiliki chunk untuk direstore, urut seperti UI. */
export function snapshotRestoreSources(
  manifest: SnapshotManifest,
): BackupSource[] {
  return BACKUP_SOURCES.filter((source) => {
    const entry = manifest.sources[source];
    return entry !== undefined && entry.chunks > 0;
  });
}

/** Total baris/chunk untuk job. */
export function snapshotRestoreTotals(manifest: SnapshotManifest): {
  sources: BackupSource[];
  chunkCounts: number[];
  totalRows: number;
  totalChunks: number;
} {
  const sources = snapshotRestoreSources(manifest);
  const chunkCounts = sources.map(
    (source) => manifest.sources[source]?.chunks ?? 0,
  );
  return {
    sources,
    chunkCounts,
    totalRows: sources.reduce(
      (sum, source) => sum + (manifest.sources[source]?.rows ?? 0),
      0,
    ),
    totalChunks: chunkCounts.reduce((sum, n) => sum + n, 0),
  };
}

/** Alasan snapshot tidak boleh direstore, atau `null` bila lengkap. */
export function snapshotIncompleteReason(
  manifest: SnapshotManifest,
): string | null {
  for (const source of Object.keys(manifest.sources) as BackupSource[]) {
    const entry = manifest.sources[source];
    if (!entry) continue;
    if ((entry.failedChunks ?? 0) > 0) {
      return `Snapshot "${source}" tidak lengkap (${entry.failedChunks} chunk gagal).`;
    }
    if (entry.rows > 0 && entry.chunks === 0) {
      return `Snapshot "${source}" tidak memiliki chunk data.`;
    }
  }
  if (snapshotRestoreSources(manifest).length === 0) {
    return "Snapshot tidak berisi data untuk direstore.";
  }
  return null;
}

/** Ringkasan untuk daftar snapshot di UI (tanpa isi baris). */
export function summarizeSnapshot(manifest: SnapshotManifest): SnapshotSummary {
  const sources = snapshotRestoreSources(manifest);
  return {
    stamp: manifest.stamp,
    createdAtISO: manifest.createdAtISO,
    rows: sources.reduce(
      (sum, source) => sum + (manifest.sources[source]?.rows ?? 0),
      0,
    ),
    chunks: sources.reduce(
      (sum, source) => sum + (manifest.sources[source]?.chunks ?? 0),
      0,
    ),
    truncated: sources.some((source) => manifest.sources[source]?.truncated),
    incompleteReason: snapshotIncompleteReason(manifest),
    sources: sources.map((source) => {
      const entry = manifest.sources[source]!;
      return {
        source,
        rows: entry.rows,
        chunks: entry.chunks,
        failedChunks: entry.failedChunks ?? 0,
        truncated: entry.truncated === true,
      };
    }),
  };
}

export type RestoreJobStatus = "queued" | "running" | "completed" | "failed";
export type RestoreJobPhase = "snapshot" | "restore";

/**
 * Job restore disimpan di Firestore. Semua field berupa nilai JSON sederhana
 * agar aman dikirim ke klien; isi snapshot TIDAK pernah masuk job.
 */
export type BackupRestoreJob = {
  id: string;
  stamp: string;
  requestedBy: string;
  status: RestoreJobStatus;
  phase: RestoreJobPhase;
  preSnapshotStamp: string;
  restoreSources: BackupSource[];
  chunkCounts: number[];
  snapshotSources: BackupSource[];
  sourceIndex: number;
  chunkIndex: number;
  processedUnits: number;
  totalUnits: number;
  written: number;
  failed: number;
  skipped: number;
  truncated: boolean;
  totalRows: number;
  createdAtISO: string;
  updatedAtISO: string;
  completedAtISO?: string;
  error?: string;
  lockUntilISO?: string;
  effectsApplied?: boolean;
};

export function isRestoreTerminal(status: RestoreJobStatus): boolean {
  return status === "completed" || status === "failed";
}

/** Persentase progres 0–100 (dibulatkan ke bawah). */
export function restoreJobProgress(job: BackupRestoreJob): number {
  if (job.status === "completed") return 100;
  if (job.totalUnits <= 0) return 0;
  const done = Math.max(0, Math.min(job.processedUnits, job.totalUnits));
  return Math.floor((done / job.totalUnits) * 100);
}
