import type {
  Product,
  ProductCategory,
  ProductFeature,
  ProductSpec,
  StoredProduct,
} from "@/lib/product-types";

export type { Product, ProductCategory, ProductFeature, ProductSpec, StoredProduct };

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

function normalizeProduct(data: Record<string, unknown>): Product {
  const features = Array.isArray(data.features)
    ? (data.features as ProductFeature[]).filter(
        (f) => f && typeof f.title === "string",
      )
    : [];
  const specs = Array.isArray(data.specs)
    ? (data.specs as ProductSpec[]).filter(
        (s) => s && typeof s.label === "string",
      )
    : [];

  return {
    slug: str(data.slug),
    name: str(data.name),
    tagline: str(data.tagline),
    description: str(data.description),
    category: (str(data.category, "lainnya") as ProductCategory) || "lainnya",
    price: typeof data.price === "number" ? data.price : Number(data.price) || 0,
    originalPrice:
      typeof data.originalPrice === "number"
        ? data.originalPrice
        : Number(data.originalPrice) || undefined,
    cover: str(data.cover, "default"),
    coverPublicId: str(data.coverPublicId) || undefined,
    gallery: strArr(data.gallery),
    badge: str(data.badge) || undefined,
    features,
    specs,
    tools: strArr(data.tools),
    includes: strArr(data.includes),
    delivery: str(data.delivery) || undefined,
    soldOut: Boolean(data.soldOut),
    featured: Boolean(data.featured),
    active: data.active === undefined ? true : Boolean(data.active),
    waMessage: str(data.waMessage) || undefined,
  };
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
  const payload: Record<string, unknown> = {
    ...product,
    updatedAtISO: new Date().toISOString(),
    updatedBy,
  };
  for (const key of ["originalPrice", "coverPublicId", "badge", "delivery", "waMessage"]) {
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
