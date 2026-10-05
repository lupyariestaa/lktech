# 🚀 ROADMAP PENGEMBANGAN LKTech — Konsep & Arah Lanjutan

> **Status:** 📝 Rencana (belum dieksekusi) — dokumen keputusan pengembangan.
> **Disusun:** sesi pasca-Remediasi Audit (R0–R7).
> **Basis:** audit kondisi sistem aktual (kode, rute, data layer, model bisnis).
> **Prasyarat baca:** `TASK-SELANJUTNYA.md`, `docs/2026-10-05-audit-email-kupon-analitik.md`, `docs/identitas-perusahaan.md`, `docs/tech-stack.md`.

---

## 1. Ringkasan Eksekutif

LKTech saat ini adalah **website multi-peran** yang sudah cukup matang:

- **Sisi publik:** landing page, layanan (detail + paket), produk digital (keranjang + checkout), portofolio, blog (SEO lengkap), harga, promo, kontak.
- **Sisi transaksi:** keranjang → checkout WhatsApp server-authoritative, order, kupon/diskon, email transaksional ke pembeli.
- **Sisi akun:** portal user (pesanan, favorit, alamat, profil, WhatsApp).
- **Sisi admin:** dashboard lengkap (lead, order, produk, kupon, pengguna, analitik, media library, konten, pengaturan) + RBAC admin + badge realtime ringan.
- **Fondasi teknis:** Next.js 16 (App Router, RSC), Firebase (Auth + Firestore + Admin SDK), Cloudinary, Resend, Vercel Analytics + Sentry, rate-limit, observability dasar.

**Diagnosis strategis:** sistem sudah **"breadth-first" (luas & lengkap)** tetapi masih **"shallow" pada beberapa sumbu bernilai tinggi** — terutama **konversi, retensi, dan monetisasi**, serta **kepercayaan/operasional** (pembayaran belum otomatis, belum ada ulasan, belum ada notifikasi kanal sekunder).

**Fokus roadmap ini:** menggeser dari *"website yang punya banyak fitur"* → *"mesin akuisisi & penjualan yang menghasilkan"*.

Tiga tema besar:
1. **🔁 Konversi & Closing** — kurangi friksi dari "tertarik" → "bayar".
2. **❤️ Retensi & Engagement** — datangkan kembali pengunjung & pembeli.
3. **🛡️ Kepercayaan & Skala** — bukti sosial, reliabilitas, siap tumbuh.

---

## 2. Kondisi Sistem Saat Ini (Baseline)

### 2.1 Kekuatan (yang sudah bagus — pertahankan)
- Arsitektur **server-authoritative** (harga, diskon, stok divalidasi ulang) → aman.
- **SEO kuat**: metadata, sitemap, JSON-LD, RSS, kategori/tag blog.
- **Observability**: Sentry + Vercel Analytics + event konversi + status email.
- **Admin experience** modern: command palette, badge, rail mode, a11y.
- **Integritas data** pasca-remediasi: kuota kupon atomik, email idempotent & ter-retry.

### 2.2 Celah bernilai tinggi (peluang pengembangan)
| Sumbu | Kondisi sekarang | Dampak bisnis |
| --- | --- | --- |
| **Pembayaran** | Checkout via WhatsApp (manual) | Friksi tinggi, tak bisa jualan saat admin tidur, sulit skala |
| **Bukti sosial** | Testimoni statis/placeholder + **ulasan & rating produk** (verified purchase, moderasi, JSON-LD) | ✅ Ulasan selesai; testimoni masih placeholder |
| **Retensi** | Tak ada kanal kembali (email marketing, notif) | Sekali beli, lalu hilang |
| **Konversi produk** | Hanya halaman detail + CTA | Tak ada bundling, upsell, urgency |
| **Operasional** | Admin hapus kupon = arsip; lead manual | Beban manual, laporan belum otomatis |
| **Kecepatan konten** | Blog bagus tapi artikel masih sedikit | SEO belum "bertani" traffic |
| **Program loyalitas** | Belum ada | Nol repeat engagement |

---

## 3. Peta Roadmap (Tema → Inisiatif → Prioritas)

Legenda prioritas: **P0** (fondasi/menutup celah) · **P1** (pertumbuhan) · **P2** (diferensiasi) · **P3** (nice-to-have).

