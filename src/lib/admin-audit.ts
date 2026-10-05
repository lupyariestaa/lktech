import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import type { AdminAuditAction, AdminAuditEntry } from "@/lib/admin-audit-types";

/**
 * AUDIT LOG ADMIN GLOBAL (Tema 4.1) — data layer (server-only).
 *
 * Mencatat aksi admin penting ke koleksi `admin_audit/{id}`.
 * Tipe & label tampilan ada di `@/lib/admin-audit-types` (aman-klien).
 *
 * Prinsip:
 * - **Best-effort**: kegagalan mencatat audit TIDAK boleh menggagalkan aksi utama.
 * - **Tanpa data sensitif**: hanya id/aktor/aksi/ringkasan (tanpa isi rahasia).
 * - Aman tanpa Admin SDK → no-op.
 */

// Re-export agar konsumen server cukup impor dari sini.
export {
  ADMIN_AUDIT_ACTIONS,
  ADMIN_AUDIT_ACTION_LABEL,
} from "@/lib/admin-audit-types";
export type { AdminAuditAction, AdminAuditEntry } from "@/lib/admin-audit-types";

const COLLECTION = "admin_audit";

/**
 * Catat satu aksi admin (best-effort). `target` = penanda ringkas objek
 * (kode order, slug, email). `meta` = info tambahan non-sensitif.
 */
export async function recordAdminAudit(entry: {
  action: AdminAuditAction;
  actor: string;
  target?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  try {
    await db.collection(COLLECTION).add({
      action: entry.action,
      actor: entry.actor,
      target: entry.target ?? "",
      meta: entry.meta ?? {},
      atISO: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[admin-audit] gagal mencatat audit:", err);
  }
}

/** Filter daftar audit. */
export type AdminAuditQuery = {
  action?: string;
  actor?: string;
  /** Kata kunci pada target. */
  q?: string;
  limit?: number;
};

/** Ambil daftar audit (admin), terbaru lebih dulu, dengan filter di memori. */
export async function listAdminAudit(
  query: AdminAuditQuery = {},
): Promise<AdminAuditEntry[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection(COLLECTION).limit(1000).get();
  let items = snap.docs
    .map((doc) => {
      const d = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        action: typeof d.action === "string" ? d.action : "",
        actor: typeof d.actor === "string" ? d.actor : "",
        target: typeof d.target === "string" ? d.target : "",
        meta:
          d.meta && typeof d.meta === "object"
            ? (d.meta as Record<string, unknown>)
            : {},
        atISO: typeof d.atISO === "string" ? d.atISO : "",
      } satisfies AdminAuditEntry;
    })
    .sort((a, b) => b.atISO.localeCompare(a.atISO));

  if (query.action && query.action !== "semua") {
    items = items.filter((e) => e.action === query.action);
  }
  if (query.actor) {
    const a = query.actor.toLowerCase();
    items = items.filter((e) => e.actor.toLowerCase().includes(a));
  }
  if (query.q) {
    const q = query.q.toLowerCase();
    items = items.filter(
      (e) =>
        e.target.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q),
    );
  }
  return items.slice(0, query.limit ?? 200);
}

/** Ringkasan singkat (jumlah entri). */
export async function getAdminAuditCount(): Promise<number> {
  const db = getAdminDb();
  if (!db) return 0;
  try {
    const snap = await db.collection(COLLECTION).count().get();
    return snap.data().count;
  } catch {
    return 0;
  }
}
