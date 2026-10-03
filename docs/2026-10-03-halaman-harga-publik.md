# HALAMAN HARGA / PAKET PUBLIK — Rencana & Task Implementation Flow

> **Status dokumen:** 📝 **Rencana** (belum dieksekusi)
> **Disusun:** 2026-10-03
> **Cakupan:** Halaman publik baru `/harga` — kartu paket, **tabel banding**, **FAQ harga**, CTA, metadata/SEO, JSON-LD, integrasi navigasi & analytics.
> **Tujuan:** Menjadikan "harga" sebagai **halaman khusus** (bukan hanya section di beranda) sehingga jadi **titik konversi tinggi** yang mudah dibagikan/di-link dari mana saja (beranda, layanan, produk, blog, footer).
> **Prasyarat baca:** `docs/2026-10-02-upgrade-sistem-layanan.md` (pola paket + tabel banding), `docs/2026-10-03-peningkatan-blog-seo-discovery.md` (pola metadata/JSON-LD), `docs/README.md`.

---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Baseline — Kondisi Harga Saat Ini](#2-baseline--kondisi-harga-saat-ini)
3. [Keputusan Desain](#3-keputusan-desain)
4. [Audit — Temuan & Celah](#4-audit--temuan--celah)
5. [Spesifikasi Target](#5-spesifikasi-target)
6. [Arsitektur Implementasi](#6-arsitektur-implementasi)
7. [TASK IMPLEMENTATION FLOW (FASE 0–7)](#7-task-implementation-flow-fase-07)
8. [Definition of Done & Checklist QA](#8-definition-of-done--checklist-qa)
9. [Risiko & Mitigasi](#9-risiko--mitigasi)
10. [Out of Scope](#10-out-of-scope)
11. [Estimasi & Urutan Pengerjaan](#11-estimasi--urutan-pengerjaan)
12. [Lampiran — Referensi Pola Existing](#12-lampiran--referensi-pola-existing)

---

## 1. Ringkasan Eksekutif

Saat ini informasi **harga/paket hanya hidup sebagai section di beranda** (`#harga`) dan tidak punya halaman sendiri. Akibatnya:

- Pengunjung yang mencari "harga" dari Google tidak mendarat di halaman khusus → **peluang SEO hilang**.
- Tidak ada URL bersih untuk dibagikan (`/harga`) — hanya anchor `/#harga` yang bisa patah bila urutan section berubah.
- Tidak ada **tabel banding paket** di konteks harga umum (tabel banding baru ada di detail layanan, per-layanan).
- Tidak ada **FAQ khusus harga** (FAQ beranda bersifat umum).
- Paket di beranda memakai istilah **"Professional"** yang **tidak konsisten** dengan "Profesional" di detail layanan.

**Rencana:** Bangun halaman publik **`/harga`** yang menjadi **pusat informasi paket & harga umum LKTech**, berisi:
1. Hero dengan nilai jual + CTA ganda (Konsultasi WhatsApp + Lihat Produk).
2. **Kartu paket** (Basic / Profesional / Enterprise) dengan badge unggulan + **CTA WhatsApp per paket**.
3. **Tabel banding** fitur antar paket (responsif, scroll-x mobile).
4. **Cara kerja/langkah** singkat (opsional, reuse alur kerja).
5. **FAQ khusus harga** (akordeon).
6. **CTA penutup** (`CtaContact`).

**Prinsip:** Reuse sebanyak mungkin komponen & pola existing (PageHero, Reveal, FaqAccordion, CtaContact, TrackedWaButton). **Tidak** menduplikasi data — sumber paket umum bisa memakai `SiteContent.pricing` (dikelola dashboard) yang **diperkaya** dengan tabel banding hardcoded, atau seluruhnya hardcoded bila lebih sederhana.

---

## 2. Baseline — Kondisi Harga Saat Ini

### 2.1 Data
- **Paket umum** di `SiteContent.pricing` (`ManagedPricing`): `{ name, description, features[], highlight }` — **tanpa** harga angka, tanpa badge, tanpa CTA per paket. Dikelola via `/admin/pricing`. Default: `PRICING` di `content.ts`.
- **Paket per-layanan** (hardcoded) di `src/lib/services.ts` → `packages` + `packageCompare` + badge "Rekomendasi" + CTA per paket. *Konsep berbeda* (khusus per layanan).
- **Produk** (`/produk`) = produk digital siap pakai dengan **harga angka nyata** (`Product.price`), checkout WhatsApp. *Konsep berbeda*.
- **FAQ** umum di `SiteContent.faqs` (dikelola dashboard).

### 2.2 Tampilan
- Section `Pricing` (`src/components/sections/pricing.tsx`) di beranda: 3 kartu, badge "Paling Populer", CTA "Konsultasi Gratis" (WhatsApp). **Tanpa** tabel banding, **tanpa** harga angka.
- Nav: `NAV_LINKS` baris `Harga → /#harga` (anchor beranda). `PAGE_NAV_LINKS` (halaman dalam) **tidak** memuat "Harga".

### 2.3 Yang tidak ada
- Halaman `/harga` (URL khusus).
- Tabel banding paket umum.
- FAQ khusus harga.
- `sitemap.xml` entri `/harga`.
- JSON-LD `Offer`/`Product`/`PriceSpecification` (opsional).

---

## 3. Keputusan Desain

| # | Keputusan | Alasan |
|---|---|---|
| D1 | `/harga` = **halaman publik mandiri** (bukan redirect ke `/#harga`) | URL bersih, SEO, mudah dibagikan/di-link |
| D2 | **Harga tanpa angka** (konsultasi) untuk paket jasa; **produk** tetap punya harga angka di `/produk` | Konsisten dengan keputusan pemilik (harga jasa menyesuaikan proyek) |
| D3 | **Sumber paket umum tetap `SiteContent.pricing`** (dikelola dashboard) — halaman `/harga` membacanya; **tabel banding** disimpan hardcoded (baru) | Admin tetap bisa ubah paket dari dashboard; banding cukup di kode |
| D4 | Perbaiki istilah **"Professional" → "Profesional"** | Konsistensi bahasa (selaras detail layanan) |
| D5 | Tambah **CTA WhatsApp per paket** + badge "Paling Populer" (sudah ada) | Dorong konversi |
| D6 | **FAQ khusus harga** (hardcoded, terpisah dari FAQ umum beranda) | Pertanyaan khas harga (biaya, pembayaran, garansi) |
| D7 | **Tidak** menghapus section `Pricing` di beranda — tetap ada sebagai ringkasan, tapi CTA-nya mengarah ke `/harga` | Beranda tetap ringkas; detail pindah ke `/harga` |
| D8 | Tambah "Harga" ke `PAGE_NAV_LINKS` (nav halaman dalam) | Mudah diakses dari seluruh halaman |
| D9 | Pertahankan `NAV_LINKS."Harga" → /#harga` di beranda, tambah tautan ke `/harga` dari section beranda | Backward-compatible, tidak memutus anchor |

---

## 4. Audit — Temuan & Celah

Format: **[HG-xx] Judul** — *Severity* — Lokasi — Dampak — Rekomendasi.

### 4.1 Konten & SEO

**[HG-01] Tidak ada halaman khusus harga** — 🔴 Tinggi — `src/app/**` (hanya `/#harga`). — Peluang SEO & konversi hilang. — **Rekomendasi:** Buat `/harga` dengan metadata lengkap.

**[HG-02] Tidak ada tabel banding paket umum** — 🟠 Menengah — `sections/pricing.tsx`. — Sulit membandingkan paket. — **Rekomendasi:** Tabel banding (Basic/Profesional/Enterprise) responsif.

**[HG-03] Tidak ada FAQ khusus harga** — 🟠 Menengah — FAQ beranda bersifat umum. — Pertanyaan harga tidak terjawab. — **Rekomendasi:** Akordeon FAQ harga (biaya, pembayaran, garansi, dll).

**[HG-04] `/harga` tak ada di sitemap** — 🟠 Menengah — `src/app/sitemap.ts`. — Tidak terindeks optimal. — **Rekomendasi:** Tambah entri `/harga` (priority tinggi).

### 4.2 Konsistensi & Navigasi

**[HG-05] Istilah "Professional" tidak konsisten** — 🔵 Rendah — `content.ts:1154` (dan default `PRICING`). — Bahasa campur. — **Rekomendasi:** "Profesional".

**[HG-06] "Harga" tidak ada di nav halaman dalam** — 🟠 Menengah — `PAGE_NAV_LINKS`. — Halaman tak terjangkau dari nav mobile/global. — **Rekomendasi:** Tambah item "Harga" → `/harga`.

**[HG-07] CTA harga hanya "Konsultasi Gratis" (tanpa banding/CTA per paket berbeda)** — 🟠 Menengah — `sections/pricing.tsx`. — Kurang mendorong pilihan. — **Rekomendasi:** CTA per paket + tautan ke detail di `/harga`.

### 4.3 Teknis

**[HG-08] Tidak ada JSON-LD untuk paket/harga** — 🔵 Rendah. — **Rekomendasi:** `Offer`/`PriceSpecification` (opsional, tanpa angka → pakai `"Harga menyesuaikan"` atau `Offer` tanpa price) — bila mudah.

**[HG-09] Tabel banding berisiko tak rapi di mobile** — 🟠 Menengah (jika dibuat). — **Rekomendasi:** `overflow-x-auto` + hint geser (pola `service-packages.tsx`).

### 4.4 Ringkasan temuan

| ID | Temuan | Severity | Fase |
|---|---|---|---|
| HG-01 | Tak ada halaman `/harga` | 🔴 | F2 |
| HG-06 | "Harga" tak di nav halaman dalam | 🟠 | F1 |
| HG-02 | Tak ada tabel banding | 🟠 | F3 |
| HG-03 | Tak ada FAQ harga | 🟠 | F3 |
| HG-07 | CTA harga lemah | 🟠 | F2/F3 |
| HG-04 | `/harga` tak di sitemap | 🟠 | F5 |
| HG-05 | "Professional" | 🔵 | F2 |
| HG-08 | Tak ada JSON-LD | 🔵 | F5 |
| HG-09 | Tabel banding mobile | 🟠 | F3 |

---

## 5. Spesifikasi Target

### 5.1 Struktur halaman `/harga`

```
┌───────────────────────────────────────────────┐
│ HERO: "Harga yang jelas, tanpa biaya tersembunyi" │
│  + CTA: [Konsultasi Gratis] [Lihat Produk]     │
│  + chip: "Konsultasi awal gratis" / "N paket"  │
├───────────────────────────────────────────────┤
│ KARTU PAKET (Basic / Profesional / Enterprise) │
│  - badge "Paling Populer" (highlight)          │
│  - daftar fitur                                │
│  - CTA WhatsApp per paket                      │
├───────────────────────────────────────────────┤
│ TABEL BANDING PAKET (fitur × paket)            │
├───────────────────────────────────────────────┤
│ (Opsional) ALUR KERJA — cara mulai             │
├───────────────────────────────────────────────┤
│ FAQ KHUSUS HARGA (akordeon)                    │
├───────────────────────────────────────────────┤
│ CTA PENUTUP (CtaContact)                       │
└───────────────────────────────────────────────┘
```

### 5.2 Konten
- **Hero**: eyebrow "Harga", judul (mis. "Harga yang **jelas & transparan**"), deskripsi singkat, CTA ganda.
  - CTA utama: "Konsultasi Gratis" (WhatsApp, `WA_MESSAGES.pricing`) — `TrackedWaButton` `location="harga-hero"`.
  - CTA sekunder: "Lihat Produk" → `/produk` (produk harga angka siap beli).
  - Chip: "{pricing.length} paket" + "Konsultasi awal gratis".
- **Kartu paket**: reuse struktur `sections/pricing.tsx`, tambah CTA per paket dengan `location="harga-paket"` + `label={plan.name}`.
- **Tabel banding**: hardcoded di lib baru (mis. `src/lib/pricing.ts`) — baris fitur × 3 paket (boolean/teks).
- **FAQ harga** (hardcoded): mis. (1) Apakah harga bisa dinegosiasi? (2) Bagaimana skema pembayaran? (3) Apakah harga sudah termasuk domain/hosting? (4) Apakah ada biaya perawatan bulanan? (5) Apakah bisa custom fitur?
- **CTA penutup**: `CtaContact`.

### 5.3 SEO
- `metadata`: title "Harga & Paket", description ringkas, canonical `/harga`, OpenGraph.
- JSON-LD: `BreadcrumbList` + (opsional) `OfferCatalog`/`Product` untuk paket.
- Sitemap: tambah `/harga` (priority ~0.8).

---

## 6. Arsitektur Implementasi

### 6.1 File BARU

| File | Peran |
|---|---|
| `src/app/harga/page.tsx` | Halaman `/harga` (server component). Baca `getSiteContent().pricing` + `getSiteSettings()`. |
| `src/app/harga/layout.tsx` | Layout halaman dalam (Navbar + Footer + CustomCursor) — **pola sama** dengan `layanan/layout.tsx`, `kontak/layout.tsx`. |
| `src/lib/pricing.ts` | Data banding paket + FAQ harga (hardcoded) + helper. |
| `src/components/pricing-table.tsx` | Tabel banding paket (responsif, scroll-x). Reuse pola `service-packages.tsx`. |

### 6.2 File DIUBAH

| File | Perubahan |
|---|---|
| `src/lib/content.ts` | Perbaiki `PRICING` "Professional" → "Profesional"; tambah "Harga" ke `PAGE_NAV_LINKS`. |
| `src/components/sections/pricing.tsx` | CTA "Lihat semua paket" → `/harga`; (opsional) hapus tabel di beranda, cukup ringkasan + tautan. |
| `src/app/sitemap.ts` | Tambah `/harga`. |
| `src/app/robots.ts` (bila ada) | Pastikan `/harga` boleh diindeks (default sudah). |
| `docs/README.md` | Tambah dokumen ini ke indeks. |
| `TASK-SELANJUTNYA.md` | Catat sesi ini. |

### 6.3 Kontrak `src/lib/pricing.ts` (usulan)

```ts
export type PricingPlanKey = "basic" | "profesional" | "enterprise";

export type PricingCompareRow = {
  feature: string;
  /** Nilai per paket (boolean = centang/silang; string = teks). */
  values: (boolean | string)[];
};

/** Baris tabel banding paket umum (urutan kolom = Basic, Profesional, Enterprise). */
export const PRICING_COMPARE: PricingCompareRow[] = [ ... ];

export type PricingFaq = { question: string; answer: string };

/** FAQ khusus harga (hardcoded). */
export const PRICING_FAQS: PricingFaq[] = [ ... ];

/** Kunci paket yang dipakai tabel banding (untuk mencocokkan nama paket). */
export const PRICING_COMPARE_COLUMNS = ["Basic", "Profesional", "Enterprise"] as const;
```

> **Catatan sinkronisasi:** tabel banding mengasumsikan 3 kolom paket. Bila admin mengubah nama/jumlah paket dari dashboard, tabel banding tetap menampilkan 3 kolom baku (atau disembunyikan bila jumlah tak cocok) — lihat R3.

---

## 7. TASK IMPLEMENTATION FLOW (FASE 0–7)

### FASE 0 — Persiapan & baseline (±15 menit)
- [ ] Baca dokumen ini + `docs/2026-10-02-upgrade-sistem-layanan.md` + `docs/2026-10-03-peningkatan-blog-seo-discovery.md`.
- [ ] Baseline: `npx tsc --noEmit` bersih, `npx eslint .` bersih, `npm run build` sukses.
- [ ] Screenshot "before": section `#harga` beranda.

### FASE 1 — Data & navigasi (±45 menit)
- [ ] Buat `src/lib/pricing.ts` (banding + FAQ harga + tipe + helper).
- [ ] `content.ts`: perbaiki "Professional" → "Profesional"; tambah "Harga" ke `PAGE_NAV_LINKS`; (opsional) rapikan `FAQS`.
- **DoD:** tsc/lint/build bersih; nav memuat "Harga".

### FASE 2 — Halaman & hero (±1.5 jam)
- [ ] Buat `src/app/harga/layout.tsx` (pola layout halaman dalam).
- [ ] Buat `src/app/harga/page.tsx`: hero + kartu paket (reuse pola `sections/pricing.tsx`) + CTA per paket.
- [ ] `metadata` lengkap (title/description/canonical/OG).
- **DoD:** `/harga` tampil; tiap paket punya CTA WhatsApp; responsif.

### FASE 3 — Tabel banding + FAQ harga (±2 jam)
- [ ] Buat `src/components/pricing-table.tsx` (responsif, scroll-x + hint geser).
- [ ] Section FAQ harga (`FaqAccordion` + `PRICING_FAQS`).
- [ ] (Opsional) section alur kerja mini.
- **DoD:** tabel banding rapi & terbaca di mobile; FAQ tampil.

### FASE 4 — Integrasi tautan (±1 jam)
- [ ] `sections/pricing.tsx`: tombol "Lihat semua paket & banding" → `/harga`.
- [ ] (Opsional) tautan `/harga` dari detail layanan & produk.
- [ ] CTA penutup `CtaContact`.
- **DoD:** navigasi antar-halaman mulus; tak ada tautan patah.

### FASE 5 — SEO & polish (±1 jam)
- [ ] `sitemap.ts`: tambah `/harga`.
- [ ] JSON-LD `BreadcrumbList` (+ opsional `OfferCatalog`).
- [ ] A11y: `aria-*` pada tabel; label CTA jelas.
- [ ] Analytics: `TrackedWaButton` di semua CTA (`harga-hero`, `harga-paket`, `harga-faq`).
- **DoD:** metadata benar; tabel a11y ok.

### FASE 6 — Dokumentasi (±30 menit)
- [ ] Update `docs/README.md` (tambah dokumen).
- [ ] Update `TASK-SELANJUTNYA.md`.
- [ ] Status dokumen ini → ✅ + bagian "Status Eksekusi".

### FASE 7 — QA, deploy
- [ ] `tsc`/`lint`/`build` bersih.
- [ ] Checklist QA §8.
- [ ] Commit per fase → push → uji produksi.

---

## 8. Definition of Done & Checklist QA

### 8.1 DoD global
1. `tsc` bersih, `build` sukses, `lint` bersih (0 error/warning baru).
2. Tidak ada regresi: beranda (`#harga`), navbar/footer, sitemap, detail layanan, produk.
3. Halaman `/harga` dapat diakses & terindeks.

### 8.2 `/harga`
- [ ] Hero + CTA ganda (Konsultasi WhatsApp + Lihat Produk).
- [ ] 3 kartu paket dengan fitur + badge unggulan.
- [ ] Tiap paket punya CTA WhatsApp (ter-track).
- [ ] Tabel banding fitur antar paket tampil & rapi di mobile.
- [ ] FAQ khusus harga (akordeon).
- [ ] CTA penutup ada.
- [ ] Responsif mobile (375px) tanpa overflow.

### 8.3 SEO
- [ ] Metadata (title/description/canonical/OG) benar.
- [ ] `/harga` muncul di `sitemap.xml`.
- [ ] JSON-LD valid (bila ditambah).

### 8.4 Nav & integrasi
- [ ] "Harga" muncul di `PAGE_NAV_LINKS` (nav halaman dalam).
- [ ] Tautan `/harga` dari section beranda & (opsional) halaman lain.

### 8.5 Regresi
- [ ] Beranda: section `#harga` tetap normal (atau CTA mengarah ke `/harga`).
- [ ] Navbar/footer tidak rusak.
- [ ] Produk tetap menampilkan harga angka.

---

## 9. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Duplikasi data paket (dashboard vs hardcoded) | Sedang | Halaman baca `SiteContent.pricing`; hanya **tabel banding** & FAQ yang hardcoded |
| R2 | Nama paket di dashboard diubah → tabel banding tak cocok | Sedang | Tabel banding pakai kolom baku; sembunyikan bila jumlah/nama tak cocok (fallback) |
| R3 | Istilah paket berbeda antar halaman | Rendah | Samakan terminologi ("Profesional") & dokumentasikan |
| R4 | Harga jasa tanpa angka membingungkan | Rendah | Perjelas copy: "menyesuaikan kebutuhan, konsultasi gratis dulu" |
| R5 | Layout tabel rusak di mobile | Sedang | `overflow-x-auto` + hint geser (pola existing) |
| R6 | Tautan `/#harga` (nav beranda) patah bila section dihapus | Rendah | **Pertahankan** section `#harga` (jangan hapus) |

---

## 10. Out of Scope

- **Harga angka** untuk paket jasa (D2).
- **Kalkulator estimasi** harga (sesi terpisah, bila diinginkan).
- Checkout langsung dari `/harga` (jasa tetap via WhatsApp; produk tetap via `/produk`).
- Multi-mata uang / multi-bahasa.
- Mengubah alur pembayaran.

---

## 11. Estimasi & Urutan Pengerjaan

| Fase | Isi | Estimasi* | Nilai |
|---|---|---|---|
| F0 | Persiapan & baseline | 15 mnt | — |
| F1 | Data & navigasi | 45 mnt | Fondasi |
| F2 | Halaman & hero | 1.5 jam | 🔴 Terasa |
| F3 | Tabel banding + FAQ harga | 2 jam | 🔴 Inti |
| F4 | Integrasi tautan | 1 jam | 🟠 |
| F5 | SEO & polish | 1 jam | 🟠 |
| F6 | Dokumentasi | 30 mnt | — |
| F7 | QA & deploy | 1 jam | Wajib |

**Total inti (F0–F7):** ± 7.5–8 jam terfokus (± 1 sesi).

**Urutan:** F1 (data) → F2 (halaman) → F3 (banding+FAQ) → F4 (integrasi) → F5 (SEO) → F6 → F7.

---

## 12. Lampiran — Referensi Pola Existing

| Kebutuhan | Referensi existing |
|---|---|
| Hero halaman dalam | `src/components/page-hero.tsx` |
| Layout halaman dalam (nav+footer) | `src/app/layanan/layout.tsx`, `src/app/kontak/layout.tsx` |
| Kartu paket + badge + CTA | `src/components/sections/pricing.tsx` |
| Tabel banding paket (responsif) | `src/components/service-packages.tsx` |
| FAQ accordion | `src/components/faq-accordion.tsx` |
| CTA penutup | `src/components/sections/cta-contact.tsx` |
| Animasi reveal | `src/components/motion.tsx` (`Reveal`) |
| Tombol | `src/components/ui/button` (`ButtonLink`/`ButtonAnchor`) |
| Tombol WhatsApp ber-tracking | `src/components/tracked-wa-button.tsx` |
| WhatsApp deep link & pesan | `src/lib/whatsapp.ts` (`waLink`, `WA_MESSAGES.pricing`) |
| Data konten (paket/FAQ) | `src/lib/content.ts` (`PRICING`, `FAQS`), `SiteContent` |
| Sitemap | `src/app/sitemap.ts` |
| Pola metadata + JSON-LD | `src/app/blog/kategori/[category]/page.tsx` |

---

## CATATAN PENUTUP

Inti rencana ini: menjadikan **harga** sebagai **halaman publik khusus `/harga`** yang jadi pusat informasi paket, **tabel banding**, dan **FAQ harga** — mudah di-link dari mana saja dan ramah SEO, tanpa mengubah model harga (jasa = konsultasi, produk = harga angka).

**Prioritas eksekusi:** F1 (data & nav) → F2 (halaman) → F3 (banding + FAQ) → F4 (integrasi) → F5 (SEO) → F6 → F7.

> Setelah dieksekusi: ubah status di header + tambah bagian "Status Eksekusi", dan catat temuan baru sebagai `HG-10+` bila ada.
