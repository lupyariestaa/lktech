# TASK — Upgrade Halaman Beranda / Landing Page (Konten · Desain · Sistem · Tampilan)

> **Status:** 📝 Rencana (belum dieksekusi) — untuk dikerjakan di sesi berikutnya.
> **Disusun:** sesi pasca-Retensi (Tema 2) & revisi UI login.
> **Prioritas:** Tinggi (beranda = kesan pertama & gerbang konversi).
> **Prasyarat baca:** `docs/2026-10-06-roadmap-pengembangan.md`, `docs/2026-10-02-upgrade-sistem-layanan.md`, `docs/2026-10-03-halaman-harga-publik.md`, `docs/identitas-perusahaan.md`, `TASK-SELANJUTNYA.md`.
> **Pola wajib proyek:** server-authoritative · observability (log + status tersimpan) · **a11y** · **mobile-first** · **backward-compatible** · dokumentasi fase (`docs/YYYY-MM-DD-<slug>.md`).

---

## 0. Cara Memakai Dokumen Ini (untuk sesi berikutnya)

1. Baca **§1 Ringkasan & Diagnosis** + **§2 Inventaris kondisi sekarang**.
2. Pilih fase (**H0–H8** di §6). Mulai dari **H0 (audit & dokumen fase)**.
3. Untuk setiap fase: kerjakan checklist → jalankan **QA gate** (§7) → commit konvensional → push (Vercel auto-deploy).
4. Catat progres di `TASK-SELANJUTNYA.md` + update status di dokumen ini.
5. **Jangan** mengubah alur transaksi/inti (cart/checkout/order) tanpa alasan — fokus beranda.

---

## 1. Ringkasan & Diagnosis

Beranda saat ini **sudah lengkap** (hero + 10 section) dan secara teknis sehat (server data via
`content-provider`, animasi framer-motion, a11y dasar). Namun masih ada celah bernilai tinggi:

| Sumbu | Kondisi sekarang | Peluang |
| --- | --- | --- |
| **Konten** | Banyak data **placeholder** (testimoni/stat/stats) | Isi konten nyata / mekanisme kelola |
| **Konversi** | Hero CTA bagus, tapi belum "menjual" sekuat mungkin | Perkuat value prop, bukti sosial nyata, urgensi etis |
| **Struktur/IA** | Urutan section bisa lebih strategis (trust sebelum harga) | Susun ulang alur persuasi (AIDA) |
| **Desain** | Konsisten & modern, tapi beberapa section "datar" | Polesan visual, konsistensi spacing, micro-interaction |
| **Sistem** | Konten sebagian dari dashboard, sebagian hardcoded | Samakan pola (mana dashboard vs hardcoded) |
| **Performa/SEO** | Baik (sitemap, JSON-LD, OG) | Perkuat LCP, meta, structured data beranda |
| **Observability** | Event tracking ada (WA/cart/pricing) | Lengkapi event section (scroll depth, CTA) |

> **Tujuan akhir:** beranda yang **meyakinkan dalam 5 detik**, mengarahkan ke aksi (Konsultasi/Keranjang/Produk),
> dan **jujur** (tanpa angka/bukti palsu), serta mudah dirawat dari dashboard.

---

## 2. Inventaris Kondisi Sekarang (baseline — verifikasi ulang saat mulai)

### 2.1 Struktur halaman (`src/app/page.tsx`)
Urutan saat ini:
```
IntroLoader → Navbar →
Hero → Technologies → Services → WhyUs → Process → Stats →
PortfolioTeaser → Testimonials → Pricing → Faq → CtaContact → Footer
```

