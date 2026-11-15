import {
  MAX_RECENT_TOOLS,
  TOOLS_FAVORITES_STORAGE_KEY,
  TOOLS_RECENT_STORAGE_KEY,
  addRecentToolSlug,
  parseStoredToolSlugs,
  serializeToolSlugs,
} from "@/lib/tools-discovery-pure";
import {
  TOOLS_USAGE_STORAGE_KEY,
  parseStoredToolUsage,
  recordToolUsage,
  serializeToolUsage,
  type ToolUsageEntry,
} from "@/lib/tools-usage-pure";
import { TOOLS } from "@/lib/tools-registry-pure";

/**
 * Pembungkus localStorage untuk recent/favorites/usage LKTech Tools.
 *
 * Hanya slug tool yang disimpan — tidak pernah berkas, isi teks, atau hasil
 * proses. Semua akses dibungkus try/catch agar private mode / storage penuh
 * tidak mematahkan UI.
 *
 * Modul ini sekaligus menjadi external store untuk `useSyncExternalStore`:
 * snapshot di-cache agar referensinya stabil, penulisan mengirim event internal
 * (tab yang sama) dan perubahan dari tab lain ditangkap lewat event `storage`.
 */

/** Event internal untuk sinkronisasi antar-komponen di tab yang sama. */
const TOOLS_PREFERENCES_EVENT = "lktech:tools-preferences-change";

/** Snapshot server & hidrasi awal: referensi tetap dan selalu kosong. */
const EMPTY_SLUGS: string[] = [];
const EMPTY_USAGE: ToolUsageEntry[] = [];

let favoritesCache: string[] | null = null;
let recentCache: string[] | null = null;
let usageCache: ToolUsageEntry[] | null = null;

function safeRead(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* penyimpanan tidak tersedia — cache in-memory tetap berjalan */
  }
}

function emitChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TOOLS_PREFERENCES_EVENT));
}

/** Baca daftar recent yang valid (maks. 3). */
export function readRecentTools(): string[] {
  return parseStoredToolSlugs(
    safeRead(TOOLS_RECENT_STORAGE_KEY),
    TOOLS,
    MAX_RECENT_TOOLS,
  );
}

/** Baca daftar favorit yang valid. */
export function readFavoriteTools(): string[] {
  return parseStoredToolSlugs(
    safeRead(TOOLS_FAVORITES_STORAGE_KEY),
    TOOLS,
  );
}

/** Baca data pemakaian yang valid (hanya slug, jumlah, waktu). */
export function readToolUsage(): ToolUsageEntry[] {
  return parseStoredToolUsage(safeRead(TOOLS_USAGE_STORAGE_KEY), TOOLS);
}

/** Snapshot stabil favorit untuk `useSyncExternalStore`. */
export function getFavoriteToolsSnapshot(): string[] {
  if (favoritesCache === null) favoritesCache = readFavoriteTools();
  return favoritesCache;
}

/** Snapshot stabil recent untuk `useSyncExternalStore`. */
export function getRecentToolsSnapshot(): string[] {
  if (recentCache === null) recentCache = readRecentTools();
  return recentCache;
}

/** Snapshot stabil usage untuk `useSyncExternalStore`. */
export function getToolUsageSnapshot(): ToolUsageEntry[] {
  if (usageCache === null) usageCache = readToolUsage();
  return usageCache;
}

/** Snapshot server: array kosong statis (bebas hydration mismatch). */
export function getServerToolsSnapshot(): string[] {
  return EMPTY_SLUGS;
}

/** Snapshot server untuk usage: array kosong statis. */
export function getServerToolUsageSnapshot(): ToolUsageEntry[] {
  return EMPTY_USAGE;
}

/**
 * Berlangganan perubahan preferensi Tools. Penulisan di tab yang sama
 * memakai event internal karena `storage` hanya menyala di tab lain.
 */
export function subscribeToolsPreferences(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === TOOLS_FAVORITES_STORAGE_KEY ||
      event.key === TOOLS_RECENT_STORAGE_KEY ||
      event.key === TOOLS_USAGE_STORAGE_KEY
    ) {
      favoritesCache = null;
      recentCache = null;
      usageCache = null;
      callback();
    }
  };

  window.addEventListener(TOOLS_PREFERENCES_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(TOOLS_PREFERENCES_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

/** Simpan daftar recent (sudah tervalidasi pemanggil). */
export function writeRecentTools(slugs: readonly string[]): void {
  safeWrite(TOOLS_RECENT_STORAGE_KEY, serializeToolSlugs(slugs));
  recentCache = [...slugs];
  emitChange();
}

/** Simpan daftar favorit. */
export function writeFavoriteTools(slugs: readonly string[]): void {
  safeWrite(TOOLS_FAVORITES_STORAGE_KEY, serializeToolSlugs(slugs));
  favoritesCache = [...slugs];
  emitChange();
}

/** Simpan data pemakaian (sudah tervalidasi pemanggil). */
export function writeToolUsage(entries: readonly ToolUsageEntry[]): void {
  safeWrite(TOOLS_USAGE_STORAGE_KEY, serializeToolUsage(entries));
  usageCache = [...entries];
  emitChange();
}

/**
 * Catat satu kunjungan workspace: perbarui recent DAN hitungan pemakaian,
 * lalu kirim SATU event perubahan.
 *
 * Ini satu-satunya titik pencatatan recent/usage. Klik dari katalog/sidebar
 * hanya mengirim analytics; pencatatan terjadi saat workspace benar-benar
 * di-mount (termasuk deep link & refresh).
 */
export function recordToolOpen(slug: string): void {
  const recent = addRecentToolSlug(
    readRecentTools(),
    slug,
    MAX_RECENT_TOOLS,
  );
  safeWrite(TOOLS_RECENT_STORAGE_KEY, serializeToolSlugs(recent));
  recentCache = recent;

  const usage = recordToolUsage(readToolUsage(), slug, TOOLS);
  safeWrite(TOOLS_USAGE_STORAGE_KEY, serializeToolUsage(usage));
  usageCache = usage;

  emitChange();
}

/** Hapus seluruh data lokal Tools (recent + favorites + usage). */
export function clearToolsLocalData(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOOLS_RECENT_STORAGE_KEY);
    window.localStorage.removeItem(TOOLS_FAVORITES_STORAGE_KEY);
    window.localStorage.removeItem(TOOLS_USAGE_STORAGE_KEY);
  } catch {
    /* abaikan */
  }
  favoritesCache = [];
  recentCache = [];
  usageCache = [];
  emitChange();
}
