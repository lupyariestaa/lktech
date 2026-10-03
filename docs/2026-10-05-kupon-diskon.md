# KUPON / DISKON — Modul Promo (Admin + Penerapan di Keranjang & Checkout)

> **Status dokumen:** 📝 **Rencana** (belum dieksekusi)
> **Disusun:** 2026-10-05
> **Cakupan:** Sistem **kupon/diskon** end-to-end — CRUD kupon di dashboard (`/admin/coupons`), validasi & penerapan kupon di keranjang (`/keranjang`), perhitungan diskon **terverifikasi server** saat checkout, pencatatan pemakaian di order, dan tampilan diskon di semua tempat (keranjang, pesan WhatsApp, email, detail order admin).
> **Tujuan:** Mendorong **konversi & kampanye promosi** — pembeli bisa memakai kode promo (persen/nominal) dengan syarat (min. belanja, masa berlaku, kuota) yang dikelola admin.
> **Prasyarat baca:** `docs/2026-10-02-orders-admin-module.md` (modul & model order), `docs/2026-10-02-revisi-sistem-produk.md` (produk/varian), `docs/2026-10-05-email-transaksional-pembeli.md` (email order), pola modul admin (`docs/2026-10-05-modul-pengguna-dan-whatsapp.md`), `docs/README.md`.

