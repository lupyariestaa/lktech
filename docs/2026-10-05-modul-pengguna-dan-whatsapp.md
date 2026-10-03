# MODUL PENGGUNA & NOMOR WHATSAPP — Profil User + "Kelola User" di Dashboard

> **Status dokumen:** ✅ **Dieksekusi** (FASE U0–U8 selesai)
> **Disusun:** 2026-10-05 · **Dieksekusi:** 2026-10-05
> **Cakupan:** (1) **Nomor WhatsApp user** — field di profil (`/akun`) yang diisi user manual; (2) **Modul admin "Pengguna"** — halaman `/admin/users` untuk melihat seluruh user yang login (nama, email, WhatsApp, kapan masuk, sudah pesan/belum, total belanja, dsb.) dengan pencarian, filter, ekspor CSV, statistik ringkas, detail, blokir, dan hapus.
> **Tujuan:** Pemilik dapat **mengenal & menindaklanjuti** user yang sudah login (terutama lead jual beli) — tahu nomor WhatsApp-nya, siapa yang aktif, siapa yang sudah membeli, dan siapa yang belum (potensi follow-up).
> **Prasyarat baca:** `docs/2026-10-05-portal-akun-pengguna.md` (data profil user), `docs/2026-10-02-orders-admin-module.md` (pola modul admin orders), `docs/2026-10-02-sidebar-dashboard-upgrade.md` (nav & shell admin), `docs/README.md`.
> **Verifikasi:** `npx tsc --noEmit` ✅ · `npx eslint .` ✅ · `npm run build` ✅ (66 halaman).

> **Status Eksekusi (U0–U8):** Seluruh fase **selesai**.
> File baru: `src/lib/admin-users.ts`, `src/lib/admin-users-api.ts`, `src/app/api/admin/users/route.ts`, `src/app/api/admin/users/[uid]/route.ts`, `src/app/admin/(dashboard)/users/page.tsx`, `src/components/admin/users-manager.tsx`, `src/components/admin/user-detail-dialog.tsx`, `src/components/account-status-provider.tsx`.
> Diubah: `src/lib/user-types.ts` (whatsapp/blocked + tipe admin), `src/lib/user-profile.ts` (normalizer + CRUD), `src/lib/api-schemas.ts` (whatsapp/profile/block schema), `src/app/api/user/profile/route.ts` (PATCH whatsapp), `src/lib/user-account-api.ts`, `src/components/auth/account-profile.tsx` (form WA), `src/components/auth/user-account.tsx`, `src/lib/admin-nav.ts` (menu Pengguna), `src/components/admin/dashboard-overview.tsx` (UserSnapshot).
> Temuan teratasi: PU-01..PU-13.

> **Revisi lanjutan — Enforcement blokir (R8):** Fitur "blokir user" kini **berefek nyata** (bukan sekadar penanda):
> - **Server**: helper `requireActiveUser` (di `admin-guard.ts`) menolak user diblokir dengan `403 { code: "user_blocked" }`. Diterapkan pada aksi transaksi: `POST /api/orders`, wishlist (`POST`/`DELETE`), alamat (`POST`/`PATCH`/`DELETE`). Endpoint `GET` tetap boleh.
> - **Klien**: `AccountStatusProvider` (di root layout) menyediakan status `blocked` ke seluruh aplikasi → banner "akun diblokir" di `/akun`, tombol **checkout** & **tambah ke keranjang** & **favorit** & **alamat** dinonaktifkan, dan guard pada handler "Pesan lagi"/keranjang.
> - Efek: user diblokir **tidak bisa melakukan aksi transaksi apa pun** (sesuai keputusan pemilik), tetap bisa login & melihat akun.

