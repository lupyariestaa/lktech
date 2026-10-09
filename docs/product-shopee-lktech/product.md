# PANDUAN MEMBUAT PRODUK SHOPEE - LKTech

> **BERKAS INI ADALAH ATURAN WAJIB.** Setiap AI (atau manusia) yang membuat produk
> Shopee baru untuk toko **LKTech** di folder `docs/product-shopee-lktech/`
> **HARUS membaca & mengikuti** panduan ini terlebih dahulu.
>
> **Sifat berkas:** hidup & dinamis - diperbarui setiap ada informasi/keputusan baru
> dari owner. Perubahan aturan ditulis di bagian **9 (Riwayat Perubahan)**.
>
> **Terakhir diperbarui:** 2026-10-06
> **Pemilik produk:** Owner LKTech

---

## 0. Cara Pakai Berkas Ini

1. Baca seluruh berkas ini **sebelum** membuat produk baru.
2. Buat **1 produk = 1 file `.md`** di folder ini. **Nama file: `product-<nomor>-<slug>.md`** (kebab-case), mis. `product-1-jasa-pembuatan-website-all.md`, `product-2-jasa-pembuatan-website-portfolio.md`. **Nomor urut sesuai urutan dibuat** (produk terbaru = nomor terbesar). Berkas panduan ini bernama `product.md` (tanpa nomor).
3. Ikuti struktur wajib di bagian **3** dan aturan penulisan di bagian **4**.
4. Sebelum menutup pekerjaan, jalankan **checklist di bagian 8**.
5. Bila ada perintah owner yang bertentangan dengan berkas ini -> **tanyakan dulu** (jangan asal pilih), lalu perbarui berkas ini bila keputusannya mengubah aturan.

---

## 1. Konteks Toko LKTech

| Item | Keterangan |
| --- | --- |
| **Nama toko** | LKTech |
| **Bidang** | Jasa teknologi: pembuatan website, aplikasi mobile, konsultasi, desain/branding, digital marketing; plus produk digital (template/software) |
| **Website proyek** | (produk Shopee harus selaras dengan layanan di website LKTech) |
| **Kontak/WA** | `6283159688549` (dari kode proyek). Verifikasi bila owner memberi nomor baru. |
| **Lokasi** | Padakembang, Tasikmalaya, Jawa Barat |
| **Posisi pasar** | Harga kompetitif, kualitas profesional, **murni coding (bukan WordPress)** |
| **Keunggulan utama** | Coding custom, teknologi modern, konsultasi gratis, layanan 24 jam, bonus domain+hosting |

---

## 2. Prinsip Umum Produk LKTech

1. **Jujur & transparan** - jangan klaim palsu (angka, garansi, "termurah", dsb).
2. **Profesional, bukan "murahan"** - boleh kompetitif, tapi jangan berkesan abal-abal.
3. **Konsisten** - data produk Shopee harus selaras dengan layanan di website LKTech (nama kategori, paket, fitur). **Sumber rujukan layanan:** `src/lib/services.ts` (hardcoded, jangan diubah demi Shopee) & `src/lib/pricing.ts`.
4. **Backward-compatible** - produk lama tidak diubah sembarangan saat menambah produk baru.
5. **1 produk = 1 file `.md`** - jangan gabung beberapa produk dalam 1 file.

---

## 3. Struktur File Produk

Setiap file produk berisi bagian berikut. **Bagian ini adalah daftar yang DISERTAKAN** (yang tidak perlu ada dicantumkan di bagian 3.1).

```
0. Ringkasan Cepat        -> tabel: jenis, model varian, harga (tampil & jasa asli), bonus, konsultasi, jam, stok, kontak, lokasi
1. JUDUL PRODUK           -> 1 judul utama + 2-3 alternatif, hitung karakter (<=120)
2. HARGA                  -> SESUAI JUMLAH DIMENSI:
                             - >=2 dimensi (unit checkout): (a) harga Shopee Rp100.000 (jual=coret) + rumus unit; (b) matriks internal harga jasa asli + coret 2x + jumlah unit
                             - 1 dimensi (harga normal): tabel harga jual asli + coret (2x)
3. DESKRIPSI PRODUK       -> blok siap-copy (BEBAS EMOJI), <=3000 karakter; section "CARA HARGA & CHECKOUT" HANYA untuk produk unit checkout; produk harga normal pakai struktur biasa
4. VARIAN DETAIL          -> daftar opsi varian untuk di-setting di Shopee
5. ATRIBUT PRODUK         -> tabel atribut Shopee
6. PANDUAN GAMBAR         -> urutan 5-9 gambar + komposisi + **Opsi Tagline Cover (6 opsi: 3 sedang + 3 panjang)**; **slide 8 & 9 mengikuti `product-slide-8-9-universal.md`**
7. CATATAN OPERASIONAL    -> aturan Shopee, kepatuhan, catatan penting (termasuk penjelasan pola harga yang dipakai)
```

### 3.1 Bagian yang TIDAK PERLU ADA di file produk
- **Keyword/Tag terpisah** -> keyword cukup ditanam di JUDUL; tag diisi di field Tag Shopee saat upload. (Jangan buat daftar keyword mentah.)
- **FAQ terpisah** -> Shopee tidak punya fitur FAQ. Info penting dari FAQ **dirangkum ke bagian "INFO PENTING" di dalam deskripsi** (di bagian bawah deskripsi).
- **Template chat/balasan** -> bukan bagian data produk.
- **Checklist upload** -> bukan bagian data produk.

