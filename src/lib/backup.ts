import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { SETTINGS_DOC_ID } from "@/lib/settings";
import {
  BACKUP_SOURCES,
  BACKUP_VERSION,
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

/** Ambil dokumen satu koleksi (dengan id) — batasi jumlah. */
async function readCollection(name: string): Promise<Row[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection(name).limit(EXPORT_CAP).get();
  return snap.docs.map((doc) => ({ _id: doc.id, ...(doc.data() as Record<string, unknown>) }));
}

/** Ekspor backup untuk sumber terpilih. */
export async function exportBackup(
  sources: BackupSource[],
  by: string,
): Promise<BackupBundle> {
  const db = getAdminDb();
  const data: BackupBundle["data"] = {};
  const valid = sources.filter((s) => (BACKUP_SOURCES as readonly string[]).includes(s));

  for (const source of valid) {
    if (source === "settings") {
      const snap = db ? await db.collection("settings").doc(SETTINGS_DOC_ID).get() : null;
      data.settings = snap && snap.exists ? [{ _id: SETTINGS_DOC_ID, ...snap.data() }] : [];
    } else if (source === "content") {
      // Koleksi `content` (dokumen tunggal per-key).
      data.content = await readCollection("content");
    } else if (COLLECTION_SOURCES.includes(source)) {
      data[source] = await readCollection(source);
    }
  }

  return {
    meta: {
      version: BACKUP_VERSION,
      createdAtISO: new Date().toISOString(),
      by,
      sources: valid,
    },
    data,
  };
}

export type ImportResult = {
  total: number;
  written: number;
  failed: number;
  perSource: Array<{ source: BackupSource; count: number }>;
};

/**
 * Impor bundle backup: tulis dokumen per-sumber (merge). Best-effort.
 * `settings` ditulis ke dokumen tunggal; lain-lain per-dokumen `_id`.
 */
export async function importBackup(bundle: BackupBundle): Promise<ImportResult> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");

  let total = 0;
  let written = 0;
  let failed = 0;
  const perSource: ImportResult["perSource"] = [];

  for (const [source, rows] of Object.entries(bundle.data) as Array<[BackupSource, Row[]]>) {
    if (!Array.isArray(rows)) continue;
    perSource.push({ source, count: rows.length });
    total += rows.length;

    for (const row of rows) {
      const { _id, ...rest } = row;
      if (!_id) {
        failed += 1;
        continue;
      }
      try {
        if (source === "settings") {
          await db.collection("settings").doc(_id).set(rest, { merge: true });
        } else {
          await db.collection(source).doc(_id).set(rest, { merge: true });
        }
        written += 1;
      } catch {
        failed += 1;
      }
    }
  }

  return { total, written, failed, perSource };
}
