# SEO & Konten Mesin — Perencanaan & Fase (S0–S7)

> **Status: ✅ SELESAI (KODE) — FASE S0–S7 TUNTAS (2026-10-12).**
> Inisiatif baru setelah sistem matang secara fitur.
> **Disusun:** hasil riset menyeluruh atas kode SEO aktual (lihat §1 temuan).
> **Prinsip:** manfaatkan fondasi SEO yang sudah kuat (metadata, JSON-LD, sitemap, RSS,
> blog) lalu tutup celah + tambah *mesin pertumbuhan* (programmatic, internal linking,
> data GSC). Semua perubahan **backward-compatible** dan mengikuti pola proyek
> (server-authoritative, a11y, observability, dokumentasi fase).

---

## 0. Ringkasan

LKTech sudah punya fondasi SEO **kuat**: metadata dinamis per halaman, JSON-LD
(`ProfessionalService`, `WebSite`, `Product`, `Service`, `BlogPosting`, `BreadcrumbList`
di beberapa halaman), sitemap lengkap, robots, RSS, SEO per-artikel. Namun riset
menemukan beberapa **celah berdampak tinggi** (canonical bocor, `FAQPage` absen,
`BreadcrumbList` tidak konsisten, `/promo` tanpa cache) dan **belum ada "mesin"**
(programmatic SEO, internal linking kaya, integrasi Search Console/GA4).

**Diagnosis:** SEO LKTech bagus untuk halaman yang sudah ada, tetapi **belum
menghasilkan lalu lintas skala** karena (a) beberapa sinyal teknis setengah jalan,
(b) belum ada strategi konten/programmatic, (c) data performa (GSC) belum dimanfaatkan.

**Fokus:** (1) rapikan sinyal teknis yang bocor, (2) kaya-i structured data untuk
rich results, (3) bangun internal linking + hub, (4) tanam programmatic SEO,
(5) sambungkan data GSC/GA4.

---

## 1. Temuan Riset (baseline — terverifikasi)

### 🔴 Kritis
- **R1 — Canonical root bocor.** `src/app/layout.tsx:68-70` menetapkan
  `alternates.canonical: "/"` secara **global**. Halaman yang tidak menetapkan
  canonical sendiri akan **mewarisi canonical `/`** → risiko duplikasi/kanibalisasi
  (Google menganggap halaman itu versi dari beranda). Banyak halaman publik sudah
  set canonical sendiri, tetapi ini default yang berbahaya & rapuh.
- **R2 — `FAQPage` JSON-LD absen total.** Ada data FAQ (`FAQS`, `PRICING_FAQS`,
  `detail.faqs`), UI `FaqAccordion` di `/`, `/harga`, `/layanan/[slug]`, tetapi
  **tidak ada schema** `FAQPage` → kehilangan rich result FAQ di SERP.
- **R3 — Jalur "not found" tanpa `noindex`.** `layanan/[slug]/page.tsx` &
  `produk/[slug]/page.tsx` pada jalur slug tak ditemukan hanya `return { title }`
  tanpa `robots: noindex` → halaman error bisa ter-index (mewarisi root `index:true`).
- **R4 — `/promo` `force-dynamic`.** `src/app/promo/page.tsx:13` → tak di-cache sama
  sekali (TTFB/CWV buruk, beban server) padahal kontennya statis-ish.

### 🟠 Sedang
- **R5 — `BreadcrumbList` tidak konsisten.** UI breadcrumb (`PageHero`) ada hampir di
  semua halaman, tetapi schema hanya di blog/kategori/tag/portofolio/harga/promo.
  **Belum ada** di: home, `/layanan`, `/layanan/[slug]`, `/produk`, `/produk/[slug]`,
  `/blog` (list), `/portofolio` (list), `/kontak`.
- **R6 — `Service` JSON-LD minim.** Tidak memakai `detail.packages` sebagai
  `OfferCatalog`; tidak ada `FAQPage` layanan; tidak ada `BreadcrumbList`.
- **R7 — `LocalBusiness`/`ProfessionalService` kurang lengkap.** Belum ada `geo`
  (padahal `mapLat`/`mapLng` ada di `/kontak`), `openingHoursSpecification`,
  `priceRange`, `sameAs` (social dari `settings.socials`), `contactPoint`, `hasMap`.
