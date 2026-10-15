# Task Selanjutnya — LKTech Website

> Dokumentasi ini mencatat pekerjaan yang **belum terselesaikan** & rencana lanjutan.
> Terakhir diperbarui: sesi **Optimasi Cache Firestore (unstable_cache + revalidateTag)**.
>
> 🗺️ **Arah pengembangan jangka menengah–panjang:** lihat **[`docs/2026-10-06-roadmap-pengembangan.md`](docs/2026-10-06-roadmap-pengembangan.md)** (peta tema: Konversi & Closing · Retensi · Kepercayaan & Skala · Operasional). Rekomendasi utama: **Pembayaran online (P0)** → **Ulasan & rating (P0)** → Retensi.
>
> 🔎 **Inisiatif SEO & Konten Mesin ✅ SELESAI (S0–S7, 2026-10-12):** **[`docs/2026-10-12-seo-konten-mesin.md`](docs/2026-10-12-seo-konten-mesin.md)** — sinyal teknis, structured data (FAQ/Breadcrumb/ItemList/LocalBusiness/SearchAction/Review), hub kategori/tag, programmatic SEO (40 halaman kota), panel Search Console. **Kode tuntas; langkah manual pemilik (verifikasi GSC + submit sitemap) ✅ SELESAI 2026-10-14 (lihat M1).**
>
> 💳 **Fase detail Konversi & Closing:** **[`docs/2026-10-06-fase-konversi-closing.md`](docs/2026-10-06-fase-konversi-closing.md)** — gateway **Mayar.id** (Headless API V2), fulfillment dua jalur (INSTAN download / JASA konfirmasi), bundling, urgency, abandoned checkout. **FASE P0–P6 selesai (kode; uji sandbox P0/P1 terverifikasi).**
> 🛠️ **Setup pembayaran & unduhan (langkah manual):** **[`docs/2026-10-06-setup-pembayaran-mayar.md`](docs/2026-10-06-setup-pembayaran-mayar.md)**.
>
> ⏰ **Cron otomatis ✅ AKTIF (2026-10-13):** 5 endpoint `/api/cron/*` kini dijadwalkan
> via **GitHub Actions** (`.github/workflows/cron.yml`, repo publik = gratis), bukan Vercel
> Cron (butuh plan Pro). `CRON_SECRET` terpasang di Vercel (Production) **dan** GitHub repo
> secret. Sekaligus memperbaiki bug: `wishlist-alerts` gagal 500 (`stock: undefined`).
> Lihat §"SESI INI — Cron Otomatis (A1)".
>
> 📱 **PWA ✅ SELESAI (kode, 2026-10-13):** `docs/2026-10-13-pwa.md` — manifest
> (`app/manifest.ts`), service worker vanilla (`public/sw.js`), halaman `/offline`,
> ikon installable. **Web Push ditunda** (butuh kunci VAPID).
>
> 📊 **Agregasi Harian Analitik ✅ SELESAI (kode, 2026-10-13):** `docs/2026-10-13-analytics-daily.md` — koleksi `analytics_daily/{yyyy-mm-dd}` + cron `/api/cron/analytics-daily` (tiap jam) + jalur baca cepat (fallback otomatis ke LIVE). Kill-switch `ANALYTICS_DAILY=off`.
>
> 🧪 **E2E Playwright ✅ SELESAI (kode + CI, 2026-10-13):** `docs/2026-10-13-e2e-playwright.md` — 16 smoke test halaman publik + aset/endpoint kunci, jalan di CI setelah build.
>
> 🔐 **Anti-enumeration kupon ✅ (KP-M4, 2026-10-13):** rate-limit per-IP + tolak cepat kode non-wajar + observability (kode disamarkan) di `/api/coupons/validate`.
>
> 📄 **Halaman Tentang Kami ✅ SELESAI (kode, 2026-10-14):** `docs/2026-10-14-halaman-tentang-kami.md` — rute `/tentang` (cerita, misi/visi, nilai, teknologi, statistik, CTA), konten statis `ABOUT` di `content.ts`, integrasi nav + sitemap + smoke E2E, JSON-LD `AboutPage`.
>
> 🧭 **Upgrade Navbar Bertingkat ✅ SELESAI (kode, 2026-10-14):** `docs/2026-10-14-upgrade-navbar-bertingkat.md` — menu terpusat `src/lib/nav.ts` (murni), dropdown desktop (hover + keyboard) & akordeon mobile, `NAV_LINKS` dihapus, bug "Semua Layanan" ganda diperbaiki, `layout.tsx` `/tentang` ditambahkan (sebelumnya tanpa navbar/footer). Test `test:nav-menu` (6) + E2E `e2e/nav.spec.ts`.
>
> 🚑 **Perbaikan Build Gagal ✅ SELESAI (kode, 2026-10-14):** `docs/2026-10-14-perbaikan-build-admin-prerender.md` — deploy gagal karena (1) `/admin` ikut di-prerender saat build → `force-dynamic` di layout dashboard, dan (2) `getSalesAnalytics()` membaca Firestore tanpa `try/catch` → kini fail-safe (`buildEmptyAnalytics`). Build kini sukses meski kuota Firestore habis.
>
> 🧊 **Optimasi Cache Firestore ✅ SELESAI (kode, 2026-10-14):** `docs/2026-10-14-optimasi-cache-firestore.md` — hemat kuota baca: `unstable_cache` untuk pembaca publik (`settings`/`content`/`articles`/`products`/`projects`/`promos`) + invalidasi `revalidateTag` di tiap mutasi admin; cache TTL singkat untuk analitik. Reader admin tetap segar (`read*`).
>
> 🎨 **Upgrade UI/UX Beranda (storytelling scroll + premium minimalis) 🚧 BERJALAN:** [`docs/2026-10-15-blueprint-upgrade-homepage-uiux.md`](docs/2026-10-15-blueprint-upgrade-homepage-uiux.md) — **F0–F4 selesai (kode)**: fondasi util (`useMediaQuery`/`ScrollProgress`/`PinnedSection`), hero upgrade, ritme/jahitan antar-section, **F3 pinned storytelling** (alur kerja di-pin, garis & langkah menyala mengikuti scroll), dan **F4 bento grid layanan** (banner unggulan + spotlight kursor). Berikutnya **F5 3D/WebGL (tablet+, konfirmasi dulu)** → F6 polish/QA. Konten beranda tidak dipangkas; `/tentang` tak berubah.
>
> 📋 **Tugas Manual Pemilik (pelacak hidup):** **[`TUGAS-MANUAL.md`](TUGAS-MANUAL.md)** — M1 GSC sitemap ✅ · M2 Mayar produksi · M3 domain+Resend · M4 env opsional · M5 backfill agregat ✅ · M6 Firestore rules. Centang saat beres.
>
> 🎯 **TASK AKTIF (berikutnya):** ⏭️ **Pilih inisiatif berikutnya.** (Halaman Tentang Kami · B4 agregasi harian · B5 E2E · B6 anti-enumeration kupon = ✅ selesai.) Kandidat sisa: **Multi-bahasa (ID/EN)** · **Web Push** (butuh VAPID) · **Webhook Resend** (butuh domain) · langkah manual pemilik (Mayar produksi, domain/Resend). Lihat §"STATUS & PETA SEKARANG".
> ✅ **SEO & Konten Mesin — FASE S7 (QA & rilis) SELESAI (2026-10-12):** gate penuh hijau (32 suite / **561 test** · build **125 halaman**); audit QA (canonical/robots/sitemap/JSON-LD/noindex/internal linking) bersih; temuan QA **near-duplicate halaman kota diperbaiki** (`serviceCityIntro` + `SERVICE_ANGLES` — paragraf pembuka unik per layanan×kota). Rilis commit+push. Lihat §13.
> ✅ **SEO & Konten Mesin — FASE S6 SELESAI (2026-10-12):** GA4 opsional + panel **Search Console** (`/admin/seo`), fail-safe. Test `test:search-console` (9). Lihat §11.
> ✅ **SEO & Konten Mesin — FASE S5 SELESAI (2026-10-12):** programmatic SEO `/layanan/[slug]/[kota]` — 40 halaman konten unik (anti-doorway). Test `test:locations`. Lihat §10.
> ✅ **SEO & Konten Mesin — FASE S4 SELESAI (2026-10-12):** hub `/blog/kategori` & `/blog/tag`; internal linking dua arah. Lihat §9.
> ✅ **SEO & Konten Mesin — FASE S3 SELESAI (2026-10-12):** `LocalBusiness` lengkap; `SearchAction`; Product review/priceValidUntil/sku; BlogPosting author Person. Lihat §8.
> ✅ **SEO & Konten Mesin — FASE S2 SELESAI (2026-10-12):** `structured-data-pure.ts` + `JsonLdScript`; FAQPage; BreadcrumbList; ItemList. Lihat §7.
> ✅ **SEO & Konten Mesin — FASE S1 SELESAI (2026-10-12):** canonical/noindex/ISR/sitemap/RSS. Lihat §6.
> **Sistem Pengaturan Super Proper & Terintegrasi ✅ SELESAI (S0–S9) + Polish P0–P3 ✅** — lihat [`docs/2026-10-11-perencanaan-pengaturan.md`](docs/2026-10-11-perencanaan-pengaturan.md).
> **Perbaikan & Upgrade Sistem Kupon (K0–K6) ✅ SELESAI (2026-10-11)** — audit 14 gap + remediasi. Lihat [`docs/2026-10-11-task-perbaikan-kupon.md`](docs/2026-10-11-task-perbaikan-kupon.md).
> **Upgrade Dashboard "Kelola Pesanan" (`/admin/orders`) ✅ SELESAI (fase O0–O8, 2026-10-11)** — lihat [`docs/2026-10-11-task-upgrade-dashboard-pesanan.md`](docs/2026-10-11-task-upgrade-dashboard-pesanan.md) §8 (hasil) & [`docs/2026-10-11-rekomendasi-upgrade-dashboard-pesanan.md`](docs/2026-10-11-rekomendasi-upgrade-dashboard-pesanan.md).
> 🩹 **Perbaikan menu pesanan ✅ SELESAI (G1–G23, 2026-10-11):** audit menemukan bug kritis (filter "butuh perhatian" tak berfungsi; hapus tunggal hilang) + 21 gap lain → semuanya diperbaiki. Lihat [`docs/2026-10-11-perbaikan-menu-pesanan.md`](docs/2026-10-11-perbaikan-menu-pesanan.md).
> 📧 **Perbaikan Newsletter & Broadcast ✅ SELESAI (P0, 2026-10-11):** tautan unsubscribe (newsletter & cart) rusak total karena mismatch HMAC → diperbaiki. Lihat [`docs/2026-10-11-perbaikan-newsletter-broadcast.md`](docs/2026-10-11-perbaikan-newsletter-broadcast.md).
> 📧 **Newsletter & Broadcast P1–P3 ✅ SELESAI (2026-10-11):** UI daftar pelanggan + ekspor, pratinjau/kirim-uji/estimasi penerima, riwayat broadcast, segmen akurat dari orders, header List-Unsubscribe. Lihat [`docs/2026-10-11-perbaikan-newsletter-broadcast-p1.md`](docs/2026-10-11-perbaikan-newsletter-broadcast-p1.md).
> 📄 **Audit sistem pesanan (pradasar):** **[`docs/2026-10-11-audit-sistem-pesanan.md`](docs/2026-10-11-audit-sistem-pesanan.md)** — ✅ Batch 1–4 selesai.
> ✅ **Upgrade Beranda (H0–H8):** `docs/2026-10-06-task-upgrade-beranda.md` + `docs/2026-10-06-upgrade-beranda.md`. **SELESAI.**

---

## ⏰ SESI INI — Optimasi Cache Firestore: Hemat Kuota Baca (`unstable_cache` + `revalidateTag`) — SELESAI (kode)

**Status: ✅ SELESAI.** Dokumen: [`docs/2026-10-14-optimasi-cache-firestore.md`](docs/2026-10-14-optimasi-cache-firestore.md).

Melanjutkan perbaikan build admin. Kuota baca Firestore (Spark: 50K/hari) boros karena pembaca publik dipanggil di SETIAP halaman (root layout) → saat build ≈72 halaman × (`settings`+`content`+koleksi) read.

- **`unstable_cache`** (model lama — proyek TIDAK memakai `cacheComponents`) untuk `getSiteSettings`, `getSiteContent`, `getArticles`, `getProducts`, `getProjects`, `listPublicPromos`.
- **`revalidateTag`** (WAJIB bentuk 2-argumen `{ expire: 0 }` di Next 16) di SEMUA route mutasi admin — `revalidatePath` saja TIDAK membatalkan data cache.
- Reader **mentah** (`readSiteSettings`/`readSiteContent`) untuk route GET admin agar selalu segar.
- Cache memori TTL 120s untuk `getSalesAnalytics` + invalidasi saat order berubah.
- Tag terpusat `src/lib/cache-tags.ts`; guard regresi `test:cache-wiring` (4).

**Gate:** `tsc` ✅ · lint ✅ · `test:cache-wiring` ✅ · `npm run build` ✅ (uji tanpa kredensial → 0 read).

---

## ⏰ SESI SEBELUMNYA — Perbaikan Build Gagal: `/admin` Ter-prerender + Query Firestore Tanpa Pengaman — SELESAI (kode)

**Status: ✅ SELESAI.** Dokumen: [`docs/2026-10-14-perbaikan-build-admin-prerender.md`](docs/2026-10-14-perbaikan-build-admin-prerender.md).

Deploy Vercel gagal (`8 RESOURCE_EXHAUSTED: Quota exceeded` saat build). **Dua akar masalah:**

- **`/admin` ikut di-prerender.** Dashboard auth-gated dicoba dijadikan statis →
  saat build Next menjalankan `BusinessHealth` (server) yang query Firestore.
  Perbaikan: `export const dynamic = "force-dynamic"` di
  `src/app/admin/(dashboard)/layout.tsx` (menutup seluruh area dashboard).
- **`getSalesAnalytics()` satu-satunya pembacaan Firestore TANPA `try/catch`.**
  Modul lain (`settings`, `site-content`, `articles`, `analytics-daily`) semua
  fail-safe. Perbaikan: helper `buildEmptyAnalytics()` + bungkus query `orders`
  dengan `try/catch` → kegagalan Firestore tak lagi menjatuhkan pemanggil.

**Bukti:** `npm run build` kini **sukses meski kuota habis**; `/admin` muncul
sebagai **ƒ Dynamic** (bukan static); tak ada lagi `Error occurred prerendering
page "/admin"`. Gate: `tsc` ✅ · `eslint` ✅.

---

## ⏰ SESI SEBELUMNYA — Upgrade Navbar Bertingkat (Dropdown & Akordeon) — SELESAI (kode)

**Status: ✅ SELESAI.** Dokumen: [`docs/2026-10-14-upgrade-navbar-bertingkat.md`](docs/2026-10-14-upgrade-navbar-bertingkat.md).

Melanjutkan pekerjaan navbar yang **terhenti di sesi sebelumnya** (belum di-commit).

- **Sumber menu terpusat** `src/lib/nav.ts` (murni): `buildNavMenu(isLanding, SERVICES)`
  + `isActiveHref()`. Navbar tak lagi memakai `NAV_LINKS` (dihapus dari `content.ts`).
- **Menu bertingkat:** `Layanan ▾` (dari `SERVICES`) & `Harga ▾` (Paket/Promo/FAQ).
  Baris desktop 9 → 7 item + CTA "Konsultasi".
- **Desktop:** dropdown via hover **& fokus** (keyboard-accessible),
  `aria-haspopup`/`aria-expanded`, panah berputar, rute aktif disorot.
- **Mobile:** akordeon (`grid-rows-[0fr]→[1fr]`) + `aria-expanded`.
- **Bug diperbaiki:** tautan **"Semua Layanan" ganda** di menu mobile (komponen
  menambah sendiri padahal sudah ada di `children`) → kini satu sumber saja.
- **`/tentang` dirapikan:** tambah `src/app/tentang/layout.tsx` (Navbar + Footer) —
  sebelumnya halaman Tentang **tanpa navbar/footer**.
- **Berkas baru:** `src/lib/nav.ts`, `scripts/nav-menu.test.ts` (**6** test),
  `e2e/nav.spec.ts` (smoke dropdown desktop + akordeon mobile), `src/app/tentang/layout.tsx`.
- **Berkas diubah:** `src/components/sections/navbar.tsx`, `src/lib/content.ts`
  (hapus `NAV_LINKS`), `package.json` (`test:nav-menu`), `tsconfig.json`,
  `.github/workflows/ci.yml` (jalankan `test:nav-menu`).
- **Gate:** `tsc` ✅ · `eslint` ✅ · `test:nav-menu` ✅ (6) · `build` (uji pemilik).

**Sisa manual (pemilik):** uji browser desktop (hover/Tab dropdown) & mobile (akordeon).

---

## ⏰ SESI SEBELUMNYA — Cron Otomatis (A1) — AKTIF & TERVERIFIKASI LIVE

**Status: ✅ SELESAI.** 5 endpoint cron yang sebelumnya mati (503) kini berjalan otomatis.

- **Akar masalah:** `CRON_SECRET` tak pernah diisi di Vercel → **semua** endpoint
  `/api/cron/*` fail-closed (503). Fitur yang sudah dibangun (kedaluwarsa order,
  pengingat keranjang, laporan mingguan, alert wishlist, revalidate blog) **diam-diam mati**.
- **Penjadwal:** `.github/workflows/cron.yml` — GitHub Actions (repo **publik** = gratis).
  Vercel Cron bawaan butuh plan Pro → dihindari. Satu workflow, tiap step digerbangi
  `github.event.schedule`; memakai header `Authorization: Bearer` (bukan query token).
  - `expire-orders` tiap jam · `articles` tiap jam (geser 15 mnt) ·
    `cart-reminders` tiap 3 jam · `wishlist-alerts` harian · `weekly-report` Senin 08:00 WIB.
  - Dukungan `workflow_dispatch` (target pilihan) untuk uji manual.
- **Secret:** `CRON_SECRET` diisi di Vercel (Production) **dan** GitHub repo secret
  (`gh secret set CRON_SECRET`). Keduanya harus sama.
- **Bug ditemukan & diperbaiki:** `wishlist-alerts` mengembalikan **500** saat dijalankan —
  `toProductState` menulis `stock: undefined` ke Firestore (ditolak). Kini `stock` hanya
  disertakan bila angka. Test `test:wishlist` 9 → **10**.
