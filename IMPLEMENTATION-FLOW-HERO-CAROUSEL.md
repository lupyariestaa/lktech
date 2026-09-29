# Implementation Flow — Carousel Gambar pada Mockup Hero (Beranda)

> **Status:** 🟡 Rencana (belum dieksekusi)
> **Dibuat:** sesi "Hero Showcase Carousel"
> **Tujuan:** Mengganti isi dekoratif mockup browser & ponsel di section Hero beranda
> menjadi **carousel gambar** yang berganti otomatis, dan bisa **dikelola dari dashboard**.

---

## 1. Ringkasan Kebutuhan

Di section Hero (paling atas beranda) sisi kanan ada 2 mockup:
- **Mockup browser** (desktop) — kartu besar bergaya jendela browser.
- **Mockup ponsel** — kartu kecil mengambang.

Saat ini keduanya berisi **elemen dekoratif dummy** (titlebar, tombol, card abu-abu).

**Yang diinginkan:**
1. Isi kedua mockup menjadi **carousel gambar yang berganti otomatis**.
2. **Frame mockup dipertahankan** (titlebar 3 titik browser, notch ponsel) — hanya
   area konten di dalam yang diganti gambar.
3. **Dua daftar gambar terpisah**: satu untuk mockup browser, satu untuk mockup ponsel.
4. **Dua mockup independen** (tidak harus sinkron) — masing-masing punya interval sendiri.
5. Semua bisa **diatur dari dashboard** (menu baru): upload gambar, urutkan, hapus,
   atur interval, atur efek transisi, dan aktif/nonaktif.

---

## 2. Keputusan Desain (disepakati)

| Aspek | Keputusan |
| --- | --- |
| Perilaku mockup | **Dua mockup independen** (interval & daftar sendiri) |
| Daftar gambar | **Dua daftar terpisah** (browser & ponsel) di dashboard |
| Cara upload | **`ImageUploader` → Cloudinary** (signed upload, konsisten fitur lain) |
| Pengaturan | **Interval + efek transisi + aktif/nonaktif + urutan (naik/turun)** |
| Frame | **Dipertahankan** (titlebar browser & notch ponsel tetap) |
| Container gambar | **`object-cover`** mengisi area konten mockup |

---

## 3. Arsitektur Data

### 3.1 Pilihan penyimpanan
Mengikuti pola yang sudah ada di proyek:
- Konten situs (layanan/FAQ/harga) → koleksi `content`, dokumen `site`.
- Pengaturan kontak → koleksi `settings`, dokumen `site`.

**Untuk fitur ini:** tambahkan bagian baru pada dokumen `content/site` yang sudah ada,
di bawah key `hero` — **atau** koleksi terpisah. **Keputusan: tetap di `content/site`**
agar hemat & konsisten (`getSiteContent()` yang sudah ada tinggal diperluas).

> ⚠️ Alternatif koleksi `showcase` terpisah TIDAK dipakai agar tidak menambah
> read/write dan tetap satu sumber konten.

### 3.2 Bentuk data `hero`

```ts
export type HeroShowcaseImage = {
  /** URL Cloudinary (secure_url). */
  url: string;
  /** publicId Cloudinary — untuk hapus aset saat diganti/dihapus. */
  publicId: string;
  /** Keterangan alternatif untuk aksesibilitas. */
  alt: string;
};

export type HeroShowcase = {
  /** Aktif/nonaktif seluruh carousel. Jika false → tampilkan frame + placeholder. */
  enabled: boolean;
  /** Interval ganti gambar (detik). 2–15. */
  interval: number;
  /** Efek transisi antar gambar: "fade" | "slide". */
  effect: "fade" | "slide";
  /** Daftar gambar mockup browser (desktop), urut. */
  browser: HeroShowcaseImage[];
  /** Daftar gambar mockup ponsel, urut. */
  mobile: HeroShowcaseImage[];
};
```

### 3.3 Default (fallback bila belum diatur)
```ts
export const DEFAULT_HERO_SHOWCASE: HeroShowcase = {
  enabled: true,
  interval: 4,
  effect: "fade",
  browser: [],   // kosong → komponen tampilkan placeholder
  mobile: [],
};
```
> Jika daftar kosong atau `enabled=false`, komponen menampilkan **placeholder**
> (gradient + ikon) di dalam frame — tidak error, tidak kosong polos.

### 3.4 Penyimpanan di Firestore (`content/site`)
```
{
  services: [...],       // sudah ada
  faqs: [...],           // sudah ada
  pricing: [...],        // sudah ada
  hero: {                // BARU
    enabled: true,
    interval: 4,
    effect: "fade",
    browser: [ { url, publicId, alt }, ... ],
    mobile:  [ { url, publicId, alt }, ... ],
  },
  updatedAtISO, updatedBy
}
```

