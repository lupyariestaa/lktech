# Task Eksekusi — Upgrade Sistem Kupon (C0–C9)

> **Status: 🔄 DIKERJAKAN (C0 ✅, C1 ✅ selesai; C2–C9 pending).**
> Dokumen **super lengkap**: visi, baseline, analisis peluang, keputusan desain,
> target berkas, flow fase, matrix prioritas, risiko, DoD, pertanyaan terbuka, dan
> rencana uji.
>
> **Turunan dari:** audit & perbaikan kupon yang sudah selesai —
> [`2026-10-11-task-perbaikan-kupon.md`](2026-10-11-task-perbaikan-kupon.md) (K0–K6 ✅).
> **Tema roadmap:** Konversi & Closing + Kepercayaan (diskon/promo), Operasional (analitik).
> **Disusun:** 2026-10-11. **Target:** sesi berikutnya.

---

## 0. Ringkasan Eksekutif

Sistem kupon saat ini **kuat & benar di inti** (server-authoritative, reservasi kuota
atomik, restore saat batal, anti-duplikat kode, soft-delete + restore, kupon bundel,
statistik per-kupon, ekspor CSV, halaman publik `/promo`). Namun belum **optimal**
untuk operasi pemasaran & konversi nyata. Upgrade ini menambahkan kemampuan kelas
e-commerce modern tanpa merombak fondasi:

> **Visi:** dari "kupon diskon sederhana" → **platform promo yang terukur**:
> kode pintar (otomatis/personal/bersyarat), kampanye terkukur (ROI & funnel),
> operasi massal (bulk generate), dan pengalaman pembeli yang meyakinkan
> (halaman promo dinamis, penghitung hemat, anti-kejutan saat checkout).

**Filosofi desain yang dipegang:**
1. **Server-authoritative** — harga/diskon/kuota/kelayakan hanya divalidasi server.
2. **Backward-compatible** — semua kupon & order lama tetap valid (field baru opsional).
3. **Fail-safe tanpa kredensial** — fitur baru tidak boleh crash bila env kosong.
4. **Logika murni teruji** — setiap aturan baru diesktrak ke modul murni + test.
5. **A11y & mobile-first** — semua kontrol baru aksesibel & responsif.
6. **Bisa diaudit** — semua aksi admin → `admin_audit`; setiap pemakaian dapat ditelusuri.

---

## 1. Baseline (kondisi sekarang — terverifikasi)

### 1.1 Model data (`coupons/{id}`)
| Field | Tipe | Keterangan |
| --- | --- | --- |
| `code` | string | Unik (uppercase A-Z0-9), penanda `couponCodes/{code}` |
| `description` | string? | Teks tampilan |
| `type` | `"percent"｜"amount"` | Jenis diskon |
| `value` | number | Persen (1–100) atau Rupiah |
| `minSpend` | number | Min. subtotal |
| `maxDiscount` | number? | Cap diskon persen |
| `appliesToSlugs` | string[]? | Kupon bundel: wajib ada ≥1 slug |
| `minItems` | number? | Kupon bundel: min qty total |
| `startsAt`/`endsAt` | string? | Masa berlaku (ISO) |
| `usageLimit` | number? | Kuota total |
| `limitPerUser` | number | Batas per user (0 = tanpa batas) |
| `active` | boolean | On/off |
| `archived` | boolean? | Soft-delete |
| `usageCount` | number | Denormalisasi jumlah pakai |
| `usedBy` | string[] | uid pemakai (cap 1000) |
| `createdAtISO`/`updatedAtISO`/`createdBy` | string | Meta |

Subkoleksi: `coupons/{id}/redemptions/{uid}` (`count`, `lastRedeemedAtISO`) — sumber
kebenaran `limitPerUser`. Penanda kode: `coupons/{id}` ⇄ `couponCodes/{code}`.

### 1.2 Berkas kunci
| Lapisan | Berkas |
| --- | --- |
| Tipe | `src/lib/coupon-types.ts` |
| Logika murni | `src/lib/coupon-pure.ts` (`computeDiscount`, `validateCoupon`, `checkBundleRules`, `validateCouponForm`, `aggregateCouponStats`) |
| Data layer | `src/lib/coupons.ts` (CRUD, `redeemCoupon`, `restoreCouponUsage`, `getUserCouponUsage`, `getCouponStats`) |
| Publik | `src/lib/promos.ts` (`listPublicPromos`), `src/components/promo-list.tsx`, `src/app/promo/page.tsx` |
| Klien | `src/lib/coupon-api.ts`, `src/components/cart-coupon.tsx`, `src/components/cart-view.tsx` |
| Admin | `src/lib/admin-coupons-api.ts`, `src/components/admin/coupons-manager.tsx`, `src/app/api/admin/coupons/route.ts` |
| Validasi API | `src/app/api/coupons/validate/route.ts` |
| Checkout | `src/lib/checkout.ts` (validasi + reservasi kuota atomik) |
| Uji | `scripts/coupon-pure.test.ts` (40), `scripts/coupon-bundle.test.ts` (9), `scripts/order-schema.test.ts` (5) |