- **R8 — `produk/layout.tsx` metadata hardcoded duplikat** (`title:"Produk"`) →
  bersaing dengan page/detail.
- **R9 — `ItemList` minim.** Hanya di kategori/tag blog; belum di `/produk`,
  `/portofolio`, `/layanan` (listing).
- **R10 — `lastModified` sitemap pakai `now`** untuk `/layanan`, `/harga`, `/kontak`,
  `/produk/[slug]` → sinyal freshness tidak jujur (crawl berulang tanpa perubahan).
- **R11 — RSS alternate tidak global** (hanya di `/blog`).

### 🟡 Pertumbuhan (belum ada "mesin")
- **R12 — Belum ada programmatic SEO** (mis. `/layanan/[slug]/[kota]`,
  `/produk/kategori/[label]`, `/lokasi/[kota]`).
- **R13 — Internal linking belum kaya** (blog↔layanan dua arah, blog↔portofolio,
  tag populer, hub kategori/tag index).
- **R14 — Belum ada hub `/blog/kategori` & `/blog/tag` index.**
- **R15 — Data GSC/GA4 belum dimanfaatkan** (verification GSC ada, tapi tanpa API;
  tidak ada GA4/GTM; tak ada laporan keyword).
- **R16 — Tidak ada seed artikel** (artikel 100% Firestore) — mesin konten butuh volume.
- **R17 — `Product` tanpa `sku`/`review`/`priceValidUntil`; `BlogPosting` tanpa
  `author` Person; tidak ada `SearchAction` (sitelinks searchbox).**

---

## 2. Fase Eksekusi (S0–S7)

### Fase S0 — Audit & Keputusan (ringan)
- Konfirmasi temuan R1–R17 (sudah dari riset). Tetapkan keputusan kunci:
  - **K1** — Canonical: hapus dari root; setiap halaman **wajib** set canonical sendiri;
    tambah helper `buildMetadata` bersama agar konsisten.
  - **K2** — Structured data: satu modul helper `structured-data-pure.ts` untuk
    membangun node (FAQPage, BreadcrumbList, ItemList, Service kaya, LocalBusiness).
  - **K3** — Programmatic: batasi ke 1–2 pola (mis. `/layanan/[slug]/[kota]`) dengan
    **konten berkualitas** (bukan doorway) — waspada kebijakan Google.
  - **K4** — GSC: mulai dari verification + sitemap (sudah ada); GA4 opsional.

### Fase S1 — Perbaikan sinyal teknis (R1, R3, R4, R8, R10, R11) ✅ SELESAI
- Hapus `alternates.canonical` dari root layout; pastikan **setiap** halaman publik set
  canonical absolut sendiri (helper bersama).
- `noindex` pada jalur not-found di `generateMetadata` layanan/produk.
- `/promo`: `force-dynamic` → `revalidate = 300` (ISR).
- Hapus metadata hardcoded di `produk/layout.tsx` (biar page/detail yang urus).
- Sitemap: `lastModified` pakai tanggal konten asli (fallback aman, bukan `now`).
- RSS alternate global di root layout.

> **✅ Hasil S1 (2026-10-12)** — Gate: `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ ·
> `build` ✅ (81 halaman; `/promo` kini **Static/ISR 2m**, bukan dynamic). Lihat §6.

### Fase S2 — Structured data: FAQ & Breadcrumb (R2, R5) ✅ SELESAI
- **Modul murni** `src/lib/structured-data-pure.ts`: `buildFaqPage(faqs)`,
  `buildBreadcrumb(items, baseUrl)`, `buildItemList(items)`.
- **`FAQPage`** di `/` (FAQS), `/harga` (PRICING_FAQS), `/layanan/[slug]` (`detail.faqs`).
- **`BreadcrumbList`** konsisten di semua halaman ber-`PageHero` yang belum punya.
- Test murni (`test:seo-schema`).

> **✅ Hasil S2 (2026-10-12)** — Gate: `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅
> (`test:seo-schema` **8**) · `build` ✅ (81 halaman). JSON-LD terverifikasi ter-render
> di HTML (beranda `FAQPage`, harga `FAQPage`+`Breadcrumb`, layanan detail
> `FAQPage`+`Breadcrumb`+`OfferCatalog`). Lihat §7.