```
TEMA 1 — KONVERSI & CLOSING
  P0  Pembayaran online (Midtrans/Xendit) + status otomatis
  P1  Bundling & upsell produk ("sering dibeli bersama")
  P1  Urgency & trust badges (stok, "X orang lihat hari ini")
  P2  Abandoned checkout recovery (email/WA)

TEMA 2 — RETENSI & ENGAGEMENT
  P1  Program loyalitas / poin / tier pelanggan
  P1  Email marketing ringan (newsletter + broadcast promo)
  P2  Notifikasi kanal sekunder (WhatsApp/Web Push)
  P2  Wishlist → harga turun / back-in-stock alert

TEMA 3 — KEPERCAYAAN & SKALA
  P0  Ulasan & rating produk (dengan moderasi)
  P1  Lead scoring & pipeline CRM mini
  P1  Laporan & ekspor otomatis (harian/mingguan)
  P2  Multi-bahasa (ID/EN) & multi-currency
  P2  PWA (installable, offline ringan)

TEMA 4 — OPERASIONAL & KUALITAS TEKNIS
  P1  Audit log admin global
  P1  Rate-limit terdistribusi (Upstash) + webhook email
  P2  Agregasi harian analitik (skala)
  P3  Uji otomatis (unit/E2E) & CI
```

---

## 4. TEMA 1 — Konversi & Closing 🔁

### 🎯 Tujuan
Memperpendek jalan dari minat → pembayaran, dan memungkinkan penjualan tanpa kehadiran manual.

### 1.1 [P0] Pembayaran Online Otomatis
**Kenapa menarik:** ini *perubahan level bisnis*. Checkout WhatsApp membatasi konversi (menunggu balasan admin, mobile-unfriendly, tak terlacak). Dengan payment gateway, order bisa lunas 24/7.

**Rancangan:**
- Integrasi **Midtrans Snap** atau **Xendit Invoice** (populer di Indonesia, mendukung QRIS/VA/e-wallet).
- Alur: `createOrder` → buat transaksi → **halaman bayar** → **webhook** pembayaran → set status `dibayar` → trigger email + (opsional) pembuatan akses produk digital.
- **Webhook idempoten** (kunci `orderId+status`), verifikasi signature.
- Status order diperluas: `menunggu_bayar`, `dibayar`, `diproses`, `selesai`, `dibatalkan`, `kedaluwarsa`.
- **Kebijakan kedaluwarsa**: order belum bayar auto-`kedaluwarsa` (cron/`after()`) → **kembalikan kuota kupon** (integrasi dengan `restoreCouponUsage`).

**Kompleksitas:** tinggi · **Nilai:** sangat tinggi · **Ketergantungan:** akun merchant + verifikasi bisnis gateway.

### 1.2 [P1] Bundling & Cross-sell Produk
**Kenapa menarik:** AOV naik tanpa traffic tambahan.

**Rancangan:**
- Field produk: `bundlesWith: string[]` (slug) & `relatedSlugs`.
- Section **"Sering dibeli bersama"** di detail produk (server-rendered, ambil dari keranjang historis ATAU kurasi manual admin).
- **"Diskon bundel"**: kupon khusus yang mensyaratkan ≥2 produk tertentu (`appliesToSlugs` + `minItems` → perluas `Coupon` model, lihat backlog `KP-P2`).

### 1.3 [P1] Urgency & Trust Badges
**Rancangan:**
- Badge stok ("Sisa N paket", dari kuota varian bila ada).
- "N pembeli minggu ini" (dari `orders` agregat, cache ringan).
- Garansi/kebijakan jelas di samping CTA beli.
- **Etis**: hindari fake countdown; gunakan data nyata.

### 1.4 [P2] Abandoned Checkout Recovery
**Rancangan:**
- Simpan "keranjang belum selesai" (server-side draft saat user login).
- Email/WA reminder H+1 bila belum checkout (opt-in, sesuai kebijakan privasi).
- Butuh kanal email marketing (lihat 2.2).

---

## 5. TEMA 2 — Retensi & Engagement ❤️

### 🎯 Tujuan
Mengubah pembeli sekali menjadi pelanggan berulang, dan pengunjung menjadi audiens.

### 2.1 [P1] Program Loyalitas / Poin
**Rancangan:**
- Poin dari pembelian (rasio Rp tertentu) & aksi (ulasan, referral).
- **Tier** (Bronze/Silver/Gold) dengan benefit (diskon, akses promo awal).
- Tukar poin → kupon otomatis (integrasi erat dengan modul kupon).
- Tampil di `/akun` (tab "Poin") + ringkasan di admin.

### 2.2 [P1] Email Marketing Ringan
**Rancangan:**
- **Newsletter** opt-in (form footer + halaman promo).
- **Broadcast** dari admin (kirim promo/konten) via Resend, dengan template & segmentasi sederhana (semua / pernah beli / belum pernah).
- **Unsubscribe** patuh (token), log pengiriman.
- Integrasi: kupon berbatas waktu → broadcast otomatis.

