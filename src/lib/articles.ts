import type { Article, StoredArticle } from "@/lib/article-types";

export type { Article, StoredArticle };

const COLLECTION = "articles";

/** Artikel default (contoh) agar blog tidak kosong saat pertama. */
export const DEFAULT_ARTICLES: Article[] = [
  {
    slug: "kenapa-bisnis-butuh-website-2026",
    title: "Kenapa Bisnis Anda Butuh Website di 2026?",
    excerpt:
      "Media sosial saja tidak cukup. Website memberi kredibilitas, kontrol penuh, dan mesin konversi 24 jam untuk bisnis Anda.",
    body: `Banyak pelaku usaha masih mengandalkan media sosial sebagai satu-satunya kehadiran digital. Padahal, ada batas jelas dari pendekatan itu.

## Masalah utama media sosial saja

- **Anda tidak memiliki kendalinya.** Algoritma berubah, akun bisa dibatasi kapan saja.
- **Jangkauan terbatas.** Postingan tenggelam dalam hitungan jam.
- **Sulit dipercaya.** Calon klien sering mencari nama bisnis di Google dan tidak menemukannya.

## Apa yang website berikan

Website adalah **rumah digital** Anda. Ia bekerja 24 jam menyambut calon pelanggan, menjelaskan produk, dan mengarahkan mereka untuk menghubungi Anda.

### 1. Kredibilitas
Website profesional membuat bisnis tampak serius dan terpercaya.

### 2. Kontrol penuh
Anda menentukan tampilan, isi, dan alur — tanpa dibatasi algoritma platform lain.

### 3. Mesin konversi
Dengan alur yang tepat, website mengubah pengunjung menjadi calon klien.

## Mulai dari mana?

Tidak perlu langsung sempurna. Mulai dari satu halaman yang jelas: siapa Anda, apa yang Anda tawarkan, dan bagaimana cara menghubungi Anda.

---

Butuh bantuan membuat website untuk bisnis Anda? **Konsultasi gratis** dengan tim LKTech.`,
    category: "Bisnis Digital",
    tags: ["website", "umkm", "strategi digital"],
    cover: "why-website",
    author: "LKTech",
    status: "published",
    publishedAt: "2026-01-15T08:00:00.000Z",
  },
  {
    slug: "cara-memilih-jasa-pembuatan-website",
    title: "Cara Memilih Jasa Pembuatan Website yang Tepat",
    excerpt:
      "Harga bukan satu-satunya pertimbangan. Ini faktor penting sebelum Anda mempercayakan website bisnis ke sebuah jasa.",
    body: `Memilih jasa pembuatan website bisa membingungkan — begitu banyak penawaran dengan harga yang sangat bervariasi.

## 1. Jelas soal kebutuhan

Sebelum mencari vendor, tentukan dulu: website profil, toko online, atau web aplikasi? Semakin jelas kebutuhan, semakin mudah menilai penawaran.

## 2. Lihat portofolio, bukan hanya harga

Harga murah tidak berarti apa-apa jika hasilnya sulit digunakan. Perhatikan kualitas desain, kecepatan, dan kerapian struktur situs.

## 3. Tanyakan kepemilikan

Pastikan Anda memegang **akses penuh** atas domain, hosting, dan kode. Jangan sampai bergantung selamanya pada satu vendor tanpa kontrol.

## 4. Pahami perawatan

Website perlu pembaruan. Tanyakan apakah ada dukungan setelah rilis, dan bagaimana skemanya.

## 5. Komunikasi

Vendor terbaik adalah yang mau mendengarkan dan menjelaskan dengan bahasa yang mudah dipahami — bukan yang penuh jargon.

---

LKTech mengedepankan komunikasi jujur, transparan, dan hasil yang rapi. Mari diskusikan kebutuhan Anda.`,
    category: "Panduan",
    tags: ["jasa website", "tips", "vendor"],
    cover: "choose-vendor",
    author: "LKTech",
    status: "published",
    publishedAt: "2026-02-02T08:00:00.000Z",
  },
  {
    slug: "optimasi-seo-dasar-umkm",
    title: "Optimasi SEO Dasar untuk UMKM",
    excerpt:
      "Langkah sederhana agar bisnis Anda lebih mudah ditemukan di Google — tanpa perlu jadi ahli.",
    body: `SEO terdengar rumit, tapi dasar-dasarnya bisa dilakukan siapa saja. Berikut langkah praktis untuk UMKM.

## 1. Tentukan kata kunci

Pikirkan apa yang akan diketik calon pelanggan di Google. Misalnya "jasa website Tasikmalaya" atau "katering sehat bandung".

## 2. Gunakan di tempat yang tepat

Tempatkan kata kunci utama di: judul halaman, deskripsi, heading, dan isi konten secara wajar.

## 3. Konten yang menjawab pertanyaan

Google menyukai konten yang benar-benar membantu. Tulis artikel yang menjawab pertanyaan umum pelanggan Anda.

## 4. Kecepatan halaman

Halaman yang cepat dimuat lebih disukai Google dan pengunjung. Optimalkan gambar dan hindari elemen berat.

## 5. Daftarkan ke Google

Buat **Google Business Profile** dan daftarkan situs ke Google Search Console agar terindeks.

---

Konsisten lebih penting daripada sempurna. Mulai dari satu langkah hari ini.`,
    category: "Tips & Trik",
    tags: ["seo", "umkm", "google"],
    cover: "seo-dasar",
    author: "LKTech",
    status: "published",
    publishedAt: "2026-02-20T08:00:00.000Z",
  },
];

