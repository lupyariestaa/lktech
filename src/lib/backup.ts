import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { SETTINGS_DOC_ID } from "@/lib/settings";
import { getOwnerEmails } from "@/lib/admins";
import {
  BACKUP_SOURCES,
  BACKUP_VERSION,
  planImport,
  type BackupBundle,
  type BackupSource,
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
export function dryRunImport(bundle: BackupBundle): DryRunResult {
  const plan = planImport(bundle, getOwnerEmails());
  return {
    total: plan.perSource.reduce((sum, p) => sum + p.total, 0),
    willWrite: plan.operations.length,
    skipped: plan.skipped,
    truncated: plan.truncated,
    perSource: plan.perSource,
  };
}

/** Snapshot koleksi ke koleksi `_backup_snapshots/{stamp}` sebelum overwrite. */
async function snapshotCollections(
  sources: string[],
  stamp: string,
): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  for (const name of sources) {
    try {
      const rows = await readCollection(name, [], name as BackupSource);
      await db
        .collection("_backup_snapshots")
        .doc(stamp)
        .set({ [name]: rows }, { merge: true });
    } catch (err) {
      // Snapshot bersifat best-effort; jangan gagalkan restore karena ini.
      console.error(`[backup] snapshot "${name}" gagal:`, err);
    }
  }
}

/**
 * Impor bundle backup (merge). Best-effort + aman.
 *
 * Keamanan (G2/G3/G4):
 * - Sanitasi per-barid (`planImport`): ADMIN **OWNER dilindungi** (tak ditulis),
 *   admin lain dipaksa `active:true`, `settings` dipaksa ke `SETTINGS_DOC_ID`.
 * - **Snapshot** koleksi yang akan ditimpa (koleksi `_backup_snapshots`) —
 *   memberi jalur "undo" bila restore salah.
 * - Batas total `IMPORT_CAP` baris; kelebihannya dibuang & ditandai `truncated`.
 */
export async function importBackup(bundle: BackupBundle): Promise<ImportResult> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");

  const plan = planImport(bundle, getOwnerEmails());
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

  for (const op of plan.operations) {
    try {
      await db.collection(op.source).doc(op.id).set(op.data, { merge: true });
      written += 1;
    } catch {
      failed += 1;
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
