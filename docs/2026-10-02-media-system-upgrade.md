# Rencana Pengembangan Sistem Media — LKTech

> **Status dokumen:** ✅ **Dieksekusi** (FASE M1–M6 selesai — commit `b44822a`)
> **Jenis:** Flow implementasi + daftar task lengkap
> **Cakupan:** Sistem Media dashboard admin — data layer, backend/API, UI/UX, a11y, performa, keamanan, integrasi.
> **Tujuan:** Upgrade besar-besaran sistem media agar **proper, skalabel, dan nyaman dipakai**, bukan sekadar galeri datar.
> **Aturan:** Dokumen ini **tidak mengubah kode apa pun**. Semua pekerjaan dilakukan pada sesi implementasi terpisah.
> **Verifikasi:** `npx tsc --noEmit` ✅ · `npx eslint .` ✅ · `npm run build` ✅

> **Status Eksekusi (M1–M6):** Seluruh fase **selesai** pada commit `b44822a` —
> data layer (`media.ts`, `media-usage.ts`, `media-collections.ts`, `media-normalize.ts`, `media-audit.ts`, `media-revalidate.ts`),
> API (`bulk`/`usage`/`scan`/`orphans`/`tags`/`collections`/`audit`, list terpaginasi + filter, PATCH, soft-delete + restore, guard hapus),
> UI dashboard (`media-manager`, `media-picker-dialog` + crop/rasio, `media-detail-panel`, `media-bulk-bar`, `media-card`, `media-toolbar`, `media-sidebar`),
> serta adopsi `alt`/`coverAlt` di produk, artikel, hero, dan portofolio.


