# UPGRADE SISTEM PORTFOLIO LKTech — Audit, Rencana & Task Implementation Flow

> **Status dokumen:** 📋 Rencana (belum dieksekusi)
> **Disusun:** 2026-10-02
> **Cakupan:** Seluruh sistem portfolio — halaman publik (`/portofolio`, `/portofolio/[slug]`), kelola di dashboard (`/admin/projects`), data layer, integrasi media, SEO.
> **Tujuan:** Menjadikan portfolio LKTech **jauh lebih baik & profesional** — dari segi tampilan, pengalaman pengunjung (calon klien), kemudahan pengelolaan admin, dan kekuatan SEO — **tanpa membuat rumit**.
> **Prasyarat baca:** `docs/2026-10-02-revisi-sistem-produk.md` (pola galeri+lightbox yang bisa dipakai ulang), `docs/2026-10-02-orders-admin-module.md` (pola manager & media), `docs/README.md`.

---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Baseline — Kondisi Sistem Portfolio Saat Ini](#2-baseline--kondisi-sistem-portfolio-saat-ini)
3. [Audit — Temuan & Celah](#3-audit--temuan--celah)
4. [Prinsip Desain & Keputusan](#4-prinsip-desain--keputusan)
5. [Spesifikasi Target per Area](#5-spesifikasi-target-per-area)
6. [Arsitektur Implementasi](#6-arsitektur-implementasi)
7. [TASK IMPLEMENTATION FLOW (FASE 0–7)](#7-task-implementation-flow-fase-07)
8. [Definition of Done & Checklist QA](#8-definition-of-done--checklist-qa)
9. [Risiko & Mitigasi](#9-risiko--mitigasi)
10. [Out of Scope](#10-out-of-scope)
11. [Estimasi & Urutan Pengerjaan](#11-estimasi--urutan-pengerjaan)
12. [Lampiran — Referensi Pola Existing](#12-lampiran--referensi-pola-existing)

---

## 1. Ringkasan Eksekutif

Sistem portfolio adalah **etalase utama LKTech** — di sinilah calon klien menilai kualitas kerja. Saat ini portfolio sudah berfungsi (daftar + filter kategori, halaman studi kasus, kelola di dashboard), tetapi punya **beberapa celah yang membuatnya kurang "profesional"** dibanding potensinya:

**3 masalah terbesar:**
1. **Galeri di halaman detail TIDAK interaktif** — hanya grid gambar statis (tanpa klik/zoom/lightbox), padahal modul **Produk sudah punya `ProductGallery` + `ProductLightbox`** yang bagus dan bisa dipakai ulang.
2. **Daftar portfolio minim** — tanpa **search, sorting, atau pagination**; filter hanya kategori (bukan tag).
3. **Dashboard proyek tidak bisa mengelola gambar** — untuk mengatur cover/galeri, admin harus ke menu Media terpisah; tidak ada MediaPicker, preview, atau reorder.

**Dokumen ini** menjabarkan audit lengkap (24 temuan) + rencana upgrade bertahap **FASE 0–7** yang fokus pada **dampak besar & tidak ribet** (banyak reuse komponen/pola yang sudah ada).

**Prinsip:** *reuse dulu, bangun baru hanya bila perlu.* Identitas visual brand (`#004EDF`, putih, radius) dipertahankan.

---

## 2. Baseline — Kondisi Sistem Portfolio Saat Ini

### 2.1 Arsitektur

```
Firestore "projects"  ──►  lib/projects.ts  ──►  app/portofolio/*  ──►  components/*
Firestore "media"     ──►  lib/portfolio-media.ts  ──►  cover & galeri (via projectSlug)
Admin /admin/projects ──►  admin-api → api/admin/projects → lib/projects.ts
```

### 2.2 Tipe & Data

**`Project`** (`project-types.ts:12-29`):
| Field | Tipe | Catatan |
|---|---|---|
| `slug`, `title`, `client`, `category`, `serviceSlug` | string | |
| `year` | number | untuk sorting |
| `summary` | string | meta description |
| `cover` | string | **BUKAN URL** — kunci tema placeholder (default `"default"`) |
| `accent` | string | kelas gradient Tailwind |
| `tags` | string[] | tampil di kartu saja |
| `challenge`, `solution` | string | studi kasus |
| `results` | string[] | poin hasil |
| `metrics` | `{label,value}[]` | |
| `techStack` | string[] | |
| `testimonial` | `{quote,author,role}?` | opsional |

- Disimpan di koleksi `projects`, **doc id = slug**.
- `getProjects()` fallback ke `DEFAULT_PROJECTS` (**6 contoh placeholder**, semua `year: 2026`) hanya bila Admin SDK belum dikonfigurasi.
- **Tidak ada** field: `gallery`, `coverImage`, `featured`, `order`, `status`, `updatedAt` (ditulis tapi tak dibaca), `clientLogo`, `liveUrl`.

### 2.3 Halaman Publik
- **`/portofolio`**: filter kategori (client-side), grid 1/2/3 kolom, kartu → detail. **Tanpa search/sort/pagination.**
- **`/portofolio/[slug]`**: hero (breadcrumb, chip kategori, meta klien/tahun/layanan) → cover + **galeri statis** + metrics (grid `grid-cols-3` hardcoded) → tantangan/solusi → hasil + tech stack → testimoni (opsional) → CTA → "3 proyek lainnya" (tanpa relevansi).

### 2.4 Dashboard
- `projects-manager.tsx` (570 baris): daftar + form lengkap semua field teks.
- **Gambar TIDAK bisa dikelola di sini** — hanya teks info "kelola di menu Media".
- Kategori = **input teks bebas** (rawan typo/duplikat).

### 2.5 Media
- Relasi via `media.projectSlug`; kategori media `"portofolio"`.
- `getPortfolioMediaMap()` mengelompokkan media per proyek: **gambar pertama = cover, sisanya = galeri** (urut by `order`).

---

## 3. Audit — Temuan & Celah

Format: **[PF-xx] Judul** — *Severity* — Lokasi — Dampak — Rekomendasi.
Severity: 🔴 Tinggi · 🟠 Menengah · 🔵 Rendah.

### 3.1 Halaman Detail

**[PF-01] Galeri detail tidak interaktif** — 🔴 Tinggi
- **Lokasi:** `app/portofolio/[slug]/page.tsx:166-181` (grid statis `sm:grid-cols-2`).
- **Dampak:** Pengunjung tak bisa memperbesar/melihat gambar dengan jelas — padahal portfolio = bukti kualitas. Kontras dengan Produk yang sudah punya `ProductGallery`+`ProductLightbox`.
- **Rekomendasi:** Reuse pola galeri produk (gambar besar + thumbnail strip + lightbox). Idealnya jadi komponen **generic** `MediaGallery` yang dipakai Produk & Portfolio.

**[PF-02] Metrics grid `grid-cols-3` hardcoded** — 🟠 Menengah
- **Lokasi:** `page.tsx:183-195`.
- **Dampak:** Jika metrik ≠ 3 → berdesakan/ menggantung. Admin bebas mengisi jumlah metrik.
- **Rekomendasi:** Grid responsif dinamis (`grid-cols-2 sm:grid-cols-3`, atau auto-fit) yang menyesuaikan jumlah.

**[PF-03] "Proyek lainnya" tidak relevan** — 🟠 Menengah
- **Lokasi:** `page.tsx:80` (`filter(...).slice(0,3)`).
- **Dampak:** Menampilkan 3 proyek sembarang (bukan yang kategori/layanan sama), kurang membangun konteks.
- **Rekomendasi:** Prioritaskan proyek dengan kategori/layanan sama, baru sisanya; tampilkan sebagai **kartu** (bukan baris ikon) agar konsisten.

**[PF-04] `tags` tidak tampil di detail** — 🔵 Rendah
- **Lokasi:** `page.tsx` (tags hanya di kartu).
- **Dampak:** Kehilangan konteks & keyword. **Rekomendasi:** Tampilkan tag di hero/tags bar.

**[PF-05] Ratio gambar kaku (16/10) & metadata media tak dipakai** — 🟠 Menengah
- **Lokasi:** `project-cover.tsx:39` (`aspect-[16/10]`).
- **Dampak:** Gambar potret/landscape beda rasio ter-crop aneh; `width/height/blurHash/dominantColor` dari Media tak dimanfaatkan (tak ada blur placeholder).
- **Rekomendasi:** Utamakan ratio 16:9 (konsisten dgn produk), gunakan `blurHash`/`dominantColor` sebagai placeholder.

**[PF-06] Tidak ada disclaimer data contoh** — 🟠 Menengah
- **Lokasi:** `content.ts:810-814` (6 proyek placeholder `year: 2026`).
- **Dampak:** Proyek contoh tampil seolah nyata → risiko trust (seperti temuan KR-1 audit lama). **Rekomendasi:** Beri penanda/badge "Contoh" saat fallback, atau kosongkan & dorong isi data asli.

### 3.2 Halaman Daftar

**[PF-07] Tanpa search** — 🔴 Tinggi — `portfolio-grid.tsx` — Sulit menemukan proyek di antara banyak item. **Rekomendasi:** Input pencarian (judul/klien/tag) + state URL.

**[PF-08] Tanpa sorting** — 🟠 Menengah — hanya urutan server (tahun desc). **Rekomendasi:** Sort baru/terlama/A–Z.

**[PF-09] Tanpa pagination** — 🟠 Menengah — semua proyek dirender sekaligus. **Rekomendasi:** Pagination/"muat lagi" (pola Media/Orders).

**[PF-10] Filter hanya kategori; tag/tahun tak bisa difilter** — 🟠 Menengah. **Rekomendasi:** Tambah filter tag (dan/atau tahun) + chips.

**[PF-11] State filter tidak di URL** — 🔵 Rendah — reload/share hilang filter. **Rekomendasi:** Sinkronkan ke query string (`?kategori=`, `?q=`).

### 3.3 Dashboard

**[PF-12] Tidak bisa kelola cover/galeri di form proyek** — 🔴 Tinggi
- **Lokasi:** `projects-manager.tsx:527-533` (hanya info text).
- **Dampak:** Alur mengelola gambar berbelit (harus ke menu Media). **Rekomendasi:** MediaPicker multiple (reuse) + reorder + preview di form.

**[PF-13] Tidak ada `featured`/`order`/`status`** — 🟠 Menengah — tak bisa kurasi/urutan manual; beranda menampilkan "3 pertama" apa adanya. **Rekomendasi:** Tambah `featured` (unggulan) + `order` (kurasi).

**[PF-14] Kategori input bebas (rawan typo)** — 🟠 Menengah — `:358-365`. **Rekomendasi:** Jadikan select terkontrol (dari daftar kategori + opsi tambah).

**[PF-15] Validasi lemah** — 🟠 Menengah — tak ada cek `accent` valid, format `metrics`, panjang teks. **Rekomendasi:** Perkuat validasi + pesan inline; manfaatkan `isSlugTaken` server.

### 3.4 Media & Integrasi

**[PF-16] Usage tracking galeri kosong** — 🔵 Rendah — `media-usage.ts:155-172` hanya baca `cover`. **Rekomendasi:** Perluas pemindaian ke galeri (via `projectSlug`).

**[PF-17] `cover` (field seed) hampir tak bermakna** — 🔵 Rendah — hanya seed pola. **Rekomendasi:** Dokumentasikan; jadikan murni fallback visual.

### 3.5 SEO

**[PF-18] Tanpa JSON-LD per proyek** — 🟠 Menengah — tak ada `CreativeWork`/`CaseStudy`/`BreadcrumbList`. **Rekomendasi:** Tambah JSON-LD di `[slug]`.

**[PF-19] Tanpa OG image per proyek** — 🟠 Menengah — padahal cover Cloudinary tersedia. **Rekomendasi:** `openGraph.images` dari cover.

**[PF-20] Sitemap `lastModified` proyek = `now`** — 🔵 Rendah. **Rekomendasi:** Pakai tanggal update nyata (bila ada).

### 3.6 Konsistensi & Lain-lain

**[PF-21] `ProjectCard` impor tipe dari `@/lib/content`** (bukan `project-types`) — 🔵 Rendah (kosmetik).

**[PF-22] `getProjects` fallback demo tanpa penanda** — 🟠 Menengah (lihat PF-06).

**[PF-23] Tidak ada seed script proyek** — 🔵 Rendah — 6 proyek contoh hidup di `content.ts`, bukan di Firestore. **Rekomendasi:** Buat `scripts/seed-project*.mjs` (opsional) agar data contoh/nyata konsisten & mudah di-setup.

**[PF-24] `updatedAtISO`/`updatedBy` ditulis tapi tak dibaca** — 🔵 Rendah. **Rekomendasi:** Baca untuk "terakhir diperbarui" di UI/sitemap.

### 3.7 Ringkasan temuan

| ID | Temuan | Severity | Fase |
|---|---|---|---|
| PF-01 | Galeri detail tidak interaktif | 🔴 | F2 |
| PF-07 | Tanpa search (daftar) | 🔴 | F3 |
| PF-12 | Tak bisa kelola gambar di form proyek | 🔴 | F4 |
| PF-02 | Metrics grid hardcoded | 🟠 | F2 |
| PF-03 | "Proyek lainnya" tak relevan | 🟠 | F2 |
| PF-05 | Ratio kaku & metadata media tak dipakai | 🟠 | F2 |
| PF-06/22 | Data contoh tanpa penanda | 🟠 | F5 |
| PF-08 | Tanpa sorting | 🟠 | F3 |
| PF-09 | Tanpa pagination | 🟠 | F3 |
| PF-10 | Filter hanya kategori | 🟠 | F3 |
| PF-13 | Tanpa featured/order | 🟠 | F4 |
| PF-14 | Kategori input bebas | 🟠 | F4 |
| PF-15 | Validasi lemah | 🟠 | F4 |
| PF-18 | Tanpa JSON-LD per proyek | 🟠 | F6 |
| PF-19 | Tanpa OG image per proyek | 🟠 | F6 |
| PF-04 | Tags tak tampil di detail | 🔵 | F2 |
| PF-11 | Filter tak di URL | 🔵 | F3 |
| PF-16 | Usage tracking galeri kosong | 🔵 | F6 |
| PF-17 | `cover` seed hampir tak bermakna | 🔵 | F2 |
| PF-20 | Sitemap lastModified = now | 🔵 | F6 |
| PF-21 | Impor tipe tak konsisten | 🔵 | F1 |
| PF-23 | Tanpa seed script proyek | 🔵 | F5 |
| PF-24 | `updatedAt/By` tak dibaca | 🔵 | F6 |

---

## 4. Prinsip Desain & Keputusan

### 4.1 Prinsip
1. **Reuse dulu.** `ProductGallery`/`ProductLightbox`, `MediaPickerDialog`, `ConfirmDialog`, `useToast`, `useAsyncList` sudah ada — pakai, jangan bikin baru bila bisa digeneralisasi.
2. **Tidak ribet.** Fitur yang menambah kompleksitas tanpa nilai jelas **tidak** diambil (lihat Out of Scope).
3. **Konsisten** dengan produk & modul lain (urutan filter, badge, ratio 16:9, pola a11y).
4. **Profesional**: perhatian ke detail (ratio, placeholder, state kosong, SEO, aksesibilitas).
5. **Data-driven**: `featured`/`order` untuk kurasi tanpa coding.

### 4.2 Keputusan
| # | Keputusan | Alasan | Alternatif ditolak |
|---|---|---|---|
| D1 | **Generalisasi galeri** menjadi komponen bersama (`MediaGallery` + lightbox) yang dipakai Produk & Portfolio | Hindari duplikasi; satu perawatan | Salin `ProductGallery` khusus portfolio |
| D2 | Galeri tetap dikelola via **koleksi media** (`projectSlug`), tapi **bisa dari form proyek** lewat MediaPicker | Data sudah ada; tinggal jembatan UX | Pindahkan galeri ke dokumen project (breaking schema) |
| D3 | **Filter/search/sort client-side** (data portfolio relatif kecil) + state URL | Tak perlu endpoint baru; cepat | Server-side search (overkill sekarang) |
| D4 | Tambah `featured` + `order` di `Project` | Kurasi beranda & urutan tanpa hardcode | Hardcode "3 pertama" |
| D5 | **Kategori jadi select terkontrol** (daftar tetap + opsi tambahan) | Cegah kategori duplikat/typo | Bebas teks (sekarang) |
| D6 | Ratio **16:9** konsisten (seperti produk) | Keseragaman visual | 16/10 (sekarang) |
| D7 | JSON-LD + OG image per proyek | SEO & share link profesional | Biarkan kosong |
| D8 | **Tanpa** kelas multi-role/approval/versioning | Di luar kebutuhan | RBAC, revisi |

---

## 5. Spesifikasi Target per Area

### 5.1 Halaman Daftar `/portofolio`
```
┌───────────────────────────────────────────────┐
│  [Hero: judul + deskripsi + stats]            │
│───────────────────────────────────────────────│
│ [🔍 Cari proyek...]   [Kategori ▾] [Urut ▾]   │  ← toolbar
│ [Semua] [Website] [Mobile] [Toko Online] ...   │  ← chips kategori
│                                               │
│   ┌────────┐  ┌────────┐  ┌────────┐          │  ← grid kartu (16:9)
│   │ card   │  │ card   │  │ card   │          │
│   └────────┘  └────────┘  └────────┘          │
│   ... (pagination / "Muat lagi")              │
└───────────────────────────────────────────────┘
```
- **Search**: judul + klien + tags (case-insensitive).
- **Filter**: kategori (chips) + opsional **tag**/tahun.
- **Sort**: Terbaru (default) · Terlama · Judul A–Z.
- **URL state**: `?kategori=...&q=...&sort=...` (agar bisa dibagikan/bookmark).
- **Pagination**: "Muat lagi" (pola Media) atau tombol halaman — pilih salah, tidak keduanya.
- **Empty state**: bedakan "belum ada proyek" vs "tidak cocok filter".

### 5.2 Halaman Detail `/portofolio/[slug]`
```
┌───────────────────────────────────────────────┐
│ Breadcrumb · chip kategori · tags             │
│ H1 Judul                                       │
│ Klien · Tahun · Layanan (link)                │
│───────────────────────────────────────────────│
│ GALLERY INTERAKTIF (gambar besar 16:9 +       │
│ thumbnail strip + klik → LIGHTBOX)            │  ← PF-01
│───────────────────────────────────────────────│
│ Metrics (grid responsif, dinamis)             │  ← PF-02
│───────────────────────────────────────────────│
│ Tantangan & Solusi                             │
│ Hasil & Dampak + Tech Stack                    │
│ Testimoni (bila ada)                           │
│ CTA "Punya kebutuhan serupa?" (WhatsApp)       │
│ Proyek terkait (kategori/layanan sama)         │  ← PF-03
└───────────────────────────────────────────────┘
```
- Galeri **interaktif** (reuse `ProductGallery`/`ProductLightbox` yang digeneralisasi).
- Metrics grid **dinamis** (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` menyesuaikan).
- **Tags** ditampilkan (chips).
- **Proyek lainnya**: utamakan kategori/layanan sama, tampil sebagai kartu.
- Metadata: OG image dari cover + JSON-LD `CreativeWork`/`BreadcrumbList`.

### 5.3 Dashboard `/admin/projects`
- **Form proyek** + section **Gambar**:
  - Cover: **MediaPicker single** (reuse) → simpan sebagai aset media kategori `portofolio` + `projectSlug`.
  - Galeri: **MediaPicker multiple** + reorder + hapus (reuse pola galeri produk).
  - Preview + hint "gambar pertama = cover".
- **Field baru**: `featured` (toggle "Unggulan"), `category` jadi **select**.
- **Validasi**: kategori wajib, `metrics` format tervalidasi, pesan inline.
- **Daftar**: badge "Unggulan", tombol reorder opsional (atau andalkan `order`).
- **Selaras** dengan sistem media (`projectSlug`).

### 5.4 Media & Data
- Perluas `media-usage` agar galeri proyek terhitung (PF-16).
- Pertahankan relasi media `projectSlug`.
- (Opsional) `scripts/seed-project.mjs` untuk data awal.

### 5.5 SEO
- JSON-LD per proyek (`CreativeWork`/`CaseStudy` + `BreadcrumbList`).
- `openGraph.images` dari cover.
- Sitemap: `lastModified` dari `updatedAtISO` bila ada.

---

## 6. Arsitektur Implementasi

### 6.1 File BARU

| File | Peran |
|---|---|
| `src/components/media-gallery.tsx` | **Galeri generik** (gambar besar + thumbnail strip + lightbox) — diekstrak dari `ProductGallery` agar dipakai Produk & Portfolio. |
| `src/components/media-lightbox.tsx` | **Lightbox generik** — diekstrak dari `ProductLightbox`. (Atau tetap `product-lightbox` di-rename/di-reuse.) |
| `src/components/portfolio-toolbar.tsx` | Toolbar search + filter + sort untuk daftar portfolio. |
| (Opsional) `src/components/admin/project-media-field.tsx` | Field gambar (cover + galeri) di form proyek (MediaPicker). |
| (Opsional) `scripts/seed-project.mjs` | Seed data proyek. |

### 6.2 File DIUBAH

| File | Perubahan |
|---|---|
| `src/lib/project-types.ts` | Tambah `featured?: boolean`, `order?: number` (+ mungkin `updatedAt?`). |
| `src/lib/projects.ts` | Normalizer dukung field baru; sorting pakai `order`+`featured`; baca `updatedAt`. |
| `src/components/portfolio-grid.tsx` | Tambah search, sort, filter tag, URL state, pagination, empty state. |
| `src/app/portofolio/page.tsx` | Teruskan data tambahan (kategori, tag) ke grid; metadata. |
| `src/app/portofolio/[slug]/page.tsx` | Galeri interaktif; metrics dinamis; tags; proyek terkait relevan; JSON-LD; OG image. |
| `src/components/project-cover.tsx` | Ratio 16:9; manfaatkan `blurHash`/`dominantColor`; badge "Contoh" bila placeholder. |
| `src/components/admin/projects-manager.tsx` | Field gambar (MediaPicker), `featured`, kategori select, validasi. |
| `src/components/admin/media-manager.tsx` | (Bila perlu) penyesuaian relasi galeri ↔ proyek. |
| `src/lib/media-usage.ts` | Perluas scan ke galeri proyek. |
| `src/app/sitemap.ts` | `lastModified` dari `updatedAtISO`. |

### 6.3 Prinsip generalisasi galeri (penting)

`ProductGallery`/`ProductLightbox` saat ini spesifik produk (prop `productName`). Ekstrak menjadi generik:
```ts
// media-gallery.tsx (generik)
type GalleryImage = { url: string; alt: string };
export function MediaGallery({
  images, label, className,
}: { images: GalleryImage[]; label?: string; className?: string }) { ... }
```
→ `ProductGallery` menjadi **wrapper tipis** yang memanggil `MediaGallery` (agar kode produk tak berubah banyak), dan portfolio memakai `MediaGallery` langsung.

---

## 7. TASK IMPLEMENTATION FLOW (FASE 0–7)

> Tiap fase berdiri sendiri, bisa dites, commit terpisah (`feat(portfolio): ...`).

### FASE 0 — Persiapan & baseline (±20 menit)
- [ ] Baca dokumen ini + `docs/2026-10-02-revisi-sistem-produk.md`.
- [ ] Baseline: `npx tsc --noEmit` bersih, `npm run lint` bersih, `npm run build` sukses.
- [ ] Siapkan proyek uji + gambar di Media (kategori `portofolio`, kaitkan `projectSlug`).
- [ ] Screenshot "before": `/portofolio`, detail proyek, form admin.

### FASE 1 — Fondasi: field baru + generalisasi galeri (±1.5 jam)
- [ ] `project-types.ts`: tambah `featured?`, `order?`; `projects.ts`: normalizer + sorting (`featured` dulu, lalu `order`, lalu `year`).
- [ ] Ekstrak `MediaGallery` + `MediaLightbox` generik dari komponen produk; jadikan `ProductGallery` wrapper tipis (pastikan halaman produk tetap identik).
- [ ] `project-card.tsx`: perbaiki impor tipe ke `@/lib/project-types` (PF-21).
- **DoD:** `tsc`/`lint`/`build` bersih; halaman Produk tidak berubah (regresi nol); field baru tersimpan & terbaca.

### FASE 2 — Halaman detail yang profesional (±3–4 jam)
- [ ] Ganti galeri statis → `MediaGallery` interaktif (PF-01). Fallback: bila hanya ada cover, tampil sebagai gambar tunggal.
- [ ] Metrics grid dinamis (PF-02).
- [ ] Tampilkan `tags` (PF-04).
- [ ] "Proyek lainnya" berbasis relevansi kategori/layanan, tampil sebagai kartu (PF-03).
- [ ] `project-cover.tsx`: ratio 16:9 + placeholder blur/dominantColor (PF-05); badge "Contoh" bila placeholder (PF-06).
- **DoD:** galeri bisa diklik/zoom/navigasi; metrics rapi berapa pun jumlahnya; proyek lain relevan.

### FASE 3 — Daftar portfolio yang kuat (±3 jam)
- [ ] Toolbar: **search**, **filter kategori (+tag)**, **sort** (PF-07/08/10).
- [ ] **URL state** (`?kategori&q&sort`) (PF-11).
- [ ] **Pagination / "Muat lagi"** (PF-09).
- [ ] Empty state & hitungan hasil.
- [ ] A11y: `aria-pressed` chips, label input, `role="group"`.
- **DoD:** cari/filter/sort/paginate berfungsi & bisa dibagikan via URL.

### FASE 4 — Dashboard: kelola gambar & kurasi (±3 jam)
- [ ] Field **Gambar** di form proyek (cover MediaPicker single + galeri multiple + reorder) (PF-12).
- [ ] **`featured`** toggle + **kategori select terkontrol** (PF-13/14).
- [ ] Validasi diperkuat + pesan inline (PF-15).
- [ ] Badge "Unggulan" di daftar; (opsional) reorder.
- **DoD:** admin bisa atur cover+galeri & unggulan tanpa keluar dari form; kategori konsisten.

### FASE 5 — Data contoh & integritas (±1 jam)
- [ ] Penanda/badge "Contoh" untuk proyek placeholder (fallback) (PF-06/22).
- [ ] (Opsional) `scripts/seed-project.mjs` untuk data awal (PF-23).
- [ ] Dorong pengisian data asli (via dashboard).
- **DoD:** tidak ada proyek contoh yang tampil seolah nyata tanpa penanda; seed (jika dibuat) idempoten.

### FASE 6 — SEO & integrasi media (±1.5 jam)
- [ ] JSON-LD `CreativeWork`/`CaseStudy` + `BreadcrumbList` (PF-18).
- [ ] `openGraph.images` dari cover (PF-19).
- [ ] Sitemap `lastModified` dari `updatedAtISO` (PF-20/24).
- [ ] Perluas `media-usage` ke galeri proyek (PF-16).
- **DoD:** structured data valid; share link punya gambar; usage akurat.

### FASE 7 — QA, dokumentasi & deploy
- [ ] `tsc`/`lint`/`build` bersih.
- [ ] Checklist QA §8.
- [ ] Dokumentasi: status ✅ + bagian "Status Eksekusi"; update `docs/README.md` & `TASK-SELANJUTNYA.md`.
- [ ] Commit per fase → push → uji produksi.

---

## 8. Definition of Done & Checklist QA

### 8.1 DoD global
1. `tsc` bersih, `build` sukses, `lint` bersih (0 error/warning baru).
2. Semua checklist QA lolos.
3. Tidak ada regresi: halaman Produk (galeri), beranda (teaser portfolio), Media manager.
4. Tidak ada perubahan `firestore.rules` (tanpa koleksi baru).

### 8.2 Halaman detail
- [ ] Galeri bisa diklik → lightbox; prev/next, Esc, klik luar menutup.
- [ ] Thumbnail aktif tersorot; mobile bisa swipe/scroll.
- [ ] Metrics rapi untuk 2, 3, 4, 6 metrik.
- [ ] Tags tampil; proyek terkait relevan (kategori/layanan sama diutamakan).
- [ ] Ratio 16:9 konsisten di semua device.

### 8.3 Halaman daftar
- [ ] Search (judul/klien/tag) & filter kategori & sort berfungsi.
- [ ] Kategori/tag dinamis (hanya yang ada).
- [ ] URL state bisa dibagikan (reload mempertahankan filter).
- [ ] Pagination/"Muat lagi" berhenti benar.
- [ ] Empty state jelas (belum ada vs tidak cocok).

### 8.4 Dashboard
- [ ] Form proyek bisa pilih cover (single) & galeri (multiple) via MediaPicker + reorder.
- [ ] `featured` tersimpan; badge "Unggulan" tampil; beranda pakai featured.
- [ ] Kategori jadi select; tidak bisa bikin kategori duplikat.
- [ ] Validasi menampilkan pesan jelas (slug duplikat, tahun, required).

### 8.5 SEO & media
- [ ] JSON-LD proyek valid (uji Rich Results).
- [ ] OG image = cover proyek (uji share preview).
- [ ] Usage media galeri terhitung.

### 8.6 Regresi
- [ ] Halaman Produk (galeri+lightbox) tetap normal setelah generalisasi.
- [ ] Beranda (teaser) tetap normal.
- [ ] `npm run build` sukses tanpa error.

---

## 9. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Generalisasi galeri (produk) menyebabkan regresi | Tinggi | Jadikan `ProductGallery` wrapper tipis; uji produk after-change |
| R2 | Galeri tetap via `projectSlug` → mengelola cover dari form perlu menulis ke koleksi media | Sedang | MediaPicker mengembalikan `publicId`/`secureUrl`; simpan sebagai media kategori `portofolio` + `projectSlug` |
| R3 | Menambah field (`featured`/`order`) → data lama tanpa field | Rendah | Normalizer beri default; tidak breaking |
| R4 | Kategori select bisa membatasi admin | Rendah | Sediakan opsi "tambah kategori baru" |
| R5 | Search/sort client-side berat saat data banyak | Rendah | Portfolio jarang >100; jika tumbuh → paginate |
| R6 | JSON-LD salah format | Rendah | Uji dengan Google Rich Results Test |
| R7 | `blurHash`/`dominantColor` tidak selalu ada | Rendah | Fallback gradient (existing) |
| R8 | Scope merembet (versioning, RBAC) | Sedang | Ditandai Out of Scope |

---

## 10. Out of Scope

- Sistem **multi-bahasa** portfolio.
- **Versioning/revisi** proyek.
- **RBAC/role** (single admin).
- **Approval workflow / status draft** proyek.
- Migrasi galeri ke dalam dokumen `Project` (schema tetap: galeri via koleksi media).
- Komentar/rating publik pada proyek.
- **Client portal** (klien login melihat proyeknya).

---

## 11. Estimasi & Urutan Pengerjaan

| Fase | Isi | Estimasi* | Nilai |
|---|---|---|---|
| F0 | Persiapan | 20 mnt | — |
| F1 | Field baru + generalisasi galeri | 1.5 jam | Fondasi |
| F2 | Detail profesional (galeri, metrics, tags, related) | 3–4 jam | 🔴 Terasa paling besar |
| F3 | Daftar kuat (search/sort/filter/pagination) | 3 jam | 🔴 |
| F4 | Dashboard kelola gambar + kurasi | 3 jam | 🟠 |
| F5 | Data contoh & seed | 1 jam | 🟠 |
| F6 | SEO & media | 1.5 jam | 🟠 |
| F7 | QA & deploy | 1–2 jam | Wajib |

**Total inti (F0–F7):** ± 14–16 jam terfokus.
**Bila 1 sesi:** F1–F3 memberi lompatan terbesar (detail + daftar). F4–F6 menyusul.

---

## 12. Lampiran — Referensi Pola Existing

| Kebutuhan | Referensi existing |
|---|---|
| Galeri + lightbox (untuk digeneralisasi) | `src/components/product-gallery.tsx`, `src/components/product-lightbox.tsx` |
| MediaPicker single/multiple | `src/components/admin/media-picker-dialog.tsx` |
| Field galeri admin (MediaPicker multiple + reorder) | `src/components/admin/products-manager.tsx` (field galeri) |
| Manager list + filter + search + optimistic | `src/components/admin/leads-manager.tsx`, `orders-manager.tsx` |
| Pagination "muat lagi" | `src/components/admin/media-manager.tsx` (cursor) / `orders-manager.tsx` |
| Relasi media ↔ proyek | `src/lib/portfolio-media.ts`, `src/lib/media-types.ts` (`projectSlug`) |
| Toast / Confirm / Unsaved guard | `src/components/admin/toast.tsx`, `confirm-dialog.tsx`, `unsaved-changes.tsx` |
| JSON-LD pola | `src/app/produk/[slug]/page.tsx` (Product), `src/components/structured-data.tsx` |
| Ratio & placeholder | `src/components/product-card.tsx` (16:9), `src/components/project-cover.tsx` |
| Kategori dari data | `src/lib/projects.ts` (`getProjectCategories`) |

---

## CATATAN PENUTUP

Sistem portfolio punya **fondasi data yang cukup baik**; yang kurang adalah **lapisan pengalaman** (galeri interaktif, pencarian, kurasi) dan **penghubung UX** (kelola gambar di form). Dengan **menggeneralisasi galeri** dan **memakai ulang pola yang sudah matang** (Media/Produk/Orders), upgrade ini bisa **profesional tanpa ribet**.

**Prioritas eksekusi:** F1 → F2 (detail) → F3 (daftar) → F4 (dashboard) → F5–F6 (pelengkap) → F7.

> Setelah dieksekusi, ubah status di header + tambah bagian "Status Eksekusi", dan catat temuan baru sebagai `PF-25+` bila ada.