### 1.3 Alur saat ini
```
/promo (/keranjang?promo=KODE) → cart-coupon (validasi preview server)
   → checkout → performCheckout:
       getCouponByCode → getUserCouponUsage → validateCoupon
       → redeemCoupon (ATOMIK, reservasi) → createOrder
       (gagal createOrder → restoreCouponUsage)
   batal/kedaluwarsa/hapus order → restoreCouponUsage (KP-C2)
```

### 1.4 Kekuatan (jangan diubah)
Server-authoritative ✓ · reservasi atomik ✓ · restore idempoten ✓ · anti-duplikat ✓ ·
soft-delete+restore ✓ · statistik nyata dari `orders` ✓ · ekspor CSV ✓ · a11y form ✓ ·
logika murni teruji ✓.

---

## 2. Analisis Peluang (gap "optimalisasi")

> Berbeda dari audit sebelumnya (yang memperbaiki **bug**), bagian ini menandai
> **peluang peningkatan** — fitur yang absen atau sub-optimal.

### 2.1 Kemampuan kupon (mesin diskon)
- **O1 — Tipe diskon terbatas.** Hanya `percent`/`amount`. Tidak ada **diskon
  bertingkat** (tiered: belanja ≥X hemat Y), **"beli N gratis 1"**, atau **diskon
  per-kategori** (kini hanya per-slug).
- **O2 — Tanpa kupon otomatis.** Pembeli harus menempel kode. Tidak ada
  **auto-apply kode terbaik** ("kupon terbaik untukmu") — hambatan konversi besar.
- **O3 — Tanpa kupon personal/targeted.** Tidak bisa membuat kode **1x pakai
  unik** (mis. welcome/winback/gift) atau kode yang **terikat email/uid** tertentu.
- **O4 — Tanpa syarat kode batch.** Tidak ada **generate massal** kode unik
  (kampanye, event, undian, afiliasi).
- **O5 — Kombinasi/stacking tak diatur.** Tidak ada flag **boleh digabung**
  (stackable) atau aturan "satu kupon per keranjang" yang eksplisit.
- **O6 — Tanpa kuota periode.** Kuota hanya total; tidak ada **batas harian/mingguan
  per kode** (flash sale).
- **O7 — Tanpa syarat kustomer.** Tidak ada syarat **pembeli pertama**, **pembeli
  langganan**, atau **jumlah pesanan minimum**.

### 2.2 Pengalaman pembeli
- **O8 — Halaman `/promo` statis.** Tak ada filter (aktif/akan datang/berakhir),
  urutan berdasarkan relevansi, **penghitung mundur**, atau indikator **kuota
  tersisa menipis**. `remaining` sudah dihitung tapi jarang ditonjolkan.
- **O9 — Tanpa "hemat terbaik" di keranjang.** Keranjang tak menyarankan kode
  termurah yang tersedia untuk isi keranjang saat ini.
- **O10 — Tanpa estimasi di kartu produk.** Kartu/listing produk tak menunjukkan
  "bisa hemat hingga X".
- **O11 — Autosave kode.** Kode yang dipakai tidak diingat lintas sesi (localStorage)
  → pembeli menempel ulang.

### 2.3 Operasi & analitik (admin)
- **O12 — Analitik kupon dangkal.** Ada jumlah order & Σ diskon, tapi tak ada
  **konversi** (dilihat→dipakai), **tren waktu**, **AOV dengan vs tanpa kupon**,
  **ROI** (total diskon vs omzet).
- **O13 — Tanpa riwayat pemakaian.** Tidak ada daftar **siapa/kapan/order mana**
  memakai kode (hanya agregat). Sulit menyelidiki sengketa.
- **O14 — Tanpa detail kupon.** `coupons-manager` hanya kartu + dialog; tak ada
  **halaman detail** `/admin/coupons/[id]` dengan statistik, timeline, daftar pemakai.
- **O15 — Tanpa duplikat kode.** Tidak bisa menyalin kupon sebagai basis kupon baru.
- **O16 — Tanpa grup/kampanye.** Kupon tak dikelompokkan per kampanye → sulit
  mengukur efektivitas kampanye ("Promo Ramadan" = 5 kode).
- **O17 — Ekspor/statistik terbatas.** CSV tak memuat kolom analitik (konversi,
  AOV, ROI) atau rentang tanggal.
- **O18 — Peringatan operasional.** Tidak ada sinyal "kupon kedaluwarsa <3 hari"
  atau "kuota hampir habis" di dashboard (pola panel "butuh perhatian" pesanan).

