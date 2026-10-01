import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import type { UserProfile } from "@/lib/user-types";

const COLLECTION = "users";

function normalizeProfile(
  data: Record<string, unknown>,
): Omit<UserProfile, "uid"> {
  const str = (v: unknown, fallback = "") =>
    typeof v === "string" ? v : fallback;

  return {
    email: str(data.email),
    displayName: str(data.displayName),
    photoURL: str(data.photoURL),
    provider: str(data.provider, "google"),
    createdAt: str(data.createdAtISO),
    lastLoginAt: str(data.lastLoginAtISO),
    orderCount: typeof data.orderCount === "number" ? data.orderCount : 0,
  };
}

/**
 * Menyimpan / memperbarui profil user (dipanggil setelah login Google).
 * Best-effort: bila Admin SDK belum dikonfigurasi, fungsi tidak melempar
 * error agar login tetap berhasil.
 */
export async function upsertUserProfile(profile: {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}): Promise<UserProfile | null> {
  const db = getAdminDb();
  if (!db) return null;

  const nowISO = new Date().toISOString();
  const ref = db.collection(COLLECTION).doc(profile.uid);
  const existing = await ref.get();

  const base = {
    uid: profile.uid,
    email: (profile.email ?? "").trim().toLowerCase(),
    displayName: (profile.displayName ?? "").trim(),
    photoURL: (profile.photoURL ?? "").trim(),
    provider: "google",
  };

  if (!existing.exists) {
    // Simpan HANYA field skema kanonik (tanpa duplikat `createdAt`/`lastLoginAt`
    // non-ISO) agar tidak ada data ganda.
    await ref.set({
      uid: base.uid,
      email: base.email,
      displayName: base.displayName,
      photoURL: base.photoURL,
      provider: "google",
      createdAtISO: nowISO,
      lastLoginAtISO: nowISO,
      orderCount: 0,
    });
    return {
      ...base,
      createdAt: nowISO,
      lastLoginAt: nowISO,
      orderCount: 0,
    };
  }

  const prev = normalizeProfile(existing.data() ?? {});
  // Jangan timpa nama/foto dengan nilai kosong saat login ulang.
  const displayName = base.displayName || prev.displayName;
  const photoURL = base.photoURL || prev.photoURL;
  const createdAt = prev.createdAt || nowISO;

  await ref.set(
    {
      uid: base.uid,
      email: base.email,
      displayName,
      photoURL,
      provider: "google",
      createdAtISO: createdAt,
      lastLoginAtISO: nowISO,
    },
    { merge: true },
  );

  return {
    uid: base.uid,
    email: base.email,
    displayName,
    photoURL,
    provider: "google",
    createdAt,
    lastLoginAt: nowISO,
    orderCount: prev.orderCount,
  };
}

/** Mengambil profil user berdasarkan uid (null bila tidak ada). */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getAdminDb();
  if (!db) return null;

  const doc = await db.collection(COLLECTION).doc(uid).get();
  if (!doc.exists) return null;
  return { uid, ...normalizeProfile(doc.data() ?? {}) };
}

/** Menaikkan penghitung order user (best-effort). */
export async function incrementUserOrderCount(uid: string): Promise<void> {
  const db = getAdminDb();
  if (!db) return;

  const ref = db.collection(COLLECTION).doc(uid);
  const existing = await ref.get();
  if (!existing.exists) return;

  const prev = normalizeProfile(existing.data() ?? {});
  await ref.set({ orderCount: prev.orderCount + 1 }, { merge: true });
}