### 3.2 Konvensi Penamaan File (WAJIB)
- Format: **`product-<nomor>-<slug>.md`** (contoh: `product-1-jasa-pembuatan-website-all.md`).
- **Nomor = urutan pembuatan** (1, 2, 3, ...); produk terbaru mendapat nomor terbesar.
- `<slug>` = nama produk singkat kebab-case (mis. `jasa-pembuatan-website-portfolio`).
- Berkas panduan ini (`product.md`) **tanpa nomor** karena bukan produk.

---

## 4. ATURAN PENULISAN (WAJIB)

### 4.1 Judul Produk
- **Maksimum 120 karakter.** Selalu hitung & tulis jumlah karakternya.
- Struktur: `[Keyword Utama] + [Jenis/Keunggulan] + [Target/Kategori] + [Pembeda]`.
- **DILARANG** di judul: kata `murah`, `gratis`, `termurah`, `promo`, `diskon`, `100%`, nomor HP/kontak, klaim berlebihan.
- Sertakan **pembeda LKTech** bila relevan: `Coding Custom`, `Bukan WordPress`.

### 4.2 Deskripsi (PALING KETAT)
- **EMOJI DILARANG TOTAL.** Shopee menolak emoji di deskripsi. Gunakan **hanya simbol teks biasa**:
  - Bullet/list: `-`
  - Pemisah heading section: `=== NAMA SECTION ===`
  - Penanda sub: `>` atau `)`
  - Simbol lain aman: `=`, `+`, `/`, `:`
- **Maksimum ~3000 karakter.** Hitung & tulis jumlah karakternya.
- Gunakan **bold** (format Shopee: `**teks**`) untuk penekanan.
- Struktur konten: `Hook -> Masalah -> Solusi/Nilai -> Yang Didapat -> Cara Order -> Info Penting -> CTA`.
- **GAYA BAHASA (WAJIB - REVISI 2026-10-06):** tulis **rapi, ramah, profesional, humble/friendly**; jangan menyentak atau terkesan menekan pembeli.
  - **Hindari kata berteriak/kaku** di kalimat naratif: jangan pakai "DILARANG", "WAJIB", "JANGAN", "HARUS", "SEGERA", tanda seru berlebihan. Sampaikan hal penting dengan sopan (mis. "sebaiknya", "kami sarankan", "agar tidak salah", "kami bantu pastikan").
  - **Heading section (`=== ... ===`) boleh tetap KAPITAL** (untuk penekanan visual di Shopee), tapi **isi kalimat di bawahnya** tetap ramah & mengalir.
  - Fokus ke **manfaat bagi pembeli** dan **nada mengajak/membantu**, bukan memerintah.
  - Gunakan **"kami"** dan **"Anda"** (sapaan sopan), hindari kata kasar/negatif tentang produk lain.
  - Kalimat pendek & jelas; jangan bertele-tele atau memakai jargon berlebihan.
- **ESTIMASI PENGERJAAN (WAJIB - REVISI 2026-10-06):** tulis **ringkas & optimistis**, JANGAN menampilkan durasi lama/menakutkan.
  - Cukup **satu baris**, contoh: *"Pengerjaan cepat - mulai sekitar 1 hari hingga 1 minggu, tergantung kompleksitas kebutuhan Anda."*
  - **Hapus** daftar estimasi lama per kategori/paket (mis. "Toko Online/Web App 4-8 minggu"). Bila perlu menyebut variasi, cukup sebut "tergantung kompleksitas".
  - Nada: menenangkan & meyakinkan bahwa pengerjaan bisa cepat, tanpa menjanjikan berlebihan.
- **Info konsultasi WAJIB** (di bagian "Cara Order"/"Cara Harga & Checkout") - **BERBEDA sesuai pola harga:**
  - **Produk unit checkout (>=2 dimensi):** tekankan **konsultasi DULU ITU WAJIB** sebelum checkout, karena harga tampil (Rp100.000) hanya satuan unit - salah menebak jumlah unit bisa membuat pembayaran tidak sesuai. **JANGAN** pakai kalimat "bila sudah yakin silakan langsung checkout". Contoh kalimat: *"Jangan checkout dulu sebelum konsultasi - harga Rp100.000 adalah satuan unit, bukan harga jasa. Konsultasi dulu (gratis) agar kami pastikan jumlah unit yang tepat."*
  - **Produk harga normal (1 dimensi):** versi ringkas profesional biasa: *"Jika masih ragu memilih paket, konsultasi dulu lebih disarankan (gratis, tanpa komitmen). Bila sudah yakin, silakan langsung checkout."*
- **Bebas dari karakter non-ASCII** (verifikasi: tidak ada emoji/karakter unicode).