---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Kondisi Sistem Saat Ini (Audit)](#2-kondisi-sistem-saat-ini-audit)
3. [Masalah & Gap yang Ditemukan](#3-masalah--gap-yang-ditemukan)
4. [Visi Sistem Media Baru](#4-visi-sistem-media-baru)
5. [Arsitektur & Model Data Target](#5-arsitektur--model-data-target)
6. [Rencana Fitur (Backend/API)](#6-rencana-fitur-backendapi)
7. [Rencana Fitur (UI/UX Dashboard)](#7-rencana-fitur-uiux-dashboard)
8. [Komponen Picker & Integrasi Konten](#8-komponen-picker--integrasi-konten)
9. [A11y, Performa, Keamanan](#9-a11y-performa-keamanan)
10. [Pemetaan File (Baru & Diubah)](#10-pemetaan-file-baru--diubah)
11. [Roadmap Bertahap (Fase M1–M6)](#11-roadmap-bertahap-fase-m1m6)
12. [Definition of Done & Kriteria Uji](#12-definition-of-done--kriteria-uji)
13. [Risiko & Mitigasi](#13-risiko--mitigasi)
14. [Langkah Manual / Operasional](#14-langkah-manual--operasional)
15. [Lampiran: Skema, API, Env](#15-lampiran-skema-api-env)

---

## 1. Ringkasan Eksekutif

Sistem media saat ini berfungsi sebagai **galeri gambar datar**: unggah ke Cloudinary, simpan metadata di Firestore, tampilkan grid, pilih dari dialog. Fondasinya **sehat** (signed upload aman, metadata terpisah, reusable picker), tetapi **terbatas** untuk penggunaan serius: tidak ada pencarian server-side, tidak ada edit metadata, tidak ada folder/tag, tidak ada pelacakan penggunaan (di mana aset dipakai), tidak ada deteksi aset yatim, tidak ada trash/restore, dan UI masih satu layar tanpa paginasi.

**Tujuan upgrade:** menjadikan Media sebagai **pusat aset (Digital Asset Manager ringan)** — dengan pencarian & filter kuat, pengorganisasian (tag/koleksi), edit metadata, bulk action, pelacakan penggunaan & pencegahan hapus aset yang dipakai, trash/restore, peningkatan aksesibilitas, dan pemilihan gambar yang canggih (crop/rasio, transformasi Cloudinary on-the-fly).

**Hasil yang diharapkan:**
- Admin bisa menemukan & mengelola 1.000+ gambar dengan mudah.
- Tidak ada lagi "hapus gambar yang ternyata dipakai di halaman publik".
- Pemanfaatan transformasi Cloudinary (WebP/AVIF, resize on-the-fly) → website lebih cepat.
- Pengalaman memilih media (picker) yang cepat, a11y, dan konsisten di semua modul (produk, artikel, hero, portofolio, pengaturan).

**Estimasi:** 6 fase (M1–M6), dapat dikerjakan bertahap dan setiap fase berdiri sendiri.

---

## 2. Kondisi Sistem Saat Ini (Audit)

### 2.1 Data (Firestore `media`)

Satu koleksi: `media/{id}` dengan field:

| Field | Tipe | Keterangan |
|---|---|---|
| `publicId` | string | `lktech/<folder>/<nama>` — ID aset Cloudinary |
| `secureUrl` | string | URL gambar Cloudinary |
| `width` / `height` | number | Dimensi |
| `format` | string | `png`/`jpg`/`webp`… |
| `bytes` | number | Ukuran berkas |
| `category` | enum | `portofolio` \| `banner` \| `lainnya` |
| `title` | string | Judul bebas |
| `projectSlug` | string? | Kaitan ke proyek portofolio |
| `createdAtISO` | string | Waktu unggah |
| `uploadedBy` | string | Email admin pengunggah |

### 2.2 API

| Endpoint | Akses | Fungsi |
|---|---|---|
| `GET /api/admin/media` | admin | Daftar **semua** media (tanpa paginasi), urut terbaru |
| `POST /api/admin/media` | admin | Simpan metadata setelah upload |
| `DELETE /api/admin/media?id&publicId` | admin | Hapus metadata + aset Cloudinary |
| `GET /api/media?category=` | publik | Daftar gambar publik (sembunyikan `publicId`), cache 60s |
| `POST /api/cloudinary/sign` | admin | Buat signature upload (folder allow-list + batas format/ukuran) |
| `POST /api/cloudinary/destroy` | admin | Hapus aset (hanya prefix `lktech/`) |

### 2.3 UI Dashboard

- **`MediaManager`** (`/admin/media`): panel unggah (kiri) + grid galeri datar (kanan). Unggah → isi judul/kategori/proyek → simpan.
- **`MediaPickerDialog`**: dialog reusable — pencarian judul, filter kategori, urutkan, pilih single/multiple, unggah inline, focus trap, Escape.
- **`ImageUploader`**: klik/drag-drop, preview, progress, hapus.

### 2.4 Konsumen media

| Modul | Cara pakai |
|---|---|
| Portofolio | `getPortfolioMediaMap()` → kelompokkan per `projectSlug` (gambar pertama = cover, sisanya galeri) |
| Produk | `cover` + `coverPublicId` (pilih via picker) |
| Artikel | `coverImage` (unggah via `ImageUploader`) |
| Hero | `hero.browser[]`/`hero.mobile[]` (pilih via picker) |
| Pengaturan | (tidak langsung) |

### 2.5 Cloudinary

- Cloud name: `y6rvwl7x` (public).
- Folder: `lktech/{portofolio,blog,produk,banner,lainnya}`.
- Signed upload: menandatangani `{folder, timestamp, allowed_formats}`.
- Format diizinkan: `jpg, jpeg, png, webp, avif`; maks 8 MB.
- Transformasi yang dipakai saat ini: hanya `f_auto,q_auto` (via `cldUrl`), dan Next Image untuk sisanya.

---

## 3. Masalah & Gap yang Ditemukan

Format: **[MED-ID] Judul** — *Severity* — Lokasi — Deskripsi.

### 3.1 Data & Backend

**MED-01 — Tidak ada paginasi / tak terbatas** — *High* — `api/admin/media` GET.
`GET /api/admin/media` membaca **seluruh** koleksi tanpa limit. Untuk ribuan aset → payload besar, lambat, boros Firestore reads.

**MED-02 — Tidak ada pencarian/filter server-side** — *High*.
Pencarian & filter dilakukan di klien atas seluruh `items`. Tidak skalabel.

**MED-03 — Tidak bisa edit metadata** — *High* — `media-manager`.
Judul/kategori/proyek hanya bisa diatur saat unggah. Tidak ada endpoint `PATCH`/`PUT` untuk mengubah setelahnya.

**MED-04 — Tidak ada pelacakan penggunaan aset** — *Critical (data integrity)*.
Tidak ada cara tahu sebuah aset **dipakai di mana** (produk cover? hero? proyek?). Menghapus aset dari galeri tidak menghapus referensinya di konten → muncul **gambar rusak** di publik. (`DELETE` tidak cek apakah `publicId` masih dipakai.)

**MED-05 — Tidak ada deteksi aset yatim (orphan)** — *Medium*.
Sebaliknya, aset yang sudah tidak dipakai di konten tetap menumpuk di galeri/Cloudinary.

**MED-06 — Tidak ada trash/restore** — *Medium*.
Hapus = permanen (metadata + Cloudinary). Salah klik = hilang selamanya.

**MED-07 — Kategori kaku (enum)** — *Medium* — `media-types`.
Hanya 3 kategori. Tidak bisa menambah kategori/koleksi baru tanpa ubah kode.

**MED-08 — Tidak ada atribut penunjang** — *Medium*.
Tidak ada: `alt` (untuk a11y/SEO), `tags[]`, `favorite`/pinned, `description`, `dominantColor`, `blurHash`.

**MED-09 — `bytes`/dimensi tidak dimanfaatkan** — *Low*.
Tidak ada info total ukuran penyimpanan, tidak ada peringatan aset besar.

**MED-10 — Slug proyek sebagai string bebas** — *Medium* — `media-manager`.
`projectSlug` disimpan sebagai string; tidak divalidasi ke daftar proyek yang ada → bisa menunjuk proyek yang sudah dihapus.

### 3.2 Publik & Cache

**MED-11 — `/api/media` membocorkan struktur & tanpa paginasi** — *Medium*.
Mengembalikan seluruh koleksi; `category` filter longgar; tidak ada pembatasan jumlah.

**MED-12 — Cache tidak konsisten** — *Medium*.
`/api/media` pakai `s-maxage=60`, halaman portofolio ISR 60s, dashboard `no-store`. Perubahan media bisa tampil tertunda tanpa invalidasi eksplisit.

**MED-13 — `revalidatePath` hanya di beberapa aksi** — *Medium*.
`POST/DELETE /api/admin/media` hanya `revalidatePath("/portofolio")` — tidak menandai halaman lain yang memakai media (produk/hero/artikel).

### 3.3 UI/UX Dashboard

**MED-14 — Grid datar tanpa organisasi** — *High*.
Tidak ada folder/koleksi/tag; semua gambar dalam satu grid.

**MED-15 — Tidak ada bulk action** — *High*.
Tidak bisa pilih banyak → hapus/pindah kategori/tag sekaligus.

**MED-16 — Tidak ada preview/detail** — *Medium*.
Klik gambar tidak membuka detail (dimensi, ukuran, URL, di mana dipakai, edit).

**MED-17 — Tidak ada drag-drop reorder galeri proyek** — *Medium*.
Urutan cover/galeri proyek hanya berdasarkan waktu; tidak bisa diatur manual.

**MED-18 — Tidak ada indikator loading/empty per-aksi** — *Low*.
Skeleton tidak seragam.

**MED-19 — Tidak ada status "dipakai"** — *Medium*.
Kartu tidak menandai apakah aset dipakai di konten.

**MED-20 — Tidak ada konfirmasi hapus yang menjelaskan dampak** — *Medium*.
Dialog hapus tidak memberi tahu "aset ini dipakai di Produk X".

### 3.4 A11y & Performa

**MED-21 — A11y picker/galeri belum lengkap** — *Medium*.
Grid item tidak punya label deskriptif; tidak ada `aria-live` untuk hasil pencarian; fokus belum dikembalikan konsisten di beberapa jalur.

**MED-22 — Gambar tanpa `sizes` optimal / tanpa transformasi Cloudinary** — *Medium*.
Banyak tempat memakai `secureUrl` mentah (tanpa `w_`/`c_`) → mengandalkan Next Image saja; di tempat non-Next (mis. `<a>`/OG) tidak ada transformasi.

**MED-23 — Tidak ada lazy/virtualisasi untuk grid besar** — *Medium*.
Render ratusan `next/image` sekaligus.

**MED-24 — Tidak ada `alt` terkelola** — *Medium (a11y/SEO)*.
`alt` memakai `title` atau `publicId`; tidak ideal.

### 3.5 Lainnya

**MED-25 — Tidak mendukung video/dokumen** — *Low* — hanya gambar.
**MED-26 — Tidak ada ekspor/backup daftar media** — *Low*.
**MED-27 — Tidak ada audit trail (siapa ubah/hapus kapan)** — *Low*.
**MED-28 — `ImageUploader` pakai `confirm()` bawaan** — *Low* — `confirm-dialog` bersama belum dipakai di sana.

---

## 4. Visi Sistem Media Baru

Jadikan **Media = Digital Asset Manager ringan** dengan prinsip:

1. **Temukan cepat** — pencarian server-side, filter multi-kriteria, sortir, tampilan grid/list.
2. **Terorganisir** — koleksi/folder + tag + favorite/pin.
3. **Aman** — pencegahan hapus aset yang dipakai, trash/restore, audit trail.
4. **Kaya metadata** — `alt`, deskripsi, tag, dimensi, ukuran, warna dominan, kaitan konten.
5. **Efisien** — paginasi/infinite scroll, virtualisasi, transformasi Cloudinary on-the-fly.
6. **Konsisten** — picker yang sama dipakai semua modul, dengan crop/rasio & preview.
7. **Aksesibel & rapi** — label, fokus, keyboard, `aria-live`, toast, skeleton.

---

## 5. Arsitektur & Model Data Target

### 5.1 `MediaItem` (diperluas, backward-compatible)

```ts
export const MEDIA_CATEGORIES = ["portofolio", "banner", "produk", "blog", "hero", "icon", "lainnya"] as const;
export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];

export type MediaItem = {
  id: string;
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  category: MediaCategory;      // diperluas (bukan hanya 3)
  title: string;
  alt: string;                  // BARU — a11y/SEO
  description?: string;         // BARU
  tags: string[];               // BARU
  collectionId?: string;        // BARU — kaitan ke koleksi/folder
  projectSlug?: string;         // (lama, dipertahankan)
  productSlug?: string;         // BARU — generic ref
  articleSlug?: string;         // BARU
  favorite: boolean;            // BARU — pin
  status: "active" | "trashed"; // BARU — trash/restore
  usageCount: number;           // BARU — jumlah referensi di konten (denormalisasi)
  usedIn: MediaUsage[];         // BARU — daftar referensi (dihitung saat scan)
  dominantColor?: string;       // BARU
  blurHash?: string;            // BARU (opsional)
  createdAt: string | null;
  updatedAtISO?: string;        // BARU
  uploadedBy?: string;
  deletedAtISO?: string;        // BARU (saat trashed)
};

export type MediaUsage = {
  type: "product" | "article" | "project" | "hero" | "settings";
  refId: string;   // slug/ID terkait
  label: string;   // teks ramah, mis. "Produk: Paket Website Portfolio"
  field: string;   // mis. "cover", "gallery[0]"
};
```

> **Backward-compatible:** item lama tanpa field baru tetap valid (di-normalisasi default: `tags: []`, `favorite: false`, `status: "active"`, dst.).

### 5.2 Koleksi baru (opsional, Fase lanjut)

```
media_collections/{id} = { name, slug, description?, coverMediaId?, createdAtISO }
media_audit/{id}       = { action, mediaId, publicId, actor, atISO, meta }
```

### 5.3 Sumber kebenaran "penggunaan" (usage)

`usageCount`/`usedIn` **dihitung** dengan memindai konten yang memakai media:

- `products.cover`, `products.variants[].*` (bila ada gambar varian)
- `articles.coverImage`
- `projects` (cover dari `projectSlug` media)
- `content/site.hero.{browser,mobile}[].url`
- `settings` (bila ada logo/banner)

Implementasi: **fungsi `scanMediaUsage()`** server-side yang membangun indeks `publicId → MediaUsage[]`. Bisa dijalankan:
- **On-demand** (tombol "Perbarui penggunaan" di dashboard), dan
- **Saat load media** (opsional, dengan cache singkat) — atau disimpan denormalisasi di dokumen `media`.

---

## 6. Rencana Fitur (Backend/API)

### 6.1 Query & List (MED-01, MED-02, MED-11)

- **`GET /api/admin/media`** — tambah query param:
  - `q` (cari judul/alt/tags/publicId)
  - `category`, `collectionId`, `tag`
  - `status` (`active`|`trashed`|`all`)
  - `sort` (`newest`|`oldest`|`title`|`size`)
  - `cursor` + `limit` (paginasi cursor berbasis `createdAtISO`+`id`)
  - Response `{ items, nextCursor }`.
- **`GET /api/media`** (publik) — batasi `limit` (mis. 60) + kursor; tetap sembunyikan `publicId`; hanya `status=active`.

### 6.2 Mutasi (MED-03, MED-06, MED-07, MED-08)

- **`PATCH /api/admin/media?id`** — update `title`, `alt`, `description`, `tags`, `category`, `collectionId`, `projectSlug`, `favorite`. Validasi zod.
- **`POST /api/admin/media/bulk`** — aksi massal: `{ ids, action: "trash"|"restore"|"delete"|"setCategory"|"addTag"|"removeTag"|"favorite", value? }`.
- **`DELETE /api/admin/media?id`** — ubah jadi **soft delete (trash)**; `?hard=true` untuk permanen (hapus Cloudinary) + cek penggunaan.

### 6.3 Keamanan Data (MED-04, MED-05, MED-10)

- Sebelum hapus permanen: `scanMediaUsage(publicId)` → bila masih dipakai, **tolak** dengan pesan daftar pemakaian.
- **`GET /api/admin/media/usage?id`** — kembalikan daftar `usedIn`.
- **`POST /api/admin/media/scan`** — pindai ulang seluruh media, perbarui `usageCount`/`usedIn` (denormalisasi).
- **`GET /api/admin/media/orphans`** — daftar aset tanpa penggunaan (untuk pembersihan).
- Validasi `projectSlug`/`productSlug`/`articleSlug` terhadap data yang benar-benar ada.

### 6.4 Koleksi & Tag (MED-07, MED-14)

- CRUD `/api/admin/media/collections` (list/create/rename/delete).
- Tag: cukup array di dokumen + agregasi daftar tag unik via endpoint `GET /api/admin/media/tags`.

### 6.5 Audit Trail (MED-27)

- Catat aksi (upload/edit/trash/restore/delete) ke `media_audit`.
- `GET /api/admin/media/audit?mediaId=` untuk riwayat.

### 6.6 Upload (perluas)

- **Dukung transformasi intake**: saat simpan metadata, simpan `originalUrl` + opsi transformasi yang dipakai UI (bukan simpan versi berubah, cukup URL on-the-fly).
- **Ekstrak metadata** (opsional): `dominantColor` via Cloudinary add-on atau hitung sederhana; `blurHash` opsional.
- **Video/dokumen** (MED-25, opsional lanjut): `resourceType` (`image`|`video`|`raw`).

### 6.7 Invalidasi Cache (MED-12, MED-13)

- Setelah setiap mutasi media → `revalidatePath("/")`, `/produk`, `/portofolio`, `/blog`, dan `/layanan` (karena media bisa muncul di mana saja). Pertimbangkan tag-based revalidation.

---

## 7. Rencana Fitur (UI/UX Dashboard)

### 7.1 Layout baru `/admin/media`

- **Toolbar**: pencarian (server-side, debounce), filter kategori/koleksi/tag, sortir, toggle **Grid/List**, tombol **Unggah**, **Bulk mode**, **Trash**.
- **Sidebar kiri** (opsional): Koleksi, Tag, Kategori, Favorit, Trash, Orphan.
- **Area konten**: grid responsif dengan **paginasi/infinite scroll**, virtualisasi untuk jumlah besar.
- **Kartu aset**: thumbnail, judul, badge kategori, ikon favorit, indikator **"Dipakai ×N"**, checkbox (bulk), menu aksi (Detail, Edit, Ganti kategori, Trash).

### 7.2 Detail panel / modal aset (MED-16, MED-19, MED-20)

- Preview besar, dimensi, ukuran, format, `publicId`, URL, tanggal, pengunggah.
- **"Dipakai di"**: daftar `usedIn` (Produk/Artikel/Proyek/Hero) dengan link.
- Edit metadata inline: title, **alt**, deskripsi, tags, kategori, koleksi, favorite.
- Aksi: Unduh, Salin URL, Trash, Hapus permanen (dengan guard).

### 7.3 Bulk action bar (MED-15)

- Muncul saat ada yang dipilih: Hapus (trash), Restore, Set kategori, Tambah/hapus tag, Favorite, Unduh URL terpilih.

### 7.4 Edit & Edit mode upload

- Panel unggah memungkinkan **multi-file** (drag banyak sekaligus) → daftar antrean dengan judul/kategori/tag per berkas → simpan semua.

### 7.5 Trash & Restore (MED-06)

- Halaman/tab Trash: daftar aset `status=trashed`, tombol **Pulihkan** & **Hapus permanen** (dengan guard penggunaan).

### 7.6 Empty/loading/error konsisten (MED-18)

- Skeleton grid, empty state informatif, error banner + retry, toast konsisten.

---

## 8. Komponen Picker & Integrasi Konten

### 8.1 `MediaPickerDialog` (upgrade)

- Pencarian **server-side** + filter kategori/tag.
- Tampilan **grid/list**, paginasi.
- **Single/Multiple** (sudah ada) + **batas maksimum**.
- **Pratinjau & crop/rasio** (opsional): pilih rasio (16:10, 1:1, 9:16) → simpan URL dengan transformasi Cloudinary (`c_fill,w_...,h_...`).
- **Unggah inline** (sudah ada) diperkuat (multi-file, tag langsung).
- **A11y**: `aria-live` hasil, label item, fokus kembali, keyboard nav (panah).
- API `onSelect` mengembalikan `MediaItem[]` (termasuk `alt`).

### 8.2 Adopsi `alt` & transformasi di konsumen

- **Produk**: `cover` + `coverAlt` (pakai `alt` dari media).
- **Artikel**: `coverImage` + `coverAlt`.
- **Hero**: `hero.*[].alt` (sudah ada) → diisi dari media `alt`.
- **Portofolio**: cover/gallery → `next/image` dengan `alt` dari media.
- Semua `<Image>`: pastikan `sizes` tepat; gunakan transformasi Cloudinary untuk metrik cepat.

### 8.3 Reorder galeri proyek (MED-17)

- Tambah field urutan di media (mis. `order`) atau simpan urutan eksplisit di dokumen proyek (`galleryOrder: string[]`). Dashboard menyediakan drag-drop.

---

## 9. A11y, Performa, Keamanan

### 9.1 A11y (MED-21, MED-24)

- Semua kontrol bergambar punya `aria-label`; item grid punya nama aksesibel (`role="button"`, label = judul/alt).
- `aria-live="polite"` untuk menghitung hasil pencarian & pesan aksi.
- Fokus dikembalikan ke pemicu saat dialog/panel ditutup; focus trap konsisten.
- Kontras, urutan tab, dukungan keyboard (panah/Enter) pada grid.

### 9.2 Performa (MED-22, MED-23)

- Paginasi/infinite scroll + virtualisasi grid.
- `next/image` dengan `sizes` benar; `loading="lazy"` (kecuali above-the-fold).
- Gunakan transformasi Cloudinary (`w_`, `q_auto`, `f_auto`) untuk thumbnail agar ringan.
- Hindari memuat seluruh koleksi; cache respons list pendek.

### 9.3 Keamanan (MED-04, MED-11, MED-15)

- Semua mutasi lewat `requireAdmin`.
- Validasi zod (media update/bulk/collection).
- Hapus permanen: cek penggunaan + hanya prefix `lktech/`.
- Rate limit untuk endpoint scan/bulk (opsional).
- Publik: tetap sembunyikan `publicId`; batasi `limit`.

---

## 10. Pemetaan File (Baru & Diubah)

### 10.1 Data & Lib

| File | Aksi | Peran |
|---|---|---|
| `src/lib/media-types.ts` | ✏️ ubah | Perluas kategori, `MediaItem`, `MediaUsage` |
| `src/lib/media.ts` | ➕ baru | Data layer server: list (paginasi/filter), get, update, soft-delete, restore, bulk, tags, collections |
| `src/lib/media-usage.ts` | ➕ baru | `scanMediaUsage`, indeks `publicId → MediaUsage[]` |
| `src/lib/media-collections.ts` | ➕ baru | CRUD koleksi |
| `src/lib/media-normalize.ts` | ➕ baru | Normalisasi dokumen (backward-compat) |
| `src/lib/api-schemas.ts` | ✏️ ubah | Schema media update/bulk/collection |
| `src/lib/admin-api.ts` | ✏️ ubah | Client fetch/save/update/bulk/trash/restore |
| `src/lib/cloudinary.ts` | ✏️ ubah | Helper transformasi URL, folder baru |
| `src/lib/cloudinary-client.ts` | ✏️ ubah | `imgUrl(publicId, {w,h,crop,format})` |

### 10.2 API Routes

| File | Aksi |
|---|---|
| `src/app/api/admin/media/route.ts` | ✏️ GET (query+paginasi), POST, PATCH, DELETE (soft) |
| `src/app/api/admin/media/bulk/route.ts` | ➕ aksi massal |
| `src/app/api/admin/media/usage/route.ts` | ➕ daftar pemakaian aset |
| `src/app/api/admin/media/scan/route.ts` | ➕ pindai penggunaan |
| `src/app/api/admin/media/orphans/route.ts` | ➕ aset yatim |
| `src/app/api/admin/media/tags/route.ts` | ➕ daftar tag |
| `src/app/api/admin/media/collections/route.ts` | ➕ CRUD koleksi |
| `src/app/api/media/route.ts` | ✏️ publik: limit + status active |

### 10.3 UI Dashboard

| File | Aksi |
|---|---|
| `src/components/admin/media-manager.tsx` | ✏️ rombak: toolbar, sidebar, grid/list, detail, bulk, trash |
| `src/components/admin/media-picker-dialog.tsx` | ✏️ upgrade: server search, a11y, crop, paginasi |
| `src/components/admin/media-detail-panel.tsx` | ➕ panel detail/edit |
| `src/components/admin/media-bulk-bar.tsx` | ➕ aksi massal |
| `src/components/admin/media-card.tsx` | ➕ kartu aset |
| `src/components/admin/media-toolbar.tsx` | ➕ toolbar pencarian/filter |
| `src/components/admin/image-uploader.tsx` | ✏️ multi-file + `ConfirmDialog` |
| `src/components/admin/confirm-dialog.tsx` | (dipakai ulang) |

### 10.4 Integrasi konsumen

| File | Aksi |
|---|---|
| `src/lib/portfolio-media.ts` | ✏️ ikut sertakan `alt`, urutan |
| `src/app/portofolio/*` | ✏️ `alt` + transformasi |
| `src/components/admin/products-manager.tsx` | ✏️ `coverAlt` |
| `src/components/admin/articles-manager.tsx` | ✏️ `coverAlt` |
| `src/components/admin/hero-showcase-manager.tsx` | ✏️ `alt` dari media |
| `src/lib/product-types.ts`, `article-types.ts` | ✏️ field `*Alt` (opsional) |

### 10.5 Docs

| File | Aksi |
|---|---|
| `docs/YYYY-MM-DD-media-system-upgrade.md` | ➕ dokumen ini |

---

## 11. Roadmap Bertahap (Fase M1–M6)

> Setiap fase **berdiri sendiri**, bisa ditest, dan tidak merusak sistem lama.

### FASE M1 — Fondasi Data & Query (Backend)
- Perluas `media-types` (kategori, `alt`, `tags`, `favorite`, `status`, `usageCount`) + normalizer backward-compat.
- Refactor GET list: query param (q, category, tag, status, sort, cursor, limit).
- `PATCH` update metadata + schema.
- Soft delete (trash) + restore.
- Tambah `revalidatePath` lengkap.
- **Uji:** list terpaginasi, edit, trash/restore.

### FASE M2 — UI Dashboard Baru
- Toolbar (search/filter/sort), grid/list, paginasi/infinite scroll.
- Kartu aset + menu aksi + indikator "Dipakai".
- Panel detail/edit.
- Bulk action bar.
- Tab Trash.
- **Uji:** kelola 500+ item lancar.

### FASE M3 — Penggunaan & Keamanan Data
- `scanMediaUsage()` + endpoint usage/scan/orphans.
- Guard hapus permanen (tolak bila dipakai).
- Denormalisasi `usageCount`/`usedIn` + tombol "Perbarui penggunaan".
- **Uji:** hapus aset terpakai → ditolak dengan daftar pemakaian.

### FASE M4 — Organisasi (Koleksi & Tag)
- Koleksi CRUD + sidebar.
- Tag: agregasi, filter, tambah/hapus via bulk.
- Favorite/pin.
- **Uji:** filter per koleksi/tag.

### FASE M5 — Picker & Integrasi Konten
- Upgrade `MediaPickerDialog` (server search, a11y, paginasi, crop/rasio).
- Adopsi `alt` di produk/artikel/hero/portofolio.
- Reorder galeri proyek.
- **Uji:** pilih gambar + alt tersimpan; galeri urut manual.

### FASE M6 — Poles, A11y, Performa, Audit
- Virtualisasi grid, transformasi Cloudinary menyeluruh, `sizes`/`lazy`.
- `aria-live`, keyboard nav, focus management lengkap.
- Audit trail + riwayat aset.
- (Opsional) dukung video/dokumen, ekspor daftar media.
- **Uji:** audit a11y, Lighthouse, uji beban.

**Estimasi kasar:** M1 (1 sesi), M2 (1–2 sesi), M3 (1 sesi), M4 (1 sesi), M5 (1 sesi), M6 (1 sesi).

---

## 12. Definition of Done & Kriteria Uji

**Per fase:**
- `npx tsc --noEmit` bersih, `npm run lint` bersih, `npm run build` sukses.
- Tidak ada regresi pada modul yang memakai media (produk/artikel/hero/portofolio).
- Dokumentasi diperbarui.

**Checklist uji manual (akhir):**
- [ ] Unggah **multi-file** sekaligus → semua tersimpan dengan metadata.
- [ ] Cari "kopi" → hasil server-side < 1s.
- [ ] Filter kategori/koleksi/tag bekerja & bisa dikombinasi.
- [ ] Edit judul/alt/tags → tersimpan & tampil.
- [ ] Tandai favorit → muncul di filter Favorit.
- [ ] Pilih 10 aset → bulk trash → muncul di Trash → restore.
- [ ] Coba hapus permanen aset yang dipakai produk → **ditolak** dengan pesan "dipakai di Produk X".
- [ ] Scan penggunaan → angka "Dipakai ×N" akurat.
- [ ] Picker: cari, pilih, crop rasio, alt terisi ke konten.
- [ ] Portofolio: cover/galeri tampil + `alt` benar + urutan manual.
- [ ] Grid 500+ gambar tetap mulus (virtualisasi).
- [ ] Keyboard: Tab/panah/Enter/Escape berfungsi di grid & dialog.
- [ ] `aria-live` mengumumkan jumlah hasil & aksi.
- [ ] Tidak ada gambar rusak (`<img>` gagal) di halaman publik.

---

## 13. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Migrasi field baru membuat item lama error | Normalizer backward-compat (default aman) |
| Hapus Cloudinary tak sengaja | Guard penggunaan + trash dulu |
| Payload besar → lambat | Paginasi cursor + virtualisasi + transformasi |
| Firestore index baru diperlukan untuk query kompleks | Dokumentasikan index; mulai dengan query sederhana di klien bila perlu |
| Duplikasi aset (unggah berkas sama berkali-kali) | (Opsional) deteksi duplikat via hash/Cloudinary `public_id` |
| Regresi di konsumen konten | Uji per fase; jaga tipe lama tetap valid |

---

## 14. Langkah Manual / Operasional

- Pastikan `CLOUDINARY_*` & `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` di Vercel & `.env.local`.
- Bila menambah query Firestore dengan `orderBy`+`where` kombinasi baru → **buat index** di Firebase Console (ikuti error link).
- Cloudinary: pastikan format & folder allow-list sesuai.
- Bila mengaktifkan fitur video/dokumen → set `resourceType` & folder terkait.

---

## 15. Lampiran: Skema, API, Env

### 15.1 Ringkasan endpoint target

| Method | Path | Fungsi |
|---|---|---|
| GET | `/api/admin/media?q&category&tag&collectionId&status&sort&cursor&limit` | List terpaginasi |
| POST | `/api/admin/media` | Simpan metadata |
| PATCH | `/api/admin/media?id` | Update metadata |
| DELETE | `/api/admin/media?id&hard` | Trash / hapus permanen |
| POST | `/api/admin/media/bulk` | Aksi massal |
| GET | `/api/admin/media/usage?id` | Pemakaian aset |
| POST | `/api/admin/media/scan` | Pindai penggunaan |
| GET | `/api/admin/media/orphans` | Aset yatim |
| GET | `/api/admin/media/tags` | Daftar tag |
| GET/POST | `/api/admin/media/collections` | Koleksi |
| GET | `/api/media?category&limit&cursor` | Publik (active only) |

### 15.2 Schema zod (contoh)

```ts
export const mediaUpdateSchema = z.object({
  title: z.string().trim().max(200).optional(),
  alt: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  category: z.enum(MEDIA_CATEGORIES).optional(),
  collectionId: z.string().trim().max(200).optional(),
  projectSlug: z.string().trim().max(200).optional(),
  favorite: z.boolean().optional(),
});

export const mediaBulkSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1).max(200),
  action: z.enum(["trash", "restore", "delete", "favorite", "unfavorite", "setCategory", "addTag", "removeTag"]),
  value: z.string().trim().max(200).optional(),
});
```

### 15.3 Kategori target

`portofolio`, `banner`, `produk`, `blog`, `hero`, `icon`, `lainnya`.

---

## CATATAN PENUTUP

Dokumen ini dirancang **lengkap lintas sesi**. Urutan eksekusi yang disarankan:
1. **FASE M1** (fondasi data & query) — paling cepat memberi dampak & fondasi.
2. **FASE M2** (UI baru) — pengalaman utama admin.
3. **FASE M3** (penggunaan & keamanan data) — mencegah gambar rusak (penting).
4. Lanjut M4 → M5 → M6 sesuai waktu.

> Setiap fase: verifikasi `tsc`/`lint`/`build` + uji manual sebelum lanjut.
