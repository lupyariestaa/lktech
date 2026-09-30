# Task: Auth Split (Admin vs User) + Sistem Produk

- **Tanggal mulai:** 2026-02-14
- **Tanggal selesai:** 2026-02-14
- **Status:** ✅ Selesai (implementasi + build hijau)
- **Cabang:** `main`

---

## 1. Ringkasan

Dua pengembangan besar dalam satu batch:

1. **Pemisahan sistem login** menjadi **login admin** dan **login user** yang
   lebih profesional & proper.
2. **Sistem Produk** (product) yang terpisah dari **Layanan** (service) —
   produk punya harga, spesifikasi, deskripsi, tools, dan alur pembelian.

---

## 2. Tujuan & Scope

### In-scope

- Halaman login **user** (`/masuk`) yang **khusus akun Google** (tombol Google
  + input email manual yang diarahkan ke alur Google). Tidak ada registrasi
  email/password mandiri untuk user.
- Halaman **akun user** (`/akun`) berisi profil & riwayat.
- Profil user disimpan ke Firestore (`users/{uid}`) saat pertama login.
- Link "lupa password" yang **diarahkan ke accounts.google.com** (website tidak
  mengelola reset password sama sekali).
- Login **admin** tetap di `/admin/login` (Email/Password + Google + whitelist
  `ADMIN_EMAILS`).
- Modul **Produk**: tipe data, data layer (Firestore), CRUD admin, halaman
  publik (`/produk`, `/produk/[slug]`).
- **Cart** (multi-item) + tombol **Beli Sekarang** (single item).
- **Checkout ke WhatsApp** dengan pesan otomatis berisi daftar produk, harga,
  total, dan identitas user (email/nama) yang **wajib login** terlebih dahulu.

### Out-of-scope (untuk sekarang)

- Payment gateway nyata (pembayaran tetap manual via WhatsApp).
- Login/registrasi user non-Google (email/password).
- Sistem pengelolaan reset password sendiri.

---

## 3. Keputusan Desain

| Topik                        | Keputusan                                                                 |
| ---------------------------- | ------------------------------------------------------------------------- |
| Isolasi sesi admin vs user   | **Instance Firebase Auth yang sama**, dipisah lewat **guard**: `/admin` memverifikasi whitelist `ADMIN_EMAILS`; `/akun` cukup butuh login. |
| Route login user             | `/masuk`                                                                  |
| Route akun user              | `/akun`                                                                   |
| Route produk                 | `/produk` & `/produk/[slug]`                                              |
| Sumber data produk           | **Firestore + CRUD admin** (pola sama seperti projects/layanan)           |
| Model order ke WhatsApp      | **Multi-item** dalam satu pesan (cart di-checkout bersama)                |
| Login user & Google          | Google sebagai satu-satunya penyedia identitas; input email manual memakai `loginHint` Google (bukan email/password) |
| Lupa password                | Link keluar ke `https://accounts.google.com/...`                          |

### Alasan singkat

- **Satu instance Auth + guard** dipilih agar integrasi dengan pola admin yang
  sudah ada (ID token + `requireAdmin`) tetap sederhana, tanpa duplikasi app
  Firebase. Risiko sesi tumpang-tindih ditangani guiard whitelist di area admin.
- **Google-only untuk user** menyederhanakan keamanan (tidak menyimpan password
  user) dan memenuhi permintaan pemilik produk.
- **Firestore + CRUD** agar produk bisa dikelola tanpa deploy ulang, konsisten
  dengan modul layanan/portofolio yang sudah ada.

---

## 4. Alur Implementasi

### Fase A — Dokumentasi & fondasi
- [x] Buat folder `docs/` + dokumen ini.

### Fase B — Auth user
- [x] `lib/auth.ts`: `signInWithGoogle(emailHint)` + `googleResetPasswordUrl()`.
- [x] `lib/user-profile.ts`, `lib/user-types.ts` + API `GET/POST /api/user/profile` (simpan ke `users/{uid}`).
- [x] `lib/auth-errors.ts` (normalizer error bersama) + `components/auth/google-icon.tsx`.
- [x] `app/masuk/page.tsx` + `components/auth/user-login-form.tsx`.
- [x] `app/akun/page.tsx` + `components/auth/user-account.tsx` + `user-guard.tsx`.
- [x] Refactor `admin-guard.ts` → `requireUser` + shared token verify; admin pakai ulang.
- [x] `admin/login-form.tsx` pakai util bersama (hapus duplikasi).

### Fase C — Produk
- [x] `lib/product-types.ts`.
- [x] `lib/products.ts` (get/save/delete/getBySlug/getSlugs, normalisasi, fallback default).
- [x] `lib/product-format.ts` (`formatPrice`, client-safe) — dipisah dari `products.ts` karena `products.ts` mengimpor Firebase Admin.
- [x] API admin `app/api/admin/products/route.ts` (GET/POST/PUT/DELETE).
- [x] `lib/admin-api.ts`: `fetchProducts`, `saveProduct`, `deleteProduct`.
- [x] Halaman publik `/produk`, `/produk/[slug]` + `components/product-card.tsx`, `product-grid.tsx`.

### Fase D — Cart & Checkout WhatsApp
- [x] `components/cart-provider.tsx` (state via `useSyncExternalStore` + localStorage).
- [x] `lib/cart.ts` (CartItem + `buildCheckoutMessage` multi-item).
- [x] `components/product-buy-actions.tsx` (Beli Sekarang + Tambah ke Keranjang, wajib login).
- [x] Halaman `/keranjang` (`components/cart-view.tsx`) → checkout WhatsApp memuat data user.

