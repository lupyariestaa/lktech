/**
 * LOGIKA MURNI data pemakaian LKTech Tools.
 *
 * Menyimpan HANYA: slug tool, jumlah pembukaan (`opens`), dan waktu terakhir
 * dibuka (`lastUsedAt`). Tidak ada nama berkas, isi teks, ukuran, atau hasil
 * proses — semuanya tetap di localStorage perangkat.
 *
 * Modul ini sengaja tidak mengimpor registry saat runtime agar dapat diuji Node
 * lewat `--experimental-strip-types`. Semua fungsi yang butuh registry menerima
 * `tools` sebagai argumen; tipe registry diimpor sebagai `import type`.
 */

import type { ToolDefinition } from "./tools-registry-pure";

/** Kunci localStorage (versi eksplisit agar mudah dimigrasikan). */
export const TOOLS_USAGE_STORAGE_KEY = "lktech.tools.usage.v1";

/** Batas data agar localStorage tidak tumbuh tanpa kendali. */
export const MAX_USAGE_ENTRIES = 50;
export const MIN_USAGE_OPENS = 1;
export const MAX_USAGE_OPENS = 999_999;

/** Satu baris data pemakaian tool. */
export type ToolUsageEntry = {
  /** Slug registry yang valid & tersedia. */
  slug: string;
  /** Jumlah workspace dibuka (integer 1..MAX_USAGE_OPENS). */
  opens: number;
  /** Epoch milidetik kunjungan terakhir. */
  lastUsedAt: number;
};

/** Hasil ranking "sering dibuka" yang sudah dipasangkan ke registry. */
export type FrequentTool = {
  tool: ToolDefinition;
  opens: number;
  lastUsedAt: number;
};

function isAvailableTool(
  slug: string,
  tools: readonly ToolDefinition[],
): ToolDefinition | null {
  const tool = tools.find((item) => item.slug === slug);
  return tool && tool.status === "tersedia" ? tool : null;
}

function normalizeSlug(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function sanitizeOpens(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.floor(value);
  if (rounded < MIN_USAGE_OPENS) return null;
  return Math.min(rounded, MAX_USAGE_OPENS);
}

function sanitizeTimestamp(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.floor(value);
}

/**
 * Bersihkan array mentah menjadi entri valid: slug tersedia, tanpa duplikat,
 * angka dalam batas, dan diurutkan dari kunjungan terbaru.
 *
 * Duplikat digabung: `opens` dijumlahkan (di-clamp) dan `lastUsedAt` diambil
 * yang terbaru. Data rusak dilewati, bukan melempar error.
 */
export function sanitizeToolUsageEntries(
  values: readonly unknown[],
  tools: readonly ToolDefinition[],
  max = MAX_USAGE_ENTRIES,
): ToolUsageEntry[] {
  const merged = new Map<string, ToolUsageEntry>();

  for (const value of values) {
    if (!value || typeof value !== "object") continue;
    const record = value as Record<string, unknown>;
    const slug = normalizeSlug(record.slug);
    if (!slug || !isAvailableTool(slug, tools)) continue;

    const opens = sanitizeOpens(record.opens);
    const lastUsedAt = sanitizeTimestamp(record.lastUsedAt);
    if (opens === null || lastUsedAt === null) continue;

    const existing = merged.get(slug);
    if (existing) {
      merged.set(slug, {
        slug,
        opens: Math.min(existing.opens + opens, MAX_USAGE_OPENS),
        lastUsedAt: Math.max(existing.lastUsedAt, lastUsedAt),
      });
    } else {
      merged.set(slug, { slug, opens, lastUsedAt });
    }
  }

  return [...merged.values()]
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .slice(0, max);
}

/** Parse JSON localStorage dengan aman; nilai rusak dianggap kosong. */
export function parseStoredToolUsage(
  raw: string | null,
  tools: readonly ToolDefinition[],
  max = MAX_USAGE_ENTRIES,
): ToolUsageEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? sanitizeToolUsageEntries(parsed, tools, max)
      : [];
  } catch {
    return [];
  }
}

