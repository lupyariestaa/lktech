import "server-only";
import { randomUUID } from "node:crypto";
import { getAdminDb } from "@/lib/firebase-admin";
import { SETTINGS_DOC_ID } from "@/lib/settings";
import { getOwnerEmails } from "@/lib/admins";
import {
  BACKUP_SOURCES,
  BACKUP_VERSION,
  chunkSnapshotRows,
  planImport,
  type BackupBundle,
  type BackupSource,
  type ImportPlan,
  type ImportPolicy,
} from "@/lib/backup-pure";

/**
 * Ekspor/impor BACKUP (fase S7). Server-only.
 *
 * - Ekspor: baca dokumen per-sumber (batas aman) → bundle JSON.
 * - Impor: tulis per-dokumen (batch ≤500) — best-effort, dilaporkan.
 * Secret (env/API key) TIDAK pernah diekspor.
 */

/** Koleksi sumber yang dipetakan 1:1 (persamaan nama). */
const COLLECTION_SOURCES: BackupSource[] = [
  "products",
  "coupons",
  "orders",
  "projects",
  "articles",
  "users",
  "subscribers",
  "reviews",
  "admins",
];

/** Batas dokumen per sumber saat ekspor (anti-overload). */
const EXPORT_CAP = 5000;

/** Batas operasi per WriteBatch saat impor (Firestore maks 500). */
const IMPORT_BATCH_SIZE = 400;

const SNAPSHOT_COLLECTION = "_backup_snapshots";

type Row = { _id: string; [k: string]: unknown };

/** Ambil dokumen satu koleksi (dengan id) — batasi jumlah.
 *  Ambil `EXPORT_CAP + 1` untuk mendeteksi pemotongan (G4). */
async function readCollection(
  name: string,
  cappedSources: BackupSource[],
  source: BackupSource,
): Promise<Row[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db
    .collection(name)
    .limit(EXPORT_CAP + 1)
    .get();
  let docs = snap.docs;
  if (docs.length > EXPORT_CAP) {
    cappedSources.push(source);
    docs = docs.slice(0, EXPORT_CAP);
  }
  return docs.map((doc) => ({ _id: doc.id, ...(doc.data() as Record<string, unknown>) }));
}

/** Ekspor backup untuk sumber terpilih. */
export async function exportBackup(
  sources: BackupSource[],
  by: string,
): Promise<BackupBundle> {
  const db = getAdminDb();
  const data: BackupBundle["data"] = {};
  const valid = sources.filter((s) => (BACKUP_SOURCES as readonly string[]).includes(s));
  const truncatedSources: BackupSource[] = [];

  for (const source of valid) {
    if (source === "settings") {
      const snap = db ? await db.collection("settings").doc(SETTINGS_DOC_ID).get() : null;
      data.settings = snap && snap.exists ? [{ _id: SETTINGS_DOC_ID, ...snap.data() }] : [];
    } else if (source === "content") {
      // Koleksi `content` (dokumen tunggal per-key).
      data.content = await readCollection("content", truncatedSources, source);
    } else if (COLLECTION_SOURCES.includes(source)) {
      data[source] = await readCollection(source, truncatedSources, source);
    }
  }

  return {
    meta: {
      version: BACKUP_VERSION,
      createdAtISO: new Date().toISOString(),
      by,
      sources: valid,
      ...(truncatedSources.length > 0
        ? { truncated: true, truncatedSources }
        : {}),
    },
    data,
  };
}

export type ImportResult = {
  total: number;
  written: number;
  failed: number;
  skipped: number;
  truncated: boolean;
  perSource: Array<{ source: BackupSource; count: number }>;
};

export type BackupWriteResult = { written: number; failed: number };

/**
 * Tulis operasi impor per batch (ADM-12). Fallback per-dokumen bila batch
 * gagal agar baris lain tetap tersimpan dan hasil parsial terukur.
 */
export async function writeBackupOperations(
  operations: ImportPlan["operations"],
): Promise<BackupWriteResult> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");

  let written = 0;
  let failed = 0;

  for (let i = 0; i < operations.length; i += IMPORT_BATCH_SIZE) {
    const chunk = operations.slice(i, i + IMPORT_BATCH_SIZE);
    const batch = db.batch();
    for (const op of chunk) {
      batch.set(db.collection(op.source).doc(op.id), op.data, { merge: true });
    }
    try {
      await batch.commit();
      written += chunk.length;
    } catch (batchErr) {
      console.warn(
        "[backup] batch impor gagal, fallback per-dokumen:",
        batchErr,
      );
      for (const op of chunk) {
        try {
          await db
            .collection(op.source)
            .doc(op.id)
            .set(op.data, { merge: true });
          written += 1;
        } catch {
          failed += 1;
        }
      }
    }
  }

  return { written, failed };
}

