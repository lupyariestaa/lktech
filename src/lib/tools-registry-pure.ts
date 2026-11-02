/**
 * REGISTRY & LOGIKA MURNI katalog LKTech Tools.
 *
 * Bebas impor runtime (tanpa alias `@/`) agar dapat diuji Node lewat
 * `--experimental-strip-types`. Registry ini HANYA metadata untuk katalog UI —
 * JANGAN dipakai sebagai kontrol otorisasi. Akses halaman tetap dijaga
 * `UserGuard`; bila kelak ada API, endpoint wajib `requireUser` di server.
 */

/** Kategori tool. Urutan ini dipakai untuk chip filter. */
export const TOOL_CATEGORIES = ["warna", "gambar", "pdf", "produktivitas"] as const;
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

/** Filter kategori pada katalog (boleh "semua"). */
export type ToolCategoryFilter = ToolCategory | "semua";

export const TOOL_CATEGORY_LABEL: Record<ToolCategory, string> = {
  warna: "Warna",
  gambar: "Gambar",
  pdf: "PDF",
  produktivitas: "Produktivitas",
};

/** Status ketersediaan tool di katalog. */
export type ToolStatus = "tersedia" | "segera";

export type ToolDefinition = {
  /** Slug URL: `/tools/{slug}`. Unik. */
  slug: string;
  name: string;
  /** Ringkasan satu baris untuk kartu. */
  summary: string;
  /** Deskripsi lebih panjang untuk halaman workspace. */
  description: string;
  category: ToolCategory;
  status: ToolStatus;
  /** Kata kunci tambahan untuk pencarian. */
  keywords: readonly string[];
  /** Nama ikon lucide (dipetakan di komponen `tool-icon.tsx`). */
  icon: string;
  /** Apakah proses sepenuhnya lokal di browser (tanpa unggah). */
  local: boolean;
  /** Catatan privasi singkat yang ditampilkan di workspace. */
  privacyNote: string;
};

/**
 * Registry tool. Urutan = urutan tampil di katalog (tool tersedia lebih dulu).
 * Tambahkan tool baru di sini + komponennya, tanpa mengubah katalog.
 */
export const TOOLS: readonly ToolDefinition[] = [
  {
    slug: "color-picker",
    name: "Color Picker",
    summary: "Pilih warna, atur HSL/alfa, lalu salin HEX, RGB, atau HSL.",
    description:
      "Pilih warna dari kontrol visual atau masukkan kode warna, atur kepekatan (alfa), lalu salin nilainya untuk dipakai di desain atau kode.",
    category: "warna",
    status: "tersedia",
    keywords: ["warna", "color", "hex", "rgb", "hsl", "palet", "picker"],
    icon: "Palette",
    local: true,
    privacyNote:
      "Nilai warna diproses di browser Anda dan tidak dikirim ke server.",
  },
  {
    slug: "image-to-webp",
    name: "Gambar ke WebP",
    summary: "Ubah PNG/JPG lokal menjadi WebP dengan kontrol kualitas.",
    description:
      "Pilih satu gambar lokal, atur kualitas dan batas dimensi, lalu unduh hasil WebP. Gambar tidak diunggah ke server.",
    category: "gambar",
    status: "tersedia",
    keywords: ["webp", "gambar", "image", "konversi", "kompres", "png", "jpg", "jpeg"],
    icon: "ImageDown",
    local: true,
    privacyNote:
      "Gambar diproses di browser Anda; tidak ada berkas yang diunggah atau disimpan.",
  },
  {
    slug: "image-to-pdf",
    name: "Gambar ke PDF",
    summary: "Susun beberapa gambar menjadi satu berkas PDF.",
    description:
      "Pilih hingga 20 gambar, atur urutan dan ukuran halaman, lalu unduh PDF gabungan. Semua proses berjalan lokal di browser.",
    category: "pdf",
    status: "tersedia",
    keywords: ["pdf", "gambar", "image", "jpg", "png", "gabung", "dokumen"],
    icon: "FileText",
    local: true,
    privacyNote:
      "Gambar dan PDF dibuat di browser Anda; tidak ada berkas yang dikirim ke server.",
  },
  {
    slug: "text-formatter",
    name: "Formatter Teks",
    summary: "Rapikan JSON (pretty/minify) dan bersihkan spasi teks.",
    description:
      "Validasi & format ulang JSON dengan indentasi pilihan atau jadikan satu baris, serta rapikan spasi dan baris kosong pada teks biasa. Semua diproses lokal di browser.",
    category: "produktivitas",
    status: "tersedia",
    keywords: ["teks", "json", "format", "minify", "pretty", "rapikan", "validasi"],
    icon: "Braces",
    local: true,
    privacyNote:
      "Teks diproses di browser Anda; tidak ada isi yang dikirim atau disimpan di server.",
  },
  {
    slug: "pdf-to-image",
    name: "PDF ke Gambar",
    summary: "Render halaman PDF menjadi gambar PNG/JPG.",
    description:
      "Pilih berkas PDF, atur format, resolusi, dan rentang halaman, lalu unduh gambar tiap halaman. PDF tidak diunggah ke server.",
    category: "pdf",
    status: "tersedia",
    keywords: ["pdf", "gambar", "image", "render", "png", "jpg", "konversi", "halaman"],
    icon: "Images",
    local: true,
    privacyNote:
      "PDF diproses di browser Anda; tidak ada berkas yang diunggah atau disimpan di server.",
  },
];