/** Serialisasi entri (sudah bersih) untuk localStorage. */
export function serializeToolUsage(entries: readonly ToolUsageEntry[]): string {
  return JSON.stringify(entries);
}

/**
 * Catat satu pembukaan workspace.
 *
 * Entri yang diperbarui selalu diletakkan paling depan. Slug tak dikenal atau
 * tool yang belum tersedia diabaikan (tidak membuat link mati).
 */
export function recordToolUsage(
  entries: readonly ToolUsageEntry[],
  slug: string,
  tools: readonly ToolDefinition[],
  now: number = Date.now(),
): ToolUsageEntry[] {
  const key = normalizeSlug(slug);
  if (!key || !isAvailableTool(key, tools)) return [...entries];

  const timestamp = sanitizeTimestamp(now) ?? Date.now();
  const existing = entries.find((entry) => entry.slug === key);

  const updated: ToolUsageEntry = existing
    ? {
        slug: key,
        opens: Math.min(existing.opens + 1, MAX_USAGE_OPENS),
        lastUsedAt: timestamp,
      }
    : { slug: key, opens: 1, lastUsedAt: timestamp };

  return [updated, ...entries.filter((entry) => entry.slug !== key)].slice(
    0,
    MAX_USAGE_ENTRIES,
  );
}

/** Total pembukaan seluruh tool (untuk statistik lokal). */
export function totalToolOpens(entries: readonly ToolUsageEntry[]): number {
  return entries.reduce((total, entry) => total + entry.opens, 0);
}

/**
 * Ranking "sering dibuka": `opens` desc → `lastUsedAt` desc → urutan registry.
 * Slug yang tidak dikenal / tidak tersedia dilewati.
 */
export function rankFrequentTools(
  entries: readonly ToolUsageEntry[],
  tools: readonly ToolDefinition[],
  limit = 3,
): FrequentTool[] {
  const ranked = entries.flatMap((entry) => {
    const tool = isAvailableTool(entry.slug, tools);
    if (!tool) return [];
    return [{ tool, opens: entry.opens, lastUsedAt: entry.lastUsedAt }];
  });

  return ranked
    .sort((a, b) => {
      if (b.opens !== a.opens) return b.opens - a.opens;
      if (b.lastUsedAt !== a.lastUsedAt) return b.lastUsedAt - a.lastUsedAt;
      return tools.indexOf(a.tool) - tools.indexOf(b.tool);
    })
    .slice(0, Math.max(0, limit));
}

/** Cari entri pemakaian untuk satu slug. */
export function findToolUsage(
  entries: readonly ToolUsageEntry[],
  slug: string,
): ToolUsageEntry | null {
  const key = normalizeSlug(slug);
  return entries.find((entry) => entry.slug === key) ?? null;
}

const MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

/**
 * Waktu relatif berbahasa Indonesia. Timestamp tidak valid menghasilkan string
 * kosong agar UI bisa memilih tidak menampilkan apa pun.
 */
export function formatRelativeTime(
  timestamp: number,
  now: number = Date.now(),
): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "";
  if (!Number.isFinite(now)) return "";

  const diff = now - timestamp;
  if (diff < 60_000) return "baru saja";

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(diff / 86_400_000);
  if (days < 7) return `${days} hari lalu`;

  const date = new Date(timestamp);
  const day = date.getDate();
  const month = MONTHS_ID[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Slug tool aktif dari pathname workspace.
 *
 * Hanya `/tools/{slug}` satu segmen. `/tools/ruang`, `/tools/panduan`,
 * `/tools/panduan/{slug}`, dan path lain mengembalikan `null`.
 */
export function getActiveToolSlug(
  pathname: string | null | undefined,
  tools: readonly ToolDefinition[],
): string | null {
  if (!pathname) return null;
  const clean = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "");
  const prefix = "/tools/";
  if (!clean.startsWith(prefix)) return null;

  const rest = clean.slice(prefix.length);
  if (!rest || rest.includes("/")) return null;
  if (rest === "ruang" || rest === "panduan") return null;

  const tool = isAvailableTool(rest.toLowerCase(), tools);
  return tool ? tool.slug : null;
}
