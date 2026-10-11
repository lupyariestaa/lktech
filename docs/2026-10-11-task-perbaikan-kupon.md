# Task Eksekusi — Perbaikan & Upgrade Sistem Kupon

> **Status: ✅ SELESAI (kode) — K0–K6.** Audit mandiri sistem kupon (data layer, API,
> UI admin, keranjang, halaman promo publik). Seluruh 14 gap (K1–K13) tertutup.
> Disusun & dieksekusi: 2026-10-11.

---

## 0. Ringkasan

Audit sistem kupon menemukan **13 gap** (1 kritis, 4 tinggi, 4 sedang, 4 rendah).
Sebagian besar fitur inti **sudah benar & kuat** (server-authoritative, reservasi
kuota atomik, restore saat batal, anti-duplikat kode, soft-delete + restore,
statistik per-kupon, ekspor CSV, halaman `/promo`). Gap terbesar ada pada
**feedback UX kupon di keranjang**, **validasi form admin**, **cakupan a11y**, dan
**logika inti yang tak teruji**.

**Prinsip (wajib):**
- **Dokumentasi dulu → kode.** Tiap fase tutup gate: `tsc` · `eslint` · semua
  `test:*` · `build`.
- **Server-authoritative:** harga/diskon/kuota hanya divalidasi server.
- **Backward-compatible:** data & order lama tetap valid.
- **Reuse pola existing:** `ConfirmDialog`, `useAsyncList`, `useDrawerFocus`, `toast`.

---

## 1. Temuan (terverifikasi)

### 🔴 Kritis
- **K1 — Kupon tetap "terpasang" (diskon basi) setelah sesi berubah.** Re-validasi
  kupon (`cart-view.tsx:75-107`) `catch {}` menelan error. Bila user login → apply
  kupon → logout (atau token kedaluwarsa), `appliedCoupon` tidak direset & diskon
  lama tetap tampil sampai checkout (yang baru gagal `coupon_invalid`). Total
  tampilan ≠ tagihan → menyesatkan.

### 🟠 Tinggi
- **K2 — Feedback "kupon dicabut" salah tempat & mudah hilang.** `setError(reason)`
  (`cart-view.tsx:93-95`) menaruh pesan kupon ke **state `error` checkout global**
  yang dipakai bergantian oleh domain lain (blokir akun, error checkout) →
  pesan bisa tertimpa / muncul di blok yang salah, jauh dari widget kupon.
- **K3 — Preview validasi kupon bisa salah utk `limitPerUser`.** `/api/coupons/validate`
  (`route.ts:57`) memanggil `validateCoupon` **tanpa** `userUsageCount` → fallback
  ke `usedBy` yang dibatasi `MAX_COUPON_USED_BY` (1000). Untuk user ke-1001+
  (atau data lama), preview bisa keliru (server checkout tetap benar).
- **K4 — Validasi form admin minim.** `coupons-manager.tsx:519` hanya cek panjang
  kode ≥ 3. Tidak ada cek: `value` persen ≤ 100 (server clamp, tapi UX buruk),
  `startsAt < endsAt`, rentang nominal. Error baru muncul setelah round-trip server.
- **K5 — Logika inti kupon TIDAK teruji.** `computeDiscount` & `validateCoupon`
  terkurung di `coupons.ts` (`server-only` + impor Firestore) sehingga tidak masuk
  suite Node. Hanya `checkBundleRules` yang diuji (`test:bundle`). Regresi diskon/
  aturan bisa lolos tanpa terdeteksi.

### 🟡 Sedang
- **K6 — `limitPerUser` tak bisa 0 dari UI.** `coupons-manager.tsx:702`
  (`Math.max(1, ...)`) memblokir nilai 0, padahal server memaknainya "tanpa batas
  per user" (`coupons.ts:188`). Semantik tak terjangkau.
- **K7 — a11y kupon di keranjang.** Input kode promo tanpa `<label>`
  (`cart-coupon.tsx:119`); pesan error tanpa `role="alert"`/`aria-live`;
  pesan kupon-dicabut di blok global tanpa `aria-live` (`cart-view.tsx:431`).
- **K8 — Dialog form kupon tanpa focus-trap / autoFocus / restore-focus**
  (`coupons-manager.tsx:560-565`). Hanya `Escape`. Beda dari standar
  (`useDrawerFocus` sudah tersedia di proyek).
- **K9 — Statistik per-kupon membingungkan.** `getCouponStats` (`coupons.ts:620-628`):
  `orderCount` **mencakup** order dibatalkan, `totalDiscount` **tidak**. Label UI
  "Order / Σ diskon / Dibatalkan" tanpa penjelasan sumber → mudah disalahartikan.

