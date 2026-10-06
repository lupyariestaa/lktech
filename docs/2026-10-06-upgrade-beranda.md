# Dokumen Fase — Upgrade Halaman Beranda / Landing Page (H0–H8)

> **Status:** 🚧 Sedang dikerjakan — **H0 (Audit & Dokumen Fase) SELESAI**.
> **Dibuat:** 2026-10-06, sesi pasca-Retensi (Tema 2).
> **Induk rencana:** [`docs/2026-10-06-task-upgrade-beranda.md`](2026-10-06-task-upgrade-beranda.md) (task H0–H8).
> **Prioritas:** Tinggi (beranda = kesan pertama & gerbang konversi).
> **Prasyarat baca:** `docs/2026-10-06-roadmap-pengembangan.md`, `docs/2026-10-02-upgrade-sistem-layanan.md`, `docs/2026-10-03-halaman-harga-publik.md`, `docs/identitas-perusahaan.md`, `TASK-SELANJUTNYA.md`.

> **Pola wajib proyek:** server-authoritative · observability (log + status tersimpan) · **a11y** · **mobile-first** · **backward-compatible** · dokumentasi fase.

---

## 0. Cara Memakai Dokumen Ini

1. Dokumen ini adalah **catatan eksekusi** dari rencana di `docs/2026-10-06-task-upgrade-beranda.md`.
2. Setiap fase (H0–H8) dikerjakan berurutan; checklist di §4 di-update saat progres.
3. Untuk tiap fase: kerjakan checklist → **QA gate (§7)** → commit konvensional → push (`main` → Vercel auto-deploy).
4. Perbarui `TASK-SELANJUTNYA.md` + `docs/README.md` bila relevan.
5. **Jangan** mengubah inti transaksi (cart/checkout/order) demi beranda.

---

## 1. Ringkasan & Diagnosis (baseline terverifikasi)

Beranda saat ini **sudah lengkap** (hero + 10 section) dan sehat secara teknis: konten terkelola lewat `content-provider` (server-fed via `getSiteContent()` di `layout.tsx`), animasi `framer-motion`, a11y dasar (`SkipLink`, `aria-label`, `prefers-reduced-motion` di `motion.tsx`). Namun masih ada celah bernilai tinggi:

| Sumbu | Kondisi sekarang (terverifikasi) | Peluang |
| --- | --- | --- |
| **Konten** | `TESTIMONIALS` & `STATS` di `content.ts` adalah **placeholder** (ditandai ⚠️ CONTOH / angka karangan: "20+ Proyek", "15+ Klien") | Ganti dengan konten nyata / mekanisme; pakai bukti sosial nyata |
| **Konversi** | Hero CTA bagus; seksi produk digital belum ada di beranda | Perkuat value prop, bukti sosial nyata, ekspos katalog `/produk` |
| **Struktur/IA** | Urutan: Hero → Technologies → Services → WhyUs → Process → Stats → PortfolioTeaser → Testimonials → Pricing → Faq → CtaContact | Susun ulang alur persuasi (AIDA); trust sebelum harga |
| **Desain** | Konsisten & modern, tapi beberapa section "datar" | Polesan visual, konsistensi spacing, micro-interaction |
| **Sistem** | Sebagian dashboard (`content`), sebagian hardcoded (`services.ts`, `COMPANY`, `SERVICES`) | Perjelas & dokumentasikan mana dashboard vs hardcoded |
| **Performa/SEO** | Baik: metadata di `layout.tsx`, JSON-LD `ProfessionalService` (`structured-data.tsx`), OG image, sitemap/robots | Lengkapi JSON-LD beranda (`WebSite`+`SearchAction`), LCP hero |
| **Observability** | Event `whatsapp_click` (banyak lokasi), `add_to_cart`, `checkout`, `lead_submitted` | Lengkapi event section (CTA "Lihat Produk", scroll depth opsional) |

> **Tujuan akhir:** beranda yang **meyakinkan dalam 5 detik**, mengarahkan ke aksi (Konsultasi/Keranjang/Produk), **jujur** (tanpa angka/bukti palsu), dan mudah dirawat dari dashboard.

---

## 2. Inventaris Kondisi Sekarang (baseline terdokumentasi)

### 2.1 Struktur halaman — `src/app/page.tsx`
Urutan saat ini (server component, 37 baris):
```
IntroLoader → Navbar →
Hero → Technologies → Services → WhyUs → Process → Stats →
PortfolioTeaser → Testimonials → Pricing → Faq → CtaContact → Footer
```

