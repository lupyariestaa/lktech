import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * MANAJEMEN ADMIN (fase S4) — koleksi `admins/{email}`.
 *
 * Keamanan (KRITIS):
 * - **OWNER** ditentukan ENV `ADMIN_EMAILS` (root of trust) — tidak bisa dihapus.
 * - Hanya **OWNER** yang boleh menambah/menghapus admin (di API).
 * - Hanya satu role (`admin`).
 * - `requireAdmin` (lihat admin-guard) menerima: env whitelist OR dokumen aktif.
 */

const COLLECTION = "admins";

/** Email OWNER (root of trust) — dari env, dipisah koma, lowercase. */
export function getOwnerEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** `true` bila email adalah OWNER (dari env). */
export function isOwnerEmail(email: string): boolean {
  return getOwnerEmails().includes(email.trim().toLowerCase());
}

export type AdminMember = {
  email: string;
  name?: string;
  isOwner: boolean;
  addedBy?: string;
  addedAtISO?: string;
};

function normalize(v: unknown, email: string, isOwner: boolean): AdminMember | null {
  if (!v || typeof v !== "object") return null;
  const d = v as Record<string, unknown>;
  const e = typeof d.email === "string" ? d.email : email;
  if (!e) return null;
  return {
    email: e.toLowerCase(),
    name: typeof d.name === "string" ? d.name : undefined,
    isOwner,
    addedBy: typeof d.addedBy === "string" ? d.addedBy : undefined,
    addedAtISO: typeof d.addedAtISO === "string" ? d.addedAtISO : undefined,
  };
}

/** Daftar admin (owner dari env + admin dari DB). */
export async function listAdmins(): Promise<AdminMember[]> {
  const owners: AdminMember[] = getOwnerEmails().map((email) => ({
    email,
    isOwner: true,
  }));
  const db = getAdminDb();
  if (!db) return owners;
  try {
    const snap = await db.collection(COLLECTION).get();
    const members = snap.docs
      .map((doc) => normalize({ email: doc.id, ...(doc.data() as Record<string, unknown>) }, doc.id, false))
      .filter((m): m is AdminMember => m !== null && m.email !== "" && !isOwnerEmail(m.email));
    return [...owners, ...members];
  } catch (err) {
    console.error("[admins] gagal memuat daftar admin:", err);
    return owners;
  }
}

/** `true` bila email terdaftar sebagai admin DB aktif. */
export async function isDbAdmin(email: string): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  try {
    const doc = await db.collection(COLLECTION).doc(email.trim().toLowerCase()).get();
    return doc.exists && doc.get("active") !== false;
  } catch {
    return false;
  }
}

/** Tambahkan admin baru (idempoten). Menolak bila email = owner (sudah admin). */
export async function addAdmin(
  email: string,
  opts: { addedBy: string; name?: string },
): Promise<AdminMember> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  const clean = email.trim().toLowerCase();
  if (!/.+@.+\..+/.test(clean)) throw new Error("Email tidak valid.");
  if (isOwnerEmail(clean)) throw new Error("Email ini sudah OWNER.");
  await db
    .collection(COLLECTION)
    .doc(clean)
    .set(
      {
        email: clean,
        name: opts.name?.trim() || "",
        active: true,
        addedBy: opts.addedBy,
        addedAtISO: new Date().toISOString(),
      },
      { merge: true },
    );
  return { email: clean, name: opts.name?.trim() || undefined, isOwner: false, addedBy: opts.addedBy };
}

/** Hapus admin DB. Menolak menghapus OWNER. */
export async function removeAdmin(email: string): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  const clean = email.trim().toLowerCase();
  if (isOwnerEmail(clean)) throw new Error("OWNER tidak dapat dihapus.");
  const ref = db.collection(COLLECTION).doc(clean);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}