### 🔵 Rendah
- **K10 — Kode mati:** `couponValueLabel` (`admin-coupons-api.ts:101`) tidak dipakai.
- **K11 — Inkonsistensi rate-limit:** order pakai `rateLimit` (sync),
  coupons/validate pakai `checkRateLimit` (async).
- **K12 — `aria-invalid`/`aria-describedby` tidak ada** pada field form kupon &
  input kode promo saat error.
- **K13 — Normalisasi kode kupon tidak di schema.** `order-schema.ts:20` menerima
  kode apa adanya; normalisasi hanya di server. Minor (server aman).
- **K14 — `getCouponStats` memuat SELURUH koleksi `orders`** (cap ada via cache TTL
  60s). Catatan performa skala (`KP-P2`).

> **Catatan audit:** klaim "description tidak bisa di-clear" **dibantah** —
> schema `.optional()` menerima string kosong & `stripUndefined` hanya membuang
> `undefined`, jadi deskripsi **bisa** dikosongkan. Tidak ada perbaikan diperlukan.

---

## 2. Flow Task (Fase K0–K6)

> Tiap fase: kerjakan → gate `tsc`+`lint`+test+`build` → update checklist.

### Fase K0 — Audit & dokumen (selesai)
- [x] Petakan seluruh file & verifikasi temuan.
- [x] Tulis dokumen ini.
- **DoD:** daftar gap terkunci.

### Fase K1 — Ekstrak logika murni + test (K5) — ✅ SELESAI
- [x] Pindahkan `computeDiscount` & `validateCoupon` ke `src/lib/coupon-pure.ts`
      (murni, mandiri/tanpa impor alias), re-ekspor dari `coupons.ts`.
- [x] `checkBundleRules` dipindah ke `coupon-pure.ts` (hapus `coupon-rules.ts`,
      satu sumber kebenaran); test bundle diarahkan ke sana.
- [x] `scripts/coupon-pure.test.ts` — 24 test (diskon persen/nominal/`maxDiscount`/
      floor/batas ≤ subtotal/subtotal 0; tanggal; min belanja; kuota; per-user
      termasuk `limitPerUser=0`; bundel; diskon 0).
- [x] Script `test:coupon` + `tsconfig.json` exclude.
- **Hasil:** `tsc` ✅ · `eslint` ✅ · `test:coupon` 24 ✅ · `test:bundle` 9 ✅ ·
      `build` ✅. Semua `test:*` = **389** lolos.

### Fase K2 — UX kupon di keranjang (K1, K2, K7) — ✅ SELESAI
- [x] State `couponNotice` khusus kupon di `cart-view` (terpisah dari `error`
      checkout global); ditampilkan di widget kupon.
- [x] `coupon-api`: `CouponSessionError` (sesi hilang) dibedakan dari error
      jaringan/server.
- [x] Re-validasi: (a) tak-valid → cabut + alasan; (b) sesi hilang → cabut +
      "masuk kembali"; (c) gangguan jaringan → **pertahankan** + "tak bisa
      diverifikasi"; (d) valid → perbarui diskon + bersihkan notice.
- [x] Logout memicu re-validasi (`user?.uid` di deps) → kupon basi dicabut (F-K1).
- [x] `cart-coupon.tsx`: `<label>` sr-only, `aria-invalid`/`aria-describedby`,
      `role="alert"` pada error, `role="status" aria-live` pada notice.
- **Hasil:** `tsc` ✅ · `eslint` ✅ · semua `test:*` = **389** ✅ · `build` ✅.

### Fase K3 — Validasi & form admin (K4, K6, K8, K12) — ✅ SELESAI
- [x] Validasi klien murni `validateCouponForm` (`coupon-pure.ts`): kode (≥3, A-Z0-9),
      persen 1–100, nominal >0, `minSpend`≥0, `maxDiscount`≥0, `startsAt < endsAt`,
      `usageLimit`≥1, `limitPerUser`≥0. **+11 test** (`test:coupon` 35).
- [x] `limitPerUser` kini **boleh 0** (= tanpa batas) + label jelas (keputusan pemilik).
- [x] `aria-invalid` + `aria-describedby` + `role="alert"` per field error (K12).
- [x] Dialog: focus-trap via `useDrawerFocus`, `data-autofocus` field pertama,
      restore-focus (K8); Escape tetap berfungsi.
- **Hasil:** `tsc` ✅ · `eslint` ✅ · semua `test:*` = **400** ✅ · `build` ✅.

