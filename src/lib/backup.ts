import "server-only";
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

/**
 * Snapshot koleksi sebelum impor (ADM-12).
 *
 * Sebelumnya semua koleksi ditulis ke SATU dokumen `{ [name]: rows }`, yang
 * hampir pasti melewati batas 1 MiB Firestore untuk orders/users. Sekarang
 * setiap sumber dipecah menjadi chunk dokumen terpisah + manifest:
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
  const db = getAdminDb();
  if (!db) return;

  const createdAtISO = new Date().toISOString();
  const manifest: {
    stamp: string;
    manifest: true;
    createdAtISO: string;
    sources: Record<
      string,
      { rows: number; chunks: number; failedChunks?: number }
    >;
  } = {
    stamp,
    manifest: true,
    createdAtISO,
    sources: {},
  };

  for (const name of sources) {
    const entry: { rows: number; chunks: number; failedChunks?: number } = {
      rows: 0,
      chunks: 0,
    };
    try {
      const rows = await readCollection(name, [], name as BackupSource);
      const chunks = chunkSnapshotRows(rows);
      entry.rows = rows.length;
      entry.chunks = chunks.length;

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
          console.error(
            `[backup] snapshot "${name}" chunk ${i} gagal:`,
            err,
          );
        }
      }
    } catch (err) {
      entry.failedChunks = (entry.failedChunks ?? 0) + 1;
      console.error(`[backup] snapshot "${name}" gagal:`, err);
    }
    manifest.sources[name] = entry;
  }

  try {
    await db.collection(SNAPSHOT_COLLECTION).doc(stamp).set(manifest, {
      merge: true,
    });
  } catch (err) {
    console.error("[backup] manifest snapshot gagal ditulis:", err);
  }
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
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");

  const plan = planImport(bundle, getOwnerEmails(), policy);
  const total = plan.perSource.reduce((sum, p) => sum + p.total, 0);

  // Snapshot koleksi target (kecuali settings, satu dokumen) — best-effort.
  const targetCollections = Array.from(
    new Set(
      plan.operations
        .filter((op) => op.source !== "settings")
        .map((op) => op.source as string),
    ),
  );
  const stamp = `pre-restore-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  if (targetCollections.length > 0) {
    await snapshotCollections(targetCollections, stamp);
  }

  let written = 0;
  let failed = 0;

  // ADM-12: commit per N dokumen, bukan satu request per dokumen. Bila satu
  // batch gagal (mis. satu nilai tidak valid), fallback per-dokumen agar baris
  // lain tetap tersimpan dan hasil parsial tetap terukur.
  for (let i = 0; i < plan.operations.length; i += IMPORT_BATCH_SIZE) {
    const chunk = plan.operations.slice(i, i + IMPORT_BATCH_SIZE);
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

  return {
    total,
    written,
    failed,
    skipped: plan.skipped,
    truncated: plan.truncated,
    perSource: plan.perSource.map((p) => ({ source: p.source, count: p.total })),
  };
}
