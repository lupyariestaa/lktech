import "server-only";
import type { Firestore } from "firebase-admin/firestore";

/** Aksi yang tercatat di audit trail media. */
export const MEDIA_AUDIT_ACTIONS = [
  "upload",
  "update",
  "trash",
  "restore",
  "delete",
  "scan",
  "bulk",
] as const;
export type MediaAuditAction = (typeof MEDIA_AUDIT_ACTIONS)[number];

/** Satu entri audit trail. */
export type MediaAuditEntry = {
  id: string;
  action: MediaAuditAction;
  mediaId: string;
  publicId: string;
  actor: string;
  atISO: string;
  /** Ringkasan perubahan / konteks (mis. daftar field yang diubah). */
  meta?: Record<string, unknown>;
};

const COLLECTION = "media_audit";

/**
 * Catat satu aksi ke audit trail. Bersifat "best-effort": kegagalan menulis
 * audit TIDAK boleh menggagalkan aksi utama, jadi error ditelan (di-log).
 */
export async function recordMediaAudit(
  db: Firestore,
  entry: {
    action: MediaAuditAction;
    mediaId?: string;
    publicId?: string;
    actor: string;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await db.collection(COLLECTION).add({
      action: entry.action,
      mediaId: entry.mediaId ?? "",
      publicId: entry.publicId ?? "",
      actor: entry.actor,
      atISO: new Date().toISOString(),
      meta: entry.meta ?? {},
    });
  } catch (err) {
    console.error("[media-audit] gagal mencatat audit:", err);
  }
}

/** Ambil riwayat audit untuk satu aset media (terbaru dulu). */
export async function getMediaAudit(
  db: Firestore,
  mediaId: string,
  limit = 50,
): Promise<MediaAuditEntry[]> {
  try {
    const snap = await db
      .collection(COLLECTION)
      .where("mediaId", "==", mediaId)
      .get();
    return snap.docs
      .map((doc) => {
        const d = doc.data() as Record<string, unknown>;
        return {
          id: doc.id,
          action: (d.action as MediaAuditAction) ?? "update",
          mediaId: typeof d.mediaId === "string" ? d.mediaId : "",
          publicId: typeof d.publicId === "string" ? d.publicId : "",
          actor: typeof d.actor === "string" ? d.actor : "",
          atISO: typeof d.atISO === "string" ? d.atISO : "",
          meta:
            d.meta && typeof d.meta === "object"
              ? (d.meta as Record<string, unknown>)
              : {},
        } satisfies MediaAuditEntry;
      })
      .sort((a, b) => b.atISO.localeCompare(a.atISO))
      .slice(0, limit);
  } catch (err) {
    console.error("[media-audit] gagal memuat audit:", err);
    return [];
  }
}