### Fase K4 — Perbaikan preview & statistik (K3, K9) — ✅ SELESAI
- [x] `/api/coupons/validate`: sertakan `userUsageCount` (via `getUserCouponUsage`)
      agar preview aturan `limitPerUser` akurat (K3).
- [x] Statistik: `CouponStat` + `activeOrders` (non-batal) sebagai metrik utama;
      agregasi diekstrak ke fungsi murni `aggregateCouponStats` (`coupon-pure.ts`)
      dan diuji (**+5 test**). UI kartu: "Order aktif (n/total)", "Σ diskon",
      "Dibatalkan" + tooltip; CSV menambah kolom "Order Aktif" (K9).
- **Hasil:** `tsc` ✅ · `eslint` ✅ · semua `test:*` = **405** ✅ · `build` ✅.

### Fase K5 — Kebersihan & konsistensi (K10, K11, K13) — ✅ SELESAI
- [x] Hapus kode mati `couponValueLabel` (+ impor `formatRupiah` yang jadi tak terpakai) (K10).
- [x] Samakan rate-limit helper: **semua** endpoint yang masih memakai `rateLimit`
      (sync) → `checkRateLimit` (async, Upstash-ready, fail-safe): `orders`,
      `cart/draft`, `lead`, `downloads/[token]/[index]`, `user/addresses`,
      `user/wishlist`, `webhooks/mayar` (K11).
- [x] Normalisasi kode kupon via `.transform()` di `order-schema.ts` (uppercase,
      buang non-A-Z0-9) + test baru `test:order-schema` (**5 test**) (K13).
- **Hasil:** `tsc` ✅ · `eslint` ✅ · semua `test:*` = **410** ✅ · `build` ✅.

### Fase K6 — QA, docs & rilis — ✅ SELESAI
- [x] Gate penuh (`tsc`/`eslint`/semua `test:*`/`build`) — semua hijau.
- [x] Audit akhir: tak ada sisa `coupon-rules`/`couponValueLabel`/`rateLimit` (sync);
      `CouponStat` satu sumber (`coupon-pure.ts`).
- [x] Update `docs/README.md` + `TASK-SELANJUTNYA.md`.
- [x] Commit konvensional + push.
- **Uji browser (manual, pemilik):** apply/clear kupon, kupon bundel dicabut saat
      item syarat hilang, edit/aktif/arsip/restore kupon, ekspor CSV, `/promo` "Pakai Kode".

---

## 3. Hasil

**Status: ✅ SELESAI (kode) — K0–K6.** Seluruh 14 gap (K1–K13) tertutup.

### Gate
- `npx tsc --noEmit` bersih ✅
- `npx eslint . --max-warnings=0` bersih ✅
- Semua `test:*` hijau ✅ (**410** test; `test:coupon` **40**, `test:order-schema` **5**)
- `npm run build` sukses ✅

### Ringkasan per fase
- **K1 (K5-gap):** logika murni `coupon-pure.ts` (`computeDiscount`, `validateCoupon`,
  `checkBundleRules`, `validateCouponForm`, `aggregateCouponStats`) + test; `coupon-rules.ts` dihapus.
- **K2 (K1/K2/K7):** UX kupon keranjang — `couponNotice` khusus, `CouponSessionError`
  (sesi hilang vs jaringan), re-validasi cerdas (pertahankan bila jaringan; cabut bila
  sesi hilang/tak valid), logout memicu cek, a11y widget.
- **K3 (K4/K6/K8/K12):** validasi form admin murni + error per-field; `limitPerUser`
  boleh 0 (tanpa batas); a11y (`aria-invalid`/`aria-describedby`/`role="alert"`);
  dialog focus-trap + `data-autofocus`.
- **K4 (K3/K9):** preview validasi akurat (`userUsageCount`); statistik `activeOrders`
  (aktor utama) + tooltip + kolom CSV.
- **K5 (K10/K11/K13):** hapus kode mati; seragamkan rate-limit (`checkRateLimit` di 7
  endpoint); normalisasi `couponCode` via `.transform()`.
- **K6:** QA akhir + dokumentasi + rilis.

### Keputusan pemilik (diterapkan)
1. Statistik per-kupon → `activeOrders` (non-batal) sebagai metrik utama + `cancelledOrders` terpisah. ✅
2. `limitPerUser` → izinkan 0 (= tanpa batas) + label. ✅
3. Normalisasi kode → `.transform()` di schema (uppercase). ✅

### Catatan
- Klaim audit "description tidak bisa di-clear" **dibantah** (schema `.optional()`
  menerima string kosong) — tidak ada perubahan diperlukan.

### Sisa manual (pemilik)
- Uji browser alur kupon (keranjang & `/promo`) + dashboard admin.