### 4.3 Harga (DUA POLA: UNIT CHECKOUT vs HARGA NORMAL - REVISI 2026-10-06)
> **ATURAN PILIH POLA HARGA.** Produk dengan **>= 2 DIMENSI varian** (mis. produk-1: Kategori x Paket = 24 varian) memakai **SISTEM UNIT CHECKOUT** (harga tampil Rp100.000). Produk dengan **1 DIMENSI varian** (mis. product-2 & product-3: hanya Paket = 3 varian) memakai **HARGA NORMAL** (harga jual asli + coret 2x). Lihat penjelasan lengkap di **bagian 6.0**.

**A. Produk dengan >= 2 DIMENSI varian (PAKAI unit checkout):**
- **Harga tampil di Shopee = Rp100.000** untuk semua varian. Angka ini **bukan harga jasa resmi**, melainkan **satuan unit checkout** (`1 unit = Rp100.000`).
- **Harga coret di Shopee = Rp100.000** juga (jual = coret, tanpa diskon) -> **rasio = 1** (pasti lolos aturan Shopee). Jangan isi coret dengan angka harga jasa asli (akan ditolak Shopee karena rasio > 7).
- **Pembeli WAJIB konsultasi** lebih dulu (via chat/WA) untuk menyepakati harga. Setelah harga sepakat, pembeli **checkout sebanyak N unit** agar total = harga kesepakatan.
- **Rumus unit:** `N = ceil(harga_kesepakatan / 100.000)` (bulatkan **ke atas**). Harga kesepakatan = `N x Rp100.000`.
  - Contoh: kesepakatan Rp400.000 -> `N = 4` -> checkout 4 unit = Rp400.000.
  - Contoh: kesepakatan Rp500.000 -> `N = 5` -> checkout 5 unit = Rp500.000.
  - Contoh (tidak bulat): kesepakatan Rp450.000 -> `N = ceil(4,5) = 5` -> checkout 5 unit = Rp500.000 (kelebihan Rp50.000 disepakati bersama: jadi saldo/ditambah scope/di-refund sesuai kesepakatan).
- **Harga jasa ASLI tetap dicatat DI FILE `.md`** (internal, untuk owner) - **tidak** untuk di-upload ke Shopee. Setiap varian tetap mencatat:
  - **Harga jasa asli** (harga paket sebenarnya), DAN
  - **Harga coret asli = 2x harga jasa** (referensi internal owner saja).
  - **CATATAN:** harga coret asli **TIDAK** diupload ke Shopee. Harga coret Shopee = Rp100.000 (lihat poin di atas).
- **Varian tetap ada** (mis. Kategori x Paket), **tapi semua varian berharga Rp100.000** di Shopee. Matriks harga asli per kombinasi tetap ditulis di file `.md` sebagai referensi internal.
- **Aturan rasio 7 tetap berlaku** di Shopee, namun karena semua harga = Rp100.000 (jual & coret), rasio otomatis 1 dan selalu lolos.

**B. Produk dengan 1 DIMENSI varian (HARGA NORMAL - bukan unit checkout):**
- **Harga jual = harga jasa asli** per varian (harga FIX, bukan "mulai").
- **Harga coret = 2x harga jual** (standar), dijaga agar **rasio <= 7**. Bila perlu, clamp (lihat aturan rasio di 4.3 lanjutan).
- **Tidak ada** sistem unit checkout / konsultasi-wajib untuk harga. Pembeli bisa langsung checkout varian.

**Berlaku untuk A & B:**
- **Harga = harga FIX per paket** (BUKAN "harga mulai"). Frasa "mulai dari" tetap dilarang.
- **Tambahan di luar scope** = biaya terpisah (offline), **tidak** lewat produk Shopee. Jelaskan ini di deskripsi.

### 4.4 Varian
- Boleh multi-dimensi (mis. **Kategori** x **Paket**). Tulis daftar tiap dimensi.
- Bila Shopee hanya izinkan 1 dimensi -> gabung jadi `[Kategori] - [Paket]`.
- **Jumlah dimensi menentukan pola harga** (lihat 4.3 & 6.0):
  - **>= 2 dimensi** -> **unit checkout** (semua varian berharga Rp100.000; matriks harga asli dicatat di `.md` internal).
  - **1 dimensi** -> **harga normal** (tiap varian punya harga jual asli + coret 2x).

### 4.5 Aturan Kepatuhan Shopee (umum)
- Dilarang: kata promosi terlarang di judul, kontak di thumbnail, klaim garansi berlebihan, "termurah", "100% aman", dsb.
- Gambar utama **tidak** boleh memuat kontak/promosi berat; teks <=50% area.
- Produk jasa -> opsi pengiriman **non-fisik/instan**.

### 4.6 Aturan Tagline Cover (gambar utama) - REVISI 2026-10-06
- Setiap file produk **WAJIB mencantumkan sub-bagian "Opsi Tagline Cover"** di bawah tabel panduan gambar (`## 6`).
- Sediakan **6 opsi tagline**: **3 opsi SEDANG + 3 opsi PANJANG**, supaya owner bebas pilih sesuai selera. Tabel berkolom **Panjang** (Sedang/Panjang) + **Tagline**.
- **BENTUK TAGLINE:**
  - **Sedang (~1 baris, 5-10 kata):** ringkas, padat, langsung ke inti nilai/pembeda.
    - Contoh: *"Website custom, bukan template - sepenuhnya milik Anda."*
  - **Panjang (1 kalimat penuh, 2-3 baris saat dipasang):** bergaya **ajakan (CTA) / hook pertanyaan** yang menarik.
    - Contoh CTA: *"Serius ingin punya website sendiri? Curhat dulu kebutuhan Anda - kami rancang website custom, bukan template."*
    - Contoh hook: *"Bisnis Anda sudah bagus, tapi belum punya wajah online?"*