---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Baseline — Kondisi Saat Ini](#2-baseline--kondisi-saat-ini)
3. [Keputusan Desain (disetujui pemilik)](#3-keputusan-desain-disetujui-pemilik)
4. [Audit — Temuan & Celah](#4-audit--temuan--celah)
5. [Spesifikasi Target](#5-spesifikasi-target)
6. [Arsitektur & Model Data](#6-arsitektur--model-data)
7. [TASK IMPLEMENTATION FLOW (FASE U0–U8)](#7-task-implementation-flow-fase-u0u8)
8. [Definition of Done & Checklist QA](#8-definition-of-done--checklist-qa)
9. [Risiko & Mitigasi](#9-risiko--mitigasi)
10. [Privasi & Keamanan Data](#10-privasi--keamanan-data)
11. [Out of Scope](#11-out-of-scope)
12. [Estimasi & Urutan Pengerjaan](#12-estimasi--urutan-pengerjaan)
13. [Lampiran — Referensi Pola Existing](#13-lampiran--referensi-pola-existing)

---

## 1. Ringkasan Eksekutif

Setiap kali user login (Google), profilnya tersimpan di koleksi Firestore `users/{uid}` (lihat sesi Portal Akun). Namun **pemilik belum punya cara melihat data user tersebut**: tidak ada halaman admin untuk daftar user, tidak ada informasi nomor WhatsApp, dan tidak bisa tahu siapa yang pernah membeli.

**Dua bagian pekerjaan:**

### Bagian A — Nomor WhatsApp User (profil)
- Tambah field **`whatsapp`** pada `UserProfile` (`users/{uid}`).
- User mengisi sendiri di **tab Profil** `/akun` (validasi format nomor Indonesia).
- Ditampilkan di profil user + muncul di modul admin.

### Bagian B — Modul Admin "Pengguna" (`/admin/users`)
Dashboard baru untuk mengelola & melihat user:
- **Kartu statistik ringkas**: total user, user baru 30 hari, sudah pesan, belum pesan.
- **Tabel daftar user** (lengkap): nama, email, foto, **no. WhatsApp**, tanggal daftar, **login terakhir**, jumlah pesanan, **total belanja (Rp)**, **status pesan** (sudah/belum).
- **Pencarian & filter**: cari nama/email/whatsapp; filter "sudah pesan" / "belum pesan".
- **Halaman/dialog detail user**: profil lengkap + daftar pesanan user (klik ke pesanan).
- **Ekspor CSV** daftar user (menghormati filter aktif).
- **Blokir user** (opsional — menandai user diblokir + radius) & **hapus user**.

**Prinsip:** Reuse maksimum pola modul admin existing (orders/leads): `requireAdmin`, `adminFetch`, manager + toolbar + tabel + dialog + toast + ekspor CSV. Semua akses data lewat **Admin SDK di server** — klien tidak menyentuh Firestore. **Tanpa** dependensi baru.

---

## 2. Baseline — Kondisi Saat Ini

### 2.1 Data user (`users/{uid}`)
```ts
type UserProfile = {
  uid; email; displayName; photoURL; provider; createdAt; lastLoginAt; orderCount;
  wishlist: string[]; addresses: SavedAddress[];
};
```
- Di-upsert dari `upsertUserProfile()` (`src/lib/user-profile.ts`) saat login Google (`src/lib/orders.ts` & provider).
- `orderCount` dinaikkan saat checkout (`incrementUserOrderCount`).
- **Belum ada** `whatsapp`, `status` (blokir), `totalSpent`.

### 2.2 Data order (`orders/{id}`)
```ts
type Order = { id; uid; buyerName; buyerEmail; items; total; status; whatsapp; message; createdAt };
```
- Memuat **`uid`** & **`buyerEmail`** → bisa di-*join* ke user untuk menghitung **jumlah pesanan**, **total belanja**, dan **status sudah pesan/belum**.

### 2.3 Admin
- Nav terpusat di `src/lib/admin-nav.ts` (grup: utama, Konten Website, Toko, Aset, Sistem).
- Pola modul: `/admin/(dashboard)/<menu>/page.tsx` + `src/components/admin/<x>-manager.tsx` + API `src/app/api/admin/<x>/route.ts` (dengan `?summary=1`) + klien `src/lib/admin-<x>-api.ts` (`adminFetch`).
- Badge sidebar via `use-admin-badges.ts` (poll `?summary=1`).
- Ekspor CSV pola: `exportLeadsToCsv` / `exportMediaToCsv` di `src/lib/admin-api.ts` (+ `csvCell`).

### 2.4 API user yang ada
| Endpoint | Fungsi |
|---|---|
| `GET/POST/PATCH /api/user/profile` | Profil user (POST/PATCH dari token) |
| `GET/POST/DELETE /api/user/wishlist` | Wishlist |
| `GET/POST/PATCH/DELETE /api/user/addresses` | Alamat |

### 2.5 Yang BELUM ada
- Field `whatsapp` di profil (A).
- Halaman/metode admin untuk melihat user (B).
- Statistik user, pencarian/filter user, ekspor user, detail user, blokir/hapus user.

---

## 3. Keputusan Desain (disetujui pemilik)

| # | Keputusan | Alasan |
|---|---|---|
| U1 | **Nomor WhatsApp = field profil, diisi manual** oleh user di `/akun` | Pemilik ingin tahu no. WA user; user yang mengisi |
| U2 | Data per user di admin **lengkap**: nama, email, foto, WhatsApp, tanggal daftar, login terakhir, jumlah pesanan, total belanja, status sudah/belum pesan, daftar pesanan | Diminta pemilik (opsi "Lengkap") |
| U3 | Fitur admin: **pencarian & filter**, **ekspor CSV**, **detail user**, **statistik ringkas**, **blokir user**, **hapus user** | Diminta pemilik (semua opsi) |
| U4 | Admin **boleh menghapus** user (mis. spam) | Diminta pemilik |
| U5 | Menu admin baru: **"Pengguna"** (grup **Pengguna** atau gabung "Sistem") | IA yang jelas |
| U6 | Status "sudah pesan" dihitung dari **order** (join by uid), bukan sekadar `orderCount` | Lebih andal |
| U7 | Validasi nomor WA: format Indonesia (`08…`, `+62…`, atau `62…`), normalisasi ke digit | Konsisten dgn `normalizePhone` di `src/lib/whatsapp.ts` |
| U8 | **Tanpa** filter tanggal login di v1 (bisa ditambah) | Sederhanakan |

---

## 4. Audit — Temuan & Celah

Format: **[PU-xx] Judul** — *Severity* — Lokasi — Dampak — Rekomendasi.

### 4.1 Nomor WhatsApp (profil)

**[PU-01] Tidak ada field nomor WhatsApp user** — 🔴 Tinggi (permintaan utama) — `user-types.ts`. — Pemilik tak bisa menghubungi/follow-up user. — **Rekomendasi:** tambah `whatsapp` di `UserProfile` + form di tab Profil.

**[PU-02] Tidak ada validasi format nomor WA** — 🟠 Menengah. — Data kotor. — **Rekomendasi:** schema zod + normalisasi (`normalizePhone`).

**[PU-03] Nomor WA tidak tampil di admin** — 🔴 Tinggi. — Tidak berguna bila tersimpan tapi tak terlihat. — **Rekomendasi:** tampil & bisa disalin/di-klik `wa.me` di modul user.

### 4.2 Modul Admin Pengguna

**[PU-04] Tidak ada halaman daftar user** — 🔴 Tinggi (permintaan utama). — Pemilik tak tahu siapa yang login. — **Rekomendasi:** `/admin/users`.

**[PU-05] Tidak ada statistik user** — 🟠 Menengah. — Sulit menilai pertumbuhan. — **Rekomendasi:** kartu ringkas (total, baru 30 hari, sudah/belum pesan).

**[PU-06] Tidak ada pencarian/filter user** — 🟠 Menengah. — Sulit menemukan user tertentu. — **Rekomendasi:** cari nama/email/WA; filter sudah/belum pesan.

**[PU-07] Tidak bisa lihat riwayat pesanan per user dari daftar user** — 🟠 Menengah. — Perlu buka orders manual. — **Rekomendasi:** detail user menampilkan pesanannya.

**[PU-08] Tidak ada ekspor user** — 🔵 Rendah. — **Rekomendasi:** CSV (pola existing).

**[PU-09] Tidak ada penandaan/blokir user** — 🟠 Menengah. — Spam/troll tak bisa ditandai. — **Rekomendasi:** field `blocked` + toggle admin.

**[PU-10] Tidak ada kemampuan hapus user** — 🟠 Menengah. — Data spam menumpuk. — **Rekomendasi:** hapus dokumen user (dengan konfirmasi).

### 4.3 Data & Integritas

**[PU-11] `orderCount` bisa beda dengan jumlah order nyata** — 🟠 Menengah — `user-profile.ts`. — Angka tak konsisten. — **Rekomendasi:** hitung dari orders saat menampilkan; `orderCount` sebagai cache opsional.

**[PU-12] User lama tanpa field baru** — 🟠 Menengah. — Dokumen lama bisa error. — **Rekomendasi:** normalizer backward-compat (`whatsapp: ""`, `blocked: false`).

**[PU-13] Potensi composite index Firestore** — 🟡 Rendah. — Query user + orderBy bisa minta index. — **Rekomendasi:** urutkan di memori (pola existing `orders.ts`).

### 4.4 Ringkasan temuan

| ID | Temuan | Severity | Fase |
|---|---|---|---|
| PU-01 | Tak ada field nomor WhatsApp | 🔴 | U1 |
| PU-04 | Tak ada halaman daftar user | 🔴 | U3 |
| PU-03 | Nomor WA tak tampil di admin | 🔴 | U3 |
| PU-05 | Tak ada statistik user | 🟠 | U3 |
| PU-06 | Tak ada cari/filter user | 🟠 | U4 |
| PU-07 | Tak ada riwayat pesanan per user | 🟠 | U5 |
| PU-09 | Tak ada blokir user | 🟠 | U6 |
| PU-10 | Tak ada hapus user | 🟠 | U6 |
| PU-11 | `orderCount` tak konsisten | 🟠 | U2 |
| PU-02/08/12/13 | Minor | 🔵 | U1/U2/U4 |

---

## 5. Spesifikasi Target

### 5.1 Bagian A — Nomor WhatsApp di profil (`/akun` → tab Profil)
- Field **"Nomor WhatsApp"** di form profil, dengan placeholder `08xxxxxxxxxx`, hint format.
- Validasi: 8–20 digit (setelah normalisasi), regex dasar.
- Disimpan via `PATCH /api/user/profile` (payload baru: `whatsapp`).
- Ditampilkan di Ringkasan profil (jika ada) — opsional.

### 5.2 Bagian B — Halaman `/admin/users`

```
┌───────────────────────────────────────────────────────────┐
│ H1: Pengguna            [Ekspor CSV]                       │
│ P: Kelola user yang login di website.                      │
├───────────────────────────────────────────────────────────┤
│ [Total User] [Baru 30 Hari] [Sudah Pesan] [Belum Pesan]    │  ← kartu statistik
├───────────────────────────────────────────────────────────┤
│ [🔍 Cari nama/email/WA]   [Filter: Semua|Sudah|Belum ▾]   │  ← toolbar
├───────────────────────────────────────────────────────────┤
│ Tabel: Nama | Email | WhatsApp | Daftar | Login terakhir  │
│        | Pesanan | Total Belanja | Status | Aksi          │
├───────────────────────────────────────────────────────────┤
│ Paginasi / "Muat lebih banyak"                             │
└───────────────────────────────────────────────────────────┘
```
- **Kartu statistik**: total user, user baru (30 hari), sudah pesan, belum pesan.
- **Tabel**: kolom lengkap; WhatsApp bisa diklik (`wa.me`) & disalin; baris bisa dibuka detail.
- **Dialog detail user**: foto, email, WA, provider, dibuat, login terakhir, blokir, daftar pesanan (link ke `/admin/orders` bila ada).
- **Aksi per baris**: Detail, Blokir/Unblokir, Hapus (konfirmasi).

### 5.3 Kolom & makna
| Kolom | Sumber |
|---|---|
| Nama | `user.displayName` |
| Email | `user.email` |
| WhatsApp | `user.whatsapp` (baru) |
| Foto | `user.photoURL` |
| Daftar | `user.createdAt` |
| Login terakhir | `user.lastLoginAt` |
| Jumlah pesanan | hitung dari orders (fallback `orderCount`) |
| Total belanja | Σ `order.total` (status apa pun; atau hanya "selesai" — lihat U6 detail) |
| Status | "Sudah pesan" bila ≥1 order, else "Belum pesan" |

---

## 6. Arsitektur & Model Data

### 6.1 Perluasan `UserProfile` (`src/lib/user-types.ts`)

```ts
export type UserProfile = {
  uid; email; displayName; photoURL; provider; createdAt; lastLoginAt; orderCount;
  wishlist: string[];
  addresses: SavedAddress[];
  /** Nomor WhatsApp user (baru) — format digit, mis. "628123...". */
  whatsapp: string;
  /** User diblokir (baru) — mis. spam. */
  blocked: boolean;
  /** (cache opsional) total belanja Rupiah. */
  totalSpent?: number;
};
```

### 6.2 Tipe baris ringkas untuk admin (`UserRow`)
```ts
export type AdminUserRow = {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  whatsapp: string;
  provider: string;
  createdAt: string;
  lastLoginAt: string;
  blocked: boolean;
  orderCount: number;   // dari order nyata
  totalSpent: number;   // Σ total order
  hasOrders: boolean;
};
```

### 6.3 API baru (semua `requireAdmin`)

| Method | Path | Fungsi |
|---|---|---|
| GET | `/api/admin/users?q&status&limit&cursor` | Daftar user (join pesanan) + paginasi |
| GET | `/api/admin/users?summary=1` | Statistik ringkas (total, baru 30h, sudah/belum pesan) |
| GET | `/api/admin/users/[uid]` | Detail user + pesanannya |
| PATCH | `/api/admin/users` | `{ id, blocked }` (blokir/unblokir) |
| DELETE | `/api/admin/users?id=` | Hapus user |

**PATCH `/api/user/profile`** (existing) diperluas menerima `whatsapp`.

### 6.4 Data layer (server)
- Perluas `src/lib/user-profile.ts`:
  - `normalizeProfile` + `whatsapp`/`blocked`.
  - `updateUserWhatsapp(uid, wa)`, `setUserBlocked(uid, blocked)`, `deleteUserProfile(uid)`.
- **Baru** `src/lib/admin-users.ts`:
  - `listAdminUsers({ q, status, limit, cursor })` — ambil `users` + agregasi `orders` (join di memori).
  - `getAdminUsersSummary()` — count total, baru 30 hari, sudah/belum pesan.
  - `getAdminUserDetail(uid)` — profil + daftar order (via `getOrdersByUser`).

### 6.5 File BARU/DIUBAH

**Baru:**
| File | Peran |
|---|---|
| `src/lib/admin-users.ts` | Data layer admin user (list, summary, detail) |
| `src/lib/admin-users-api.ts` | Klien `adminFetch` (list/summary/detail/patch/delete) + ekspor CSV |
| `src/app/api/admin/users/route.ts` | GET list/summary, PATCH blokir, DELETE |
| `src/app/api/admin/users/[uid]/route.ts` | GET detail user + pesanan |
| `src/app/admin/(dashboard)/users/page.tsx` | Halaman admin Pengguna |
| `src/components/admin/users-manager.tsx` | Manager utama (statistik, toolbar, tabel, aksi) |
| `src/components/admin/user-detail-dialog.tsx` | Dialog detail user + riwayat pesanan |

**Diubah:**
| File | Perubahan |
|---|---|
| `src/lib/user-types.ts` | `whatsapp`, `blocked`, `AdminUserRow` |
| `src/lib/user-profile.ts` | Normalizer + `whatsapp`/`blocked` + fungsi baru |
| `src/lib/api-schemas.ts` | Schema `whatsapp` (profil) + `userBlockSchema` |
| `src/app/api/user/profile/route.ts` | PATCH terima `whatsapp` |
| `src/components/auth/account-profile.tsx` | Form field WhatsApp |
| `src/lib/admin-nav.ts` | Item nav "Pengguna" |
| `src/lib/admin-api.ts` atau `admin-users-api.ts` | `exportUsersToCsv` |
| `docs/README.md`, `TASK-SELANJUTNYA.md` | Dokumentasi |

---

## 7. TASK IMPLEMENTATION FLOW (FASE U0–U8)

> Tiap fase berdiri sendiri, bisa dites & commit terpisah.

### FASE U0 — Persiapan & baseline (±20 menit)
- [ ] Baca dokumen ini + `portal-akun-pengguna.md` + `orders-admin-module.md`.
- [ ] Baseline: `tsc`/`lint`/`build` bersih.

### FASE U1 — Nomor WhatsApp di profil (±2 jam)
- [ ] `user-types.ts`: tambah `whatsapp` (default "") + `blocked` (default false).
- [ ] `user-profile.ts`: normalizer + `updateUserWhatsapp`.
- [ ] `api-schemas.ts`: schema `whatsappSchema` (validasi + normalisasi).
- [ ] `api/user/profile/route.ts`: PATCH menerima `whatsapp`.
- [ ] `account-profile.tsx`: form field "Nomor WhatsApp" + hint + validasi.
- **DoD:** user bisa simpan nomor WA; tersimpan & tampil.

### FASE U2 — Data layer admin (±2 jam)
- [ ] `admin-users.ts`: `listAdminUsers` (join orders), `getAdminUsersSummary`, `getAdminUserDetail`.
- [ ] Normalizer `orderCount`/`totalSpent` dihitung dari order nyata (PU-11).
- **DoD:** fungsi mengembalikan data akurat (uji via endpoint).

### FASE U3 — API admin user (±1.5 jam)
- [ ] `api/admin/users/route.ts`: GET (list + `?summary=1`), PATCH (blokir), DELETE.
- [ ] `api/admin/users/[uid]/route.ts`: GET detail.
- [ ] Validasi zod + `requireAdmin`.
- **DoD:** semua endpoint berfungsi & aman.

### FASE U4 — Halaman & tabel admin (±3 jam)
- [ ] `admin-nav.ts`: item "Pengguna" (grup "Sistem" atau grup baru).
- [ ] `admin/(dashboard)/users/page.tsx`.
- [ ] `users-manager.tsx`: kartu statistik + toolbar (cari/filter) + tabel + paginasi.
- [ ] `admin-users-api.ts`: klien + `exportUsersToCsv`.
- **DoD:** daftar user tampil, bisa cari/filter, ekspor CSV.

### FASE U5 — Detail user (±2 jam)
- [ ] `user-detail-dialog.tsx`: profil + riwayat pesanan (link ke orders).
- [ ] Integrasi tombol "Detail" per baris.
- **DoD:** detail tampil; riwayat pesanan benar.

### FASE U6 — Blokir & hapus (±1.5 jam)
- [ ] Aksi blokir/unblokir (PATCH) + badge status.
- [ ] Hapus user (konfirmasi dialog) + refresh.
- **DoD:** blokir & hapus berfungsi dengan konfirmasi.

### FASE U7 — Badge & polish (±1 jam)
- [ ] (Opsional) badge "user baru" di sidebar (`use-admin-badges`) — atau metrik di Ringkasan.
- [ ] A11y (tabel, dialog), empty/loading/error state, toast konsisten.
- [ ] Analytics event (opsional).
- **DoD:** rapi & aksesibel.

### FASE U8 — QA, dokumentasi, deploy
- [ ] `tsc`/`lint`/`build` bersih.
- [ ] Checklist QA §8.
- [ ] Dokumentasi: status → ✅ + update `docs/README.md` & `TASK-SELANJUTNYA.md`.
- [ ] Commit per fase → push → uji produksi.

---

## 8. Definition of Done & Checklist QA

### 8.1 DoD global
1. `tsc` bersih, `build` sukses, `lint` bersih.
2. Tidak ada regresi: login, profil, checkout, pesanan, wishlist, alamat, dashboard existing.
3. Semua data user hanya via server (Admin SDK); klien tak menyentuh Firestore.

### 8.2 Bagian A (nomor WA)
- [ ] Field "Nomor WhatsApp" di tab Profil; tersimpan & tampil.
- [ ] Validasi menolak nomor tidak valid; normalisasi konsisten.
- [ ] User lama tanpa `whatsapp` tidak error (default "").

### 8.3 Bagian B (admin user)
- [ ] Menu "Pengguna" muncul & halaman `/admin/users` bisa dibuka.
- [ ] Tabel menampilkan: nama, email, WA, daftar, login terakhir, jumlah pesanan, total belanja, status.
- [ ] Kartu statistik akurat (total/baru 30h/sudah/belum).
- [ ] Cari (nama/email/WA) & filter (sudah/belum pesan) bekerja.
- [ ] Ekspor CSV menghormati filter.
- [ ] Detail user menampilkan riwayat pesanan.
- [ ] Blokir/unblokir + hapus (dengan konfirmasi) berfungsi.
- [ ] Responsif mobile (tabel → kartu/scroll).
- [ ] A11y: label, fokus, dialog, `aria-live`.

### 8.4 Regresi
- [ ] `/akun` (semua tab) tetap normal.
- [ ] Checkout & pesanan normal.
- [ ] Nav admin & badge lain tidak rusak.
- [ ] Command palette admin memuat menu baru.

---

## 9. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Join users×orders berat saat user banyak | Sedang | Paginasi + agregasi di memori terbatas; index bila perlu |
| R2 | Composite index Firestore (ware+orderBy) | Sedang | Urutkan di memori (pola `orders.ts`) |
| R3 | Nomor WA ganda/typo | Rendah | Validasi + normalisasi; tampilkan utk koreksi |
| R4 | Hapus user sengaja → kehilangan data | Sedang | Konfirmasi dialog; pertimbangkan soft-delete (lihat catatan) |
| R5 | Privasi data user (email/WA) | Tinggi | Halaman `noindex`, akses `requireAdmin`, tak ada endpoint publik |
| R6 | Dokumen lama tanpa field baru | Sedang | Normalizer backward-compat |
| R7 | `orderCount` cache tak sinkron | Rendah | Hitung dari order nyata saat tampil |
| R8 | Blokir user tak mengefek (belum ada enforcement) | Rendah | ✅ **Diatasi**: `requireActiveUser` (server) + `AccountStatusProvider` (UI) — aksi transaksi diblokir |

---

## 10. Privasi & Keamanan Data

- **Akses**: semua endpoint admin pakai `requireAdmin` (whitelist `ADMIN_EMAILS`); halaman `/admin/*` dijaga guard existing.
- **Tidak ada endpoint publik** yang membocorkan daftar user.
- **`/admin/users` & detail** → `metadata.robots = noindex`.
- **PII** (email, WhatsApp) hanya untuk admin; tidak dikirim ke klien lain.
- **Hapus user**: konfirmasi eksplisit; dokumen `users/{uid}` dihapus (pesanan tetap ada — demi integritas riwayat; catat sebagai keputusan).
- **Blokir**: **berefek nyata** — user diblokir tidak dapat melakukan aksi transaksi (checkout, keranjang, wishlist, alamat) karena ditolak server (`requireActiveUser`) + UI dinonaktifkan. User tetap bisa login & melihat akun.

---

## 11. Out of Scope

- **Autentikasi selain Google** (email/password).
- **Enforcement blokir menyeluruh** (mis. blokir login) — v1 penanda.
- **Email/WA blast & kampanye** ke user.
- **Role admin granular** (hanya admin whitelist saat ini).
- **Impor user** / sinkron dari provider lain.
- **Grafik pertumbuhan user** (bisa sesi lanjut).
- **Audit log lengkap aksi admin atas user** (opsional lanjut).

---

## 12. Estimasi & Urutan Pengerjaan

| Fase | Isi | Estimasi* | Nilai |
|---|---|---|---|
| U0 | Persiapan | 20 mnt | — |
| U1 | Nomor WA di profil | 2 jam | 🔴 (permintaan) |
| U2 | Data layer admin | 2 jam | Fondasi |
| U3 | API admin user | 1.5 jam | Fondasi |
| U4 | Halaman & tabel admin | 3 jam | 🔴 Inti |
| U5 | Detail user | 2 jam | 🟠 |
| U6 | Blokir & hapus | 1.5 jam | 🟠 |
| U7 | Badge & polish | 1 jam | 🔵 |
| U8 | QA & deploy | 1 jam | Wajib |

**Total inti (U0–U8):** ± 14 jam terfokus (± 2 sesi).

**Urutan:** U1 (WA profil) → U2 (data) → U3 (API) → U4 (tabel) → U5 (detail) → U6 (blokir/hapus) → U7 → U8.

> **Bila 1 sesi:** U1 + U2 + U3 + U4 (WA profil + daftar user admin) sudah memberi nilai inti. U5/U6 menyusul.

---

## 13. Lampiran — Referensi Pola Existing

| Kebutuhan | Referensi existing |
|---|---|
| Guard admin API | `src/lib/admin-guard.ts` (`requireAdmin`) |
| Klien admin fetch | `src/lib/admin-fetch.ts` (`adminFetch`) |
| Pola modul admin (manager+API+klien) | `docs/2026-10-02-orders-admin-module.md`, `orders-manager.tsx`, `api/admin/orders/route.ts`, `admin-orders-api.ts` |
| Nav admin | `src/lib/admin-nav.ts` |
| Badge sidebar / polling summary | `src/components/admin/use-admin-badges.ts` |
| Ekspor CSV | `exportLeadsToCsv` / `exportMediaToCsv` (`src/lib/admin-api.ts`) + `csvCell` |
| Dialog konfirmasi | `src/components/admin/confirm-dialog.tsx` |
| Dialog detail (pola) | `orders-manager.tsx` (detail dialog) |
| Toast | `src/components/admin/toast.tsx` |
| Data user & profil | `src/lib/user-profile.ts`, `src/lib/user-types.ts` |
| Data order user | `src/lib/orders.ts` (`getOrdersByUser`) |
| Utilitas format | `src/lib/format.ts` (`formatRupiah`, `formatDateTime`) |
| Normalisasi no. WA | `src/lib/whatsapp.ts` (`normalizePhone`) |
| Pola hook async list | `src/components/admin/use-async-list.ts` |

---

## CATATAN PENUTUP

Inti pengembangan ini: **nomor WhatsApp user** (agar bisa dihubungi/follow-up) + **modul admin "Pengguna"** (agar pemilik tahu siapa saja yang login, kapan, sudah pesan atau belum). Semua mengikuti arsitektur keamanan existing (semua via server/Admin SDK, admin-only).

**Prioritas eksekusi:** U1 (WA profil) → U2 (data) → U3 (API) → U4 (tabel admin) → U5 (detail) → U6 (blokir/hapus) → U7 → U8.

> Setelah dieksekusi: ubah status di header + tambah bagian "Status Eksekusi", dan catat temuan baru sebagai `PU-14+` bila ada.
