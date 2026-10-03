# PORTAL AKUN PENGGUNA — Perluasan (Rencana & Task Implementation Flow)

> **Status dokumen:** 📝 **Rencana** (belum dieksekusi)
> **Disusun:** 2026-10-05
> **Cakupan:** Halaman `/akun` — perluasan dari sekadar "profil + riwayat pesanan" menjadi **portal akun** lengkap: navigasi tab, **profil (edit)**, **riwayat pesanan (detail + ulang pesan)**, **wishlist/favorit produk**, dan **alamat pengiriman**. Plus titik masuk (entry point) dari navbar/produk.
> **Tujuan:** Mendorong **repeat order** & loyalitas dengan memberikan pengalaman akun yang nyaman — pelanggan mudah menemukan pesanan lama, menyimpannya sebagai favorit, menyimpan alamat, dan mengulang pembelian dengan cepat.
> **Prasyarat baca:** `docs/2026-10-02-orders-admin-module.md` (model order), pola API `requireUser` (`src/lib/admin-guard.ts`), `docs/2026-10-02-revisi-sistem-produk.md` (model produk/varian), `docs/README.md`.

---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Baseline — Kondisi Akun Saat Ini](#2-baseline--kondisi-akun-saat-ini)
3. [Keputusan Desain](#3-keputusan-desain)
4. [Audit — Temuan & Celah](#4-audit--temuan--celah)
5. [Spesifikasi Target](#5-spesifikasi-target)
6. [Arsitektur & Model Data](#6-arsitektur--model-data)
7. [TASK IMPLEMENTATION FLOW (FASE 0–7)](#7-task-implementation-flow-fase-0-7)
8. [Definition of Done & Checklist QA](#8-definition-of-done--checklist-qa)
9. [Risiko & Mitigasi](#9-risiko--mitigasi)
10. [Out of Scope](#10-out-of-scope)
11. [Estimasi & Urutan Pengerjaan](#11-estimasi--urutan-pengerjaan)
12. [Lampiran — Referensi Pola Existing](#12-lampiran--referensi-pola-existing)

---

## 1. Ringkasan Eksekutif

Halaman `/akun` saat ini **fungsional tetapi minimal**: menampilkan profil (nama, email, foto, "bergabung sejak", jumlah pembelian), tombol "Jelajahi Produk"/"Keluar", dan **daftar riwayat pesanan** (best-effort). Tidak ada:

- **Navigasi/tab** (semua menumpuk di satu halaman).
- **Edit profil** (nama tidak bisa diubah dari UI — hanya terisi dari Google saat login).
- **Detail pesanan** (item ringkas saja, tanpa cara **mengulang pesanan**).
- **Wishlist/favorit** produk (tidak ada sama sekali).
- **Alamat pengiriman** tersimpan.
- Titik masuk jelas ke akun (hanya tombol "Akun Saya" di navbar).

**Rencana:** Ubah `/akun` menjadi **portal akun ber-tab** dengan fitur:
1. **Ringkasan** (profil ringkas + statistik + aksi cepat).
2. **Pesanan** (riwayat + detail + **"Pesan lagi"** → isi keranjang).
3. **Favorit** (wishlist produk → tambah ke keranjang).
4. **Alamat** (alamat pengiriman tersimpan; dipakai saat checkout).
5. **Profil** (edit nama; email/uid read-only dari Google).

**Prinsip:** Reuse maksimum — `requireUser` untuk API, pola `cart-provider`/`order-api` untuk klien, `OrderItem`/`Product` untuk tipe. **Tanpa** menambah dependensi. Data per-user disimpan di Firestore via Admin SDK (server), sesuai postur keamanan saat ini (klien tidak pernah akses Firestore langsung).

---

## 2. Baseline — Kondisi Akun Saat Ini

### 2.1 Halaman & Aset
- `src/app/akun/page.tsx` — layout halaman dalam (CustomCursor + Navbar + `UserGuard` + `UserAccount` + Footer), `metadata` `robots: noindex`.
- `src/components/auth/user-account.tsx` — komponen klien: fetch `/api/user/profile` + `fetchMyOrders()`, render kartu profil + statistik + riwayat pesanan.
- `src/components/auth/user-guard.tsx` — redirect ke `/masuk?next=<path>` bila belum login.
- `src/components/auth-provider.tsx` — `useAuth()` (Firebase Auth client).

### 2.2 Data (`users/{uid}`)
```ts
type UserProfile = {
  uid; email; displayName; photoURL; provider; createdAt; lastLoginAt; orderCount;
};
```
- Di-upsert dari `upsertUserProfile()` (`src/lib/user-profile.ts`) saat login Google.
- `orderCount` dinaikkan saat checkout (`incrementUserOrderCount`).

### 2.3 API
| Endpoint | Akses | Fungsi |
|---|---|---|
| `GET /api/user/profile` | user | Ambil profil |
| `POST /api/user/profile` | user | Upsert profil (dari token) |
| `GET /api/orders` | user | Daftar pesanan milik user |
| `POST /api/orders` | user | Buat pesanan (checkout) |

### 2.4 Yang SUDAH ada (fondasi kuat)
- Autentikasi Google + verifikasi token server (`requireUser`).
- Model order & produk matang (multi-varian, harga terverifikasi server).
- `cart-provider` (localStorage, per-identitas) & `add`/`clear`.
- Pola API per-user aman (token → uid/email dari token, bukan body).
- Firestore rules "tolak semua klien" + semua akses lewat Admin SDK.

### 2.5 Yang BELUM ada
- Tab/navigasi akun; edit profil dari UI; detail pesanan; "pesan lagi"; wishlist; alamat.

---

## 3. Keputusan Desain

| # | Keputusan | Alasan |
|---|---|---|
| D1 | `/akun` jadi **portal ber-tab** (client-side tabs, tanpa route baru per tab) | Sederhana; state ringan; hindari banyak route |
| D2 | **Wishlist disimpan server** (`users/{uid}` subcollection/field `wishlist: string[]` slug produk) | Konsisten antar perangkat; sesuai arsitektur "semua via server" |
| D3 | **Alamat disimpan server** (`users/{uid}` field `addresses: SavedAddress[]`) | Agar bisa dipakai lagi saat checkout |
| D4 | **Edit profil minimal**: hanya `displayName` (email & uid read-only) | Email dari Google tak bisa diubah; hindari kompleksitas |
| D5 | **"Pesan lagi"** = tambahkan item pesanan lama ke keranjang (cek produk masih aktif) | Jalur cepat repeat order |
| D6 | Checkout **tetap** via WhatsApp (tidak mengubah alur); alamat opsional dicantumkan di pesan | Konsisten dengan keputusan pemilik |
| D7 | Tidak menyimpan data sensitif (kartu/ pembayaran) | Tidak relevan (checkout manual WhatsApp) |
| D8 | Entry point: tombol akun di navbar sudah ada; tambah ikon **heart (favorit)** di kartu produk (opsional, fase lanjut) | Mendorong wishlist |

---

## 4. Audit — Temuan & Celah

Format: **[AK-xx] Judul** — *Severity* — Lokasi — Dampak — Rekomendasi.

### 4.1 Struktur & UX

**[AK-01] Semua konten dalam satu halaman tanpa navigasi** — 🟠 Menengah — `user-account.tsx`. — Sulit berkembang; pengguna harus scroll. — **Rekomendasi:** Tab (Ringkasan/Pesanan/Favorit/Alamat/Profil).

**[AK-02] Tidak bisa edit profil dari UI** — 🟠 Menengah — hanya terisi dari Google. — Nama tampil tak bisa dikoreksi. — **Rekomendasi:** Form edit `displayName` (POST `/api/user/profile` sudah menerima `displayName`).

**[AK-03] Riwayat pesanan tanpa detail** — 🟠 Menengah — `user-account.tsx:180-229`. — Item ringkas; tak bisa lihat total/status detail per pesanan. — **Rekomendasi:** Detail pesanan (dialog/halaman) + status.

**[AK-04] Tidak ada "Pesan lagi"** — 🔴 Tinggi (tujuan repeat order) — — Pengguna harus cari produk manual lagi. — **Rekomendasi:** Tombol "Pesan lagi" per pesanan → isi keranjang.

**[AK-05] Tidak ada wishlist/favorit** — 🔴 Tinggi — — Tidak ada jalur menyimpan minat. — **Rekomendasi:** Wishlist server + halaman tab Favorit + tombol tambah ke keranjang.

**[AK-06] Tidak ada alamat tersimpan** — 🟠 Menengah — — Setiap checkout ulang mengetik manual (via WA). — **Rekomendasi:** Simpan alamat; tampilkan/pilih saat checkout.

**[AK-07] Tidak ada empty-state/loading konsisten antar bagian** — 🔵 Rendah. — **Rekomendasi:** Skeleton/skeleton per tab.

### 4.2 Data & API

**[AK-08] Skema `UserProfile` belum mendukung wishlist/alamat** — 🟠 Menengah — `user-types.ts`. — **Rekomendasi:** Perluas tipe + normalizer.

**[AK-09] Belum ada API wishlist/alamat** — 🟠 Menengah. — **Rekomendasi:** `GET/PATCH /api/user/wishlist` & `/api/user/addresses` (atau satu `/api/user/preferences`).

**[AK-10] Belum ada titik masuk favorit di kartu produk** — 🟠 Menengah — `product-card.tsx`. — Sulit menandai favorit. — **Rekomendasi:** Ikon heart di kartu/detail produk (opsional).

### 4.3 Keamanan & Integritas

**[AK-11] Validasi wishlist harus cek produk ada & aktif** — 🟠 Menengah. — Agar tak menyimpan slug palsu/usang. — **Rekomendasi:** Validasi saat menambah (via `getProductsBySlugs`).

**[AK-12] Rate limit untuk mutasi profil/wishlist/alamat** — 🔵 Rendah. — **Rekomendasi:** Reuse `rateLimit()` seperti checkout.

### 4.4 Ringkasan temuan

| ID | Temuan | Severity | Fase |
|---|---|---|---|
| AK-04 | Tak ada "Pesan lagi" | 🔴 | F4 |
| AK-05 | Tak ada wishlist | 🔴 | F5 |
| AK-01 | Tak ada navigasi tab | 🟠 | F2 |
| AK-02 | Tak bisa edit profil | 🟠 | F3 |
| AK-03 | Riwayat tanpa detail | 🟠 | F4 |
| AK-06 | Tak ada alamat | 🟠 | F6 |
| AK-08/09 | Skema & API wishlist/alamat | 🟠 | F1/F5/F6 |
| AK-10 | Titik masuk favorit di produk | 🟠 | F7 |
| AK-07/11/12 | Minor (loading, validasi, rate limit) | 🔵 | F-berkala |

---

## 5. Spesifikasi Target

### 5.1 Struktur `/akun` (portal ber-tab)

```
┌─────────────────────────────────────────────────┐
│ HEADER AKUN: avatar + nama + email + tombol Keluar │
├─────────────────────────────────────────────────┤
│ TAB: [Ringkasan] [Pesanan] [Favorit] [Alamat] [Profil] │
├─────────────────────────────────────────────────┤
│ RINGKASAN   : statistik (total pesanan, bergabung),   │
│              aksi cepat (Jelajahi Produk, Lihat Favorit)│
│ PESANAN     : daftar pesanan + detail + "Pesan lagi"   │
│ FAVORIT     : grid produk favorit + tambah ke keranjang │
│ ALAMAT      : daftar alamat + tambah/edit/hapus        │
│ PROFIL      : form edit nama (email read-only)         │
└─────────────────────────────────────────────────┘
```

- Tab dikelola dengan state klien (`useState`) + sinkronisasi opsional ke query string (`?tab=pesanan`) agar bisa di-link.
- Semua tab **hanya render bila login** (dibungkus `UserGuard`).

### 5.2 Fitur per tab
1. **Ringkasan** — profil ringkas, `orderCount`, `createdAt`, tombol keluar, aksi cepat.
2. **Pesanan** — daftar (terbaru dulu) + **detail** (dialog) + **"Pesan lagi"** (isi keranjang; lewati item yang nonaktif/sold-out dengan notifikasi).
3. **Favorit** — grid produk dari slug wishlist (hidrasi via `getProductsBySlugs` server-side atau endpoint), tombol "Tambah ke keranjang" + "Hapus dari favorit".
4. **Alamat** — CRUD alamat (label, penerima, telepon, alamat lengkap, kota, kode pos, catatan). Alamat utama ditandai.
5. **Profil** — edit `displayName`; tampilkan email/provider/uid read-only.

### 5.3 Entry point
- Navbar: tombol "Akun Saya" (sudah ada) → `/akun`.
- (Opsional) ikon **heart** di `product-card`/detail produk untuk tambah/hapus favorit (butuh login; bila belum → arahkan ke `/masuk`).

---

## 6. Arsitektur & Model Data

### 6.1 Model data (perluasan `UserProfile`)

```ts
export type SavedAddress = {
  id: string;            // id acak (crypto.randomUUID di server)
  label: string;         // mis. "Rumah", "Kantor"
  recipient: string;     // nama penerima
  phone: string;
  address: string;       // alamat lengkap
  city: string;
  postalCode?: string;
  note?: string;
  isPrimary: boolean;    // alamat utama
};

export type UserProfile = {
  uid; email; displayName; photoURL; provider; createdAt; lastLoginAt; orderCount;
  /** Slug produk favorit (maks mis. 100). */
  wishlist: string[];
  /** Alamat pengiriman tersimpan. */
  addresses: SavedAddress[];
};
```

> **Backward-compatible:** dokumen lama tanpa `wishlist`/`addresses` → default `[]` di normalizer.

### 6.2 API (semua `requireUser`, token → uid)

| Method | Path | Fungsi |
|---|---|---|
| GET | `/api/user/profile` | Profil (sudah ada; tambah `wishlist`/`addresses`) |
| PATCH | `/api/user/profile` | Edit `displayName` (BARU) — atau reuse POST |
| GET | `/api/user/wishlist` | Daftar slug wishlist |
| POST | `/api/user/wishlist` | Tambah slug (validasi produk aktif) |
| DELETE | `/api/user/wishlist?slug=` | Hapus slug |
| GET | `/api/user/addresses` | Daftar alamat |
| POST | `/api/user/addresses` | Tambah alamat |
| PATCH | `/api/user/addresses?id=` | Edit / jadikan utama |
| DELETE | `/api/user/addresses?id=` | Hapus |

> Alternatif: gabung menjadi `GET/PATCH /api/user/preferences` untuk wishlist & alamat sekaligus. **Rekomendasi:** pisah wishlist & addresses agar jelas.

### 6.3 Data layer (server)
- Perluas `src/lib/user-profile.ts`: `updateUserProfile`, `getWishlist`, `addToWishlist`, `removeFromWishlist`, `listAddresses`, `addAddress`, `updateAddress`, `deleteAddress`.
- Normalizer `normalizeProfile` diperluas (wishlist/addresses).

### 6.4 File BARU/DIUBAH

**Baru:**
| File | Peran |
|---|---|
| `src/components/auth/account-tabs.tsx` | Wrapper tab akun (state + aksesibilitas) |
| `src/components/auth/account-overview.tsx` | Tab Ringkasan |
| `src/components/auth/account-orders.tsx` | Tab Pesanan (+detail +pesan lagi) |
| `src/components/auth/account-wishlist.tsx` | Tab Favorit |
| `src/components/auth/account-addresses.tsx` | Tab Alamat |
| `src/components/auth/account-profile.tsx` | Tab Profil (edit nama) |
| `src/lib/user-account-api.ts` | Klien fetch (wishlist, addresses, profile patch) |
| `src/app/api/user/wishlist/route.ts` | API wishlist |
| `src/app/api/user/addresses/route.ts` | API alamat |

**Diubah:**
| File | Perubahan |
|---|---|
| `src/lib/user-types.ts` | `SavedAddress` + perluasan `UserProfile` |
| `src/lib/user-profile.ts` | CRUD wishlist/alamat + normalizer |
| `src/lib/api-schemas.ts` | Schema wishlist/address/profile-update |
| `src/app/api/user/profile/route.ts` | Tambah `PATCH` (edit displayName) |
| `src/components/auth/user-account.tsx` | Rombak → pakai `account-tabs` |
| `src/app/akun/page.tsx` | (Kemungkinan) judul/metadata saja |
| `src/components/product-card.tsx` | (Opsional) tombol favorit |
| `docs/README.md`, `TASK-SELANJUTNYA.md` | Dokumentasi |

---

## 7. TASK IMPLEMENTATION FLOW (FASE 0–7)

### FASE 0 — Persiapan & baseline (±20 menit)
- [ ] Baca dokumen ini + `orders-admin-module.md` + `revisi-sistem-produk.md`.
- [ ] Baseline: `npx tsc --noEmit` bersih, `npx eslint .` bersih, `npm run build` sukses.
- [ ] Screenshot "before": `/akun`.

### FASE 1 — Data & API layer (±2 jam)
- [ ] Perluas `user-types.ts` (`SavedAddress`, `UserProfile.wishlist`/`addresses`).
- [ ] Perluas `user-profile.ts`: normalizer + CRUD wishlist & alamat (+ `updateUserProfile`).
- [ ] Tambah schema di `api-schemas.ts`.
- [ ] Buat `api/user/wishlist/route.ts` (GET/POST/DELETE, validasi produk aktif, rate limit).
- [ ] Buat `api/user/addresses/route.ts` (GET/POST/PATCH/DELETE).
- [ ] `api/user/profile/route.ts`: tambah `PATCH` (edit displayName).
- **DoD:** tsc/lint/build bersih; endpoint dapat diuji (via token).

### FASE 2 — Portal ber-tab (kerangka) (±2 jam)
- [ ] Buat `account-tabs.tsx` (tab aksesibel: `role="tablist"`, `aria-selected`, keyboard) + sinkron ke `?tab=`.
- [ ] Rombak `user-account.tsx`: header akun + tab + render panel.
- [ ] Pindahkan kartu profil/statistik ke `account-overview.tsx`.
- **DoD:** `/akun` tampil ber-tab; responsif; a11y tab ok.

### FASE 3 — Tab Profil (edit) (±1 jam)
- [ ] `account-profile.tsx`: form edit `displayName` (validasi zod di klien & server); email/provider read-only.
- **DoD:** simpan nama → tersimpan & tampil; error handling.

### FASE 4 — Tab Pesanan (+detail +pesan lagi) (±2 jam)
- [ ] `account-orders.tsx`: daftar pesanan (pindah dari user-account) + **detail** (dialog) + tombol **"Pesan lagi"**.
- [ ] "Pesan lagi": tambah item ke keranjang via `cart-provider.add`; lewati item nonaktif + beri tahu.
- **DoD:** detail tampil; "Pesan lagi" mengisi keranjang & mengarahkan ke `/keranjang`.

### FASE 5 — Tab Favorit (±2 jam)
- [ ] `account-wishlist.tsx`: grid produk dari wishlist (hidrasi produk), tombol "Tambah ke keranjang" & "Hapus".
- [ ] `user-account-api.ts`: fungsi wishlist.
- **DoD:** tambah/hapus favorit tersimpan server; tampil & dapat dibelanjakan.

### FASE 6 — Tab Alamat (±2 jam)
- [ ] `account-addresses.tsx`: CRUD alamat + tandai utama.
- [ ] Integrasi checkout: tampilkan pilihan alamat di pesan WhatsApp (opsional).
- **DoD:** CRUD alamat berfungsi; alamat utama unik.

### FASE 7 — Entry point, polish & docs (±1.5 jam)
- [ ] (Opsional) tombol favorit di `product-card`/detail produk.
- [ ] Empty/loading state konsisten tiap tab; a11y (`aria-live` untuk aksi).
- [ ] Analytics (event: `wishlist_add`, `reorder_click`) — opsional.
- [ ] QA `tsc`/`lint`/`build`; update `docs/README.md` & `TASK-SELANJUTNYA.md`; status dokumen → ✅.
- [ ] Commit per fase → push → uji produksi.

---

## 8. Definition of Done & Checklist QA

### 8.1 DoD global
1. `tsc` bersih, `build` sukses, `lint` bersih.
2. Tidak ada regresi: login, checkout, keranjang, riwayat pesanan, navbar.
3. Semua data user tetap diakses via server (Admin SDK); klien tak menyentuh Firestore.

### 8.2 `/akun`
- [ ] Portal ber-tab (Ringkasan/Pesanan/Favorit/Alamat/Profil); bisa di-link via `?tab=`.
- [ ] Edit nama tersimpan.
- [ ] Riwayat pesanan + detail + "Pesan lagi" berfungsi.
- [ ] Wishlist: tambah/hapus + tampil + tambah ke keranjang.
- [ ] Alamat: CRUD + tandai utama.
- [ ] Responsif mobile (375px); a11y tab & dialog.
- [ ] Empty/loading state tiap tab.

### 8.3 Keamanan & integritas
- [ ] Semua endpoint memakai `requireUser`; uid dari token.
- [ ] Wishlist divalidasi ke produk yang ada & aktif.
- [ ] Rate limit pada mutasi (wishlist/alamat/profil).
- [ ] Tidak ada PII bocor ke klien lain.

### 8.4 Regresi
- [ ] Checkout & keranjang normal.
- [ ] Riwayat pesanan tetap tampil (query tanpa composite index — lihat catatan `orders.ts`).
- [ ] Navbar "Akun Saya" tetap berfungsi.

---

## 9. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Composite index Firestore (query per-uid + orderBy) | Sedang | Hindari `orderBy` (sudah jadi pola), urutkan di memori |
| R2 | Wishlist menyimpan slug produk usang/palsu | Rendah | Validasi ke produk aktif saat menambah; saring saat render |
| R3 | Mengubah skema `UserProfile` memecah dokumen lama | Sedang | Normalizer backward-compat (default `[]`) |
| R4 | Tab state hilang saat refresh | Rendah | Sinkron ke `?tab=` |
| R5 | "Pesan lagi" produk sudah nonaktif | Sedang | Lewati item & beri tahu; arahkan ke produk terkait |
| R6 | Rate limit abuse wishlist | Low | `rateLimit()` per-uid |
| R7 | PII (alamat/telepon) tersimpan | Sedang | Akses server-only; tak dipublikasikan; `noindex` halaman |

---

## 10. Out of Scope

- **Pembayaran online** (checkout tetap WhatsApp).
- **Autentikasi selain Google** (email/password) — sesi terpisah.
- **Poin/loyalitas, kupon, tiering** — kandidat sesi lanjutan.
- **Notifikasi realtime status pesanan** (SSE/push) — sesi terpisah.
- **Upload avatar kustom** (tetap pakai foto Google).
- **Multi-bahasa / multi-mata uang**.

---

## 11. Estimasi & Urutan Pengerjaan

| Fase | Isi | Estimasi* | Nilai |
|---|---|---|---|
| F0 | Persiapan & baseline | 20 mnt | — |
| F1 | Data & API layer | 2 jam | Fondasi |
| F2 | Portal ber-tab (kerangka) | 2 jam | 🔴 Terasa |
| F3 | Tab Profil (edit) | 1 jam | 🟠 |
| F4 | Tab Pesanan (+detail +pesan lagi) | 2 jam | 🔴 Inti |
| F5 | Tab Favorit (wishlist) | 2 jam | 🔴 |
| F6 | Tab Alamat | 2 jam | 🟠 |
| F7 | Entry point, polish, docs, QA | 1.5 jam | Wajib |

**Total inti (F0–F7):** ± 12–13 jam terfokus (± 2 sesi).

**Urutan:** F1 (fondasi) → F2 (kerangka) → F4 (pesanan/repeat order — nilai inti) → F5 (favorit) → F3 → F6 → F7.

> **Bila 1 sesi:** F1–F2 + F4 (portal + pesanan/pesan lagi) memberi lompatan terbesar untuk repeat order. F5/F6 menyusul.

---

## 12. Lampiran — Referensi Pola Existing

| Kebutuhan | Referensi existing |
|---|---|
| Guard halaman user | `src/components/auth/user-guard.tsx` |
| Verifikasi user di API | `src/lib/admin-guard.ts` (`requireUser`) |
| Model & data order | `src/lib/orders.ts`, `src/lib/order-types.ts` |
| Klien order | `src/lib/order-api.ts` (`fetchMyOrders`, `createOrderRequest`) |
| Keranjang (klien) | `src/components/cart-provider.tsx` (`add`, `clear`, `has`) |
| Model produk/varian | `src/lib/product-types.ts`, `src/lib/products.ts` (`getProductsBySlugs`) |
| Upload/gambar (bila perlu) | `src/components/admin/image-uploader.tsx`, media system |
| Schema validasi | `src/lib/api-schemas.ts` (zod) |
| Rate limit | `src/lib/rate-limit.ts` |
| Pola tab aksesibel | (baru) — jadikan acuan `role="tablist"` |
| Pola dialog | `Dialog` existing (lihat admin media/orders) |
| Toast | `src/components/admin/toast.tsx` (atau pola serupa) |

---

## CATATAN PENUTUP

Inti perluasan ini: menjadikan `/akun` **portal yang mendorong repeat order** — pesanan mudah diulang, produk favorit tersimpan, alamat tersimpan — dengan tetap mematuhi arsitektur keamanan saat ini (semua data via server/Admin SDK).

**Prioritas eksekusi:** F1 (data/API) → F2 (kerangka tab) → F4 (pesanan + pesan lagi) → F5 (favorit) → F3 (profil) → F6 (alamat) → F7.

> Setelah dieksekusi: ubah status di header + tambah bagian "Status Eksekusi", dan catat temuan baru sebagai `AK-13+` bila ada.