- **Batasan tagline (kepatuhan Shopee + keterbacaan):**
  - **Tanpa** kata terlarang: `murah`, `gratis`, `termurah`, `promo`, `diskon`, `100%`.
    - **Catatan:** hindari kata "gratis" di tagline cover (gambar utama) -> pakai **"tanpa biaya"** / "tanpa komitmen". Kata "gratis" tetap boleh di **deskripsi** (nilai jual bonus).
  - **Tanpa** nomor kontak/sosmed (khusus gambar utama); kontak boleh di gambar ke-2 dst.
  - Tetap fokus **nilai/manfaat** + gaya bahasa ramah (lihat 4.2); boleh sisipkan pembeda "Bukan WordPress".
- Sertakan **tips visual** singkat (tagline sebagai 1 blok teks; sedang = 1 baris, panjang = 2-3 baris; font besar; badge pembeda; area teks <=50%).

### 4.7 Aturan Slide 8 & 9 (Universal) - REVISI 2026-10-06
- **Slide 8 & 9 bersifat UNIVERSAL** (lintas produk). Konten siap-copy ada di berkas terpisah: **`product-slide-8-9-universal.md`**.
  - **Slide 8** = **Cara Pemesanan + Data yang Dibutuhkan**.
  - **Slide 9** = **Yang Anda Dapatkan + Keunggulan**.
- **Wajib pilih versi sesuai pola varian:**
  - **Multivarian** (>= 2 dimensi varian, mis. product-1 / unit checkout): slide 8 menekankan **konsultasi dulu -> pilih kategori & paket -> sepakati harga & checkout sejumlah unit**.
  - **Single-varian** (1 dimensi varian, product-2 s.d. product-9 / harga normal): slide 8 = **pilih paket -> checkout -> kirim brief**.
- **Gaya teks:** ringkas (overlay gambar), rasio 1:1, >=700px, teks <=50% area, warna brand #004EDF.
- **Batasan:** bebas emoji & tanpa kata terlarang Shopee. Nomor kontak/WA **boleh** di slide 8 & 9 (bukan gambar utama), tapi tetap rapi.
- Bila ada produk baru, tambahkan catatan penyesuaian "data dibutuhkan" sesuai kebutuhan khas produk (lihat bagian penyesuaian per produk di berkas universal).

---

## 5. Nilai Jual Wajib LKTech (selalu tampilkan)

Ini pembeda utama - **sertakan di setiap produk jasa** yang relevan:

1. **Murni coding custom - BUKAN template yang diganti identitas.**
2. **Bisa request tech/flow/plugin/design/layanan** sesuai keinginan pembeli; ATAU serahkan setup ke LKTech bila tidak mau ribet.
3. **Pembeli menerima source code (mentahan coding) yang rapi & profesional** - jadi miliknya sepenuhnya.
4. **Teknologi modern** (mis. Next.js, React, TypeScript/Laravel sesuai layanan) - cepat, aman, SEO, tanpa biaya plugin bulanan.
5. **Bonus** (bila berlaku): GRATIS domain `.my.id` 1 tahun + GRATIS hosting 1 bulan.
6. **Konsultasi GRATIS SEPUASNYA** + **layanan online 24 JAM**.
7. **Revisi tersedia - namun TERBATAS** sesuai scope paket (jangan klaim "revisi sepuasnya"; jangan menonjolkan biaya revisi).

---

## 6. Model Varian & Harga yang Sudah Disetujui

### 6.0 SISTEM UNIT CHECKOUT (REVISI 2026-10-06) - WAJIB DIBACA DULU

> **BERLAKU TERBATAS.** Sistem ini **HANYA untuk produk dengan >= 2 DIMENSI varian** (mis. produk-1: Kategori x Paket). Produk **1 dimensi varian** (product-2 & product-3: hanya Paket) **tetap harga normal** (harga jual asli + coret 2x).

**Kriteria pemakaian:**

| Produk | Dimensi varian | Pola harga |
| --- | --- | --- |
| Produk-1 (Website ALL) | **2** (Kategori x Paket) | **Unit checkout** (Rp100.000) |
| Product-2 (Portfolio) | **1** (Paket) | **Harga normal** |
| Product-3 (Company Profile) | **1** (Paket) | **Harga normal** |
| Produk future (mobile app, template, dll) | ikut jumlah dimensi | >=2 -> unit checkout; 1 -> harga normal |

Sistem unit checkout: yang di-upload ke Shopee **bukan** harga jasa, tetapi **satuan unit Rp100.000**.