export type DryRunResult = {
  total: number;
  willWrite: number;
  skipped: number;
  truncated: boolean;
  perSource: Array<{ source: BackupSource; total: number; accepted: number; skipped: number }>;
};

/**
 * Dry-run impor: hitung apa yang AKAN ditulis tanpa mengubah apa pun (G4).
 * Menerapkan sanitasi & batas yang sama dengan impor nyata.
 */
export function dryRunImport(
  bundle: BackupBundle,
  policy: ImportPolicy,
): DryRunResult {
  const plan = planImport(bundle, getOwnerEmails(), policy);
  return {
    total: plan.perSource.reduce((sum, p) => sum + p.total, 0),
    willWrite: plan.operations.length,
    skipped: plan.skipped,
    truncated: plan.truncated,
    perSource: plan.perSource,
  };
}

/** Metadata satu sumber di manifest snapshot. */
export type SnapshotSourceEntry = {
  rows: number;
  chunks: number;
  failedChunks?: number;
  truncated?: boolean;
};

/**
 * Buat/pertahankan manifest kosong. Dipanggil sebelum chunk pertama agar job
 * restore dapat menulis progres per sumber (ADM-12).
 */
async function ensureSnapshotManifest(
  stamp: string,
  createdAtISO: string,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  await db
    .collection(SNAPSHOT_COLLECTION)
    .doc(stamp)
    .set(
      {
        stamp,
        manifest: true,
        createdAtISO,
        sources: {},
      },
      { merge: true },
    );
}

/**
 * Snapshot SATU koleksi ke chunk + kembalikan metadata sumber.
 *
 * Best-effort per chunk: kegagalan ditandai `failedChunks`, bukan
 * menggagalkan seluruh job. `truncated` menandai sumber yang lebih besar dari
 * `EXPORT_CAP` (belum ada pagination penuh; lihat catatan ADM-12).
 */
export async function snapshotOneSource(
  name: BackupSource,
  stamp: string,
  createdAtISO: string,
): Promise<SnapshotSourceEntry> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");

  const cappedSources: BackupSource[] = [];
  let rows: Row[];
  if (name === "settings") {
    // Settings adalah satu dokumen (`settings/site`), bukan koleksi penuh.
    const doc = await db.collection("settings").doc(SETTINGS_DOC_ID).get();
    rows = doc.exists
      ? [{ _id: SETTINGS_DOC_ID, ...(doc.data() as Record<string, unknown>) }]
      : [];
  } else {
    rows = await readCollection(name, cappedSources, name);
  }
  const chunks = chunkSnapshotRows(rows);
  const entry: SnapshotSourceEntry = {
    rows: rows.length,
    chunks: chunks.length,
    ...(cappedSources.includes(name) ? { truncated: true } : {}),
  };

  for (let i = 0; i < chunks.length; i += 1) {
    try {
      await db
        .collection(SNAPSHOT_COLLECTION)
        .doc(`${stamp}__${name}__${i}`)
        .set({
          stamp,
          source: name,
          chunk: i,
          rows: chunks[i],
          createdAtISO,
        });
    } catch (err) {
      entry.failedChunks = (entry.failedChunks ?? 0) + 1;
      console.error(`[backup] snapshot "${name}" chunk ${i} gagal:`, err);
    }
  }

  return entry;
}

/** Simpan metadata satu sumber ke manifest (merge, tidak menghapus sumber lain). */
export async function recordSnapshotSource(
  stamp: string,
  source: BackupSource,
  entry: SnapshotSourceEntry,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  await db
    .collection(SNAPSHOT_COLLECTION)
    .doc(stamp)
    .set({ sources: { [source]: entry } }, { merge: true });
}

/**
 * Snapshot koleksi sebelum impor (ADM-12).
 *
 * Setiap sumber dipecah menjadi chunk dokumen terpisah + manifest:
 * `_backup_snapshots/{stamp}` (manifest)
 * `_backup_snapshots/{stamp}__{source}__{n}` (rows).
 *
 * Best-effort: kegagalan snapshot tidak menggagalkan restore, tetapi dicatat
 * di manifest/log agar terlihat (bukan senyap).
 */
