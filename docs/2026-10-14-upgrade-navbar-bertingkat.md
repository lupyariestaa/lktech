# Upgrade Navbar — Menu Bertingkat (Dropdown & Akordeon)

> **Status:** ✅ Selesai (kode).
> **Disusun:** 2026-10-14. **Lanjutan sesi:** pekerjaan yang terhenti (belum di-commit).
> **Cakupan:** navbar publik (`src/components/sections/navbar.tsx`) + sumber menu
> terpusat (`src/lib/nav.ts`).

---

## 1. Ringkasan & Tujuan

Navbar sebelumnya menjajar **9 tautan datar** (`NAV_LINKS` di `content.ts`), sehingga
baris desktop terasa padat dan item mudah "tenggelam". Upgrade ini:

- **Mengelompokkan** item terkait menjadi **dropdown** (desktop) & **akordeon** (mobile).
- **Memendekkan** baris utama menjadi 7 item: Beranda · **Layanan** ▾ · Produk ·
  Portofolio · **Harga** ▾ · Blog · Tentang (+ tombol CTA "Konsultasi").
- **Satu sumber kebenaran** menu (`src/lib/nav.ts`), dipakai navbar & diuji unit.
- Aksesibel: dropdown dapat dijangkau **keyboard** (fokus membuka, fokus keluar menutup),
  `aria-haspopup`/`aria-expanded`, target sentuh ≥44px (sudah ada sebelumnya).

## 2. Keputusan Desain

| # | Keputusan | Alasan | Alternatif ditolak |
| - | --- | --- | --- |
| K1 | Modul **murni** `src/lib/nav.ts` (`buildNavMenu`, `isActiveHref`) tanpa impor alias `@/` | Bisa diuji `node --experimental-strip-types` (pola sama seperti modul `*-pure.ts`) | Logika di dalam komponen (tak teruji) |
| K2 | Sub-menu **Layanan** dibangun dari `SERVICES` (`@/lib/services`) | Tambah layanan otomatis muncul di menu (tak ada daftar kedua) | Hardcode slug di menu |
| K3 | Tautan **"Semua Layanan"** jadi **anak pertama** di `children` (bukan item terpisah di komponen) | **Satu sumber**: dulu komponen menambah "Semua {label}" lagi → **duplikat** di menu mobile | Render "Semua" di komponen (duplikat & test rapuh) |
| K4 | Dropdown desktop dikendalikan **state** (`openIdx`) via hover **&** fokus | Keyboard-accessible; `onBlur` menutup saat fokus keluar | CSS-only `:hover` (tak bisa keyboard) |
| K5 | Mobile = **akordeon** (`grid-rows-[0fr] → [1fr]`) | Animasi mulus tanpa mengukur tinggi manual | `max-height` (nilai ajaib) |
| K6 | `NAV_LINKS` di `content.ts` **dihapus** (digantikan `@/lib/nav`) | Hindari dua sumber menu; `PAGE_NAV_LINKS` tetap untuk footer | Biarkan keduanya (rawan drift) |

## 3. Struktur Menu Final

```
Beranda            → /#beranda (landing) | / (halaman dalam)
Layanan ▾          → /layanan
  ├─ Semua Layanan → /layanan
  ├─ Pembuatan Website   → /layanan/pembuatan-website
  ├─ Aplikasi Mobile     → /layanan/aplikasi-mobile
  ├─ Konsultasi Teknologi→ /layanan/konsultasi-teknologi
  ├─ Desain & Branding   → /layanan/desain-branding
  └─ Digital Marketing   → /layanan/digital-marketing
Produk             → /produk
Portofolio         → /portofolio
Harga ▾            → /harga
  ├─ Paket & Harga → /harga
  ├─ Promo & Kupon → /promo
  └─ FAQ           → /#faq (landing) | /kontak
Blog               → /blog
Tentang            → /tentang
```

## 4. Daftar File