### 2.2 Komponen section (`src/components/sections/*.tsx`)
| File | ~Baris | Tipe | Anchor id | Sumber data |
| --- | --- | --- | --- | --- |
| `hero.tsx` | 245 | client | `#beranda` | `content` (hero showcase, testimonials, stats) + `settings` |
| `navbar.tsx` | 218 | client | — | `content` (NAV_LINKS), `settings`, cart |
| `technologies.tsx` | 43 | client | — | `content.technologies` |
| `services.tsx` | 46 | client | `#layanan` | `content.services` |
| `why-us.tsx` | 58 | client | `#keunggulan` | `content.whyUs` |
| `process.tsx` | 60 | client | — (tanpa id) | `content.process` |
| `stats.tsx` | 69 | client | — (tanpa id) | `content.stats` ⚠️ placeholder |
| `portfolio-teaser.tsx` | 54 | **server** | `#portofolio` | `getProjects()` + `getPortfolioMediaMap()` |
| `testimonials.tsx` | 77 | client | — (tanpa id) | `content.testimonials` ⚠️ placeholder |
| `pricing.tsx` | 107 | client | `#harga` | `content.pricing` + `settings` |
| `faq.tsx` | 29 | client | `#faq` | `content.faqs` |
| `cta-contact.tsx` | 83 | client | `#kontak` | `settings`, `COMPANY` |
| `footer.tsx` | 138 | client | — | `PAGE_NAV_LINKS`, `settings`, `content.services`, `NewsletterForm` |

### 2.3 Sumber data (terverifikasi)
- **Terkelola dashboard** (`content-provider` ← `getSiteContent()` ← Firestore `content/site`): `hero`, `services` (+detail), `whyUs`, `process`, `stats`, `testimonials`, `technologies`, `pricing`, `faqs`. Normalizer lengkap & backward-compat di `site-content.ts` (`normalizeList`: `undefined` → default, `[]` → hormati kosong).
- **Hardcoded** (sengaja): `src/lib/services.ts` (detail layanan, keputusan `docs/2026-10-02-upgrade-sistem-layanan.md` §13), `src/lib/content.ts` (nav, default, `COMPANY`, `SERVICES`, `PROJECTS` contoh).
- **Settings** (`/admin/settings`): kontak/WA/email/location/socials.

### 2.4 Modul siap pakai yang BELUM dipakai di beranda
| Modul | Status | Catatan |
| --- | --- | --- |
| `getSocialProof()` (`src/lib/social-proof.ts`) | ✅ ada, dipakai di detail produk | Hitung pesanan nyata 7 hari; cache 10 menit; ambang ≥ 3 pesanan; `null` bila kurang. **Server-only.** |
| `SocialProof` (`src/components/social-proof.tsx`) | ✅ ada, dipakai di `/produk/[slug]` | Komponen **server**; render `null` bila data kurang. |
| `getProducts()` / `DEFAULT_PRODUCTS` (`src/lib/products.ts`) | ✅ ada | Fallback `DEFAULT_PRODUCTS` saat Admin SDK belum dikonfigurasi (mode demo); `[]` saat koleksi sengaja dikosongkan. |
| `ProductCard` (`src/components/product-card.tsx`) | ✅ ada | Kartu katalog (badge stok, rating, buy actions). Client component. |
| `SectionHeading` (`src/components/section-heading.tsx`) | ✅ ada | Dipakai hampir semua section; `align` & `light`. |
| `Reveal`/`staggerContainer`/`staggerItem` (`src/components/motion.tsx`) | ✅ ada | Hormati `prefers-reduced-motion`. |

### 2.5 Yang belum ada / celah (terverifikasi)
- Belum ada **bukti sosial nyata** di beranda (modul `getSocialProof` siap dipakai).
- **Testimoni & stat** masih placeholder bawaan (`isDefaultTestimonials`/`isDefaultStats` di `content-types.ts` sudah punya deteksi, dipakai dashboard).
- Belum ada **seksi produk digital** di beranda (padahal ada katalog `/produk` + pembayaran online).
- Anchor id **belum konsisten**: `process.tsx` & `stats.tsx` & `testimonials.tsx` tanpa id; `technologies.tsx` punya `aria-label` tapi tanpa id; `why-us` sudah `#keunggulan`.
- Belum ada event tracking khusus "Lihat Produk" dari beranda.

---

## 3. Tujuan & Metrik Keberhasilan