### 2.4 Kualitas teknis & tata kelola
- **O19 — Skala `getCouponStats`.** Memuat **seluruh** koleksi `orders`
  (memori + cache 60 dtk). Perlu agregasi ringkas/`analytics_daily` bila order besar.
- **O20 — `usedBy` dibatasi 1000** → daftar pemakai bisa tak lengkap (sudah
  disadari; `redemptions` adalah sumber sebenarnya).
- **O21 — Taksonomi tipe belum siap untuk field baru** (tipe, syarat, dll) —
  butuh `normalizeCoupon` backward-compatible + schema baru.
- **O22 — Index Firestore** untuk query kupon baru (mis. by campaign, by status date).
- **O23 — Emisi event analitik kupon** (`coupon_view`, `coupon_apply_success/fail`,
  `coupon_removed`) belum ada — penting untuk funnel.

---

## 3. Keputusan Desain Awal (K1–K12)

> Ditetapkan saat perencanaan; dapat disesuaikan pemilik saat C0.

- **K1 — Perluas `type` kupon** (tetap string union, backward-compatible): tambah
  `"tiered"` (diskon bertingkat by subtotal) & `"bundle"` (alias semantik bundel yang
  sudah ada via `appliesToSlugs`/`minItems`). **`percent`/`amount` tetap default.**
- **K2 — Kupon otomatis (best coupon):** fungsi murni `pickBestCoupon(coupons, cart)`
  → keranjang menampilkan **"Terapkan kode terbaik"** (opt-in, 1 klik). **Tidak**
  auto-apply diam-diam (transparansi).
- **K3 — Kode personal 1x pakai:** field `singleUse?: boolean` + opsional
  `assignedEmail?: string` / `assignedUid?: string`. Server memaksa batas 1 pakai
  & kecocokan pemilik.
- **K4 — Generate massal:** endpoint admin `POST /api/admin/coupons { action:"batch" }`
  membuat N kode unik (prefix + acak), semua berbagi pengaturan kampanye. Batas aman
  (mis. maks 500/aksi) + audit.
- **K5 — Kampanye (`campaignId`/`campaign`)**: grup opsional untuk kupon; dipakai
  filter & agregasi analitik. Koleksi ringan `coupon_campaigns/{id}` (opsional;
  fallback ke string bebas bila belum ada).
- **K6 — Stacking:** field `stackable?: boolean` (default `false`). MVP: **satu
  kupon per keranjang** (sesuai sekarang); `stackable` disiapkan untuk masa depan
  (belum mengaktifkan multi-kupon di checkout).
- **K7 — Kuota periode:** field `perDayLimit?: number` (kuota harian). Dihitung dari
  `coupons/{id}/redemptions` bertimestamp (`atISO` harian) atau counter `dayUsage`.
- **K8 — Syarat kustomer:** field `audience?: "semua"｜"baru"｜"lama"` (pembeli
  pertama vs repeat) — ditentukan dari `users/{uid}.orderCount`.
- **K9 — Halaman detail `/admin/coupons/[id]`**: dua kolom (rincian + statistik +
  timeline pemakaian + daftar pemakai terbaru). Pola sama dgn `/admin/orders/[id]`.
- **K10 — Analitik kupon**: `computeCouponAnalytics` murni (konversi, AOV dgn/tanpa,
  ROI, tren 30 hari). Disajikan di halaman detail + kartu dashboard.
- **K11 — Halaman `/promo` ditingkatkan**: filter status (Aktif/Akan datang/Berakhir),
  urut, hitung mundur, badge "Sisa N", "Berlaku 7 hari lagi", ekspor/berbagi.
- **K12 — Event analitik**: `coupon_view`, `coupon_apply_success`, `coupon_apply_fail`,
  `coupon_removed`, `coupon_autopick` via `src/lib/analytics.ts` (tanpa PII).

---

## 4. Daftar Berkas (target)

### Baru (rencana)
- `src/lib/coupon-engine-pure.ts` — perluasan logika murni: tiered, best-coupon,
  audience/single-use, kuota periode, stacking check, analitik murni. **(Teruji.)**
- `src/lib/coupon-analytics-pure.ts` — `computeCouponAnalytics` (konversi/AOV/ROI/tren). **(Teruji.)**
- `src/app/admin/(dashboard)/coupons/[id]/page.tsx` — halaman detail kupon.
- `src/app/api/admin/coupons/[id]/route.ts` — `GET` detail (+ statistik + pemakai +
  timeline); `POST` catatan/aksi.
- `src/components/admin/coupons/coupon-detail-client.tsx` — detail (dua kolom).
- `src/components/admin/coupons/coupon-form-dialog.tsx` — form diekstrak (komponen
  terpisah; kini menumpuk di `coupons-manager`).