| File | Peran | Baru? |
| --- | --- | --- |
| `src/lib/nav.ts` | Tipe `NavItem`/`NavChild`, `buildNavMenu()`, `isActiveHref()` (murni) | baru |
| `src/components/sections/navbar.tsx` | `DesktopItem` (dropdown) + akordeon mobile; konsumsi `buildNavMenu` | diubah |
| `src/lib/content.ts` | **Hapus** `NAV_LINKS` (navbar pakai `@/lib/nav`); `PAGE_NAV_LINKS` tetap (footer) | diubah |
| `scripts/nav-menu.test.ts` | Uji murni: bentuk menu, `children`, href/label unik, `isActiveHref` (6 test) | baru |
| `e2e/nav.spec.ts` | Smoke E2E: dropdown desktop (hover), tautan detail, akordeon mobile, **penjaga regresi "Semua" ganda** | baru |
| `src/app/tentang/layout.tsx` | Layout `/tentang` (Navbar + Footer) — melengkapi halaman Tentang | baru |
| `package.json` | Skrip `test:nav-menu` | diubah |
| `tsconfig.json` | Kecualikan `scripts/nav-menu.test.ts` dari typecheck app | diubah |
| `.github/workflows/ci.yml` | Jalankan `test:nav-menu` | diubah |

## 5. Definition of Done

- [x] Menu terpusat di `src/lib/nav.ts`; navbar tidak lagi pakai `NAV_LINKS`.
- [x] Dropdown desktop keyboard-accessible (`aria-haspopup`/`aria-expanded`, fokus).
- [x] Akordeon mobile dengan `aria-expanded` + animasi grid-rows.
- [x] **Bug diperbaiki:** tautan "Semua Layanan" tak lagi ganda di menu mobile.
- [x] Rute aktif disorot (`isActiveHref` mencakup sub-rute & anak dropdown).
- [x] `npx tsc --noEmit` bersih · `eslint` bersih · `test:nav-menu` (6) hijau.
- [x] E2E `e2e/nav.spec.ts` ditambahkan (desktop + mobile) & **tahan flaky**.
- [x] Dokumentasi diperbarui (`docs/README.md`, `TASK-SELANJUTNYA.md`).

**Hasil verifikasi (sesi ini):** `tsc` ✅ · `eslint` ✅ · `npm run build` ✅
(`/tentang` **Static**, navbar + footer ter-render, "Semua Layanan" tepat **2×** —
dropdown desktop + akordeon mobile, bug ganda hilang) · `test:nav-menu` ✅ (6) ·
**E2E penuh 22 test ✅** (`npx playwright test`).

## 6. Catatan E2E — kenapa butuh retry (anti-flaky)

Halaman di-`goto` dengan `domcontentloaded`; handler React baru aktif **setelah
hidrasi**. Interaksi yang terjadi sebelum hidrasi "hilang" → test flaky
(`aria-expanded` tetap `false`, URL tak berpindah). Solusi di `e2e/nav.spec.ts`:

- **`clickUntil(locator, isDone)`** — klik **idempoten**: dilewati bila state
  tujuan sudah tercapai, lalu ulangi sampai benar (`expect(...).toPass`).
  Menghindari klik ganda yang membalikkan state (toggle).
- **Hover desktop** — pindahkan mouse ke `(0,0)` dulu tiap percobaan, karena
  `mouseenter` hanya menyala saat pointer **masuk** (hover ulang di posisi sama
  tak memicu).
- **`openMobileMenu`** — tunggu **tinggi** `#menu-mobile` bertambah (`0 → auto`
  ±350ms) sebelum mengklik, agar titik klik tidak ter-klip saat beranimasi.

## 7. Catatan Operasional

- **Menambah/menghapus layanan:** cukup ubah `SERVICES` (`src/lib/services.ts`) —
  sub-menu Layanan mengikuti otomatis.
- **Verifikasi manual (pemilik):** buka situs → hover "Layanan"/"Harga" (desktop)
  → dropdown muncul; Tab untuk keyboard; perkecil ke mobile → akordeon buka/tutup.