**Alur pembelian:**
1. Pembeli melihat harga tampil di Shopee = **Rp100.000**.
2. Deskripsi menyatakan: **harga yang tertera adalah satuan unit; pembeli WAJIB konsultasi lebih dulu** untuk menentukan harga jasa sesuai kebutuhan.
3. Setelah konsultasi, disepakati **harga jasa** (mis. Rp750.000).
4. Pembeli **checkout sebanyak N unit** sampai total = harga kesepakatan:
   - `N = ceil(harga_jasa / 100.000)` (bulatkan **ke atas**)
   - Total dibayar = `N x Rp100.000`
   - Contoh: Rp400.000 -> 4 unit; Rp500.000 -> 5 unit; Rp750.000 -> 8 unit (karena `ceil(7,5)=8`, total Rp800.000); Rp6.500.000 -> 65 unit.

**Aturan pengisian di Shopee (hanya produk >=2 dimensi):**

| Field Shopee | Nilai | Keterangan |
| --- | --- | --- |
| **Harga Jual (semua varian)** | **Rp100.000** | Satuan unit, bukan harga jasa. |
| **Harga Sebelum Diskon (coret)** | **Rp100.000** | Sama dengan jual -> rasio 1 -> lolos aturan Shopee. |
| **Varian** | Tetap ada (kategori/paket) | Semua varian berharga Rp100.000. |
| **Stok** | Angka besar (mis. 100) | Ini jasa, bukan barang fisik. |

**Aturan pencatatan di file `.md` (internal - HANYA untuk owner):**
- Setiap varian **tetap mencantumkan**:
  - **Harga jasa asli** (harga paket sebenarnya),
  - **Harga coret asli = 2x harga jasa** (referensi internal).
- Matriks harga asli dipertahankan agar owner bisa melihat & menghitung harga tiap jasa.
- **PENTING:** harga jasa asli & harga coret asli **TIDAK diupload ke Shopee**. Yang diupload = Rp100.000 (jual & coret).
- Sertakan **kolom "Jumlah Unit"** = `ceil(harga_jasa / 100.000)` pada matriks harga di file produk, agar mudah saat konsultasi.

**Kenapa begini?** Karena produk multi-dimensi (mis. 24 varian) terlalu banyak untuk diberi harga jasa asli satu-satu & rawan ditolak aturan rasio 7, harga tunggal Rp100.000 dipakai sebagai "satuan", dan total transaksi ditentukan lewat konsultasi + jumlah unit checkout.

**Untuk produk 1 dimensi (harga normal):**
- **Harga Jual = harga jasa asli** per varian (harga FIX).
- **Harga Sebelum Diskon = 2x harga jual** (jaga rasio <= 7; clamp bila perlu).
- **Tanpa** sistem unit checkout / konsultasi-wajib.
- File `.md` cukup menampilkan tabel harga jual + coret (tidak perlu kolom jumlah unit).

---

### 6.1 Produk "Jasa Pembuatan Website" (`product-1-jasa-pembuatan-website-all.md`)
- **2 dimensi:** Kategori Website (8 opsi) x Paket (Basic, Profesional, Custom) = **24 varian**.
- **Kategori:** Landing Page, Company Profile, Portfolio, Toko Online, Sekolah & Instansi, Web App & Dashboard, Blog & Media, Company Event.
- **Di Shopee:** semua varian berharga **Rp100.000** (jual = coret = Rp100.000).
- **Harga jasa asli (matriks internal, TIDAK diupload):**

| Kategori | Basic | Profesional | Custom |
| --- | --- | --- | --- |
| Landing Page | 350.000 | 750.000 | 1.500.000 |
| Company Profile | 750.000 | 1.500.000 | 3.000.000 |
| Portfolio | 500.000 | 1.000.000 | 2.000.000 |
| Toko Online | 1.500.000 | 2.750.000 | 5.000.000 |
| Sekolah & Instansi | 1.000.000 | 2.000.000 | 4.000.000 |
| Web App & Dashboard | 1.750.000 | 3.500.000 | 6.500.000 |
| Blog & Media | 750.000 | 1.500.000 | 3.000.000 |
| Company Event | 400.000 | 900.000 | 1.800.000 |

- **Harga coret asli** = 2x harga jasa (referensi internal saja). **Tidak diupload** (Shopee coret = Rp100.000). Lihat file produk untuk matriks lengkap + kolom **Jumlah Unit**.

### 6.2 Produk "Jasa Pembuatan Website Portfolio" (`product-2-jasa-pembuatan-website-portfolio.md`)
- **Pecahan** dari produk induk (kategori "Portfolio").
- **1 dimensi varian**, 3 opsi: Basic, Profesional, Custom Enterprise.
- **HARGA NORMAL** (1 dimensi -> bukan unit checkout). **Harga jual & coret:**

| Paket | Harga Jual | Harga Coret (2x) |
| --- | --- | --- |
| Basic | 500.000 | 1.000.000 |
| Profesional | 1.000.000 | 2.000.000 |
| Custom Enterprise | 2.000.000 | 4.000.000 |

- Rasio coret = 4 (lolos). Harga & sistem (bonus, coding custom, source code, dll) sama seperti produk induk.

### 6.3 Produk "Jasa Pembuatan Website Company Profile" (`product-3-jasa-pembuatan-website-company-profile.md`)
- **Pecahan** dari produk induk (kategori "Company Profile").
- **1 dimensi varian**, 3 opsi: Basic, Profesional, Custom Enterprise.
- **HARGA NORMAL** (1 dimensi -> bukan unit checkout). **Harga jual & coret:**