---

## 4. Perubahan File (Rencana)

### 4.1 Tipe & data
| File | Aksi |
| --- | --- |
| `src/lib/content-types.ts` | Tambah tipe `HeroShowcase`, `HeroShowcaseImage`, `DEFAULT_HERO_SHOWCASE`; tambah `hero` ke `SiteContent`. |
| `src/lib/site-content.ts` | Tambah `normalizeHeroShowcase()` + masukkan ke `normalizeSiteContent()` & `saveSiteContent()`. |

### 4.2 API
| File | Aksi |
| --- | --- |
| `src/app/api/content/route.ts` | (tidak berubah — otomatis ikut karena pakai `getSiteContent()`). |
| `src/app/api/admin/content/route.ts` | (tidak berubah — otomatis ikut menormalisasi `hero`). |

> Karena fitur ini menumpang `content/site`, **tidak perlu API/route baru**. Cukup
> pastikan `normalizeSiteContent` ikut memproses `hero`.

### 4.3 Komponen publik (Hero)
| File | Aksi |
| --- | --- |
| `src/components/sections/hero.tsx` | Ganti isi `DeviceMockups`: area konten mockup jadi `<HeroShowcaseCarousel>` (browser & ponsel). Pertahankan titlebar/notch/chip. |
| `src/components/hero-showcase-carousel.tsx` | **BARU** — komponen carousel: terima daftar gambar + interval + efek; auto-rotate; placeholder bila kosong. |

### 4.4 Provider (client)
| File | Aksi |
| --- | --- |
| `src/components/content-provider.tsx` | (tidak berubah — `content.hero` otomatis tersedia via `useContent()`). |

### 4.5 Dashboard
| File | Aksi |
| --- | --- |
| `src/app/admin/(dashboard)/hero/page.tsx` | **BARU** — halaman "Hero" (judul + deskripsi). |
| `src/components/admin/hero-showcase-manager.tsx` | **BARU** — UI kelola: dua kolom (Browser & Ponsel), masing-masing: `ImageUploader`, daftar gambar (thumbnail + alt + naik/turun/hapus), pengaturan interval/efek/enabled, tombol simpan. |
| `src/components/admin/admin-shell.tsx` | Tambah 1 menu: **Hero** (ikon mis. `PanelsTopLeft` / `GalleryHorizontal`). |
| `src/lib/admin-content-api.ts` | (tidak berubah — pakai `saveSiteContent` yang ada). |
| `src/components/admin/use-site-content.ts` | (tidak berubah — pakai `commit()` yang ada). |

### 4.6 Firestore Rules
| File | Aksi |
| --- | --- |
| `firestore.rules` | **Tidak ada perubahan** (koleksi `content` sudah diizinkan, publik read / admin write). |

---

## 5. Alur UI/UX

### 5.1 Beranda (publik)
1. `Hero` menerima `content.hero` via `useContent()`.
2. Mockup browser → `<HeroShowcaseCarousel images={hero.browser} interval effect />`
   dengan frame titlebar (3 titik) tetap.
3. Mockup ponsel → carousel yang sama dengan `images={hero.mobile}` + notch.
4. Auto-rotate tiap `interval` detik, transisi `fade`/`slide`.
5. Jika `enabled=false` atau daftar kosong → placeholder (gradient brand + ikon) di dalam frame.
6. Hormati `prefers-reduced-motion`: bila aktif, jangan auto-rotate (tampilkan gambar pertama saja / tanpa animasi).

### 5.2 Dashboard (`/admin/hero`)
```
┌─ Hero (Showcase Beranda) ────────────────────────────────┐
│ [x] Aktifkan carousel                                     │
│ Interval: [ 4 ] detik     Efek: ( ) Fade  ( ) Slide       │
│                                                           │
│ ┌─ Mockup Browser ─────────┐  ┌─ Mockup Ponsel ─────────┐ │
│ │ [ ImageUploader ]        │  │ [ ImageUploader ]        │ │
│ │ ┌ thumb ┐ alt… ↑ ↓ 🗑     │  │ ┌ thumb ┐ alt… ↑ ↓ 🗑   │ │
│ │ ┌ thumb ┐ alt… ↑ ↓ 🗑     │  │ ┌ thumb ┐ alt… ↑ ↓ 🗑   │ │
│ └──────────────────────────┘  └──────────────────────────┘ │
│                                        [ Simpan ]         │
└───────────────────────────────────────────────────────────┘
```
- Upload → gambar otomatis ditambah ke daftar terkait (dengan `publicId`).
- Masing-masing item: input **alt text**, tombol **naik/turun**, tombol **hapus**
  (hapus = hapus dari daftar; tawaran konfirmasi hapus aset Cloudinary juga).
