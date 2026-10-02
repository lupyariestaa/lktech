# UPGRADE SISTEM LAYANAN LKTech — Landing Page & Detail Layanan Hardcoded

> **Status dokumen:** ✅ **Dieksekusi** (FASE 0–6 selesai; F7 = QA & deploy manual)
> **Disusun:** 2026-10-02 · **Dieksekusi:** 2026-10-02
> **Cakupan:** Halaman daftar layanan (`/layanan`), halaman detail layanan (`/layanan/[slug]`), data layanan (pindah dari dashboard → **hardcoded**), dan penghapusan menu "Layanan" dari dashboard admin.
> **Tujuan:** (1) Ubah `/layanan` menjadi **landing page section bergantian per layanan** dengan CTA ke detail; (2) Jadikan **detail layanan jauh lebih powerful** — terutama **Website** & **Aplikasi Mobile** — dengan **data hardcoded** (kaya, rumit, tidak dikelola dashboard); (3) Bersihkan menu layanan dari dashboard.
> **Prasyarat baca:** `docs/2026-10-02-upgrade-sistem-portfolio.md` (pola & koponen), `docs/README.md`.

---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Baseline — Kondisi Sistem Layanan Saat Ini](#2-baseline--kondisi-sistem-layanan-saat-ini)
3. [Keputusan Desain (disetujui pemilik)](#3-keputusan-desain-disetujui-pemilik)
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

Halaman layanan LKTech saat ini **berfungsi tapi tipis**: `/layanan` hanya menampilkan **grid 5 kartu polos** + bagian alur kerja, tanpa storytelling, tanpa CTA penutup, dan **kartu tidak memakai `tagline`**. Halaman detail layanan pun **kurang "powerful"**: paket (Basic/Professional/Custom) tampil **tanpa CTA per paket**, tidak ada tabel banding, sidebar lemah, dan hero tanpa visual.

**Keputusan kunci dari pemilik:**
1. `/layanan` diubah menjadi **landing page bergantian per layanan** (setiap layanan = blok besar kiri-kanan + CTA "Lihat Detail" & "Konsultasi").
2. **Detail layanan dibuat HARDCODED di kode** — kaya & mendalam, **tidak dikelola dashboard**. Contoh: "Pembuatan Website" menjelaskan **sebanyak mungkin** jenis website yang bisa dibuat, "Aplikasi Mobile" menjelaskan berbagai jenis aplikasi. Menu **"Layanan" dihapus dari dashboard**.
3. Perbaiki istilah **"Professional" → "Profesional"**.

**Prinsip:** Karena detail tidak lagi dikelola admin, kita bebas membuatnya **sedetail & seindah mungkin** tanpa terikat struktur form. Reuse komponen yang ada (PageHero, CtaContact, FaqAccordion, Icon, motion, Button).

---

## 2. Baseline — Kondisi Sistem Layanan Saat Ini

### 2.1 Data (sekarang)
- Layanan hidup di `SiteContent` (koleksi `content/site.services`), **dikelola via dashboard** (`/admin/services`, `services-manager.tsx`).
- Tipe: `Service` (`slug, title, tagline, description, icon, accent, waMessage`) + `ServiceDetail` (`heroDescription, highlights, deliverables, features, steps, techStack, packages, faqs`).
- `packages`: `{name, suitedFor, points[]}` — **tanpa harga/badge/CTA/highlight** (tipe inline, bukan named type).
- **5 layanan**: `pembuatan-website`, `aplikasi-mobile`, `konsultasi-teknologi`, `desain-branding`, `digital-marketing`.

### 2.2 Halaman `/layanan`
- `PageHero` (center) + 2 CTA ("Konsultasi Gratis", "Lihat di Beranda").
- **Grid 5 kartu polos** (tanpa heading section) → `<ServiceCard>` (3D tilt).
- Section "Bagaimana kami bekerja?" (process global).
- **TANPA CTA penutup** (`CtaContact` tidak dipanggil).

### 2.3 Halaman `/layanan/[slug]`
- Hero (kiri) + grid 2 kolom (`1fr_320px`) + sidebar sticky.
- Highlight → Deliverables → Features → Steps (timeline) → **Packages (tanpa CTA/harga)** → FAQ → Sidebar (CTA + tech pill) → "Layanan lainnya" → CtaContact.

### 2.4 Dashboard
- `/admin/services` + `services-manager.tsx` — CRUD layanan + detail (form panjang).
- Nav: grup "Konten Website" berisi item **Layanan**.

---

## 3. Keputusan Desain (disetujui pemilik)

| # | Keputusan | Alasan |
|---|---|---|
| D1 | `/layanan` = **landing page section bergantian per layanan** | Storytelling, meyakinkan, jelas CTA-nya |
| D2 | **Detail layanan HARDCODED** di kode (bukan dashboard) | Bebas bikin kaya/rumit/gambar-gambar tanpa UI editor |
| D3 | **Hapus menu "Layanan" dari dashboard** + keluarkan `services` dari `SiteContent` yang dikelola admin | Tidak ada lagi dua sumber kebenaran |
| D4 | **Fokus Website & Aplikasi Mobile** paling lengkap; 3 layanan lain tetap di-upgrade tapi lebih ringkas | Sesuai permintaan |
| D5 | Paket **tanpa harga angka**, tapi **CTA WhatsApp per paket + badge unggulan + tabel banding** | Mendorong konversi tanpa terikat angka |
| D6 | **Tidak** menarik portofolio terkait di detail layanan | Keputusan pemilik (tidak perlu) |
| D7 | Perbaiki istilah **"Profesional"** | Konsistensi bahasa |

---

## 4. Audit — Temuan & Celah

Format: **[LY-xx] Judul** — *Severity* — Lokasi — Dampak — Rekomendasi.
Severity: 🔴 Tinggi · 🟠 Menengah · 🔵 Rendah.

### 4.1 Halaman Daftar `/layanan`

**[LY-01] Grid kartu polos tanpa storytelling/heading** — 🔴 Tinggi
- **Lokasi:** `layanan/page.tsx:60-70`.
- **Dampak:** Halaman terasa datar; tidak menjelaskan "untuk siapa/kenapa"; tidak ada narasi yang menjual.
- **Rekomendasi:** Ubah jadi **section bergantian per layanan** (blok besar kiri-kanan) + eyebrow/heading tiap blok.

**[LY-02] Kartu tidak memakai `tagline`** — 🟠 Menengah — `service-card.tsx` (hanya title+description). Data `tagline` terbuang. **Rekomendasi:** Tampilkan tagline di blok daftar baru.

**[LY-03] Tidak ada CTA penutup** — 🟠 Menengah — `layanan/page.tsx` (tak ada `CtaContact`). **Rekomendasi:** Tambah CTA penutup + sinyal "mulai dari".

**[LY-04] Tidak ada sinyal harga/paket di daftar** — 🟠 Menengah. **Rekomendasi:** Tambah chip "Mulai dari / N paket" atau highlight fitur unggulan per blok.

**[LY-05] Tidak ada bukti sosial di daftar** — 🔵 Rendah (opsional). *Dilewati sesuai D6* — cukup angka ringkas (jumlah layanan/proyek) bila tersedia.

### 4.2 Halaman Detail `/layanan/[slug]`

**[LY-06] Paket tanpa CTA & tanpa badge/highlight** — 🔴 Tinggi
- **Lokasi:** `[slug]/page.tsx:200-229`.
- **Dampak:** Kartu paket = dead-end; user tidak punya aksi langsung; tidak ada rekomendasi paket.
- **Rekomendasi:** Kartu paket dengan **badge "Rekomendasi"**, **CTA WhatsApp per paket**, dan **tabel banding** paket.

**[LY-07] Tidak ada tabel perbandingan paket** — 🟠 Menengah. **Rekomendasi:** Tabel banding fitur antar paket (centang).

**[LY-08] Hero tanpa visual & tanpa sinyal kuat** — 🟠 Menengah — `PageHero` text-only. **Rekomendasi:** Hero diperkaya (badge "N jenis", highlight singkat, visual/mockup).

**[LY-09] Sidebar statis & lemah** — 🟠 Menengah — `[slug]/page.tsx:241-287`. **Rekomendasi:** Sidebar kaya: CTA utama, "N paket", teknologi, langkah berikutnya.

**[LY-10] Tidak ada penjelasan mendalam "apa saja yang bisa dibuat"** — 🔴 Tinggi (inti permintaan)
- **Dampak:** Untuk Website/Mobile, pengunjung tak tahu luasnya kemampuan LKTech (landing page, company profile, toko online, web app, sekolah, aplikasi kasir, booking, dsb).
- **Rekomendasi:** Section **kaya & mendalam per layanan** (hardcoded): daftar jenis/kategori + contoh + penjelasan. Ini fitur utama upgrade.

**[LY-11] `features`/`deliverables` tanpa angka/dampak** — 🔵 Rendah. **Rekomendasi:** Boleh ditambah angka/a11y/SEO/kecepatan (hardcoded).

**[LY-12] Tidak ada "layanan ini cocok untuk siapa"** — 🟠 Menengah. **Rekomendasi:** Section target audiens / use-case.

**[LY-13] `heroDescription` = meta description** — 🔵 Rendah — berisiko panjang. **Rekomendasi:** Pisah meta description ringkas.

**[LY-14] Istilah "Professional" tidak konsisten** — 🔵 Rendah — `content.ts:228`. **Rekomendasi:** "Profesional".

### 4.3 Dashboard & Data

**[LY-15] Dua sumber kebenaran (dashboard vs kode)** — 🟠 Menengah
- **Dampak:** Ingin detail kaya → tiap perubahan butuh UI editor baru = ribet. 
- **Rekomendasi:** **Hardcode detail**; dashboard tak lagi mengelola layanan (D2/D3).

**[LY-16] Menu "Layanan" di dashboard jadi usang** — 🟠 Menengah
- **Lokasi:** `admin-nav.ts` (grup Konten Website → Layanan), `services-manager.tsx`, API `api/admin/services`.
- **Rekomendasi:** Hapus item nav, halaman, manager, & API services (atau jadikan tidak aktif).

**[LY-17] `services` di `SiteContent` membingungkan** — 🟠 Menengah
- **Dampak:** `getSiteContent().services` dipakai banyak tempat (navbar, footer, beranda, detail). Kalau dihapus mentah → banyak regresi.
- **Rekomendasi:** Pindahkan sumber layanan ke **modul hardcoded** (`src/lib/services.ts`) dan **biarkan `getSiteContent` tetap ada untuk konten lain** (faqs, pricing, hero, whyUs, process, stats, testimonials, technologies). Sesuaikan pembaca `services` agar ambil dari modul baru.

### 4.4 Ringkasan temuan

| ID | Temuan | Severity | Fase |
|---|---|---|---|
| LY-01 | Grid daftar polos | 🔴 | F2 |
| LY-10 | Tak ada penjelasan mendalam per layanan | 🔴 | F3 |
| LY-06 | Paket tanpa CTA/badge | 🔴 | F4 |
| LY-02 | `tagline` tak dipakai | 🟠 | F2 |
| LY-03 | Tak ada CTA penutup | 🟠 | F2 |
| LY-07 | Tak ada tabel banding paket | 🟠 | F4 |
| LY-08 | Hero detail tanpa visual | 🟠 | F4 |
| LY-09 | Sidebar lemah | 🟠 | F4 |
| LY-12 | Tak ada "cocok untuk siapa" | 🟠 | F3 |
| LY-15/16/17 | Dua sumber, menu usang, `services` di SiteContent | 🟠 | F1/F6 |
| LY-04/05/11/13/14 | Minor | 🔵 | F2/F4 |

---

## 5. Spesifikasi Target

### 5.1 `/layanan` — Landing Page Section Bergantian

```
┌──────────────────────────────────────────────┐
│ HERO: "Solusi digital lengkap & terpadu"     │
│  + CTA Konsultasi Gratis / Lihat Produk       │
├──────────────────────────────────────────────┤
│ 01  PEMBUATAN WEBSITE                         │
│ [visual]   | Judul + tagline + 3 highlight    │
│            | CTA: [Lihat Detail] [Konsultasi] │
├──────────────────────────────────────────────┤
│ 02  APLIKASI MOBILE        (visual di kanan)  │
│ Judul + tagline + 3 highlight | [visual]      │
│ CTA: [Lihat Detail] [Konsultasi]              │
├──────────────────────────────────────────────┤
│ 03  KONSULTASI TEKNOLOGI    (kiri)            │
│ ...                                           │
├──────────────────────────────────────────────┤
│ 04  DESAIN & BRANDING                         │
│ 05  DIGITAL MARKETING                         │
├──────────────────────────────────────────────┤
│ CTA PENUTUP (CtaContact / banner)             │
└──────────────────────────────────────────────┘
```
- Tiap blok: **nomor besar (01–05)**, ikon/accent, **judul**, **tagline**, **3 highlight unggulan**, **CTA ganda** ("Lihat Detail" → `/layanan/[slug]`, "Konsultasi" → WhatsApp).
- Visual bergantian (kiri/kanan) — pakai ikon besar + accent gradient (tanpa butuh gambar eksternal; bisa dikembangkan dengan mockup).
- `tagline` kini dipakai (menutup LY-02).
- CTA penutup (menutup LY-03).

### 5.2 `/layanan/[slug]` — Detail Powerful (HARDCODED)

Struktur target (untuk **Website** & **Aplikasi Mobile** paling kaya):
1. **Hero** — eyebrow, judul, `heroDescription`, badge ("N paket", "Sejak 2026"), CTA ("Konsultasi Layanan Ini" + "Lihat Paket").
2. **Highlights** — poin utama (kenapa pilih ini).
3. **"Apa saja yang bisa kami buat"** (Section kaya — inti LY-10):
   - Grid **kartu jenis** (mis. Website: Landing Page, Company Profile, Toko Online, Web App/Dashboard, Website Sekolah, Portfolio; Mobile: Aplikasi Kasir/POS, Booking, Katalog, Membership, Company App, dsb.) — tiap kartu: ikon + judul + deskripsi singkat.
4. **Deliverables / yang didapat** + **Features/keunggulan**.
5. **"Cocok untuk"** — target audiens / use-case (UMKM, startup, sekolah, dsb).
6. **Alur kerja** (steps).
7. **Paket** — kartu **dengan badge "Rekomendasi"**, **CTA WhatsApp per paket**, + **tabel banding fitur** (Basic/Profesional/Custom).
8. **Teknologi** + **FAQ**.
9. **Sidebar** kaya (CTA, N paket, teknologi, langkah berikutnya).
10. **Layanan lainnya** + **CTA penutup**.

> Semua konten **hardcoded** di `src/lib/services.ts` — bebas se-kaya mungkin. 3 layanan lain (Konsultasi, Branding, Digital Marketing) memakai struktur sama namun lebih ringkas.

### 5.3 Data — Hardcoded

- **File baru:** `src/lib/services.ts` — satu sumber kebenaran layanan (kartu + detail kaya), tipe kuat, tanpa Firestore.
- `SiteContent.services` **tidak lagi dikelola dashboard**; pembaca layanan diarahkan ke modul baru. `getSiteContent()` tetap untuk konten lain.

### 5.4 Dashboard

- Hapus item **"Layanan"** dari `admin-nav.ts`.
- Hapus halaman `/admin/(dashboard)/services`, `services-manager.tsx`, dan (opsional) API `api/admin/services`.
- Hapus tipe & normalizer `services` dari alur simpan konten (atau biarkan tidak terpakai agar tak memorak `saveSiteContent` — lihat risiko R3).

### 5.5 Copy
- "Professional" → **"Profesional"**.

---

## 6. Arsitektur Implementasi

### 6.1 File BARU

| File | Peran |
|---|---|
| `src/lib/services.ts` | **Sumber kebenaran layanan (hardcoded)** — tipe + array `SERVICES` lengkap (kartu + detail kaya: kinds/useCases/packages+cta dll). |
| `src/components/service-showcase.tsx` | Blok section layanan (landing) — nomor, visual, tagline, highlight, CTA ganda. |
| `src/components/service-packages.tsx` | Kartu paket (+badge+CTA) & **tabel banding** paket. |
| `src/components/service-kinds.tsx` | Grid "Apa saja yang bisa kami buat" (kartu jenis). (Bisa inline bila kecil.) |

### 6.2 File DIUBAH

| File | Perubahan |
|---|---|
| `src/app/layanan/page.tsx` | Ganti grid polos → **section bergantian** (`ServiceShowcase`) + CTA penutup. |
| `src/app/layanan/[slug]/page.tsx` | Pakai data hardcoded; tambah section "apa yang bisa dibuat", "cocok untuk", paket+CTA+tabel banding, hero & sidebar diperkaya. |
| `src/components/service-card.tsx` | (Tetap dipakai di beranda) tambah `tagline`. |
| `src/lib/content-types.ts` | Sesuaikan `ManagedService` (atau tetap, tak dipakai lagi). |
| `src/lib/site-content.ts` | `services` tak lagi dibaca dari Firestore (atau tetap ada tapi tidak dipakai halaman layanan). |
| `src/lib/admin-nav.ts` | Hapus item "Layanan". |
| `src/app/admin/(dashboard)/services/page.tsx` | **Dihapus**. |
| `src/components/admin/services-manager.tsx` | **Dihapus**. |
| `src/app/api/admin/services/**`, `src/lib/admin-content-api` (bagian services) | **Dihapus** (bila tidak dipakai lagi). |
| `src/components/sections/services.tsx` | Beranda — ambil dari modul baru. |
| `src/components/sections/navbar.tsx` / `footer.tsx` | Ambil layanan dari modul baru. |
| `src/app/sitemap.ts` | Layani slug dari modul baru. |

### 6.3 Prinsip migrasi (hati-hati)
- Banyak pembaca `getSiteContent().services` (navbar, footer, beranda, sitemap, detail). **Jangan hapus salah satu tanpa ganti pembacanya.**
- Strategi aman: **buat `src/lib/services.ts` dulu**, ubah semua pembaca ke sana, **baru** hapus `services` dari dashboard/SiteContent (atau biarkan `SiteContent.services` sebagai warisan tak terpakai agar `saveSiteContent` tak pecah).

### 6.4 Kontrak `src/lib/services.ts`
```ts
export type ServiceKind = { title: string; description: string; icon?: string };
export type ServicePackage = {
  name: string; suitedFor: string; points: string[];
  badge?: string; highlight?: boolean;
};
export type ServiceFeature = { title: string; description: string; icon?: string };
export type ServiceStep = { title: string; description: string };
export type ServiceUseCase = { title: string; description: string };

export type ServiceDetail = {
  heroDescription: string;
  highlights: string[];
  kinds?: ServiceKind[];        // "apa saja yang bisa dibuat" (Website/Mobile)
  useCases?: ServiceUseCase[];  // "cocok untuk siapa"
  deliverables: { title: string; description: string }[];
  features: ServiceFeature[];
  steps: ServiceStep[];
  techStack: string[];
  packages: ServicePackage[];   // dengan badge/highlight
  packageCompare?: {            // tabel banding
    feature: string;
    values: (boolean | string)[]; // per paket
  }[];
  faqs: { question: string; answer: string }[];
};

export type Service = {
  slug: string; title: string; tagline: string; description: string;
  icon: string; accent: string; waMessage: string;
  detail: ServiceDetail;
};

export const SERVICES: Service[] = [ ... ];
export const SERVICES_MAP = Object.fromEntries(SERVICES.map(s => [s.slug, s]));
export function getService(slug: string): Service | undefined { ... }
export function getServiceSlugs(): string[] { ... }
```

---

## 7. TASK IMPLEMENTATION FLOW (FASE 0–7)

> Tiap fase berdiri sendiri, bisa dites, commit terpisah.

### FASE 0 — Persiapan & baseline (±20 menit)
- [ ] Baca dokumen ini + `docs/2026-10-02-upgrade-sistem-portfolio.md`.
- [ ] Baseline: `npx tsc --noEmit` bersih, `npm run lint` bersih, `npm run build` sukses.
- [ ] Screenshot "before": `/layanan`, detail `pembuatan-website` & `aplikasi-mobile`.

### FASE 1 — Modul data hardcoded + migrasi pembaca (±1.5 jam)
- [ ] Buat `src/lib/services.ts` (tipe + `SERVICES` lengkap + helper). Isi awal: pindahkan 5 layanan + detail yang ada, **perbaiki "Professional" → "Profesional"**.
- [ ] Alihkan **semua pembaca** `getSiteContent().services` → `SERVICES` (navbar, footer, beranda `services.tsx`, `sitemap.ts`, detail layanan).
- [ ] Pastikan `getSiteContent()` tetap berfungsi untuk konten lain.
- **DoD:** tsc/lint/build bersih; beranda, navbar, footer, sitemap tetap normal.

### FASE 2 — Landing page `/layanan` bergantian (±3 jam)
- [ ] Buat `service-showcase.tsx` (blok bernomor, visual kiri/kanan bergantian, tagline, 3 highlight, CTA ganda).
- [ ] Rombak `layanan/page.tsx`: hero → 5 blok bergantian → CTA penutup.
- [ ] Tampilkan `tagline` (LY-02); CTA penutup (LY-03).
- **DoD:** tiap layanan punya blok + CTA "Lihat Detail" & "Konsultasi"; responsif mobile.

### FASE 3 — Detail layanan kaya (±4 jam) — *inti*
- [ ] Perluas `SERVICES` (detail) untuk **Website** & **Aplikasi Mobile**: `kinds` (banyak jenis), `useCases`, features, deliverables, highlights, steps, tech, faqs.
- [ ] Section baru di `[slug]/page.tsx`: **"Apa saja yang bisa kami buat"** (`kinds`), **"Cocok untuk"** (`useCases`).
- [ ] Terapkan juga (lebih ringkas) untuk 3 layanan lain.
- **DoD:** detail Website & Mobile sangat informatif; halaman tak error bila `kinds`/`useCases` kosong (disembunyikan).

### FASE 4 — Paket, tabel banding, hero & sidebar (±3 jam)
- [ ] `service-packages.tsx`: kartu paket + **badge "Rekomendasi"** + **CTA WhatsApp per paket** + **tabel banding**.
- [ ] Hero detail diperkaya (badge "N paket", visual/ikon besar).
- [ ] Sidebar kaya (CTA, jumlah paket, teknologi, langkah berikutnya).
- **DoD:** tiap paket punya CTA; tabel banding rapi & responsif (mobile → scroll/stack).

### FASE 5 — Bersihkan dashboard (±1 jam)
- [ ] Hapus item "Layanan" dari `admin-nav.ts`.
- [ ] Hapus halaman `/admin/(dashboard)/services`, `services-manager.tsx`.
- [ ] Hapus/handle API `api/admin/services` + fungsi admin-content-api terkait.
- [ ] Cek tidak ada referensi tersisa yang memecah build.
- **DoD:** dashboard tanpa menu Layanan; build bersih.

### FASE 6 — Metadata & polish (±1 jam)
- [ ] Metadata detail: pisah meta description ringkas (LY-13).
- [ ] `service-card.tsx` tambah tagline (di beranda).
- [ ] A11y: label, `aria-*` pada tabel banding/paket.
- [ ] JSON-LD `Service` (opsional) bila mudah.
- **DoD:** metadata benar; a11y tabel ok.

### FASE 7 — QA, dokumentasi & deploy
- [ ] `tsc`/`lint`/`build` bersih.
- [ ] Checklist QA §8.
- [ ] Dokumentasi: status ✅ + "Status Eksekusi"; update `docs/README.md` & `TASK-SELANJUTNYA.md`.
- [ ] Commit per fase → push → uji produksi.

---

## 8. Definition of Done & Checklist QA

### 8.1 DoD global
1. `tsc` bersih, `build` sukses, `lint` bersih (0 error/warning baru).
2. Semua checklist lolos.
3. Tidak ada regresi: beranda, navbar, footer, sitemap, detail layanan, produk/portofolio.
4. Dashboard tidak lagi menampilkan menu layanan.

### 8.2 `/layanan`
- [ ] Setiap layanan tampil sebagai blok bergantian (nomor, ikon, judul, tagline, 3 highlight, CTA).
- [ ] CTA "Lihat Detail" → `/layanan/[slug]`; "Konsultasi" → WhatsApp.
- [ ] CTA penutup ada.
- [ ] Responsif mobile (visual & teks menumpuk rapi).

### 8.3 Detail layanan
- [ ] Website & Mobile menampilkan "Apa saja yang bisa kami buat" (banyak jenis) & "Cocok untuk".
- [ ] Paket punya badge "Rekomendasi" & CTA WhatsApp per paket.
- [ ] Tabel banding paket tampil & terbaca di mobile.
- [ ] Sidebar kaya & sticky.
- [ ] Bila `kinds`/`useCases`/`packageCompare` kosong → section disembunyikan (tidak error).
- [ ] Istilah "Profesional" konsisten.

### 8.4 Dashboard
- [ ] Menu "Layanan" hilang dari sidebar admin.
- [ ] Tidak ada route `/admin/services` aktif.
- [ ] Build bersih (tak ada impor menggantung).

### 8.5 Regresi
- [ ] Beranda: kartu layanan (`services.tsx`) normal.
- [ ] Navbar & footer: link layanan benar.
- [ ] Sitemap memuat slug layanan.
- [ ] Detail layanan tetap dapat diakses (`generateStaticParams`).

---

## 9. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Menghapus `services` dari SiteContent memecah banyak pembaca | Tinggi | Buat `services.ts` dulu; ganti SEMUA pembaca; baru bersihkan |
| R2 | Hapus menu/API services menyisakan impor menggantung | Sedang | Cari referensi dulu (`grep`), hapus berurutan, build tiap langkah |
| R3 | `saveSiteContent` menyertakan `services` | Sedang | Biarkan field `services` tetap ada di skema (warisan) tapi tak dipakai UI — hindari ubah `saveSiteContent` |
| R4 | Detail hardcoded → perubahan butuh deploy | Rendah | Diterima (keputusan pemilik D2) |
| R5 | `SERVICES` besar → bundle membesar | Rendah | Server component; hanya kirim yang perlu; teks dsb. kecil |
| R6 | Tabel banding tak rapi di mobile | Sedang | Desain scroll-x / stack; uji di 375px |
| R7 | Slug layanan berubah → link rusak | Rendah | Pertahankan slug lama |
| R8 | Ikon hardcoded tidak ada di registry `icon.tsx` | Rendah | Pakai ikon yang sudah ada / tambah ke registry |

---

## 10. Out of Scope

- Form/CRM lead per layanan (selain deep-link WhatsApp).
- Harga angka per paket (D5: tanpa harga).
- Portofolio terkait di detail layanan (D6: tidak perlu).
- Blog terkait layanan (relasi `serviceSlug` di Article) — sesi terpisah.
- Mesin rekomendasi paket otomatis.
- Multi-bahasa.
- Editor visual/gambar besar per layanan (bila ingin, sesi lanjutan).

---

## 11. Estimasi & Urutan Pengerjaan

| Fase | Isi | Estimasi* | Nilai |
|---|---|---|---|
| F0 | Persiapan | 20 mnt | — |
| F1 | Modul hardcoded + migrasi pembaca | 1.5 jam | Fondasi |
| F2 | Landing `/layanan` bergantian | 3 jam | 🔴 Terasa |
| F3 | Detail kaya (Website & Mobile) | 4 jam | 🔴 Inti |
| F4 | Paket + tabel banding + hero/sidebar | 3 jam | 🔴 |
| F5 | Bersihkan dashboard | 1 jam | 🟠 |
| F6 | Metadata & polish | 1 jam | 🟠 |
| F7 | QA & deploy | 1–2 jam | Wajib |

**Total inti (F0–F7):** ± 14–16 jam terfokus.
**Bila 1 sesi:** F1–F3 memberi lompatan terbesar (data hardcoded + landing bergantian + detail kaya). F4–F6 menyusul.

---

## 12. Lampiran — Referensi Pola Existing

| Kebutuhan | Referensi existing |
|---|---|
| Hero halaman dalam | `src/components/page-hero.tsx` |
| CTA penutup | `src/components/sections/cta-contact.tsx` |
| FAQ accordion | `src/components/faq-accordion.tsx` |
| Ikon registry | `src/components/icon.tsx` |
| Animasi reveal | `src/components/motion.tsx` (`Reveal`) |
| Tombol | `src/components/ui/button` (`ButtonAnchor`/`ButtonLink`) |
| Pola kartu harga + highlight + CTA (beranda) | `src/components/sections/pricing.tsx` |
| Pola kartu bergantian (referensi layout) | beranda `sections/why-us.tsx`, `process.tsx` |
| WhatsApp deep link | `src/lib/whatsapp.ts` (`waLink`, `WA_MESSAGES`) |
| Kategori & jenis (referensi konten) | `content.ts` (`SERVICES`, `SERVICES_DETAIL`) |
| Nav admin | `src/lib/admin-nav.ts` |

---

## CATATAN PENUTUP

Inti upgrade ini: **`/layanan` jadi landing bergantian** (menjual) dan **detail layanan hardcoded yang sangat kaya** — terutama Website & Aplikasi Mobile yang menjelaskan **sebanyak mungkin** yang bisa LKTech buat. Karena tidak dikelola dashboard, detail bebas dibuat sedetail & seindah mungkin. Dashboard dibersihkan dari menu layanan.

**Prioritas eksekusi:** F1 (fondasi data) → F2 (landing) → F3 (detail kaya) → F4 (paket) → F5 (bersihkan dashboard) → F6 → F7.

> Setelah dieksekusi, ubah status di header + tambah bagian "Status Eksekusi", dan catat temuan baru sebagai `LY-18+` bila ada.

---

## 13. STATUS EKSEKUSI

> **Dieksekusi:** 2026-10-02 · **Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (46 halaman; 5 layanan ter-generate)

### 13.1 Ringkasan per fase

| Fase | Isi | Status |
|---|---|---|
| **F0** | Persiapan & baseline | ✅ |
| **F1** | Modul hardcoded `src/lib/services.ts` + alihkan pembaca (sitemap, layanan) | ✅ |
| **F2** | Landing `/layanan` bergantian per layanan + CTA penutup + FAQ + alur kerja | ✅ |
| **F3** | Detail kaya: Website & Mobile punya "Apa saja yang bisa dibuat" + "Cocok untuk" | ✅ |
| **F4** | `service-packages` (badge + CTA per paket + tabel banding) + hero & sidebar kaya | ✅ |
| **F5** | Bersihkan dashboard: hapus menu/halaman/manager/API layanan | ✅ |
| **F6** | Metadata + polish (tagline di card, JSON-LD Service, a11y tabel) | ✅ |
| **F7** | QA: tsc/lint/build bersih ✅ · uji browser & deploy = manual | ⚠️ Sebagian |

### 13.2 Temuan teratasi

| ID | Temuan | Status |
|---|---|---|
| LY-01 | Grid daftar polos | ✅ Jadi landing bergantian |
| LY-10 | Tak ada penjelasan mendalam | ✅ Section "Apa saja yang bisa dibuat" (Website 8 jenis, Mobile 8 jenis) |
| LY-06 | Paket tanpa CTA/badge | ✅ Badge "Rekomendasi" + CTA WhatsApp per paket |
| LY-02 | `tagline` tak dipakai | ✅ Tampil di blok landing & kartu |
| LY-03 | Tak ada CTA penutup | ✅ `CtaContact` ditambah |
| LY-07 | Tak ada tabel banding | ✅ Tabel banding paket (scroll-x mobile) |
| LY-08 | Hero detail tanpa sinyal | ✅ Badge "N paket" + jumlah tahap |
| LY-09 | Sidebar lemah | ✅ Sidebar kaya (CTA, teknologi, langkah berikutnya) |
| LY-12 | Tak ada "cocok untuk siapa" | ✅ Section "Cocok untuk" |
| LY-15/16/17 | Dua sumber, menu usang | ✅ Layaran hardcoded; menu/halaman/API dihapus |
| LY-14 | "Professional" | ✅ Jadi "Profesional" |

### 13.3 Keputusan teknis saat eksekusi

1. **Sumber layanan hardcoded** di `src/lib/services.ts` — tipe + `SERVICES` + helper (`getService`, `getServiceSlugs`, `SERVICES_MAP`).
2. **`SiteContent.services` dibiarkan** (warisan) agar `content-provider`, footer, beranda, `saveSiteContent` tak pecah (mitigasi R1/R3). Halaman `/layanan` & detail beralih penuh ke modul baru.
3. **`use-services.ts`** (dipakai `projects-manager` untuk pilihan "Layanan terkait") dialihkan membaca modul hardcoded — bukan API. API `/api/admin/services` dihapus.
4. **Ikon baru** ditambah ke registry `icon.tsx` (building, layoutGrid, layoutDashboard, graduation, newspaper, calendar, cart, settings).
5. **`ServiceCard`** tipe dibuat struktural (kompatibel beranda & modul baru) + tampil `tagline`.

### 13.4 File baru & dihapus

**Baru:**
- `src/lib/services.ts` — sumber kebenaran layanan (hardcoded).
- `src/components/service-showcase.tsx` — blok landing bergantian.
- `src/components/service-packages.tsx` — kartu paket + tabel banding.

**Dihapus:**
- `src/app/admin/(dashboard)/services/page.tsx`
- `src/components/admin/services-manager.tsx`
- `src/app/api/admin/services/route.ts`

**Diubah:**
- `src/app/layanan/page.tsx`, `src/app/layanan/[slug]/page.tsx`
- `src/app/sitemap.ts`, `src/lib/admin-nav.ts`
- `src/components/icon.tsx`, `src/components/service-card.tsx`
- `src/components/admin/use-services.ts`

### 13.5 Verifikasi

```
npx tsc --noEmit   → bersih
npx eslint .       → bersih
npm run build      → ✓ Compiled successfully (46 halaman)
                     route: ○ /layanan · ● /layanan/[slug] × 5
                     ( /admin/services & /api/admin/services sudah tidak ada )
```

### 13.6 Sisa manual (F7)
- [ ] Uji browser: `/layanan` (blok bergantian + CTA), detail `pembuatan-website` & `aplikasi-mobile` (kinds, useCases, paket+CTA, tabel banding), responsif mobile.
- [ ] Pastikan dashboard tak lagi menampilkan menu "Layanan".
- [ ] **Deploy**: `git push` → Vercel → uji produksi.

### 13.7 Catatan operasional
- Detail layanan **hardcoded** → perubahan butuh deploy (bukan via dashboard). Diterima (keputusan pemilik).
- `SiteContent.services` tetap ada di skema agar tak ada regresi (tidak dipakai halaman layanan).

> Dibuat oleh sesi eksekusi 2026-10-02. Catat temuan baru sebagai `LY-18+` di §4 bila ada.
