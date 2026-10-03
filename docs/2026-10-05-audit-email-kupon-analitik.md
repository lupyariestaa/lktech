# AUDIT & RENCANA PENINGKATAN — Email Transaksional, Kupon/Diskon, Analitik Penjualan

> **Status dokumen:** 📝 **Rencana** (belum dieksekusi — untuk sesi berikutnya)
> **Disusun:** 2026-10-05
> **Jenis:** Audit menyeluruh (gap flow/backend/API/frontend/edge-case) + task perbaikan & pengembangan lanjutan.
> **Cakupan:** 3 sistem yang baru dibangun — (A) Email Transaksional ke Pembeli, (B) Kupon/Diskon, (C) Dashboard Analitik Penjualan.
> **Prasyarat baca:** `docs/2026-10-05-email-transaksional-pembeli.md`, `docs/2026-10-05-kupon-diskon.md`, `docs/2026-10-05-analitik-penjualan.md`, `docs/2026-10-02-orders-admin-module.md`, `docs/README.md`.

---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Metode Audit](#2-metode-audit)
3. [Bagian A — Email Transaksional ke Pembeli](#3-bagian-a--email-transaksional-ke-pembeli)
4. [Bagian B — Kupon / Diskon](#4-bagian-b--kupon--diskon)
5. [Bagian C — Dashboard Analitik Penjualan](#5-bagian-c--dashboard-analitik-penjualan)
6. [Temuan Lintas-Sistem](#6-temuan-lintas-sistem)
7. [Peta Prioritas & Ketergantungan](#7-peta-prioritas--ketergantungan)
8. [TASK IMPLEMENTATION FLOW (FASE R0–R7)](#8-task-implementation-flow-fase-r0r7)
9. [Definition of Done Global](#9-definition-of-done-global)
10. [Lampiran — Ringkasan Semua Temuan](#10-lampiran--ringkasan-semua-temuan)

---

## 1. Ringkasan Eksekutif

Ketiga sistem berfungsi & punya fondasi arsitektur yang baik (agregasi/perhitungan server-authoritative, best-effort email, snapshot kupon di order, tipe aman-klien). Namun audit menemukan **gap integritas data, reliabilitas, akurasi, dan observability** yang perlu diperbaiki sebelum sistem dipakai serius.

**Temuan paling kritis (harus segera):**
1. **`completionRate` analitik salah** — pembilang berbasis jendela periode, **penyebut memakai seluruh riwayat order** → angka selalu turun mendekati 0 (salah total). `AN-C1`.
2. **Query analitik menarik SELURUH koleksi `orders`** tanpa filter jendela/`select`/cache → memburuk linear & doc-comment menyesatkan. `AN-C2`.
3. **Kupon: kuota tidak atomik & tidak dikembalikan saat batal/hapus** → kuota bocor, batas per-user bisa dilampaui. `KP-C1`, `KP-C2`.
4. **Email: kegagalan kirim hilang senyap** (fire-and-forget tanpa status/retry/jejak) + **email ganda** (tak ada idempotensi) + **domain Resend default membuat email pembeli gagal**. `EM-C1`, `EM-C2`, `EM-C3`.

**Rekomendasi urutan:** perbaiki **integritas & akurasi** dulu (AN-C1/C2, KP-C1/C2, EM-C2/C3, EM-C1), lalu **observability** (status email, statistik kupon, metrik rekonsiliasi), lalu **pengembangan proper** (halaman promo, perbandingan periode, delta).

---

## 2. Metode Audit

- Penelusuran langsung kode ketiga sistem (server + klien) + verifikasi manual baris kunci.
- Format temuan: **`[KODE] Judul`** — *Severity* — *Lokasi* — Masalah — Dampak — **Perbaikan**.
- Severity: 🔴 Tinggi (integritas/keamanan/akurasi) · 🟠 Menengah · 🔵 Rendah.
- Prefix kode: `EM-` (email), `KP-` (kupon), `AN-` (analitik), `XL-` (lintas-sistem).

---

## 3. Bagian A — Email Transaksional ke Pembeli

### 3.1 Temuan

**[EM-C1] Domain Resend default → email ke pembeli umum GAGAL senyap** — 🔴 Tinggi
- **Lokasi:** `src/lib/email-order.ts:25`, `.env.example:45-47`, `src/components/admin/settings-manager.tsx`
- **Masalah:** `fromEmail` default `"LKTech <onboarding@resend.dev>"`. Resend hanya mengizinkan `onboarding@resend.dev` mengirim ke email pemilik akun. Email ke pembeli umum **ditolak**.
- **Dampak:** Fitur inti tak berfungsi di produksi sebelum domain diverifikasi; UI menyatakan aktif; hanya `console.error`.
- **Perbaikan:** deteksi mode "test-only" (`EMAIL_FROM` memakai `resend.dev`) → tampilkan **banner peringatan** di Pengaturan & email-notifier; catatan wajib verifikasi domain; (opsional) endpoint uji deliverability ke alamat non-pemilik.

**[EM-C2] Kegagalan kirim hilang (fire-and-forget, tanpa status/retry/jejak)** — 🔴 Tinggi
- **Lokasi:** `src/app/api/orders/route.ts:259-263`, `src/app/api/admin/orders/route.ts:115-123`, `src/lib/email-order.ts`
- **Masalah:** Hasil `EmailResult` dibuang; tak ada retry; tak ada `confirmationEmailAt`/status di order.
- **Dampak:** Email gagal → pembeli tak dapat, admin tak tahu, tak bisa kirim ulang.
- **Perbaikan:** simpan status ke order (`confirmationEmailAt`, `confirmationEmailStatus`, `lastStatusEmailAt`, `lastStatusEmailStatus`); retry sederhana (2–3× backoff) untuk error network/5xx; log terstruktur dengan `order.id`.

**[EM-C3] Tidak ada idempotensi → email status ganda** — 🔴 Tinggi
- **Lokasi:** `src/app/api/admin/orders/route.ts:110-125`, `src/lib/orders.ts:197-209`
- **Masalah:** update status sama berulang tetap mengirim email; dua admin/tab bisa PATCH bareng.
- **Dampak:** Pembeli menerima email berulang.
- **Perbaikan:** server baca order dulu; bila `order.status === newStatus` → skip (return `unchanged`). Simpan `lastNotifiedStatus`; kirim hanya bila berbeda.

**[EM-H1] Jalur DELETE order tanpa email; batal/hapus tak membebaskan kuota kupon** — 🟠 Menengah
- **Lokasi:** `src/app/api/admin/orders/route.ts:138-156`
- **Dampak:** pembeli bisa memegang order yang "lenyap"; kuota kupon terbuang (lihat KP-C2).
- **Perbaikan:** arahkan hapus → status `dibatalkan` (yang mengirim email) atau kirim notifikasi pembatalan sebelum delete; larang hard-delete untuk status non-`baru`.

**[EM-H2] Status email tanpa guard runtime `STATUS_COPY`** — 🟠 Menengah
- **Lokasi:** `src/lib/email-order.ts` (`sendOrderStatusToBuyer`)
- **Dampak:** bila kelak ada status baru tanpa entri `STATUS_COPY` → throw senyap.
- **Perbaikan:** guard `if (!copy) return { ok:false, error:"status_unknown" }`.

**[EM-H3] Settings dibaca async di `.then()` (race serverless)** — 🟠 Menengah
- **Lokasi:** `src/app/api/admin/orders/route.ts:115-119`
- **Dampak:** di serverless, background `.then` bisa tak jalan → email hilang senyap.
- **Perbaikan:** baca settings & kirim dalam alur `await`; bila ingin non-blocking, pakai `after()`/`waitUntil` Next.js.

**[EM-H4] `RESEND_API_KEY` kosong → silent skip tanpa peringatan** — 🟠 Menengah
- **Perbaikan:** expose `buyerEmailConfigured` di Pengaturan + banner; `console.warn` sekali.

**[EM-M1..M7] Minor:** email tanpa tanggal pesanan; inkonsistensi simbol minus (text vs HTML); `esc()` tanpa apostrof + tak ada `word-break`; URL email bergantung `SITE_URL` fallback; tak ada status kirim di UI order; teks `cart-view` bisa menyesatkan; test email hanya admin (bukan template pembeli).

### 3.2 Pengembangan proper
- **[EM-P1] Kirim ulang email + riwayat email per order** (tombol di detail order; subkoleksi `orders/{id}/emails`).
- **[EM-P2] Outbox + retry/backoff + webhook Resend** (`email.delivered/bounced/complained`) untuk status pengiriman nyata & deteksi bounce.
- **[EM-P3] Pratinjau/dry-run template email pembeli** di dashboard.

---

## 4. Bagian B — Kupon / Diskon

### 4.1 Temuan

**[KP-C1] Kuota & batas per-user non-atomik + redeem fire-and-forget** — 🔴 Tinggi
- **Lokasi:** `src/app/api/orders/route.ts` (redeem), `src/lib/coupons.ts` (`validateCoupon`, `redeemCoupon`)
- **Masalah:** `validateCoupon` cek kuota → `createOrder` → `redeemCoupon` **tanpa await** (baca-lalu-tulis, bukan transaksi). Dua checkout bersamaan bisa melampaui `usageLimit`; bila fungsi gagal, kuota **tak berkurang sama sekali**.
- **Dampak:** kuota bocor/berlebih; `usageCount`/`usedBy` tak bisa dipercaya.
- **Perbaikan:** `runTransaction` (re-read + cek ulang `usageLimit`/`limitPerUser` + `FieldValue.increment(1)` + `arrayUnion`) **sebelum** `createOrder` (reservasi), rollback bila order gagal; atau `await` + tandai `coupon_pending` untuk rekonsiliasi.

**[KP-C2] Kuota tidak dikembalikan saat order dibatalkan/dihapus** — 🔴 Tinggi
- **Lokasi:** `src/app/api/admin/orders/route.ts:88-157`, `src/lib/orders.ts`
- **Dampak:** kuota bocor permanen; user dengan `limitPerUser:1` tak bisa pakai kupon lagi setelah order batal.
- **Perbaikan:** `restoreCouponUsage(couponId, uid)` (atomik); panggil saat transisi → `dibatalkan` (idempoten, cek status lama) & `DELETE`; simpan `couponId` di order (lihat KP-M1).

**[KP-H1] `usedBy` dibatasi 1000 → batas per-user tak akurat setelah batas** — 🟠 Menengah
- **Lokasi:** `src/lib/coupon-types.ts` (`MAX_COUPON_USED_BY`), `src/lib/coupons.ts`
- **Dampak:** `limitPerUser` tak ditegakkan untuk kupon populer; `slice()` bisa membuang uid lama → user lolos lagi.
- **Perbaikan:** ganti sumber kebenaran per-user dengan **subkoleksi/kounter** (`coupons/{id}/redemptions/{uid}` atau counter `FieldValue.increment`); `usedBy` hanya untuk sampel tampilan.

**[KP-H2] Kode kupon tak punya constraint unik sejati (race + duplikat)** — 🟠 Menengah
- **Lokasi:** `src/lib/coupons.ts` (`isCouponCodeTaken`, `getCouponByCode`), `src/app/api/admin/coupons/route.ts`
- **Masalah:** pola check-then-act; `getCouponByCode` `.limit(1)` bisa mengembalikan kupon acak bila duplikat.
- **Perbaikan:** jadikan `coupons/{code}` sebagai **document id** (create-only → unik atomik); atau koleksi penanda `couponCodes/{code}` dalam transaksi.

**[KP-H3] Validasi tanggal fail-open & timezone** — 🟠 Menengah
- **Lokasi:** `src/components/admin/coupons-manager.tsx` (`localToIso`), `src/lib/coupons.ts`, `src/lib/api-schemas.ts`
- **Masalah:** string tanggal invalid **diabaikan** (kupon jadi tanpa batas); tak ada validasi `startsAt < endsAt`; `datetime-local` → `new Date(local)` bergantung TZ admin.
- **Perbaikan:** schema `z.string().datetime()`/`z.coerce.date()` + tolak invalid (**fail-closed**); refine `startsAt < endsAt`; kirim ISO + offset eksplisit.

**[KP-M1] Order tidak menyimpan `couponId`** — 🔵 Rendah
- **Dampak:** restore/audit kupon sulit (hanya `code` yang bisa berubah/dihapus).
- **Perbaikan:** tambah `couponId?: string` di `OrderCoupon`; simpan & normalkan.

**[KP-M2] Tak ada statistik per-kupon (total diskon, jumlah order, daftar order)** — 🔵 Rendah
- **Perbaikan:** agregasi per kupon (Σ`coupon.discount`, jumlah order) + endpoint daftar order per kupon; tampilkan di kartu kupon + CSV.

**[KP-M3] `deleteCoupon` hard-delete** — 🔵 Rendah
- **Perbaikan:** **soft-delete** (`archived: true`) agar restore & laporan tetap utuh.

**[KP-M4] Endpoint validasi bisa enumeration kode** — 🔵 Rendah
- **Perbaikan:** pesan generik seragam + rate-limit berbasis kode/IP + audit log.

**[KP-M5] Kupon hilang saat refresh; diskon tak di-recompute saat keranjang berubah; total bisa 0** — 🔵 Rendah
- **Perbaikan:** persist kupon (`localStorage`) & re-validasi saat subtotal berubah; definisikan kebijakan **total 0** (tandai `freeOrder`/notifikasi khusus/"Gratis").

### 4.2 Pengembangan proper
- **[KP-P1] Prefill kode dari URL** (`/keranjang?promo=LAUNCH`) + halaman **`/promo`** publik + badge "ada promo" di produk.
- **[KP-P2] Model kupon lanjutan**: `appliesToSlugs`/kategori/`minItems` + `eligibleSubtotal`.
- **[KP-P3] Rate-limit terdistribusi** (Redis/Upstash) — saat ini in-memory per-instance.

---

## 5. Bagian C — Dashboard Analitik Penjualan

### 5.1 Temuan

**[AN-C1] `completionRate` memakai `orders.length` (seluruh riwayat) — BUG AKURASI** — 🔴 Tinggi
- **Lokasi:** `src/lib/sales-analytics.ts:156` (`const totalOrders = orders.length`) & `:172`
- **Masalah:** pembilang `completed` ter-window, tetapi penyebut `orders.length` = **seluruh koleksi**. Rasio merosot mendekati 0 seiring waktu.
- **Dampak:** metrik kualitas operasional salah total.
- **Perbaikan:** penyebut = jumlah order **dalam jendela** (mis. `Object.values(statusBreakdown).reduce(...)`); dokumentasikan rumus di tipe & hint UI.

**[AN-C2] Query menarik seluruh koleksi `orders` tanpa filter/select/cache** — 🔴 Tinggi
- **Lokasi:** `src/lib/sales-analytics.ts:80` (`db.collection("orders").get()`)
- **Masalah:** doc-comment mengklaim `where("createdAtISO", ">=", cutoff)` tetapi **tidak ada** di kode; tak ada `select()`; `force-dynamic` + `no-store` → full scan tiap toggle.
- **Dampak:** biaya & latensi memburuk linear; klaim dokumen menyesatkan.
- **Perbaikan:** tambah `where(createdAtISO >= cutoff)` + `.select("status","total","createdAtISO","items","coupon","subtotal")`; cache singkat per `(days, mode)`; perbaiki doc-comment; jangka panjang → agregasi harian (`analytics_daily/{date}`).

**[AN-H1] Omzet produk (bruto) ≠ omzet total (netto setelah diskon)** — 🟠 Menengah
- **Lokasi:** `src/lib/sales-analytics.ts:118,122` (`o.total`) vs `:130` (`it.subtotal`)
- **Dampak:** "Σ omzet produk terlaris" lebih besar dari "Omzet Periode" → tak rekonsiliasi.
- **Perbaikan:** alokasikan diskon proporsional ke item, atau ekspos bruto/netto dengan label jelas.

**[AN-H2] Definisi `completionRate` ambigu (dibatalkan ikut penyebut?)** — 🟠 Menengah
- **Perbaikan:** definisikan eksplisit (rekomendasi: `selesai / (semua order periode − dibatalkan)`), taampilkan `cancelled` terpisah; tulis rumus di tipe + UI hint.

**[AN-H3] A11y grafik: 90 `tabIndex`, `role="img"` menelan anak, tooltip hover-only** — 🟠 Menengah
- **Lokasi:** `src/components/admin/sales-chart.tsx`
- **Perbaikan:** tabel data `sr-only` sebagai sumber aksesibel; roving tabindex pada kontainer; dukungan sentuh (`onPointerDown`).

**[AN-H4] "Jumlah Pesanan" ambigu vs kartu "Status Pesanan"** — 🟠 Menengah
- **Lokasi:** `src/components/admin/analytics-dashboard.tsx`, `src/lib/sales-analytics.ts:103,123,169`
- **Masalah:** kartu "Jumlah Pesanan" = hanya yang menghasilkan omzet (per mode), sedangkan "Status Pesanan" = semua status → dua angka berbeda.
- **Perbaikan:** label eksplisit ("Pesanan penghasil omzet" vs "Total pesanan periode").

**[AN-M1] Timezone server (UTC di Vercel) vs WIB → bucket hari bergeser** — 🔵 Rendah
- **Perbaikan:** kunci `timeZone: "Asia/Jakarta"` konsisten; buffer cutoff (`start − 1 hari`).

**[AN-M2..M6] Minor:** status tak dikenal (tertutup normalizer); guard `total` NaN/negatif; empty state grafik menyembunyikan sumbu; label kecil/kontras; `key` grafik pakai `dateISO`.

### 5.2 Pengembangan proper
- **[AN-P1] Perbandingan periode** (delta % vs periode sebelumnya) + sparkline.
- **[AN-P2] Ekspor analitik** (CSV) & **drill-down** (klik batang → daftar order hari itu).
- **[AN-P3] Agregasi harian** (`analytics_daily`) — arsitektur skalabel.
- **[AN-P4] Modul "spec metrik"** tunggal (dokumentasi rumus omzet bruto/netto, AOV, completion, TZ) dipakai lintas halaman.

---

## 6. Temuan Lintas-Sistem

**[XL-1] Definisisi "omzet" berbeda antar halaman** — 🟠 Menengah — Ringkasan (`getOrdersSummary.omzet` = semua order `selesai` sepanjang waktu) vs Analitik (`omzet` jendela periode, `total` setelah diskon). — Beri label/tooltip "sepanjang waktu" vs "periode" + satukan spesifikasi metrik (AN-P4).

**[XL-2] Integrasi kupon × email × status tidak utuh** — 🟠 Menengah — pembatalan order ber-kupon tidak mengembalikan kuota (KP-C2) & tidak memberi tahu pembeli soal kupon (EM-H1). — Satukan kebijakan lifecycle order (batal = restore kuota + email).

**[XL-3] `rate-limit.ts` in-memory per-instance** — 🔵 Rendah — lemah di multi-instance serverless (checkout, kupon, lead). — Pertimbangkan Redis/Upstash (KP-P3).

**[XL-4] Observability lintas sistem lemah** — 🟠 Menengah — email tak berjejak, kupon tak ada ringkasan diskon, order tak menyimpan `couponId`/status email. — Tambah field observability + panel.

**[XL-5] `SITE_URL` fallback diam-diam** — 🔵 Rendah — email/sitemap/canonical bisa memakai domain placeholder bila env kosong. — Validasi startup "fail loud" di produksi.

---

## 7. Peta Prioritas & Ketergantungan

```
P0 (integritas & akurasi — WAJIB dulu)
  AN-C1 (completionRate)         — perbaikan cepat, dampak tinggi
  AN-C2 (query analitik)         — filter+select+cache
  KP-C1 (kuota atomik)           — transaksi
  KP-C2 (restore kuota saat batal) — butuh KP-M1 (couponId di order)
  EM-C2 (status email + retry)   — field di order
  EM-C3 (idempotensi email status)

P1 (reliabilitas & kejelasan)
  EM-C1 (peringatan domain Resend)
  EM-H3 (await alur email status)
  AN-H1/H2 (rekonsiliasi & definisi metrik)
  KP-H1/H2/H3 (skala per-user, kode unik, tanggal fail-closed)
  XL-1/XL-2 (satukan definisi & lifecycle)

P2 (observability & proper)
  EM-P1 (kirim ulang + riwayat), KP-M2 (statistik per kupon), AN-P1/P2
  KP-P1 (halaman promo), AN-P3 (agregasi harian), AN-P4 (spec metrik)

P3 (skala & polish)
  KP-P3/XL-3 (rate-limit distribusi), EM-P2 (outbox+webhook), a11y grafik
```

**Ketergantungan penting:** `KP-C2` butuh `KP-M1` (simpan `couponId` di order). `AN-C1` & `AN-C2` satu file. `XL-1`/`AN-H1` sebaiknya dikerjakan bersama `AN-P4`.

---

## 8. TASK IMPLEMENTATION FLOW (FASE R0–R7)

> Remediasi lintas tiga sistem. Tiap fase dites & commit terpisah. Bisa disisipi task pengembangan (P2/P3) sesuai waktu.

### FASE R0 — Persiapan & baseline (±20 menit)
- [ ] Baca dokumen ini + 3 dokumen sistem.
- [ ] Baseline `tsc`/`lint`/`build` bersih.
- [ ] Putuskan rumus metrik (spec) — lihat `AN-P4` (dokumentasikan lebih dulu agar semua perbaikan konsisten).

### FASE R1 — Perbaiki akurasi & performa Analitik (±2.5 jam)
- [ ] `AN-C1`: `totalOrders` = total order **dalam jendela**; rapikan `statusBreakdown`; tambah unit test rumus.
- [ ] `AN-C2`: query `where(createdAtISO >= cutoff)` + `.select(...)`; cache singkat `(days,mode)`; **perbaiki doc-comment**.
- [ ] `AN-H1`: alokasi diskon proporsional / label bruto-netto; `AN-H2`: definisi completion eksplisit.
- [ ] `AN-H4`: label kartu eksplisit.
- **DoD:** angka rekonsiliasi & konsisten; doc sesuai kode.

### FASE R2 — Integritas Kupon (±3 jam)
- [ ] `KP-M1`: tambah `couponId` di `OrderCoupon` (+ normalize + simpan saat checkout).
- [ ] `KP-C1`: `redeemCoupon` → `runTransaction` (cek ulang + increment + arrayUnion), dipanggil **sebelum** createOrder atau `await` + rekonsiliasi.
- [ ] `KP-C2`: `restoreCouponUsage` + panggil saat batal/hapus (idempoten).
- [ ] `KP-H2`: kode unik sejati (`coupons/{code}` create-only atau penanda).
- [ ] `KP-H3`: schema tanggal fail-closed + refine `startsAt < endsAt`.
- **DoD:** kuota konsisten di bawah concurrency; restore berfungsi.

### FASE R3 — Reliabilitas Email (±2.5 jam)
- [ ] `EM-C2`: field status email di order (`confirmationEmailAt/status`, `lastStatusEmailAt/status`) + retry sederhana + log terstruktur.
- [ ] `EM-C3`: idempotensi (skip bila status sama; `lastNotifiedStatus`).
- [ ] `EM-H3`: `await` alur email status (atau `after()`).
- [ ] `EM-H4`/`EM-C1`: status konfigurasi & peringatan domain di Pengaturan.
- **DoD:** email tak ganda; kegagalan terekam; admin tahu status konfigurasi.

### FASE R4 — Observability & UX admin (±2 jam)
- [ ] `EM-P1` (opsional): tombol "Kirim ulang" + riwayat email di detail order.
- [ ] `KP-M2`: statistik per kupon (Σ diskon, jumlah order) + daftar order per kupon.
- [ ] `XL-4`: tampilkan status email & info kupon di detail order.
- **DoD:** admin bisa menelusuri email & dampak kupon.

### FASE R5 — Konsistensi lintas-sistem (±1.5 jam)
- [ ] `XL-1`/`AN-P4`: satu spesifikasi metrik (omzet bruto/netto, AOV, completion, TZ) dipakai `getOrdersSummary`, `getSalesAnalytics`, UI.
- [ ] `XL-2`: kebijakan lifecycle order (batal = restore kuota + email).
- [ ] Label "sepanjang waktu" pada kartu omzet Ringkasan.
- **DoD:** tak ada angka "omzet" yang saling bertentangan tanpa penjelasan.

### FASE R6 — Pengembangan proper (opsional, pilih sesuai waktu)
- [ ] `KP-P1`: prefill `?promo=` + halaman `/promo` + badge promo.
- [ ] `AN-P1`: delta vs periode sebelumnya (KPI bergerak).
- [ ] `AN-P2`: ekspor CSV + drill-down klik batang.
- [ ] a11y grafik (`AN-H3`): tabel `sr-only` + roving tabindex + touch.
- **DoD:** sesuai item yang dipilih.

### FASE R7 — Skala, QA & deploy
- [ ] (Opsional) `AN-P3` agregasi harian; `KP-P3`/`XL-3` rate-limit distribusi; `EM-P2` outbox/webhook.
- [ ] `tsc`/`lint`/`build` bersih.
- [ ] Checklist DoD §9.
- [ ] Dokumentasi: status → ✅ + update `docs/README.md` & `TASK-SELANJUTNYA.md` + tandai temuan teratasi.
- [ ] Commit per fase → push → uji produksi.

---

## 9. Definition of Done Global

1. `tsc` bersih, `build` sukses, `lint` bersih (0 error/warning baru).
2. **Akurasi:** `completionRate` benar (dalam jendela); omzet produk rekonsiliasi dengan omzet periode (atau berlabel jelas).
3. **Integritas kupon:** kuota konsisten di bawah concurrency; kuota kembali saat batal/hapus.
4. **Email:** tidak ada email ganda untuk status sama; kegagalan terekam di order; admin dapat informasi status konfigurasi domain.
5. **Performa:** endpoint analitik tidak menarik seluruh koleksi tanpa filter/select.
6. **Konsistensi:** definisi "omzet" terdokumentasi & konsisten antar halaman.
7. Tidak ada regresi: checkout, orders, kupon, email, analitik, dashboard.

---

## 10. Lampiran — Ringkasan Semua Temuan

### Email Transaksional
| Kode | Judul | Severity |
|---|---|---|
| EM-C1 | Domain Resend default → email pembeli gagal senyap | 🔴 |
| EM-C2 | Kegagalan kirim hilang (no retry/status) | 🔴 |
| EM-C3 | Tidak ada idempotensi → email ganda | 🔴 |
| EM-H1 | DELETE/batal tanpa email; kuota kupon tak dibebaskan | 🟠 |
| EM-H2 | `STATUS_COPY` tanpa guard runtime | 🟠 |
| EM-H3 | Settings async (race serverless) | 🟠 |
| EM-H4 | `RESEND_API_KEY` kosong → silent skip | 🟠 |
| EM-M1..M7 | Tanggal email, simbol, esc apostrof, SITE_URL, status UI, teks cart, test template | 🔵 |

### Kupon / Diskon
| Kode | Judul | Severity |
|---|---|---|
| KP-C1 | Kuota/batas per-user non-atomik + redeem fire-and-forget | 🔴 |
| KP-C2 | Kuota tak dikembalikan saat batal/hapus | 🔴 |
| KP-H1 | `usedBy` dibatasi 1000 → batas per-user tak akurat | 🟠 |
| KP-H2 | Kode kupon tak punya unik sejati (race/duplikat) | 🟠 |
| KP-H3 | Validasi tanggal fail-open + timezone | 🟠 |
| KP-M1 | Order tak simpan `couponId` | 🔵 |
| KP-M2 | Tak ada statistik per kupon | 🔵 |
| KP-M3 | `deleteCoupon` hard-delete | 🔵 |
| KP-M4 | Enumeration kode via validasi | 🔵 |
| KP-M5 | Kupon hilang saat refresh; diskon tak re-compute; total 0 | 🔵 |

### Analitik Penjualan
| Kode | Judul | Severity |
|---|---|---|
| AN-C1 | `completionRate` salah (penyebut seluruh riwayat) | 🔴 |
| AN-C2 | Query seluruh koleksi tanpa filter/select/cache | 🔴 |
| AN-H1 | Omzet produk (bruto) ≠ omzet total (netto) | 🟠 |
| AN-H2 | Definisi `completionRate` ambigu | 🟠 |
| AN-H3 | A11y grafik (tabIndex role=img hover-only) | 🟠 |
| AN-H4 | "Jumlah Pesanan" ambigu | 🟠 |
| AN-M1..M6 | Timezone, status tak dikenal, NaN, empty state, label, key | 🔵 |

### Lintas-sistem
| Kode | Judul | Severity |
|---|---|---|
| XL-1 | Definisi "omzet" berbeda antar halaman | 🟠 |
| XL-2 | Integrasi kupon × email × status tidak utuh | 🟠 |
| XL-3 | Rate-limit in-memory per-instance | 🔵 |
| XL-4 | Observability lintas sistem lemah | 🟠 |
| XL-5 | `SITE_URL` fallback diam-diam | 🔵 |

---

## CATATAN PENUTUP

Ketiga sistem sudah **fungsional & berarsitektur baik**, tetapi ada **gap integritas/akurasi/reliabilitas** yang perlu ditutup sebelum dipakai serius — terutama: `completionRate` yang salah (AN-C1), query analitik yang tak skalabel (AN-C2), kuota kupon yang bocor (KP-C1/C2), dan email yang gagal senyap (EM-C1/C2/C3).

**Urutan eksekusi yang disarankan (sesi berikutnya):**
`R0` → **`R1` (perbaiki AN-C1/C2 — cepat & berdampak)** → **`R2` (integritas kupon)** → **`R3` (reliabilitas email)** → `R5` (konsistensi metrik) → `R4` (observability) → `R6/R7` (pengembangan & skala).

> Setelah dieksekusi: tandai tiap temuan ✅, ubah status header, dan catat temuan baru sebagai `EM-xx`/`KP-xx`/`AN-xx`/`XL-xx` berikutnya.
