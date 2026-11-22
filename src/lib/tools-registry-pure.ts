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

/** Format ringkas input → output untuk kartu & header workspace. */
export type ToolFormat = {
  from: string;
  to: string;
};

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
  /** Format ringkas yang ditampilkan di kartu/workspace. */
  format: ToolFormat;
  /** Batas operasional ringkas (jujur, satu sumber untuk tampilan). */
  limitLabel: string;
  /** Slug tool lain yang relevan untuk ditawarkan setelah selesai. */
  related: readonly string[];
  /** Penanda editorial untuk badge "Baru" (bukan tanggal otomatis). */
  isNew?: boolean;
};

/**
 * Registry tool. Urutan = urutan tampil di katalog (tool tersedia lebih dulu).
 * Tambahkan tool baru di sini + komponennya, tanpa mengubah katalog.
 */
export const TOOLS: readonly ToolDefinition[] = [
  {
    slug: "color-picker",
    name: "Color Studio",
    summary: "Ambil warna dari gambar, buat palet, cek kontras, dan salin kode warna.",
    description:
      "Pilih warna dari kontrol visual atau gambar lokal, ekstrak palet representatif, periksa kontras teks, buat gradient, lalu salin nilainya untuk desain atau kode.",
    category: "warna",
    status: "tersedia",
    keywords: ["warna", "color", "hex", "rgb", "hsl", "palet", "picker", "kontras", "gradient", "gambar"],
    icon: "Palette",
    local: true,
    privacyNote:
      "Warna dan gambar lokal diproses di browser Anda; tidak ada berkas yang diunggah atau disimpan.",
    format: { from: "Warna / gambar lokal", to: "HEX, RGB, HSL, CSS" },
    limitLabel: "Gambar maks. 15 MB · diproses lokal",
    related: ["text-formatter"],
  },
  {
    slug: "image-to-webp",
    name: "Gambar ke WebP",
    summary:
      "Ubah banyak gambar lokal ke WebP berurutan, lalu unduh satu per satu atau sebagai ZIP.",
    description:
      "Pilih hingga 30 gambar lokal, atur kualitas dan batas dimensi, lalu proses berurutan. Setiap hasil diverifikasi sebagai WebP statis sebelum dapat diunduh, dan semua gambar tetap di browser Anda.",
    category: "gambar",
    status: "tersedia",
    keywords: [
      "webp",
      "gambar",
      "image",
      "konversi",
      "kompres",
      "batch",
      "zip",
      "png",
      "jpg",
      "jpeg",
    ],
    icon: "ImageDown",
    local: true,
    privacyNote:
      "Gambar diproses di browser Anda; tidak ada berkas yang diunggah atau disimpan.",
    format: { from: "PNG, JPG, WebP, GIF, BMP, AVIF", to: "WebP + ZIP" },
    limitLabel: "Hingga 30 berkas · 15 MB/berkas · total 100 MB",
    related: ["image-to-pdf", "pdf-to-image"],
  },
  {
    slug: "webp-to-image",
    name: "WebP ke Gambar",
    summary: "Ubah banyak WebP lokal ke PNG, JPG, GIF, BMP, atau AVIF, lalu unduh satu per satu atau sebagai ZIP.",
    description:
      "Pilih hingga 20 WebP statis, tentukan format keluaran, lalu proses berurutan. Setiap hasil diverifikasi signature sebelum dapat diunduh. Semua proses lokal di browser.",
    category: "gambar",
    status: "tersedia",
    keywords: ["webp", "png", "jpg", "jpeg", "gif", "bmp", "avif", "gambar", "konversi", "batch", "zip"],
    icon: "Images",
    local: true,
    privacyNote:
      "WebP dibaca dan dikonversi di browser Anda; tidak ada berkas yang diunggah atau disimpan di server.",
    format: { from: "WebP statis", to: "PNG, JPG, GIF, BMP, AVIF + ZIP" },
    limitLabel: "Hingga 20 berkas · 15 MB/berkas · total 80 MB · WebP statis",
    related: ["image-to-webp", "pdf-to-image"],
    isNew: true,
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
    format: { from: "JPG, PNG", to: "PDF" },
    limitLabel: "Maks. 20 gambar · 15 MB/gambar",
    related: ["pdf-to-image", "image-to-webp"],
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
    format: { from: "JSON / teks", to: "JSON rapi / teks bersih" },
    limitLabel: "Maks. 2 juta karakter",
    related: ["color-picker"],
    isNew: true,
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
    format: { from: "PDF", to: "PNG, JPG" },
    limitLabel: "Maks. 25 MB · 30 halaman",
    related: ["image-to-webp", "image-to-pdf"],
    isNew: true,
  },
];

/**
 * Pintu masuk berbasis kebutuhan. Setiap intent menunjuk ke tool `tersedia`.
 * Teks sengaja berupa masalah pengguna, bukan nama fitur.
 */
export type ToolIntent = {
  id: string;
  problem: string;
  action: string;
  toolSlug: string;
  icon: string;
};

export const TOOL_INTENTS: readonly ToolIntent[] = [
  {
    id: "kompres-gambar",
    problem: "Gambar terlalu besar",
    action: "Kompres ke WebP",
    toolSlug: "image-to-webp",
    icon: "ImageDown",
  },
  {
    id: "gabung-foto-pdf",
    problem: "Foto perlu jadi satu PDF",
    action: "Gabung jadi PDF",
    toolSlug: "image-to-pdf",
    icon: "FileText",
  },
  {
    id: "ambil-warna",
    problem: "Butuh warna dari referensi",
    action: "Ambil kode warna",
    toolSlug: "color-picker",
    icon: "Palette",
  },
  {
    id: "rapikan-teks",
    problem: "JSON atau teks berantakan",
    action: "Rapikan teks",
    toolSlug: "text-formatter",
    icon: "Braces",
  },
  {
    id: "pecah-pdf",
    problem: "PDF perlu jadi gambar",
    action: "Pecah PDF jadi PNG",
    toolSlug: "pdf-to-image",
    icon: "Images",
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

/** Apakah tool bisa dibuka di workspace. */
export function isToolAvailable(tool: ToolDefinition): boolean {
  return tool.status === "tersedia";
}

/** URL workspace tool (login-gated). */
export function toolWorkspaceHref(slug: string): string {
  return `/tools/${slug}`;
}

/** URL panduan publik tool (indexable, tanpa login). */
export function toolGuideHref(slug: string): string {
  return `/tools/panduan/${slug}`;
}

/**
 * Tool terkait yang valid & tersedia. Registry boleh menyebut slug yang belum
 * ada; fungsi ini menyaringnya agar UI tidak pernah menautkan 404.
 */
export function getRelatedTools(
  tool: ToolDefinition,
  tools: readonly ToolDefinition[] = TOOLS,
): ToolDefinition[] {
  return tool.related
    .map((slug) => getToolBySlug(slug, tools))
    .filter(
      (related): related is ToolDefinition =>
        related !== null && related.status === "tersedia",
    );
}

/**
 * Pasangkan intent dengan tool yang tersedia. Intent yang menunjuk ke tool
 * tidak tersedia akan diabaikan (tidak ada tautan mati).
 */
export function resolveToolIntents(
  intents: readonly ToolIntent[] = TOOL_INTENTS,
  tools: readonly ToolDefinition[] = TOOLS,
): Array<{ intent: ToolIntent; tool: ToolDefinition }> {
  return intents.flatMap((intent) => {
    const tool = getToolBySlug(intent.toolSlug, tools);
    if (!tool || tool.status !== "tersedia") return [];
    return [{ intent, tool }];
  });
}