- **Bukti live (semua HTTP 200):**
  - `expire-orders` → `{ok:true, scanned:4, expired:4}` (membersihkan 4 order macet).
  - `articles` → `{ok:true, due:0, revalidated:3}`.
  - `cart-reminders` → `{ok:true, scanned:0}`.
  - `wishlist-alerts` → `{ok:true, productsScanned:7}`.
  - `weekly-report` → `{ok:true, email:{ok:true}, revenue:649000}` (email benar-benar terkirim).
  - Workflow GH Actions manual run → **success**.

**Commit:** `36c79c6` (workflow + `.nvmrc`) · `078186e` (fix wishlist).

**Sisa manual (pemilik):** tidak ada — jadwal berjalan otomatis. Simpan salinan
`CRON_SECRET` bila perlu memanggil endpoint manual.

---

## 📱 SESI INI — PWA (Installable, Cache, Offline) — Selesai (kode)

**Status: ✅ SELESAI.** Dokumen: [`docs/2026-10-13-pwa.md`](docs/2026-10-13-pwa.md). Tema 3.5 roadmap.

- **Manifest** `src/app/manifest.ts` — `name`, `short_name`, `start_url: "/"`,
  `display: "standalone"`, `theme_color`, ikon 192/512 + maskable, shortcuts (Produk/Kontak).
- **Service worker vanilla** `public/sw.js` (tanpa dependensi): precache terbatas;
  navigasi **network-first → cache → `/offline`**; aset statik **stale-while-revalidate**;
  **lewati** `/api`, `/admin`, `/unduhan`/`/keranjang`/`/akun`, non-GET.
- **Halaman `/offline`** statik (`noindex`) + tombol "Coba lagi" (klien) + link Produk.
- **Ikon** `public/icons/*` (dari logo) — URL stabil untuk manifest.
- **Registrasi** `src/components/pwa-register.tsx` (mount di root layout; produksi saja).
- **Konfig:** `next.config.ts` (`/sw.js` `no-store` + `Service-Worker-Allowed`),
  `robots.ts` (`disallow: /offline`), layout (`appleWebApp`).
- **Test baru** `test:pwa` (**7**) — versi cache sinkron, bentuk manifest, bypass, dll. Masuk CI.
- **Gate:** `tsc` ✅ · `eslint` ✅ · `test:pwa` ✅ · `build` ✅ (188 halaman; `/manifest.webmanifest` & `/offline` terdaftar).

**Web Push: DITUNDA** (butuh kunci VAPID + backend langganan). SW sudah jadi titik masuknya.

**Sisa manual (pemilik):** DevTools → Application (SW aktif, manifest installable); uji offline (matikan jaringan → `/offline`).

---

**Status: ✅ SELESAI (kode) — INISIATIF SEO & KONTEN MESIN (S0–S7) TUNTAS.** Dokumen: [`docs/2026-10-12-seo-konten-mesin.md`](docs/2026-10-12-seo-konten-mesin.md) §13.

- **Gate penuh:** `tsc` ✅ · `eslint` global ✅ · **32 suite / 561 test** ✅ · `build` ✅ **125 halaman**.
- **Audit QA** pada output build: robots, sitemap, canonical, JSON-LD, noindex, internal
  linking — semua bersih; tak ada halaman yatim.
- **Temuan QA diperbaiki:** halaman kota (5 layanan × 1 kota) semula berbagi
  `localContext` → risiko near-duplicate. Kini **paragraf pembuka unik per
  layanan×kota** via `serviceCityIntro()` + `SERVICE_ANGLES` (teruji).
- **Rilis:** commit + push (Vercel auto-deploy).

**Sisa (LANGKAH MANUAL pemilik):** verifikasi GSC + submit sitemap ✅ (M1, 2026-10-14);
(opsional) env GA4/GSC; pantau 2–4 minggu, validasi Rich Results Test.

**Inisiatif berikutnya (kandidat):** Multi-bahasa, Web Push (VAPID), Webhook Resend, langkah manual pemilik.
**✅ Selesai sesi ini:** agregasi harian analitik (`analytics_daily`), E2E Playwright + CI, anti-enumeration kupon (KP-M4).

---

## ✅ SESI SEBELUMNYA — SEO & Konten Mesin FASE S6 (SELESAI)

**Status: ✅ SELESAI (kode, S6).** Dokumen: [`docs/2026-10-12-seo-konten-mesin.md`](docs/2026-10-12-seo-konten-mesin.md) §11.

Observability & data (fail-safe, opsional).

- **GA4** — komponen `GoogleAnalytics` (aktif hanya bila `NEXT_PUBLIC_GA_ID` diisi).
- **Search Console API** — `src/lib/search-console.ts` (JWT RS256 manual via `node:crypto`,
  tanpa dependensi baru) + endpoint **`/api/admin/seo`**.
- **Panel `/admin/seo`** — rentang 7/28/90 hari, ringkasan klik/impresi/CTR, tabel query &
  halaman teratas. Bila belum dikonfigurasi → **panduan setup** (bukan error).
- **Menu "SEO"** di grup utama admin (dekat Analitik).
- **`.env.example`** — `NEXT_PUBLIC_GA_ID`, `GSC_SERVICE_ACCOUNT`, `GSC_SITE_URL`.
- **Test** `test:search-console` (**9**).

**Verifikasi:** GA4 tak render tanpa env (fail-safe); `/admin/seo` & `/api/admin/seo` terdaftar.

**Gate:** `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ · `build` ✅ (124 halaman).

**Sisa:** fase **S7** (QA & rilis).

---

## ✅ SESI SEBELUMNYA — SEO & Konten Mesin FASE S5 (SELESAI)

**Status: ✅ SELESAI (kode, S5).** Dokumen: [`docs/2026-10-12-seo-konten-mesin.md`](docs/2026-10-12-seo-konten-mesin.md) §10.

Programmatic SEO — layanan × kota (anti-doorway).

- **Route baru `/layanan/[slug]/[kota]`** — 8 kota terkurasi × 5 layanan = **40 halaman**.
- **Data kota terkurasi `src/lib/locations.ts`** dengan konten UNIK per kota
  (`localContext`, `industries`, `whyLocal`, `localFaqs`) — bukan template ganti nama.
- **Guard kualitas teruji** (`test:locations`): konten wajib terisi & **tak duplikat**;
  `dynamicParams=false` → kombinasi tak dikenal = 404 (tak jadi halaman tipis).
- **SEO**: `generateMetadata` unik, JSON-LD `Service`+`Breadcrumb`+`FAQPage` lokal,
  internal linking (kota↔layanan↔kota sekitar), masuk sitemap (prioritas 0.6).
- **`build` 81 → 124 halaman.**

**Verifikasi nyata:** 40 file HTML kota ter-generate dengan JSON-LD & konten unik.

**Gate:** `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ · `build` ✅ (124 halaman).

**Sisa:** fase **S6** (GSC/GA4) & **S7** (QA).

---

## ✅ SESI SEBELUMNYA — SEO & Konten Mesin FASE S4 (SELESAI)

**Status: ✅ SELESAI (kode, S4).** Dokumen: [`docs/2026-10-12-seo-konten-mesin.md`](docs/2026-10-12-seo-konten-mesin.md) §9.

Internal linking & hub.

- **Hub baru `/blog/kategori`** (indeks semua kategori + jumlah artikel) & **`/blog/tag`**
  (indeks semua tag + jumlah) — `CollectionPage` + `ItemList` + `BreadcrumbList`, masuk
  sitemap, **Static**.
- **Internal linking dua arah**: `/layanan/[slug]` dapat section **"Artikel terkait"**
  (dari kategori terpetakan); `/blog` menaut ke hub kategori/tag.
- **Fix bug** `CATEGORY_SERVICE["Teknologi"]` (`pengembangan-aplikasi` → `aplikasi-mobile`)
  + helper baru `categoriesForService()`.
- **Test** `test:blog` 174→**175**.

**Verifikasi nyata:** HTML build memuat `CollectionPage`/`ItemList`/`Breadcrumb` (hub) &
"Artikel terkait" (layanan).

**Gate:** `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ · `build` ✅ (81 halaman).

**Sisa:** fase **S5–S7**.

---

## ✅ SESI SEBELUMNYA — SEO & Konten Mesin FASE S3 (SELESAI)

**Status: ✅ SELESAI (kode, S3).** Dokumen: [`docs/2026-10-12-seo-konten-mesin.md`](docs/2026-10-12-seo-konten-mesin.md) §8.

Structured data lanjutan.

- **`LocalBusiness`/`ProfessionalService`** globe lengkap: `geo`, `openingHoursSpecification`
  (Sen–Jum 09–17, Sab 09–13), `priceRange`, `contactPoint`, `hasMap`, `sameAs` (social).
- **`WebSite` + `SearchAction`** (sitelinks searchbox → `/blog?q=`).
- **`Product`**: `review` (dari ulasan `approved`), `priceValidUntil`, `sku`.
- **`BlogPosting`**: `author` Person + `publisher` logo + `mainEntityOfPage` WebPage.
- **DRY**: koordinat peta dipindah ke `site.ts` (`BUSINESS_GEO`) — dipakai kontak & JSON-LD.
- **Helper murni baru** di `structured-data-pure.ts`: `buildReviewNodes`,
  `buildOpeningHours`, `buildSearchAction`, `buildSameAs`, `priceValidUntil`.
- **Test** `test:seo-schema` 8→**15**.

**Verifikasi nyata:** HTML build memuat `SearchAction`, `OpeningHoursSpecification`,
`GeoCoordinates`, `hasMap`, `priceRange` (global); `priceValidUntil`/`sku`/`Offer` (produk).

**Gate:** `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ · `build` ✅ (81 halaman).

**Sisa:** fase **S4–S7**.

---

## ✅ SESI SEBELUMNYA — SEO & Konten Mesin FASE S2 (SELESAI)

**Status: ✅ SELESAI (kode, S2).** Dokumen: [`docs/2026-10-12-seo-konten-mesin.md`](docs/2026-10-12-seo-konten-mesin.md) §7.

Structured data: FAQ & Breadcrumb.

- **Modul murni `structured-data-pure.ts`** — `buildFaqPage` / `buildBreadcrumb` /
  `buildItemList` (strip HTML, skip entri kosong, `null` bila tak cukup).
- **Komponen `JsonLdScript`** — render satu/array node JSON-LD.
- **R2 — `FAQPage`** di beranda (`FAQS`), `/harga` (`PRICING_FAQS`), `/layanan` (list),
  `/layanan/[slug]` (`detail.faqs`).
- **R5 — `BreadcrumbList`** di `/layanan`, `/layanan/[slug]`, `/produk`,
  `/produk/[slug]`, `/portofolio`, `/kontak`, `/blog` (sisanya sudah ada).
- **Bonus** — `ItemList` di `/produk` & `/portofolio`; `Product.sku`; `Service`
  `hasOfferCatalog` (dari paket layanan).
- **Test** `test:seo-schema` (**8**).

**Verifikasi nyata:** HTML build memuat `FAQPage` (beranda/harga/layanan) &
`BreadcrumbList`/`OfferCatalog` sesuai halaman.

**Gate:** `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ · `build` ✅ (81 halaman).

**Sisa:** fase **S3–S7**.

---

## ✅ SESI SEBELUMNYA — SEO & Konten Mesin FASE S1 (SELESAI)

**Status: ✅ SELESAI (kode, S1).** Dokumen: [`docs/2026-10-12-seo-konten-mesin.md`](docs/2026-10-12-seo-konten-mesin.md) §6.

Perbaikan sinyal teknis SEO (dari audit riset):

- **R1 (kritis) — canonical root bocor.** `layout.tsx` tak lagi menetapkan
  `alternates.canonical: "/"` global (yang bocor ke halaman tanpa canonical). Setiap
  halaman publik sudah punya canonical absolut sendiri (diverifikasi).
- **R3 (kritis) — jalur not-found tanpa noindex.** `robots: noindex` ditambah pada
  not-found: layanan/[slug], produk/[slug], blog/[slug], blog/kategori/[category],
  blog/tag/[tag], portofolio/[slug].
- **R4 (kritis) — `/promo` tanpa cache.** `force-dynamic` → `revalidate = 120` (ISR).
  Build: `/promo` kini **Static (2m)**, bukan dynamic.
- **R8 — metadata duplikat** `produk/layout.tsx` dihapus.
- **R10 — `lastModified` sitemap** tak lagi `now`; pakai `SEO_CONTENT_UPDATED` (stabil).
- **R11 — RSS alternate global** di root layout.

**Gate:** `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ · `build` ✅ (81 halaman).

**Sisa:** fase **S2–S7** (FAQ/Breadcrumb schema → structured data lanjutan → internal
linking/hub → programmatic → GSC/GA4 → QA).

---

## ✅ SESI SEBELUMNYA — Polish Sistem Pengaturan FASE P0–P3 (SELESAI)

**Status: ✅ SELESAI (kode, P0/P1/P2/P3).** Dokumen: [`docs/2026-10-11-polish-pengaturan-gap.md`](docs/2026-10-11-polish-pengaturan-gap.md) §6–§9.

**Fase P3** (konsistensi, a11y, dedup) — sesi ini:
- **G20** — satu sumber sub-menu `SETTINGS_NAV`; `admin-nav.ts` membangun `children` darinya.
- **G21** — deskripsi nav "Keamanan" diluruskan.
- **G22** — label kartu ringkasan = judul halaman.
- **G23** — komponen form bersama **`settings-form-ui.tsx`** (`FormErrorBanner`, `SaveRow`, `fieldClass`, `Field`, `FormSection`).
- **G24** — overview: error state + tombol "Coba lagi" (bukan "memuat…" palsu).
- **G26** — slug tak dikenal → `notFound()`.
- **G27** — a11y: `sr-only`, `aria-label` per layanan, `aria-live`, **focus-trap `ConfirmDialog`**.
- **G28** — tombol uji disabled bila belum terkonfigurasi; cron/download/webhook sbg baris status.
- **G29** — backup dua tahap (pratinjau → dialog konfirmasi; tak bersamaan).
- **G30** — `/maintenance`: metadata dinamis, dimensi `<img>`, label "WIB".

**Fase P2**: G8 banner error + disable Simpan saat gagal load · G9 disable Simpan saat tak dirty · G10 `datetime-local` benar · G11 validasi klien per-field · G12 label sosial · G13 satu sumber status email · G14 target sentuh ≥44px · G25 info sistem nyata.
**Fase P1**: G6 gate admin server-side · G15 sumber tunggal "dibayar" · G16 `clampDays` · G17 `isDbAdmin` default-closed · G18 rate-limit ekspor · G19 validasi domain URL.
**Fase P0**: G1 SEO berdampak · G2/G3 backup aman · G4 batas+snapshot+dry-run · G5 email terverifikasi · G7 maintenance tak basi.