- Tombol **Simpan** → `commit({ hero })` → tersimpan ke `content/site`.

---

## 6. Detail Implementasi Komponen Carousel

`hero-showcase-carousel.tsx`:
```tsx
"use client";
type Props = {
  images: HeroShowcaseImage[];
  interval: number;      // detik
  effect: "fade" | "slide";
  aspect?: string;       // mis. "16/10" untuk browser
  className?: string;
};
```
- `useEffect` + `setInterval` untuk rotate; reset bila `images`/`interval` berubah.
- Render semua gambar bertumpuk (`absolute inset-0`), animasi `opacity` (fade) atau
  `x` (slide) via framer-motion `AnimatePresence`.
- Placeholder bila kosong: `bg-gradient-to-br from-primary to-primary-light` + ikon.
- `prefers-reduced-motion` → tanpa interval, tampilkan yang pertama.

---

## 7. Langkah Eksekusi (Checklist)

1. [ ] `content-types.ts`: tambah tipe + default `hero`, masukkan ke `SiteContent`.
2. [ ] `site-content.ts`: `normalizeHeroShowcase()` + integrasi di normalize & save
       (termasuk **sinkronisasi hapus aset Cloudinary** yang tidak lagi dipakai — opsional, lihat §9).
3. [ ] `hero-showcase-carousel.tsx`: komponen carousel.
4. [ ] `hero.tsx`: integrasikan carousel ke `DeviceMockups` (pertahankan frame).
5. [ ] `hero-showcase-manager.tsx`: UI dashboard.
6. [ ] `app/admin/(dashboard)/hero/page.tsx`: halaman.
7. [ ] `admin-shell.tsx`: tambah menu "Hero".
8. [ ] `firestore.rules`: **tidak perlu** (sudah ada `content`) — verifikasi saja.
9. [ ] Uji lokal (`npm run dev`): upload 2–3 gambar per mockup, atur interval/efek, simpan, cek beranda.
10. [ ] `npm run build` → pastikan tanpa error.
11. [ ] Push → Vercel auto-deploy.

---

## 8. Kriteria Selesai (Definition of Done)

- [ ] Mockup browser & ponsel menampilkan gambar yang berganti otomatis.
- [ ] Frame (titlebar browser, notch ponsel) tetap terlihat.
- [ ] Gambar diatur dari dashboard `/admin/hero` (upload, urut, hapus, alt).
- [ ] Interval, efek (fade/slide), dan on/off bisa diatur & berpengaruh ke beranda.
- [ ] Dua daftar (browser & ponsel) terpisah.
- [ ] Placeholder rapi bila gambar kosong / fitur dimatikan.
- [ ] `npm run build` sukses, tidak ada error TS.
- [ ] Deploy ke Vercel berjalan.

---

## 9. Catatan & Risiko

- **Hapus aset Cloudinary:** Saat gambar dihapus dari daftar, metadata hilang dari
  `content/site`. Aset Cloudinary bisa dibiarkan (lebih aman) atau dihapus. **Rencana:**
  tawarkan opsi hapus aset (panggil `/api/cloudinary/destroy` seperti `ImageUploader`),
  tetapi default = jangan hapus aset (menghindari gambar terpakai di tempat lain).
- **Performa:** gunakan `next/image` (`object-cover`), `sizes` sesuai mockup, `priority`
  hanya untuk gambar pertama mockup browser.
- **Reduced motion:** wajib dihormati (auto-rotate dimatikan).
- **Cache:** `content/site` disajikan `/api/content` dengan `s-maxage=300`. Setelah
  simpan di dashboard, beranda (client) langsung update via provider; halaman lain
  mungkin perlu ≤ 5 menit (sama seperti konten lain).
- **Konsistensi `ContentProvider`:** `hero` otomatis ikut karena berada di `SiteContent`.
- **Ukuran gambar disarankan:** browser ~1600×1000 (16:10), ponsel ~720×1280 (9:16 portrait).
  Dokumentasikan di UI dashboard (teks bantuan).

---

## 10. Panduan Singkat Penggunaan (untuk pemilik)

1. Buka **Dashboard → Hero**.
2. Pastikan **"Aktifkan carousel"** tercentang.
3. Atur **Interval** (mis. 4 detik) & **Efek** (Fade/Slide).
4. Di kolom **Mockup Browser**, klik unggah → pilih gambar (disarankan rasio 16:10).
5. Di kolom **Mockup Ponsel**, klik unggah → pilih gambar (disarankan rasio 9:16).
6. Isi **teks alternatif** (untuk SEO/aksesibilitas), atur **urutan** bila perlu.
7. Klik **Simpan** → cek beranda.

---

> **Setelah dokumen ini disetujui, eksekusi mengikuti bagian §7.**