/** Normalisasi kata kunci pencarian (trim + lowercase). */
export function normalizeToolQuery(q?: string): string {
  return (q ?? "").trim().toLowerCase();
}

/** Filter pencarian/kategori tool. */
export type ToolQueryFilter = {
  q?: string;
  category?: ToolCategoryFilter;
};

/**
 * Apakah tool cocok dengan kata kunci & kategori.
 * - `category` kosong/`"semua"` → tanpa filter kategori.
 * - Kata kunci dicocokkan sebagai substring pada nama, ringkasan, deskripsi,
 *   dan kata kunci.
 */
export function matchesToolQuery(
  tool: ToolDefinition,
  filter: ToolQueryFilter = {},
): boolean {
  const category = filter.category ?? "semua";
  if (category !== "semua" && tool.category !== category) return false;

  const q = normalizeToolQuery(filter.q);
  if (!q) return true;

  const haystack = [
    tool.name,
    tool.summary,
    tool.description,
    ...tool.keywords,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

/** Saring daftar tool (mempertahankan urutan registry). */
export function filterTools(
  tools: readonly ToolDefinition[],
  filter: ToolQueryFilter = {},
): ToolDefinition[] {
  return tools.filter((tool) => matchesToolQuery(tool, filter));
}

/** Cari tool berdasarkan slug (case-insensitive). */
export function getToolBySlug(
  slug: string,
  tools: readonly ToolDefinition[] = TOOLS,
): ToolDefinition | null {
  const key = slug.trim().toLowerCase();
  return tools.find((tool) => tool.slug === key) ?? null;
}

/** Hitung jumlah tool per kategori (untuk label chip). */
export function countToolsByCategory(
  tools: readonly ToolDefinition[] = TOOLS,
): Record<ToolCategory, number> {
  const counts = Object.fromEntries(
    TOOL_CATEGORIES.map((c) => [c, 0]),
  ) as Record<ToolCategory, number>;
  for (const tool of tools) counts[tool.category] += 1;
  return counts;
}

/** Daftar slug tool yang tersedia (untuk `generateStaticParams`). */
export function availableToolSlugs(
  tools: readonly ToolDefinition[] = TOOLS,
): string[] {
  return tools.filter((tool) => tool.status === "tersedia").map((t) => t.slug);
}