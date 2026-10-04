import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { isMayarConfigured } from "@/lib/mayar";
import {
  buildToken,
  parseToken,
  randomTokenId,
} from "@/lib/download-token";

/**
 * Unduhan produk digital (FASE P1).
 *
 * Desain keamanan:
 * - Token = `{tokenId}.{hmac}`, di mana `hmac = HMAC_SHA256(secret, tokenId)`.
 *   `tokenId` = id dokumen di koleksi `downloads/{tokenId}` (opaque, 24 byte).
 *   Verifikasi membandingkan signature dulu (timing-safe) SEBELUM baca DB.
 * - Secret dari `DOWNLOAD_TOKEN_SECRET`; **fallback aman**: bila kosong, pakai
 *   `MAYAR_API_KEY` (atas dasar: rahasia server yang sudah ada) — bukan literal
 *   hardcoded. Bila keduanya kosong, unduhan dinonaktifkan (fail-closed).
 * - Setiap token menyimpan snapshot berkas (bukan referensi ke produk yang bisa
 *   berubah), masa berlaku, dan batas jumlah unduh + pencatatan hit.
 *
 * Catatan: file URL disajikan lewat halaman server yang divalidasi; URL asli
 * tetap tersedia saat render (Cloudinary public URL). Untuk keamanan lebih ketat
 * (signed URL), dapat ditingkatkan di fase lanjut.
 */

const COLLECTION = "downloads";

/** Apakah fitur unduhan dikonfigurasi (secret tersedia). */
export function isDownloadConfigured(): boolean {
  return Boolean(getSecret());
}

/** Ambil secret HMAC (dari env; fallback ke MAYAR_API_KEY). */
function getSecret(): string | null {
  const s =
    process.env.DOWNLOAD_TOKEN_SECRET?.trim() ||
    process.env.MAYAR_API_KEY?.trim();
  return s || null;
}

