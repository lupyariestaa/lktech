# SEO & Konten Mesin — Perencanaan & Fase (S0–S7)

> **Status: 🚧 SEDANG DIKERJAKAN — FASE S1 ✅ & S2 ✅ SELESAI (2026-10-12).** Inisiatif
> baru setelah sistem matang secara fitur.
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

### Fase S3 — Structured data lanjutan & listing (R6, R7, R9, R17)
- `Service` kaya: `hasOfferCatalog`/`OfferCatalog` dari `detail.packages`, `areaServed`.
- `LocalBusiness`/`ProfessionalService` lengkap: `geo`, `openingHoursSpecification`,
  `priceRange`, `sameAs` (social), `contactPoint`, `hasMap`.
- `ItemList` di `/produk`, `/portofolio`, `/layanan` (listing).
- `WebSite` + `SearchAction` (sitelinks searchbox) + `WebPage`.
- `Product`: `sku`, `review` (dari ulasan approved), `priceValidUntil`.
- `BlogPosting`: `author` Person.

### Fase S4 — Internal linking & hub (R13, R14)
- Halaman index **`/blog/kategori`** & **`/blog/tag`** (hub + `CollectionPage` + sitemap).
- Internal linking dua arah: layanan ↔ blog (artikel relevan), portofolio → layanan.
- "Tag populer" & "artikel terkait" berbasis kategori (sudah ada sebagian).

### Fase S5 — Programmatic SEO (R12) — konten berkualitas
- Mulai **satu** pola berdampak: **`/layanan/[slug]/[kota]`** (mis. jasa website
  Tasikmalaya/Bandung/Jakarta) dengan konten unik per kota (bukan doorway): paket lokal,
  testimoni/portofolio relevan kota, FAQ kota, CTA WhatsApp.
- Data kota terkurasi (`src/lib/locations.ts`), bukan generate ngawur.
- Sitemap + `BreadcrumbList` + `Service`/`FAQPage` per halaman.
- **Guard kualitas**: minimal konten unik, `noindex` bila tipis (opsional).

### Fase S6 — Observability & data (R15)
- GA4/GTM (opsional) di samping Vercel Analytics; event SEO (`article_view` sudah ada).
- Integrasi **Google Search Console API** ringan (endpoint admin: tarik query
  teratas/klik/impresi) → panel "SEO" di admin (opsional, butuh service account).
- Sitemap ping (IndexNow/Bing) opsional.

### Fase S7 — QA, dokumentasi & rilis
- Gate penuh (tsc/eslint/test/build), uji rich result (validator schema), dokumentasi,
  commit + push.

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