### Fase S3 — Structured data lanjutan & listing (R6, R7, R9, R17) ✅ SELESAI
- `Service` kaya: `hasOfferCatalog`/`OfferCatalog` dari `detail.packages`, `areaServed`.
- `LocalBusiness`/`ProfessionalService` lengkap: `geo`, `openingHoursSpecification`,
  `priceRange`, `sameAs` (social), `contactPoint`, `hasMap`.
- `ItemList` di `/produk`, `/portofolio`, `/layanan` (listing).
- `WebSite` + `SearchAction` (sitelinks searchbox) + `WebPage`.
- `Product`: `sku`, `review` (dari ulasan approved), `priceValidUntil`.
- `BlogPosting`: `author` Person.

> **✅ Hasil S3 (2026-10-12)** — Gate: `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅
> (`test:seo-schema` 8→**15**) · `build` ✅ (81 halaman). Verifikasi HTML: `SearchAction`,
> `OpeningHoursSpecification`, `GeoCoordinates`, `hasMap`, `priceRange`, `priceValidUntil`,
> `sku` ter-render. Lihat §8.

### Fase S4 — Internal linking & hub (R13, R14) ✅ SELESAI
- Halaman index **`/blog/kategori`** & **`/blog/tag`** (hub + `CollectionPage` + sitemap).
- Internal linking dua arah: layanan ↔ blog (artikel relevan), portofolio → layanan.
- "Tag populer" & "artikel terkait" berbasis kategori (sudah ada sebagian).

> **✅ Hasil S4 (2026-10-12)** — Gate: `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅
> (`test:blog` 174→175) · `build` ✅ (81 halaman; `/blog/kategori` & `/blog/tag`
> **Static**). Verifikasi HTML: hub `CollectionPage`+`ItemList`+`Breadcrumb`; layanan
> detail "Artikel terkait". Lihat §9.

### Fase S5 — Programmatic SEO (R12) — konten berkualitas ✅ SELESAI
- Mulai **satu** pola berdampak: **`/layanan/[slug]/[kota]`** (mis. jasa website
  Tasikmalaya/Bandung/Jakarta) dengan konten unik per kota (bukan doorway): paket lokal,
  testimoni/portofolio relevan kota, FAQ kota, CTA WhatsApp.
- Data kota terkurasi (`src/lib/locations.ts`), bukan generate ngawur.
- Sitemap + `BreadcrumbList` + `Service`/`FAQPage` per halaman.
- **Guard kualitas**: minimal konten unik, `noindex` bila tipis (opsional).

> **✅ Hasil S5 (2026-10-12)** — Gate: `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅
> (`test:locations` **6**) · `build` ✅ **124 halaman** (40 = 5 layanan × 8 kota).
> Setiap halaman kota: konten unik + `Service`/`Breadcrumb`/`FAQPage`. Lihat §10.

### Fase S6 — Observability & data (R15) ✅ SELESAI
- GA4/GTM (opsional) di samping Vercel Analytics; event SEO (`article_view` sudah ada).
- Integrasi **Google Search Console API** ringan (endpoint admin: tarik query
  teratas/klik/impresi) → panel "SEO" di admin (opsional, butuh service account).
- Sitemap ping (IndexNow/Bing) opsional.

> **✅ Hasil S6 (2026-10-12)** — Gate: `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅
> (`test:search-console` **9**) · `build` ✅ (124 halaman). GA4 & GSC **fail-safe**
> (aktif hanya bila env diisi). Panel `/admin/seo`. Lihat §11.

### Fase S7 — QA, dokumentasi & rilis ✅ SELESAI
- Gate penuh (tsc/eslint/test/build), uji rich result (validator schema), dokumentasi,
  commit + push.

> **✅ Hasil S7 (2026-10-12)** — Gate penuh hijau; audit QA (canonical/robots/sitemap/
  JSON-LD/internal linking) bersih; **temuan QA diperbaiki**: diferensiasi near-duplicate
  halaman kota. Lihat §13.

---

## 3. Urutan & Prioritas