/** Masa berlaku link unduhan (hari) default. */
export function getDefaultLinkDays(): number {
  const n = Number(process.env.DOWNLOAD_LINK_DAYS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
}

/** Batas jumlah unduh per link (default). */
export function getDefaultMaxHits(): number {
  const n = Number(process.env.DOWNLOAD_MAX_HITS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

/** Satu berkas yang tersimpan pada token unduhan. */
export type DownloadFile = {
  name: string;
  url: string;
  size?: number;
};

/** Dokumen token unduhan tersimpan. */
export type DownloadGrant = {
  tokenId: string;
  orderId: string;
  uid: string;
  buyerEmail: string;
  files: DownloadFile[];
  note?: string;
  /** Batas jumlah unduh (0 = tak terbatas). */
  maxHits: number;
  /** Jumlah unduhan yang sudah tercatat. */
  hits: number;
  createdAt: string;
  expiresAt: string;
};

function sign(tokenId: string): string {
  const secret = getSecret();
  if (!secret) throw new Error("Unduhan belum dikonfigurasi.");
  return buildToken(tokenId, secret);
}

/** Bentuk token final `{tokenId}.{sig}` untuk dikirim ke pembeli. */
export function makeToken(tokenId: string): string {
  return sign(tokenId);
}

/**
 * Verifikasi token: kembalikan `tokenId` bila signature valid, else null.
 * Perbandingan signature memakai timing-safe equal.
 */
export function verifyToken(token: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  return parseToken(token, secret);
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function normalizeGrant(
  tokenId: string,
  data: Record<string, unknown>,
): DownloadGrant {
  const files: DownloadFile[] = Array.isArray(data.files)
    ? data.files
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .map((x) => ({
          name: str(x.name).trim(),
          url: str(x.url).trim(),
          size: typeof x.size === "number" ? x.size : undefined,
        }))
        .filter((f) => f.url)
    : [];
  return {
    tokenId,
    orderId: str(data.orderId),
    uid: str(data.uid),
    buyerEmail: str(data.buyerEmail),
    files,
    note: str(data.note) || undefined,
    maxHits: num(data.maxHits, 0),
    hits: num(data.hits, 0),
    createdAt: str(data.createdAtISO) || str(data.createdAt),
    expiresAt: str(data.expiresAtISO) || str(data.expiresAt),
  };
}

/**
 * Bersihkan daftar berkas: buang `size` yang `undefined` (Firestore menolaknya)
 * & buang berkas tanpa URL.
 */
function cleanFiles(files: DownloadFile[]): Record<string, unknown>[] {
  return files
    .filter((f) => f.url && f.url.trim())
    .map((f) => {
      const file: Record<string, unknown> = { name: f.name, url: f.url };
      if (typeof f.size === "number" && Number.isFinite(f.size)) file.size = f.size;
      return file;
    });
}

/**
 * Memperbarui berkas/pengaturan pada token unduhan yang sudah ada
 * (token TETAP sama agar link pembeli lama tetap berlaku). Mengembalikan grant.
 */
export async function refreshGrant(
  tokenId: string,
  patch: {
    files: DownloadFile[];
    note?: string;
    linkDays?: number;
    maxHits?: number;
  },
): Promise<DownloadGrant> {
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  const now = new Date();
  const update: Record<string, unknown> = {
    files: cleanFiles(patch.files),
    updatedAtISO: now.toISOString(),
  };
  if (patch.note !== undefined) update.note = patch.note ?? null;
  if (patch.maxHits && patch.maxHits > 0) update.maxHits = patch.maxHits;
  if (patch.linkDays && patch.linkDays > 0) {
    update.expiresAtISO = new Date(
      now.getTime() + patch.linkDays * 86_400_000,
    ).toISOString();
  }
  const ref = db.collection(COLLECTION).doc(tokenId);
  await ref.set(update, { merge: true });
  const doc = await ref.get();
  return normalizeGrant(tokenId, doc.data() as Record<string, unknown>);
}

/** Mengambil token unduhan sebuah order (null bila belum ada). */
export async function getGrantByOrderId(
  orderId: string,
): Promise<{ token: string; grant: DownloadGrant } | null> {
  const db = getAdminDb();
  if (!db) return null;
  try {
    const snap = await db
      .collection(COLLECTION)
      .where("orderId", "==", orderId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return {
      token: makeToken(doc.id),
      grant: normalizeGrant(doc.id, doc.data() as Record<string, unknown>),
    };
  } catch (err) {
    console.error("[downloads] gagal mengambil grant order:", err);
    return null;
  }
}

/**
 * Membuat token unduhan untuk sebuah order (idempoten per order: bila sudah ada
 * token untuk order ini, kembalikan token yang sama).
 * Mengembalikan `{ token, grant }`.
 */
export async function createDownloadGrant(params: {
  orderId: string;
  uid: string;
  buyerEmail: string;
  files: DownloadFile[];
  note?: string;
  linkDays?: number;
  maxHits?: number;
  /**
   * Bila `true`, dan sudah ada token untuk order ini, PERBARUI berkasnya
   * (bukan mengembalikan yang lama). Dipakai oleh aksi admin "buat ulang
   * unduhan" setelah berkas produk ditambahkan/diubah.
   */
  refreshExisting?: boolean;
}): Promise<{ token: string; grant: DownloadGrant } | null> {
  const db = getAdminDb();
  if (!db || !isDownloadConfigured()) return null;
  if (params.files.length === 0) return null;

  // Idempoten: cek token yang sudah ada untuk order ini.
  try {
    const existing = await db
      .collection(COLLECTION)
      .where("orderId", "==", params.orderId)
      .limit(1)
      .get();
    if (!existing.empty) {
      const doc = existing.docs[0];
      if (!params.refreshExisting) {
        const grant = normalizeGrant(doc.id, doc.data() as Record<string, unknown>);
        return { token: makeToken(doc.id), grant };
      }
      // Perbarui berkas & pengaturan pada token yang ada (token tetap valid).
      const updated = await refreshGrant(doc.id, {
        files: params.files,
        note: params.note,
        linkDays: params.linkDays,
        maxHits: params.maxHits,
      });
      return { token: makeToken(doc.id), grant: updated };
    }
  } catch (err) {
    console.error("[downloads] gagal cek token lama:", err);
  }

  const tokenId = randomTokenId();
  const linkDays = params.linkDays && params.linkDays > 0 ? params.linkDays : getDefaultLinkDays();
  const maxHits = params.maxHits && params.maxHits > 0 ? params.maxHits : getDefaultMaxHits();
  const now = new Date();
  const expires = new Date(now.getTime() + linkDays * 86_400_000);

  // Firestore MENOLAK nilai `undefined`. Bersihkan tiap berkas (mis. `size`
  // yang tidak diisi) sebelum menyimpan.
  const files = cleanFiles(params.files);

  const payload = {
    orderId: params.orderId,
    uid: params.uid,
    buyerEmail: params.buyerEmail,
    files,
    note: params.note ?? null,
    maxHits,
    hits: 0,
    createdAtISO: now.toISOString(),
    expiresAtISO: expires.toISOString(),
  };

  await db.collection(COLLECTION).doc(tokenId).set(payload);
  return { token: makeToken(tokenId), grant: normalizeGrant(tokenId, payload) };
}

/** Status hasil validasi token. */
export type GrantCheck =
  | { ok: true; grant: DownloadGrant }
  | { ok: false; reason: "invalid" | "not_found" | "expired" | "exhausted" };

/**
 * Memvalidasi token & mengembalikan grant (tanpa menambah hit).
 * Dipakai halaman `/unduhan/[token]` untuk render daftar berkas.
 */
export async function getGrantByToken(token: string): Promise<GrantCheck> {
  const tokenId = verifyToken(token);
  if (!tokenId) return { ok: false, reason: "invalid" };
  const db = getAdminDb();
  if (!db) return { ok: false, reason: "not_found" };

  const doc = await db.collection(COLLECTION).doc(tokenId).get();
  if (!doc.exists) return { ok: false, reason: "not_found" };
  const grant = normalizeGrant(tokenId, doc.data() as Record<string, unknown>);

  if (grant.expiresAt && new Date(grant.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (grant.maxHits > 0 && grant.hits >= grant.maxHits) {
    return { ok: false, reason: "exhausted" };
  }
  return { ok: true, grant };
}

/**
 * Mencatat satu unduhan (increment hits) — best-effort.
 * Mengembalikan grant terbaru & apakah unduhan diizinkan.
 */
export async function recordDownloadHit(
  token: string,
): Promise<{ ok: boolean; reason?: string; grant?: DownloadGrant }> {
  const check = await getGrantByToken(token);
  if (!check.ok) return { ok: false, reason: check.reason };

  const db = getAdminDb();
  if (!db) return { ok: true, grant: check.grant };

  try {
    const ref = db.collection(COLLECTION).doc(check.grant.tokenId);
    const now = new Date().toISOString();
    await ref.update({
      hits: check.grant.hits + 1,
      lastAccessISO: now,
    });
    return {
      ok: true,
      grant: { ...check.grant, hits: check.grant.hits + 1 },
    };
  } catch (err) {
    console.error("[downloads] gagal mencatat unduhan:", err);
    // Jangan gagalkan pengguna hanya karena pencatatan gagal.
    return { ok: true, grant: check.grant };
  }
}

/** URL absolut halaman unduhan untuk token. */
export function downloadUrl(siteUrl: string, token: string): string {
  return `${siteUrl.replace(/\/+$/, "")}/unduhan/${token}`;
}

/** Bila Mayar dikonfigurasi tapi secret unduhan tidak, beri peringatan. */
export function downloadConfigWarning(): string | null {
  if (!isDownloadConfigured() && isMayarConfigured()) {
    return "Unduhan otomatis belum aktif: isi DOWNLOAD_TOKEN_SECRET agar pembeli dapat mengunduh produk digital.";
  }
  return null;
}