### 2.2 Komponen section (`src/components/sections/*.tsx`)
| File | Baris | Catatan |
| --- | --- | --- |
| `hero.tsx` | 229 | Device mockup 3D (tilt), showcase carousel, klaim sosial dari `stats`/`testimonials` |
| `navbar.tsx` | 218 | Fix nav, badge keranjang, ikon admin/user (baru), mobile sheet |
| `services.tsx` | 42 | Kartu layanan (data `content`) |
| `why-us.tsx` | 52 | Keunggulan |
| `process.tsx` | 54 | Alur kerja |
| `stats.tsx` | 61 | Counter animatif (data `content`) |
| `portfolio-teaser.tsx` | 50 | Cuplikan portofolio |
| `testimonials.tsx` | 70 | Data `content` (placeholder) |
| `pricing.tsx` | 99 | Kartu paket beranda → tautan `/harga` |
| `faq.tsx` | 26 | Akordeon |
| `cta-contact.tsx` | 77 | CTA penutup |
| `technologies.tsx` | 38 | Logo tech stack |
| `footer.tsx` | 129 | + form newsletter (baru) |

### 2.3 Sumber data
- **Terkelola via dashboard** (`content-provider`/`SiteContent`): `hero` (showcase), `services`, `whyUs`, `process`, `stats`, `testimonials`, `technologies`, `pricing`, `faq` — dikelola di `/admin/content`, `/admin/hero`, `/admin/pricing`, `/admin/faq`.
- **Hardcoded**: `src/lib/services.ts` (detail layanan), `src/lib/content.ts` (nav, defaults), `COMPANY` (identitas).
- **Settings**: kontak/WA dari `/admin/settings`.

### 2.4 Yang belum ada / celah
- Belum ada **bukti sosial nyata** di beranda (mis. "N pesanan minggu ini" dari order — modul `social-proof.ts` **sudah ada**).
- Testimoni/stat masih **placeholder** (belum data asli).
- Belum ada **seksi produk digital** di beranda (padahal ada katalog `/produk` + pembayaran online).
- Belum ada **event tracking per section** (scroll/CTA) selain yang sudah ada.
- Belum ada **deeplink anchor** yang konsisten antar section.

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

## 4. Fase Eksekusi (H0–H8)

> Tiap fase **mandiri**, bisa dikerjakan berurutan. Estimasi relatif, bukan waktu pasti.

### FASE H0 — Audit & Dokumen Fase ✅ WAJIB DULU
**Tujuan:** baseline & keputusan sebelum ubah.
- [ ] Buat `docs/YYYY-MM-DD-upgrade-beranda.md` (dokumen fase) yang menyalin kerangka dokumen ini + checklist progres.
- [ ] Verifikasi kondisi: buka beranda (desktop & mobile), catat section yang datar/placeholder.
- [ ] Data mana yang placeholder? (`testimonials`, `stats`) → putuskan: isi manual atau mekanisme.
- [ ] Catat keputusan urutan section final (lihat H1).
- **DoD:** dokumen fase ada; daftar prioritas final disetujui.

### FASE H1 — Struktur & Alur Persuasi (IA)
**Tujuan:** susun ulang urutan section agar alur persuasi (AIDA) lebih kuat.
- [ ] Usulan urutan (evaluasi & putuskan):
  ```
  Hero → Trust strip (logo klien/tech) → Layanan → Bukti sosial nyata →
  Portofolio → Keunggulan (Why Us) → Alur kerja (Process) → Produk digital (BARU) →
  Stats → Testimoni → Harga → FAQ → CTA penutup → Footer
  ```
- [ ] Pastikan tiap section punya **anchor id** jelas (`#layanan`, `#produk`, `#harga`, `#faq`).
- [ ] Perbarui `NAV_LINKS` (`src/lib/content.ts`) agar cocok (mis. tambah "Produk").
- [ ] Mobile-first: cek panjang scroll & beban visual.
- **DoD:** urutan final diterapkan; nav konsisten; tidak ada section menggantung.