### 2.3 [P2] Notifikasi Kanal Sekunder
**Rancangan:**
- **WhatsApp Cloud API** (pesan konfirmasi/status) sebagai pelengkap email.
- **Web Push** (PWA) untuk promo & restock.
- Prioritas: WhatsApp (relevan pasar Indonesia) > Web Push.

### 2.4 [P2] Alert Wishlist
**Rancangan:**
- "Harga turun" & "kembali tersedia" untuk item di wishlist → email/push.
- Memanfaatkan `WishlistProvider` + koleksi `users/*/wishlist` yang sudah ada.

---

## 6. TEMA 3 — Kepercayaan & Skala 🛡️

### 3.1 [P0] Ulasan & Rating Produk — ✅ SELESAI
**Kenapa menarik:** bukti sosial = penggerak konversi terbesar untuk jualan online.

> **✅ Selesai (kode, R0–R6):** `docs/2026-10-05-ulasan-rating-produk.md` — ulasan verified-purchase (hanya order `selesai`), moderasi admin (`/admin/reviews`), agregat rating di kartu/detail, **JSON-LD `AggregateRating`** (SEO).

**Rancangan:**
- Hanya pembeli berstatus `selesai` boleh mengulas (verified purchase).
- Rating bintang + ulasan + (opsional) foto.
- **Moderasi admin** (approve/reject) sebelum tampil.
- Agregat rating di kartu produk + markah **JSON-LD `AggregateRating`** (SEO bintang di Google).
- Endpoint: `GET/POST /api/products/[slug]/reviews`, `PATCH /api/admin/reviews`.

### 3.2 [P1] Lead Scoring & Pipeline CRM Mini
**Rancangan:**
- Skor lead dari sumber (form vs WA), layanan yang diminta, panjang pesan, waktu respons.
- **Kanban pipeline** sederhana (Baru → Dihubungi → Proposal → Menang/Kalah) di `/admin/leads`.
- Catatan aktivitas per lead (timeline).
- Sinkron dengan order bila lead jadi pembeli (konversi terlacak).

### 3.3 [P1] Laporan & Ekspor Otomatis
**Rancangan:**
- **Laporan mingguan** (email otomatis ke admin): omzet, order, lead, kupon terpakai, produk terlaris.
- **Ekspor** jadwal manual → PDF/CSV (analitik, order, kupon).
- Ringkasan "kesehatan bisnis" di dashboard (KPI vs minggu lalu — memanfaatkan `deltas` yang sudah ada).

### 3.4 [P2] Multi-bahasa & Multi-currency
**Rancangan:**
- i18n ringan (ID default, EN untuk klien internasional/portofolio).
- Mata uang tampilan (IDR default) bila menargetkan klien luar.
- Pertimbangkan hanya bila memang ada permintaan pasar.

### 3.5 [P2] PWA
**Rancangan:**
- Manifest + service worker: installable, cache aset ringan, offline fallback.
- Titik masuk notifikasi push (lihat 2.3).

---

## 7. TEMA 4 — Operasional & Kualitas Teknis ⚙️

### 4.1 [P1] Audit Log Admin Global
- Catat aksi admin penting (ubah status order, hapus/produk, ubah pengaturan, blokir user) ke `admin_audit/{id}`.
- Halaman `/admin/audit` dengan filter. (Pola sudah ada di `media_audit`.)

### 4.2 [P1] Rate-limit Terdistribusi + Webhook Email
- Ganti `rate-limit.ts` in-memory → **Upstash Redis** (benar di multi-instance serverless).
- **Webhook Resend** (`delivered/bounced/complained`) → update status email & tandai bounce (backlog `EM-P2`).

### 4.3 [P2] Agregasi Harian Analitik
- `analytics_daily/{date}` di-update pada transisi order → analitik O(1) tanpa scan (backlog `AN-P3`).

### 4.4 [P3] Uji Otomatis & CI
- Unit test rumus & util (sudah dimulai: `npm run test:metrics`).
- E2E Playwright untuk alur kritis: checkout, kupon, order admin, login.
- CI GitHub Actions: `tsc` + `lint` + `test` + `build` per PR.

### 4.5 [P3] Pengerasan & DX
- Validasi env "fail loud" saat startup (lanjutan `XL-5`).
- Feature flags ringan untuk rilis bertahap.
- Storybook/komponen katalog (opsional).

---

## 8. Urutan Eksekusi yang Disarankan (gelombang)

Gelombang dibuat agar tiap rilis **mandiri & bernilai**, dengan ketergantungan dijaga.