### Tujuan
1. Beranda **menjelaskan value + menumbuhkan kepercayaan + mengarahkan aksi** secepat mungkin.
2. **Konsisten & jujur**: tanpa angka/klaim palsu; semua bukti dari data nyata.
3. **Mudah dirawat**: bedakan jelas mana konten dashboard vs hardcoded; dokumentasikan.
4. **Cepat & aksesibel** (LCP, kontras, keyboard, reduced-motion).

### Metrik (manual/observability)
- Klik CTA WhatsApp dari hero/section ↑ (event `whatsapp_click` per lokasi).
- Klik "Lihat Produk" / add-to-cart dari beranda ↑.
- Scroll depth beranda (opsional event).
- (Kualitatif) Uji 5-detik: apakah pesan inti terbaca jelas.

---

## 4. Fase Eksekusi (H0–H8) — Checklist Progres

> Tiap fase **mandiri**, berurutan. QA gate (§7) wajib tiap fase sebelum commit.

### ✅ FASE H0 — Audit & Dokumen Fase — **SELESAI**
**Tujuan:** baseline & keputusan sebelum ubah.
- [x] Buat `docs/2026-10-06-upgrade-beranda.md` (dokumen ini) — kerangka rencana + checklist progres.
- [x] Verifikasi kondisi: audit `page.tsx`, seluruh section, sumber data, modul siap pakai (§1–§2).
- [x] Identifikasi data placeholder: `testimonials` & `stats` (`content.ts` — ⚠️ CONTOH). → Putuskan: **sembunyikan bila masih default / isi manual** (lihat Keputusan di §5).
- [x] Catat keputusan urutan section final (lihat H1 di §5).
- **DoD:** dokumen fase ada; daftar prioritas final disetujui. ✅

### ✅ FASE H1 — Struktur & Alur Persuasi (IA) — **SELESAI**
**Tujuan:** susun ulang urutan section agar alur persuasi (AIDA) lebih kuat.
- [x] Urutan final diterapkan di `src/app/page.tsx`:
  ```
  Hero → Technologies (trust strip) → Services → PortfolioTeaser →
  WhyUs → Process → Stats → Testimonials → Pricing → Faq → CtaContact
  ```
  (Seksi **Bukti sosial nyata** = H2 dan **Produk Digital** = H5 akan disisipkan saat fasenya dikerjakan — slot sudah disiapkan: bukti sosial setelah Services, produk digital setelah Process.)
- [x] **Anchor id konsisten**: ditambahkan id baru `#teknologi`, `#proses`, `#statistik`, `#testimoni` pada section yang belum punya; seluruh section ber-anchor diberi `scroll-mt-24` agar tidak tertutup navbar fixed.
- [x] **`NAV_LINKS`** (`src/lib/content.ts`) diverifikasi konsisten: `Beranda (#beranda)` · `Layanan` · `Produk` · `Portofolio` · `Blog` · `Harga` · `Promo` · `FAQ (/#faq)` — "Produk" sudah ada; tautan anchor (`/#beranda`, `/#faq`) valid di beranda. Tidak ada perubahan (menghindari kepadatan menu).
- [x] **Mobile-first**: tidak ada section menggantung; seluruh section punya `return null` saat data kosong (technologies/whyUs/process/stats/testimonials) — aman saat konten minim.
- **DoD:** urutan final diterapkan; nav konsisten; tidak ada section menggantung. ✅

### ✅ FASE H2 — Konten & Kejujuran Data (Trust) — **SELESAI**
**Tujuan:** ganti placeholder dengan konten nyata/mekanisme jelas.
- [x] **Testimoni**: `testimonials.tsx` kini **sembunyi** bila kosong **atau** masih placeholder (`isDefaultTestimonials(testimonials)` → `return null`). Tidak menampilkan testimoni karangan; konten asli diisi via `/admin/content`.
- [x] **Stats**: `stats.tsx` **sembunyi** bila kosong **atau** masih placeholder (`isDefaultStats(stats)`). Bila tampil (angka nyata), ditambah caption jujur *"Angka kumulatif sejak berdiri, diperbarui berkala."*.
- [x] **Bukti sosial nyata di hero**: `<SocialProof />` (server, `getSocialProof()` — pesanan nyata 7 hari, ambang ≥3) dirender di `page.tsx` dan dikirim sebagai prop `socialProof` ke `Hero` → menggantikan chip **"100% Kepuasan"** yang palsu. Fallback jujur bila data belum cukup: chip **"Garansi · Kualitas"** (bukan angka).
- [x] **Klaim hero (avatars & klien)**: `hero.tsx` kini hanya menampilkan avatar & "N klien mempercayai kami" bila testimoni/stat **bukan** placeholder (`isDefaultTestimonials`/`isDefaultStats`). Tidak ada wajah/angka karangan.
- [x] **Logo klien "Trusted By"**: diverifikasi — **tidak ada** seksi/aset logo klien di repo (hanya logo tech stack & logo LKTech). Marquee teknologi tetap berlabel jujur *"Teknologi yang kami gunakan"* (bukan disamarkan jadi klien). Tidak ada yang perlu disembunyikan.
- **DoD:** tidak ada klaim/angka tanpa dasar; section kosong/placeholder tersembunyi rapi. ✅