- `src/components/admin/coupons/coupons-toolbar.tsx` — filter/urut/cari/kampanye.
- `src/components/admin/coupons/coupon-analytics-cards.tsx` — kartu analitik.
- `src/components/admin/coupons/coupon-batch-dialog.tsx` — generate massal.
- `src/components/admin/coupon-timeline.tsx` — timeline pemakaian (pola `order-timeline`).
- `scripts/coupon-engine.test.ts` — test logika baru.
- `scripts/coupon-analytics.test.ts` — test analitik.
- `src/app/api/coupons/best/route.ts` — `POST` best-coupon untuk keranjang (publik, login).

### Diubah (rencana)
- `src/lib/coupon-types.ts` — field baru (`type: tiered`, `singleUse`, `assignedEmail`,
  `assignedUid`, `campaign`, `stackable`, `perDayLimit`, `audience`, `tiers?`) + label.
- `src/lib/coupon-pure.ts` — re-export dari `coupon-engine-pure` (hindari file besar).
- `src/lib/coupons.ts` — normalize field baru; `redeemCoupon` (single-use/periode);
  `getCouponsPage` (filter/urut/paginasi); `listRedemptions`; `getCouponAnalytics`.
- `src/lib/checkout.ts` — terapkan aturan baru (single-use, audience, periode, stacking).
- `src/app/api/coupons/validate/route.ts` — validasi aturan baru + event analitik.
- `src/app/api/admin/coupons/route.ts` — `GET` (filter/urut/paginasi/kampanye),
  `POST action:"batch"`, `POST action:"duplicate"`.
- `src/lib/admin-coupons-api.ts` — klien baru (page/detail/analytics/batch/duplicate).
- `src/components/admin/coupons-manager.tsx` — jadikan orkestrator tipis + integrasi
  komponen baru + toolbar + paginasi.
- `src/lib/promos.ts` — `PublicPromo` diperkaya (`status`, `remaining`, `savingsHint`).
- `src/components/promo-list.tsx` + `src/app/promo/page.tsx` — filter/urut/hitung mundur.
- `src/components/cart-coupon.tsx` + `cart-view.tsx` — "kode terbaik", souvenir kode,
  event analitik.
- `src/lib/admin-nav.ts` — (bila perlu) badge kupon hampir habis.
- `src/lib/analytics.ts` — event kupon baru.
- `firestore.indexes.json` — index kupon (status+endsAt, campaign).
- `package.json` + `tsconfig.json` — script `test:coupon-engine`, `test:coupon-analytics`.

---

## 5. Flow Task (Fase C0–C9)

> Setiap fase: kerjakan → gate `npx tsc --noEmit` · `npx eslint .` · semua `test:*`
> · `npm run build` → update checklist (tandai `[x]`).

### Fase C0 — Audit & dokumen (persiapan) — ✅ SELESAI
- [x] Konfirmasi keputusan K1–K12 & §10 (pertanyaan terbuka) — lihat **§13 Keputusan Final**.
- [x] Inventaris ulang berkas/API (baseline §1) & tandai titik refactor.
- [x] Kunci definisi taksonomi `type` & field baru — lihat **§13.3**.
- **DoD:** keputusan terkunci; tanpa perubahan kode fungsional. ✅

### Fase C1 — Fondasi murni & tipe (K1, K3, K6, K7, K8) — ✅ SELESAI
- [x] Perluas `coupon-types.ts`: `type` + `"tiered"`; `tiers`, `singleUse`,
      `assignedEmail`, `assignedUid`, `audience`, `perDayLimit`, `campaign`,
      `stackable`; label `COUPON_AUDIENCE_LABEL`; `CouponTier`.
- [x] Logika murni: `pickTier`, `tieredDiscount`, `computeDiscount` (dukung tiered),
      `validateCoupon` (audience/assigned/single-use/perDayLimit), `pickBestCoupon`
      (kupon otomatis) — di `coupon-pure.ts`; re-ekspor dari `coupons.ts`.
      *(Catatan: tetap satu file `coupon-pure.ts` alih-alih pecah ke `coupon-engine-pure.ts`
      karena keterbatasan resolusi impor Node/TS — lihat §13.5.)*
- [x] `validateCouponForm` mendukung `tiered` (validasi tingkat) + `perDayLimit`/`assignedEmail`.
- [x] `normalizeCoupon` baca field baru (default aman) + **fix** `limitPerUser` 0
      tidak lagi dipaksa 1 (K6).
- [x] `order-types.ts`: `OrderCoupon.type` + `"tiered"` (snapshot order).
- [x] `scripts/coupon-engine.test.ts` — **26 test**; script `test:coupon-engine`.
- **Hasil:** `tsc` ✅ · `eslint` ✅ · semua `test:*` = **436** ✅ · `build` ✅.