| Paket | Harga Jual | Harga Coret (2x) |
| --- | --- | --- |
| Basic | 750.000 | 1.500.000 |
| Profesional | 1.500.000 | 3.000.000 |
| Custom Enterprise | 3.000.000 | 6.000.000 |

- Rasio coret = 4 (lolos). Harga & sistem sama seperti produk induk.

### 6.4 Produk "Jasa Pembuatan Website Landing Page" (`product-4-jasa-pembuatan-website-landing-page.md`)
- **Pecahan** dari produk induk (kategori "Landing Page").
- **1 dimensi varian**, 3 opsi: Basic, Profesional, Custom.
- **HARGA NORMAL** (1 dimensi -> bukan unit checkout). **Harga jual & coret:**

| Paket | Harga Jual | Harga Coret (2x) |
| --- | --- | --- |
| Basic | 350.000 | 700.000 |
| Profesional | 750.000 | 1.500.000 |
| Custom | 1.500.000 | 3.000.000 |

- Rasio coret = 4,29 (lolos). Harga & sistem sama seperti produk induk.

### 6.5 Produk "Jasa Pembuatan Website Toko Online" (`product-5-jasa-pembuatan-website-toko-online.md`)
- **Pecahan** dari produk induk (kategori "Toko Online").
- **1 dimensi varian**, 3 opsi: Basic, Profesional, Custom.
- **HARGA NORMAL** (1 dimensi -> bukan unit checkout). **Harga jual & coret:**

| Paket | Harga Jual | Harga Coret (2x) |
| --- | --- | --- |
| Basic | 1.500.000 | 3.000.000 |
| Profesional | 2.750.000 | 5.500.000 |
| Custom | 5.000.000 | 10.000.000 |

- Rasio coret = 3,33 (lolos). Harga & sistem sama seperti produk induk.

### 6.6 Produk "Jasa Pembuatan Website Sekolah & Instansi" (`product-6-jasa-pembuatan-website-sekolah-instansi.md`)
- **Pecahan** dari produk induk (kategori "Sekolah & Instansi").
- **1 dimensi varian**, 3 opsi: Basic, Profesional, Custom.
- **HARGA NORMAL** (1 dimensi -> bukan unit checkout). **Harga jual & coret:**

| Paket | Harga Jual | Harga Coret (2x) |
| --- | --- | --- |
| Basic | 1.000.000 | 2.000.000 |
| Profesional | 2.000.000 | 4.000.000 |
| Custom | 4.000.000 | 8.000.000 |

- Rasio coret = 4 (lolos). Harga & sistem sama seperti produk induk.

### 6.7 Produk "Jasa Pembuatan Web App & Dashboard" (`product-7-jasa-pembuatan-web-app-dashboard.md`)
- **Pecahan** dari produk induk (kategori "Web App & Dashboard").
- **1 dimensi varian**, 3 opsi: Basic, Profesional, Custom.
- **HARGA NORMAL** (1 dimensi -> bukan unit checkout). **Harga jual & coret:**

| Paket | Harga Jual | Harga Coret (2x) |
| --- | --- | --- |
| Basic | 1.750.000 | 3.500.000 |
| Profesional | 3.500.000 | 7.000.000 |
| Custom | 6.500.000 | 13.000.000 |

- Rasio coret = 3,71 (lolos). Harga & sistem sama seperti produk induk.

### 6.8 Produk "Jasa Pembuatan Website Blog & Media" (`product-8-jasa-pembuatan-website-blog-media.md`)
- **Pecahan** dari produk induk (kategori "Blog & Media").
- **1 dimensi varian**, 3 opsi: Basic, Profesional, Custom.
- **HARGA NORMAL** (1 dimensi -> bukan unit checkout). **Harga jual & coret:**

| Paket | Harga Jual | Harga Coret (2x) |
| --- | --- | --- |
| Basic | 750.000 | 1.500.000 |
| Profesional | 1.500.000 | 3.000.000 |
| Custom | 3.000.000 | 6.000.000 |

- Rasio coret = 4 (lolos). Harga & sistem sama seperti produk induk.

### 6.9 Produk "Jasa Pembuatan Website Company Event" (`product-9-jasa-pembuatan-website-company-event.md`)
- **Pecahan** dari produk induk (kategori "Company Event").
- **1 dimensi varian**, 3 opsi: Basic, Profesional, Custom.
- **HARGA NORMAL** (1 dimensi -> bukan unit checkout). **Harga jual & coret:**

| Paket | Harga Jual | Harga Coret (2x) |
| --- | --- | --- |
| Basic | 400.000 | 800.000 |
| Profesional | 900.000 | 1.800.000 |
| Custom | 1.800.000 | 3.600.000 |

- Rasio coret = 4,5 (lolos). Harga & sistem sama seperti produk induk.

> **Catatan: seluruh 8 kategori produk induk sudah dipecah** menjadi product-2 s.d. product-9. Produk baru berikutnya bisa kategori/produk lain (mis. aplikasi mobile, template website, redesign/optimasi website) -> **matriks & catatan ditambahkan di sini saat dibuat**.

---

## 7. Standar Kualitas Output

