/**
 * LOGIKA MURNI discovery LKTech Tools.
 *
 * Mencakup state katalog di URL, penyimpanan recent/favorites di localStorage
 * (hanya slug — tanpa berkas/isi), dan resolusi slug ke registry.
 *
 * Modul ini sengaja TIDAK mengimpor registry saat runtime agar dapat diuji Node
 * lewat `--experimental-strip-types` (Node tidak me-resolve impor tanpa
 * ekstensi). Semua fungsi yang butuh registry menerima `tools` sebagai argumen;
 * tipe registry diimpor sebagai `import type` (dihapus saat runtime).
 */

import type {
  ToolCategoryFilter,
  ToolDefinition,
} from "./tools-registry-pure";

/** Nama parameter URL katalog. */
export const TOOLS_CATALOG_QUERY_KEY = "q";
export const TOOLS_CATALOG_CATEGORY_KEY = "kategori";

/** Kunci localStorage (versi eksplisit agar mudah dimigrasikan). */
export const TOOLS_RECENT_STORAGE_KEY = "lktech.tools.recent.v1";
export const TOOLS_FAVORITES_STORAGE_KEY = "lktech.tools.favorites.v1";

/** Batas data lokal agar tidak tumbuh tanpa kendali. */
export const MAX_RECENT_TOOLS = 3;
export const MAX_FAVORITE_TOOLS = 50;

/**
 * Daftar kategori yang dikenal parser URL. Nilainya harus sama dengan
 * `TOOL_CATEGORIES` di registry — dijaga oleh test discovery.
 */
export const DISCOVERY_TOOL_CATEGORIES = [
  "warna",
  "gambar",
  "pdf",
  "produktivitas",
] as const;

/** Objek minimal yang kompatibel dengan `URLSearchParams` & `ReadonlyURLSearchParams`. */
export type SearchParamsLike = {
  get(name: string): string | null;
};

/** State katalog yang bisa direpresentasikan di URL. */
export type ToolsCatalogState = {
  q: string;
  category: ToolCategoryFilter;
};

/** Validasi kategori dari URL; nilai tak dikenal kembali ke "semua". */
export function parseToolsCategory(value?: string | null): ToolCategoryFilter {
  const key = (value ?? "").trim().toLowerCase();
  if (key === "semua" || key === "") return "semua";
  return (DISCOVERY_TOOL_CATEGORIES as readonly string[]).includes(key)
    ? (key as ToolCategoryFilter)
    : "semua";
}

/** Baca state katalog dari query string. Query dipangkas agar URL tetap rapi. */
export function parseToolsCatalogParams(
  params: SearchParamsLike,
): ToolsCatalogState {
  return {
    q: (params.get(TOOLS_CATALOG_QUERY_KEY) ?? "").trim(),
    category: parseToolsCategory(params.get(TOOLS_CATALOG_CATEGORY_KEY)),
  };
}

/**
 * Bangun query string katalog. Mengembalikan string kosong bila state default,
 * sehingga URL `/tools/ruang` tetap bersih.
 */
export function buildToolsCatalogQuery(state: ToolsCatalogState): string {
  const params = new URLSearchParams();
  const q = state.q.trim();
  if (q) params.set(TOOLS_CATALOG_QUERY_KEY, q);
  if (state.category !== "semua") {
    params.set(TOOLS_CATALOG_CATEGORY_KEY, state.category);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** URL lengkap ruang dengan state katalog. */
export function buildToolsCatalogHref(
  state: ToolsCatalogState,
  base = "/tools/ruang",
): string {
  return `${base}${buildToolsCatalogQuery(state)}`;
}

/** Apakah dua state katalog sama (untuk menghindari navigasi berulang). */
export function isSameToolsCatalogState(
  a: ToolsCatalogState,
  b: ToolsCatalogState,
): boolean {
  return a.q.trim() === b.q.trim() && a.category === b.category;
}

/** Cari tool tersedia berdasarkan slug (case-insensitive). */
function findAvailableTool(
  slug: string,
  tools: readonly ToolDefinition[],
): ToolDefinition | null {
  const key = slug.trim().toLowerCase();
  if (!key) return null;
  const tool = tools.find((t) => t.slug === key);
  return tool && tool.status === "tersedia" ? tool : null;
}

/** Ambil slug unik yang valid dari array mentah. */
export function sanitizeToolSlugs(
  values: readonly unknown[],
  tools: readonly ToolDefinition[],
  max = MAX_FAVORITE_TOOLS,
): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const key = value.trim().toLowerCase();
    if (!key || out.includes(key)) continue;
    if (!findAvailableTool(key, tools)) continue;
    out.push(key);
    if (out.length >= max) break;
  }
  return out;
}

/** Parse JSON localStorage dengan aman; nilai rusak dianggap kosong. */
export function parseStoredToolSlugs(
  raw: string | null,
  tools: readonly ToolDefinition[],
  max = MAX_FAVORITE_TOOLS,
): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? sanitizeToolSlugs(parsed, tools, max) : [];
  } catch {
    return [];
  }
}

/** Serialisasi daftar slug (sudah unik & valid) untuk localStorage. */
export function serializeToolSlugs(slugs: readonly string[]): string {
  return JSON.stringify(slugs);
}

/** Tambahkan slug ke daftar recent paling depan, tanpa duplikat. */
export function addRecentToolSlug(
  existing: readonly string[],
  slug: string,
  max = MAX_RECENT_TOOLS,
): string[] {
  const key = slug.trim().toLowerCase();
  if (!key) return [...existing];
  return [key, ...existing.filter((s) => s !== key)].slice(0, max);
}

/** Toggle slug favorit (tambah bila belum ada, hapus bila sudah ada). */
export function toggleFavoriteToolSlug(
  existing: readonly string[],
  slug: string,
  max = MAX_FAVORITE_TOOLS,
): string[] {
  const key = slug.trim().toLowerCase();
  if (!key) return [...existing];
  if (existing.includes(key)) return existing.filter((s) => s !== key);
  return [key, ...existing].slice(0, max);
}

/** Resolve slug menjadi tool tersedia, mempertahankan urutan input. */
export function resolveToolsBySlugs(
  slugs: readonly string[],
  tools: readonly ToolDefinition[],
): ToolDefinition[] {
  return slugs.flatMap((slug) => {
    const tool = findAvailableTool(slug, tools);
    return tool ? [tool] : [];
  });
}

/** Filter katalog berdasarkan state + daftar favorit (opsional). */
export function filterCatalogTools(
  state: ToolsCatalogState,
  options: {
    tools: readonly ToolDefinition[];
    favorites?: readonly string[];
    favoritesOnly?: boolean;
  },
): ToolDefinition[] {
  const favorites = options.favorites ?? [];
  const query = state.q.trim().toLowerCase();

  return options.tools.filter((tool) => {
    if (tool.status !== "tersedia") return false;
    if (state.category !== "semua" && tool.category !== state.category) {
      return false;
    }
    if (options.favoritesOnly && !favorites.includes(tool.slug)) return false;
    if (!query) return true;
    const haystack = [
      tool.name,
      tool.summary,
      tool.description,
      ...tool.keywords,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}