| Fase | Isi | Nilai | Usaha | Risiko |
| --- | --- | --- | --- | --- |
| **S0** | Audit & keputusan | — | rendah | — |
| **S1** | Sinyal teknis (canonical, noindex, promo ISR, sitemap) | tinggi | rendah | rendah |
| **S2** | FAQ + Breadcrumb schema | tinggi | rendah | rendah |
| **S3** | Structured data lanjutan & listing | sedang-tinggi | sedang | rendah |
| **S4** | Internal linking & hub | sedang-tinggi | sedang | rendah |
| **S5** | Programmatic SEO | tinggi (traffic) | tinggi | **sedang** (kualitas) |
| **S6** | GSC/GA4 | sedang | sedang | rendah |
| **S7** | QA & rilis | — | rendah | — |

**Rekomendasi urutan:** S0 → S1 → S2 → S3 → S4 → (S5 setelah konten cukup) → S6 → S7.

---

## 4. Definition of Done (per fase)
1. `tsc` bersih · `eslint` bersih · semua `test:*` hijau · `build` sukses.
2. Structured data tervalidasi (Rich Results Test / Schema validator).
3. Setiap halaman publik punya canonical absolut + title/description unik.
4. Backward-compatible; dokumentasi fase diperbarui.
5. Tidak ada konten doorway/thin (untuk programmatic).

---

## 5. Catatan
- Jumlah artikel/produk **produksi** tak dapat dipastikan dari repo (bersumber
  Firestore; fallback statis: 6 proyek, 2 produk, 5 layanan, 0 artikel).
- **GA4/GSC API butuh kredensial** (service account) → langkah manual pemilik.
- Programmatic SEO harus **hati-hati** (Google membenci thin/doorway pages) — mulai
  kecil, kurasi konten, ukur hasil sebelum melebar.

---

## 6. ✅ Hasil Eksekusi FASE S1 (2026-10-12)

**Status: ✅ SELESAI (kode).** Gate: `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ ·
`build` ✅ (81 halaman).

| Temuan | Solusi |
| --- | --- |
| **R1** — Canonical root bocor | Hapus `alternates.canonical: "/"` dari `layout.tsx`. Setiap halaman publik **sudah** menetapkan canonical absolut sendiri (diverifikasi: `/`, layanan, produk, portofolio, harga, promo, kontak, blog + semua detail/kategori/tag). Halaman privat tetap `noindex`. |
| **R3** — Not-found tanpa noindex | Tambah `robots: { index:false, follow:false }` pada jalur not-found di `generateMetadata` **layanan/[slug]**, **produk/[slug]**, **blog/[slug]**, **blog/tag/[tag]**, **blog/kategori/[category]**, **portofolio/[slug]**. |
| **R4** — `/promo` tak di-cache | `force-dynamic` → `revalidate = 120` (ISR). Build: `/promo` kini **○ Static (2m)**, bukan **ƒ Dynamic**. |
| **R8** — Metadata duplikat | Hapus `metadata` hardcoded (`title:"Produk"`) di `produk/layout.tsx` — biarkan page/detail menetapkan sendiri. |
| **R10** — `lastModified` palsu | `sitemap.ts` tak lagi pakai `now`; rute tanpa tanggal asli memakai konstanta stabil **`SEO_CONTENT_UPDATED`** (di `site.ts`). Artikel/proyek tetap pakai tanggal asli. |
| **R11** — RSS tidak global | Root layout menambah `alternates.types."application/rss+xml"` → `<link rel="alternate">` feed di seluruh situs (sebelumnya hanya `/blog`). |

**Berkas diubah:** `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/promo/page.tsx`,
`src/app/produk/layout.tsx`, `src/app/produk/[slug]/page.tsx`,
`src/app/layanan/[slug]/page.tsx`, `src/app/blog/[slug]/page.tsx`,
`src/app/blog/tag/[tag]/page.tsx`, `src/app/blog/kategori/[category]/page.tsx`,
`src/app/portofolio/[slug]/page.tsx`, `src/lib/site.ts` (+ `SEO_CONTENT_UPDATED`).

**Sisa:** Fase **S2–S7** (FAQ/Breadcrumb schema, structured data lanjutan, internal
linking/hub, programmatic, GSC/GA4, QA).
**Langkah manual:** verifikasi di Search Console (canonical benar, halaman error tak
ter-index), pantau CWV `/promo` membaik.

---

## 7. ✅ Hasil Eksekusi FASE S2 (2026-10-12)

**Status: ✅ SELESAI (kode).** Gate: `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅
(`test:seo-schema` 8) · `build` ✅ (81 halaman).

