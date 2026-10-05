import type {
  Product,
  ProductCategory,
  ProductDownloadable,
  ProductDownloadFile,
  ProductFeature,
  ProductProcessStep,
  ProductSpec,
  ProductVariant,
  StoredProduct,
} from "@/lib/product-types";
import { normalizeRatingSummary } from "@/lib/review-types";

/** Normalisasi `ratingSummary` produk (FASE R) — re-export tipe aman-klien. */
function normalizeProductRatingSummary(
  v: unknown,
): Product["ratingSummary"] {
  return normalizeRatingSummary(v);
}

export type {
  Product,
  ProductCategory,
  ProductDownloadable,
  ProductDownloadFile,
  ProductFeature,
  ProductProcessStep,
  ProductSpec,
  ProductVariant,
  StoredProduct,
};

const COLLECTION = "products";

/** Produk contoh (dipakai bila Firestore kosong / belum dikonfigurasi). */
export const DEFAULT_PRODUCTS: Product[] = [
  {
    slug: "template-landing-page-bisnis",
    name: "Template Landing Page Bisnis",
    tagline: "Landing page modern siap pakai, tinggal ganti konten.",
    description:
      "Template landing page profesional yang dirancang untuk konversi. Sudah responsif, cepat, dan SEO-friendly. Cocok untuk UMKM, startup, atau personal brand yang ingin tampil online dengan cepat tanpa menguras biaya.",
    category: "template",
    price: 149000,
    originalPrice: 299000,
    cover: "default",
    gallery: [],
    badge: "Terlaris",
    features: [
      {
        title: "Desain Modern",
        description: "Tampilan clean & profesional, siap mengesankan klien.",
      },
      {
        title: "Fully Responsive",
        description: "Optimal di HP, tablet, dan desktop.",
      },
      {
        title: "SEO-Friendly",
        description: "Struktur heading & meta yang rapi untuk mesin pencari.",
      },
      {
        title: "Mudah Dikustom",
        description: "Konten & warna mudah diubah tanpa coding rumit.",
      },
    ],
    specs: [
      { label: "Teknologi", value: "Next.js + Tailwind CSS" },
      { label: "Halaman", value: "1 halaman (long-form)" },
      { label: "Responsif", value: "Ya" },
      { label: "Format", value: "Source code (.zip)" },
    ],
    tools: ["Next.js", "Tailwind CSS", "TypeScript"],
    includes: [
      "Source code lengkap",
      "Panduan pemasangan (PDF)",
      "1x konsultasi via chat",
      "Update gratis 3 bulan",
    ],
    delivery: "Instan (download)",
    process: [],
    notes: [],
    variants: [],
    soldOut: false,
    featured: true,
    active: true,
  },
  {
    slug: "aplikasi-kasir-sederhana",
    name: "Aplikasi Kasir Sederhana",
    tagline: "Catat penjualan & stok tanpa ribet.",
    description:
      "Aplikasi kasir ringan untuk warung, kafe, dan toko kecil. Bisa mencatat transaksi, mengelola stok, dan membuat laporan harian. Bekerja offline di browser dan bisa diakses dari HP.",
    category: "software",
    price: 499000,
    cover: "default",
    gallery: [],
    badge: "Baru",
    features: [
      {
        title: "Transaksi Cepat",
        description: "Antarmuka sederhana, cocok untuk kasir baru.",
      },
      {
        title: "Kelola Stok",
        description: "Stok berkurang otomatis setiap penjualan.",
      },
      {
        title: "Laporan Harian",
        description: "Rekap penjualan per hari & per produk.",
      },
    ],
    specs: [
      { label: "Platform", value: "Web (offline-first)" },
      { label: "Data", value: "Tersimpan lokal" },
      { label: "Lisensi", value: "1 usaha" },
    ],
    tools: ["React", "IndexedDB", "Tailwind CSS"],
    includes: [
      "Aplikasi siap pakai",
      "Panduan penggunaan",
      "Setup & pendampingan awal",
    ],
    delivery: "Instalasi jarak jauh (1-2 hari)",
    process: [],
    notes: [],
    variants: [],
    soldOut: false,
    featured: true,
    active: true,
  },
];

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Normalisasi sisa stok (FASE P4). Menerima angka ≥ 0; selain itu → undefined
 * (stok tak diketahui / tak dibatasi). Dibulatkan ke bawah.
 */
