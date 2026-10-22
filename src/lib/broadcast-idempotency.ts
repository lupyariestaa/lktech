import "server-only";
import { createHash } from "node:crypto";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  broadcastRequestFingerprint,
  normalizeBroadcastIdempotencyKey,
  type BroadcastFingerprintInput,
} from "@/lib/broadcast-idempotency-pure";

/**
 * IDEMPOTENCY BROADCAST (ADM-07).
 *
 * Satu `(uid, key)` hanya boleh menghasilkan satu pengiriman. Reservation
 * dibuat SEBELUM email dikirim:
 * - `processing` → request lain dengan key sama ditolak (409), bukan dikirim lagi.
 * - `completed`  → hasil tersimpan dikembalikan apa adanya (replay).
 * - `indeterminate` → pengiriman mulai tetapi hasil tidak diketahui (mis. proses
 *   terputus). Key yang sama TIDAK boleh dipakai ulang otomatis.
 *
 * Koleksi `broadcast_requests/{sha256(uid:key)}` menyimpan hash key (bukan key
 * mentah), fingerprint konten non-sensitif, status, dan ringkasan hasil.
 */

const COLLECTION = "broadcast_requests";
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export type BroadcastStoredResult = {
  ok: boolean;
  sent: number;
  failed: number;
  recipients: number;
  truncated?: boolean;
};

export type BeginBroadcastRequestResult =
  | { state: "new"; docId: string }
  | { state: "completed"; result: BroadcastStoredResult }
  | { state: "processing" }
  | { state: "indeterminate" }
  | { state: "conflict" }
  | { state: "invalid_key" }
  | { state: "unavailable" };

function docIdFor(uid: string, key: string): string {
  return createHash("sha256").update(`${uid}\0${key}`).digest("hex");
}

function keyHashFor(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function parseStoredResult(v: unknown): BroadcastStoredResult | null {
  if (!v || typeof v !== "object") return null;
  const d = v as Record<string, unknown>;
  if (
    typeof d.sent !== "number" ||
    typeof d.failed !== "number" ||
    typeof d.recipients !== "number"
  ) {
    return null;
  }
  return {
    ok: d.ok !== false,
    sent: d.sent,
    failed: d.failed,
    recipients: d.recipients,
    ...(d.truncated === true ? { truncated: true } : {}),
  };
}

/**
 * Reservasi idempotency. Harus dipanggil sebelum email dikirim.
 *
 * Bila Admin SDK tidak tersedia, caller WAJIB menolak pengiriman: tanpa
 * penyimpanan reservation, jaminan idempotency tidak bisa diberikan.
 */
export async function beginBroadcastRequest(input: {
  uid: string;
  key: string;
  actor: string;
  draft: BroadcastFingerprintInput;
}): Promise<BeginBroadcastRequestResult> {
  const db = getAdminDb();
  if (!db) return { state: "unavailable" };

  const key = normalizeBroadcastIdempotencyKey(input.key);
  if (!key) return { state: "invalid_key" };

  const docId = docIdFor(input.uid, key);
  const fingerprint = broadcastRequestFingerprint(input.draft);
  const ref = db.collection(COLLECTION).doc(docId);
  const now = new Date();
  const nowISO = now.toISOString();

  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        const d = snap.data() as Record<string, unknown>;
        if (d.fingerprint !== fingerprint) {
          return { state: "conflict" } as const;
        }
        if (d.status === "completed") {
          const result = parseStoredResult(d.result);
          return result
            ? ({ state: "completed", result } as const)
            : ({ state: "indeterminate" } as const);
        }
        if (d.status === "indeterminate") {
          return { state: "indeterminate" } as const;
        }
        return { state: "processing" } as const;
      }

      tx.set(ref, {
        keyHash: keyHashFor(key),
        actor: input.actor,
        fingerprint,
        status: "processing",
        createdAtISO: nowISO,
        updatedAtISO: nowISO,
        expiresAtISO: new Date(now.getTime() + RETENTION_MS).toISOString(),
      });
      return { state: "new", docId } as const;
    });
  } catch (err) {
    console.error("[broadcast-idempotency] gagal reservasi:", err);
    return { state: "unavailable" };
  }
}

/** Tandai pengiriman selesai dan simpan hasil untuk replay. */
export async function completeBroadcastRequest(
  docId: string,
  result: BroadcastStoredResult,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  const nowISO = new Date().toISOString();
  await db.collection(COLLECTION).doc(docId).set(
    {
      status: "completed",
      result,
      completedAtISO: nowISO,
      updatedAtISO: nowISO,
    },
    { merge: true },
  );
}

/**
 * Pengiriman sudah dimulai tetapi hasil akhirnya tidak diketahui (mis. error
 * tak terduga setelah sebagian email terkirim). Key yang sama tidak boleh
 * dipakai ulang agar tidak ada duplikasi.
 */
export async function markBroadcastRequestIndeterminate(
  docId: string,
): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  const nowISO = new Date().toISOString();
  await db.collection(COLLECTION).doc(docId).set(
    {
      status: "indeterminate",
      updatedAtISO: nowISO,
    },
    { merge: true },
  );
}

/**
 * Lepaskan reservation HANYA bila belum ada email yang dicoba dikirim
 * (mis. segmen kosong atau provider belum dikonfigurasi).
 */
export async function releaseBroadcastRequest(docId: string): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await db.collection(COLLECTION).doc(docId).delete();
}