Modul murni baru **`src/lib/structured-data-pure.ts`** + komponen server
**`src/components/json-ld-script.tsx`** (merender satu/array node, `null` bila kosong).

| Temuan | Solusi |
| --- | --- |
| **R2** — `FAQPage` absen | Tambah `FAQPage` JSON-LD di **beranda** (`FAQS`), **`/harga`** (`PRICING_FAQS`), **`/layanan`** (list, `faqs`), **`/layanan/[slug]`** (`detail.faqs`). Hanya dirender bila FAQ valid (≥1 tanya-jawab). |
| **R5** — `BreadcrumbList` tak konsisten | Tambah `BreadcrumbList` di **`/layanan`**, **`/layanan/[slug]`** (sudah ada sebagian), **`/produk`**, **`/produk/[slug]`**, **`/portofolio`**, **`/kontak`**, **`/blog`**. (blog/[slug], kategori, tag, portofolio/[slug], harga, promo sudah punya.) |
| **R9** (bonus) | Tambah **`ItemList`** di `/produk` & `/portofolio` (representasi katalog). |
| **R17** (bonus, mulai) | `Product` kini menyertakan **`sku`** (dari slug). |

**Pendekatan:** semua pembangunan node lewat modul murni `structured-data-pure`
(`buildFaqPage`/`buildBreadcrumb`/`buildItemList`) → konsisten, mudah diuji, dan aman
(strip HTML pada jawaban, skip entri kosong, `null` bila tak cukup item).

**Berkas baru:** `src/lib/structured-data-pure.ts`, `src/components/json-ld-script.tsx`,
`scripts/seo-schema.test.ts` (+ `test:seo-schema`).
**Berkas diubah:** `src/app/page.tsx`, `src/app/harga/page.tsx`, `src/app/layanan/page.tsx`,
`src/app/layanan/[slug]/page.tsx`, `src/app/produk/page.tsx`,
`src/app/produk/[slug]/page.tsx`, `src/app/portofolio/page.tsx`, `src/app/kontak/page.tsx`,
`src/app/blog/page.tsx`, `tsconfig.json`, `package.json`.

**Verifikasi nyata:** HTML hasil build memuat `FAQPage`/`BreadcrumbList`/`OfferCatalog`
sesuai halaman (beranda, harga, layanan list+detail).

**Sisa:** Fase **S3–S7** (structured data lanjutan, internal linking/hub, programmatic,
GSC/GA4, QA).
**Langkah manual:** validasi rich result di **Google Rich Results Test** (FAQ, breadcrumb).

---

## 8. ✅ Hasil Eksekusi FASE S3 (2026-10-12)