async function snapshotCollections(
  sources: string[],
  stamp: string,
): Promise<void> {
  const createdAtISO = new Date().toISOString();
  try {
    await ensureSnapshotManifest(stamp, createdAtISO);
  } catch (err) {
    console.error("[backup] manifest snapshot gagal dibuat:", err);
  }

  for (const name of sources) {
    let entry: SnapshotSourceEntry = { rows: 0, chunks: 0 };
    try {
      entry = await snapshotOneSource(
        name as BackupSource,
        stamp,
        createdAtISO,
      );
    } catch (err) {
      entry.failedChunks = (entry.failedChunks ?? 0) + 1;
      console.error(`[backup] snapshot "${name}" gagal:`, err);
    }
    try {
      await recordSnapshotSource(stamp, name as BackupSource, entry);
    } catch (err) {
      console.error(`[backup] metadata snapshot "${name}" gagal:`, err);
    }
  }
}

/** Baca dokumen manifest mentah (validasi bentuk dilakukan modul murni). */
export async function readSnapshotManifestData(
  stamp: string,
): Promise<Record<string, unknown> | null> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  const doc = await db.collection(SNAPSHOT_COLLECTION).doc(stamp).get();
  return doc.exists ? (doc.data() as Record<string, unknown>) : null;
}

/**
 * Daftar manifest terbaru. Query hanya field `manifest` (index otomatis),
 * lalu urutkan di memori agar tidak memerlukan composite index.
 */
export async function listSnapshotManifestData(
  limit = 50,
): Promise<Array<Record<string, unknown>>> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  const snap = await db
    .collection(SNAPSHOT_COLLECTION)
    .where("manifest", "==", true)
    .limit(Math.max(1, Math.min(limit, 100)))
    .get();
  return snap.docs
    .map((doc) => doc.data() as Record<string, unknown>)
    .sort((a, b) => String(b.createdAtISO ?? "").localeCompare(String(a.createdAtISO ?? "")));
}

/** Baca satu chunk snapshot untuk restore bertahap. */
export async function readSnapshotChunk(
  stamp: string,
  source: BackupSource,
  chunk: number,
): Promise<unknown[]> {
  if (!Number.isInteger(chunk) || chunk < 0) {
    throw new Error("Nomor chunk snapshot tidak valid.");
  }
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  const doc = await db
    .collection(SNAPSHOT_COLLECTION)
    .doc(`${stamp}__${source}__${chunk}`)
    .get();
  if (!doc.exists) {
    throw new Error(`Chunk snapshot "${source}" #${chunk} tidak ditemukan.`);
  }
  const rows = doc.data()?.rows;
  if (!Array.isArray(rows)) {
    throw new Error(`Chunk snapshot "${source}" #${chunk} rusak.`);
  }
  return rows;
}

/**
 * Impor bundle backup (merge). Best-effort + aman.
 *
 * Keamanan (G2/G3/G4):
 * - Sanitasi per-baris (`planImport`): ADMIN **OWNER dilindungi** (tak ditulis),
 *   admin lain dipaksa `active:true`, `settings` dipaksa ke `SETTINGS_DOC_ID`.
 * - `admins` hanya ditulis bila `policy.allowAdmins` (route hanya mengizinkan OWNER).
 * - **Snapshot** koleksi yang akan ditimpa (koleksi `_backup_snapshots`) —
 *   memberi jalur "undo" bila restore salah.
 * - Batas total `IMPORT_CAP` baris; kelebihannya dibuang & ditandai `truncated`.
 */
export async function importBackup(
  bundle: BackupBundle,
  policy: ImportPolicy,
): Promise<ImportResult> {
  if (!getAdminDb()) throw new Error("Admin SDK tidak tersedia.");

  const plan = planImport(bundle, getOwnerEmails(), policy);
  const total = plan.perSource.reduce((sum, p) => sum + p.total, 0);

  // Snapshot koleksi target (termasuk settings/site) — best-effort.
  const targetCollections = Array.from(
    new Set(plan.operations.map((op) => op.source as string)),
  );
  const stamp = `pre-restore-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  if (targetCollections.length > 0) {
    await snapshotCollections(targetCollections, stamp);
  }

  const { written, failed } = await writeBackupOperations(plan.operations);

  return {
    total,
    written,
    failed,
    skipped: plan.skipped,
    truncated: plan.truncated,
    perSource: plan.perSource.map((p) => ({ source: p.source, count: p.total })),
  };
}