**Test baru/diperluas:** `test:backup` 8→**16**, `test:payment` 5→**8**, `test:seo` **4**, `test:trusted-url` **6**, `test:settings-form` **10**.
**Gate:** `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ · `build` ✅ (81 halaman).

**Sisa:** fase **P4** (QA & rilis) — uji browser manual, dokumentasi, commit.
**Sisa manual:** uji browser (form validasi, ETA tak bergeser, banner gagal-load, cookie ngawur, metrik bayar, rate-limit ekspor, dialog backup, Tab terperangkap, maintenance dinamis).

---

## 📝 SESI SEBELUMNYA — Audit Polish Sistem Pengaturan (Catatan Gap)

**Status: 📝 CATATAN GAP.** Dokumen: [`docs/2026-10-11-polish-pengaturan-gap.md`](docs/2026-10-11-polish-pengaturan-gap.md).

Audit menyeluruh (UI + backend) atas sistem Pengaturan menemukan **~30 gap**
(7 kritis, 12 sedang, 11 rendah). **Temuan terverifikasi** (baca kode + grep).
7 kritis: G1 SEO tak berpengaruh · G2/G3 restore backup admin berbahaya · G4 restore
destruktif tanpa batas · G5 `email_verified` tak dicek · G6 gate proxy lemah · G7
maintenance basi. Rencana fase **P0–P4** ada di dokumen. (P0 kini selesai ✅.)

---

## ✅ SESI SEBELUMNYA — Sistem Pengaturan Super Proper & Terintegrasi (S0–S9, SELESAI)

**Status: ✅ SELESAI (kode).** Dokumen: [`docs/2026-10-11-perencanaan-pengaturan.md`](docs/2026-10-11-perencanaan-pengaturan.md).

Menu **Pengaturan** di-upgrade dari **satu halaman** → **pusat pengaturan ber-submenu**
(accordion generik di sidebar), 9 halaman (induk ringkasan + 8 anak), semuanya berfungsi
nyata & terintegrasi.

- **S1 — Submenu generik:** `AdminNavItem.children` + logika murni `admin-nav-pure`
  + hook `use-nav-accordion` + `sidebar-accordion-item` (accordion expanded, popover rail,
  auto-buka, a11y); command palette & judul header ikut mencakup anak.
- **S2 — Kerangka:** `SettingsShell` + `settings-nav` + 9 route (`/admin/settings/*`).
- **S3 — Kontak & Identitas + Notifikasi:** migrasi + brand/tagline + uji kirim email.
- **S4 — Keamanan & Akses + Kelola Admin:** koleksi `admins`, `requireAdmin` (env OR DB),
  `requireOwner`, API `/api/admin/admins` + audit; **OWNER `lupyariestaa@gmail.com` abadi**.
- **S5 — Integrasi + Pembayaran:** `/api/admin/integrations` (+ `…/test` **PING** Mayar/
  Cloudinary/Upstash; Resend uji email); metrik Mayar (`/api/admin/payments/metrics`).
- **S6 — SEO + Maintenance + Lanjutan:** meta default & Search Console; **mode pemeliharaan
  + halaman publik `/maintenance`** (via `proxy.ts`); bersihkan cache; info sistem.
- **S7 — Backup & Restore (pilih data):** ekspor/impor per-sumber, validasi murni, audit.
- **S8 — Ringkasan induk** + audit.
- **S9 — QA & rilis.**
- **Test baru:** `test:nav` (8), `test:backup` (8), `test:payment` (5).
- **Gate:** `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ (**496** test) · `build` ✅.

**Sisa manual:** publish ulang Firestore Rules (koleksi `admins`); uji browser (submenu,
kelola admin, PING integrasi, backup, maintenance).

---

## 📝 SESI SEBELUMNYA — Perencanaan Sistem Pengaturan Super Proper

---

## ✅ SESI SEBELUMNYA — Upgrade UI/UX Form Kupon (Halaman Khusus)

---

## ✅ SESI SEBELUMNYA — Upgrade UI/UX Form Kupon (Halaman Khusus)

**Status: ✅ SELESAI (kode).** Dokumen: [`docs/2026-10-11-upgrade-ui-dialog-kupon.md`](docs/2026-10-11-upgrade-ui-dialog-kupon.md).

Buat/edit kupon kini memakai **halaman khusus** (bukan popup), sesuai permintaan
pemilik — pola seperti halaman form portfolio.

- **Route baru:** `/admin/coupons/new` (buat) & `/admin/coupons/[id]/edit` (edit);
  komponen `coupon-form.tsx` (halaman penuh).
- **UI:** 2 kolom (form + pratinjau live), header berikon, section bergrup
  (Dasar · Diskon & Syarat · Batas & Kuota · Jadwal · Penargetan/Bundel lanjutan),
  editor tier dinamis (`tiered`), opsi lanjutan kolaps, footer ringkasan.
- **Navigasi:** tombol "Buat Kupon" → `/admin/coupons/new`; tombol Edit (kartu &
  halaman detail) → `/admin/coupons/[id]/edit`.
- **Backend:** schema & `toInput` menerima field C1 (`tiered`, kampanye, audience,
  single-use, email khusus, kuota harian, stackable).
- **Gate:** `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ (**475** test) · `build` ✅
  (route `/admin/coupons/new` & `/admin/coupons/[id]/edit` terdaftar).

**Sisa manual:** uji browser halaman form (semua tipe & opsi lanjutan).

---

## ✅ SESI SEBELUMNYA — Upgrade UI/UX Dialog Kupon (Proper)

---

## ✅ SESI SEBELUMNYA — Upgrade Sistem Kupon: C9 (Refactor, a11y, QA & Rilis)

**Status: ✅ SELESAI (kode) — C0–C9.** Dokumen: [`docs/2026-10-11-upgrade-sistem-kupon.md`](docs/2026-10-11-upgrade-sistem-kupon.md).

**C9 = refactor UI + a11y + QA + rilis (fase terakhir).**

- **Refactor** `coupons-manager.tsx` (**1143 → 297 baris**) → `admin/coupons/*`:
  `coupons-toolbar`, `coupon-card`, `coupon-form-dialog`, `coupon-batch-dialog`,
  `campaign-summary`, `datetime` (helper bersama).
- a11y: aria-label ikon menyertakan kode kupon; input cari ber-`aria-label`;
  target ikon 36px; refresh ber-state.
- QA regresi + dokumentasi + rilis.
- **Gate:** `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ (**468** test) · `build` ✅.

**Inisiatif Upgrade Sistem Kupon (C0–C9) TUNTAS.** Ringkas: tiered · single-use/
personal · audience · kuota harian · kupon otomatis (best coupon) · generate massal
& duplikat · halaman detail + timeline + riwayat pemakai · analitik (konversi/AOV/
ROI/tren/kampanye) · `/promo` dinamis · filter & analitik kampanye · refactor UI.

**Sisa manual:** publish ulang Firestore Rules + index (`firestore.indexes.json`);
uji browser alur kupon.

---

## 🔄 SESI SEBELUMNYA — Upgrade Sistem Kupon: C8 (Kampanye & Skala)

---

## 🔄 SESI SEBELUMNYA — Upgrade Sistem Kupon: C7 (`/promo` Dinamis)

---

## 🔄 SESI SEBELUMNYA — Upgrade Sistem Kupon: C4 (Generate Massal & Duplikat)

---

## 🔄 SESI SEBELUMNYA — Upgrade Sistem Kupon: C6 (Analitik Kupon)

---

## 🔄 SESI SEBELUMNYA — Upgrade Sistem Kupon: C5 (Halaman Detail)

---

## 🔄 SESI SEBELUMNYA — Upgrade Sistem Kupon: C3 (Kupon Otomatis)

---

## 🔄 SESI SEBELUMNYA — Upgrade Sistem Kupon: C2 (Aturan Server)

---

## 📝 SESI SEBELUMNYA — Upgrade Sistem Kupon: C1 (Fondasi Murni & Tipe)

---

## 📝 SESI SEBELUMNYA — Upgrade Sistem Kupon: C0 (Keputusan Terkunci)

---

## 📝 SESI SEBELUMNYA — Rencana Upgrade Sistem Kupon (C0–C9)

---

## ✅ SESI SEBELUMNYA — Perbaikan & Upgrade Sistem Kupon (K0–K6, SELESAI)

**Status: ✅ SELESAI (kode).** Dokumen: [`docs/2026-10-11-task-perbaikan-kupon.md`](docs/2026-10-11-task-perbaikan-kupon.md).

Audit mandiri sistem kupon menemukan **14 gap** (1 kritis, 4 tinggi, 4 sedang,
4 rendah); **semuanya diperbaiki** dalam fase K1–K6.

- **K1 — logika murni + test:** modul `src/lib/coupon-pure.ts`
  (`computeDiscount`, `validateCoupon`, `checkBundleRules`, `validateCouponForm`,
  `aggregateCouponStats`); `coupon-rules.ts` dihapus.
- **K2 — UX kupon keranjang (K1 kritis):** `couponNotice` khusus (terpisah dari error
  checkout); `CouponSessionError` bedakan sesi hilang vs jaringan; re-validasi cerdas
  (pertahankan bila jaringan, cabut bila sesi hilang/tak valid); logout memicu cek; a11y.
- **K3 — form admin:** `validateCouponForm` murni + error per-field; **`limitPerUser` boleh 0**
  (tanpa batas); `aria-invalid`/`aria-describedby`/`role="alert"`; dialog focus-trap + `data-autofocus`.
- **K4 — preview & statistik:** `/api/coupons/validate` sertakan `userUsageCount`;
  statistik **`activeOrders`** + tooltip + kolom CSV "Order Aktif".
- **K5 — kebersihan:** hapus kode mati `couponValueLabel`; seragamkan **`checkRateLimit`**
  (async/Upstash-ready) di 7 endpoint; normalisasi `couponCode` via `.transform()`.
- **K6 — QA & rilis:** audit akhir (tak ada sisa kode mati; `CouponStat` satu sumber) + dokumentasi.
- **Test baru:** `test:coupon` (**40**), `test:order-schema` (**5**).
- **Gate:** `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ (**410** test) · `build` ✅.

**Sisa manual:** uji browser alur kupon (keranjang & `/promo`) + dashboard admin.

---

## 📝 SESI SEBELUMNYA — Audit Sistem Kupon → Flow Task

**Status: 📝 RENCANA.** Dokumen: [`docs/2026-10-11-task-perbaikan-kupon.md`](docs/2026-10-11-task-perbaikan-kupon.md).

Audit mandiri sistem kupon (data layer, API, UI admin, keranjang, halaman `/promo`)
menemukan **14 gap** (1 kritis, 4 tinggi, 4 sedang, 4 rendah). **Belum ada kode yang diubah.**

Ringkas temuan:
- **K1 (kritis):** kupon tetap "terpasang" (diskon basi) setelah logout/token hilang
  — re-validasi `catch {}` menelan error (`cart-view.tsx:75-107`).
- **K2 (tinggi):** feedback "kupon dicabut" ditaruh di state `error` checkout global
  → salah tempat & mudah tertimpa (`cart-view.tsx:93-95`).
- **K3 (tinggi):** preview `/api/coupons/validate` tak kirim `userUsageCount` →
  bisa salah utk `limitPerUser` pada user banyak.
- **K4 (tinggi):** validasi form admin minim (hanya kode ≥ 3).
- **K5 (tinggi):** logika inti (`computeDiscount`/`validateCoupon`) **tak teruji**.
- **K6–K9 (sedang):** `limitPerUser` tak bisa 0; a11y keranjang; dialog tanpa
  focus-trap; statistik membingungkan (orderCount mencakup dibatalkan).
- **K10–K13 (rendah):** kode mati (`couponValueLabel`), inkonsistensi rate-limit,
  `aria-invalid`/`aria-describedby` absen, normalisasi kode tak di schema.

**Flow task:** fase **K0 (selesai: audit) → K1 (logika murni + test) → K2 (UX
keranjang) → K3 (form admin + a11y) → K4 (preview + statistik) → K5 (kebersihan)
→ K6 (QA & rilis)**.

**Catatan:** klaim "description tidak bisa di-clear" **dibantah** (schema `.optional()`
menerima string kosong).

**Tidak ada perubahan kode** — sesi ini hanya audit & perencanaan.

---

## ✅ SESI SEBELUMNYA — Perbaikan Newsletter & Broadcast P1–P3 (SELESAI)

**Status: ✅ SELESAI (P1–P3, kode).** Dokumen: [`docs/2026-10-11-perbaikan-newsletter-broadcast-p1.md`](docs/2026-10-11-perbaikan-newsletter-broadcast-p1.md).

Melanjutkan P0 (bug unsubscribe). Menuntaskan sisa gap:

- **F-N3** — UI **daftar pelanggan** (cari, filter status, ekspor CSV).
- **F-N5** — **pratinjau** email + **kirim uji** + **estimasi penerima** per segmen.
- **F-N4** — `segmentCounts` kini lengkap (semua/beli/belum) & dipakai UI; GET satu pemuatan.
- **F-N6** — header `List-Unsubscribe` + `List-Unsubscribe-Post` di email broadcast.
- **F-N8** — **riwayat broadcast** (`broadcasts/{id}`) + aksi audit baru `broadcast.send`.
- **F-N9** — segmen "pernah beli" dari koleksi `orders` (bukan `orderCount`).
- **F-N7** — batas kirim per-batch (200) + flag `truncated` (anti-timeout).
- **F-N10/N11** — `unsubscribedAtISO` ikut dinormalisasi; re-subscribe aman (createdAt asli dipertahankan).
- **Berkas baru:** `src/lib/newsletter-pure.ts`, `src/lib/broadcast-log.ts`,
  komponen `admin/broadcast/*` (composer, subscribers-panel, history),
  `scripts/newsletter-pure.test.ts`.
- **Gate:** `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ (**365** test) · `build` ✅.

**Sisa manual:** publish ulang Firestore Rules (koleksi `broadcasts`); uji browser (daftar, pratinjau, kirim uji, kirim, riwayat).

---

## ✅ SESI SEBELUMNYA — Perbaikan Newsletter & Broadcast (P0, SELESAI)

**Status: ✅ SELESAI (P0, kode).** Dokumen: [`docs/2026-10-11-perbaikan-newsletter-broadcast.md`](docs/2026-10-11-perbaikan-newsletter-broadcast.md).

Audit sistem Newsletter & Broadcast menemukan **bug kritis**: tautan
"Berhenti berlangganan" (newsletter) **&** "Berhenti diingatkan" (pengingat
keranjang) **selalu ditolak** karena mismatch tanda tangan HMAC
(penandatangan pakai tokenId ber-prefix, verifikasi pakai id mentah).

- **F-N1** — unsubscribe newsletter rusak 100% → verifikasi kini memakai
  `verifyNewsletterUnsubToken` (tokenId ber-prefix sama).
- **F-N2** — unsubscribe cart rusak 100% (bug identik) → `verifyCartUnsub`.
- **Berkas baru:** `src/lib/unsubscribe-token.ts` (murni) +
  `scripts/unsubscribe-token.test.ts` (10 test).
- **Kompatibilitas:** tanda tangan tak berubah — hanya verifikasi diperbaiki →
  **tautan lama tetap valid** (tanpa migrasi).
- **Gate:** `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ (**354** test) · `build` ✅.

**Sisa P1+ (belum):** UI daftar subscriber, pratinjau/kirim-uji, perbaikan
`segmentCounts` cacat, header `List-Unsubscribe`, riwayat broadcast, akurasi
segmen "pernah beli", ketahanan pengiriman.

**Sisa manual:** uji klik tautan unsubscribe dari email broadcast & pengingat keranjang → harus 200.

---

## ✅ SESI SEBELUMNYA — Perbaikan Menu "Kelola Pesanan" (G1–G23, SELESAI)

**Status: ✅ SELESAI (kode).** Dokumen: [`docs/2026-10-11-perbaikan-menu-pesanan.md`](docs/2026-10-11-perbaikan-menu-pesanan.md).

Audit menyeluruh atas `/admin/orders` menemukan 23 gap; semuanya diperbaiki.

- **G1 (Kritis) — filter "butuh perhatian" tak pernah berfungsi:** klien menulis
  `attention=1` → server menganggapnya mode ringkasan & `return` objek (bukan daftar).
  Kini filter memakai `attentionFilter=1` (baru); `?attention=1` tetap mode ringkasan.
- **G2 (Kritis) — aksi Hapus tunggal hilang:** tombol **Hapus** ditambahkan di
  `OrderActionsBar` (dialog & halaman detail) + `ConfirmDialog`.
- **G3** — bulk ubah status kini kirim email + catat timeline (samakan dgn tunggal).
- **G4** — tombol Ekspor (tanpa seleksi) mengekspor **seluruh hasil filter** (endpoint `?export=1`), bukan hanya halaman.
- **G5/G6** — dialog detail & timeline menyegarkan diri setelah aksi.
- **G7** — `listOrderEmails` pakai `orderBy("atISO","desc")`.
- **G8** — bulk resend via server (`op:"resend"`, atomik + audit + `skipped`).
- **G9** — bulk delete hapus dulu → restore kuota (cegah kebocoran kuota).
- **G10** — pencarian di-debounce 300ms.
- **G11** — chip panel attention memfilter alasan spesifik.
- **G12** — dropdown status bulk hanya transisi valid.
- **G13** — transisi ke status final minta konfirmasi.
- **G14** — "Reset filter" mengosongkan pencarian.
- **G15** — bedakan "gagal memuat" vs "kosong" (email & timeline).
- **G16** — hitungan `attempt` resend diperbaiki.
- **G17/G18** — label status seragam; warna `diproses`/`selesai` dibedakan.
- **G19** — focus-trap dialog + baris tabel keyboard + aria dropdown bulk.
- **G20–G23** — chip attention ringkas, `FulfillmentChip` nama variabel benar,
  `OrderStatusBadge` fallback, kartu tanpa tombol duplikat.
- **Berkas baru (test):** test `test:orders` naik 22 → **24** (regresi F-G1).
- **Gate:** `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ · `build` ✅ (72 halaman).

**Sisa manual:** uji browser desktop/mobile (filter attention, hapus single, bulk, ekspor, refresh dialog, konfirmasi status final).

---

## ✅ SESI SEBELUMNYA — Upgrade Dashboard "Kelola Pesanan" (O0–O8, SELESAI)

**Status: ✅ SELESAI (kode).** Task: [`docs/2026-10-11-task-upgrade-dashboard-pesanan.md`](docs/2026-10-11-task-upgrade-dashboard-pesanan.md) §8.

- **O1/O2** — tabel proper + toggle kartu, sortir (tanggal/total/status), filter lanjutan (tanggal/fulfillment/pembayaran/kupon/nominal), filter tersinkron URL.
- **O3** — pencarian server-side (kode/email/nama).
- **O4** — aksi massal (ubah status/ekspor/hapus/resend, maks 50).
- **O5** — panel "butuh perhatian" + kartu ringkasan klik-filter.
- **O6** — halaman detail `/admin/orders/[id]` (dua kolom) + timeline aktivitas/catatan internal.
- **O7** — paginasi bernomor + ekspor mengikuti filter.
- **O8** — komponen terpecah di `src/components/admin/orders/*`, a11y, QA.
- **Berkas baru:** `src/lib/orders-filter-pure.ts` (+ test 22), `src/lib/order-activities.ts`, komponen `admin/orders/*`, `admin/order-timeline.tsx`, route `orders/[id]` + `orders/[id]/activities`.
- **Gate:** `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ · `build` ✅ (72 halaman).

**Sisa manual:** uji browser desktop/mobile.

---

## ⏭️ SESI BERIKUTNYA — (belum ditentukan)

**Status: ⏭️ Pilih inisiatif berikutnya.** Daftar kandidat: §"STATUS & PETA SEKARANG" di bawah / `docs/2026-10-06-roadmap-pengembangan.md`.

---

## Sesi Terakhir — ❌ HAPUS TOTAL SISTEM POIN / LOYALITAS (cukup kupon/voucher)

**Keputusan pemilik (2026-10-11):** LKTech **tidak memakai sistem poin/loyalitas** — cukup **sistem kupon/voucher** yang sudah mandiri. Seluruh sistem poin (ledger `users/{uid}/points`, saldo/lifetime, tier Bronze/Silver/Gold, perolehan poin dari order & ulasan, tukar poin → kupon, tab "Poin" di `/akun`) **dihapus**.

Analisis dampak + alur: [`docs/2026-10-11-task-hapus-sistem-poin.md`](docs/2026-10-11-task-hapus-sistem-poin.md).

Yang dihapus/diubah:
- **Dihapus (file):** `src/lib/loyalty-pure.ts`, `src/lib/loyalty.ts`, `src/lib/loyalty-api.ts`, `src/components/auth/account-points.tsx`, `src/app/api/user/points/route.ts`, `scripts/loyalty.test.ts`.
- **Diubah (file bersama, hanya bagian poin):** `src/app/api/webhooks/mayar/route.ts` (lepas `awardOrderPoints`), `src/app/api/admin/reviews/route.ts` (lepas `awardReviewPoints`), `src/components/auth/user-account.tsx` (lepas panel Poin), `src/components/auth/account-tabs.tsx` (lepas tab "poin"), `src/components/auth/login-steps-carousel.tsx` (step "Poin & kupon" → "Kupon & promo"), `src/lib/user-types.ts` + `src/lib/user-profile.ts` (lepas field `points`/`pointsLifetime`), `package.json` (lepas `test:loyalty`), `firestore.rules` (komentar).

**Dampak disadari:** portal `/akun` tanpa tab "Poin"; perolehan poin otomatis (order & ulasan) berhenti; tukar poin → kupon hilang. **Kupon, checkout, order, pembayaran, unduhan, ulasan produk, analitik TETAP UTUH** (tidak bergantung pada poin).

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · semua `test:*` ✅ · `npm run build` ✅.

**Lanjut (pemilik, opsional):** bersihkan data Firestore subkoleksi `users/{uid}/points/*` & field `points`/`pointsLifetime` (tidak wajib untuk kode).

---## ✅ Sesi Terakhir — Hapus Total Sistem Testimoni (Taman v1/v2 + Testimoni Lama)

**Keputusan pemilik (2026-10-10):** setelah meninjau Taman v2, pemilik **tidak menyukai** hasilnya dan memutuskan **menghapus total sistem testimoni** dari LKTech — **(A) Taman Testimoni** (pixel/Phaser v1 & v2), **(B) Testimoni lama** (avatar Hero + tab admin konten), dan **(C) `ProjectTestimonial`** (kutipan di halaman proyek portofolio). **LKTech kini tidak punya testimoni apa pun.**

Analisis dampak + alur: [`docs/2026-10-10-task-hapus-sistem-testimoni.md`](docs/2026-10-10-task-hapus-sistem-testimoni.md).

Yang dihapus/diubah:
- **Dihapus:** seluruh route `/taman/*`, `/api/taman/*`, `/api/admin/taman/*`, `/admin/(dashboard)/taman/*`; komponen `src/components/taman/*`, `admin/taman-*`, `auth/account-taman`; lib `taman-types/logic/store/world/consent`; aset `public/taman/*`; script `gen-taman-*` + `taman*.mjs` + `taman.test.ts`; dokumen Taman; dependensi **Phaser**.
- **Diubah (file bersama, hanya bagian testimoni):** `src/app/page.tsx` (lepas TamanSection/TamanSchema), `user-account.tsx` + `account-tabs.tsx` (lepas tab "Testimoni saya"), `reviews-manager.tsx` (lepas tombol "Angkat jadi testimoni"), `admin-nav.ts` (lepas menu), `hero.tsx` (lepas avatar testimoni), `content-extra-manager.tsx` (lepas tab Testimoni), `content-types.ts`/`content.ts`/`site-content.ts` (lepas `ManagedTestimonial`/`TESTIMONIALS`/normalizer), `admin-api.ts`, `analytics.ts`, `admin-audit-types.ts`, `next.config.ts` (redirect), `tsconfig.json`, `package.json`, `globals.css` (keyframes `taman-*`).
- **Fase D7 — `ProjectTestimonial` dihapus:** `project-types.ts`, `projects.ts`, `api-schemas.ts`, `api/admin/projects/route.ts`, `admin/projects-manager.tsx`, `app/portofolio/[slug]/page.tsx` (render + JSON-LD Review proyek), `content.ts` (3 entri `PROJECTS`), 4 `scripts/seed-project-*.mjs`.

**Dampak disadari:** beranda tidak lagi menampilkan bukti sosial testimoni; portal akun tanpa tab testimoni; halaman proyek tanpa kutipan klien; audit lama beraksi `taman.*` tetap tampil sebagai string mentah (aman). **Ulasan produk & rating TETAP ADA** (hanya tombol angkat-testimoni yang hilang).

**Verifikasi:** `tsc` ✅ · `eslint` ✅ · 15 suite test (291 test) ✅ · `build` ✅.

**Lanjut (pemilik, opsional):** (1) siapkan pengganti bukti sosial beranda (mis. `SocialProof` dari pesanan nyata yang sudah ada); (2) bersihkan data Firestore `taman_testimonials`/`taman_private`, field `testimonials` di `content/*`, dan field `testimonial` di dokumen `projects/*` (tidak wajib untuk kode).

---## ✅ Sesi Terakhir - Upgrade Blog B0–B8 (SELESAI, kode)

Dokumen hasil: [`docs/2026-10-09-upgrade-blog.md`](docs/2026-10-09-upgrade-blog.md). Checklist: [`docs/2026-10-09-task-upgrade-blog.md`](docs/2026-10-09-task-upgrade-blog.md).

| Fase | Hasil |
| --- | --- |
| **B0** | Bug: `coverAlt` tersimpan, revalidate lengkap, demo fallback dihapus, batas upload satu sumber. |
| **B2** | Markdown: gambar (host aman), kutipan, kode + salin, daftar bernomor, heading id. |
| **B1** | Media: pilih cover & sisip gambar dari media library, alt wajib, pelacakan body. |
| **B5** | Backend: SEO meta, jadwal tayang, riwayat slug + 301, paginasi & cari API, cron revalidate. |
| **B3** | Editor: toolbar, pratinjau, autosave, tag chip, SEO, jadwal WIB, pratinjau draft admin. |
| **B4** | Dashboard: filter URL, bulk (maks 50), duplikat, peringatan rename, audit artikel. |
| **B6** | Publik: layout 3 kolom, TOC, sidebar CTA & produk, share, pencarian & paginasi via URL. |
| **B7** | SEO: RSS `content:encoded`, OG fallback, JSON-LD `wordCount`. |
| **B8** | Analitik blog (tanpa PII), coverage test, `test:blog` masuk CI. |

**Verifikasi:** `tsc` ✅ · `lint` ✅ · `test:blog` 120 ✅ · `build` ✅.
**Belum diverifikasi manual:** alur editor & bulk di browser, tampilan 3 kolom, redirect 301 & cron di server, feed RSS & preview OG, event analitik di dashboard Vercel.

---
## 🎉 Sesi Terakhir — Upgrade Beranda FASE H8: QA, Dokumentasi & Rilis (MENUTUP INISIATIF)

Fase **H8** — sekaligus **menutup seluruh rangkaian H0–H8** upgrade beranda.

| Kode | Hasil |
| --- | --- |
| **QA gate** | `tsc` bersih ✅ · `eslint` bersih ✅ · `build` sukses ✅ (72 halaman) · **14 suite / 117 test** lolos ✅. |
| **Audit beranda** | Anchor unik & resolve (AIDA: `#beranda`…`#kontak`); **1 `<h1>`** + 12 `<h2>`; **53/53 gambar ber-`alt`**; 63 `aria-label`; sembunyi-jika-placeholder bekerja. |
| **Dokumentasi** | `docs/2026-10-06-upgrade-beranda.md` (ringkasan §11 + riwayat H8); task doc → status SELESAI; `docs/README.md` diperbarui. |
| **Rilis** | Commit konvensional + push `main` → Vercel auto-deploy (`https://lktech.vercel.app`). CI (`.github/workflows/ci.yml`) hijau. |

**Status akhir:** ✅ **UPGRADE BERANDA (H0–H8) SELESAI (kode).** Sisa = uji browser manual & Lighthouse (pemilik).

---

## 🎉 Sesi Sebelumnya — Upgrade Beranda FASE H7: Observability & Konversi

Fase **H7** dari `docs/2026-10-06-task-upgrade-beranda.md` **selesai**.

| Perubahan | Detail |
| --- | --- |
| **Event baru (terketik)** | `analytics.ts`: `cta_click` (`trackCtaClick`) + `scroll_depth` (`trackScrollDepth`). |
| **`TrackedLink`** | Komponen baru (`tracked-link.tsx`) — `next/link` yang mencatat klik, aman dari server component. |
| **CTA beranda ter-track** | `cta_click`: hero→`#layanan`, services→`/layanan`, portofolio-teaser→`/portofolio`, produk-section→`/produk`, pricing→`/harga`. |
| **`whatsapp_click`** | Diverifikasi lengkap: hero, pricing, cta-contact, footer, navbar-mobile. |
| **Scroll depth** | `ScrollDepthTracker` (25/50/75/100%, listener pasif + rAF, di-mount di beranda). |
| **Aman** | Semua via `trackEvent` (no-op saat SSR/analytics nonaktif); tanpa PII. |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (72 halaman; link CTA ter-render + tracker ter-mount).

**Lanjut:** FASE **H8** (QA, dokumentasi & rilis) — fase terakhir.

---

## 🎉 Sesi Sebelumnya — Upgrade Beranda FASE H6: SEO & Performa

Fase **H6** dari `docs/2026-10-06-task-upgrade-beranda.md` **selesai**.

| Perubahan | Detail |
| --- | --- |
| **Metadata beranda** | `page.tsx` kini ekspor `metadata` khusus: `title.absolute` "LKTech — Jasa Pembuatan Website, Aplikasi Mobile & Produk Digital", description fokus layanan + produk, `canonical: "/"`, `openGraph`. |
| **JSON-LD** | `structured-data.tsx` mengeluarkan **2 node**: `ProfessionalService` (`@id #organization`) + **`WebSite`** (`@id #website`, `publisher`) — brand↔situs tertaut. (Tanpa `SearchAction`: belum ada fitur pencarian.) |
| **OG image** | Chip diperbarui → `Website · Aplikasi Mobile · Produk Digital`; `alt` disesuaikan. |
| **LCP** | Hero: carousel browser `priority` ✓, carousel ponsel non-priority ✓, `min-h-screen` (tanpa CLS); showcase kosong → placeholder gradient. |
| **robots/sitemap** | Diverifikasi benar (larangan `/admin`/`/api`/`/akun`/`/keranjang`/`/masuk`/`/unduhan`; sitemap lengkap). |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (72 halaman; HTML beranda memuat title/desc/canonical/OG + JSON-LD `ProfessionalService` & `WebSite`).

**Sisa manual:** Lighthouse (target ≥ 90) + uji tampilan OG di share preview.

**Lanjut:** FASE **H7** (observability & konversi) → H8 (QA & rilis).

---

## 🎉 Sesi Sebelumnya — Upgrade Beranda FASE H3: Sistem Konten (Konsolidasi)

Fase **H3** dari `docs/2026-10-06-task-upgrade-beranda.md` **selesai**.

| Perubahan | Detail |
| --- | --- |
| **Temuan utama** | Ada **dua** definisi layanan: `src/lib/services.ts` (kaya, hardcoded) + `SERVICES`/`SERVICES_DETAIL` di `content.ts` (duplikat). Beranda menampilkan 3 layanan (data Firestore basi), `/layanan` menampilkan 5. |
| **Konsolidasi** | `content.ts`: hapus `SERVICES`+`SERVICES_DETAIL`+`getServiceSlugs()` (**−736 baris**); `content-types.ts` menurunkan default dari `@/lib/services`; `services.tsx` & `footer.tsx` membaca `SERVICES` dari `@/lib/services` langsung. |
| **Efek** | Beranda kini menampilkan **5 layanan** — konsisten dengan `/layanan`. Sumber tunggal: `@/lib/services`. |
| **Backward-compat** | `SiteContent.services` tetap ada di tipe & normalizer (data lama valid); hanya tak lagi dikonsumsi komponen. |
| **Bersih-bersih** | Hapus `fadeUp` (dead export) di `motion.tsx`. |
| **Inventaris** | Tabel sumber konten final didokumentasikan di doc fase (§4 H3). |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (72 halaman; beranda `#layanan` = 5 layanan).

**Lanjut:** FASE **H6** (SEO & performa) → H7 (observability & konversi) → H8 (QA & rilis).

---

## 🎉 Sesi Sebelumnya — Upgrade Beranda FASE H4: Desain & Polesan Visual

Fase **H4** dari `docs/2026-10-06-task-upgrade-beranda.md` **selesai**.

| Perubahan | Detail |
| --- | --- |
| **Alternasi latar** | Menghilangkan section berdekatan sama-latar: `WhyUs → bg-surface`, `Process → bg-white`, `FeaturedProducts → bg-surface` → run `Services→FeaturedProducts` berselang rapi. |
| **Spacing** | `CtaContact` outer `py-20 → py-24`; mayoritas section `py-24` (Technologies `py-12` & Stats `py-20` = aksen sengaja). |
| **Reduced-motion (a11y)** | `Reveal` (motion.tsx) + `stats` (counter), `why-us` & `testimonials` (stagger) kini **menonaktifkan animasi** saat `prefers-reduced-motion`. |
| **Kontras AA** | Caption `stats` `white/40 → white/60`; `text-muted` & teks putih terverifikasi lolos AA. |
| **Mobile** | Tap target navbar ikon `h-10 → h-11` (44px, WCAG 2.5.5). |
| **Tipografi** | Diverifikasi: satu `<h1>` (hero), semua judul section `<h2>`. |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (72 halaman).

**Lanjut:** FASE **H3** (sistem konten/konsolidasi) → H6 (SEO & performa) → H7 (observability & konversi) → H8 (QA & rilis).

---

## 🎉 Sesi Sebelumnya — Upgrade Beranda FASE H5: Seksi Produk Digital Unggulan

Fase **H5** dari `docs/2026-10-06-task-upgrade-beranda.md` **selesai**.

| Perubahan | Detail |
| --- | --- |
| **Seksi baru** | `src/components/sections/featured-products.tsx` (server component) — "Produk digital unggulan": ambil maks **6** produk via `getProducts()` (aktif, urut unggulan → nama). |
| **Kartu** | Memakai `ProductCard` (badge stok nyata, bintang rating, aksi beli) — konsisten dengan `/produk`. |
| **CTA** | "Lihat semua produk" → `/produk`. |
| **Etika/Kosong** | `return null` bila tak ada produk → seksi kosong tidak dirender. |
| **A11y/Anchor** | `<section id="produk" aria-labelledby="produk-heading" className="scroll-mt-24">`; judul ber-`id`. |
| **Penempatan** | `page.tsx`: setelah `Process` (slot K1); latar `bg-white` berselang dgn `Process` (surface) & `Stats` (secondary). |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (72 halaman; HTML prerender memuat `#produk` + kartu produk nyata).

**Lanjut:** FASE **H4** (desain & polesan visual — spacing konsisten, SectionHeading, kontras AA) → H3 → H6 → H7 → H8.

---

## 🎉 Sesi Sebelumnya — Upgrade Beranda FASE H2: Konten & Kejujuran Data (Trust)

Fase **H2** dari `docs/2026-10-06-task-upgrade-beranda.md` **selesai**.

| Perubahan | Detail |
| --- | --- |
| **Testimoni placeholder disembunyikan** | `testimonials.tsx` → `return null` bila kosong **atau** `isDefaultTestimonials()`; tidak menampilkan testimoni karangan. |
| **Stat placeholder disembunyikan** | `stats.tsx` → `return null` bila kosong **atau** `isDefaultStats()`; bila tampil (nyata) ada caption *"Angka kumulatif sejak berdiri, diperbarui berkala."* |
| **Bukti sosial NYATA di hero** | `<SocialProof/>` (server, `getSocialProof()` — pesanan nyata 7 hari, ambang ≥3) dikirim ke `Hero` via prop `socialProof` → **menggantikan chip "100% Kepuasan"** yang palsu. Fallback jujur "Garansi · Kualitas" bila data belum cukup. |
| **Klaim hero diluruskan** | Avatar & "N klien mempercayai kami" hanya tampil bila testimoni/stat **bukan** placeholder. |
| **Logo klien "Trusted By"** | Diverifikasi: **tidak ada** aset/seksi logo klien di repo → tidak ada yang perlu disembunyikan. |
| **Freshness** | `page.tsx`: `revalidate = 300` (data dinamis portofolio + bukti sosial); route `/` tetap **Static**. |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (72 halaman, `/` Static + 5m).

**Lanjut:** FASE **H5** (seksi produk digital unggulan) → H4 → H3 → H6 → H7 → H8.

---

## 🎉 Sesi Sebelumnya — Upgrade Beranda FASE H1: Struktur & Alur Persuasi (IA)

Fase **H1** dari `docs/2026-10-06-task-upgrade-beranda.md` **selesai**.

| Perubahan | Detail |
| --- | --- |
| **Urutan section (AIDA)** | `src/app/page.tsx`: `Hero → Technologies → Services → PortfolioTeaser → WhyUs → Process → Stats → Testimonials → Pricing → Faq → CtaContact`. Portofolio (bukti) naik setelah Layanan; Keunggulan/Proses sebelum Stats. Slot Bukti sosial (H2) & Produk Digital (H5) disiapkan. |
| **Anchor id konsisten** | id baru: `#teknologi` (technologies), `#proses` (process), `#statistik` (stats), `#testimoni` (testimonials). Semua section ber-anchor diberi `scroll-mt-24` agar tidak tertutup navbar fixed. |
| **`NAV_LINKS`** | Diverifikasi konsisten (`Beranda #beranda` · Layanan · Produk · Portofolio · Blog · Harga · Promo · FAQ `/#faq`); "Produk" sudah ada → tanpa perubahan (hindari kepadatan menu). |
| **Mobile-first** | Tidak ada section menggantung; tiap section `return null` saat data kosong. |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (72 halaman).

**Lanjut:** FASE **H2** (konten & kejujuran data — sembunyikan testimoni/stat placeholder + bukti sosial nyata) → H5 → H4 → H3 → H6 → H7 → H8.

---

## 🎉 Sesi Sebelumnya — Upgrade Beranda FASE H0: Audit & Dokumen Fase

Fase **H0** dari `docs/2026-10-06-task-upgrade-beranda.md` **selesai** (audit & keputusan; tanpa perubahan kode fungsional).

| Hasil | Detail |
| --- | --- |
| **Dokumen fase** | `docs/2026-10-06-upgrade-beranda.md` dibuat — baseline lengkap (struktur `page.tsx`, 13 section + anchor/sumber data, modul siap pakai, celah) + checklist H0–H8. |
| **Placeholder teridentifikasi** | `TESTIMONIALS` & `STATS` di `content.ts` (⚠️ CONTOH/angka karangan). Deteksi sudah tersedia: `isDefaultTestimonials()`/`isDefaultStats()` (`content-types.ts`). |
| **Modul siap pakai** | `getSocialProof()`/`<SocialProof />` (bukti sosial nyata, ambang ≥3), `getProducts()` + `ProductCard` (katalog) — belum dipakai di beranda. |
| **8 keputusan awal (K1–K8)** | K1 urutan section final · K2 sembunyikan testimoni/stat placeholder · K3 bukti sosial nyata · K4 seksi produk pakai `getProducts`+`ProductCard` · K5 konsolidasi sistem konten · K6 layanan tetap hardcoded · K7 inti transaksi tak diubah · K8 anchor id konsisten. |
| **Prioritas eksekusi** | H1 → H2 → H5 → H4 → H3 → H6 → H7 → H8. |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ (tanpa perubahan kode; hanya dokumen).

**Lanjut:** FASE **H1** (struktur & alur persuasi/IA) → H2 (konten & kejujuran data) → H5 (seksi produk digital) → dst.

---

## 🎉 Sesi Sebelumnya — FASE P2: Alur JASA & Kedaluwarsa

Fase **P2** dari `docs/2026-10-06-fase-konversi-closing.md` **selesai di sisi kode**.

| Kode | Perubahan |
| --- | --- |
| **JASA + email admin** | Checkout JASA → `menunggu_konfirmasi`; email pembeli (`sendOrderStatusToBuyer`) **dan** admin (`sendOrderAwaitingConfirmationToAdmin` baru di `email.ts`) — terpisah agar satu gagal tak memblok lain. |
| **CTA "Konsultasi dulu"** | Halaman produk `jasa` (tunggal & multi-varian): `ProductBuyActions`, `ProductPurchasePanel`, `ProductPurchaseBar` (bottom sheet mobile) — CTA WhatsApp utama, checkout sebagai opsi sekunder. |
| **Invoice manual (Mayar)** | `createManualOrderInvoice` (`order-payment.ts`) + `POST /api/admin/orders {action:"invoice"}` + tombol "Buat invoice manual" di detail order (mis. JASA setelah kesepakatan). Ber-`extraData.orderId` → webhook tetap menandai lunas otomatis. |
| **Cron kedaluwarsa** | `GET/POST /api/cron/expire-orders` (dilindungi `CRON_SECRET`, **fail-closed**) → `markOrderExpired` + restore kupon (`KP-C2`) + email "kedaluwarsa". Dijadwalkan dari **cron eksternal** (cron-job.org / GitHub Actions) — Vercel Cron bawaan butuh plan Pro. |
| **Panel pembayaran admin** | Badge status bayar, nominal, kedaluwarsa, tautan bayar, penanda **manual**, tombol invoice; tampilkan `payUrl` hasil invoice manual untuk disalin. |
| **`/akun`** | Tombol **Bayar sekarang** kini muncul untuk order ber-`payUrl` yang belum lunas (termasuk JASA ber-invoice manual), bukan hanya `menunggu_bayar`. |
| **Env/konfig** | `.env.example`: `CRON_SECRET`. (Tanpa `vercel.json` — Vercel Cron butuh plan Pro.) |
| **Tipe** | `OrderPayment.manual?: boolean` (+ normalizer & `markOrderPaid`). |
| **Test** | `npm run test:expiry` (5) — logika `isOrderExpired` (murni, `order-expiry-pure.ts`). |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ · test (metrics 6 · fulfillment 5 · downloads 5 · **expiry 5**) lolos ✅.

**⚠️ Langkah manual:** set `CRON_SECRET` di Vercel (agar cron aktif; tanpa itu endpoint balas 503). Jadwalkan pemanggilan dari **cron eksternal** ke `GET /api/cron/expire-orders?token=<secret>` (Vercel Cron bawaan butuh plan Pro).

---

## 🎉 Sesi Terakhir — Audit QA P2 & Remediasi (GAP-1…GAP-8)

Audit QA menyeluruh atas hasil FASE P2 menemukan **8 gap**; semuanya diperbaiki.

| Gap | Temuan | Perbaikan |
| --- | --- | --- |
| **GAP-1** (kritis) | `markOrderExpired` baca-lalu-update **non-atomik** → balapan dengan webhook: order yang baru dibayar bisa ditimpa jadi `kedaluwarsa` + kuota kupon bocor | `markOrderExpired` kini **transaksional** (`runTransaction`) dengan **re-check status** di dalam transaksi → tak menimpa status final |
| **GAP-2** (kritis) | Order JASA memicu **email ganda** ke pembeli & admin (konfirmasi umum + notif jasa) | Untuk JASA, checkout hanya mengirim **satu** email pembeli & **satu** email admin (khusus jasa); email generik dilewati |
| **GAP-3** (mayor) | `docs/README.md` belum menandai P2 selesai | Status diperbarui → "P0, P1 & P2 selesai" |
| **GAP-4** (mayor) | API `action:"invoice"` tak menolak order berstatus final | `createManualOrderInvoice` menolak `dibatalkan`/`kedaluwarsa`/`selesai` (`final_status`); UI & API diselaraskan |
| **GAP-5** (mayor) | Invoice manual bisa dibuat **dobel** (dua tautan bayar) | Bila sudah ada invoice **menunggu** ber-tautan → tautan lama dikembalikan (`reused:true`), tak buat baru |
| **GAP-6** (minor) | `PENDING_PAYMENT_STATUSES` jadi ekspor mati | Diganti konstanta `PENDING_PAYMENT_STATUS` (tanpa array mati) |
| **GAP-7** (minor) | Ternary sia-sia `isJasa ? "Mulai dari" : "Mulai dari"`; email admin JASA membungkus HTML penuh (nesting) | Ternary dibersihkan; badan email diekstrak (`orderHtmlBody`) & dipakai ulang tanpa nesting |
| **GAP-8** (minor) | Doc arsitektur §3.5 menyebut Vercel Cron sebagai opsi | Diselaraskan → cron eksternal (Vercel Cron butuh plan Pro) |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (69 halaman) · test (metrics 6 · fulfillment 5 · downloads 5 · expiry 5) lolos ✅.

**Tidak ada langkah manual baru.**

---

## 🎉 Sesi Terakhir — FASE P3: Bundling & Cross-Sell

Fase **P3** dari `docs/2026-10-06-fase-konversi-closing.md` **selesai di sisi kode**.

| Kode | Perubahan |
| --- | --- |
| **Produk terkait** | Field `relatedSlugs?: string[]` (maks 12) di `Product`; normalisasi backward-compat (`products.ts`), schema API, editor admin **`RelatedProductsEditor`** (cari + checkbox, urutan pilih = urutan tampil). |
| **"Sering dibeli bersama"** | `getRelatedProducts` (manual + fallback kategori) → section server-rendered di detail produk; "Produk lainnya" dikecualikan dari duplikat. |
| **Cross-sell keranjang** | Endpoint publik `GET /api/products/related?slugs=` + komponen `cart-cross-sell.tsx` di halaman keranjang (arahan ke halaman produk; aman untuk produk multi-varian). |
| **Kupon bundel** | `Coupon.appliesToSlugs?` + `minItems?`; logika murni `checkBundleRules` (`coupon-rules.ts`) dipakai `validateCoupon`. |
| **Server-authoritative** | Checkout API & `/api/coupons/validate` mengirim konteks keranjang (`slugs`, `itemCount`); klien (`coupon-api.ts`, `cart-coupon.tsx`) menyertakannya. |
| **Admin kupon** | Form kelola menambah seksi **"Kupon Bundel"**; ringkasan kartu menampilkan info bundel; ekspor CSV + kolom "Kupon Bundel"/"Min Item". |
| **Test** | `npm run test:bundle` (9) — aturan `appliesToSlugs`/`minItems`. |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (69 halaman) · test (metrics 6 · fulfillment 5 · downloads 5 · expiry 5 · **bundle 9**) lolos ✅.

**Sisa manual:** uji browser (atur produk terkait di `/admin/products` → cek section "Sering dibeli bersama"; tambah item → cek cross-sell keranjang; buat kupon bundel → uji di keranjang) + deploy.

---

## 🎉 Sesi Terakhir — FASE P4: Urgency & Trust

Fase **P4** dari `docs/2026-10-06-fase-konversi-closing.md` **selesai di sisi kode**.

| Kode | Perubahan |
| --- | --- |
| **Stok nyata** | Field `stock?: number` (produk & varian, backward-compat); helper murni `stockBadge`/`productTotalStock` (`product-format.ts`). Badge **"Sisa N"** (bila `stock` ≤ 5) / **"Stok habis"** (`soldOut`) di kartu produk, hero detail, kartu varian. Editor admin: input stok produk + per-varian. |
| **Bukti sosial nyata** | `getSocialProof` (`social-proof.ts`) — hitung pesanan (bukan dibatalkan) 7 hari; **cache 10 menit**; tampil hanya bila ≥ 3. Komponen server `SocialProof` di sidebar detail produk. |
| **Trust badges** | Komponen `TrustBadges` (instan/jasa/compact) — pembayaran aman, diproses otomatis, konfirmasi manual (jasa). Di sidebar detail produk + keranjang. `refundNote` opsional. |
| **Etika** | Tanpa countdown/angka palsu — semua indikator dari data nyata (§5). |
| **Test** | `npm run test:stock` (9) — `stockBadge`/`productTotalStock`. |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (69 halaman) · test (metrics 6 · fulfillment 5 · downloads 5 · expiry 5 · bundle 9 · **stock 9**) lolos ✅.

**Sisa manual:** uji browser (isi stok produk/varian di `/admin/products` → cek badge "Sisa N"; cek trust badges di detail & keranjang) + deploy.

---

## 🎉 Sesi Terakhir — Audit QA P3/P4 & Remediasi Gap

Audit QA atas hasil P3 & P4 menemukan **5 gap**; **3 diperbaiki** (2 backlog/catatan).

| Gap | Temuan | Status |
| --- | --- | --- |
| **P4-1** | Stok vs kelayakan beli tak konsisten (`stock:0` masih bisa dibeli) | ✅ **Diperbaiki** — stok MENGIKAT bila diisi: `isStockOut` (soldOut atau `stock ≤ 0`) & `effectiveStock`; checkout tolak `qty > stock` (`*_insufficient_stock`) & `stock ≤ 0` (`*_out_of_stock`); badge "Stok habis" konsisten |
| **P4-2** | Dead export `productTotalStock` | ✅ **Diperbaiki** — dipakai untuk badge ringkas "Sisa N" multi-varian di kartu produk |
| **P3-3** | Kupon bundel tak dicabut saat syarat hilang dari keranjang | ✅ **Diperbaiki** — re-validasi otomatis saat isi keranjang berubah (best-effort; checkout tetap safety net di server) |
| **P3-2** | Diskon bundel atas seluruh subtotal (`eligibleSubtotal`) | ⏸️ **Backlog** (`KP-P2`) — sesuai dokumen §4 |
| **P4-3** | `social-proof.tsx` + `server-only` | 🔵 **Catatan** (aman, hanya dipakai server) |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (69 halaman) · test (metrics 6 · fulfillment 5 · downloads 5 · expiry 5 · bundle 9 · **stock 12**) lolos ✅.

**Sisa manual:** uji browser (set stok 0 pada produk → pastikan tak bisa dibeli; uji kupon bundel lalu hapus item syarat → kupon tercabut) + deploy.

---

## 🎉 Sesi Terakhir — FASE P5: Abandoned Checkout Recovery

Fase **P5** dari `docs/2026-10-06-fase-konversi-closing.md` **selesai di sisi kode**.

| Kode | Perubahan |
| --- | --- |
| **Draft server** | Koleksi `carts/{uid}` (`cart-draft.ts` + tipe/logika murni `cart-draft-pure.ts`). Klien `CartDraftSync` (di layout) sinkron draft saat keranjang user berubah (debounce 1,5 dtk). API `POST/DELETE /api/cart/draft`. |
| **Email pengingat H+1** | `sendCartReminders` (`cart-reminder.ts`) + template (`email-cart.ts`): rincian keranjang + tombol "Lanjutkan Checkout" (`/keranjang?ref=reminder`) + tautan berhenti. Cron `/api/cron/cart-reminders` (fail-closed `CRON_SECRET`). |
| **Opt-out** | Tautan bertanda tangan HMAC (`CART_UNSUB_SECRET`/fallback) → `/api/cart/unsubscribe` set `optedOut`. Fail-closed tanpa secret. |
| **Pengaturan** | Toggle `notifyCartReminders` di `/admin/settings` (default aktif). |
| **Tracking** | `cart_abandoned_recovered` dikirim saat checkout dari `?ref=reminder`. |
| **Env** | `.env.example`: `CART_UNSUB_SECRET` + catatan cron pengingat. |
| **Test** | `npm run test:cart` (10) — `shouldRemind` & normalisasi draft. |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (69 halaman; +3 route) · test (metrics 6 · fulfillment 5 · downloads 5 · expiry 5 · bundle 9 · stock 12 · **cart 10**) lolos ✅.

**Langkah manual:** set `CART_UNSUB_SECRET` (opsional; fallback ke secret lain) di Vercel; jadwalkan cron eksternal `GET /api/cron/cart-reminders?token=<CRON_SECRET>` (mis. tiap 3 jam). Catatan: email ke pembeli umum tetap butuh domain Resend terverifikasi.

---

## 🎉 Sesi Terakhir — FASE P6: QA, Observability & Docs (FASE TERAKHIR)

Fase **P6** — sekaligus **menutup seluruh rangkaian P0–P6** Konversi & Closing.

| Kode | Perubahan |
| --- | --- |
| **Event tracking** | `payment_initiated` & `cart_abandoned_recovered` (klien, `analytics.ts`); event server terstruktur `payment_received`/`payment_mismatch`/`orders_expired`/`cart_reminders_sent` via `observability.ts` (`[obs] <event> {json}`). |
| **Konversi pembayaran di analitik** | `computePaymentConversion` (`metrics-spec.ts`) → `SalesAnalytics.payment` + kartu **"Konversi Pembayaran"** di `/admin/analytics`. |
| **Transisi status (murni)** | `order-status-pure.ts` (`isPaidStatus`/`isTerminalStatus`/`shouldRestoreCoupon`/`shouldSendStatusEmail`) dipakai `api/admin/orders` (restore kupon `KP-C2`). |
| **Test** | `npm run test:status` (11) transisi status; `test:metrics` diperluas (10) termasuk konversi pembayaran. **Total 67 test.** |
| **Docs** | §9 DoD ditandai; status dokumen fase → "P0–P6 selesai"; `docs/README.md` & `TASK-SELANJUTNYA.md` diperbarui. |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (69 halaman) · test (metrics 10 · fulfillment 5 · downloads 5 · expiry 5 · bundle 9 · stock 12 · cart 10 · status 11) lolos ✅.

**Status akhir:** ✅ **FASE KONVERSI & CLOSING (P0–P6) SELESAI (kode).** Sisa = langkah manual pemilik (cron eksternal, akun Mayar produksi, domain/Resend, uji sandbox live).

---

## 🎉 Sesi Terakhir — Ulasan & Rating Produk (R0–R6)

Inisiatif baru (Tema 3 Kepercayaan): **ulasan + rating bintang** dari pembeli terverifikasi, dengan moderasi admin & SEO. Dokumen fase: `docs/2026-10-05-ulasan-rating-produk.md`.

| Kode | Perubahan |
| --- | --- |
| **Data model** | `reviews/{id}` (tipe murni `review-types.ts` + data layer `reviews.ts`). Idempoten per (orderId, productSlug); selalu `pending`. |
| **Agregat** | `products/{slug}.ratingSummary` (avg/count/distribution) di-recompute dari ulasan `approved`; `Product.ratingSummary?` (backward-compat). |
| **API publik** | `GET /api/products/[slug]/reviews` (approved, nama disamarkan) & `POST` (verified purchase + rate-limit + idempoten). |
| **Halaman produk** | Section ulasan (`product-reviews`, `review-form`, `rating-stars` a11y); bintang ringkas di kartu produk. |
| **Admin** | `/admin/reviews` (`reviews-manager`) + `GET/PATCH/DELETE /api/admin/reviews` + menu **"Ulasan"** (grup Toko). |
| **SEO** | JSON-LD `AggregateRating` di halaman produk (bila ada ulasan disetujui). |
| **Test** | `npm run test:reviews` (9) — agregat/normalisasi rating. |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (70 halaman) · test (metrics 10 · fulfillment 5 · downloads 5 · expiry 5 · bundle 9 · stock 12 · cart 10 · status 11 · **reviews 9**) lolos ✅.

**Sisa manual:** uji browser (selesaikan pesanan → tulis ulasan di `/produk/[slug]` → setujui di `/admin/reviews` → cek bintang + JSON-LD) + publish ulang Firestore Rules (koleksi `reviews` — catch-all sudah menolak klien).

---

## 🎉 Sesi Terakhir — Operasional & Kualitas Teknis (Tema 4, O1–O5)

Inisiatif Tema 4 (Operasional). Dokumen fase: `docs/2026-10-05-operasional-tema4.md`.

| Kode | Perubahan |
| --- | --- |
| **O1 Audit Log** | `admin_audit/{id}` (`admin-audit.ts` + `admin-audit-types.ts` aman-klien); dicatat pada aksi order/produk/kupon/user/settings/review; `GET /api/admin/audit` + halaman **`/admin/audit`** + menu. |
| **O2 Rate-limit terdistribusi** | `rate-limit.ts`: `checkRateLimit()` upstash (opsional, fail-safe → fallback in-memory); dipakai `coupons/validate` & `reviews` POST. Webhook Resend ditunda. |
| **O3 Env fail-loud** | `env-check.ts` + `instrumentation.ts` — log status env saat startup (tak crash). |
| **O4 CI** | `.github/workflows/ci.yml` — `tsc`+`lint`+semua test+`build` per push/PR ke `main`. |
| **O5 Visual dashboard** | **Grafik garis** (`line-chart.tsx`, SVG + a11y) menggantikan grafik batang (omzet, pesanan, tren lead); KPI hero Row Ringkasan dipoles. |
| **O6 Agregasi harian** | ⏭️ Ditunda (optimasi skala `AN-P3`). |
| **Test** | `npm run test:audit` (3). |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (71 halaman) · **10 suite test** (79 test) lolos ✅.

**Langkah manual:** publish ulang Firestore Rules (koleksi `admin_audit`); (opsional) isi `UPSTASH_REDIS_REST_URL`/`_TOKEN` di Vercel untuk rate-limit terdistribusi; CI aktif otomatis setelah push.

---

## 🎉 Sesi Terakhir — Tema 2 Retensi & Engagement (R1–R5) — ✅ SELESAI

Inisiatif Retensi. Dokumen: `docs/2026-10-05-retensi-tema2.md`.

| Fase | Hasil |
| --- | --- |
| **R1 Loyalitas/Poin** | ❌ **DIHAPUS** (2026-10-11) — poin dari pembelian & ulasan, tier, tukar poin → kupon, tab **Poin** di `/akun`. Cukup kupon/voucher. |
| **R2 Email Marketing** | Newsletter opt-in (footer), **broadcast admin** per segmen (semua/pernah beli/belum), unsubscribe bertoken HMAC, `/admin/broadcast`. |
| **R3 Alert Wishlist** | Cron `/api/cron/wishlist-alerts` — email "harga turun"/"kembali tersedia" (cooldown 72 jam). |
| **R4 Notifikasi WA** | `whatsapp-notify.ts` opsional & **fail-safe** (aktif bila env diisi). Web Push ditunda. |
| **R5 QA & Docs** | QA penuh + dokumentasi. |

**Verifikasi:** `tsc`/`eslint`/`build` bersih ✅ (72 halaman) · **14 suite / 117 test** lolos ✅.

**Langkah manual:** set `NEWSLETTER_UNSUB_SECRET`; (opsional) `WHATSAPP_ACCESS_TOKEN`+`WHATSAPP_PHONE_NUMBER_ID`; jadwalkan cron eksternal `GET /api/cron/wishlist-alerts?token=<CRON_SECRET>`; publish ulang Firestore Rules (koleksi `subscribers`).

---

## 🎉 Sesi Sebelumnya — CRM Mini L6: QA & Finalisasi (menutup inisiatif)

**QA penuh:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (71 halaman) · **12 suite / 98 test** lolos ✅.

**Perbaikan konsistensi (audit L1–L5):**
- Perubahan **status lama** (dropdown) kini juga **menyinkronkan `stage`** pipeline (dua arah) — `PATCH /api/admin/leads`.
- Dialog detail lead ikut memperbarui tahap & skor setelah perubahan.

**Inisiatif Laporan & CRM Mini — ✅ SELESAI (L1–L6).** Dokumen: `docs/2026-10-05-laporan-crm-mini.md`.

**Hasil:** skor lead otomatis + Kanban pipeline + timeline aktivitas + email laporan mingguan (cron) + panel Kesehatan Bisnis di dashboard.

---

## 🎉 Sesi Sebelumnya — CRM Mini L5: Kesehatan Bisnis di Dashboard

| Kode | Perubahan |
| --- | --- |
| **Kesehatan bisnis** | `business-health.tsx` (server component) — KPI **30 hari** (omzet, pesanan, AOV, konversi pembayaran) + **delta vs 30 hari sebelumnya**, dipasang di halaman Ringkasan `/admin`. Reuse `getSalesAnalytics` + `getOrdersSummary` (metrik resmi `metrics-spec`). |

**Verifikasi:** `tsc`/`eslint`/`build` bersih (71 halaman) · **12 suite (98 test)** lolos.

**Lanjut (L6):** QA menyeluruh + finalisasi dokumentasi (tutup inisiatif Laporan & CRM Mini).

---

## 🎉 Sesi Sebelumnya — CRM Mini L4: Laporan Mingguan Otomatis

| Kode | Perubahan |
| --- | --- |
| **Agregat murni** | `report-pure.ts` — `aggregateOrders` (omzet/paid/produk terlaris/kupon), `percentDelta`, `isPaidStatus` (teruji 9). |
| **Penyusun laporan** | `weekly-report.ts` (server-only) — kumpulkan order/lead/kupon/produk 7 hari + pembanding 7 hari sebelumnya (`deltas`). |
| **Email laporan** | `email-report.ts` — template HTML+teks ber-brand dikirim ke `LEAD_NOTIFY_EMAILS` via Resend. |
| **Cron** | `/api/cron/weekly-report` (fail-closed `CRON_SECRET`; `?days=7..90` opsional). Observability `weekly_report_sent`. |
| **Test** | `npm run test:report` (9). |

**Verifikasi:** `tsc`/`eslint`/`build` bersih (71 halaman, +1 route) · **12 suite (98 test)** lolos.

**Langkah manual:** jadwalkan cron eksternal `GET /api/cron/weekly-report?token=<CRON_SECRET>` (mis. tiap Senin 08:00).

**Lanjut (L5–L6):** kesehatan bisnis di dashboard (KPI vs periode lalu), QA/docs.

---

## 🎉 Sesi Sebelumnya — CRM Mini (L2–L3: Pipeline Kanban & Timeline)

| Kode | Perubahan |
| --- | --- |
| **L2 Pipeline** | `lead-pipeline-board.tsx` — Kanban 5 kolom (Baru→Dihubungi→Proposal→Menang→Kalah), drag&drop + tombol ‹ ›, a11y `role="list"`; toggle **Daftar ⇄ Pipeline** di `leads-manager`; `lead-score-badge.tsx`. |
| **L3 Timeline** | `GET /api/admin/leads/[id]/activities` + `lead-timeline.tsx` (muat + tambah catatan/panggilan/email/wa), di dialog detail lead. Perubahan tahap otomatis tercatat aktivitas. |
| **Dialog detail** | `LeadDetailDialog` — info + ubah tahap + timeline. |

**Verifikasi:** `tsc`/`eslint`/`build` bersih (71 halaman; +1 route) · 11 suite (89 test) lolos.

**Lanjut (L4–L6):** laporan mingguan otomatis (cron + email), kesehatan bisnis di dashboard, QA/docs.

---

## 🎉 Sesi Sebelumnya — Laporan & CRM Mini (L1)

Inisiatif Tema 3 (lanjutan). Dokumen fase: `docs/2026-10-05-laporan-crm-mini.md`.

**L1 selesai** — model & scoring lead (murni) + data layer:
- `lead-scoring-pure.ts`: `computeLeadScore` (0..100 dari data nyata), `scoreTier`, pemetaan `statusToStage`/`stageToStatus` (teruji 10).
- `lead-types.ts`: field opsional baru `score`/`stage`/`activities`/`lastActivityAtISO` (backward-compat).
- `lead-crm.ts`: `recomputeLeadScore`, `updateLeadStage` (+ sinkron `status` + aktivitas), `addLeadActivity`/`listLeadActivities`.
- `POST /api/lead` menghitung skor saat create; `PATCH /api/admin/leads` menerima `status`/`stage`/`activity`; klien `updateLeadStage`/`addLeadActivity`.

**Verifikasi:** `tsc`/`eslint`/`build` bersih (71 halaman) · **11 suite test** (89 test) lolos ✅.

**Lanjut (L2–L6):** Kanban pipeline, timeline aktivitas, laporan mingguan otomatis (cron), kesehatan bisnis di dashboard.

---

## 🧭 STATUS & PETA SEKARANG (baca ini dulu)

> Ringkasan kondisi terkini agar sesi berikutnya langsung paham tanpa membaca
> seluruh riwayat. Riwayat sesi ada di bawah.

### Kondisi live saat ini
- **Situs produksi:** `https://lktech.vercel.app` (auto-deploy dari `main`).
- **Pembayaran online:** ✅ aktif di **MODE SANDBOX Mayar** (`MAYAR_MODE=sandbox`, `MAYAR_API_KEY` terisi di Vercel). Uang asli **belum** — perlu akun produksi (lihat di bawah).
- **Unduhan produk digital:** ✅ aktif (`DOWNLOAD_TOKEN_SECRET` terisi, / fallback `MAYAR_API_KEY`).
- **Email ke pembeli:** ⚠️ hanya ke email terdaftar Resend (`lupyariestaa@gmail.com`) — domain belum terverifikasi. **SKIP** sengaja (butuh beli domain). Email ke pembeli umum = 403, dilog, **tidak menggagalkan order**.
- **Webhook:** ✅ `POST /api/webhooks/mayar` menerima `payment.received` (log Vercel terbukti `POST 200`).

### Cek cepat (endpoint diagnostik)
```
GET https://lktech.vercel.app/api/health/payment
```
Harus mengembalikan `mayar.configured: true`, `download.configured: true`, `email.configured: true`.

### Alur transaksi INSTAN yang SUDAH TERBUKTI (sandbox)
```
/produk → keranjang → checkout → [dibayar? masuk halaman Mayar]
  → bayar → webhook payment.received → order "dibayar"
  → /akun (tab Pesanan) tombol "Unduh produk" → /unduhan/[token]
```
Produk contoh untuk uji: **Template Katalog Produk UMKM** (`template-katalog-umkm`, kategori `software`, Rp149rb) — dari `scripts/seed-product-template-katalog.mjs`.

### Fase roadmap — posisi sekarang
```
Fase Konversi & Closing (docs/2026-10-06-fase-konversi-closing.md)
  ✅ P0  Fondasi pembayaran (invoice Mayar, status order, redirect bayar)
  ✅ P1  Webhook + fulfillment otomatis + unduhan /unduhan/[token]
  ✅ P2  Alur JASA & kedaluwarsa (email jasa+admin, invoice manual, cron expire, panel pembayaran)
  ✅ P3  Bundling & cross-sell (relatedSlugs, "Sering dibeli bersama", kupon bundel)
  ✅ P4  Urgency & trust (badge stok nyata, bukti sosial 7 hari, trust badges)
  ✅ P5  Abandoned checkout (draft server, email pengingat H+1, opt-out, tracking recovery)
  ✅ P6  QA/observability + docs (event tracking, konversi pembayaran di analitik, test transisi status)
  ✅ Upgrade Blog B0–B8 (docs/2026-10-09-upgrade-blog.md) — kode selesai, verifikasi manual tersisa
```

### FASE KONVERSI & CLOSING — ✅ SELESAI (kode, P0–P6)
Seluruh fase P0–P6 tuntas di sisi kode.

### ULASAN & RATING PRODUK — ✅ SELESAI (kode, R0–R6)
Tema 3 (Kepercayaan) — ulasan verified-purchase + moderasi + JSON-LD (`docs/2026-10-05-ulasan-rating-produk.md`).

### UPGRADE BERANDA / LANDING PAGE — ✅ SELESAI (kode, H0–H8)
`docs/2026-10-06-task-upgrade-beranda.md` (rencana H0–H8) · `docs/2026-10-06-upgrade-beranda.md` (eksekusi + ringkasan §11).
- ✅ **H0 Audit & dokumen fase** (baseline + keputusan K1–K8).
- ✅ **H1 Struktur & alur persuasi (IA)** (urutan AIDA + anchor id konsisten).
- ✅ **H2 Konten & kejujuran data** (placeholder disembunyikan + bukti sosial nyata).
- ✅ **H3 Sistem konten (konsolidasi)** (`@/lib/services` sumber tunggal; −736 baris duplikat).
- ✅ **H4 Desain & polesan visual** (alternasi latar, reduced-motion, kontras AA, tap 44px).
- ✅ **H5 Seksi produk digital unggulan** (server, `ProductCard`, tersembunyi bila kosong).
- ✅ **H6 SEO & performa** (metadata beranda, JSON-LD `WebSite`, OG, LCP).
- ✅ **H7 Observability & konversi** (`cta_click`, `scroll_depth`, `TrackedLink`).
- ✅ **H8 QA, dokumentasi & rilis** (14 suite/117 test, dokumentasi, rilis).

**Sisa manual (pemilik):** uji browser desktop/mobile, Lighthouse (≥90), preview OG, isi konten asli (testimoni/stat) bila ada.

**NEXT TASK = pilihan pemilik:**
- **Inisiatif roadmap berikutnya** (`docs/2026-10-06-roadmap-pengembangan.md`) — pilih gelombang/inisiatif berikutnya.
- **Langkah manual tersisa** (daftar di bawah): aktifkan cron eksternal (`CRON_SECRET`), akun Mayar produksi, domain + verifikasi Resend.
- **Uji sandbox end-to-end** INSTAN & JASA (`docs/2026-10-06-setup-pembayaran-mayar.md`).
- **Inisiatif roadmap berikutnya** (`docs/2026-10-06-roadmap-pengembangan.md`): Retensi (loyalitas/email marketing), Kepercayaan (alert wishlist), Operasional (audit log, rate-limit/Upstash, laporan otomatis).

### DoD Global (§9) — status
1. ✅ `tsc`/`lint`/`build` bersih + unit test transisi status & kalkulasi bundel.
2. ✅ Uang & akses hanya divalidasi server.
3. ✅ Webhook idempoten & aman; kegagalan terpantau (`observability.ts`).
4. ⏳ Uji sandbox end-to-end INSTAN & JASA (kode siap; verifikasi live = manual).
5. ✅ Backward-compatible.
6. ✅ A11y & mobile-first; `/unduhan/*` noindex.
7. ✅ Dokumentasi fase & `TASK-SELANJUTNYA.md` diperbarui.

### Langkah manual yang MASIH tertunda (milik pemilik)
- **FASE P2 — cron:** set `CRON_SECRET` di Vercel (rahasia acak) → jadwalkan pemanggilan dari cron eksternal ke `GET https://<domain>/api/cron/expire-orders?token=<secret>` → `{ ok:true, expired:N }`. (Vercel Cron bawaan butuh plan Pro, jadi pakai cron eksternal gratis.)
- **FASE P5 — cron pengingat + opt-out:** set `CART_UNSUB_SECRET` (opsional; fallback ke secret lain) → jadwalkan `GET /api/cron/cart-reminders?token=<CRON_SECRET>` (mis. tiap 3 jam).
- **Produksi Mayar:** daftar `web.mayar.id` → verifikasi bisnis → buat API key produksi → set `MAYAR_MODE=production` + `MAYAR_API_KEY` di Vercel → daftarkan webhook produksi (`.../api/webhooks/mayar?token=<MAYAR_WEBHOOK_TOKEN>`) → redeploy.
- **Domain sendiri:** belum dibeli (SKIP) → memblokir verifikasi email Resend & domain kustom.
- **Isi data asli:** portofolio, testimoni, logo klien (SKIP, manual via dashboard).

### Konvensi kerja proyek ini (WAJIB diikuti)
1. **Dokumentasi dulu → baru kode.** Setiap inisiatif besar punya `docs/YYYY-MM-DD-<slug>.md` dengan checklist fase.
2. **Pola sehat:** server-authoritative (harga/status/akses hanya di server), observability (log + status tersimpan), a11y, mobile-first, **backward-compatible** (data lama tetap jalan).
3. **QA tiap fase:** `npx tsc --noEmit` bersih · `npx eslint .` bersih · `npm run build` sukses · unit test (`npm run test:metrics` / `test:fulfillment` / `test:downloads` / `test:expiry` / `test:bundle` / `test:stock` / `test:cart` / `test:status`).
4. **Aman tanpa kredensial:** fitur gateway harus fail-safe (fallback / nonaktif) bila env kosong.
5. **Perubahan rules/env:** update `.env.example` + catat di dokumen (Firestore Rules perlu publish ulang manual).
6. **Git:** commit dengan pesan konvensional (`feat|fix|docs|chore(...)`), push ke `main` → Vercel auto-deploy.

---

## 🎉 Sesi Terakhir — Verifikasi Sandbox P0–P1 & Penyempurnaan Unduhan

**Hasil uji end-to-end (sandbox Mayar):** checkout → invoice Mayar → bayar → webhook `payment.received` → order **`dibayar`** → tombol **Unduh produk** di `/akun` → halaman `/unduhan/[token]`. **LOLOS.** ✅

**Perbaikan & tambahan (kode, sudah di-commit):**

| Kode | Masalah/Perubahan |
| --- | --- |
| **Bugfix mobile** | Invoice Mayar HTTP 400 "Validation Error" karena `mobile` kosong (padahal required) → checkout jatuh ke WhatsApp. Kini dikirim no. WhatsApp profil / fallback no. situs. |
| **Bugfix file size** | `size: undefined` ditolak Firestore → token unduhan gagal dibuat. Kini berkas dibersihkan sebelum disimpan. |
| **Aksi admin "Buat / kirim ulang unduhan"** | `POST /api/admin/orders {action:"fulfill"}` + tombol di detail order: segarkan berkas pada token order (mis. berkas baru ditambahkan setelah bayar), tampilkan link, kirim ulang email. |
| **Diagnostik `/api/health/payment`** | Cek status env Mayar/download/email (tanpa bocorkan kunci). |
| **UI keranjang** | Tampilkan alasan server saat jatuh ke WhatsApp (pesan `warning`). |
| **Seed** | `scripts/seed-product-template-katalog.mjs` — produk digital contoh "Template Katalog Produk UMKM" (Rp149rb, kategori `software`). |

**Verifikasi:** `tsc`/`eslint`/`build` bersih ✅ · test (metrics 6 · fulfillment 5 · downloads 5) lolos ✅.

**⚠️ Catatan:** email ke pembeli umum = 403 (domain Resend belum diverifikasi) — **SKIP** (lihat §5). Unduhan tetap bisa via `/akun`.

**Langkah manual tersisa:** daftar akun Mayar **produksi** (`web.mayar.id`) + verifikasi bisnis → set `MAYAR_MODE=production` + `MAYAR_API_KEY` produksi di Vercel → daftarkan webhook produksi → redeploy.

---

## 🎉 Sesi Terakhir — FASE P1: Webhook & Fulfillment Otomatis (unduhan)

Fase P1 dari `docs/2026-10-06-fase-konversi-closing.md` **selesai di sisi kode** (uji sandbox live = manual, menunggu akun Mayar).

| Area | Hasil |
| --- | --- |
| **Webhook** | `src/app/api/webhooks/mayar/route.ts` — event `payment.received`: verifikasi token, korelasi order (`extraData.orderId`), idempoten (`markOrderPaid`), **cocokkan nominal**, fulfillment best-effort, selalu 200 |
| **Fulfillment** | `src/lib/order-payment.ts` — `fulfillOrder` (kumpulkan berkas → token → email) & `notifyOrderAwaitingConfirmation` (JASA) |
| **Unduhan** | `src/lib/downloads.ts` + `src/lib/download-token.ts` (HMAC, teruji) — koleksi `downloads/{tokenId}`, batas unduh, kedaluwarsa |
| **Halaman** | `/unduhan/[token]` (validasi + daftar berkas) + `/api/downloads/[token]/[index]` (redirect + catat hit); **noindex** |
| **Produk** | Field `downloadable` (`Product` + normalisasi + form admin `DownloadableEditor` + schema API) |
| **Email** | `sendOrderPaidToBuyer` — "Pembayaran Diterima" + **link unduhan** |
| **`/akun`** | Tab Pesanan: tombol **Bayar sekarang** & **Unduh produk** (bila sudah lunas) |
| **Env** | `MAYAR_WEBHOOK_TOKEN`, `DOWNLOAD_TOKEN_SECRET`, `DOWNLOAD_LINK_DAYS`, `DOWNLOAD_MAX_HITS` |
| **Test** | `npm run test:downloads` (5) — sign/verify token & penolakan token palsu |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ · test (metrics 6 · fulfillment 5 · downloads 5) lolos ✅.

**⚠️ Langkah manual (produksi):**
- Daftarkan URL webhook di dashboard Mayar → Integration → Webhook: `https://<domain>/api/webhooks/mayar?token=<MAYAR_WEBHOOK_TOKEN>`.
- Isi `DOWNLOAD_TOKEN_SECRET` (hasil `openssl rand -base64 32`) — bila kosong, unduhan nonaktif (fail-closed).
- Set produk digital: buka `/admin/products` → isi **Unduhan Otomatis** (nama + URL berkas Cloudinary).
- Uji sandbox: checkout produk digital → bayar → webhook → status `dibayar` → email link unduhan → `/unduhan/<token>`.

**Backlog P1 → lanjut:** FASE **P2** (alur JASA & invoice manual + cron kedaluwarsa + panel pembayaran admin) → P3 bundling → P4 urgency → P5 abandoned checkout → P6 QA/observability.

---

## 🎉 Sesi Terakhir — FASE P0: Fondasi Pembayaran Online (Mayar.id)

Fase P0 dari `docs/2026-10-06-fase-konversi-closing.md` **selesai di sisi kode** (uji sandbox live = manual, menunggu API key).

| Area | Hasil |
| --- | --- |
| **Env** | `.env.example`: `MAYAR_API_KEY`, `MAYAR_MODE` (sandbox/production), `MAYAR_BASE_URL`, `MAYAR_INVOICE_TTL_MINUTES` |
| **Klien Mayar** | `src/lib/mayar.ts` (server-only) — `createInvoice` (`POST /hl/v2/invoices/create`), `getInvoice` (`GET /hl/v2/invoices/{id}`), `isMayarConfigured`, `getMayarMode`. Base URL dari env (tak hardcode) |
| **Tipe** | `src/lib/payment-types.ts` (safe-klien): `OrderPayment`, `PaymentStatus` + label/badge, `FulfillmentType` |
| **Status order** | `order-types.ts`: +4 status (`menunggu_bayar`, `dibayar`, `menunggu_konfirmasi`, `kedaluwarsa`); `normalizeOrder` backward-compat; `PENDING_PAYMENT_STATUSES` |
| **Fulfillment** | `src/lib/order-fulfillment.ts` — kategori → INSTAN/JASA (jasa & campuran → JASA) |
| **Order** | `createOrder` simpan `payment`+`fulfillment`; `updateOrderPayment`; `markOrderPaid` (idempoten, siap P1) |
| **Checkout** | `POST /api/orders`: INSTAN → invoice Mayar → kembalikan `payUrl`; JASA → `menunggu_konfirmasi`; **fallback WhatsApp** bila gateway kosong/gagal |
| **UI** | Keranjang: redirect ke halaman bayar (INSTAN) / pesan konfirmasi (JASA); `/akun` tab Pesanan: tombol **Bayar sekarang** + info kedaluwarsa; admin: badge status, kartu metrik **Menunggu Bayar**/**Perlu Konfirmasi**, panel pembayaran di detail order |
| **Kupon** | Restore kuota juga saat transisi → `kedaluwarsa` (`KP-C2`); hard-delete order diizinkan untuk status belum-diproses |
| **Test** | `npm run test:fulfillment` (5 test) + `test:metrics` diperluas (kedaluwarsa dikecualikan) |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ · `npm run test:metrics` (6) & `test:fulfillment` (5) lolos ✅.

