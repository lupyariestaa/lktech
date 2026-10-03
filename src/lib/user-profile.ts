import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  MAX_ADDRESSES,
  MAX_WISHLIST_ITEMS,
  type SavedAddress,
  type UserProfile,
} from "@/lib/user-types";

const COLLECTION = "users";

/** Normalisasi satu alamat mentah dari Firestore. */
function normalizeAddress(raw: unknown): SavedAddress | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const str = (v: unknown, fallback = "") =>
    typeof v === "string" ? v : fallback;
  const id = str(d.id);
  if (!id) return null;
  return {
    id,
    label: str(d.label, "Alamat"),
    recipient: str(d.recipient),
    phone: str(d.phone),
    address: str(d.address),
    city: str(d.city),
    postalCode: str(d.postalCode) || undefined,
    note: str(d.note) || undefined,
    isPrimary: d.isPrimary === true,
  };
}

function normalizeWishlist(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .slice(0, MAX_WISHLIST_ITEMS);
}

function normalizeAddresses(raw: unknown): SavedAddress[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeAddress)
    .filter((a): a is SavedAddress => a !== null)
    .slice(0, MAX_ADDRESSES);
}

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
    wishlist: normalizeWishlist(data.wishlist),
    addresses: normalizeAddresses(data.addresses),
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
      wishlist: [],
      addresses: [],
    });
    return {
      ...base,
      createdAt: nowISO,
      lastLoginAt: nowISO,
      orderCount: 0,
      wishlist: [],
      addresses: [],
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
    wishlist: prev.wishlist,
    addresses: prev.addresses,
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

/** Perbarui nama tampilan user. Mengembalikan profil terbaru. */
export async function updateUserDisplayName(
  uid: string,
  displayName: string,
): Promise<UserProfile | null> {
  const db = getAdminDb();
  if (!db) return null;

  const ref = db.collection(COLLECTION).doc(uid);
  const existing = await ref.get();
  if (!existing.exists) return null;

  await ref.set(
    { displayName: displayName.trim().slice(0, 80), updatedAtISO: new Date().toISOString() },
    { merge: true },
  );
  return getUserProfile(uid);
}

// ===== Wishlist =====

/**
 * Menambahkan produk ke wishlist user (paling depan). Idempoten —
 * menambah slug yang sudah ada tidak menghasilkan duplikat.
 */
export async function addToWishlist(
  uid: string,
  slug: string,
): Promise<string[] | null> {
  const db = getAdminDb();
  if (!db) return null;

  const ref = db.collection(COLLECTION).doc(uid);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const prev = normalizeWishlist(existing.data()?.wishlist);
  const next = [slug, ...prev.filter((s) => s !== slug)].slice(
    0,
    MAX_WISHLIST_ITEMS,
  );
  await ref.set(
    { wishlist: next, updatedAtISO: new Date().toISOString() },
    { merge: true },
  );
  return next;
}

/** Menghapus produk dari wishlist user. */
export async function removeFromWishlist(
  uid: string,
  slug: string,
): Promise<string[] | null> {
  const db = getAdminDb();
  if (!db) return null;

  const ref = db.collection(COLLECTION).doc(uid);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const prev = normalizeWishlist(existing.data()?.wishlist);
  const next = prev.filter((s) => s !== slug);
  await ref.set(
    { wishlist: next, updatedAtISO: new Date().toISOString() },
    { merge: true },
  );
  return next;
}

// ===== Alamat =====

/** Daftar alamat user (urut: utama dulu, lalu label). */
export async function listAddresses(uid: string): Promise<SavedAddress[]> {
  const profile = await getUserProfile(uid);
  return profile?.addresses ?? [];
}

/**
 * Menambah alamat baru. Bila `isPrimary` true — atau belum ada alamat lain —
 * alamat ini menjadi utama (alamat lain di-unset).
 */
export async function addAddress(
  uid: string,
  input: Omit<SavedAddress, "id">,
): Promise<SavedAddress[] | null> {
  const db = getAdminDb();
  if (!db) return null;

  const ref = db.collection(COLLECTION).doc(uid);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const prev = normalizeAddresses(existing.data()?.addresses);
  if (prev.length >= MAX_ADDRESSES) return prev;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `addr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const makePrimary = input.isPrimary || prev.length === 0;
  const list = prev.map((a) => (makePrimary ? { ...a, isPrimary: false } : a));
  const next: SavedAddress[] = [
    ...list,
    { ...input, id, isPrimary: makePrimary },
  ];

  await ref.set(
    { addresses: next, updatedAtISO: new Date().toISOString() },
    { merge: true },
  );
  return next;
}

/** Memperbarui alamat berdasarkan id. */
export async function updateAddress(
  uid: string,
  id: string,
  patch: Partial<Omit<SavedAddress, "id">>,
): Promise<SavedAddress[] | null> {
  const db = getAdminDb();
  if (!db) return null;

  const ref = db.collection(COLLECTION).doc(uid);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const prev = normalizeAddresses(existing.data()?.addresses);
  const makePrimary = patch.isPrimary === true;
  let next = prev.map((a) => {
    if (a.id !== id) return makePrimary ? { ...a, isPrimary: false } : a;
    return { ...a, ...patch, id: a.id };
  });
  next = next.map((a) => ({ ...a, isPrimary: makePrimary ? a.id === id : a.isPrimary }));
  // Pastikan selalu ada (minimal) satu alamat utama.
  if (next.length > 0 && !next.some((a) => a.isPrimary)) {
    next = next.map((a, i) => (i === 0 ? { ...a, isPrimary: true } : a));
  }

  await ref.set(
    { addresses: next, updatedAtISO: new Date().toISOString() },
    { merge: true },
  );
  return next;
}

/** Menghapus alamat berdasarkan id. Bila yang dihapus utama, promosikan yang lain. */
export async function deleteAddress(
  uid: string,
  id: string,
): Promise<SavedAddress[] | null> {
  const db = getAdminDb();
  if (!db) return null;

  const ref = db.collection(COLLECTION).doc(uid);
  const existing = await ref.get();
  if (!existing.exists) return null;

  const prev = normalizeAddresses(existing.data()?.addresses);
  const removed = prev.find((a) => a.id === id);
  let next = prev.filter((a) => a.id !== id);
  if (removed?.isPrimary && next.length > 0) {
    next = next.map((a, i) => (i === 0 ? { ...a, isPrimary: true } : a));
  }

  await ref.set(
    { addresses: next, updatedAtISO: new Date().toISOString() },
    { merge: true },
  );
  return next;
}