### FASE H2 — Konten & Kejujuran Data (Trust)
**Tujuan:** ganti placeholder dengan konten nyata/mekanisme jelas.
- [ ] **Testimoni**: isi nyata via `/admin/content` ATAU sembunyikan section bila kosong (sudah `return null` saat kosong — pastikan). Jangan tampilkan testimoni karangan.
- [ ] **Stats**: pakai angka nyata; beri **label/sumber** (mis. "(kumulatif)"); jangan angka palsu.
- [ ] **Bukti sosial nyata** di hero/beranda: pakai `getSocialProof()` (modul yang ada) — tampilkan hanya bila ambang terpenuhi (mis. ≥3), tanpa angka karangan.
- [ ] **Logo klien "Trusted By"**: konfirmasi sumber aset (folder `public/`, ada dokumen setup) — jika belum ada asli, sembunyikan.
- **DoD:** tidak ada klaim/angka tanpa dasar; section kosong tersembunyi rapi.

### FASE H3 — Sistem Konten (konsolidasi kelola)
**Tujuan:** perjelas mana konten dari dashboard vs hardcoded; minimalkan duplikasi.
- [ ] Inventaris tabel: **field → sumber** (dashboard | hardcoded | settings). Dokumentasikan di doc fase.
- [ ] Putuskan: apakah menambah pengelolaan baru (mis. **seksi produk unggulan** di beranda via settings/flag)? Bila ya, siapkan skema minimal + backward-compatible.
- [ ] Pastikan `content-provider` tetap **sumber tunggal** untuk section terkelola; hindari hardcode baru.
- [ ] Bila menambah field `SiteContent`: update normalizer + default + tipe + (bila perlu) `/admin/content`.
- **DoD:** tabel sumber konten lengkap; tidak ada hardcode baru tanpa alasan.

### FASE H4 — Desain & Polesan Visual
**Tujuan:** hilangkan kesan "datar"; konsisten.
- [ ] **Konsistensi spacing** antar section (py konsisten; mis. `py-20`/`py-24`).
- [ ] **SectionHeading** dipakai seragam (eyebrow + title gradient + description).
- [ ] **Micro-interaction**: hover/`whileInView` konsisten; hormati `prefers-reduced-motion` (pola `motion.tsx`).
- [ ] **Hierarki tipografi**: ukuran judul section konsisten; hindari 2 `<h1>`.
- [ ] **Warna & kontras**: cek WCAG AA (khusus teks `text-muted` di latar terang).
- [ ] **Mobile**: cek overflow, padding, ukuran tap ≥ 44px.
- **DoD:** visual konsisten; a11y AA; mobile rapi.

### FASE H5 — Seksi Baru: Produk Digital (opsional tapi berdampak)
**Tujuan:** ekspos katalog produk (yang punya pembayaran online) di beranda.
- [ ] Section **"Produk digital unggulan"**: ambil 3–6 produk `featured`/terbaru (server component via `getProducts`, atau fetch klien).
- [ ] Kartu pakai `ProductCard` yang ada (konsisten + bintang rating bila ada).
- [ ] CTA "Lihat semua produk" → `/produk`.
- [ ] Tampilkan **hanya bila ada produk** (tersembunyi bila kosong) — jangan seksi kosong.
- [ ] A11y: `<section aria-labelledby>`, heading benar.
- **DoD:** seksi tampil hanya saat ada produk; menautkan ke katalog.

### FASE H6 — SEO & Performa
- [ ] Perkuat metadata beranda (title/description fokus kata kunci jasa + produk).
- [ ] **JSON-LD** beranda: `Organization` + `WebSite` (+ `SearchAction` bila ada search) — cek yang sudah ada, lengkapi.
- [ ] **OG image**: pastikan menarik (lihat catatan OG "LK" di §8).
- [ ] **LCP**: hero image/mockup — optimasi (`priority`, ukuran tepat, hindari CLS).
- [ ] Cek `robots`/`sitemap` tetap benar.
- [ ] Lighthouse (manual): target ≥ 90 Performance/A11y/SEO (mobile).
- **DoD:** metadata & JSON-LD lengkap; LCP wajar; Lighthouse baik.