function normalizeStock(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return undefined;
  return Math.floor(v);
}

/** Normalisasi daftar fitur `{ title, description }`. */
function normalizeFeatures(v: unknown): ProductFeature[] {
  return Array.isArray(v)
    ? v
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .map((x) => ({
          title: str(x.title),
          description: str(x.description),
        }))
        .filter((f) => f.title || f.description)
    : [];
}

/** Normalisasi daftar spesifikasi `{ label, value }`. */
function normalizeSpecs(v: unknown): ProductSpec[] {
  return Array.isArray(v)
    ? v
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .map((x) => ({ label: str(x.label), value: str(x.value) }))
        .filter((s) => s.label || s.value)
    : [];
}

/** Normalisasi daftar langkah alur `{ step, title, description }`. */
function normalizeProcess(v: unknown): ProductProcessStep[] {
  return Array.isArray(v)
    ? v
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .map((x) => ({
          step: str(x.step),
          title: str(x.title),
          description: str(x.description),
        }))
        .filter((s) => s.title || s.description)
    : [];
}

/** Normalisasi satu varian/paket produk. Mengembalikan null bila tak berguna. */
function normalizeVariant(raw: unknown): ProductVariant | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const slug = str(d.slug).trim();
  const name = str(d.name).trim();
  if (!slug || !name) return null;

  const original = num(d.originalPrice, 0);
  return {
    slug,
    name,
    tagline: str(d.tagline) || undefined,
    price: num(d.price, 0),
    originalPrice: original > 0 ? original : undefined,
    badge: str(d.badge) || undefined,
    highlight: Boolean(d.highlight),
    soldOut: Boolean(d.soldOut),
    stock: normalizeStock(d.stock),
    features: normalizeFeatures(d.features),
    specs: normalizeSpecs(d.specs),
    includes: strArr(d.includes),
    limits: strArr(d.limits),
    delivery: str(d.delivery) || undefined,
    waMessage: str(d.waMessage) || undefined,
  };
}

/** Normalisasi konfigurasi unduhan produk digital (opsional). */
function normalizeDownloadable(raw: unknown): ProductDownloadable | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const d = raw as Record<string, unknown>;
  const files: ProductDownloadFile[] = Array.isArray(d.files)
    ? d.files
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .map((x) => ({
          name: str(x.name).trim(),
          url: str(x.url).trim(),
          size: typeof x.size === "number" && Number.isFinite(x.size) ? x.size : undefined,
        }))
        .filter((f) => f.url)
    : [];
  if (!files.length) return undefined;
  const linkDays = num(d.linkDays, 0);
  const maxDownloads = num(d.maxDownloads, 0);
  return {
    enabled: d.enabled === undefined ? true : Boolean(d.enabled),
    files,
    linkDays: linkDays > 0 ? linkDays : undefined,
    maxDownloads: maxDownloads > 0 ? maxDownloads : undefined,
    note: str(d.note).trim() || undefined,
  };
}