function normalizeArticle(data: Record<string, unknown>): Article {
  const str = (v: unknown, fallback = "") =>
    typeof v === "string" ? v : fallback;

  return {
    slug: str(data.slug),
    title: str(data.title),
    excerpt: str(data.excerpt),
    body: str(data.body),
    category: str(data.category, "Artikel"),
    tags: Array.isArray(data.tags)
      ? data.tags.filter((t): t is string => typeof t === "string")
      : [],
    cover: str(data.cover, "default"),
    coverImage: typeof data.coverImage === "string" ? data.coverImage : undefined,
    coverAlt: typeof data.coverAlt === "string" ? data.coverAlt : undefined,
    author: str(data.author, "LKTech"),
    status: data.status === "draft" ? "draft" : "published",
    publishedAt: str(data.publishedAt, new Date().toISOString()),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
  };
}

/** Semua artikel (published saja) dari Firestore, fallback ke default (mode demo). */
export async function getArticles(): Promise<Article[]> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) return DEFAULT_ARTICLES;

  try {
    const snap = await db.collection(COLLECTION).get();
    return snap.docs
      .map((doc) => normalizeArticle(doc.data()))
      .filter((a) => a.status === "published")
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
  } catch (err) {
    console.error("[articles] gagal memuat:", err);
    return [];
  }
}

/** Semua artikel untuk dashboard (termasuk draft). */
export async function getStoredArticles(): Promise<StoredArticle[]> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) return DEFAULT_ARTICLES.map((a) => ({ ...a, id: a.slug }));

  const snap = await db.collection(COLLECTION).get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...normalizeArticle(doc.data()) }))
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const articles = await getArticles();
  return articles.find((a) => a.slug === slug) ?? null;
}

export async function getArticleSlugs(): Promise<string[]> {
  const articles = await getArticles();
  return articles.map((a) => a.slug);
}

export async function getArticleCategories(): Promise<string[]> {
  const articles = await getArticles();
  return ["Semua", ...Array.from(new Set(articles.map((a) => a.category)))];
}

export async function saveArticle(
  article: Article,
  updatedBy: string,
): Promise<void> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");

  const { coverImage, updatedAt, ...rest } = article;
  const payload: Record<string, unknown> = {
    ...rest,
    updatedAtISO: new Date().toISOString(),
    updatedAt: updatedAt ?? new Date().toISOString(),
    updatedBy,
  };
  payload.coverImage = coverImage ?? null;

  await db.collection(COLLECTION).doc(article.slug).set(payload, { merge: true });
}

export async function deleteArticleBySlug(slug: string): Promise<void> {
  const { getAdminDb } = await import("@/lib/firebase-admin");
  const db = getAdminDb();
  if (!db) throw new Error("Admin SDK tidak tersedia.");
  await db.collection(COLLECTION).doc(slug).delete();
}