**⚠️ Wajib manual (produksi):**
- Daftar akun Mayar + sandbox → buat API key → isi `MAYAR_API_KEY` (+ `MAYAR_MODE`) di Vercel.
- Uji sandbox end-to-end: checkout produk instan → invoice → bayar → **status belum otomatis** (webhook = FASE P1).
- Tanpa `MAYAR_API_KEY`, checkout otomatis **fallback ke WhatsApp** (aman, tidak error).

**Backlog P0 → lanjut:** FASE **P1** (webhook `/api/webhooks/mayar` + `markOrderPaid` + fulfillment unduhan `/unduhan/[token]`). Fondasi (`markOrderPaid`, `payment` model) sudah disiapkan.

---

## 🎉 Sesi Terakhir — Fase Detail Konversi & Closing

Membuat dokumen fase detail `docs/2026-10-06-fase-konversi-closing.md` (Rencana). Keputusan yang diambil:
- **Gateway: Mayar.id** (onboarding produksi ringan) — **API V2**, invoice + webhook `payment.received`.
- **Fulfillment DUA jalur:** produk instan (template/software/ebook) → **unduhan otomatis**; produk **jasa** (website/aplikasi) → **konsultasi/konfirmasi dulu** (bukan invoice otomatis; catatan kepatuhan Mayar MoR yang tak mendukung jasa manusia).
- Alur checkout baru: INSTAN → `menunggu_bayar` → bayar → `dibayar` → unduhan; JASA → `menunggu_konfirmasi`.
- 7 fase (P0–P6): fondasi pembayaran, webhook+fulfillment, alur jasa+kedaluwarsa, bundling, urgency, abandoned checkout, QA.