### Fase C2 — Server: aturan baru di checkout & reservasi (K3, K7, K8)
- [ ] `checkout.ts`: terapkan single-use/assigned/audience/periode/stacking.
- [ ] `redeemCoupon`: enforce single-use (batas absolut 1) & `perDayLimit` (counter
      harian atomik di `redemptions`/`dayUsage`).
- [ ] `/api/coupons/validate`: validasi aturan baru (tanpa membocorkan detail sensitif).
- [ ] Uji regresi (kuota/batal/restore tetap benar).
- **DoD:** aturan baru ditegakkan server; uang & akses tetap server-authoritative.

### Fase C3 — Kupon otomatis & UX keranjang (K2, O9, O11)
- [ ] `POST /api/coupons/best` (login) → kode terbaik untuk keranjang.
- [ ] `cart-coupon.tsx`: tombol **"Terapkan kode terbaik"** + ingat kode di
      `localStorage` (opsional, dapat dibersihkan).
- [ ] Event `coupon_autopick` / `coupon_apply_*`.
- **DoD:** pembeli bisa menerapkan kode terbaik 1 klik; UX jujur & a11y.

### Fase C4 — Generate massal & duplikat (K4, O4, O15)
- [ ] `POST /api/admin/coupons { action:"batch" }` (prefix + N kode unik, batas aman,
      audit `coupon.save`).
- [ ] `POST { action:"duplicate" }` (salin sebagai draft nonaktif).
- [ ] `coupon-batch-dialog.tsx` + tombol "Buat massal"/"Duplikat".
- **DoD:** generate massal aman (tanpa tabrakan kode), teraudit.

### Fase C5 — Halaman detail + timeline + riwayat pemakaian (K9, O13, O14)
- [ ] `GET /api/admin/coupons/[id]` (detail + statistik + daftar pemakai + timeline).
- [ ] `coupons/{id}/redemptions` diperkaya `atISO` & `orderId` (denormalisasi) untuk timeline.
- [ ] Halaman `/admin/coupons/[id]` + `coupon-detail-client.tsx` + `coupon-timeline.tsx`.
- [ ] Aksi di detail (edit/aktif/arsip/restore/duplikat).
- **DoD:** kupon bisa ditelusuri end-to-end; halaman bisa di-bookmark.

### Fase C6 — Analitik kupon (K10, O12, O17, O23)
- [ ] `coupon-analytics-pure.ts` (`computeCouponAnalytics`): konversi, AOV dgn/tanpa,
      ROI, tren 30 hari, breakdown kampanye.
- [ ] `GET /api/admin/coupons?analytics=1` + kartu di dashboard & detail.
- [ ] CSV diperkaya (kolom analitik + rentang tanggal).
- [ ] `scripts/coupon-analytics.test.ts` (≥ 12 test).
- **DoD:** admin dapat menilai efektivitas kupon/kampanye dari data nyata.

### Fase C7 — Halaman `/promo` & discovery (K11, O8, O10)
- [ ] `promos.ts`: `PublicPromo` + `status`/`remaining`/`savingsHint`.
- [ ] `promo-list.tsx`: filter status, urut (relevansi/rp/berakhir), hitung mundur,
      badge "Sisa N".
- [ ] Tautan pintar dari kartu produk (opsional "bisa hemat hingga X").
- **DoD:** halaman promo informatif & meyakinkan; hanya menampilkan kode aktif.

### Fase C8 — Kampanye & skala (K5, O16, O19, O22)
- [ ] Field `campaign` + filter di admin; agregasi per kampanye di analitik.
- [ ] `firestore.indexes.json` untuk query baru (status+endsAt, campaign).
- [ ] Catat strategi skala `getCouponStats` (agregasi harian `analytics_daily` — opsional).
- **DoD:** kupon dapat dikelompokkan & diukur per kampanye.

### Fase C9 — Refactor UI, a11y, QA & rilis
- [ ] Ekstrak `coupons-manager` → komponen terpisah (toolbar, form, batch, analytics).
- [ ] Poles a11y (fokus, aria, keyboard, 44px) & mobile (uji 375px).
- [ ] QA manual menyeluruh (semua tipe/syarat/kursus) + regresi (restore, bundel).
- [ ] Update `docs/README.md` + `TASK-SELANJUTNYA.md` + dokumen ini (§9 Hasil).
- [ ] Gate penuh + commit konvensional (`feat(kupon): …`).
- **DoD:** fitur berfungsi, komponen terawat, gate hijau, dokumentasi lengkap.

---

## 6. Matrix Prioritas (nilai vs usaha)