> **Catatan teknis:** `page.tsx` diberi `export const revalidate = 300` (5 menit) agar data dinamis (portofolio + bukti sosial) segar; route `/` tetap **Static (`○`)**.

### ✅ FASE H3 — Sistem Konten (konsolidasi kelola) — **SELESAI**
**Tujuan:** perjelas mana konten dari dashboard vs hardcoded; minimalkan duplikasi.
- [x] **Tabel sumber konten** disusun (lihat tabel di bawah) — field → sumber.
- [x] **Menghapus duplikasi layanan (temuan utama).** Sebelumnya ada **DUA** definisi layanan: `src/lib/services.ts` (kaya, hardcoded — dipakai `/layanan`, `/layanan/[slug]`, sitemap, admin) **dan** `SERVICES` + `SERVICES_DETAIL` di `content.ts` (penuh, lama — default `SiteContent.services` untuk beranda & footer). Keduanya berisi 5 layanan sama.
  - `content.ts`: **hapus** `SERVICES` + `SERVICES_DETAIL` + `getServiceSlugs()` (**−736 baris**). Tipe (`Service`/`ServiceDetail`/`ServiceFaq`/dst.) **dipertahankan**.
  - `content-types.ts`: `buildDefaultServices()` kini menurunkan default dari **`@/lib/services`** (sumber tunggal).
  - `services.tsx` (beranda) & `footer.tsx`: membaca **`SERVICES` dari `@/lib/services`** langsung (bukan `useContent`).
  - **Efek:** beranda kini menampilkan **5 layanan** (sebelumnya 3 dari data Firestore basi) — **konsisten** dengan `/layanan`.
- [x] **Pemilihan keputusan**: layanan tetap **hardcoded** (K6, sesuai §13 `docs/2026-10-02-upgrade-sistem-layanan.md`); **tidak** menambah field `SiteContent` baru; `content-provider` tetap sumber tunggal untuk section terkelola lain (`whyUs`/`process`/`stats`/`testimonials`/`technologies`/`pricing`/`faqs`/`hero`).
- [x] **Backward-compat**: `SiteContent.services` tetap ada di tipe & normalizer (data lama tetap valid & tersimpan), hanya tak lagi dikonsumsi komponen.
- [x] **Pembersihan dead export**: `fadeUp` (tak terpakai) dihapus dari `motion.tsx`.
- **DoD:** tabel sumber konten lengkap; tidak ada hardcode baru tanpa alasan; duplikasi layanan hilang. ✅

**Tabel sumber konten (inventaris final):**

| Konten | Sumber | Dikelola di |
| --- | --- | --- |
| `hero` (showcase carousel) | Dashboard (`content/site`) | `/admin/hero` |
| `whyUs`, `process`, `stats`, `testimonials`, `technologies` | Dashboard (`content/site`) | `/admin/content` |
| `pricing` | Dashboard (`content/site`) | `/admin/pricing` |
| `faqs` | Dashboard (`content/site`) | `/admin/faq` |
| **`services` (layanan)** | **Hardcoded** `@/lib/services` | *(bukan dashboard — sesuai K6)* |
| Kontak/WA/email/lokasi/socials | Dashboard (`settings`) | `/admin/settings` |
| `COMPANY`, `NAV_LINKS`, `PAGE_NAV_LINKS` | Hardcoded `content.ts` | — |
| `PROJECTS` (default portofolio) | Hardcoded `content.ts` (fallback) | `/admin/projects` (Firestore) |
| `WA_MESSAGES` | Hardcoded `whatsapp.ts` | — |