**Tidak ada perubahan kode** — sesi ini perencanaan.

**Langkah manual:** daftar akun Mayar + sandbox, buat API key, lalu eksekusi mulai FASE P0.

---

## 🎉 Sesi Sebelumnya — Roadmap Pengembangan (Konsep & Arah Lanjutan)

Membuat dokumen keputusan pengembangan `docs/2026-10-06-roadmap-pengembangan.md` berdasarkan audit kondisi sistem aktual. Isi: baseline kekuatan & celah, 4 tema (Konversi/Retensi/Kepercayaan/Operasional), matriks nilai-vs-usaha, 4 gelombang eksekusi, dan rekomendasi prioritas.

**Tidak ada perubahan kode** — sesi ini hanya perencanaan (dokumen).

**Rekomendasi urutan:** Pembayaran online (P0) → Ulasan & rating (P0) → Bundling → Loyalitas → Email marketing → CRM lead → Operasional (audit log, Upstash, laporan).

**Langkah manual:** pilih gelombang/inisiatif yang disetujui → buat dokumen fase detail per inisiatif.

---

## 🎉 Sesi Sebelumnya — Remediasi Audit Email/Kupon/Analitik (R0–R7)

Menuntaskan seluruh temuan audit (`docs/2026-10-05-audit-email-kupon-analitik.md`, FASE R0–R7):