| Fitur | Nilai | Usaha | Gelombang |
| --- | --- | --- | --- |
| Kupon otomatis (best coupon) | Tinggi | Rendah–Sedang | **C3 (dahulu)** |
| Halaman detail + riwayat (K9/O14) | Tinggi | Sedang | **C5** |
| Analitik (konversi/AOV/ROI) (K10) | Tinggi | Sedang | **C6** |
| Generate massal (K4) | Tinggi | Sedang | **C4** |
| `/promo` dinamis (K11) | Sedang–Tinggi | Rendah–Sedang | **C7** |
| Kode personal 1x pakai (K3) | Tinggi | Sedang | **C1–C2** |
| Audience (baru/lama) (K8) | Sedang | Sedang | **C1–C2** |
| Kuota periode (K7) | Sedang | Sedang | **C2** |
| Tiered discount (K1) | Sedang | Sedang | **C1** |
| Kampanye (K5) | Sedang | Sedang | **C8** |
| Stacking (K6) | Rendah (MVP) | Tinggi | Tunda |
| Skala stats `analytics_daily` (O19) | Sedang | Tinggi | Tunda/opsional |

**Urutan usulan:** C0 → C1 → C2 → **C3** → C5 → C6 → C4 → C7 → C8 → C9.
(C3, C5, C6 adalah nilai tertinggi dengan usaha wajar.)

---

## 7. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
| --- | --- | --- | --- |
| R1 | Field baru merusak kupon/order lama | Validasi rusak | Semua field **opsional** + default aman di `normalizeCoupon`; regresi test |
| R2 | Kupon otomatis menerapkan diskon keliru | Kerugian uang | Hanya **saran** (opt-in), dihitung server; `/api/coupons/best` server-authoritative |
| R3 | Generate massal menabrak kode / overload | Duplikat/limit | Prefix + acak cukup, klaim penanda atomik, batas N/aksi, per-item error dilaporkan |
| R4 | Kuota periode bocor saat batal/hapus | Kuota salah | Semua restore lewat `restoreCouponUsage` (idempoten) + counter harian diturunkan |
| R5 | Analitik memuat seluruh `orders` | Lambat/biaya | Cache TTL + `select` field minimal; catat `analytics_daily` sebagai lanjutan |
| R6 | Index Firestore baru belum dipublikasikan | Query gagal | Fallback memori (pola pesanan) + instruksi publish manual |
| R7 | Refactor `coupons-manager` memecah regresi | Fitur lama rusak | Refactor bertahap (ekstrak komponen dulu) + uji tiap langkah |
| R8 | Timeline pemakaian butuh data orderId lama | Timeline kosong | Backfill best-effort; tampilkan "—" bila tak ada |
| R9 | Single-use + restore mengembalikan kuota | Bisa pakai lagi | Single-use tetap menolak bila sudah pernah sukses di order **aktif**; restore hanya saat order batal |

---

## 8. Definition of Done (inisiatif ini)

1. **Mesin kupon diperluas:** tiered, single-use/personal, audience, kuota periode,
   kampanye — semua server-authoritative & teruji (murni).
2. **Kupon otomatis** (best coupon, opt-in) di keranjang.
3. **Operasi admin:** generate massal, duplikat, halaman detail + timeline + riwayat pemakai.
4. **Analitik kupon:** konversi, AOV dgn/tanpa, ROI, tren, per kampanye.
5. **Halaman `/promo` dinamis:** filter/urut/hitung mundur/badge sisa.
6. **Observability:** event analitik kupon + audit tiap aksi admin.
7. **Kualitas:** semua logika baru di modul murni + test; a11y & mobile OK.
8. **Gate:** `tsc`/`lint`/semua `test:*`/`build` hijau; dokumentasi diperbarui;
   backward-compatible.

---

## 9. Rencana Uji

### Uji murni (Node `--experimental-strip-types`)
- `coupon-engine.test.ts`: tiered (pilih tier benar by subtotal), single-use,
  assigned email/uid, audience baru/lama, kuota periode (perDayLimit), stacking,
  `pickBestCoupon` (pilih diskon terbesar yang valid), kombinasi syarat.
- `coupon-analytics.test.ts`: konversi (view→apply), AOV dgn/tanpa, ROI, tren harian,
  agregasi kampanye, penanganan data kosong/aneh.

### Uji integrasi (manual, pemilik)
- Buat kupon tiap tipe → validasi di keranjang → checkout → cek kuota/restore.
- Kupon single-use dipakai 2x → ditolak ke-2 (kecuali order pertama dibatalkan).
- Generate massal 20 kode → semua unik & valid.
- Batal order berkupon → kuota kembali; periode harian kembali.
- Halaman detail: statistik, timeline, daftar pemakai akurat.
- `/promo`: filter/urut/hitung mundur; hanya kode aktif.
- Pemakaian via `/promo?promo=KODE` → ter-prefill dan berhasil.

### Uji a11y & mobile
- Semua dialog/tombol: fokus, aria, keyboard, target ≥44px. Uji 375px.

