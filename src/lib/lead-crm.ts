import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  computeLeadScore,
  isPipelineStage,
  statusToStage,
  stageToStatus,
  type PipelineStage,
} from "@/lib/lead-scoring-pure";
import type { LeadActivity } from "@/lib/lead-types";

/**
 * DATA LAYER CRM MINI lead (Tema 3.2, FASE L1–L3).
 *
 * Mengelola field tambahan pada `leads/{id}`: `score`, `stage`, `activities`,
 * `lastActivityAtISO`. Semua OPSIONAL (backward-compatible) & best-effort.
 *
 * `status` (lama) TETAP dijaga sinkron dengan `stage` (pipeline) agar badge,
 * filter, & laporan lama tetap benar.
 */

const COLLECTION = "leads";
const MAX_ACTIVITIES = 100;

/** Recompute & simpan skor lead (dipanggil saat create/ubah status). */
export async function recomputeLeadScore(id: string): Promise<number | null> {
  const db = getAdminDb();
  if (!db) return null;
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const d = doc.data() ?? {};
  const score = computeLeadScore({
    service: typeof d.service === "string" ? d.service : "",
    message: typeof d.message === "string" ? d.message : "",
    phone: typeof d.phone === "string" ? d.phone : "",
    email: typeof d.email === "string" ? d.email : "",
    source: typeof d.source === "string" ? d.source : "",
    stage: typeof d.stage === "string" ? d.stage : statusToStage(String(d.status ?? "baru")),
  });
  try {
    await ref.set({ score, updatedAtISO: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error("[lead-crm] gagal menyimpan skor:", err);
  }
  return score;
}

/**
 * Ubah STAGE pipeline sebuah lead (+ sinkron `status` lama).
 * Mengembalikan stage baru (null bila lead tak ada).
 */
export async function updateLeadStage(
  id: string,
  stage: PipelineStage,
  actor: string,
): Promise<PipelineStage | null> {
  const db = getAdminDb();
  if (!db || !isPipelineStage(stage)) return null;
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const status = stageToStatus(stage);
  const nowISO = new Date().toISOString();
  const prevStage = (doc.get("stage") as string) || statusToStage(String(doc.get("status") ?? "baru"));

  try {
    await ref.set(
      {
        stage,
        status,
        lastActivityAtISO: nowISO,
        updatedAtISO: nowISO,
        updatedBy: actor,
      },
      { merge: true },
    );
    if (prevStage !== stage) {
      await appendLeadActivityInternal(ref, {
        type: "status",
        note: `Tahap: ${prevStage} → ${stage}`,
        actor,
      });
    }
    await recomputeLeadScore(id);
    return stage;
  } catch (err) {
    console.error("[lead-crm] gagal ubah stage:", err);
    return null;
  }
}

/** Normalisasi satu aktivitas dari Firestore. */
function normalizeActivity(raw: unknown): LeadActivity | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const id = typeof d.id === "string" ? d.id : "";
  if (!id) return null;
  const type = typeof d.type === "string" ? d.type : "sistem";
  const allowed = ["catatan", "status", "panggilan", "email", "wa", "sistem"];
  return {
    id,
    type: (allowed.includes(type) ? type : "sistem") as LeadActivity["type"],
    note: typeof d.note === "string" ? d.note : "",
    actor: typeof d.actor === "string" ? d.actor : "",
    atISO: typeof d.atISO === "string" ? d.atISO : "",
  };
}

/** Baca aktivitas lead (terbaru lebih dulu). */
export async function listLeadActivities(id: string): Promise<LeadActivity[]> {
  const db = getAdminDb();
  if (!db) return [];
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return [];
  const raw = doc.get("activities");
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeActivity)
    .filter((a): a is LeadActivity => a !== null)
    .sort((a, b) => b.atISO.localeCompare(a.atISO));
}

/** Tipe internal untuk menulis aktivitas (menerima DocumentReference). */
type LeadRef = {
  set: (data: Record<string, unknown>, opts: { merge: boolean }) => Promise<unknown>;
  get: () => Promise<{
    exists: boolean;
    get: (k: string) => unknown;
  }>;
};

/** Tambah satu aktivitas (internal, dipakai juga oleh updateLeadStage). */
async function appendLeadActivityInternal(
  ref: LeadRef,
  entry: { type: LeadActivity["type"]; note: string; actor: string },
): Promise<void> {
  const nowISO = new Date().toISOString();
  const activity: LeadActivity = {
    id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: entry.type,
    note: entry.note.slice(0, 1000),
    actor: entry.actor,
    atISO: nowISO,
  };
  try {
    const doc = await ref.get();
    const existing = doc.exists && Array.isArray(doc.get("activities"))
      ? (doc.get("activities") as unknown[])
          .map(normalizeActivity)
          .filter((a): a is LeadActivity => a !== null)
      : [];
    const next = [activity, ...existing].slice(0, MAX_ACTIVITIES);
    await ref.set(
      { activities: next, lastActivityAtISO: nowISO, updatedAtISO: nowISO },
      { merge: true },
    );
  } catch (err) {
    console.error("[lead-crm] gagal menambah aktivitas:", err);
  }
}

/** Tambah aktivitas publik (catatan admin, dsb). */
export async function addLeadActivity(
  id: string,
  entry: { type: LeadActivity["type"]; note: string; actor: string },
): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await appendLeadActivityInternal(ref as unknown as LeadRef, entry);
  return true;
}