function normalizeProduct(data: Record<string, unknown>): Product {
  const variants = Array.isArray(data.variants)
    ? data.variants
        .map(normalizeVariant)
        .filter((v): v is ProductVariant => !!v)
    : [];

  return {
    slug: str(data.slug),
    name: str(data.name),
    tagline: str(data.tagline),
    description: str(data.description),
    category: (str(data.category, "lainnya") as ProductCategory) || "lainnya",
    price: num(data.price, 0),
    originalPrice: num(data.originalPrice, 0) || undefined,
    cover: str(data.cover, "default"),
    coverPublicId: str(data.coverPublicId) || undefined,
    coverAlt: str(data.coverAlt) || undefined,
    gallery: strArr(data.gallery),
    badge: str(data.badge) || undefined,
    features: normalizeFeatures(data.features),
    specs: normalizeSpecs(data.specs),
    tools: strArr(data.tools),
    includes: strArr(data.includes),
    delivery: str(data.delivery) || undefined,
    process: normalizeProcess(data.process),
    notes: strArr(data.notes),
    variants,
    soldOut: Boolean(data.soldOut),
    stock: normalizeStock(data.stock),
    featured: Boolean(data.featured),
    active: data.active === undefined ? true : Boolean(data.active),
    downloadable: normalizeDownloadable(data.downloadable),
    relatedSlugs: normalizeRelatedSlugs(data.relatedSlugs),
    ratingSummary: normalizeProductRatingSummary(data.ratingSummary),
    waMessage: str(data.waMessage) || undefined,
  };
}

/**
 * Normalisasi daftar `relatedSlugs` (FASE P3): buang nilai kosong/duplikat,
 * batasi jumlah, dan JANGAN sertakan slug diri sendiri (dicek oleh pemanggil
 * di UI). Mengembalikan `undefined` bila kosong agar produk lama tetap ringkas.
 */
function normalizeRelatedSlugs(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== "string") continue;
    const s = x.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= 12) break;
  }
  return out.length ? out : undefined;
}

/** Produk yang tampil di publik (aktif), urut: unggulan dulu lalu nama. */
export async function getProducts(): Promise<Product[]> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  // Fallback ke produk contoh HANYA saat Admin SDK belum dikonfigurasi (mode demo).
  // Saat SDK aktif namun koleksi sengaja dikosongkan, kembalikan [] (bukan contoh).
  if (!db) return DEFAULT_PRODUCTS;

  try {
    const snap = await db.collection(COLLECTION).get();
    return snap.docs
      .map((doc) => normalizeProduct(doc.data()))
      .filter((p) => p.active)
      .sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name),
      );
  } catch (err) {
    console.error("[products] gagal memuat:", err);
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) return DEFAULT_PRODUCTS.find((p) => p.slug === slug) ?? null;

  try {
    const doc = await db.collection(COLLECTION).doc(slug).get();
    if (!doc.exists) return null;
    const product = normalizeProduct(doc.data() ?? {});
    return product.active ? product : null;
  } catch (err) {
    console.error("[products] gagal memuat slug:", err);
    return null;
  }
}

export async function getProductSlugs(): Promise<string[]> {
  const products = await getProducts();
  return products.map((p) => p.slug);
}

/** Semua produk untuk dashboard (termasuk yang tidak aktif). */
export async function getStoredProducts(): Promise<StoredProduct[]> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) return DEFAULT_PRODUCTS.map((p) => ({ ...p, id: p.slug }));

  const snap = await db.collection(COLLECTION).get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...normalizeProduct(doc.data()) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Menyimpan (buat/perbarui) produk berdasarkan slug. */
export async function saveProduct(
  product: Product,
  updatedBy: string,
): Promise<void> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");

  // Firestore menolak nilai `undefined` → bersihkan field opsional kosong.
  // Varian juga perlu dibersihkan (field opsional bertingkat).
  const cleanVariants = product.variants.map((v) => {
    const vv: Record<string, unknown> = { ...v };
    for (const key of ["tagline", "originalPrice", "badge", "delivery", "waMessage", "stock"]) {
      if (vv[key] === undefined) delete vv[key];
    }
    return vv;
  });

  const payload: Record<string, unknown> = {
    ...product,
    variants: cleanVariants,
    updatedAtISO: new Date().toISOString(),
    updatedBy,
  };
  // Bersihkan field opsional `undefined` (Firestore menolaknya).
  if (payload.downloadable && typeof payload.downloadable === "object") {
    const d = payload.downloadable as Record<string, unknown>;
    const dl: Record<string, unknown> = { ...d };
    for (const key of ["linkDays", "maxDownloads", "note"]) {
      if (dl[key] === undefined) delete dl[key];
    }
    dl.files = Array.isArray(dl.files)
      ? (dl.files as Array<Record<string, unknown>>).map((f) => {
          const ff: Record<string, unknown> = { ...f };
          if (ff.size === undefined) delete ff.size;
          return ff;
        })
      : [];
    payload.downloadable = dl;
  }
  for (const key of [
    "originalPrice",
    "coverPublicId",
    "badge",
    "delivery",
    "waMessage",
    "downloadable",
    "relatedSlugs",
    "stock",
  ]) {
    if (payload[key] === undefined) delete payload[key];
  }

  await db.collection(COLLECTION).doc(product.slug).set(payload, { merge: true });
}