---

## 10. Pertanyaan Terbuka (konfirmasi saat C0)

> Default usulan tercantum. Pemilik dapat mengubah saat eksekusi.

1. **Tipe baru (K1):** tambah **`tiered`** (diskon bertingkat) — **[default: ya]** —
   dan/atau **`bundle`** sebagai tipe eksplisit (kini implisit via slug/minItems)?
   **[default: tetap implisit agar sederhana]**
2. **Kupon otomatis (K2):** saran **opt-in** saja — **[default]** — atau
   auto-apply diam-diam bila lebih hemat?
3. **Single-use/personal (K3):** perlu kode **terikat email** (dikirim ke pembeli
   tertentu) — **[default: ya]** — atau cukup single-use global?
4. **Generate massal (K4):** batas **N** per aksi — **[default: 500]** — cukup?
5. **Stacking (K6):** tetap **satu kupon/keranjang** untuk MVP — **[default: ya]** —
   atau aktifkan multi-kupon sekarang?
6. **Kuota periode (K7):** granularitas **harian** — **[default]** — cukup (atau mingguan)?
7. **Analitik (K10):** sertakan **ROI = Σ omzet(berkupon) ÷ Σ diskon** — **[default: ya]** —
   & AOV dgn/tanpa kupon? **[default: ya]**
8. **Kampanye (K5):** pakai **string bebas** `campaign` (tanpa koleksi) — **[default]** —
   atau koleksi `coupon_campaigns` penuh?
9. **Halaman detail (K9):** perlu juga **ekspor daftar pemakai** (CSV) — **[default: ya]**?
10. **Skala (O19):** kerjakan **agregasi harian `analytics_daily`** sekarang atau
    **tunda** (cache TTL cukup untuk skala kini) — **[default: tunda]**?

---

## 11. Catatan Konvensi (wajib)

- **Dokumentasi dulu → kode.** Setiap fase tutup gate: `tsc`/`eslint`/test/`build`.
- **Server-authoritative:** harga, diskon, kuota, kelayakan hanya divalidasi server.
- **Backward-compatible:** kupon & order lama tetap valid (field baru opsional + default).
- **Fail-safe tanpa kredensial:** fitur baru tidak boleh crash bila env kosong.
- **Logika murni teruji:** setiap aturan baru → fungsi murni + test Node.
- **Audit & observability:** aksi admin → `admin_audit`; event pembeli → `analytics.ts`
  (tanpa PII); kegagalan dicatat (`observability.ts`).
- **Perubahan rules/env:** update `.env.example` + catat; Firestore Rules **publish
  ulang manual** (koleksi baru otomatis ditolak catch-all).
- **Git:** commit konvensional (`feat(kupon): …`), push `main` → Vercel auto-deploy.

---

## 12. Hasil Eksekusi

> _(Diisi setelah eksekusi.)_

---

## 13. Keputusan Final (C0 — TERKUNCI)

> Dikunci saat fase C0. Menjadi acuan eksekusi C1–C9. Pemilik menyerahkan pemilihan
> opsi kepada pelaksana; dipilih opsi terbaik (aman, terukur, backward-compatible).

### 13.1 Jawaban pertanyaan terbuka (§10)
| # | Pertanyaan | Keputusan | Alasan |
| --- | --- | --- | --- |
| 1 | Tipe baru `tiered` / `bundle` | **Tambah `tiered`**; `bundle` **tetap implisit** (slug/minItems) | `tiered` menambah nilai konversi; `bundle` implisit sudah cukup & hindari migrasi |
| 2 | Kupon otomatis | **Saran opt-in** ("Terapkan kode terbaik") | Transparansi & kontrol pembeli; hindari diskon tak diminta |
| 3 | Single-use/personal | **Ya** — dukung `singleUse` + `assignedEmail`/`assignedUid` | Kode welcome/winback/gift; cegah kebocoran |
| 4 | Batas generate massal | **500 kode/aksi** | Aman untuk serverless + penanda atomik |
| 5 | Stacking | **Satu kupon/keranjang** (MVP); field `stackable` disiapkan | Hindari kompleksitas & risiko kerugian uang |
| 6 | Kuota periode | **Harian** (`perDayLimit`) | Kasus umum flash sale |
| 7 | Analitik | **ROI** + **AOV dgn/tanpa** disertakan | Inti penilaian efektivitas |
| 8 | Kampanye | **String bebas** `campaign` (tanpa koleksi) | Ringan, cukup untuk grup & filter |
| 9 | Halaman detail | **Sertakan ekspor CSV pemakai** | Operasional & audit |
| 10 | Skala `analytics_daily` | **Tunda** (cache TTL cukup kini) | Hindari over-engineering; catat sebagai lanjutan |

