import {
  checkOptimisticVersion,
  newVersionToken,
  VersionConflictError,
} from "@/lib/optimistic-lock-pure";

/**
 * Penulisan dokumen dengan OPTIMISTIC CONCURRENCY (ADM-11).
 *
 * Dalam SATU transaksi Firestore: baca dokumen → bandingkan field `version`
 * dengan `expectedVersion` dari klien → tulis payload + `version` baru. Bila
 * tak cocok, lempar `VersionConflictError` (route memetakan ke 409). Transaksi
 * menjamin tidak ada *lost update* meski dua admin menyimpan hampir bersamaan.
 *
 * `expectedVersion` kosong/absen → tanpa pemeriksaan (kompatibel mundur).
 *
 * Firestore dibungkus `import()` dinamis (pola sama seperti lib data lain) agar
 * modul ini tidak menarik `firebase-admin` ke bundel klien.
 */
export async function writeVersioned(params: {
  collection: string;
  docId: string;
  data: Record<string, unknown>;
  expectedVersion?: unknown;
  /** `false` = set penuh (timpa); default `true` = merge. */
  merge?: boolean;
}): Promise<string> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");

  const ref = db.collection(params.collection).doc(params.docId);
  const version = newVersionToken();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? snap.get("version") : null;

    const check = checkOptimisticVersion(current, params.expectedVersion);
    if (!check.ok) throw new VersionConflictError(check.conflict.current);

    const payload = { ...params.data, version };
    if (params.merge === false) {
      tx.set(ref, payload);
    } else {
      tx.set(ref, payload, { merge: true });
    }
    return version;
  });
}
