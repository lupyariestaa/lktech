import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  normalizeCartDraftItems,
  shouldRemind,
  type CartDraft,
  type CartDraftItem,
} from "@/lib/cart-draft-pure";

export type { CartDraft, CartDraftItem } from "@/lib/cart-draft-pure";
export {
  shouldRemind,
  normalizeCartDraftItems,
  DEFAULT_REMIND_AFTER_HOURS,
  DEFAULT_REMIND_MAX_AGE_DAYS,
} from "@/lib/cart-draft-pure";

/**
 * DRAFT KERANJANG server-side (FASE P5) — koleksi `carts/{uid}`.
 *
 * Tujuan: memulihkan keranjang terbengkalai (abandoned checkout) dengan email
 * pengingat H+1. Simpan ringan (hanya slug/nama/harga/qty), tanpa data sensitif.
 *
 * Prinsip:
 * - **Best-effort**: kegagalan simpan TIDAK mengganggu UX klien.
 * - **Privasi**: opt-out dihormati; draft dihapus/ditandai `recovered` saat checkout.
 * - Aman tanpa Admin SDK → no-op.
 */

const COLLECTION = "carts";

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/** Normalisasi dokumen draft mentah. */
export function normalizeCartDraft(
  uid: string,
  data: Record<string, unknown>,
): CartDraft {
  return {
    uid,
    email: str(data.email),
    displayName: str(data.displayName) || undefined,
    items: normalizeCartDraftItems(data.items),
    subtotal: num(data.subtotal),
    createdAtISO: str(data.createdAtISO),
    updatedAtISO: str(data.updatedAtISO),
    remindedAtISO: str(data.remindedAtISO) || undefined,
    recoveredAtISO: str(data.recoveredAtISO) || undefined,
    optedOut: data.optedOut === true,
  };
}

/**
 * Simpan/perbarui draft keranjang user. Bila `items` kosong → hapus draft
 * (keranjang dikosongkan). Idempoten. Best-effort (mengembalikan boolean).
 */
export async function saveCartDraft(
  uid: string,
  input: { email?: string; displayName?: string; items: CartDraftItem[]; subtotal: number },
): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;

  const items = normalizeCartDraftItems(input.items);
  const ref = db.collection(COLLECTION).doc(uid);
  const nowISO = new Date().toISOString();

  try {
    if (items.length === 0) {
      await ref.delete();
      return true;
    }
    const existing = await ref.get();
    const createdAtISO = existing.exists
      ? str(existing.get("createdAtISO")) || nowISO
      : nowISO;
    await ref.set(
      {
        uid,
        email: (input.email ?? "").trim().toLowerCase(),
        displayName: (input.displayName ?? "").trim(),
        items,
        subtotal: Math.max(0, Math.floor(input.subtotal)),
        createdAtISO,
        updatedAtISO: nowISO,
      },
      { merge: true },
    );
    return true;
  } catch (err) {
    console.error("[cart-draft] gagal menyimpan draft:", err);
    return false;
  }
}

/** Tandai draft pulih (checkout berhasil) & bersihkan. Best-effort. */
export async function markCartDraftRecovered(uid: string): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  try {
    await db.collection(COLLECTION).doc(uid).delete();
  } catch (err) {
    console.error("[cart-draft] gagal menandai pulih:", err);
  }
}

/** Hapus draft (mis. saat keranjang dikosongkan). */
export async function clearCartDraft(uid: string): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  try {
    await db.collection(COLLECTION).doc(uid).delete();
  } catch (err) {
    console.error("[cart-draft] gagal menghapus draft:", err);
  }
}

/** Setel opt-out (berhenti diingatkan) untuk user. */
export async function setCartOptOut(uid: string, optedOut = true): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  try {
    await db
      .collection(COLLECTION)
      .doc(uid)
      .set({ optedOut, updatedAtISO: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error("[cart-draft] gagal set opt-out:", err);
  }
}

/** Ambil draft user (null bila tak ada). */
export async function getCartDraft(uid: string): Promise<CartDraft | null> {
  const db = getAdminDb();
  if (!db) return null;
  const doc = await db.collection(COLLECTION).doc(uid).get();
  if (!doc.exists) return null;
  return normalizeCartDraft(uid, doc.data() ?? {});
}

/**
 * Ambil draft "terbengkalai" yang layak diingatkan (FASE P5), dibatasi
 * `maxScan` dokumen. Menyaring di memori memakai `shouldRemind` (murni/teruji).
 */
export async function listRemindableCarts(
  now: Date = new Date(),
  maxScan = 200,
  opts: { afterHours?: number; maxAgeDays?: number; remindCooldownHours?: number } = {},
): Promise<CartDraft[]> {
  const db = getAdminDb();
  if (!db) return [];

  const snap = await db.collection(COLLECTION).limit(maxScan).get();
  return snap.docs
    .map((doc) => normalizeCartDraft(doc.id, doc.data() ?? {}))
    .filter((d) => shouldRemind(d, now, opts));
}

/** Tandai draft sudah diingatkan pada `now`. */
export async function markCartReminded(uid: string, atISO = new Date().toISOString()): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  try {
    await db.collection(COLLECTION).doc(uid).set({ remindedAtISO: atISO }, { merge: true });
  } catch (err) {
    console.error("[cart-draft] gagal menandai reminded:", err);
  }
}
