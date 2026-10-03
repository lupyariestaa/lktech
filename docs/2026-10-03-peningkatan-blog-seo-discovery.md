# Peningkatan Blog LKTech — SEO & Discovery

> **Status dokumen:** ✅ **Dieksekusi**
> **Disusun:** 2026-10-03 · **Dieksekusi:** 2026-10-03
> **Cakupan:** Halaman blog (`/blog`), detail artikel (`/blog/[slug]`), **halaman kategori**, **halaman tag**, **RSS feed**, **artikel terkait**, **structured data (JSON-LD)**, dan **sitemap**.
> **Tujuan:** Memaksimalkan potensi SEO & penemuan konten blog — yang sebelumnya hanya punya filter kategori client-side tanpa URL tersendiri, tanpa RSS, tanpa artikel terkait relevan.

---

## 1. Ringkasan

Blog LKTech sebelumnya **fungsional tetapi belum dioptimalkan untuk SEO & discovery**:

- Daftar `/blog` hanya punya filter kategori **client-side** (tanpa URL sendiri → tidak bisa diindeks/dibagikan/di-link).
- Tidak ada halaman kategori maupun tag tersendiri.
- Tidak ada RSS feed.
- "Artikel lainnya" hanya mengambil 3 artikel terbaru (tidak relevan dengan yang sedang dibaca).
- Structured data terbatas (hanya `BlogPosting` di detail).
- `sitemap.xml` tidak memuat kategori/tag.

Peningkatan ini menambahkan **mesin SEO & distribusi konten** yang selama ini belum dimanfaatkan, tanpa mengubah fitur lama.

---

## 2. Yang Dikerjakan

### 2.1 Helper taxonomy (`src/lib/article-types.ts`, `src/lib/articles.ts`)

- `taxonomySlug(label)` — ubah label → slug URL aman (`"Tips & Trik"` → `"tips-trik"`).
- `resolveLabelFromSlug(slug, labels)` — balikkan slug → label asli.
- Server helper: `getArticleCategoryList`, `getArticleTags` (tag + jumlah), `getArticlesByCategory`, `getArticlesByTag`, `pickRelatedArticles` (skor kategori + tag).

### 2.2 Halaman kategori — `/blog/kategori/[category]`

- `generateStaticParams` (SSG), `generateMetadata` (title/description/canonical/OG).
- JSON-LD `CollectionPage` + `ItemList` + `BreadcrumbList`.

### 2.3 Halaman tag — `/blog/tag/[tag]`

- Struktur sama seperti kategori, dengan JSON-LD & breadcrumb.

### 2.4 RSS feed — `/blog/rss.xml`

- RSS 2.0 (title, link, guid, pubDate, description, category) dari artikel published.
- `Content-Type: application/rss+xml`, cache 1 jam.
- Di-`autodiscovery` lewat `<link rel="alternate">` di metadata `/blog`.

### 2.5 Artikel terkait relevan

- `pickRelatedArticles` menggantikan "3 terbaru": prioritaskan kesamaan kategori, lalu jumlah tag sama.

### 2.6 Filter & navigasi

- `BlogGrid`: filter **kategori + tag** (tag menampilkan jumlah; tautan "Buka halaman tag").
- Tag di kartu & detail artikel kini **tautan** ke halaman tag.
- Kategori di detail artikel jadi **badge tautan** ke halaman kategori.
- Tombol "Berlangganan RSS" di hero `/blog`.

### 2.7 Structured data & sitemap

- `/blog`: JSON-LD `Blog` (+ 10 `BlogPosting` terbaru).
- Detail artikel: `BlogPosting` diperkaya (`articleSection`, `keywords`) + `BreadcrumbList`.
- `sitemap.xml`: tambah seluruh URL kategori & tag.

---

## 3. File

**Baru:**
- `src/app/blog/kategori/[category]/page.tsx`
- `src/app/blog/tag/[tag]/page.tsx`
- `src/app/blog/rss.xml/route.ts`
- `src/components/article-grid.tsx`

**Diubah:**
- `src/lib/article-types.ts` (helper taxonomy)
- `src/lib/articles.ts` (helper kategori/tag/related)
- `src/app/blog/page.tsx` (tags, RSS, JSON-LD)
- `src/app/blog/[slug]/page.tsx` (related relevan, breadcrumb JSON-LD, tag/kategori tautan)
- `src/components/blog-grid.tsx` (filter tag)
- `src/components/article-card.tsx` (tag jadi tautan)
- `src/app/sitemap.ts` (kategori & tag)

---

## 4. Verifikasi

```
npx tsc --noEmit   → bersih ✅
npx eslint .       → bersih ✅
npm run build      → ✓ Compiled successfully (47 halaman)
                     route: ● /blog/kategori/[category] · ● /blog/tag/[tag] · ○ /blog/rss.xml
```

---

## 5. Catatan Operasional

- **Blog saat ini KOSONG** (koleksi Firestore `articles` belum diisi; tidak ada script seed artikel). Halaman kategori/tag/RSS otomatis menampilkan data begitu artikel ditambahkan lewat `/admin/blog`.
- Halaman kategori/tag bersifat **derived** dari artikel — tidak perlu entri manual. Slug mengikuti label (`Tips & Trik` → `tips-trik`).
- RSS tersedia di `/blog/rss.xml` (autodiscovery aktif).
