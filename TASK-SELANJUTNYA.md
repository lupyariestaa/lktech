# Task Selanjutnya — LKTech Website

> Dokumen ini mencatat pekerjaan yang **belum terselesaikan** & rencana lanjutan.
> Terakhir diperbarui: sesi **P2 — alur JASA, invoice manual, cron kedaluwarsa**.
>
> 🗺️ **Arah pengembangan jangka menengah–panjang:** lihat **[`docs/2026-10-06-roadmap-pengembangan.md`](docs/2026-10-06-roadmap-pengembangan.md)** (peta tema: Konversi & Closing · Retensi · Kepercayaan & Skala · Operasional). Rekomendasi utama: **Pembayaran online (P0)** → **Ulasan & rating (P0)** → Retensi.
>
> 💳 **Fase detail Konversi & Closing:** **[`docs/2026-10-06-fase-konversi-closing.md`](docs/2026-10-06-fase-konversi-closing.md)** — gateway **Mayar.id** (Headless API V2), fulfillment dua jalur (INSTAN download / JASA konfirmasi), bundling, urgency, abandoned checkout. **FASE P0 & P1 selesai (terverifikasi sandbox).**
> 🛠️ **Setup pembayaran & unduhan (langkah manual):** **[`docs/2026-10-06-setup-pembayaran-mayar.md`](docs/2026-10-06-setup-pembayaran-mayar.md)**.

---

## 🎉 Sesi Terakhir — FASE P2: Alur JASA & Kedaluwarsa

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
  ⏭️ P3  Bundling & cross-sell  ← NEXT
  ⬜ P4  Urgency & trust
  ⬜ P5  Abandoned checkout
  ⬜ P6  QA/observability + docs
```

### NEXT TASK (disarankan): FASE P3 — Bundling & Cross-Sell
Lihat checklist lengkap di `docs/2026-10-06-fase-konversi-closing.md` §7 → "FASE P3 — Bundling & Cross-Sell". Inti:
1. Produk: `relatedSlugs: string[]` (manual, admin) + UI "Sering dibeli bersama" (server-rendered) di detail produk.
2. Keranjang: saran cross-sell bila relasi ada.
3. Kupon bundel (`appliesToSlugs`, `minItems`) di `validateCoupon` (server-authoritative).
- **DoD:** bundel tampil & diskon bundel tervalidasi server.

### Langkah manual yang MASIH tertunda (milik pemilik)
- **FASE P2 — cron:** set `CRON_SECRET` di Vercel (rahasia acak) → jadwalkan pemanggilan dari cron eksternal ke `GET https://<domain>/api/cron/expire-orders?token=<secret>` → `{ ok:true, expired:N }`. (Vercel Cron bawaan butuh plan Pro, jadi pakai cron eksternal gratis.)
- **Produksi Mayar:** daftar `web.mayar.id` → verifikasi bisnis → buat API key produksi → set `MAYAR_MODE=production` + `MAYAR_API_KEY` di Vercel → daftarkan webhook produksi (`.../api/webhooks/mayar?token=<MAYAR_WEBHOOK_TOKEN>`) → redeploy.
- **Domain sendiri:** belum dibeli (SKIP) → memblokir verifikasi email Resend & domain kustom.
- **Isi data asli:** portofolio, testimoni, logo klien (SKIP, manual via dashboard).

### Konvensi kerja proyek ini (WAJIB diikuti)
1. **Dokumentasi dulu → baru kode.** Setiap inisiatif besar punya `docs/YYYY-MM-DD-<slug>.md` dengan checklist fase.
2. **Pola sehat:** server-authoritative (harga/status/akses hanya di server), observability (log + status tersimpan), a11y, mobile-first, **backward-compatible** (data lama tetap jalan).
3. **QA tiap fase:** `npx tsc --noEmit` bersih · `npx eslint .` bersih · `npm run build` sukses · unit test (`npm run test:metrics` / `test:fulfillment` / `test:downloads`).
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
- [ ] Daftarkan ke **Google Search Console** + submit sitemap.
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
- Koleksi: `leads`, `media`, `media_collections`, `media_audit`, `settings`, `projects`, `articles`, `content`, `users`, `products`, `orders`, `coupons`, `couponCodes`, `downloads`.
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
