import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import type { SeoAuditReport } from "@/lib/seo-audit-pure";

/**
 * PENYIMPANAN HASIL AUDIT SEO (fase D4).
 *
 * Koleksi `seo_audits/{id}`: satu dokumen per run, berisi laporan lengkap
 * (bounded oleh `maxUrls`), `ruleVersion`, waktu, dan pelaku. Retensi dijaga
 * (hanya N run terakhir disimpan) agar penyimpanan tetap minimal.
 *
 * Best-effort: kegagalan menyimpan tidak boleh menggagalkan respons audit.
 */

const COLLECTION = "seo_audits";
/** Jumlah run terakhir yang disimpan (sisanya dihapus). */
export const SEO_AUDIT_RETENTION = 10;

export type StoredSeoAudit = {
  id: string;
  createdAt: string;
  ruleVersion: string;
  actor: string;
  report: SeoAuditReport;
};

/** Simpan satu hasil audit + jaga retensi. Best-effort. */
export async function saveSeoAudit(
  report: SeoAuditReport,
  actor: string,
): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  try {
    const createdAt = report.finishedAt || new Date().toISOString();
    await db.collection(COLLECTION).add({
      createdAt,
      ruleVersion: report.ruleVersion,
      actor: actor.slice(0, 200),
      origin: report.origin,
      summary: report.summary,
      report,
    });
    await pruneOldAudits();
  } catch (err) {
    console.error("[seo-audit-store] gagal menyimpan hasil audit:", err);
  }
}

/** Hapus run lama di luar retensi. Best-effort. */
async function pruneOldAudits(): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  try {
    const snap = await db
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(SEO_AUDIT_RETENTION + 20)
      .get();
    const stale = snap.docs.slice(SEO_AUDIT_RETENTION);
    if (stale.length === 0) return;
    const batch = db.batch();
    for (const doc of stale) batch.delete(doc.ref);
    await batch.commit();
  } catch (err) {
    console.warn("[seo-audit-store] gagal memangkas hasil audit lama:", err);
  }
}

/** Ambil hasil audit terakhir (atau `null` bila belum ada). */
export async function getLatestSeoAudit(): Promise<StoredSeoAudit | null> {
  const db = getAdminDb();
  if (!db) return null;
  try {
    const snap = await db
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();
    const doc = snap.docs[0];
    if (!doc) return null;
    const data = doc.data() as Record<string, unknown>;
    const report = data.report as SeoAuditReport | undefined;
    if (!report || typeof report !== "object") return null;
    return {
      id: doc.id,
      createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
      ruleVersion:
        typeof data.ruleVersion === "string" ? data.ruleVersion : report.ruleVersion,
      actor: typeof data.actor === "string" ? data.actor : "",
      report,
    };
  } catch (err) {
    console.warn("[seo-audit-store] gagal memuat hasil audit terakhir:", err);
    return null;
  }
}