export async function deleteProductBySlug(slug: string): Promise<void> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  await db.collection(COLLECTION).doc(slug).delete();
}

export async function isProductSlugTaken(slug: string): Promise<boolean> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) return false;
  const doc = await db.collection(COLLECTION).doc(slug).get();
  return doc.exists;
}

/**
 * Mengambil produk berdasarkan sekumpulan slug untuk VERIFIKASI checkout.
 *
 * Berbeda dari `getProductBySlug`, fungsi ini:
 * - TIDAK memakai fallback `DEFAULT_PRODUCTS` (agar order tak dibuat untuk
 *   produk contoh saat koleksi kosong).
 * - Mengembalikan Map slug → produk (tanpa filter `active`), supaya pemanggil
 *   bisa membedakan "tidak ada" vs "nonaktif" dan melaporkan error yang tepat.
 */
export async function getProductsBySlugs(
  slugs: string[],
): Promise<Map<string, Product>> {
  const unique = Array.from(new Set(slugs.filter(Boolean)));
  const result = new Map<string, Product>();
  if (unique.length === 0) return result;

  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) return result;

  // Firestore `in` dibatasi 30 nilai per query → pecah menjadi beberapa batch.
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 30) {
    chunks.push(unique.slice(i, i + 30));
  }

  for (const chunk of chunks) {
    const snap = await db
      .collection(COLLECTION)
      .where("slug", "in", chunk)
      .get();
    for (const doc of snap.docs) {
      const product = normalizeProduct(doc.data());
      // Dokumen juga bisa ditemukan lewat id (slug); pastikan key-nya benar.
      result.set(product.slug || doc.id, product);
    }
  }

  return result;
}

/**
 * Mengambil produk TERKAIT (FASE P3) untuk section "Sering dibeli bersama".
 *
 * Sumber berurutan:
 * 1. `relatedSlugs` milik produk (manual, admin) — hanya yang AKTIF.
 * 2. Bila kurang dari `limit` → lengkapi dengan produk lain sekategori
 *    (fallback otomatis, agar section tidak pernah kosong), kecuali `exclude`.
 *
 * Mengembalikan maksimal `limit` produk, tanpa duplikat, tanpa produk yang
 * dikecualikan (mis. produk itu sendiri / yang sudah ada di keranjang).
 */
export async function getRelatedProducts(
  product: Pick<Product, "slug" | "category" | "relatedSlugs">,
  opts: { limit?: number; exclude?: Iterable<string> } = {},
): Promise<Product[]> {
  const limit = Math.max(1, opts.limit ?? 3);
  const exclude = new Set<string>([product.slug, ...(opts.exclude ?? [])]);

  const all = await getProducts(); // hanya aktif, urut unggulan→nama
  const bySlug = new Map(all.map((p) => [p.slug, p]));

  const picked: Product[] = [];
  const push = (p: Product | undefined) => {
    if (!p || exclude.has(p.slug) || picked.some((x) => x.slug === p.slug)) return;
    if (picked.length < limit) picked.push(p);
  };

  // 1) Manual (urutan sesuai `relatedSlugs`).
  for (const slug of product.relatedSlugs ?? []) {
    push(bySlug.get(slug));
    if (picked.length >= limit) break;
  }

  // 2) Fallback: kategori sama.
  if (picked.length < limit) {
    for (const p of all) {
      if (p.category !== product.category) continue;
      push(p);
      if (picked.length >= limit) break;
    }
  }

  return picked;
}