### 🌊 Gelombang 1 — "Closing & Trust" (paling berdampak)
1. **[P0] Pembayaran online** (Midtrans/Xendit) + status order baru + kedaluwarsa + restore kupon.
2. **[P0] Ulasan & rating produk** (+ JSON-LD) — bukti sosial untuk mendampingi pembayaran.
3. **[P1] Bundling & cross-sell** produk.

### 🌊 Gelombang 2 — "Retensi"
4. **[P1] Program loyalitas / poin**.
5. **[P1] Email marketing ringan** (newsletter + broadcast).
6. **[P1] Alert wishlist**.

### 🌊 Gelombang 3 — "Operasional & CRM"
7. **[P1] Lead scoring & pipeline CRM mini**.
8. **[P1] Laporan & ekspor otomatis**.
9. **[P1] Audit log admin** + **rate-limit terdistribusi/Upstash**.

### 🌊 Gelombang 4 — "Diferensiasi & Skala"
10. **[P2] Notifikasi WhatsApp/Web Push**, **PWA**, **multi-bahasa**.
11. **[P2] Agregasi harian analitik**, **CI + E2E**.

---

## 9. Matriks Nilai vs Usaha

```
NILAI TINGGI
   │  Pembayaran Online(P0)●        Ulasan(P0)●
   │  Loyalitas(P1)●                Bundling(P1)●
   │  Email Marketing(P1)●          CRM Lead(P1)●
   │  Laporan Otomatis(P1)●
   │  Alert Wishlist(P2)●   WhatsApp/Push(P2)●
   │  Audit Log(P1)●   Upstash(P1)●  PWA(P2)●
   │  Agregasi Harian(P2)●  Multi-bahasa(P2)●
   │  CI+E2E(P3)●
NILAI RENDAH ─────────────────────────────────────
              USAHA RENDAH →→→→→→→ USAHA TINGGI
```

---

## 10. Rekomendasi Keputusan (yang saya sarankan)

> Sebagai "keputusan pengembangan", ini prioritas terbaik untuk LKTech saat ini:

1. **Mulai dari Pembayaran Online (P0).** Ini satu-satunya fitur yang *mengubah model bisnis*: dari "jualan waktu admin online" → "jualan 24/7". Sekaligus membuka jalan otomatisasi (status otomatis, akses produk digital, laporan).
2. **Lanjut Ulasan & Rating (P0).** Murah dibangun, berdampak besar ke konversi, dan memberi nilai SEO (bintang di Google).
3. **Baru Retensi** (loyalitas + email marketing) setelah ada volume transaksi — retensi tanpa penjualan dulu = prematur.
4. **Operasional (audit log, Upstash, laporan)** dikerjakan paralel/selipan karena berdampak ke kepercayaan & stabilitas.

**Prinsip:** jangan menabrak pagar — setiap fitur baru tetap mengikuti pola yang sudah sehat di proyek ini: **server-authoritative, observability, a11y, dan dokumentasi fase**.

---

## 11. Definition of Done (per inisiatif)

1. `tsc` bersih, `lint` bersih, `build` sukses, ada unit test untuk logika inti.
2. Akses & uang **hanya** divalidasi server (harga, status bayar, kepemilikan).
3. Observability: event tracking + (bila ada) status tersimpan.
4. A11y & responsif (mobile-first).
5. Backward-compatible (data lama tetap jalan) + dokumentasi fase diperbarui.

---

## 12. Lampiran — Backlog Teknis Tertunda (dari audit sebelumnya)

| Kode | Item | Alasan ditunda |
| --- | --- | --- |
| `AN-P3` | Agregasi harian `analytics_daily` | Perlu perubahan model tulis + migrasi |
| `KP-P2` | Kupon lanjutan (`appliesToSlugs`/`minItems`) | Menunggu bundling (Tema 1.2) |
| `KP-P3`/`XL-3` | Rate-limit terdistribusi | Perlu akun Upstash |
| `EM-P2` | Outbox + webhook Resend | Perlu domain terverifikasi +
 webhook |
| `EM-P3` | Pratinjau template email | Nice-to-have |
| `KP-M4` | Anti-enumeration kode kupon | Perlu rate-limit terdistribusi |

---

## 13. Cara Memakai Dokumen Ini

1. Pilih **gelombang** & **inisiatif** yang disetujui.
2. Untuk inisiatif terpilih, buat dokumen fase detail tersendiri (`docs/YYYY-MM-DD-<slug>.md`) mengikuti konvensi proyek.
3. Catat progres di `TASK-SELANJUTNYA.md`.
4. Tandai inisiatif yang selesai di dokumen ini (ubah prioritas/status).

> Dokumen ini adalah **peta arah**, bukan rencana teknis per-langkah. Eksekusi tiap inisiatif tetap butuh dokumen fase sendiri.