- Bahasa Indonesia, **persuasif tapi jujur**, ejaan rapi (EYD).
- Tanpa jargon berlebihan; mudah dipahami pembeli awam.
- Semua bagian **siap-copy** ke Shopee (jangan setengah jadi).
- Konsisten dengan file produk lain di folder ini (istilah, nada, format).

---

## 8. Checklist Sebelum Menutup Pekerjaan (WAJIB)

- [ ] Sudah membaca berkas `product.md` ini.
- [ ] 1 produk = 1 file `.md`, nama file kebab-case.
- [ ] Struktur file sesuai bagian 3 (tanpa bagian yang dilarang di bagian 3.1).
- [ ] Judul <=120 karakter, **tanpa kata terlarang**, dihitung & dicatat panjangnya.
- [ ] Deskripsi **BEBAS EMOJI** (<=3000 karakter), dihitung & dicatat panjangnya.
- [ ] **Pola harga sesuai jumlah DIMENSI varian:** produk **>=2 dimensi** -> unit checkout; produk **1 dimensi** -> harga normal. (Lihat 4.3 & 6.0.)
- [ ] **Bila unit checkout (>=2 dimensi):** harga tampil Shopee = **Rp100.000** (jual = coret); deskripsi memuat section **"CARA HARGA & CHECKOUT"**; file `.md` memuat matriks internal (harga jasa asli + coret 2x + jumlah unit `ceil(harga/100rb)`).
- [ ] **Bila harga normal (1 dimensi):** tiap varian punya **harga jual asli + harga coret 2x** (jaga rasio <= 7); **tanpa** section unit checkout.
- [ ] Nilai jual wajib LKTech (bagian 5) tercantum.
- [ ] Info bonus domain/hosting, konsultasi gratis, 24 jam, coding custom, source code, revisi terbatas - tercantum (bila relevan).
- [ ] Info penting (dari FAQ) sudah dirangkum di bagian "INFO PENTING" deskripsi.
- [ ] Aturan Shopee dipatuhi (judul, gambar, kepatuhan).
- [ ] Data selaras dengan sumber di website (`src/lib/services.ts`, `src/lib/pricing.ts`).

---

## 9. Riwayat Perubahan Berkas Ini