### 13.2 Keputusan desain K1–K12 (final)
- **K1** — `type` menjadi `"percent" ｜ "amount" ｜ "tiered"`. `bundle` **tidak**
  menjadi tipe eksplisit (tetap via `appliesToSlugs`/`minItems`).
- **K2** — Kupon otomatis = **saran opt-in** (`POST /api/coupons/best`). Tidak auto-apply.
- **K3** — `singleUse?: boolean`, `assignedEmail?: string`, `assignedUid?: string`.
- **K4** — `POST /api/admin/coupons { action:"batch", count, prefix, ... }` (maks 500).
- **K5** — `campaign?: string` (string bebas) — dipakai filter & agregasi.
- **K6** — `stackable?: boolean` (default `false`); MVP tetap 1 kupon/keranjang.
- **K7** — `perDayLimit?: number` (kuota harian, zona waktu `Asia/Jakarta`).
- **K8** — `audience?: "semua" ｜ "baru" ｜ "lama"` (dari `users/{uid}.orderCount`).
- **K9** — Halaman detail `/admin/coupons/[id]` (dua kolom + timeline + pemakai + ekspor).
- **K10** — `computeCouponAnalytics` murni (konversi, AOV dgn/tanpa, ROI, tren, kampanye).
- **K11** — `/promo` dinamis (filter status/urut/hitung mundur/badge sisa).
- **K12** — Event `coupon_view`/`coupon_apply_success`/`coupon_apply_fail`/`coupon_removed`/`coupon_autopick`.

### 13.3 Taksonomi & field baru (SKEMA FINAL — terkunci)

```ts
// coupon-types.ts (perluasan)
export const COUPON_TYPES = ["percent", "amount", "tiered"] as const;

export type CouponTier = { minSpend: number; value: number; maxDiscount?: number };

export type Coupon = {
  // ... field lama tetap ...
  type: CouponType;                          // + "tiered"
  tiers?: CouponTier[];                      // untuk tipe "tiered" (>=1, terurut minSpend)
  singleUse?: boolean;                       // 1x pakai global
  assignedEmail?: string;                    // (opsional) terikat email pembeli
  assignedUid?: string;                      // (opsional) terikat uid pembeli
  audience?: "semua" | "baru" | "lama";      // syarat kustomer (default "semua")
  perDayLimit?: number;                      // kuota harian (>=1)
  campaign?: string;                         // grup kampanye (string bebas)
  stackable?: boolean;                       // (disiapkan; MVP tidak dipakai)
};
```

**Semua field baru OPSIONAL** → kupon lama tetap valid (default aman di `normalizeCoupon`).

### 13.4 Aturan validasi final (acuan C1–C2)
1. **Urutan aturan** (semua server): `active` → tanggal → `audience` → `assigned*` →
   `singleUse` → `minSpend` → bundel (`appliesToSlugs`/`minItems`) → `usageLimit` →
   `perDayLimit` → `limitPerUser` → `tiered`/`computeDiscount` > 0.
2. **`tiered`**: pilih tier dengan `minSpend` **terbesar** yang ≤ subtotal; hitung
   diskon dari tier itu (persen atau nominal); hormati `maxDiscount` tier.
3. **`singleUse`**: ditolak bila sudah ada pemakaian sukses pada order **aktif**
   (bukan batal/kedaluwarsa). Restore saat batal mengembalikan kelayakan.
4. **`assignedEmail`/`assignedUid`**: hanya pemilik cocok yang boleh pakai (cek
   server dari token; `assignedEmail` dibandingkan lowercase).
5. **`audience`**: `"baru"` = `users/{uid}.orderCount === 0`; `"lama"` = `> 0`.
6. **`perDayLimit`**: hitung pemakaian hari ini (Asia/Jakarta) dari subkoleksi
   redemptions/counter harian; tolak bila tercapai.
7. **`stackable`**: MVP tetap satu kupon/keranjang (diabaikan bila lebih dari satu).

### 13.5 Titik refactor (ditandai untuk C9)
- `src/components/admin/coupons-manager.tsx` (**806 baris**) → dipecah ke
  `admin/coupons/*` (toolbar, form, batch, analytics, list).
- `src/lib/coupons.ts` (**464 baris**) → tetap, tapi logika aturan baru ke
  `coupon-engine-pure.ts` (murni).
- `src/lib/coupon-pure.ts` (**320 baris**) → re-export dari `coupon-engine-pure`
  agar tidak membengkak.

### 13.6 Status fase
- **C0 ✅ SELESAI** (keputusan terkunci; tanpa perubahan kode).
- **C1 ✅ SELESAI** (fondasi murni & tipe; logika lanjutan teruji).
- Berikutnya: **C2** (server aturan baru di checkout & reservasi) → **C3**
  (kupon otomatis) → C5 → C6 → C4 → C7 → C8 → C9.