| Kode | Temuan | Perbaikan |
| --- | --- | --- |
| **AN-C1** | `completionRate` salah (penyebut seluruh riwayat) | Rumus per-jendela `selesai/(total−batal)` di `metrics-spec.ts` |
| **AN-C2** | Query analitik tarik seluruh koleksi | `where(createdAtISO>=cutoff)` + `.select(...)` |
| **AN-H1/H2/H4** | Bruto≠netto, definisi ambigu, label kartu | Label eksplisit + spec metrik tunggal |
| **KP-C1** | Kuota non-atomik + redeem fire-and-forget | Transaksi atomik (reservasi sebelum order + rollback) |
| **KP-C2** | Kuota tak dikembalikan saat batal/hapus | `restoreCouponUsage` idempoten |
| **KP-H1/H2/H3** | Batas per-user, kode duplikat, tanggal fail-open | Subkoleksi `redemptions`, penanda `couponCodes/{code}`, schema fail-closed |
| **EM-C1/C2/C3** | Email gagal senyap/ganda/domain test | Retry+status di order, idempotensi, banner domain |
| **EM-H3** | Settings async (race serverless) | `after()` dari `next/server` |
| **XL-1/XL-2/XL-4/XL-5** | Definisi omzet, lifecycle, observability, SITE_URL | Spec metrik, lifecycle batal=restore+email, panel email/kupon, peringatan produksi |

