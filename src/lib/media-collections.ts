import "server-only";
import type { Firestore } from "firebase-admin/firestore";

/** Koleksi/folder media (pengorganisasian, FASE M4). */
export type MediaCollection = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  coverMediaId?: string;
  createdAtISO: string;
  updatedAtISO?: string;
};

const COLLECTION = "media_collections";

/** Normalisasi dokumen koleksi (backward-compat). */
function normalizeCollection(id: string, raw: unknown): MediaCollection {
  const d = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    id,
    name: str(d.name),
    slug: str(d.slug),
    description: str(d.description) || undefined,
    coverMediaId: str(d.coverMediaId) || undefined,
    createdAtISO: str(d.createdAtISO) || new Date().toISOString(),
    updatedAtISO: str(d.updatedAtISO) || undefined,
  };
}

/** Membuat slug URL-friendly dari nama. */
export function slugifyCollection(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Daftar semua koleksi, urut nama. */
export async function listCollections(db: Firestore): Promise<MediaCollection[]> {
  try {
    const snap = await db.collection(COLLECTION).get();
    return snap.docs
      .map((doc) => normalizeCollection(doc.id, doc.data()))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error("[media-collections] gagal memuat:", err);
    return [];
  }
}

/** Ambil satu koleksi berdasarkan id. */
export async function getCollection(
  db: Firestore,
  id: string,
): Promise<MediaCollection | null> {
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return normalizeCollection(doc.id, doc.data());
}

/** Buat koleksi baru; mengembalikan dokumen yang tersimpan. */
export async function createCollection(
  db: Firestore,
  input: { name: string; description?: string; slug?: string },
): Promise<MediaCollection> {
  const now = new Date().toISOString();
  const slug = (input.slug && slugifyCollection(input.slug)) || slugifyCollection(input.name);
  const ref = await db.collection(COLLECTION).add({
    name: input.name.trim(),
    slug,
    description: (input.description ?? "").trim(),
    createdAtISO: now,
    updatedAtISO: now,
  });
  const created = await ref.get();
  return normalizeCollection(ref.id, created.data());
}

/** Perbarui koleksi (nama/deskripsi/cover). */
export async function updateCollection(
  db: Firestore,
  id: string,
  patch: { name?: string; description?: string; coverMediaId?: string; slug?: string },
): Promise<MediaCollection | null> {
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const data: Record<string, unknown> = { updatedAtISO: new Date().toISOString() };
  if (patch.name !== undefined) data.name = patch.name.trim();
  if (patch.slug !== undefined) data.slug = slugifyCollection(patch.slug);
  if (patch.description !== undefined) data.description = patch.description.trim();
  if (patch.coverMediaId !== undefined) data.coverMediaId = patch.coverMediaId;

  await ref.update(data);
  return getCollection(db, id);
}

/**
 * Hapus koleksi. Media yang tergabung TIDAK dihapus; `collectionId`-nya
 * dilepas (dikosongkan) agar tidak menunjuk koleksi yang sudah hilang.
 */
export async function deleteCollection(
  db: Firestore,
  id: string,
): Promise<boolean> {
  const ref = db.collection(COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return false;

  // Lepas kaitan media (batched).
  const snap = await db
    .collection("media")
    .where("collectionId", "==", id)
    .get();
  if (!snap.empty) {
    let batch = db.batch();
    let ops = 0;
    for (const doc of snap.docs) {
      batch.update(doc.ref, { collectionId: "" });
      ops += 1;
      if (ops === 450) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();
  }

  await ref.delete();
  return true;
}

/**
 * Hitung jumlah media per koleksi (untuk ditampilkan di sidebar).
 * Mengembalikan Map collectionId → jumlah.
 */
export async function countMediaByCollection(
  db: Firestore,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const snap = await db.collection("media").get();
  for (const doc of snap.docs) {
    const d = doc.data() as Record<string, unknown>;
    const status = typeof d.status === "string" ? d.status : "active";
    if (status !== "active") continue;
    const cid = typeof d.collectionId === "string" ? d.collectionId : "";
    if (!cid) continue;
    counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }
  return counts;
}

/** Agregasi semua tag unik beserta jumlah pemakaiannya (urut terbanyak). */
export async function aggregateTags(
  db: Firestore,
): Promise<Array<{ tag: string; count: number }>> {
  const counts = new Map<string, number>();
  const snap = await db.collection("media").get();
  for (const doc of snap.docs) {
    const d = doc.data() as Record<string, unknown>;
    const status = typeof d.status === "string" ? d.status : "active";
    if (status !== "active") continue;
    if (!Array.isArray(d.tags)) continue;
    for (const t of d.tags) {
      if (typeof t !== "string" || !t.trim()) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