---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Baseline — Kondisi Toko Saat Ini](#2-baseline--kondisi-toko-saat-ini)
3. [Keputusan Desain](#3-keputusan-desain)
4. [Audit — Temuan & Celah](#4-audit--temuan--celah)
5. [Spesifikasi Target](#5-spesifikasi-target)
6. [Arsitektur & Model Data](#6-arsitektur--model-data)
7. [TASK IMPLEMENTATION FLOW (FASE K0–K8)](#7-task-implementation-flow-fase-k0k8)
8. [Definition of Done & Checklist QA](#8-definition-of-done--checklist-qa)
9. [Risiko & Mitigasi](#9-risiko--mitigasi)
10. [Out of Scope](#10-out-of-scope)
11. [Estimasi & Urutan Pengerjaan](#11-estimasi--urutan-pengerjaan)
12. [Lampiran — Referensi Pola Existing](#12-lampiran--referensi-pola-existing)

---

## 1. Ringkasan Eksekutif

Toko LKTech sudah punya alur jual-beli lengkap: produk (multi-varian), keranjang, checkout via WhatsApp, orders admin, email transaksional, dan portal akun. Namun **belum ada mekanisme promo/diskon sama sekali** — tidak ada cara memberi potongan harga untuk kampanye (diskon launching, kode influencer, promo musiman).

**Rencana:** Membangun sistem **kupon** yang:
1. **Dikelola admin** dari dashboard (`/admin/coupons`: buat/edit/nonaktifkan/hapus kupon, lihat pemakaian).
2. **Dipasang pembeli** di halaman `/keranjang` ("Punya kode promo?") → divalidasi & ditampilkan diskonnya.
3. **Diverifikasi server** saat checkout (harga & diskon dihitung ulang server — anti-manipulasi, konsisten dengan prinsip harga produk).
4. **Tercatat** di order (kode kupon, jumlah diskon) → tampil di pesan WhatsApp, email, dan detail order admin.
5. **Mendukung jenis** diskon: **persen (%)** atau **nominal (Rp)**, dengan **syarat**: min. belanja, maks. diskon (untuk %), masa berlaku, dan **kuota pemakaian**.

**Prinsip:** Reuse pola modul admin (orders/users) & infrastruktur checkout yang ada. Semua kupon & pemakaian via **Admin SDK (server)**; klien hanya mengirim **kode** + meminta validasi (tidak pernah mengirim nominal diskon).

---

## 2. Baseline — Kondisi Toko Saat Ini

### 2.1 Alur belanja
- **Produk** (`/produk`): multi-varian (slug unik global), harga per varian.
- **Keranjang** (`cart-provider`, localStorage per-identitas): `CartItem { slug, name, price, qty, variantSlug?, variantName? }`; `subtotal` = Σ price × qty.
- **Checkout** (`POST /api/orders`, `src/app/api/orders/route.ts`):
  - Klien kirim `{ items: [{slug, variantSlug?, qty}], buyerName }`.
  - Server **memverifikasi ulang** harga dari Firestore (`getProductsBySlugs`), hitung `total`, susun **pesan WhatsApp kanonik** (`buildOrderMessage`), simpan order.
  - Lalu kirim notifikasi admin (`sendOrderNotification`) + email konfirmasi pembeli (`sendOrderConfirmationToBuyer`).
- **Keranjang tampilan** (`cart-view.tsx`): daftar item, subtotal, tombol checkout; belum ada input kupon.
- **Admin orders** (`/admin/orders`): daftar, filter, ubah status, detail.

### 2.2 Model `Order` (`src/lib/order-types.ts`)
```ts
type Order = {
  id; uid; buyerName; buyerEmail; items: OrderItem[];
  total: number;              // total akhir (setelah diskon, nanti)
  status; whatsapp; message; createdAt;
};
type OrderItem = { slug; name; price; qty; subtotal; variantSlug?; variantName? };
```
- **Belum ada** field diskon/kupon.

### 2.3 Infrastruktur yang bisa direuse
- Pola modul admin: `requireAdmin`, `adminFetch`, manager + API + klien + toast + ConfirmDialog + ekspor CSV.
- Normalizer data (pola `product-types.ts`/`order-types.ts`): `normalizeX(data)`.
- Format: `formatRupiah` (`src/lib/format.ts`).
- `revalidatePath` untuk invalidasi setelah admin mengubah.
- Checkout server-authoritative (harga dihitung server).

### 2.4 Yang BELUM ada
- Koleksi `coupons` & CRUD admin.
- Input kupon + validasi di keranjang.
- Perhitungan diskon server-authoritative.
- Field diskon di order + tampilan (pesan/email/admin).
- Pencatatan pemakaian (kuota).

---

## 3. Keputusan Desain

| # | Keputusan | Alasan |
|---|---|---|
| K1 | **Diskon diterapkan ke subtotal** (semua item), bukan per-produk (v1) | Sederhana; cukup untuk kampanye umum |
| K2 | Jenis: **persen (%)** atau **nominal (Rp)** | Fleksibel & paling umum |
| K3 | Syarat: **min. belanja**, **maks. diskon** (untuk %), **masa berlaku** (mulai–selesai), **kuota total** | Standar promo yang aman |
| K4 | **Validasi & hitung diskon di SERVER** saat checkout; klien hanya kirim **kode** | Anti-manipulasi (selaras harga produk) |
| K5 | **Satu kupon per order** (v1); tidak bisa digabung | Sederhana & aman |
| K6 | Kupon disimpan dengan **kode unik** (case-insensitive, uppercase) | Standar |
| K7 | **Kuota** dicatat via `usageCount` + `usedBy: string[]` (uid) — tolak bila kuota habis | Kontrol pemakaian |
| K8 | **Batas per user** (mis. 1× per user) opsional (flag `limitPerUser`) | Mencegah penyalahgunaan |
| K9 | Diskon **tidak mengurangi** harga di keranjang secara paksa — hanya **ditampilkan**; perhitungan final di server | Konsistensi |
| K10 | Kupon **bisa dinonaktifkan** (`active`) tanpa hapus | Kontrol kampanye |
| K11 | **Jam pemakaian**: promo dianggap sah **hanya bila status ≠ dibatalkan**; hitung kuota final (opsional kompleks → v1 hitung saat checkout, kembalikan bila order dibatalkan **opsional**) | Kesederhanaan |
| K12 | **Tanpa** kupon publik otomatis (hanya via input kode) | Hindari kebocoran promo |

---

## 4. Audit — Temuan & Celah

Format: **[KP-xx] Judul** — *Severity* — Lokasi — Dampak — Rekomendasi.

**[KP-01] Tidak ada mekanisme diskon sama sekali** — 🔴 Tinggi (permintaan) — toko. — Tidak bisa kampanye promosi. — **Rekomendasi:** modul kupon.

**[KP-02] Keranjang tak punya input/tampilan kupon** — 🔴 Tinggi — `cart-view.tsx`. — Pembeli tak bisa pakai promo. — **Rekomendasi:** section "Kode Promo" + tampil diskon.

**[KP-03] Order tak menyimpan info kupon** — 🟠 Menengah — `order-types.ts`. — Riwayat/audit tak tahu diskon. — **Rekomendasi:** field `coupon` + `discount` + `totalBeforeDiscount`.

**[KP-04] Pesan WhatsApp & email tak menampilkan diskon** — 🟠 Menengah — `cart.ts` (`buildOrderMessage`), `email-order.ts`. — Pembeli/admin bingung angka. — **Rekomendasi:** tampilkan baris diskon bila ada.

**[KP-05] Tak ada modul admin promo** — 🔴 Tinggi. — Tak bisa kelola promo. — **Rekomendasi:** `/admin/coupons`.

**[KP-06] Perhitungan total hanya subtotal** — 🟠 Menengah — `api/orders` POST. — Diskon belum masuk. — **Rekomendasi:** total = subtotal − diskon (server).

**[KP-07] Tidak ada pencatatan pemakaian kupon** — 🟠 Menengah. — Kuota tak terkontrol. — **Rekomendasi:** `usageCount` + `usedBy`.

**[KP-08] Tidak ada validasi kode (spam/abuse)** — 🟠 Menengah. — Endpoint validasi bisa dispam. — **Rekomendasi:** rate limit + validasi semua syarat server.

**[KP-09] Detail order admin tak menampilkan diskon** — 🔵 Rendah — `orders-manager.tsx`. — **Rekomendasi:** tampilkan bila ada.

### 4.4 Ringkasan temuan

| ID | Temuan | Severity | Fase |
|---|---|---|---|
| KP-01/05 | Tak ada kupon & modul admin | 🔴 | K1/K4 |
| KP-02 | Keranjang tak ada kupon | 🔴 | K5 |
| KP-03/06 | Order & total tanpa diskon | 🟠 | K2/K6 |
| KP-04 | Pesan/email tanpa diskon | 🟠 | K6/K7 |
| KP-07/08 | Kuota & anti-abuse | 🟠 | K3/K5 |
| KP-09 | Detail admin | 🔵 | K7 |

---

## 5. Spesifikasi Target

### 5.1 Alur pembeli
```
/keranjang
  ├─ daftar item + subtotal
  ├─ [Input kode promo] → [Terapkan]
  │     → validasi (API) → tampil "Diskon (PROMO10) −Rp50.000"
  ├─ Total = subtotal − diskon
  └─ [Checkout via WhatsApp] → server verifikasi harga + kupon → order
```

- Bila kode tidak valid/expired/min tak terpenuhi → pesan jelas (tanpa mengganggu alur).
- Kode kupon **disimpan di state** (bukan localStorage wajib) agar tidak "nyangkut"; boleh di-persist opsional.

### 5.2 Aturan kupon
| Atribut | Keterangan |
|---|---|
| `code` | unik, A-Z0-9, uppercase (mis. `PROMO10`) |
| `type` | `percent` \| `amount` |
| `value` | persen (1–100) atau nominal Rp |
| `minSpend` | min. subtotal agar berlaku (0 = tanpa syarat) |
| `maxDiscount` | batas diskon untuk tipe persen (opsional) |
| `startsAt` / `endsAt` | masa berlaku (ISO; kosong = tak dibatasi) |
| `usageLimit` | kuota total (0/null = tak terbatas) |
| `limitPerUser` | mis. 1× per user (opsional, default 1) |
| `active` | aktif/nonaktif |
| `usageCount` | terhitung |
| `usedBy` | array uid (untuk batas per user; maks mis. 1000) |

### 5.3 Modul admin `/admin/coupons`
- Daftar kupon: kode, jenis & nilai, syarat, kuota (`usageCount`/`usageLimit`), masa berlaku, status, aksi (edit, aktif/nonaktif, hapus).
- Form buat/edit: semua atribut + validasi.
- Statistik ringkas: total kupon, aktif, total pemakaian.
- Ekspor CSV (opsional).

### 5.4 Tampilan diskon
- **Keranjang**: baris diskon + total akhir.
- **Pesan WhatsApp**: `Total: RpX` → `Subtotal`, `Diskon (KODE): −RpY`, `Total: RpZ`.
- **Email konfirmasi & status**: baris diskon bila ada.
- **Detail order admin**: baris diskon + kode.

---

## 6. Arsitektur & Model Data

### 6.1 Koleksi `coupons` (`coupons/{id}`)
```ts
export const COUPON_TYPES = ["percent", "amount"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export type Coupon = {
  id: string;
  code: string;            // uppercase, unik
  description?: string;
  type: CouponType;
  value: number;           // percent (1-100) atau Rupiah
  minSpend: number;        // 0 = tanpa minimal
  maxDiscount?: number;    // batas utk percent
  startsAt?: string;       // ISO
  endsAt?: string;         // ISO
  usageLimit?: number;     // 0/undefined = tak terbatas
  limitPerUser: number;    // default 1
  active: boolean;
  usageCount: number;
  usedBy: string[];        // uid pemakai (maks disimpan sebagian)
  createdAtISO: string;
  updatedAtISO?: string;
  createdBy?: string;
};
```

### 6.2 Perluasan `Order` (`order-types.ts`)
```ts
export type OrderCoupon = {
  code: string;
  type: CouponType;
  /** Jumlah diskon (Rupiah) yang diterapkan. */
  discount: number;
};

export type Order = {
  ...existing;
  /** Subtotal sebelum diskon (Rp). */
  subtotal?: number;
  /** Kupon yang dipakai (bila ada). */
  coupon?: OrderCoupon;
  /** Total akhir = subtotal − discount. */
  total: number; // tetap nama "total" (akhir)
};
```
> Backward-compatible: order lama tanpa `subtotal`/`coupon` → default (subtotal = total, tanpa kupon).

### 6.3 Logika inti `src/lib/coupons.ts` (server-authoritative)
```ts
/** Hitung diskon untuk sebuah kupon & subtotal. Murni (tanpa I/O). */
export function computeDiscount(coupon: Coupon, subtotal: number): number;

/** Validasi kupon terhadap keranjang & konteks user. Mengembalikan alasan bila gagal. */
export type CouponValidation =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; reason: string };

export function validateCoupon(
  coupon: Coupon | null,
  opts: { subtotal: number; uid?: string; now?: Date },
): CouponValidation;
```
Aturan:
- `active` true; `startsAt` ≤ now ≤ `endsAt` (bila di‑set).
- `subtotal ≥ minSpend`.
- Kuota: `usageLimit` 0/null = ∞; else `usageCount < usageLimit`.
- Per user: `usedBy` menghitung uid < `limitPerUser`.
- Hitung diskon: `percent` → `min(subtotal×value/100, maxDiscount ?? ∞)`; `amount` → `min(value, subtotal)`; diskon ≤ subtotal.

### 6.4 Data layer `src/lib/coupons.ts` (I/O, server-only)
- `listCoupons()`, `getCouponByCode(code)`, `getCouponById(id)`.
- `createCoupon(input)`, `updateCoupon(id, patch)`, `deleteCoupon(id)`.
- `redeemCoupon(id, uid)` — `usageCount++`, `usedBy.push(uid)` (dipanggil saat order sukses).
- Normalizer `normalizeCoupon(data)`.

### 6.5 API
| Method | Path | Akses | Fungsi |
|---|---|---|---|
| GET | `/api/admin/coupons` | admin | Daftar + `?summary=1` |
| POST | `/api/admin/coupons` | admin | Buat kupon |
| PATCH | `/api/admin/coupons?id` | admin | Edit / aktif-nonaktif |
| DELETE | `/api/admin/coupons?id` | admin | Hapus |
| POST | `/api/coupons/validate` | user (login) | Validasi kode + hitung diskon untuk subtotal (rate-limited) |

> **Checkout** (`POST /api/orders`) diperluas: terima `couponCode?`; server ambil kupon, validasi, hitung diskon, set `total`, catat `redeemCoupon`.

### 6.6 File BARU/DIUBAH

**Baru:**
| File | Peran |
|---|---|
| `src/lib/coupon-types.ts` | Tipe `Coupon`, `OrderCoupon`, konstanta |
| `src/lib/coupons.ts` | Data layer + `computeDiscount`/`validateCoupon` |
| `src/lib/admin-coupons-api.ts` | Klien adminFetch + ekspor CSV |
| `src/app/api/admin/coupons/route.ts` | CRUD kupon admin |
| `src/app/api/coupons/validate/route.ts` | Validasi kupon (pembeli) |
| `src/app/admin/(dashboard)/coupons/page.tsx` | Halaman admin kupon |
| `src/components/admin/coupons-manager.tsx` | Manager (daftar + form + statistik) |
| `src/components/cart-coupon.tsx` | Input & tampilan kupon di keranjang (klien) |

**Diubah:**
| File | Perubahan |
|---|---|
| `src/lib/order-types.ts` | `OrderCoupon`, `subtotal?`, `coupon?` di `Order` |
| `src/lib/order-schema.ts` | `checkoutSchema` + `couponCode?` |
| `src/lib/cart.ts` | `buildOrderMessage` menampilkan diskon (opsional param) |
| `src/lib/email-order.ts` | Baris diskon di email konfirmasi/status |
| `src/lib/api-schemas.ts` | Schema kupon (create/update/redeem) |
| `src/app/api/orders/route.ts` | Verifikasi & terapkan kupon; `redeemCoupon`; total akhir |
| `src/lib/orders.ts` | `createOrder` menyimpan `subtotal`/`coupon` |
| `src/components/cart-view.tsx` | Integrasi `cart-coupon`; tampil diskon; kirim `couponCode` |
| `src/lib/order-api.ts` | `createOrderRequest` terima `couponCode` |
| `src/components/admin/orders-manager.tsx` | Tampilkan diskon/kupon di detail |
| `src/lib/admin-nav.ts` | Menu "Kupon" (grup Toko) |
| `src/lib/admin-users-api.ts` / admin overview | (Opsional) metrik kupon |
| `src/lib/format.ts` | (Opsional) helper `percentLabel` |
| `docs/README.md`, `TASK-SELANJUTNYA.md` | Dokumentasi |

---

## 7. TASK IMPLEMENTATION FLOW (FASE K0–K8)

### FASE K0 — Persiapan & baseline (±20 menit)
- [ ] Baca dokumen ini + `orders-admin-module.md` + `revisi-sistem-produk.md`.
- [ ] Baseline: `tsc`/`lint`/`build` bersih.

### FASE K1 — Model & logika inti (±2 jam)
- [ ] `coupon-types.ts` (Coupon, OrderCoupon, konstanta).
- [ ] `coupons.ts`: `computeDiscount`, `validateCoupon` (murni) + normalizer + data layer (list/get/create/update/delete/redeem).
- **DoD:** logika diskon benar (uji kasus: persen, nominal, min, max, kuota, expired).

### FASE K2 — Model order (±1 jam)
- [ ] `order-types.ts`: `OrderCoupon` + `subtotal?` + `coupon?`; normalizer backward-compat.
- [ ] `orders.ts`: `createOrder` menyimpan field baru.
- **DoD:** order lama tetap valid; order baru menyimpan kupon.

### FASE K3 — API admin kupon (±2 jam)
- [ ] `api/admin/coupons/route.ts` (GET list + summary, POST, PATCH, DELETE) + validasi zod.
- [ ] `admin-coupons-api.ts` (klien + `exportCouponsToCsv`).
- **DoD:** CRUD berfungsi & aman (`requireAdmin`).

### FASE K4 — Halaman admin kupon (±2.5 jam)
- [ ] `admin-nav.ts`: menu "Kupon".
- [ ] `admin/(dashboard)/coupons/page.tsx` + `coupons-manager.tsx` (daftar, statistik, form buat/edit, aktif/nonaktif, hapus, CSV).
- **DoD:** admin bisa kelola kupon; responsif; a11y.

### FASE K5 — Validasi kupon (pembeli) (±1.5 jam)
- [ ] `api/coupons/validate/route.ts` (login + rate limit; validasi via `validateCoupon`).
- [ ] `cart-coupon.tsx`: input kode + tombol terapkan + tampilan diskon/error.
- **DoD:** kode valid → tampil diskon; invalid → pesan jelas.

### FASE K6 — Checkout server-authoritative (±2 jam)
- [ ] `order-schema.ts`: `couponCode?`.
- [ ] `api/orders` POST: validasi kupon, hitung diskon, `total = subtotal − diskon`, simpan, `redeemCoupon`.
- [ ] `cart-view.tsx`: kirim `couponCode`; tampil subtotal/diskon/total; reset kupon setelah sukses.
- **DoD:** diskon diterapkan konsisten; kuota berkurang; manipulasi klien tak berpengaruh.

### FASE K7 — Tampilan diskon menyeluruh (±1.5 jam)
- [ ] `buildOrderMessage` (WhatsApp) menampilkan baris diskon.
- [ ] `email-order.ts`: baris diskon di email konfirmasi & status.
- [ ] `orders-manager.tsx`: tampilkan kupon/diskon di detail order admin.
- **DoD:** angka konsisten di semua kanal.

### FASE K8 — QA, dokumentasi, deploy
- [ ] `tsc`/`lint`/`build` bersih.
- [ ] Checklist QA §8.
- [ ] Dokumentasi: status → ✅ + update `docs/README.md` & `TASK-SELANJUTNYA.md`.
- [ ] Commit per fase → push → uji produksi.

---

## 8. Definition of Done & Checklist QA

### 8.1 DoD global
1. `tsc` bersih, `build` sukses, `lint` bersih.
2. Tidak ada regresi: keranjang, checkout, order, email, admin orders, akun.
3. Harga & diskon **dihitung server** (klien tidak bisa memalsukan diskon).

### 8.2 Admin kupon
- [ ] Menu "Kupon" & halaman `/admin/coupons` berfungsi.
- [ ] Buat/edit/nonaktifkan/hapus kupon; validasi form.
- [ ] Kode unik (tolak duplikat).
- [ ] Statistik & (opsional) CSV.

### 8.3 Penerapan kupon
- [ ] Input kode di `/keranjang` → tampil diskon bila valid.
- [ ] Kode invalid/expired/min kurang → pesan jelas.
- [ ] Checkout menerapkan diskon; `total` akhir benar.
- [ ] Kuota berkurang; batas per-user dipatuhi.
- [ ] Diskon tampil di WhatsApp, email, detail admin.

### 8.4 Keamanan
- [ ] Diskon dihitung server dari kode (klien kirim kode saja).
- [ ] Kode yang tak valid/dinonaktifkan ditolak.
- [ ] Validasi kupon di-rate-limit.
- [ ] Hanya user login yang bisa checkout/kupon.

### 8.5 Regresi
- [ ] Checkout tanpa kupon tetap normal (total = subtotal).
- [ ] Order lama tanpa field kupon tetap tampil.
- [ ] Email & pesan tanpa kupon tidak berubah.

---

## 9. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Diskon dimanipulasi klien | Tinggi | Hitung server; klien hanya kirim kode |
| R2 | Kuota tak akurat saat order dibatalkan | Sedang | v1 hitung saat checkout; **opsional** kembalikan saat dibatalkan (fase lanjut) |
| R3 | Race condition kuota (dua order bersamaan) | Sedang | Transaksi/increment atomik Firestore saat redeem; toleransi kecil |
| R4 | Kode duplikat/typo | Sedang | Normalisasi uppercase + cek unik saat buat |
| R5 | Kupon disalahgunakan (spam validasi) | Rendah | Rate limit `validate` |
| R6 | Dokumen order lama tanpa field | Sedang | Normalizer backward-compat |
| R7 | Diskon > subtotal | Sedang | Batasi `min(discount, subtotal)` |
| R8 | Zona waktu masa berlaku | Rendah | Simpan ISO UTC; bandingkan di server |
| R9 | `usedBy` membengkak (kuota besar) | Rendah | Batasi simpan (mis. 1000 uid) atau pakai subcollection (opsional) |

---

## 10. Out of Scope

- **Kupon per-produk/kategori** (v1 hanya ke subtotal) — kandidat lanjutan.
- **Penggabungan beberapa kupon** (v1 satu kupon/order).
- **Voucher publik otomatis** (hanya input kode).
- **Program loyalitas/poin** (sesi terpisah).
- **Auto-apply kode terbaik**.
- **Pengembalian kuota otomatis** saat order dibatalkan (opsional lanjut).
- **Kupon khusus user tertentu** (v1 global + batas per-user).
- **Countdown timer promo & banner promo di beranda** (kandidat lanjutan).

---

## 11. Estimasi & Urutan Pengerjaan

| Fase | Isi | Estimasi* | Nilai |
|---|---|---|---|
| K0 | Persiapan | 20 mnt | — |
| K1 | Model & logika inti | 2 jam | Fondasi |
| K2 | Model order | 1 jam | Fondasi |
| K3 | API admin kupon | 2 jam | Fondasi |
| K4 | Halaman admin kupon | 2.5 jam | 🔴 |
| K5 | Validasi kupon (keranjang) | 1.5 jam | 🔴 |
| K6 | Checkout server-side | 2 jam | 🔴 Inti |
| K7 | Tampilan diskon menyeluruh | 1.5 jam | 🟠 |
| K8 | QA & deploy | 1 jam | Wajib |

**Total inti (K0–K8):** ± 13–14 jam terfokus (± 2 sesi).

**Urutan:** K1 (logika) → K2 (order) → K3 (API) → K4 (admin) → K5 (keranjang) → K6 (checkout) → K7 (tampilan) → K8.

> **Bila 1 sesi:** K1–K6 (kupon end-to-end: admin buat → pembeli pakai → checkout) sudah memberi nilai inti. K7 menyusul.

---

## 12. Lampiran — Referensi Pola Existing

| Kebutuhan | Referensi existing |
|---|---|
| Pola modul admin (manager+API+klien) | `docs/2026-10-02-orders-admin-module.md`, `orders-manager.tsx`, `api/admin/orders/route.ts`, `admin-orders-api.ts` |
| Nav admin | `src/lib/admin-nav.ts` |
| Dialog konfirmasi & toast | `src/components/admin/confirm-dialog.tsx`, `toast.tsx` |
| Ekspor CSV | `exportLeadsToCsv` / `exportUsersToCsv` (`admin-api.ts`, `admin-users-api.ts`) |
| Normalizer tipe data | `src/lib/product-types.ts`, `src/lib/order-types.ts` |
| Checkout server-authoritative | `src/app/api/orders/route.ts` |
| Keranjang (klien) | `src/components/cart-provider.tsx`, `src/components/cart-view.tsx` |
| Pesan WhatsApp | `src/lib/cart.ts` (`buildOrderMessage`) |
| Email order | `src/lib/email-order.ts` |
| Skema validasi | `src/lib/api-schemas.ts`, `src/lib/order-schema.ts` |
| Rate limit | `src/lib/rate-limit.ts` |
| Format Rupiah | `src/lib/format.ts` |

---

## CATATAN PENUTUP

Inti pengembangan ini: menghadirkan **mesin promo (kupon/diskon)** yang aman & server-authoritative — admin kelola kode promo, pembeli pakai di keranjang, diskon diverifikasi & diterapkan saat checkout, tercatat di order dan tampil di WhatsApp/email/admin.

**Prioritas eksekusi:** K1 (logika) → K2 (order) → K3 (API) → K4 (admin) → K5 (keranjang) → K6 (checkout) → K7 (tampilan) → K8.

> Setelah dieksekusi: ubah status di header + tambah bagian "Status Eksekusi", dan catat temuan baru sebagai `KP-10+` bila ada.