**Fitur baru:** halaman publik **`/promo`** (+ prefill `?promo=` + banner di `/produk`), **delta %** di analitik, **ekspor CSV** analitik, **drill-down** klik batang, **a11y grafik** (tabel sr-only + roving tabindex + sentuh), **kirim ulang + riwayat email** per order, **statistik per kupon**, **soft-delete/restore kupon**.

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (68 halaman) · `npm run test:metrics` lolos ✅ (4 test).

**⚠️ Wajib manual:** publish ulang **Firestore Rules** (koleksi baru: `couponCodes`, subkoleksi `orders/{id}/emails` & `coupons/{id}/redemptions`) + uji browser + deploy.

**Backlog (ditunda):** `AN-P3` (agregasi harian), `KP-P3`/`XL-3` (rate-limit terdistribusi Redis/Upstash), `EM-P2` (outbox + webhook Resend).

---

## 🎉 Sesi Sebelumnya — Dashboard Analitik Penjualan

Halaman analitik penjualan (`docs/2026-10-05-analitik-penjualan.md`, A0–A7):

| Fase | Hasil |
| --- | --- |
| A1 | Agregasi server-only `src/lib/sales-analytics.ts` (+ tipe aman-klien `sales-analytics-types.ts`): seri harian, totals, AOV, tingkat selesai, status, produk terlaris |
| A2 | API `/api/admin/analytics?days=&mode=` + klien `admin-analytics-api.ts` |
| A3 | Halaman **`/admin/analytics`** + `analytics-dashboard` (toggle periode 7/30/90 + mode omzet + kartu ringkasan) |
| A4 | `sales-chart.tsx` — grafik batang **CSS murni** (tanpa dependensi) + a11y; grafik omzet & jumlah pesanan |
| A5 | **Produk terlaris** + **distribusi status** (bar komposisi) |
| A6 | Menu **"Analitik"** di nav + tautan dari Ringkasan; polish |
| A7 | QA: `tsc`/`lint`/`build` bersih ✅ (68 halaman) |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (68 halaman).

**Sisa manual:** uji browser (`/admin/analytics`: toggle periode, grafik, produk terlaris, status) + deploy.

---

## 🎉 Sesi Sebelumnya — Kupon / Diskon

Sistem promo end-to-end (`docs/2026-10-05-kupon-diskon.md`, K0–K8):

| Fase | Hasil |
| --- | --- |
| K1 | Logika inti `src/lib/coupons.ts` (`computeDiscount`, `validateCoupon`) + data layer + `coupon-types.ts` |
| K2 | Model order: `OrderCoupon`, `subtotal`, `coupon` (+ normalizer backward-compat) |
| K3 | API admin `/api/admin/coupons` (CRUD + summary) + klien + ekspor CSV |
| K4 | Halaman **`/admin/coupons`** + manager (daftar, form buat/edit, aktif/nonaktif, hapus); menu "Kupon" |
| K5 | API **validasi** `/api/coupons/validate` + komponen **`CartCoupon`** di keranjang |
| K6 | **Checkout server-authoritative**: validasi & hitung diskon di server, `total = subtotal − diskon`, kuota dicatat (`redeemCoupon`) |
| K7 | Diskon tampil di **pesan WhatsApp**, **email** (konfirmasi/status), & **detail order admin** |
| K8 | QA: `tsc`/`lint`/`build` bersih ✅ (67 halaman) |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (67 halaman).

**Sisa manual:** uji browser (buat kupon di `/admin/coupons` → pakai kode di `/keranjang` → checkout; cek diskon di WhatsApp/email/admin) + deploy.

---

## 🎉 Sesi Sebelumnya — Email Transaksional ke Pembeli

Email otomatis ke pembeli (`docs/2026-10-05-email-transaksional-pembeli.md`, E0–E7):

| Fase | Hasil |
| --- | --- |
| E1–E2 | Modul **`src/lib/email-order.ts`**: email konfirmasi + template HTML ber-brand (status: diproses/selesai/dibatalkan) |
| E3 | **Konfirmasi pesanan** dikirim ke pembeli saat checkout (`POST /api/orders`) |
| E4 | **Update status** dikirim ke pembeli saat admin ubah status (`getOrderById` + `sendOrderStatusToBuyer`); status `baru` dilewati |
| E5 | **Toggle di Pengaturan** (`notifyBuyerOnOrder`/`notifyBuyerOnStatus`) + teks di `/keranjang` |
| E6 | `.env.example` (`ORDER_REPLY_TO`); dokumentasi |
| E7 | QA: `tsc`/`lint`/`build` bersih ✅ (66 halaman) |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (66 halaman).

**⚠️ Wajib untuk produksi:** **verifikasi domain di Resend** agar email terkirim ke pembeli umum (lihat §10 dokumen). Tanpa itu, hanya ke alamat terdaftar Resend.

**Sisa manual:** verifikasi domain Resend + uji email (checkout → konfirmasi; ubah status → update) + deploy.

---

## 🎉 Sesi Sebelumnya — Modul Pengguna & Nomor WhatsApp

Profil user + modul admin "Pengguna" (`docs/2026-10-05-modul-pengguna-dan-whatsapp.md`, U0–U8):

| Fase | Hasil |
| --- | --- |
| U1 | **Nomor WhatsApp** di profil (`/akun` → tab Profil); validasi + normalisasi; tersimpan via PATCH `/api/user/profile` |
| U2 | Data layer `admin-users.ts` — gabung `users` × `orders` (jumlah pesanan, total belanja, sudah/belum pesan) |
| U3 | API `/api/admin/users` (list/summary/blokir/hapus) + `/api/admin/users/[uid]` (detail + pesanan) |
| U4 | Halaman **`/admin/users`** — kartu statistik, toolbar (cari/filter), tabel responsif, **ekspor CSV**; menu "Pengguna" di nav |
| U5 | **Detail user** (dialog) + riwayat pesanan + aksi blokir |
| U6 | **Blokir/unblokir** + **hapus user** (konfirmasi) |
| U7 | Kartu **UserSnapshot** di Ringkasan dashboard; polish |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (66 halaman).

**Sisa manual:** uji browser (login Google → isi no. WA di `/akun`; buka `/admin/users`: cari, filter, detail, blokir, hapus, ekspor CSV) + deploy.

---

## 🎉 Sesi Sebelumnya — Portal Akun Pengguna (Perluasan)

`/akun` diubah dari "profil + riwayat" menjadi **portal ber-tab** (`docs/2026-10-05-portal-akun-pengguna.md`, F0–F7):

| Fase | Hasil |
| --- | --- |
| F1 | **Data & API**: perluasan `UserProfile` (`wishlist`/`addresses`), CRUD di `user-profile.ts`, API `/api/user/wishlist` & `/api/user/addresses`, `PATCH /api/user/profile` (edit nama) |
| F2 | **Portal ber-tab** (`account-tabs`) — Ringkasan/Pesanan/Favorit/Alamat/Profil, sinkron `?tab=` |
| F3 | **Tab Profil** — edit nama (email read-only) |
| F4 | **Tab Pesanan** — detail + **"Pesan lagi"** (isi keranjang) |
| F5 | **Tab Favorit** — wishlist server (`WishlistProvider`) + tambah ke keranjang |
| F6 | **Tab Alamat** — CRUD + tandai utama |
| F7 | **Entry point**: tombol favorit di kartu & detail produk; polish, QA, docs |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (65 halaman).

**Sisa manual:** uji browser (login Google → `/akun`: tab, pesan lagi, favorit, alamat, edit nama) + deploy.

---

## 🎉 Sesi Sebelumnya — Halaman Harga / Paket Publik (`/harga`)

Halaman harga khusus dibangun (`docs/2026-10-03-halaman-harga-publik.md`, F0–F7):

| Fase | Hasil |
| --- | --- |
| F1 | `src/lib/pricing.ts` (tabel banding + FAQ harga) · "Professional" → **"Profesional"** · "Harga" masuk `PAGE_NAV_LINKS` & `NAV_LINKS` |
| F2 | Halaman **`/harga`** + layout dalam (Navbar/Footer/Cursor) — hero + kartu paket + **CTA WhatsApp per paket** + metadata/SEO |
| F3 | **`PricingTable`** (banding Basic/Profesional/Enterprise, responsif scroll-x) + **FAQ harga** (akordeon) |
| F4 | Section harga beranda → tautan **"Lihat semua paket & bandingkan"** ke `/harga` |
| F5 | `/harga` masuk **sitemap** + JSON-LD (`BreadcrumbList`, `OfferCatalog`) + tracking CTA |
| F6 | Dokumentasi diperbarui |
| F7 | QA: `tsc`/`lint`/`build` bersih ✅ (65 halaman) |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (65 halaman).

**Sisa manual:** uji browser (`/harga` desktop & mobile) + deploy.

---

## 🎉 Sesi Sebelumnya — Peningkatan Blog (SEO & Discovery)

Blog diperkaya untuk SEO & penemuan konten (`docs/2026-10-03-peningkatan-blog-seo-discovery.md`):

| Fitur | Hasil |
| --- | --- |
| Halaman **kategori** | `/blog/kategori/[category]` (SSG, metadata, JSON-LD `CollectionPage`+`ItemList`+`BreadcrumbList`) |
| Halaman **tag** | `/blog/tag/[tag]` (struktur sama) |
| **RSS feed** | `/blog/rss.xml` (RSS 2.0 + autodiscovery) |
| **Artikel terkait** | relevan (skor kategori + tag), bukan sekadar terbaru |
| **Filter tag** | di `/blog` (kategori + tag, dengan jumlah) |
| **Navigasi** | tag & kategori jadi tautan (kartu & detail) |
| **Structured data** | JSON-LD `Blog` di list, `BlogPosting`+`BreadcrumbList` di detail |
| **Sitemap** | memuat seluruh URL kategori & tag |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (47 halaman).

**⚠️ Catatan:** koleksi Firestore `articles` **masih kosong** — blog belum punya artikel. Tambahkan lewat `/admin/blog` (atau minta seed 3 artikel contoh).

---

## 🎉 Sesi Sebelumnya — Analytics & Monitoring + Verifikasi Sistem Media

### A. Sistem Media M1–M6 (verifikasi)
Ternyata sistem media **sudah selesai** pada commit `b44822a` (data layer, API bulk/usage/scan/orphans/tags/collections/audit, UI dashboard lengkap + crop, adopsi `alt`). Sesi ini hanya **memverifikasi** (`tsc`/`lint`/`build` bersih) & **memperbarui status dokumen** dari "Rencana" → "Selesai".

### B. Sentry (error tracking)
`@sentry/nextjs` dipasang **manual** (client/server/edge + `global-error.tsx` + `error.tsx`), dibungkus di `next.config.ts`. **Aman nonaktif tanpa DSN** — tidak mengirim apa pun bila `NEXT_PUBLIC_SENTRY_DSN` kosong.

| File | Peran |
| --- | --- |
| `src/lib/sentry.ts` | Opsi bersama (DSN dari env, environment, sample rate, tanpa PII) |
| `src/instrumentation-client.ts` | Init Sentry browser (+ router transition) |
| `src/sentry.server.config.ts` / `src/sentry.edge.config.ts` | Init server & edge |
| `src/instrumentation.ts` | Register per-runtime + `onRequestError` |
| `src/app/global-error.tsx` | Error boundary root → `captureException` |
| `next.config.ts` | `withSentryConfig` (skip upload source map bila tanpa token) |

### C. Event tracking konversi (Vercel Analytics)
`src/lib/analytics.ts` (pembungkus `track()` yang aman/tanpa-PII) + komponen `src/components/tracked-wa-button.tsx`.

| Event | Titik |
| --- | --- |
| `whatsapp_click` | `hero`, `navbar-mobile`, `cta-contact`, `pricing`, `layanan-hero`, `layanan-detail-*`, `layanan-package`, `portofolio-*`, `blog-detail`, `kontak-cta`, `footer` |
| `lead_submitted` / `lead_fallback_whatsapp` | Form kontak |
| `add_to_cart` | `cart-provider` (terpusat) |
| `checkout` | `cart-view` |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅ (46 halaman).

**⚠️ Langkah manual (produksi):**
- Isi **`NEXT_PUBLIC_SENTRY_DSN`** di Vercel (opsional `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN`).
- Aktifkan **Analytics** di dashboard Vercel (Project → Analytics).

---

## 🎉 Sesi Sebelumnya — Upgrade Sistem Layanan

Upgrade sistem layanan (`docs/2026-10-02-upgrade-sistem-layanan.md`, F0–F6) **selesai**:

| Fase | Hasil |
| --- | --- |
| F1 | **Sumber layanan hardcoded** (`src/lib/services.ts`) — tidak lagi dikelola dashboard |
| F2 | `/layanan` jadi **landing section bergantian** per layanan + CTA "Lihat Detail"/"Konsultasi" + FAQ + alur kerja + CTA penutup |
| F3 | Detail layanan kaya: **"Apa saja yang bisa dibuat"** (Website & Mobile: 8 jenis + 8 untuk mobile) & **"Cocok untuk"** |
| F4 | **Paket** dengan badge "Rekomendasi" + **CTA WhatsApp per paket** + **tabel banding**; hero & sidebar kaya |
| F5 | **Menu/halaman/manager/API "Layanan" dihapus** dari dashboard |
| F6 | Metadata + JSON-LD Service + tagline di kartu |
| — | Gambar ilustrasi per layanan (`public/layanan/*.png`) di landing `/layanan` |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅.

