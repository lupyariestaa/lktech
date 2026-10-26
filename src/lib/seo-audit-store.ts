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
/** Jumlah dokumen yang diperiksa per putaran saat memangkas. */
const PRUNE_BATCH = 40;
/** Batas putaran agar pemangkasan tetap berhenti walau data sangat banyak. */
const PRUNE_MAX_ROUNDS = 50;

export type StoredSeoAudit = {
  id: string;
  createdAt: string;
  ruleVersion: string;
  actor: string;
  report: SeoAuditReport;
};

/**
 * Simpan satu hasil audit. Best-effort.
 *
 * Pemangkasan retensi TIDAK dilakukan di sini (AUD-08): jalankan
 * `pruneSeoAudits()` terpisah — mis. lewat `after()` di route — agar respons
 * audit tidak menunggu pekerjaan pembersihan.
 */
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
  } catch (err) {
    console.error("[seo-audit-store] gagal menyimpan hasil audit:", err);
  }
}

/**
 * Hapus run lama di luar retensi. Best-effort.
 *
 * AUD-07: satu query hanya melihat sejumlah dokumen teratas, jadi pemangkasan
 * DIULANG sampai tidak ada lagi dokumen melebihi retensi (bukan sekali pangkas
 * yang menyisakan dokumen lama). Dibatasi `PRUNE_MAX_ROUNDS` putaran agar tetap
 * berhenti walau jumlah dokumen sangat besar.
 */
export async function pruneSeoAudits(): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  const pageSize = SEO_AUDIT_RETENTION + PRUNE_BATCH;
  try {
    for (let round = 0; round < PRUNE_MAX_ROUNDS; round += 1) {
      const snap = await db
        .collection(COLLECTION)
        .orderBy("createdAt", "desc")
        .limit(pageSize)
        .get();
      const stale = snap.docs.slice(SEO_AUDIT_RETENTION);
      if (stale.length === 0) return;
      const batch = db.batch();
      for (const doc of stale) batch.delete(doc.ref);
      await batch.commit();
      // Halaman belum penuh → tidak ada dokumen lama tersisa.
      if (snap.docs.length < pageSize) return;
    }
    console.warn(
      "[seo-audit-store] pemangkasan mencapai batas putaran; sebagian hasil lama mungkin tersisa.",
    );
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
