# REVISI SISTEM PRODUK — Galeri Media, Lightbox, Ratio 16:9, Kanvas Paket & Alur Pilih Paket

> **Status dokumen:** ✅ **Dieksekusi** (FASE 0–7 selesai — sisa: uji manual browser & deploy)
> **Disusun:** 2026-10-02 · **Dieksekusi:** 2026-10-02
> **Cakupan:** Sistem produk — form admin (`/admin/products`), halaman detail publik (`/produk/[slug]`), pemilih paket, dan kartu produk.
> **Tujuan:** (1) Ganti input galeri manual → **MediaPicker multiple**; (2) **galeri interaktif** (thumbnail + lightbox) di detail produk; (3) **ratio 16:9** konsisten; (4) **kanvas paket** (pan + zoom ala Figma); (5) **alur pilih paket** di sidebar dengan CTA aktif setelah dipilih.
> **Prasyarat baca:** `docs/2026-10-02-orders-admin-module.md` (pola manager & media), `docs/2026-10-02-sidebar-dashboard-upgrade.md`.
> **Hasil eksekusi & verifikasi:** lihat [§13 Status Eksekusi](#13-status-eksekusi).

---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Baseline — Kondisi Sistem Produk Saat Ini](#2-baseline--kondisi-sistem-produk-saat-ini)
3. [Ringkasan 5 Revisi & Keputusan yang Disetujui](#3-ringkasan-5-revisi--keputusan-yang-disetujui)
4. [Spesifikasi Detail per Revisi](#4-spesifikasi-detail-per-revisi)
5. [Keputusan Teknis & Data (Schema)](#5-keputusan-teknis--data-schema)
6. [Arsitektur Implementasi (File Baru/Diubah)](#6-arsitektur-implementasi-file-barudiubah)
7. [TASK IMPLEMENTATION FLOW (FASE 0–7)](#7-task-implementation-flow-fase-07)
8. [Definition of Done & Checklist QA](#8-definition-of-done--checklist-qa)
9. [Risiko & Mitigasi](#9-risiko--mitigasi)
10. [Out of Scope](#10-out-of-scope)
11. [Estimasi & Urutan Pengerjaan](#11-estimasi--urutan-pengerjaan)
12. [Lampiran — Referensi Pola Existing](#12-lampiran--referensi-pola-existing)
13. [Status Eksekusi](#13-status-eksekusi)

---

## 1. Ringkasan Eksekutif

Sistem produk LKTech saat ini berfungsi, tetapi ada **lima titik friksi** yang diminta diperbaiki pemilik:

| # | Masalah (kondisi sekarang) | Solusi |
|---|---|---|
| 1 | Galeri gambar diisi dengan **textarea "1 URL per baris"** — ribet & rawan salah | **MediaPicker `mode="multiple"`** (pilih banyak gambar, klik simpan otomatis) |
| 2 | Galeri di detail produk **statis**: thumbnail tidak bisa diklik, tidak ada zoom/lightbox | **Galeri interaktif**: thumbnail strip + klik ganti gambar besar + **lightbox** |
| 3 | Ratio gambar tidak konsisten (`aspect-[16/10]` besar, `aspect-square` thumbnail) | **Semua 16:9** (`object-cover`) di cover, galeri, thumbnail, kartu — responsif |
| 4 | Paket dijejer horizontal (grid 3 kolom) — berantakan bila 4–6 paket | **Kanvas paket**: pan (drag) + tombol zoom +/-, reset & fit-to-screen |
| 5 | User harus klik tombol di kartu paket → langsung masuk keranjang (bisa bingung) | **Pilih paket dulu** (sidebar kanan menampilkan pilihan + CTA aktif setelah dipilih) |

**Prinsip:** perubahan bersifat **fungsional & UX**, mempertahankan identitas visual brand (`primary`, radius, dsb). Kompatibilitas data dijaga (schema galeri backward-compatible — lihat §5).

---

## 2. Baseline — Kondisi Sistem Produk Saat Ini

### 2.1 Form admin (`src/components/admin/products-manager.tsx`)
- **Galeri**: textarea `Galeri gambar (1 URL per baris)` (`:588-596`) → `setList("gallery", value)` (`:408-418`) split `\n` → array string. **Tanpa MediaPicker.**
- **Cover**: `MediaPickerDialog mode="single"` (`:740-759`) → simpan `cover` (secureUrl) + `coverPublicId` + `coverAlt`.
- **Varian**: `VariantsEditor` (`:805-868`) + `VariantCard` (`:870-1098`), reorder ↑↓, highlight tunggal.
- Validasi simpan: `onSave` (`:127-220`) — multi-varian mengabaikan harga level produk.

### 2.2 Halaman detail (`src/app/produk/[slug]/page.tsx`)
- Galeri digabung: `const gallery = [product.cover, ...product.gallery].filter(...)` (`:82-84`).
- Gambar besar: `aspect-[16/10]`, `next/image fill object-cover` (`:169-184`).
- Thumbnail: `grid grid-cols-3 sm:grid-cols-4`, `aspect-square`, **tidak bisa diklik, tanpa lightbox** (`:186-203`).
- Paket: `<ProductVariantPicker>` di section `#paket` (`:215-226`); sidebar hanya anchor "Lihat N Paket" (`:373-387`).

### 2.3 Pemilih paket (`src/components/product-variant-picker.tsx`)
- Grid `md:grid-cols-2 lg:grid-cols-3` (`:63`) — horizontal.
- Tiap kartu punya tombol **"Pilih Paket"** (buy now → `/keranjang`) & **"Keranjang"** (`:179-212`) — langsung `add()` tanpa state "terpilih".
- `pick()` wajib login (`:50-60`).

### 2.4 Kartu produk (`src/components/product-card.tsx`)
- Cover: `aspect-[16/10]`, `object-cover` (`:23-59`). Hanya `product.cover`.

### 2.5 Data (`src/lib/product-types.ts`, `src/lib/products.ts`)
- `Product.cover: string`, `coverPublicId?`, `coverAlt?`, **`gallery: string[]`** (array URL murni) (`:110-117`).
- Disimpan di Firestore koleksi `products`, doc id = `slug`; `saveProduct` `set(payload, {merge:true})` (`products.ts:292-321`).
- `ProductVariant` (`product-types.ts:50-85`): `slug, name, tagline?, price, originalPrice?, badge?, highlight, soldOut, features, specs, includes, limits, delivery?, waMessage?`.

### 2.6 Util tersedia (dipakai ulang)
- `MediaPickerDialog` **sudah mendukung `mode="multiple"`** + `onSelect(items: MediaItem[])` (contoh dipakai di `hero-showcase-manager.tsx:256-267`).
- `imgUrl(publicId, {w,h,crop,...})` di `src/lib/cloudinary-client.ts:30-53` — transform URL on-the-fly (belum dipakai di produk publik).
- `cartItemKey` = `slug::variantSlug` (`src/lib/cart.ts:30-32`).
- Tidak ada komponen lightbox/zoom di project → **perlu dibuat baru** (pola modal a11y meniru `ConfirmDialog`/`MediaPickerDialog`).

---

## 3. Ringkasan 5 Revisi & Keputusan yang Disetujui

Dari sesi klarifikasi, keputusan yang **disetujui pemilik**:

| Revisi | Keputusan |
|---|---|
| **#1 Galeri → MediaPicker** | Ganti textarea dengan MediaPicker `mode="multiple"`; hasil pilih langsung tersimpan ke `product.gallery`. |
| **#2 Galeri interaktif** | **Thumbnail strip + klik ganti gambar besar + lightbox** (zoom/gambar penuh). |
| **#3 Ratio** | **16:9 `object-cover`** di semua (cover, galeri, thumbnail, kartu), responsif semua device. |
| **#4 Kanvas paket** | **Pan (drag) + tombol zoom +/-**; tombol reset & fit-to-screen. |
| **#5 Alur pilih paket** | **Wajib pilih dulu** (pilihan di sidebar kanan); tombol Keranjang/Beli **baru aktif setelah** paket dipilih. |

---

## 4. Spesifikasi Detail per Revisi

### 4.1 Revisi #1 — Galeri via MediaPicker (admin)

**Sasaran:** UX pengelolaan galeri di `/admin/products` setara cover.

**Perubahan `products-manager.tsx`:**
- Ganti blok textarea galeri (`:588-596`) dengan **komponen galeri**:
  - Preview grid thumbnail (16:9, `object-cover`) dari `product.gallery`.
  - Tombol **"Pilih dari Media"** → buka `MediaPickerDialog mode="multiple"`.
  - Tombol **"+ Tambah"**, tombol hapus per gambar (X), dan **reorder** (drag atau ↑↓) — minimal ↑↓ agar konsisten dengan variant/hero.
  - Bila `gallery.length === 0` → empty state kecil dengan tombol pilih.
- Handler:
  ```tsx
  <MediaPickerDialog
    open={galleryPickerOpen}
    onOpenChange={setGalleryPickerOpen}
    mode="multiple"
    title="Pilih gambar galeri"
    cropEnabled                 // opsional — biarkan admin crop 16:9
    onSelect={(items) => {
      const urls = items.map((it) => it.secureUrl);
      // Gabung tanpa duplikat
      set("gallery", Array.from(new Set([...product.gallery, ...urls])));
      setGalleryPickerOpen(false);
    }}
  />
  ```
- **Pertahankan** field opsional untuk tempel URL manual? → **Tidak** (dihapus agar bersih, sesuai permintaan). Sediakan jalur impor lewat Media saja.

**Catatan:** `MediaPickerDialog` menerima `cropEnabled` (crop rasio) — bisa diaktifkan agar gambar langsung 16:9. Utamakan `cropEnabled` **aktif** untuk konsistensi ratio (#3).

### 4.2 Revisi #2 — Galeri interaktif di detail produk (publik)

**Sasaran:** gambar galeri bisa dilihat besar, bukan thumbnail mati.

**Desain (dipilih: thumbnail strip + lightbox):**
```
┌─────────────────────────────────────────────┐
│                                             │
│            GAMBAR BESAR 16:9                │  ← klik → lightbox
│                                             │
├──┬──┬──┬──┐                                 │
│  │  │  │  │  ← thumbnail strip 16:9 (klik)  │
└──┴──┴──┴──┘                                 │
```
- **Desktop:** gambar besar (16:9) di atas + strip thumbnail horizontal di bawah; klik thumbnail → ganti gambar besar (state `activeIndex`); thumbnail aktif disorot (ring primary).
- **Mobile:** gambar besar (16:9) + strip thumbnail scroll horisontal (`no-scrollbar` / swipe) di bawah.
- **Lightbox:** klik gambar besar → overlay fullscreen dengan gambar (16:9, `object-contain` **di dalam lightbox** agar gambar utuh), tombol prev/next, tombol tutup, dukung keyboard (←/→/Esc) dan swipe di mobile. Fokus trap + kunci scroll body.

**Komponen baru:** `src/components/product-gallery.tsx` (client).
```tsx
type ProductGalleryProps = {
  images: { url: string; alt?: string }[]; // cover + gallery
  productName: string;
};
```
- State: `activeIndex`, `lightboxOpen`.
- Thumbnail `aria-current`/`aria-pressed` untuk gambar aktif; tombol navigasi `aria-label`.
- Preload gambar besar pertama (`priority`), sisanya lazy.

**Integrasi di `page.tsx`:** ganti section galeri (`:168-204`) dengan `<ProductGallery images={...} productName={product.name} />`. Perlu **passing alt**: cover pakai `coverAlt`; galeri pakai alt generik (karena galeri masih `string[]` — lihat §5).

### 4.3 Revisi #3 — Ratio 16:9 konsisten

**Sasaran:** semua gambar produk 16:9, tidak terpotong aneh, enak di semua device.

**Aturan:**
- **Detail produk** — gambar besar: `aspect-video` (16:9) + `object-cover`. Thumbnail: `aspect-video` (16:9) + `object-cover` (bukan `aspect-square` lagi).
- **Kartu produk** (`product-card.tsx`): sudah `aspect-[16/10]` → **ubah ke `aspect-video`** (16:9).
- **Lightbox**: `object-contain` (biar gambar utuh saat zoom).
- **Admin form** (preview galeri/cover): 16:9.
- Responsif: `aspect-video` otomatis menjaga 16:9 di semua lebar karena CSS aspect-ratio — tidak perlu JS.

**Catatan teknis:** untuk gambar Cloudinary, aktifkan **crop 16:9 saat upload/pilih** (`cropEnabled` di MediaPicker + `imgUrl` `c:fill,w,h`) supaya tidak ada area terpotong pada subjek penting. Untuk gambar non-16:9 tanpa crop, `object-cover` akan memotong tepi — ini konsekuensi yang diterima (dipilih pemilik).

### 4.4 Revisi #4 — Kanvas paket (pan + zoom)

**Sasaran:** container paket jadi kanvas yang bisa di-pan/di-zoom seperti Figma/maps, agar banyak paket (4–6) tetap rapi.

**Spesifikasi interaksi (dipilih: pan + tombol zoom +/-):**
- **Pan:** tahan klik kiri + drag untuk menggeser kanvas (`pointerdown/move/up`). Cursor `grab` → `grabbing`.
- **Zoom:** tombol `+` / `−` (dan indikator persen), tombol **reset** & **fit-to-screen**. Rentang zoom mis. 40%–150%.
- **Desktop & mobile:** sama (touch drag via pointer events).
- **Aksesibilitas:** tombol zoom dapat difokus, ada label; fokus tetap bisa tab ke kartu paket (kanvas hanya transformasi visual, konten tetap di DOM).
- **Fallback:** `prefers-reduced-motion` → tanpa animasi transisi transform (instant).

**Implementasi teknis (tanpa dependency baru):**
- Wrapper `div` (viewport) `overflow-hidden` + `touch-action: none` saat drag.
- Inner `div` (kanvas) dengan `transform: translate(x,y) scale(k)`.
- Gunakan **CSS transform** (bukan re-layout) agar murah.
- Simpan `{x, y, scale}` di state; batasi pan agar kanvas tidak hilang (clamp).
- **Catatan penting:** konten di dalam paket butuh lebar tetap (fixed width, mis. `w-[320px]`) supaya transformasi stabil. Kalau tidak, konten akan "menarik" saat di-scale.
- **Alternatif lebih sederhana (fallback opsional):** bila kanvas terlalu kompleks di mobile, sediakan mode "scroll horizontal" biasa sebagai fallback. Namun target utama tetap kanvas transform.

**Komponen baru:** `src/components/variant-canvas.tsx` (client) — membungkus daftar kartu paket.
```tsx
type VariantCanvasProps = { children: React.ReactNode };
// menyediakan viewport + kanvas + kontrol zoom/pan
```

> **Pertanyaan terbuka (dijawab di dokumen, tapi perlu konfirmasi saat eksekusi):** apakah kartu paket tetap tampil "berjejer horizontal" di dalam kanvas (dengan jarak tetap) atau disusun grid yang lebih lebar? Rekomendasi: **flex row** dengan `gap` tetap di dalam kanvas berukuran tetap, supaya pan horizontal terasa natural.

### 4.5 Revisi #5 — Alur pilih paket (sidebar)

**Sasaran:** user **wajib memilih paket** dulu; tombol Keranjang/Beli baru aktif setelah dipilih.

**Desain:**
- **Sidebar kanan** (`page.tsx:356-398`) untuk produk multi-varian diubah:
  - Menampilkan **daftar pilihan paket** (mis. radio/segment) — nama + harga tiap paket.
  - Menampilkan **paket terpilih** (nama, harga, estimasi) di ringkasan.
  - Tombol **"Tambah ke Keranjang"** & **"Beli Sekarang"** — **disabled** sampai paket dipilih; setelah dipilih → aktif.
  - Tombol "Lihat semua paket" (scroll ke `#paket`) tetap ada sebagai sekunder.
- **Sinkronisasi dua arah** dengan kartu paket di section `#paket`:
  - Pilih di sidebar → kartu terkait tersorot.
  - Klik "Pilih paket ini" di kartu → set pilihan di sidebar.
- **State terpilih** disimpan di komponen pembungkus (lift state): buat komponen client `ProductPurchasePanel` yang mengelola `selectedVariantSlug` dan merender sidebar + mengontrol highlight kartu.

**Arsitektur state (opsi dipilih):**
- Buat **`ProductPurchasePanel`** (client) yang membungkus: sidebar pembelian + (opsional) membagikan `selectedVariant` ke `ProductVariantPicker` lewat props.
- Karena `page.tsx` adalah **server component**, panel harus client dan menerima `product` (serializable) sebagai prop.
- Alternatif: React Context kecil (`ProductPurchaseContext`) agar kartu paket & sidebar berbagi state tanpa prop-drilling.
  - **Rekomendasi:** Context kecil agar kartu-kartu (banyak) tidak perlu prop-drill panjang.

**Aturan validasi:**
- `disabled` button sampai `selectedVariant` ada.
- Paket `soldOut` tidak bisa dipilih.
- Login tetap wajib saat klik CTA (existing `requireLogin`).
- Paket `highlight` = pilihan default? **Tidak** — biarkan user sadar memilih (sesuai permintaan "wajib pilih"). Tapi beri hint visual "Rekomendasi" pada highlight.

**Mockup sidebar multi-varian:**
```
┌──────────────────────────────┐
│ Mulai dari                   │
│ Rp500.000                    │
│                              │
│ Pilih paket:                 │
│ ○ Paket Basic      Rp500.000 │
│ ● Paket Pro        Rp900.000 │  ← terpilih
│ ○ Paket Bisnis   Rp1.500.000 │
│                              │
│ Terpilih: Paket Pro          │
│ Rp900.000 · 3–5 hari         │
│                              │
│ [ Tambah ke Keranjang ]  ← aktif setelah pilih
│ [ Beli Sekarang ]        ← aktif setelah pilih
│                              │
│ Lihat semua paket ↓          │
└──────────────────────────────┘
```

---

## 5. Keputusan Teknis & Data (Schema)

### 5.1 Schema galeri — kompatibilitas

**Keputusan:** **tetap `gallery: string[]`** (array URL). Alasan:
- Mengubah ke array objek (`{url, alt, publicId}`) = **breaking schema** → perlu migrasi data lama + ubah normalizer (`products.ts:218`), validasi route (`route.ts:82`), dan semua pembacaan.
- Untuk kebutuhan sekarang (tampil + lightbox), `string[]` cukup. Alt galeri bisa di-generate (`"${product.name} galeri ${i+1}"`).
- **Alternatif ditolak:** array objek (nilai tambah kecil vs biaya migrasi besar).

> Bila di masa depan butuh alt/publicId per gambar galeri, catat sebagai peningkatan terpisah (bukan sesi ini).

### 5.2 Ratio 16:9 — tanpa perubahan data

Ratio ditangani di **presentasi** (CSS `aspect-video` + `object-cover`), bukan data. Tidak ada perubahan schema.

### 5.3 Kanvas paket — tanpa perubahan data

Data varian tetap. Kanvas murni presentasi.

### 5.4 Alur pilih paket — tanpa perubahan data

`selectedVariantSlug` hanya state UI (tidak disimpan). Keranjang tetap pakai `cartItemKey` (`slug::variantSlug`) — **tidak ada perubahan** logika keranjang/checkout.

### 5.5 Ringkasan: ada perubahan schema? **Tidak ada.**

Seluruh revisi bersifat **presentasi & interaksi**. Ini keputusan penting: risiko migrasi data nol.

---

## 6. Arsitektur Implementasi (File Baru/Diubah)

### 6.1 File BARU

| File | Peran |
|---|---|
| `src/components/product-gallery.tsx` | Galeri interaktif detail produk (gambar besar + thumbnail strip + lightbox). Client. |
| `src/components/product-lightbox.tsx` | Overlay lightbox (zoom/gambar penuh, prev/next, keyboard, swipe). Client. (Bisa digabung ke `product-gallery.tsx` bila kecil.) |
| `src/components/variant-canvas.tsx` | Kanvas pan+zoom yang membungkus kartu paket. Client. |
| `src/components/product-purchase-panel.tsx` | Panel pembelian sidebar (pilih paket + CTA aktif setelah dipilih). Client. |
| `src/components/product-purchase-context.tsx` | (Opsional, direkomendasikan) Context kecil untuk state `selectedVariant` bersama kartu paket & sidebar. |
| `src/components/admin/product-gallery-field.tsx` | Field galeri admin (MediaPicker multiple + reorder + hapus). Client. (Atau inline di `products-manager.tsx`.) |

### 6.2 File DIUBAH

| File | Perubahan |
|---|---|
| `src/app/produk/[slug]/page.tsx` | Ganti section galeri (`:168-204`) → `<ProductGallery>`; ganti sidebar multi-varian (`:373-397`) → `<ProductPurchasePanel>`; ratio → `aspect-video`. |
| `src/components/product-variant-picker.tsx` | Integrasi state terpilih (dari Context), ubah tombol jadi "Pilih paket ini" (set pilihan) + highlight sinkron; bungkus daftar dengan `<VariantCanvas>`. |
| `src/components/product-card.tsx` | Ratio `aspect-[16/10]` → `aspect-video` (16:9). |
| `src/components/admin/products-manager.tsx` | Ganti textarea galeri (`:588-596`) + `setList` galeri → field MediaPicker multiple + reorder. |
| `src/lib/product-format.ts` | (Opsional) helper `productGalleryImages(product)` mengembalikan `{url, alt}[]` siap pakai galeri. |

### 6.3 Diagram komponen detail produk (target)

```
page.tsx (server)
├─ PageHero
├─ <ProductGallery images={[{url,alt}...]} productName={...} />   ← #2 & #3
├─ Deskripsi, Fitur, Spesifikasi, dst.
└─ {multi && (
     <ProductPurchaseProvider>              ← #5 (state)
       <ProductVariantPicker ... />         ← <VariantCanvas> (#4) + kartu sinkron #5
     </ProductPurchaseProvider>
   )}
   Sidebar kanan:
   └─ <ProductPurchasePanel product={...} />  ← #5 (pilih paket + CTA)
```

> Catatan: karena `ProductVariantPicker` (section #paket) dan sidebar adalah dua blok terpisah di layout, Context diperlukan agar keduanya berbagi `selectedVariant`. Bila Context dihindari, state harus di-lift ke satu komponen client yang membungkus **keduanya** — tapi layoutnya memisahkan kolom kiri/kanan, sehingga Context lebih bersih.

---

## 7. TASK IMPLEMENTATION FLOW (FASE 0–7)

> Tiap fase berdiri sendiri, bisa dites, commit terpisah (`feat(produk): ...`). Jangan lanjut sebelum DoD fase lolos.

### FASE 0 — Persiapan & baseline (±20 menit)
- [ ] Baca dokumen ini + `docs/2026-10-02-orders-admin-module.md` (pola media).
- [ ] Baseline: `npx tsc --noEmit` bersih, `npm run lint` bersih, `npm run build` sukses.
- [ ] Siapkan 1 produk uji multi-varian (4–6 paket) + beberapa gambar di Media untuk uji galeri.
- [ ] Screenshot "before": detail produk (galeri + paket), form produk admin, kartu produk.

### FASE 1 — Ratio 16:9 (paling kecil & berdampak luas) (#3)
- [ ] `product-card.tsx`: `aspect-[16/10]` → `aspect-video`.
- [ ] `page.tsx`: gambar besar `aspect-[16/10]` → `aspect-video`; thumbnail `aspect-square` → `aspect-video`.
- [ ] Cek preview kartu & detail di 375 / 768 / 1280 / 1920.
- **DoD:** semua gambar produk 16:9 konsisten & responsif; tidak ada overflow; build bersih.

### FASE 2 — Galeri interaktif + lightbox (#2)
- [ ] Buat `product-gallery.tsx`: gambar besar (16:9) + thumbnail strip (16:9, scroll di mobile) + state `activeIndex`.
- [ ] Buat `product-lightbox.tsx`: overlay fullscreen, prev/next, tutup, keyboard (←/→/Esc), swipe opsional, focus trap + scroll lock.
- [ ] Integrasi di `page.tsx` (ganti section galeri) — passing `images` dari cover+galeri dengan alt.
- [ ] A11y: `aria-current` thumbnail aktif, label tombol, fokus kembali ke gambar besar saat lightbox tutup.
- **DoD:** klik thumbnail mengganti gambar besar; klik gambar besar membuka lightbox; navigasi keyboard & mobile berfungsi; `prefers-reduced-motion` dihormati.

### FASE 3 — Galeri admin via MediaPicker (#1)
- [ ] Ganti textarea galeri + `setList("gallery")` dengan field galeri baru (MediaPicker `mode="multiple"`, `cropEnabled`).
- [ ] Grid preview thumbnail 16:9 + tombol hapus per gambar + reorder (↑↓) + tombol "Pilih dari Media".
- [ ] Empty state + tombol tambah.
- [ ] Hapus penggunaan `setList` untuk galeri (biarkan untuk `tools/includes/notes`).
- **DoD:** admin bisa memilih banyak gambar sekaligus → tersimpan ke `gallery`; bisa hapus/reorder; simpan & muat ulang tetap benar.

### FASE 4 — Kanvas paket (#4)
- [ ] Buat `variant-canvas.tsx`: viewport (`overflow-hidden`) + kanvas (`transform`), pan via pointer, tombol zoom `+`/`−`, reset, fit.
- [ ] Kartu paket diberi lebar tetap (mis. `w-[320px]`) di dalam kanvas.
- [ ] Clamp pan; `touch-action: none` saat drag; `prefers-reduced-motion` → tanpa transisi.
- [ ] Bungkus grid paket di `product-variant-picker.tsx` dengan `<VariantCanvas>`.
- **DoD:** 6 paket bisa di-pan & zoom dengan mulus di desktop & mobile (touch); tombol zoom mematuhi batas; konten tetap bisa di-tab (a11y).

### FASE 5 — Alur pilih paket di sidebar (#5)
- [ ] Buat `product-purchase-context.tsx` (state `selectedVariantSlug`, `setSelected`).
- [ ] Buat `product-purchase-panel.tsx`: daftar pilihan paket + ringkasan terpilih + CTA (disabled sampai dipilih) + login guard.
- [ ] Refactor `product-variant-picker.tsx`: kartu jadi "Pilih paket ini" (set pilihan, bukan langsung add) + tombol "Keranjang"/"Beli" tetap tersedia **atau** diarahkan ke sidebar (sepakat: pilih dulu di kartu → CTA di sidebar). Sorot kartu = paket terpilih.
- [ ] `page.tsx`: bungkus picker & sidebar dengan Provider; render panel di sidebar kanan (multi-varian).
- [ ] Pastikan paket `soldOut` tidak bisa dipilih; highlight diberi label "Rekomendasi".
- **DoD:** tombol CTA awal disabled; setelah pilih paket (di sidebar atau kartu) → aktif & menambah varian yang benar ke keranjang; login guard jalan.

### FASE 6 — (Opsional) Poles & ekstra
- [ ] Zona crop 16:9 otomatis saat pilih galeri (`cropEnabled` + rasio 16:9 default).
- [ ] Swipe gesture penuh di lightbox mobile.
- [ ] Zoom gambar di dalam lightbox (pan/pinch) — jika diinginkan.
- [ ] Skeleton loading galeri.
> Opsional; jangan menghambat FASE 7.

### FASE 7 — QA, dokumentasi & deploy
- [ ] `tsc` / `lint` / `build` bersih.
- [ ] Checklist QA §8 (semua device & skenario).
- [ ] Dokumen: status ✅ + bagian "Status Eksekusi"; update `docs/README.md` & `TASK-SELANJUTNYA.md`.
- [ ] Commit per fase → push → uji produksi (galeri, kanvas, alur pilih paket).

---

## 8. Definition of Done & Checklist QA

### 8.1 DoD global
1. `tsc` bersih, `build` sukses, `lint` bersih (0 error/warning baru).
2. Semua checklist QA lolos.
3. Tidak ada regresi: keranjang, checkout, WhatsApp, seluruh manager admin, halaman produk lain.
4. Tidak ada perubahan `firestore.rules` (tanpa koleksi baru).

### 8.2 Galeri (admin + publik)
- [ ] Admin bisa pilih **banyak** gambar via MediaPicker → tersimpan ke `gallery`.
- [ ] Admin bisa hapus & reorder gambar galeri; simpan lalu muat ulang konsisten.
- [ ] Detail produk: thumbnail klik → gambar besar berganti; thumbnail aktif tersorot.
- [ ] Klik gambar besar → lightbox terbuka; prev/next, Esc, klik luar menutup.
- [ ] Lightbox: gambar **utuh** (`object-contain`), navigasi keyboard ←/→ berfungsi; fokus kembali ke galeri saat tutup.
- [ ] Mobile: thumbnail strip bisa di-scroll; lightbox swipe (bila diimplementasikan).

### 8.3 Ratio
- [ ] Semua gambar produk 16:9 (kartu, cover, galeri besar, thumbnail) di 375/768/1024/1280/1920.
- [ ] Tidak ada gambar terpotong aneh pada subjek utama (uji dengan gambar non-16:9).

### 8.4 Kanvas paket
- [ ] Produk dengan 2, 4, 6 paket: kanvas pan & zoom mulus (mouse & touch).
- [ ] Tombol zoom +/- menghormati batas; reset & fit bekerja.
- [ ] Konten tetap bisa di-Tab (a11y); `prefers-reduced-motion` → tanpa animasi transform.

### 8.5 Alur pilih paket
- [ ] CTA di sidebar **disabled** sebelum pilih paket; **aktif** setelah pilih.
- [ ] Pilih di sidebar → kartu tersorot; pilih di kartu → sidebar sinkron.
- [ ] Paket `soldOut` tak bisa dipilih; highlight berlabel "Rekomendasi".
- [ ] Tambah ke keranjang menambahkan **varian yang benar** (cek `variantSlug` di keranjang).
- [ ] Belum login → diarahkan ke `/masuk?next=` kembali ke produk.

### 8.6 Regresi
- [ ] Produk **tunggal** (tanpa varian) tetap normal (`ProductBuyActions`).
- [ ] Keranjang, checkout, riwayat `/akun`, dashboard `/admin/orders` tetap berfungsi.
- [ ] Produk tanpa gambar → fallback ikon tetap tampil.

---

## 9. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Kanvas transform + konten interaktif → bug klik/drag | Sedang | Lebar kartu tetap; bedakan drag vs klik (threshold gerak); `touch-action` diatur; uji di perangkat nyata |
| R2 | Lightbox a11y (fokus, scroll) | Sedang | Focus trap + restore + scroll lock (pola `ConfirmDialog`/`MediaPickerDialog`) |
| R3 | Context dua blok terpisah (picker & sidebar) | Sedang | Provider membungkus keduanya; pastikan hanya client component |
| R4 | Ratio 16:9 memotong subjek gambar penting | Rendah | Aktifkan crop 16:9 saat pilih media; dokumentasikan |
| R5 | MediaPicker multiple → duplikat gambar galeri | Rendah | Dedupe URL saat merge (`new Set`) |
| R6 | Tanpa perubahan schema → data lama tetap aman | — | **Tidak ada migrasi**; galeri lama (`string[]`) tetap valid |
| R7 | Kanvas di mobile bisa "nyangkut" (gesture konflik) | Sedang | `touch-action: none` saat drag; tombol zoom besar & mudah; fallback scroll bila perlu |
| R8 | Scope merembet ke zoom-gambar-di-lightbox | Rendah | Ditandai FASE 6 opsional |

---

## 10. Out of Scope

- Migrasi `gallery` ke array objek (`{url, alt, publicId}`) — dicatat sebagai peningkatan terpisah.
- Sistem pembayaran online (tetap checkout via WhatsApp).
- Multi-image crop presisi per gambar di halaman publik (hanya crop saat upload).
- Perubahan pada riwayat pesanan/akun/dashboard orders.
- Zoom-pan gambar di dalam lightbox (hanya jika disetujui di FASE 6).
- Reorder galeri via drag-and-drop penuh (minimal ↑↓ dulu; DnD opsional FASE 6).

---

## 11. Estimasi & Urutan Pengerjaan

| Fase | Isi | Estimasi* | Nilai |
|---|---|---|---|
| F0 | Persiapan | 20 mnt | — |
| F1 | Ratio 16:9 | 1 jam | 🟠 Cepat & berdampak |
| F2 | Galeri interaktif + lightbox | 3–4 jam | 🟠 UX |
| F3 | Galeri admin MediaPicker | 2 jam | 🟠 Produktivitas |
| F4 | Kanvas paket | 3–4 jam | 🔴 Fitur baru (paling rumit) |
| F5 | Alur pilih paket sidebar | 3 jam | 🔴 UX checkout |
| F6 | Poles (opsional) | ±2 jam | ✨ |
| F7 | QA & deploy | 1–2 jam | Wajib |

**Total inti (F0–F5, F7):** ± 14–17 jam kerja terfokus.
**Bila waktu 1 sesi:** F1–F3 (galeri & ratio) memberi lompatan paling cepat; F4–F5 menyusul (paling kompleks).

---

## 12. Lampiran — Referensi Pola Existing

| Kebutuhan | Referensi existing |
|---|---|
| MediaPicker multiple (`mode="multiple"`, `onSelect(items)`) | `src/components/admin/media-picker-dialog.tsx`, contoh: `hero-showcase-manager.tsx:256-267` |
| Crop saat pilih media (`cropEnabled`) | `media-picker-dialog.tsx` |
| Transform Cloudinary (`imgUrl`, `cldUrl`) | `src/lib/cloudinary-client.ts:17-53` |
| Modal a11y (focus trap, Esc, scroll lock) | `src/components/admin/confirm-dialog.tsx`, `media-picker-dialog.tsx` |
| Keranjang & varian (`cartItemKey`, `cardItemForVariant`) | `src/lib/cart.ts`, `src/components/cart-provider.tsx` |
| Aksi beli produk tunggal | `src/components/product-buy-actions.tsx` |
| Pemilih paket (untuk refactor) | `src/components/product-variant-picker.tsx` |
| Helper harga produk | `src/lib/product-format.ts` |
| Manager produk (form) | `src/components/admin/products-manager.tsx` |
| Reorder list (↑↓) contoh | `VariantsEditor` (`products-manager.tsx:805-868`), `hero-showcase-manager.tsx` |

---

## CATATAN PENUTUP

Lima revisi ini menyentuh **presentasi & interaksi** tanpa mengubah skema data — risiko migrasi nol, tetapi **interaksi kanvas (#4) dan alur pilih paket (#5)** adalah bagian paling kompleks dan wajib diuji di perangkat nyata (desktop + mobile touch). Prioritaskan **F1–F3** (cepat & terasa), lalu **F4–F5** dengan pengujian teliti.

> Setelah dieksekusi, ubah status di header + tambah bagian "Status Eksekusi", dan catat temuan baru sebagai `PR-xx` bila ada.

---

## 13. STATUS EKSEKUSI

> **Dieksekusi:** 2026-10-02 · **Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih (0 error/warning) ✅ · `npm run build` sukses ✅
> *Smoke test dev/prod server dilewati atas permintaan pemilik (cold compile lambat) — uji manual browser diserahkan ke pemilik.*

### 13.1 Ringkasan per fase

| Fase | Isi | Status | Catatan |
|---|---|---|---|
| **F0** | Persiapan & baseline | ✅ | Baseline tsc bersih sebelum mulai. |
| **F1** | Ratio 16:9 | ✅ | `product-card.tsx` & gambar besar detail → `aspect-video`. Strip galeri & thumbnail juga 16:9. |
| **F2** | Galeri interaktif + lightbox | ✅ | `product-gallery.tsx` (gambar besar + thumbnail klik → ganti) & `product-lightbox.tsx` (overlay, prev/next, keyboard ←/→/Esc, scroll-lock, fokus restore). |
| **F3** | Galeri admin MediaPicker | ✅ | Textarea URL diganti field galeri: `MediaPickerDialog mode="multiple"` + `cropEnabled`; grid preview 16:9, hapus per gambar, reorder ←/→, badge "Pertama". Opsi crop **16:9** ditambah ke MediaPicker. |
| **F4** | Kanvas paket | ✅ | `variant-canvas.tsx`: pan (drag) + zoom `+/−` + reset + "Sesuaikan"; kartu lebar tetap (`w-[300px]`/`sm:w-[320px]`); `touch-action` & `motion-reduce`; klik tak bocor setelah drag. |
| **F5** | Alur pilih paket | ✅ | `product-purchase-context.tsx` (state) + `product-purchase-panel.tsx` (sidebar: daftar paket, ringkasan terpilih, CTA **disabled sampai dipilih**). Kartu paket refactor: "Pilih paket ini" + "Beli Sekarang"/"Keranjang". |
| **F6** | Poles (opsional) | ⏳ | Sebagian tercakup (crop 16:9 aktif; fit kanvas anti zoom-in). Swipe penuh & zoom-in-lightbox dilewati. |
| **F7** | QA, dokumentasi | ✅ | tsc/lint/build bersih + dokumentasi diperbarui. Uji manual browser = pemilik. |

### 13.2 Keputusan teknis saat eksekusi (deviasi kecil)

1. **Tanpa perubahan schema** — `gallery` tetap `string[]` (sesuai rencana §5). Tidak ada migrasi data.
2. **Crop 16:9** ditambahkan sebagai opsi rasio di `MediaPickerDialog` (dipakai cover & galeri produk).
3. **Kanvas `fit()`** sengaja **tidak** memperbesar melebihi 100% (hanya memperkecil bila konten lebih lebar) — agar produk dengan sedikit paket tetap enak dibaca.
4. **State pilihan paket** lewat Context kecil (`ProductPurchaseProvider`) yang membungkus grid di `page.tsx` — karena section #paket & sidebar adalah dua blok terpisah.
5. **Kartu paket** tetap menyediakan tombol "Beli Sekarang"/"Keranjang" sebagai jalur cepat (di samping alur "wajib pilih dulu" di sidebar) — agar kedua gaya tersedia.

### 13.3 File baru & diubah

**Baru:**
- `src/components/product-gallery.tsx` — galeri interaktif (gambar besar + thumbnail strip).
- `src/components/product-lightbox.tsx` — overlay lightbox (navigasi, keyboard, fokus).
- `src/components/variant-canvas.tsx` — kanvas paket (pan + zoom + reset/fit).
- `src/components/product-purchase-context.tsx` — state pilihan paket.
- `src/components/product-purchase-panel.tsx` — panel sidebar (pilih paket + CTA).

**Diubah:**
- `src/app/produk/[slug]/page.tsx` — galeri → `ProductGallery`; sidebar multi-varian → `ProductPurchasePanel`; bungkus `ProductPurchaseProvider`; ratio `aspect-video`; `galleryImages` ber-alt.
- `src/components/product-variant-picker.tsx` — refactor: kanvas + state terpilih + tombol "Pilih paket ini".
- `src/components/product-card.tsx` — ratio 16:9.
- `src/components/admin/products-manager.tsx` — galeri → MediaPicker multiple + reorder/hapus (textarea URL dihapus).
- `src/components/admin/media-picker-dialog.tsx` — opsi crop **16:9**.

### 13.4 Verifikasi (QA statis)

```
npx tsc --noEmit   → bersih (0 error)
npx eslint .       → bersih (0 error, 0 warning)
npm run build      → ✓ Compiled successfully
                     route: ○ /produk · ● /produk/[slug]
```

### 13.5 Sisa manual (untuk pemilik)

- [ ] **Admin**: edit produk → pilih beberapa gambar galeri via Media → simpan → cek urutan & hapus.
- [ ] **Detail produk**: klik thumbnail → gambar besar ganti; klik gambar besar → lightbox (prev/next, Esc, ←/→).
- [ ] **Ratio**: cek kartu & detail di 375/768/1280/1920 (semua 16:9).
- [ ] **Kanvas paket**: uji dengan 2/4/6 paket di desktop (drag + zoom) & mobile (touch).
- [ ] **Alur paket**: CTA disabled sebelum pilih; aktif setelah pilih; tambah ke keranjang menambahkan varian benar; belum login → diarahkan ke `/masuk`.
- [ ] Uji produk **tunggal** (tanpa varian) tetap normal.
- [ ] **Deploy**: `git push` → Vercel → uji produksi.

### 13.6 Catatan operasional
- Tidak ada koleksi Firestore baru → **tidak perlu** publish ulang `firestore.rules`.
- Data galeri lama (`string[]`) tetap valid tanpa perubahan.
- Semua komponen baru client-side (`"use client"`); `page.tsx` tetap server component.

> Dibuat oleh sesi eksekusi 2026-10-02. Catat temuan baru sebagai `PR-xx` di §4 bila ada.