### FASE H7 — Observability & Konversi
- [ ] Tambah **event tracking**: klik CTA paket (sudah ada `package_click`), klik "Lihat Produk", scroll depth opsional.
- [ ] Pastikan `whatsapp_click` mencakup semua titik baru (`hero`, `cta-contact`, `pricing`, seksi produk).
- [ ] (Opsional) A/B ringan: teks hero/judul (tanpa menambah dependensi — mis. varian via query/flag env).
- **DoD:** event tercatat; tanpa PII; aman saat analytics nonaktif.

### FASE H8 — QA, Dokumentasi & Rilis
- [ ] QA gate lengkap (§7).
- [ ] Update `TASK-SELANJUTNYA.md`, `docs/README.md` (index), roadmap bila relevan.
- [ ] Commit konvensional + push (Vercel auto-deploy) + verifikasi produksi.
- [ ] Tulis ringkasan hasil di doc fase (apa yang berubah, sisa backlog).
- **DoD:** semua §7 lolos; docs diperbarui; live.

---

## 5. Perubahan File yang Diperkirakan

| Area | File |
| --- | --- |
| Struktur beranda | `src/app/page.tsx` |
| Section | `src/components/sections/*.tsx` (hero, services, stats, testimonials, pricing, dll) |
| Seksi baru | `src/components/sections/featured-products.tsx` (baru, H5) |
| Data konten | `src/lib/content.ts`, `src/lib/content-types.ts` (bila menambah field) |
| Nav | `src/lib/content.ts` (`NAV_LINKS`) |
| SEO | `src/app/page.tsx` (metadata/JSON-LD), `src/app/opengraph-image.tsx` |
| Tracking | `src/lib/analytics.ts`, komponen terkait |
| Admin (bila H3/H5 butuh) | `src/components/admin/content-extra-manager.tsx`, `src/app/api/admin/content/route.ts` |
| Docs | `docs/YYYY-MM-DD-upgrade-beranda.md` (baru) |

---

## 6. Checklist Progres (isi saat eksekusi)

- [ ] H0 Audit & dokumen fase
- [ ] H1 Struktur & alur persuasi
- [ ] H2 Konten & kejujuran data
- [ ] H3 Sistem konten (konsolidasi)
- [ ] H4 Desain & polesan visual
- [ ] H5 Seksi produk digital (opsional)
- [ ] H6 SEO & performa
- [ ] H7 Observability & konversi
- [ ] H8 QA & rilis

---

## 7. QA Gate (WAJIB tiap fase, sebelum commit)

```bash
npx tsc --noEmit      # bersih
npx eslint .          # bersih
npm run build         # sukses
# unit test terkait (bila menyentuh logika):
npm run test:metrics && npm run test:fulfillment && npm run test:downloads \
 && npm run test:expiry && npm run test:bundle && npm run test:stock \
 && npm run test:cart && npm run test:status && npm run test:reviews \
 && npm run test:audit && npm run test:leads && npm run test:report \
 && npm run test:loyalty && npm run test:wishlist
```
Plus uji manual (**mobile & desktop**): hero, anchor nav, semua CTA, form newsletter, a11y (keyboard + `prefers-reduced-motion`), cepat (LCP wajar).

> CI GitHub Actions (`.github/workflows/ci.yml`) otomatis menjalankan tsc+lint+test+build tiap push/PR → pastikan **hijau**.

---

## 8. Catatan Penting & Backlog Terkait
- **Logo OG image**: `src/app/opengraph-image.tsx` menggambar teks "LK" (belum pakai logo asli mark) — perbaiki bila sempat (ImageResponse tak bisa embed SVG mudah; bisa pakai file PNG mark).
- **Placeholder konten**: testimoni & stats. **Jangan** tampilkan yang palsu — sembunyikan atau isi asli.
- **Modul siap pakai** yang belum dipakai di beranda: `getSocialProof()` (bukti sosial), `getProducts()` (katalog), `ProductCard`.
- **Layanan hardcoded** (`src/lib/services.ts`) — bukan dikelola dashboard (sesuai keputusan §13 `docs/2026-10-02-upgrade-sistem-layanan.md`).
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