### ✅ FASE H4 — Desain & Polesan Visual — **SELESAI**
**Tujuan:** hilangkan kesan "datar"; konsisten.
- [x] **Konsistensi spacing**: mayoritas section `py-24`; `CtaContact` outer `py-20 → py-24`. `Technologies` (`py-12`, strip tipis) & `Stats` (`py-20`, band gelap) sengaja berbeda sebagai aksen — keduanya dalam rentang konsisten.
- [x] **Konsistensi latar (alternasi)**: dihilangkan dua section berdekatan sama-latar. Run `Services→FeaturedProducts` kini berselang rapi: `Services (surface) → Portfolio (white) → WhyUs (surface*) → Process (white*) → FeaturedProducts (surface*) → Stats (dark)`. (* = diubah pada fase ini.)
- [x] **SectionHeading** dipakai seragam (eyebrow + title gradient + description) di semua section berkonten; `Technologies`/`Stats`/`CtaContact` pakai gaya bespoke-nya (dipertahankan, bukan heading konten).
- [x] **Hierarki tipografi**: hanya **satu `<h1>`** (hero); seluruh judul section `<h2>` (via `SectionHeading` / `cta-contact`).
- [x] **Micro-interaction & `prefers-reduced-motion`**: `Reveal` (motion.tsx) kini **menonaktifkan animasi masuk** saat reduced-motion; `stats.tsx` (counter angka → tampil penuh instan), `why-us.tsx` & `testimonials.tsx` (stagger → tampil langsung) juga di-gate. (CSS global sudah menangani animasi CSS.)
- [x] **Kontras WCAG AA**: `text-muted` (#64748b) lolos di white (`~4.76:1`) & surface (`~4.6:1`); caption `stats` dinaikkan `white/40 → white/60` (lolos AA di latar gelap); `text-white/70–85` di gradient biru lolos.
- [x] **Mobile**: tap target navbar ikon dinaikkan `h-10 w-10 → h-11 w-11` (44px, sesuai WCAG 2.5.5); dekorasi absolut terkurung `overflow-hidden` (aman dari overflow horizontal); grid responsif (`sm`/`lg`).
- **DoD:** visual konsisten; a11y AA; mobile rapi. ✅

> **Catatan backlog (dicatat, bukan H4):** ekspor `fadeUp` di `motion.tsx` tak terpakai (dead export) — kandidat pembersihan di H3/polesan lanjutan.

### ✅ FASE H5 — Seksi Baru: Produk Digital (opsional tapi berdampak) — **SELESAI**
**Tujuan:** ekspos katalog produk (yang punya pembayaran online) di beranda.
- [x] Section baru **`src/components/sections/featured-products.tsx`** (server component) — ambil maksimum 6 produk via `getProducts()` (hanya aktif, urut unggulan → nama).
- [x] Kartu pakai **`ProductCard`** (konsisten: badge stok nyata, bintang rating, aksi beli/keranjang — sama seperti katalog `/produk`).
- [x] CTA **"Lihat semua produk"** → `/produk`.
- [x] **Tersembunyi total** bila tidak ada produk (`return null`) — tidak render seksi kosong.
- [x] A11y: `<section id="produk" aria-labelledby="produk-heading">` + `<span id="produk-heading">` pada judul; `scroll-mt-24`.
- [x] Dipasang di `page.tsx` **setelah `Process`** (slot K1); latar `bg-white` agar berselang dengan `Process (bg-surface)` & `Stats (bg-secondary)`.
- **DoD:** seksi tampil hanya saat ada produk; menautkan ke katalog. ✅
- **Verifikasi build:** HTML ter-prerender memuat `#produk` + CTA + kartu produk nyata (mis. `paket-aplikasi-mobile`).

### ✅ FASE H6 — SEO & Performa — **SELESAI**
- [x] **Metadata beranda (khusus)**: `page.tsx` kini mengekspor `metadata` — judul `title.absolute` fokus jasa + produk (`"LKTech — Jasa Pembuatan Website, Aplikasi Mobile & Produk Digital"`), deskripsi menyebut layanan & produk digital, `alternates.canonical: "/"`, dan `openGraph` khusus (judul/deskripsi/url).
- [x] **JSON-LD beranda**: `structured-data.tsx` kini mengeluarkan **dua** node — `ProfessionalService` (`@id #organization`, + `image`/`knowsAbout` diperluas termasuk "Produk Digital") **dan** `WebSite` (`@id #website`, `inLanguage`, `publisher` → organisasi). *(Tidak ada `SearchAction` — situs belum punya fitur pencarian, sesuai checklist "bila ada".)*
- [x] **OG image**: diperbarui agar selaras posisi baru — chip `Website · Aplikasi Mobile · Produk Digital`; `alt` disesuaikan. (Catatan "LK" vs logo mark tetap backlog — `ImageResponse` tak andal menyematkan SVG.)
- [x] **LCP**: hero — carousel browser sudah `priority` (≥ `fetchPriority=high`), carousel ponsel non-priority (sekunder); section `min-h-screen` (tinggi tetap → tanpa CLS); saat showcase kosong → placeholder gradient (tanpa gambar LCP sama sekali).
- [x] **`robots`/`sitemap`**: diverifikasi tetap benar — `robots.ts` melarang `/admin`, `/api`, `/akun`, `/keranjang`, `/masuk`, `/unduhan` + menautkan sitemap; `sitemap.ts` memuat rute statis (beranda prioritas 1) + layanan/produk/portofolio/blog/kategori/tag.
- [ ] Lighthouse (manual) — target ≥ 90 Performance/A11y/SEO (mobile). → dijalankan manual saat uji browser.
- **DoD:** metadata & JSON-LD lengkap; LCP wajar; Lighthouse baik (manual). ✅ (kode)

> **Verifikasi:** HTML beranda ter-prerender memuat judul & deskripsi baru, `canonical https://lktech.id`, `og:title`, dan JSON-LD `ProfessionalService` + `WebSite`.

### ✅ FASE H7 — Observability & Konversi — **SELESAI**
- [x] **Event baru (terketik, tanpa PII)** di `analytics.ts`: `cta_click` (`trackCtaClick(location, target)`) dan `scroll_depth` (`trackScrollDepth(percent)`).
- [x] **Komponen `TrackedLink`** (`src/components/tracked-link.tsx`) — `next/link` yang mencatat klik; aman dipakai dari server component (props serializable).
- [x] **CTA navigasi beranda terpasang** `cta_click`:
  - `hero` → `#layanan` ("Lihat Layanan")
  - `services` → `/layanan` ("Lihat semua layanan")
  - `portofolio-teaser` → `/portofolio` ("Lihat semua proyek")
  - `produk-section` → `/produk` ("Lihat semua produk")
  - `pricing` → `/harga` ("Lihat semua paket & bandingkan fitur")
- [x] **`whatsapp_click`** mencakup semua titik: `hero`, `pricing`, `cta-contact`, `footer`, `navbar-mobile` (diverifikasi — sudah ada; tidak ada yang hilang).
- [x] **Scroll depth** (opsional, diaktifkan): `ScrollDepthTracker` (`scroll-depth-tracker.tsx`) — milestone **25/50/75/100%** sekali tiap milestone; listener pasif + `rAF`; melepas listener setelah semua tercapai. Di-mount di beranda saja.
- [x] **Aman & tanpa PII**: semua lewat `trackEvent` yang no-op bila SSR/analytics diblokir; properti hanya konteks/tujuan/persen (tanpa nama/email/telepon/isi pesan).
- **DoD:** event tercatat; tanpa PII; aman saat analytics nonaktif. ✅

> **Catatan:** `package_click` (CTA paket via WhatsApp) sudah ada dari sebelumnya; tidak diubah.

### FASE H8 — QA, Dokumentasi & Rilis
- [ ] QA gate lengkap (§7).
- [ ] Update `TASK-SELANJUTNYA.md`, `docs/README.md` (index), roadmap bila relevan.
- [ ] Commit konvensional + push (Vercel auto-deploy) + verifikasi produksi.
- [ ] Tulis ringkasan hasil di doc fase (apa yang berubah, sisa backlog).
- **DoD:** semua §7 lolos; docs diperbarui; live.

---

## 5. Keputusan Awal (hasil H0)

| # | Keputusan | Alasan |
| --- | --- | --- |
| **K1** | **Urutan section final (target)** = `Hero → Technologies (trust strip) → Services → Bukti sosial → PortfolioTeaser → WhyUs → Process → Produk Digital (BARU) → Stats → Testimonials → Pricing → Faq → CtaContact`. | Alur AIDA: Perhatian (hero) → minat (layanan/bukti) → keinginan (proses/produk/stat/testimoni) → aksi (harga/CTA). Bila bukti sosial nyata tak memenuhi ambang, seksi tsb tidak dirender (tidak memutus alur). |
| **K2** | **Jangan tampilkan testimoni/stat placeholder.** Deteksi via `isDefaultTestimonials()` / `isDefaultStats()` (sudah ada di `content-types.ts`) → sembunyikan section bila masih default. | Etika kejujuran (§2 tujuan, DoD §9.3): tanpa angka/klaim palsu. Konten asli dapat diisi via `/admin/content` (behavior lama tetap jalan = backward-compatible). |
| **K3** | **Bukti sosial pakai `getSocialProof()`** (pesanan nyata 7 hari, ambang ≥3) — bukan angka karangan. | Modul sudah ada & teruji; prinsip sama dengan detail produk. |
| **K4** | **Seksi Produk Digital memakai `getProducts()` + `ProductCard`**, server-rendered, **tampil hanya bila ada produk**. | Reuse modul yang ada (konsisten, tanpa dependensi baru); jangan render seksi kosong. |
| **K5** | **Konsolidasi sistem konten (H3)**: tidak menambah hardcode baru; bila perlu field baru → `SiteContent` + normalizer + default (backward-compat). | Menjaga satu sumber tunggal (`content-provider`) & pola proyek. |
| **K6** | **Layanan tetap hardcoded** (`services.ts`) — tidak dipindah ke dashboard. | Sesuai keputusan `docs/2026-10-02-upgrade-sistem-layanan.md` §13. |
| **K7** | **Inti transaksi (cart/checkout/order) tidak diubah** demi beranda. | Batasan rencana (task §8). |
| **K8** | **Anchor id konsisten** ditambahkan pada section yang belum punya (process/stats/testimonials/technologies). | Deep-link & navigasi konsisten (H1). |

> **Prioritas eksekusi diusulkan (berurutan): H1 → H2 → H5 → H4 → H3 → H6 → H7 → H8.**
> Alasan: struktur & kejujuran data + seksi produk = dampak konversi tertinggi lebih dulu; disusul polesan visual & konsolidasi sistem; lalu SEO/observability; diakhiri QA/rilis.

---

## 6. Perubahan File yang Diperkirakan

| Area | File |
| --- | --- |
| Struktur beranda | `src/app/page.tsx` |
| Section | `src/components/sections/*.tsx` (hero, technologies, services, why-us, process, stats, testimonials, pricing, dll) |
| Seksi baru | `src/components/sections/featured-products.tsx` (baru, H5) |
| Data konten | `src/lib/content.ts`, `src/lib/content-types.ts` (bila menambah field / deteksi default) |
| Nav | `src/lib/content.ts` (`NAV_LINKS`) |
| SEO | `src/app/page.tsx` (metadata/JSON-LD), `src/components/structured-data.tsx`, `src/app/opengraph-image.tsx` |
| Tracking | `src/lib/analytics.ts`, komponen terkait |
| Admin (bila H3/H5 butuh) | `src/components/admin/content-extra-manager.tsx`, `src/app/api/admin/content/route.ts` |
| Docs | `docs/2026-10-06-upgrade-beranda.md` (dokumen ini), `TASK-SELANJUTNYA.md`, `docs/README.md` |

---

## 7. QA Gate (WAJIB tiap fase, sebelum commit)

```bash
npx tsc --noEmit      # bersih
npx eslint .          # bersih
npm run build         # sukses
# unit test terkait (bila menyentuh logika):
npm run test:metrics && npm run test:fulfillment && npm run test:downloads `
 && npm run test:expiry && npm run test:bundle && npm run test:stock `
 && npm run test:cart && npm run test:status && npm run test:reviews `
 && npm run test:audit && npm run test:leads && npm run test:report `
 && npm run test:loyalty && npm run test:wishlist
```
Plus uji manual (**mobile & desktop**): hero, anchor nav, semua CTA, form newsletter, a11y (keyboard + `prefers-reduced-motion`), cepat (LCP wajar).

> CI GitHub Actions (`.github/workflows/ci.yml`) otomatis menjalankan tsc+lint+test+build tiap push/PR → pastikan **hijau**.

---

## 8. Catatan Penting & Backlog Terkait
- **Logo OG image**: `src/app/opengraph-image.tsx` menggambar teks "LK" (belum pakai logo asli mark) — perbaiki bila sempat.
- **Placeholder konten**: testimoni (`TESTIMONIALS`) & stats (`STATS`). **Jangan** tampilkan yang palsu → sembunyikan atau isi asli.
- **Modul siap pakai** yang belum dipakai di beranda: `getSocialProof()`/`<SocialProof />` (bukti sosial), `getProducts()` (katalog), `ProductCard`.
- **Layanan hardcoded** (`src/lib/services.ts`) — bukan dikelola dashboard (keputusan §13 dokumen upgrade layanan).
- **Jangan** mengubah inti transaksi (cart/checkout/order) demi beranda.
- **Backward-compatible**: bila menambah field `SiteContent`, sediakan default + normalizer.

---

## 9. Definition of Done (global)
1. `tsc`/`lint`/`build` bersih + CI hijau.
2. Beranda konsisten & rapi (desktop + mobile), **a11y AA** + `prefers-reduced-motion`.
3. **Tidak ada** angka/klaim/bukti palsu (semua dari data nyata atau disembunyikan).
4. Struktur/urutan section final terdokumentasi; nav & anchor konsisten.
5. SEO (metadata + JSON-LD + OG) & performa (LCP wajar) membaik.
6. Event konversi tercatat (tanpa PII).
7. Dokumentasi fase + `TASK-SELANJUTNYA.md` + `docs/README.md` diperbarui.
8. Perubahan **backward-compatible**.

---

## 10. Riwayat Sesi

| Tanggal | Fase | Hasil | Verifikasi |
| --- | --- | --- | --- |
| 2026-10-06 | **H0** | Audit & dokumen fase dibuat; baseline, sumber data, modul siap pakai, dan 8 keputusan awal (K1–K8) ditetapkan. | `tsc`/`eslint`/`build` bersih (tanpa perubahan kode fungsional — hanya dokumen). |
| 2026-10-06 | **H1** | Urutan section disusun ulang (AIDA) di `page.tsx`; anchor id konsisten (`#teknologi`/`#proses`/`#statistik`/`#testimoni` baru + `scroll-mt-24` di semua section); `NAV_LINKS` diverifikasi. | `tsc`/`eslint`/`build` bersih (72 halaman). |
| 2026-10-06 | **H2** | Kejujuran data: testimoni & stat placeholder disembunyikan (`isDefaultTestimonials`/`isDefaultStats`); bukti sosial nyata (`<SocialProof/>`) masuk hero (ganti chip "100% Kepuasan"); avatar/klien hero hanya dari data nyata; logo klien diverifikasi tidak ada. `revalidate=300` di `/`. | `tsc`/`eslint`/`build` bersih (72 halaman; `/` tetap Static). |
| 2026-10-06 | **H5** | Seksi baru **Produk Digital unggulan** (`featured-products.tsx`, server, `getProducts()` max 6, `ProductCard`, CTA → `/produk`, tersembunyi bila kosong, `#produk` + `aria-labelledby`) dipasang setelah `Process`. | `tsc`/`eslint`/`build` bersih (72 halaman); HTML prerender memuat `#produk` + kartu produk nyata. |
| 2026-10-06 | **H4** | Poles visual: alternasi latar section dirapikan (WhyUs/Process/FeaturedProducts), `CtaContact` py-24; `Reveal`+`stats`/`why-us`/`testimonials` hormati `prefers-reduced-motion`; kontras caption stats dinaikkan; tap target navbar `h-11 w-11` (44px). | `tsc`/`eslint`/`build` bersih (72 halaman). |
| 2026-10-06 | **H3** | Konsolidasi konten: hapus duplikasi layanan (`SERVICES`/`SERVICES_DETAIL` di `content.ts`, −736 baris); `@/lib/services` jadi sumber tunggal (default `SiteContent.services`, beranda `services.tsx`, `footer.tsx`). Beranda kini **5 layanan** (konsisten `/layanan`). Hapus `fadeUp` dead export. | `tsc`/`eslint`/`build` bersih (72 halaman); HTML beranda `#layanan` = 5 layanan. |
| 2026-10-06 | **H6** | SEO: metadata beranda khusus (title absolute fokus jasa+produk, description, canonical, OG); JSON-LD +`WebSite` (`@id #website`, publisher) di samping `ProfessionalService`; OG image chip "Produk Digital"; `robots`/`sitemap` diverifikasi; LCP hero dianalisis (priority benar, tanpa CLS). | `tsc`/`eslint`/`build` bersih (72 halaman); HTML beranda memuat title/desc/canonical/OG + JSON-LD `ProfessionalService` & `WebSite`. |
| 2026-10-06 | **H7** | Observability & konversi: event baru `cta_click` + `scroll_depth`; komponen `TrackedLink`; CTA beranda (hero/services/portofolio/produk/pricing) kini ter-track; `ScrollDepthTracker` (25/50/75/100%). | `tsc`/`eslint`/`build` bersih (72 halaman); link CTA ter-render + tracker ter-mount. |
