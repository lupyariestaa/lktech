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

### FASE H3 — Sistem Konten (konsolidasi kelola)
**Tujuan:** perjelas mana konten dari dashboard vs hardcoded; minimalkan duplikasi.
- [ ] Inventaris tabel: **field → sumber** (dashboard | hardcoded | settings) — dokumentasikan di §2.3.
- [ ] Putuskan: apakah menambah pengelolaan baru (mis. **seksi produk unggulan** di beranda via settings/flag)? Bila ya, skema minimal + backward-compatible.
- [ ] Pastikan `content-provider` tetap **sumber tunggal** untuk section terkelola; hindari hardcode baru.
- [ ] Bila menambah field `SiteContent`: update normalizer (`site-content.ts`) + default (`content-types.ts`) + tipe + (bila perlu) `/admin/content`.
- **DoD:** tabel sumber konten lengkap; tidak ada hardcode baru tanpa alasan.

### FASE H4 — Desain & Polesan Visual
**Tujuan:** hilangkan kesan "datar"; konsisten.
- [ ] **Konsistensi spacing** antar section (mayoritas `py-24`; `stats`/`technologies`/`cta-contact` menyimpang → samakan sesuai konteks).
- [ ] **SectionHeading** dipakai seragam (eyebrow + title gradient + description).
- [ ] **Micro-interaction**: hover/`whileInView` konsisten; hormati `prefers-reduced-motion` (pola `motion.tsx`).
- [ ] **Hierarki tipografi**: ukuran judul section konsisten; hindari 2 `<h1>`.
- [ ] **Warna & kontras**: cek WCAG AA (khusus `text-muted` di latar terang).
- [ ] **Mobile**: cek overflow, padding, ukuran tap ≥ 44px.
- **DoD:** visual konsisten; a11y AA; mobile rapi.

### FASE H5 — Seksi Baru: Produk Digital (opsional tapi berdampak)
**Tujuan:** ekspos katalog produk (yang punya pembayaran online) di beranda.
- [ ] Section **"Produk digital unggulan"**: 3–6 produk `featured`/terbaru (server component via `getProducts()`).
- [ ] Kartu pakai `ProductCard` (konsisten + bintang rating bila ada).
- [ ] CTA "Lihat semua produk" → `/produk`.
- [ ] Tampilkan **hanya bila ada produk** (tersembunyi bila kosong).
- [ ] A11y: `<section aria-labelledby>` + anchor `#produk`, heading benar.
- **DoD:** seksi tampil hanya saat ada produk; menautkan ke katalog.

### FASE H6 — SEO & Performa
- [ ] Perkuat metadata beranda (title/description fokus kata kunci jasa + produk).
- [ ] **JSON-LD** beranda: tambah `WebSite` + `SearchAction` (saat ini hanya `ProfessionalService` global di `structured-data.tsx`).
- [ ] **OG image**: pastikan menarik (lihat catatan §8).
- [ ] **LCP**: hero image/mockup — optimasi (`priority` sudah di `HeroShowcaseCarousel`, ukuran tepat, hindari CLS).
- [ ] Cek `robots`/`sitemap` tetap benar.
- [ ] Lighthouse (manual): target ≥ 90 Performance/A11y/SEO (mobile).
- **DoD:** metadata & JSON-LD lengkap; LCP wajar; Lighthouse baik.

### FASE H7 — Observability & Konversi
- [ ] Tambah **event tracking**: klik CTA paket (sudah `pricing`), klik "Lihat Produk" (baru), scroll depth opsional.
- [ ] Pastikan `whatsapp_click` mencakup semua titik baru (`hero`, `cta-contact`, `pricing`, seksi produk).
- [ ] (Opsional) A/B ringan: teks hero/judul tanpa menambah dependensi (varian via flag env).
- **DoD:** event tercatat; tanpa PII; aman saat analytics nonaktif.

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