**Sisa manual:** uji browser + deploy.

---

## 🎉 Sesi Sebelumnya — Upgrade Sistem Portfolio (F1–F7)

Upgrade sistem portfolio berdasarkan `docs/2026-10-02-upgrade-sistem-portfolio.md`
—— **F1–F6 selesai**; F7 = uji browser & deploy (manual).

| Fase | Hasil | Status |
| --- | --- | --- |
| F1 | Field `featured`/`order` + **generalisasi galeri** (`MediaGallery`/`MediaLightbox`, dipakai Produk & Portfolio) | ✅ |
| F2 | **Detail profesional**: galeri interaktif (thumbnail+lightbox), metrics dinamis, tags, "proyek terkait" relevan, OG image, ratio 16:9 | ✅ |
| F3 | **Daftar kuat**: search + filter kategori & tema + sort + URL state + pagination + empty state | ✅ |
| F4 | **Dashboard**: kelola gambar proyek (MediaPicker+reorder+set cover), toggle Unggulan, urutan, kategori datalist, validasi | ✅ |
| F5 | Penanda **"Contoh"** untuk data demo | ✅ |
| F6 | **SEO**: JSON-LD per proyek (`CreativeWork`+`BreadcrumbList`) + sitemap `lastModified` nyata | ✅ |
| F7 | QA statis ✅ · uji browser & deploy | ⏳ manual |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅.

**Sisa manual:** uji browser (galeri, search/filter/sort, kelola gambar, JSON-LD) + isi data asli proyek + deploy.

---

## 🎉 Sesi Sebelumnya — Revisi Sistem Produk

Revisi 5 poin sistem produk (`docs/2026-10-02-revisi-sistem-produk.md`, FASE 0–7) **selesai**:

| # | Revisi | Hasil |
| --- | --- | --- |
| 1 | Galeri manual → MediaPicker | Field galeri admin pakai `MediaPickerDialog mode="multiple"` + crop 16:9 + reorder/hapus |
| 2 | Galeri statis → interaktif | `ProductGallery` (thumbnail klik → ganti besar) + `ProductLightbox` (navigasi/keyboard) |
| 3 | Ratio 16:9 | Semua gambar produk (`aspect-video` + `object-cover`) — kartu, cover, galeri, thumbnail |
| 4 | Kanvas paket | `VariantCanvas` — pan (drag) + zoom `+/−` + reset/"Sesuaikan" |
| 5 | Alur pilih paket | `ProductPurchasePanel` di sidebar — CTA **disabled sampai paket dipilih** |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅.

**Sisa manual:** uji browser (galeri, lightbox, kanvas touch, alur pilih paket) + deploy.

---

## 🎉 Sesi Sebelumnya — Perbaikan Bug Integrasi Orders (pasca-rilis)

Pemilik melaporkan: **riwayat pesanan pembeli kosong** padahal order masuk di dashboard admin.

**Akar masalah:** composite index Firestore. Query `where(uid)` + `orderBy(createdAtISO)` menuntut composite index; index belum ada → query gagal → riwayat kosong (kegagalan ditelan best-effort). Investigasi juga menemukan bug tersembunyi kedua (filter status admin).

| Kode | Perbaikan |
| --- | --- |
| `getOrdersByUser` | Buang `orderBy` dari query → urutkan di memori (riwayat pembeli pulih) |
| `getOrdersPage` | `orderBy` saja + saring status di memori (filter admin pulih) |
| `firestore.indexes.json` | Baru — index `orders` untuk kesiapan skala; registrasi di `firebase.json` |
| `EmailNotifier` | Teks menyebut notifikasi lead **&** pesanan |

**Verifikasi:** diuji langsung via Admin SDK (query sekarang mengembalikan data) ✅ · tsc/lint/build bersih ✅.

**Sisa manual:** uji di produksi setelah deploy — buka `/akun` (riwayat muncul), filter status di `/admin/orders`.

---

## 🎉 Sesi Sebelumnya — Modul Admin Orders/Pesanan

Halaman **Pesanan** admin dibangun dari nol (`docs/2026-10-02-orders-admin-module.md`, FASE 0–7):

| Fase | Hasil |
| --- | --- |
| 1 | Data layer: `getOrdersPage/summary/updateStatus/delete` + util `format.ts` |
| 2 | API `GET/PATCH/DELETE /api/admin/orders` (+`?summary=1`) + klien `admin-orders-api.ts` |
| 3 | Halaman `/admin/orders` + `orders-manager.tsx` (list, filter, cari, detail dialog, ubah status, ekspor CSV, pagination); nav grup **"Toko"** |
| 4 | Badge generik **`newOrders`** (lead + order satu hook) + **email notifikasi order** |
| 5 | Metrik pesanan di dashboard overview (Total/Baru/Diproses/Omzet) |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅.

**Sisa manual (belum otomatis):**
- [ ] Uji browser: buat order → muncul di `/admin/orders`; filter/cari/detail/ubah status/ekspor.
- [ ] Uji badge pesanan & email notifikasi; cek metrik di dashboard.
- [ ] **Deploy**: `git push` ke `main` → Vercel → uji produksi.

---

## 🎉 Sesi Sebelumnya — Upgrade Sidebar Dashboard Admin

Upgrade menyeluruh sidebar dashboard admin berdasarkan
`docs/2026-10-02-sidebar-dashboard-upgrade.md` (FASE 0–7) **selesai**:

| Fase | Hasil |
| --- | --- |
| 1 | Config nav terpusat (`src/lib/admin-nav.ts`) + komponen baru `components/admin/sidebar/*` |
| 2 | **A11y**: drawer conditional-render + `role="dialog"`/`aria-modal`, focus trap + restore (`use-drawer-focus`), `inert` konten saat drawer buka, `id="konten"` (SkipLink hidup di admin), touch target ≥44px, **fix modified-click** (Ctrl/Cmd+Click buka tab baru) |
| 3 | **IA**: grouping menu + section label; header judul jadi `<p>` (tak lagi dobel h1); metadata `title` per halaman |
| 4 | **Fitur**: badge lead baru, **mode rail** desktop (persist `localStorage`), **user menu** di footer sidebar |
| 5 | **Polish**: rail marker item aktif, scroll-fade nav, animasi backdrop/drawer |
| 6 | **Command palette** `Ctrl/Cmd+K` + shortcut `[` toggle rail + tombol cari di header |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅.

**Sisa manual:** uji manual browser + deploy (belum diverifikasi sebelum sesi Orders).

---



## ✅ Sudah Selesai (ringkasan)

| # | Fitur | Status |
| --- | --- | --- |
| 1 | Landing page (hero, layanan, keunggulan, proses, stats, testimoni, harga, FAQ, CTA, footer) | ✅ |
| 2 | Halaman Layanan (daftar + detail per layanan) | ✅ |
| 3 | Halaman Portofolio (galeri + studi kasus) | ✅ |
| 4 | Halaman Kontak + form ke Firestore (+ fallback WhatsApp) | ✅ |
| 5 | Dashboard Admin (login Firebase Auth, kelola lead & media) | ✅ |
| 6 | Cloudinary signed upload (gambar portofolio) | ✅ |
| 7 | SEO / Performa / Aksesibilitas (metadata, robots, sitemap, JSON-LD, OG image, favicon) | ✅ |
| 8 | Deploy ke Vercel (live di `lktech.vercel.app`) | ✅ |
| 9 | Data kontak dinamis (halaman Pengaturan dashboard) | ✅ |
| 10 | CRUD Portofolio dari dashboard | ✅ |
| 11 | Notifikasi email saat lead masuk (Resend) | ✅ |
| 12 | Blog/Artikel + CRUD dari dashboard | ✅ |
| 13 | Upload gambar sampul langsung di editor blog (`/admin/blog`) | ✅ |
| 14 | Ekspor CSV lead (menghormati pencarian & filter) | ✅ |
| 15 | Grafik tren lead 14 hari terakhir di dashboard | ✅ |
| 16 | Vercel Analytics (`@vercel/analytics`) terpasang di layout | ✅ |
| 17 | Kelola **Layanan** dari dashboard (CRUD penuh termasuk detail, fitur, paket, FAQ) | ✅ |
| 18 | Kelola **FAQ** beranda dari dashboard | ✅ |
| 19 | Kelola **Harga/Paket** beranda dari dashboard | ✅ |
| 20 | Kelola **Konten Beranda** (Keunggulan, Alur Kerja, Statistik, Testimoni) dari dashboard | ✅ |
| 21 | Upgrade dashboard: full-width, header dinamis, toast konsisten, rate limit lead, guard akses admin | ✅ |
| 22 | Upgrade sidebar dashboard: grouping menu, badge lead, mode rail, user menu, a11y drawer (focus trap/dialog), command palette `Ctrl+K` | ✅ |
| 23 | Modul admin Orders/Pesanan: halaman `/admin/orders`, API admin, badge pesanan, notifikasi email order, metrik dashboard | ✅ |
| 24 | Revisi sistem produk: galeri via MediaPicker, lightbox galeri, ratio 16:9, kanvas paket (pan+zoom), alur wajib pilih paket | ✅ |
| 25 | Upgrade portfolio F1–F3: generalisasi galeri, detail profesional, daftar (search/filter/sort/URL/pagination) | ✅ |
| 26 | Upgrade portfolio F4–F6: kelola gambar di form, featured/urutan, badge Contoh, JSON-LD + sitemap | ✅ |
| 27 | Upgrade sistem layanan: landing bergantian, detail hardcoded kaya (Website & Mobile), paket+CTA+tabel banding, hapus menu dashboard | ✅ |
| 28 | Peningkatan blog: kategori, tag, RSS, JSON-LD, artikel terkait + seed 3 artikel | ✅ |
| 29 | Sentry error tracking + event tracking konversi (Vercel Analytics) | ✅ |
| 30 | Halaman harga publik `/harga`: kartu paket, tabel banding, FAQ harga, sitemap, JSON-LD | ✅ |
| 31 | Portal akun pengguna: tab (ringkasan/pesanan/favorit/alamat/profil), pesan lagi, wishlist server, alamat, edit profil | ✅ |
| 32 | Modul Pengguna admin: nomor WhatsApp di profil, halaman `/admin/users` (statistik, cari/filter, detail, blokir, hapus, ekspor CSV) | ✅ |
| 33 | Enforcement blokir user: cegah checkout/keranjang/wishlist/alamat (server `requireActiveUser` + banner & disable UI) | ✅ |
| 34 | Email transaksional ke pembeli: konfirmasi pesanan + update status (template ber-brand, toggle di Pengaturan) | ✅ |
| 35 | Kupon/diskon: modul admin `/admin/coupons`, validasi & penerapan di keranjang, checkout server-authoritative, diskon tampil di WhatsApp/email/admin | ✅ |
| 36 | Dashboard analitik penjualan `/admin/analytics`: grafik omzet & tren pesanan (7/30/90 hari), AOV, produk terlaris, distribusi status | ✅ |
| 37 | Remediasi audit Email/Kupon/Analitik (R0–R7): akurasi completionRate, query terfilter, kuota kupon atomik+restore, email retry+idempotensi+status, observability, konsistensi metrik, halaman `/promo`, delta analitik, drill-down, a11y grafik | ✅ |

---

## 🔜 Belum Terselesaikan

### Prioritas Menengah

#### 0. Remediasi Audit Email/Kupon/Analitik — ✅ SELESAI (R0–R7)
Lihat `docs/2026-10-05-audit-email-kupon-analitik.md`. Seluruh temuan kritis/mayor ditangani.
**Backlog opsional (butuh infra):** `AN-P3` agregasi harian `analytics_daily`, `KP-P3`/`XL-3` rate-limit terdistribusi (Redis/Upstash), `EM-P2` outbox + webhook Resend.

#### 1. Analytics & Monitoring
- [x] Pasang **Vercel Analytics** (`@vercel/analytics` + `<Analytics />` di `layout.tsx`). ⚠️ **Aktifkan di dashboard Vercel** (Project → Analytics) agar data mulai terkumpul.
- [x] Pasang **error tracking (Sentry)** — `@sentry/nextjs` (client/server/edge + `global-error`), aman nonaktif tanpa DSN. ⚠️ **Isi `NEXT_PUBLIC_SENTRY_DSN` di Vercel** agar event terkirim (opsional: `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` untuk source map).
- [x] **Event tracking konversi** (Vercel Analytics): klik WhatsApp, submit lead, add-to-cart, checkout, klik paket — via `src/lib/analytics.ts`.

#### 2. Domain Sendiri — SKIP (diputuskan belum beli domain)
- [ ] Beli domain (mis. `lktech.id` / `lktech.com`).
- [ ] Sambungkan domain ke Vercel.
- [ ] Update `SITE_URL` di env Vercel ke domain baru.
- [ ] Tambahkan domain ke **Firebase Auth → Authorized domains**.
- [ ] Update `docs/identitas-perusahaan.md` bagian kontak/website.

### Prioritas Lanjutan (Nice to Have)

#### 3. Upload Gambar Sampul Langsung di Editor Blog
- [x] Integrasikan `ImageUploader` ke form artikel (`/admin/blog`) agar sampul bisa diunggah langsung, bukan hanya tempel URL. (URL tempel tetap tersedia sebagai cadangan.)

#### 4. Isi Data Asli — SKIP (diisi manual nanti via dashboard)
- [ ] Ganti konten **portofolio** placeholder dengan proyek nyata (via `/admin/projects`).
- [ ] Ganti **testimoni** placeholder dengan yang asli.
- [ ] Isi **logo klien** asli (bagian "Trusted By").
- [ ] Lengkapi `docs/identitas-perusahaan.md` (kontak, sosmed, tagline resmi).
- [ ] Update `docs/identitas-perusahaan.md` & `docs/tech-stack.md` bila ada perubahan.

> Catatan: FAQ dan harga dapat diubah dari dashboard (`/admin/faq`, `/admin/pricing`). **Layanan tidak lagi dikelola dashboard** — sumbernya hardcoded di `src/lib/services.ts` (ubah → deploy).

#### 5. Verifikasi Domain Email (Resend) — SKIP (diputuskan tanpa domain sendiri)
- [ ] Verifikasi domain di Resend agar email notifikasi bisa dikirim ke alamat mana pun.
- [ ] Ganti `EMAIL_FROM` ke `LKTech <notifikasi@domain-anda>`.

> Kondisi saat ini: `EMAIL_FROM=LKTech <onboarding@resend.dev>`, notifikasi hanya bisa ke email terdaftar Resend (`lupyariestaa@gmail.com`). Email ke pembeli umum → **HTTP 403** dari Resend (dilog, tidak menggagalkan order).
> **Keputusan (sesi P1):** SKIP sampai punya domain sendiri (butuh beli domain untuk verifikasi). **Bukan penghalang** — link unduhan tetap diakses via `/akun` → tab Pesanan. Untuk mengaktifkan nanti: beli domain → add domain di Resend → pasang record DNS (SPF/DKIM/MX) di registrar → Verify → set `EMAIL_FROM` ke domain → redeploy. Tidak ada perubahan kode yang diperlukan.

#### 6. Peningkatan Dashboard (opsional)
- [x] Filter/pencarian lead lebih lanjut + ekspor CSV.
- [x] Statistik lead (grafik tren).
- [x] Kelola layanan (services) dari dashboard — **dihapus** (layanan kini hardcoded di `src/lib/services.ts`).
- [x] Kelola FAQ & harga dari dashboard.

#### 7. Peningkatan SEO (lanjutan) — SKIP sementara (tunggu proper dulu)
- [x] Daftarkan ke **Google Search Console** + submit sitemap. ✅ (M1, 2026-10-14)
- [ ] Daftarkan **Google Business Profile**.
- [x] **Halaman kategori/tag blog + RSS + JSON-LD** — lihat `docs/2026-10-03-peningkatan-blog-seo-discovery.md`.

---

## ⚙️ Catatan Teknis Penting

### Environment Variables (di Vercel & `.env.local`)
```
# Firebase (client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server-only)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Admin
ADMIN_EMAILS=lupyariestaa@gmail.com

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# WhatsApp
NEXT_PUBLIC_WHATSAPP_NUMBER=6283159688549

# Site SEO
SITE_URL=https://lktech.vercel.app

# Email (Resend)
RESEND_API_KEY=
EMAIL_FROM=LKTech <onboarding@resend.dev>
LEAD_NOTIFY_EMAILS=lupyariestaa@gmail.com

# Mayar.id (Pembayaran Online — FASE P0)
MAYAR_API_KEY=                    # kosong → checkout fallback ke WhatsApp
MAYAR_MODE=sandbox                # sandbox | production
MAYAR_BASE_URL=                   # opsional override
MAYAR_INVOICE_TTL_MINUTES=1440
MAYAR_WEBHOOK_TOKEN=              # opsional (disarankan): verifikasi webhook

# Unduhan Produk Digital (FASE P1)
DOWNLOAD_TOKEN_SECRET=            # kosong → fallback MAYAR_API_KEY; keduanya kosong = unduhan off
DOWNLOAD_LINK_DAYS=30
DOWNLOAD_MAX_HITS=5

# Kedaluwarsa Order Otomatis (FASE P2)
CRON_SECRET=                      # kosong → endpoint cron NONAKTIF (503, fail-closed)
```

### Firestore Security Rules
- File: `firestore.rules`
- **PENTING:** setiap ada koleksi baru, rules harus di-**Publish ulang** di Firebase Console → Firestore → Rules.
- Koleksi: `leads`, `media`, `media_collections`, `media_audit`, `settings`, `projects`, `articles`, `content`, `users`, `products`, `orders`, `coupons`, `couponCodes`, `downloads`, `carts`, `reviews`, `admin_audit`, `subscribers`, `product_alerts_state`, `wishlist_alerts_log`.
- Subkoleksi: `orders/{id}/emails` (riwayat email), `coupons/{id}/redemptions` (pemakaian per-user).
- Catatan: rule `match /{document=**}` menolak SEMUA akses klien (termasuk subkoleksi), jadi koleksi baru otomatis terlindungi — publish ulang tetap disarankan.

### Deploy
- Repo GitHub: `https://github.com/lupyariestaa/lktech`
- Auto-deploy via Vercel (push ke `main` → redeploy otomatis).
- Setiap perubahan kode → `git push` → tunggu Vercel build.

### Perintah Penting
```bash
npm run dev      # jalankan dev server lokal
npm run build    # build produksi (cek error sebelum push)
npm run lint     # lint
```

---

## 📌 Quick Start Sesi Berikutnya
1. `npm run dev` (pastikan port 3000 tidak dipakai project lain).
2. Baca dokumen ini untuk task yang belum selesai.
3. Pilih task & lanjutkan.

> Dokumentasi setup admin lengkap: lihat `docs/ADMIN-SETUP.md`.