| Tanggal | Perubahan | Sumber |
| --- | --- | --- |
| 2026-10-06 | Berkas dibuat. Aturan awal: judul <=120 char; deskripsi bebas emoji; harga coret 2x; harga fix; nilai jual wajib LKTech (coding custom, source code, request tech, bonus domain/hosting, konsultasi gratis, 24 jam, revisi terbatas). | Owner |
| 2026-10-06 | Struktur disederhanakan: hapus Keyword, FAQ, Chat, Checklist sebagai bagian file produk. Keyword cukup di judul; info FAQ dirangkum ke "INFO PENTING" deskripsi. | Owner |
| 2026-10-06 | Ditambahkan **aturan rasio harga 7 (Shopee)**: harga termahal/termurah <= 7. Harga coret = 2x harga jual yang di-clamp (lantai 1,9jt / plafon 13jt) -> rasio 6,84. Harga jual tetap. | Owner (temuan saat upload Shopee) |
| 2026-10-06 | Ditambahkan **info konsultasi wajib di deskripsi** ("konsultasi dulu jika ragu, atau langsung checkout jika sudah yakin"). | Owner |
| 2026-10-06 | Ditambahkan **produk ke-2: Jasa Pembuatan Website Portfolio** (pecahan, 1 dimensi 3 paket: Basic/Profesional/Custom Enterprise; harga 500rb/1jt/2jt, coret 2x; rasio 4). Lihat bagian 6.2. | Owner |
| 2026-10-06 | **Konvensi penamaan file**: `product-<nomor>-<slug>.md` (nomor urut pembuatan). File di-rename: `jasa-pembuatan-website-all.md` -> `product-1-jasa-pembuatan-website-all.md`; `jasa-pembuatan-website-portfolio.md` -> `product-2-jasa-pembuatan-website-portfolio.md`. Lihat bagian 3.2. | Owner |
| 2026-10-06 | Ditambahkan **produk ke-3: Jasa Pembuatan Website Company Profile** (pecahan, 1 dimensi 3 paket: Basic/Profesional/Custom Enterprise; harga 750rb/1,5jt/3jt, coret 2x; rasio 4). Lihat bagian 6.3. | Owner |
| 2026-10-06 | **PERUBAHAN BESAR - sistem harga: UNIT CHECKOUT.** Harga tampil di Shopee = **Rp100.000** (satuan unit, jual = coret = Rp100.000; rasio 1). Pembeli **wajib konsultasi** dulu, lalu **checkout N unit** dengan `N = ceil(harga jasa / 100rb)`. Harga jasa asli + harga coret 2x **tetap dicatat di file `.md`** (internal owner) + kolom **jumlah unit**; **tidak diupload** ke Shopee. Varian tetap ada (semua berharga Rp100.000). Ditambahkan bagian **6.0** (alur & aturan) + section wajib **"CARA HARGA & CHECKOUT"** di deskripsi. Semua produk (1, 2, 3) diperbarui. | Owner |
| 2026-10-06 | **REVISI jangkauan unit checkout.** Sistem unit checkout **HANYA untuk produk dengan >= 2 DIMENSI varian** (mis. produk-1: Kategori x Paket). Produk **1 dimensi varian** (product-2 & product-3: hanya Paket) **kembali ke HARGA NORMAL** (harga jual asli + coret 2x, tanpa unit checkout). Kriteria = **jumlah dimensi varian**, bukan jumlah opsi. Bagian 4.3, 4.4, 6.0, 6.2, 6.3, struktur file (§3) & checklist (§8) diperbarui. | Owner (klarifikasi: "yang turunan hanya 1 varian") |
| 2026-10-06 | **REVISI info konsultasi.** Untuk **produk unit checkout**, DILARANG pakai kalimat "bila sudah yakin silakan langsung checkout"; ganti jadi penekanan **konsultasi WAJIB sebelum checkout** (khawatir salah tebak jumlah unit/harga). Produk harga normal tetap pakai kalimat ringkas biasa. §4.2 & deskripsi product-1 diperbarui. | Owner |
| 2026-10-06 | **REVISI gaya bahasa & estimasi pengerjaan.** Ditambahkan aturan **gaya bahasa** (rapi, ramah, profesional, humble/friendly; hindari kata berteriak seperti "DILARANG/WAJIB/JANGAN/HARUS"; heading section boleh tetap KAPITAL, isi kalimat ramah) dan aturan **estimasi pengerjaan ringkas** (1 hari - 1 minggu, tergantung kompleksitas; hapus daftar durasi lama per kategori). Ketiga deskripsi produk diperbarui. | Owner |
| 2026-10-06 | Ditambahkan **produk ke-4: Jasa Pembuatan Website Landing Page** (pecahan, 1 dimensi 3 paket: Basic/Profesional/Custom; harga 350rb/750rb/1,5jt, coret 2x; rasio 4,29; **harga normal**). Lihat bagian 6.4. | Owner |
| 2026-10-06 | Ditambahkan **aturan tagline cover** (§4.6) + sub-bagian **"Opsi Tagline Cover"** (5 opsi) di tiap file produk. Tagline singkat, tanpa kata terlarang/kontak, fokus nilai. Keempat produk diperbarui. | Owner |
| 2026-10-06 | **REVISI bentuk tagline cover.** Dari frasa pendek (5 opsi) menjadi **4 opsi tagline panjang (1 kalimat penuh)** bergaya **ajakan (CTA) / hook pertanyaan**. Hindari kata "gratis" di tagline (pakai "tanpa biaya"). §4.6 & keempat produk diperbarui. | Owner |
| 2026-10-06 | **REVISI tagline cover (final).** Sediakan **6 opsi: 3 SEDANG (1 baris) + 3 PANJANG (1 kalimat CTA/hook)** per produk, tabel berkolom Panjang/Tagline. Owner bebas pilih sesuai selera. §4.6 & keempat produk diperbarui. | Owner |
| 2026-10-06 | Ditambahkan **produk ke-5: Jasa Pembuatan Website Toko Online** (pecahan, 1 dimensi 3 paket: Basic/Profesional/Custom; harga 1,5jt/2,75jt/5jt, coret 2x; rasio 3,33; **harga normal**; 6 opsi tagline). Lihat bagian 6.5. | Owner |
| 2026-10-06 | Ditambahkan **produk ke-6: Jasa Pembuatan Website Sekolah & Instansi** (pecahan, 1 dimensi 3 paket: Basic/Profesional/Custom; harga 1jt/2jt/4jt, coret 2x; rasio 4; **harga normal**; 6 opsi tagline). Lihat bagian 6.6. | Owner |
| 2026-10-06 | Ditambahkan **produk ke-7: Jasa Pembuatan Web App & Dashboard** (pecahan, 1 dimensi 3 paket: Basic/Profesional/Custom; harga 1,75jt/3,5jt/6,5jt, coret 2x; rasio 3,71; **harga normal**; 6 opsi tagline). Lihat bagian 6.7. | Owner |
| 2026-10-06 | Ditambahkan **produk ke-8: Jasa Pembuatan Website Blog & Media** (pecahan, 1 dimensi 3 paket; harga 750rb/1,5jt/3jt, coret 2x; rasio 4; **harga normal**; 6 opsi tagline). Lihat bagian 6.8. | Owner |
| 2026-10-06 | Ditambahkan **produk ke-9: Jasa Pembuatan Website Company Event** (pecahan, 1 dimensi 3 paket; harga 400rb/900rb/1,8jt, coret 2x; rasio 4,5; **harga normal**; 6 opsi tagline). **Seluruh 8 kategori produk induk kini sudah dipecah (product-2 s.d. product-9).** Lihat bagian 6.9. | Owner |
| 2026-10-06 | Ditambahkan berkas **`product-slide-8-9-universal.md`** (konten **Slide 8**: Cara Pemesanan + Data Dibutuhkan; **Slide 9**: Yang Didapatkan + Keunggulan; 2 versi: multivarian & single-varian, teks ringkas). Ditambahkan aturan **§4.7** + referensi di struktur file (§3). | Owner |

<!-- Tambahkan baris baru setiap ada update aturan dari owner. -->

---

*Berkas ini milik owner LKTech. AI wajib mengikuti aturan di dalamnya saat membuat/mengubah produk Shopee.*