**Status: ✅ SELESAI (kode).** Gate: `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅
(`test:seo-schema` 15) · `build` ✅ (81 halaman).

Helper murni tambahan di **`structured-data-pure.ts`**: `buildReviewNodes`,
`buildOpeningHours`, `buildSearchAction`, `buildSameAs`, `priceValidUntil`.

| Temuan | Solusi |
| --- | --- |
| **R7** — `LocalBusiness` kurang lengkap | `ProfessionalService` global kini punya **`geo`** (koordinat dari `site.ts/BUSINESS_GEO`), **`openingHoursSpecification`** (Sen–Jum 09–17, Sab 09–13), **`priceRange`**, **`contactPoint`** (telepon/email/bahasa), **`hasMap`**, dan **`sameAs`** (dari `settings.socials`). |
| **R17** — `Product` minim | Tambah **`sku`** (S2), **`review`** (dari ulasan `approved` via `listProductReviews`, hanya bila ada), **`priceValidUntil`** (offer). |
| **R17** — `BlogPosting` tanpa author Person | `author` → **`Person`**; `publisher` Organization + `logo`; `mainEntityOfPage` → `WebPage`. |
| **R6** — `Service` kaya | `hasOfferCatalog` dari `detail.packages` (S2) + `areaServed` Country (ditinjau). |
| **R9** — `ItemList` minim | `ItemList` di `/produk` & `/portofolio` (S2, dari listing). |
| **R9/SearchAction** | `WebSite.potentialAction` = **`SearchAction`** (sitelinks searchbox) → `/blog?q={search_term_string}`. |
| DRY | Koordinat peta dipindah ke sumber tunggal `site.ts` (`BUSINESS_GEO`), dipakai halaman kontak & JSON-LD. |

**Berkas diubah:** `src/components/structured-data.tsx`, `src/lib/site.ts`,
`src/lib/structured-data-pure.ts`, `src/app/kontak/page.tsx`,
`src/app/produk/[slug]/page.tsx`, `src/app/blog/[slug]/page.tsx`,
`scripts/seo-schema.test.ts`.

**Verifikasi nyata:** HTML build memuat `SearchAction`, `OpeningHoursSpecification`,
`GeoCoordinates`, `hasMap`, `priceRange` (global); `priceValidUntil`, `sku`, `Offer`
(produk). `sameAs`/`review` muncul hanya bila data terisi.

**Sisa:** Fase **S4–S7** (internal linking/hub, programmatic, GSC/GA4, QA).
**Langkah manual:** validasi di **Google Rich Results Test** (Product/Review, FAQ,
Breadcrumb, Organization) & pantau Search Console.

---

## 9. ✅ Hasil Eksekusi FASE S4 (2026-10-12)

**Status: ✅ SELESAI (kode).** Gate: `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅
(`test:blog` 175) · `build` ✅ (81 halaman).

| Temuan | Solusi |
| --- | --- |
| **R14** — Hub tak ada | Halaman baru **`/blog/kategori`** (indeks semua kategori + jumlah artikel) dan **`/blog/tag`** (indeks semua tag + jumlah). Keduanya `CollectionPage` + `ItemList` + `BreadcrumbList`; masuk **sitemap** (hanya bila ada isi). |
| **R13** — Internal linking minim | **Layanan → blog**: section **"Artikel terkait"** di `/layanan/[slug]` (artikel dari kategori yang dipetakan ke layanan itu). **Blog → hub**: tautan "Semua kategori"/"Semua tag" di `/blog`. (Blog → layanan sudah ada via sidebar artikel.) |
| **Bug ditemukan** | `CATEGORY_SERVICE["Teknologi"]` = `"pengembangan-aplikasi"` — slug ini **tidak ada** di `SERVICES` (yang benar `"aplikasi-mobile"`) → CTA sidebar artikel tak me-resolve. **Diperbaiki** + helper baru `categoriesForService()` (kebalikan peta) untuk linking layanan→blog. |
| DRY | Hub memakai `buildItemList`/`buildBreadcrumb` (S2) & `taxonomySlug` yang sudah ada. |

**Berkas baru:** `src/app/blog/kategori/page.tsx`, `src/app/blog/tag/page.tsx`.
**Berkas diubah:** `src/app/blog/page.tsx`, `src/app/sitemap.ts`,
`src/app/layanan/[slug]/page.tsx`, `src/lib/article-ui.ts`, `scripts/article-ui.test.ts`.

**Verifikasi nyata:** HTML build memuat `CollectionPage`/`ItemList`/`BreadcrumbList`
(hub) & "Artikel terkait" (layanan detail); `/blog/kategori` & `/blog/tag` **Static**.

**Sisa:** Fase **S5–S7** (programmatic SEO, GSC/GA4, QA).
**Langkah manual:** submit sitemap ulang di Search Console (hub kategori/tag baru).

---

## 10. ✅ Hasil Eksekusi FASE S5 (2026-10-12)