### Fase E — Admin produk
- [x] `components/admin/products-manager.tsx` + `app/admin/(dashboard)/products/page.tsx`.
- [x] Entri nav "Produk" di `admin-shell.tsx`.

### Fase F — Integrasi & verifikasi
- [x] Navbar: link Produk, ikon keranjang (badge), akun/login; menu mobile.
- [x] Nav links (`content.ts`) + sitemap dinamis produk.
- [x] `eslint` bersih, `tsc` bersih, `next build` sukses (47 halaman statis).

---

## 5. Daftar File

### Baru
- `docs/README.md`, `docs/2026-02-14-auth-split-dan-produk.md`
- `src/lib/user-profile.ts`, `src/lib/user-types.ts`, `src/lib/auth-errors.ts`
- `src/lib/product-types.ts`, `src/lib/products.ts`, `src/lib/product-format.ts`
- `src/lib/cart.ts`
- `src/app/api/user/profile/route.ts`
- `src/app/api/admin/products/route.ts`
- `src/app/masuk/page.tsx`, `src/app/akun/page.tsx`
- `src/app/produk/page.tsx`, `src/app/produk/layout.tsx`, `src/app/produk/[slug]/page.tsx`
- `src/app/keranjang/page.tsx`
- `src/app/admin/(dashboard)/products/page.tsx`
- `src/components/auth/google-icon.tsx`, `user-login-form.tsx`, `user-account.tsx`, `user-guard.tsx`
- `src/components/product-card.tsx`, `product-grid.tsx`, `product-buy-actions.tsx`, `cart-view.tsx`
- `src/components/cart-provider.tsx`
- `src/components/admin/products-manager.tsx`

### Diubah
- `src/lib/auth.ts` (Google email hint, reset URL)
- `src/lib/admin-guard.ts` (`requireUser` + shared token verify)
- `src/lib/admin-api.ts` (produk)
- `src/lib/content.ts` (link Produk di nav)
- `src/components/sections/navbar.tsx` (link Produk, ikon cart + badge, akun/login)
- `src/components/admin/login-form.tsx` (pakai util error & ikon bersama)
- `src/components/admin/admin-shell.tsx` (nav Produk)
- `src/app/layout.tsx` (AuthProvider + CartProvider global)
- `src/app/admin/layout.tsx` (AuthProvider kini dari root)
- `src/app/sitemap.ts` (rute produk + slug)

---

## 6. Catatan Operasional

- **Login user wajib Google**: tidak membuat akun user manual. Sign-in pertama
  akan otomatis membuat entri `users/{uid}` di Firestore (best-effort; gagal
  simpan tidak memblokir login).
- **Reset password**: tombol mengarah ke `https://accounts.google.com/signin/...`
  (Google tidak menyediakan halaman reset publik tanpa konteks login).
- **Pembelian tanpa payment gateway**: checkout hanya menyusun pesan WhatsApp.
  Nomor tujuan mengikuti `NEXT_PUBLIC_WHATSAPP_NUMBER` / settings situs.

---

## 7. Log Progres

- `2026-02-14` — Sesi dimulai: buat folder `docs/`, dokumen perencanaan, mulai Fase B.
- `2026-02-14` — Fase B–F selesai. Verifikasi: `eslint` 0 masalah, `tsc` 0 error,
  `next build` sukses (47 halaman statis, termasuk `/produk`, `/produk/[slug]`,
  `/masuk`, `/akun`, `/keranjang`, `/admin/products`).

---

## 8. Catatan Teknis Penting

- **`formatPrice` dipisah ke `lib/product-format.ts`.** `lib/products.ts`
  mengimpor Firebase Admin (server-only); jika Client Component mengimpor
  `formatPrice` dari sana, bundler menyeret modul server ke bundle browser dan
  build gagal. Semua komponen client memakai `lib/product-format.ts`.
- **CartProvider memakai `useSyncExternalStore`.** `localStorage` tidak tersedia
  saat SSR; pola store eksternal ini menghindari `setState` sinkron di dalam
  `useEffect` (aturan `react-hooks/set-state-in-effect`) sekaligus aman hidrasi.
- **AuthProvider dipindah ke root layout** agar area user (produk, keranjang,
  akun, navbar) punya konteks auth. `admin/layout.tsx` tidak lagi mendefinisikan
  provider sendiri (menghindari listener ganda).
- **Build cache:** pernah muncul panic Turbopack palsu akibat `.next` basi;
  `Remove-Item .next` + rebuild menyelesaikannya (bukan masalah kode).

## 9. Yang Perlu Dikonfigurasi / Langkah Manual

- Pastikan env Firebase Admin (`FIREBASE_ADMIN_*`) & `ADMIN_EMAILS` terisi agar
  API profil & produk berfungsi. Tanpa env, halaman publik tetap jalan memakai
  produk contoh (`DEFAULT_PRODUCTS`).
- Aktifkan provider **Google** di Firebase Console (Authentication → Sign-in method).
- Tambahkan domain ke **Authorized domains** Google sign-in untuk produksi.
- Produk dikelola dari `Admin → Produk`. Gambar cover bisa dipilih dari galeri
  Media (Cloudinary).