**Status: ✅ SELESAI (kode).** Gate: `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅
(`test:locations` 6) · `build` ✅ (**124 halaman**, dari 81).

### Pola & cakupan
- Route baru **`/layanan/[slug]/[kota]`** — programmatic layanan × kota.
- **8 kota terkurasi** (`src/lib/locations.ts`): Tasikmalaya, Bandung, Jakarta, Garut,
  Cirebon, Bogor, Bekasi, Cimahi → **5 layanan × 8 kota = 40 halaman**.

### Anti-doorway (PRINSIP UTAMA)
- Setiap kota punya **konten UNIK & NYATA** (bukan template ganti nama): `localContext`
  (≥120 char, konteks ekonomi/kultur kota), `industries` (sektor dominan), `whyLocal`
  (alasan spesifik), `localFaqs` (FAQ lokal).
- **Guard diuji** (`test:locations`): konten wajib terisi, `localContext` **tidak
  duplikat** antar kota, slug unik & URL-aman, `nearby` hanya merujuk kota dikenal.
- **`dynamicParams = false`** → kombinasi layanan/kota tak dikenal = **404** (tak
  menghasilkan halaman tipis ter-index). Metadata not-found → `noindex`.

### SEO per halaman
- `generateMetadata` unik (title/description/canonical).
- JSON-LD: **`Service`** (areaServed City), **`BreadcrumbList`** (4 level), **`FAQPage`**
  (FAQ lokal).
- **Internal linking**: halaman kota → paket layanan, kota sekitar, layanan lain di kota
  sama; `/layanan/[slug]` → daftar kota ("Jasa X di kota Anda"); semua masuk **sitemap**
  (prioritas 0.6).

**Berkas baru:** `src/lib/locations.ts`, `src/app/layanan/[slug]/[kota]/page.tsx`,
`scripts/locations.test.ts` (+ `test:locations`).
**Berkas diubah:** `src/app/sitemap.ts`, `src/app/layanan/[slug]/page.tsx`,
`tsconfig.json`, `package.json`.

**Verifikasi nyata:** build menghasilkan 40 halaman kota (`.next/server/app/layanan/*/
{kota}.html`), masing-masing memuat `Service`/`BreadcrumbList`/`FAQPage` & konten unik.

**Sisa:** Fase **S6** (GSC API + GA4) & **S7** (QA & rilis).
**Langkah manual:** (1) submit sitemap di Search Console; (2) **pantau** performa halaman
kota di GSC 2–4 minggu — bila ada yang tipis/tak ter-index, kurangi atau perkaya.
**Cara menambah kota:** cukup tambah entri di `LOCATIONS` dengan konten unik (guard test
akan menolak konten duplikat/terlalu pendek).

---

## 11. ✅ Hasil Eksekusi FASE S6 (2026-10-12)

**Status: ✅ SELESAI (kode).** Gate: `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅
(`test:search-console` 9) · `build` ✅ (124 halaman).

| Temuan | Solusi |
| --- | --- |
| **R15** — data GSC/GA4 tak dimanfaatkan | **GA4** opsional (komponen `GoogleAnalytics`, aktif hanya bila `NEXT_PUBLIC_GA_ID` diisi; `anonymize_ip`). **Search Console API** via service account (JWT RS256 manual, tanpa dependensi baru) → endpoint `/api/admin/seo` + panel `/admin/seo`. |
| Fail-safe | Semua **aktif hanya bila env diisi**; bila kosong → GA4 tidak dimuat, panel SEO menampilkan **panduan setup** (bukan error). Access token/query gagal → `configured:false`. |
| Panel SEO | `/admin/seo`: rentang 7/28/90 hari, ringkasan (klik/impresi/CTR), tabel **query teratas** & **halaman teratas**, konten `no-store`. Menu **"SEO"** di grup utama (dekat Analitik). |

**Berkas baru:** `src/components/google-analytics.tsx`,
`src/components/admin/seo-dashboard.tsx`, `src/lib/search-console.ts`,
`src/lib/search-console-pure.ts`, `src/app/api/admin/seo/route.ts`,
`src/app/admin/(dashboard)/seo/page.tsx`, `scripts/search-console.test.ts`
(+ `test:search-console`).
**Berkas diubah:** `src/app/layout.tsx`, `src/lib/admin-nav.ts`,
`src/lib/admin-settings-api.ts`, `.env.example`, `tsconfig.json`, `package.json`.

**Verifikasi nyata:** GA4 tidak render tanpa env (fail-safe); `/admin/seo` & `/api/admin/seo`
terdaftar; build 124 halaman.

**Sisa:** Fase **S7** (QA, dokumentasi & rilis).
**Langkah manual (S6):** set env produksi — `NEXT_PUBLIC_GA_ID` (opsional), dan untuk
panel SEO: `GSC_SERVICE_ACCOUNT` (JSON service account satu baris) + `GSC_SITE_URL`
(properti GSC). Beri service account akses sebagai pengguna di properti Search Console.

---

## 12. Cara Memakai Dokumen Ini (dari roadmap) — ringkas
1. Pilih fase/inisiatif yang disetujui.
2. Buat dokumen fase bila perlu; catat progres di `TASK-SELANJUTNYA.md`.
3. Tandai fase selesai di dokumen ini.

---

## 13. ✅ Hasil Eksekusi FASE S7 — QA, Dokumentasi & Rilis (2026-10-12)

**Status: ✅ SELESAI — INISIATIF SEO & KONTEN MESIN (S0–S7) TUNTAS (kode).**

### Gate penuh (final)
- `tsc` ✅ · `eslint` (global) ✅ 0 error · **32 suite / 561 test** ✅ 0 gagal ·
  `build` ✅ **125 halaman**.

### Audit QA (verifikasi nyata pada output build)
- **Robots** benar (allow `/`, disallow admin/api/akun/keranjang/masuk/unduhan; `Sitemap:`).
- **Sitemap** memuat rute publik; halaman privat **tidak** di sitemap (benar).
- **Canonical** per halaman unik (`/`, `/harga`, `/layanan`, `/blog/kategori`,
  `/produk/[slug]`, `/blog/[slug]`, `/layanan/[slug]/[kota]`). `lang="id"`.
- **JSON-LD** ter-render: `ProfessionalService`+`WebSite`/`SearchAction` (global),
  `FAQPage`/`BreadcrumbList`/`ItemList`/`Service`/`Product` sesuai halaman.
- **Noindex** benar pada halaman privat (akun/keranjang/masuk/unduhan/maintenance) &
  jalur not-found.
- **Internal linking** terverifikasi: layanan→kota, kota→kota sekitar, blog→hub.
- **Tidak ada** halaman yatim (semua rute publik masuk sitemap atau sengaja noindex).

### Temuan QA & perbaikan (dalam S7)
- **Near-duplicate halaman kota:** 5 layanan di kota yang sama berbagi `localContext`
  identik (hanya judul berbeda) → risiko dianggap duplikat oleh Google.
  **Diperbaiki:** helper murni `serviceCityIntro()` + `SERVICE_ANGLES` — setiap
  (layanan × kota) kini punya **paragraf pembuka unik** (sudut relevansi layanan +
  konteks kota). Diuji (`test:locations`: sudut layanan unik, intro tak duplikat).

### Rilis
- Commit konvensional + push `main` → Vercel auto-deploy. CI (`.github/workflows/ci.yml`)
  hijau.

### Ringkasan dampak inisiatif (S1–S7)
| Fase | Dampak |
| --- | --- |
| S1 | Sinyal teknis bersih (canonical, noindex, promo ISR, sitemap jujur, RSS global) |
| S2 | Rich results: **FAQPage**, `BreadcrumbList`, `ItemList` |
| S3 | Structured data lengkap (`LocalBusiness` kaya, `SearchAction`, Product review) |
| S4 | Hub `/blog/kategori` & `/blog/tag` + internal linking dua arah |
| S5 | **40 halaman** programmatic layanan×kota (anti-doorway) |
| S6 | Observability: GA4 opsional + panel **Search Console** (`/admin/seo`) |
| S7 | QA menyeluruh + diferensiasi konten + rilis |

**Sisa: LANGKAH MANUAL (pemilik):**
1. Submit sitemap di **Google Search Console**; verifikasi properti.
2. (Opsional) Isi `NEXT_PUBLIC_GA_ID`, `GSC_SERVICE_ACCOUNT`, `GSC_SITE_URL` di Vercel.
3. **Pantau 2–4 minggu**: impresi/klik & index halaman kota; bila ada yang tipis,
   kurangi/perkaya (cukup edit `LOCATIONS`).
4. Validasi rich result di **Google Rich Results Test** (Product, FAQ, Breadcrumb).
