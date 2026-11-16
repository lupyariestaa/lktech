# Planning Tool WebP ke PNG, JPG, GIF, BMP, dan AVIF

> **Status:** Implementasi selesai; build, pemeriksaan statis, tes terkait, suite Auth E2E Chromium (15/15), CI GitHub Actions, dan deploy Vercel hijau. Tool tampil di `https://lktech.vercel.app/tools`. QA lintas browser dan audit tambahan masih tertunda.
> **Disusun:** 2026-11-16
> **Cakupan:** Tool baru di LKTech Tools untuk mengubah satu berkas WebP lokal menjadi PNG, JPG, GIF, BMP, atau AVIF.
> **Prinsip utama:** konversi lokal di browser, format hasil harus benar-benar terverifikasi, dan tidak boleh mengubah gambar secara diam-diam.

Dokumen ini awalnya disusun sebagai planning tool yang melengkapi **Gambar ke WebP**. Implementasi dan status verifikasi aktual dicatat pada bagian **Status implementasi dan QA aktual**; tabel dan fase di bawah menjadi spesifikasi serta riwayat keputusan, bukan pernyataan bahwa pekerjaan belum dimulai.

## Status implementasi dan QA aktual

### Perilaku yang diimplementasikan

- Tool `webp-to-image` tersedia di workspace, katalog, navigasi, dan panduan publik.
- Menerima satu WebP statis hingga 15 MB, 8 megapiksel, dan sisi terpanjang 8192 px. Tidak ada resize otomatis; WebP animasi ditolak dengan alasan eksplisit.
- Seluruh decode/encode berjalan di browser. PNG/JPG memakai Canvas, GIF memakai `gifenc`, BMP memakai encoder 24-bit lokal, dan AVIF memakai `@jsquash/avif` yang lazy-loaded dengan aset WASM/worker self-hosted.
- Satu format per konversi. JPG/BMP diratakan ke putih; GIF satu frame dan maksimal 256 warna. Hasil dicek MIME serta signature sebelum tersedia untuk unduhan.
- UI menampilkan preview, status aksesibel, metadata ukuran/dimensi, unduhan, dan cleanup object URL/canvas sesuai lifecycle.

### Verifikasi yang benar-benar dijalankan

| Pemeriksaan | Hasil |
|---|---|
| `npm run build` (Next.js production/Webpack) | Lulus setelah koreksi import GIF; route workspace dan panduan `webp-to-image` ter-generate statis. Ada warning circular chunk Webpack yang tidak terkait fitur. |
| `npx tsc --noEmit` dan `npm run lint` | Lulus setelah koreksi import GIF. |
| Tes WebP pure, registry, dashboard wiring, discovery, dan pages | Lulus. Tes WebP pure juga lulus setelah koreksi import GIF. |
| E2E Auth Emulator, Chromium, konversi PNG/JPG/GIF/BMP/AVIF dan nama file | Lulus. Tes membuat WebP kecil di browser dan melewati kelima encoder termasuk AVIF WASM self-hosted. |
| Suite Auth E2E lengkap | Lulus: 15/15 test pada Chromium melalui Firebase Auth Emulator, termasuk konversi kelima format. |
| CI GitHub Actions (`Lint · Typecheck · Test · Build`) dan deploy Vercel | Hijau pada commit `d1de599`. Sebelumnya gagal karena `scripts/wedding-invitation.test.ts` menghasilkan TS2578/TS5097; diperbaiki pada commit `3421948`. Satu test E2E publik yang rentan terhadap duplikasi H1 saat hidrasi dibuat lebih tahan pada commit `d1de599`. |
| Browser selain Chromium, perangkat mobile, inspeksi network/manual screen reader, audit dependency | Belum diverifikasi. |

### Batasan dan risiko tersisa

- E2E membuktikan alur Chromium dan unduhan bernama benar, tetapi belum merupakan pengujian matriks lintas browser atau pemeriksaan independen kualitas/alpha output.
- Build sebelumnya melaporkan circular dependency Webpack; bukan kegagalan build, namun tetap perlu ditinjau terpisah bila bundle menjadi perhatian.
- Instalasi dependency melaporkan 34 vulnerabilities; baseline sebelum penambahan dependency tidak diketahui dan perlu audit terpisah.
- Beberapa navigasi client dalam suite E2E mencatat log server `NoFallbackError`, meski test terkait tetap lulus; belum ditriase dan perlu ditinjau terpisah.
- Deploy produksi sempat gagal pada commit `35a0bc5` karena typecheck CI; setelah diperbaiki, `https://lktech.vercel.app/tools` memuat tool baru. Domain kustom `lktech.id` tidak terselesaikan (NXDOMAIN) dari resolver publik; produksi saat ini diakses lewat `lktech.vercel.app`.

---

---

## 1. Ringkasan eksekutif

Pengguna dapat memilih satu berkas `.webp`, memilih salah satu format keluaran (**PNG, JPG, GIF, BMP, AVIF**), melihat pratinjau dan ringkasan hasil, kemudian mengunduhnya. Seluruh proses direncanakan berlangsung di browser tanpa upload, API baru, penyimpanan file, atau pencatatan isi gambar.

Ada perbedaan dukungan encoder yang perlu dihormati:

- PNG dan JPEG umumnya tersedia melalui Canvas pada browser modern.
- GIF dan BMP umumnya tidak tersedia sebagai output Canvas standar; perlu encoder lokal khusus.
- Encoder AVIF tidak seragam antarbrowser; solusi harus diuji dan mungkin memerlukan codec WebAssembly yang dimuat hanya saat dipilih.
- WebP dapat berisi animasi. Mengubahnya melalui satu frame Canvas tanpa pemberitahuan akan membuang frame lain.

### Rekomendasi keputusan produk untuk v1

1. Satu WebP dan satu format keluaran per proses; bukan batch.
2. V1 menerima **WebP statis**. WebP animasi dideteksi dan ditolak dengan pesan yang jelas; tidak boleh diam-diam hanya mengambil frame pertama.
3. Pertahankan dimensi gambar. Tidak ada resize otomatis. Berkas yang melewati batas pixel/dimensi ditolak dan diberi alasan; opsi resize dapat direncanakan terpisah.
4. PNG/AVIF mempertahankan transparansi bila codec hasil mendukungnya. JPG dan BMP 24-bit tidak mendukung alpha; transparansi diratakan ke warna latar, default putih.
5. GIF v1 berupa GIF statis satu frame, maksimal 256 warna, dengan transparansi sederhana bila memungkinkan. Mengubah WebP animasi menjadi GIF animasi bukan bagian v1.
6. Semua encoder harus dijalankan lokal. Library/codec hanya dipilih setelah spike ukuran, lisensi, kompatibilitas, keamanan, dan kualitas hasil.

Poin-poin ini adalah rekomendasi perencanaan, bukan implementasi atau keputusan final yang sudah diterapkan.

---

## 2. Tujuan, pengguna, dan ukuran keberhasilan

### Tujuan

- Membantu pengguna membuka atau menggunakan ulang gambar WebP pada alur kerja yang memerlukan PNG, JPG, GIF, BMP, atau AVIF.
- Menyediakan output yang benar-benar sesuai format yang dipilih, bukan sekadar mengganti ekstensi nama file.
- Menjaga pengalaman, privasi, responsivitas, aksesibilitas, dan pola error tetap konsisten dengan tool gambar LKTech lainnya.
- Memanfaatkan workspace LKTech Tools dan katalog/panduan yang sudah ada tanpa membuat route atau shell khusus.

### Bukan tujuan v1

- Konversi banyak file sekaligus, arsip ZIP, URL remote, atau drag-and-drop banyak hasil.
- Penyuntingan gambar, crop, rotasi, watermark, metadata editor, atau pengaturan warna lanjutan.
- Mengubah WebP animasi menjadi GIF animasi.
- Upload/server conversion, database riwayat, sinkronisasi hasil, atau AI.
- Menjanjikan semua format dapat diproses pada semua browser/perangkat tanpa capability test.

### Indikator yang disarankan

- Tool dapat dibuka dari katalog, tautan langsung, daftar sidebar, kartu rekomendasi, dan panduan.
- Konversi valid menghasilkan signature/MIME format yang benar dan file yang dapat dibuka kembali.
- Format yang tidak dapat di-encode pada browser/perangkat tidak menghasilkan file palsu; pengguna menerima penjelasan dan pilihan format alternatif.
- Tidak ada nama file, byte gambar, preview URL, atau isi gambar yang dikirim ke server atau masuk analytics.
- Kegagalan resource/decoder tidak membuat UI macet dan dapat dipulihkan melalui reset.

Tidak perlu menambahkan analytics konversi pada rilis pertama. Analytics `tools_tool_open` yang sudah ada cukup untuk mengukur pembukaan workspace; jangan mengirim nama file, ukuran spesifik file, atau data gambar.

---

## 3. Temuan repo yang relevan

| Area | Temuan | Implikasi rencana |
|---|---|---|
| Tool gambar | `src/components/tools/image-to-webp-tool.tsx` sudah menangani input lokal, validasi, decode, Canvas, preview, download, reset, dan pelepasan object URL. | Gunakan pola UX/resource lifecycle, tetapi jangan menduplikasi secara membabi buta fungsi konversi satu-formatnya. |
| Helper browser | `src/lib/tools/image-client.ts` menyediakan `decodeImageFile`, `createCanvas`, `canvasToBlob`, serta `canEncodeImageType`. | Dapat menjadi fondasi PNG/JPEG dan input decode; output type tetap wajib diverifikasi. |
| Helper murni | `src/lib/tools/image-tool-pure.ts` punya limit gambar 15 MB, format nama, validasi, dan ukuran. | Evaluasi penggunaan ulang; tambahkan helper/konstanta khusus tanpa mengubah perilaku tool lama secara tidak sengaja. |
| Format input yang diterima helper umum | Sudah mencakup PNG, JPEG, WebP, GIF, BMP, dan AVIF. | Tool baru tetap perlu membatasi input hanya WebP; jangan memakai `IMAGE_ACCEPT_ATTR` umum tanpa filter. |
| Registry | `src/lib/tools-registry-pure.ts` adalah sumber metadata tool dan slug; tool tersedia masuk ke halaman statis dan kartu. | Tambahkan satu metadata tool dengan slug yang konsisten dan update tes asumsi jumlah kategori/slug. |
| Workspace | `src/components/tools/tool-workspace.tsx` memetakan slug ke komponen body. | Tambahkan satu pemetaan; header workspace berasal dari `ToolShell` dan tetap tanpa cover kartu. |
| Katalog | `/tools/ruang`, landing publik, discovery, sidebar dan shortcut menggunakan registry. | Status `tersedia` akan menampilkan tool di seluruh permukaan katalog; pastikan metadata panduan juga lengkap. |
| Panduan | `src/lib/tools-guides-pure.ts` berisi panduan unik per tool; tes mensyaratkan setiap tool tersedia punya panduan lengkap. | Tambahkan panduan publik dengan langkah, kasus penggunaan dan FAQ yang sesuai kemampuan aktual. |
| Tes gambar | `scripts/tools-image.test.ts` menguji helper gambar yang sudah ada. | Tambahkan tes murni bagi validasi WebP, deteksi animasi, target format, nama, serta keputusan transparansi. |
| Build Next.js | Proyek menggunakan Next.js 16.3.6 dan build Webpack. | Jika codec memakai WASM/dynamic import, verifikasi panduan lokal Next.js serta perilaku bundler aktual sebelum implementasi. |

Temuan ini berasal dari struktur repo saat planning; detail API/library tetap harus diverifikasi pada spike implementasi.

---

## 4. Identitas produk dan navigasi yang direncanakan

| Properti | Rekomendasi |
|---|---|
| Nama kartu | **WebP ke Gambar** |
| Judul workspace | **WebP ke PNG, JPG, GIF, BMP, atau AVIF** (copy final dapat dipersingkat agar mudah dibaca) |
| Slug | `webp-to-image` |
| Workspace | `/tools/webp-to-image` |
| Panduan publik | `/tools/panduan/webp-to-image` |
| Kategori | `gambar` |
| Ikon | Ikon konversi gambar yang tersedia di `tool-icon.tsx`, atau ikon Lucide setara yang dipetakan secara eksplisit |
| Lokal | `true` hanya setelah seluruh encoder yang dirilis terbukti berjalan tanpa upload |
| Format metadata | Dari `WebP` ke `PNG, JPG, GIF, BMP, AVIF` |
| Batas awal yang diusulkan | Maks. 15 MB per file; batas pixel/dimensi harus difinalkan sebelum implementasi |
| Related | `image-to-webp`, `pdf-to-image`, `image-to-pdf` (pilih paling relevan dan pastikan semuanya slug tersedia) |

Nama kartu harus menjelaskan arah konversi. Hindari nama “Image Webp to …” yang bercampur bahasa; copy antarmuka mengikuti bahasa Indonesia yang sudah dipakai katalog.

---

## 5. Spesifikasi produk dan perilaku konversi

### 5.1 Alur utama

1. Pengguna membuka **WebP ke Gambar** dari katalog atau URL workspace.
2. Tool menampilkan dropzone dengan tombol pilih file; accept hanya `.webp` dan `image/webp`.
3. Pengguna memilih satu file. Validasi awal memeriksa ukuran dan signature/container, bukan ekstensi saja.
4. Tool membaca header WebP, memeriksa apakah input animasi, mendekode gambar, memeriksa dimensi/pixel, lalu menampilkan nama, ukuran, dimensi, dan preview.
5. Pengguna memilih format output. Pengaturan yang relevan saja ditampilkan untuk format aktif.
6. Pengguna menjalankan konversi. Tombol dinonaktifkan saat proses; status diumumkan untuk pembaca layar.
7. Tool membuat Blob, memverifikasi MIME dan signature hasil, menampilkan preview dan ukuran hasil, kemudian menyediakan tombol unduh.
8. Pengguna bisa mengunduh, mengganti input, mengubah format dan konversi ulang, atau mulai lagi. Object URL, canvas, bitmap, buffer dan encoder sementara dilepas saat tidak lagi diperlukan.

### 5.2 Matriks format hasil

| Pilihan | MIME/ekstensi yang diharapkan | Alpha/transparansi | Kualitas/kompresi | Catatan perilaku v1 |
|---|---|---|---|---|
| PNG | `image/png` / `.png` | Dipertahankan | Lossless; tanpa slider kualitas | Pilihan default yang baik jika transparansi/ketajaman penting. |
| JPG | `image/jpeg` / `.jpg` | Tidak mendukung alpha; flatten ke latar putih | Slider kualitas; rekomendasi awal 0,90 | Tampilkan catatan bahwa transparansi akan menjadi warna latar. Opsi ubah warna latar dapat dipertimbangkan setelah v1. |
| GIF | `image/gif` / `.gif` | Transparansi terbatas/palet 1-bit | Palet paling banyak 256 warna; tidak ada slider kualitas umum | Sumber statis menghasilkan GIF statis satu frame. Jelaskan keterbatasan warna; opsi dithering bukan syarat v1. |
| BMP | `image/bmp` atau MIME alternatif encoder yang diverifikasi / `.bmp` | Rekomendasi output 24-bit tanpa alpha; flatten ke latar putih | Umumnya bitmap tanpa kompresi | Berkas dapat jauh lebih besar dari WebP; tampilkan ukuran hasil dan jangan menjanjikan kompresi. Verifikasi signature BMP (`BM`). |
| AVIF | `image/avif` / `.avif` | Dipertahankan bila encoder mendukung | Slider kualitas bila codec terpilih mendukung; rekomendasi awal 0,80 | Encoder harus lokal dan diuji terpisah; jangan mengklaim dukungan hanya dari kemampuan decode AVIF. |

**Verifikasi wajib:** `canvas.toBlob()` dapat mengembalikan PNG fallback saat format yang diminta tidak didukung. Karena itu tidak boleh menyimpan Blob dengan ekstensi format yang dipilih sebelum `blob.type` serta signature aktual cocok dengan output yang diminta.

### 5.3 Transparansi dan warna

- PNG: pertahankan alpha dari sumber.
- AVIF: pertahankan alpha hanya jika encoder lokal yang dipilih benar-benar mendukungnya dan tes visual lulus.
- JPG/BMP: gunakan background putih sebagai default agar piksel transparan tidak menjadi hitam secara tidak sengaja. Copy harus menyebutkan hasil diratakan ke background.
- GIF: jelaskan bahwa GIF menggunakan transparansi biner dan palet terbatas; tepi semi-transparan dapat tampak berbeda.
- Proses decode/encode mungkin mengubah profil warna atau membuang metadata. Jangan menjanjikan kesetaraan byte/piksel sempurna; uji tampilan dan dokumentasikan metadata yang tidak dipertahankan.

### 5.4 Input WebP statis dan animasi

- V1 sebaiknya hanya mendukung satu frame.
- Periksa container RIFF/WebP dan indikator animasi/chunk terkait dengan parser yang teruji (contoh: feature animation pada VP8X serta chunk `ANIM`/`ANMF`); jangan mengandalkan hasil kebetulan dari `createImageBitmap`.
- Bila animasi terdeteksi, berhenti sebelum konversi dan jelaskan bahwa v1 hanya menerima WebP statis. Jangan mengeluarkan gambar frame pertama tanpa konfirmasi.
- Parser chunk harus memeriksa panjang file, offset, ukuran chunk, padding dan overflow; input malformed/terpotong ditolak secara aman.
- Jika deteksi animasi tidak dapat dibuat cukup kuat dalam spike, tandai rilis sebagai terblokir untuk perilaku animasi dan jangan menyembunyikan ketidakpastian di UI.

---

## 6. UX, state, dan aksesibilitas

### Layout yang disarankan

- Header dan ruang konten memakai `ToolShell` serta sidebar dashboard yang sudah ada.
- Area file terpilih menampilkan nama file terpotong dengan aman, ukuran, tipe hasil decode, dimensi, dan tombol ganti/reset.
- Format keluaran ditampilkan sebagai pilihan yang jelas—radio cards atau segmented control yang dapat dipakai keyboard. Format aktif memiliki label teks, tidak hanya warna.
- Setting berubah sesuai format: JPG/AVIF menampilkan kualitas; JPG/BMP menampilkan latar putih/alpha flatten notice; GIF menampilkan keterbatasan palet.
- Hasil menunjukkan status berhasil, dimensi, ukuran output, dan indikasi perubahan ukuran file. Jangan menyebut “kompresi” atau “lebih kecil” jika hasil lebih besar.
- Tombol unduh menggunakan nama file yang disanitasi, misalnya `foto-liburan.jpg`; jangan menyisipkan HTML atau path yang berasal dari nama input.

### State minimum

| State | Perilaku |
|---|---|
| Empty | Dropzone, format yang didukung, ukuran maksimum, privasi lokal, tombol pilih file. |
| Reading/decoding | Status jelas; blokir pemilihan ulang/aksi ganda bila perlu. Jika decode asynchronous, sediakan pembatalan hanya bila aman dan dapat menghentikan kerja sebenarnya. |
| Ready | Preview, detail file, pilihan format, pengaturan relevan, CTA konversi. |
| Converting | CTA disabled, indikator proses dan `aria-live` status. Jangan mengklaim progres persentase jika encoder tidak memberi progres. |
| Success | Preview hasil yang benar, MIME/format, ukuran/dimensi, unduh, konversi format lain, reset. |
| Unsupported encoder | Beri tahu format yang gagal di browser/perangkat; pertahankan input; tawarkan PNG/JPG atau format lain yang capability check-nya lulus. |
| Invalid input | Berkas bukan WebP, signature salah, ukuran 0, terlalu besar, malformed atau animasi tidak didukung; alasan spesifik dan aksi perbaikan. |
| Too many pixels/dimensions | Tolak sebelum membuat canvas besar; jelaskan batas dan bahwa gambar tidak di-resize diam-diam. |
| Out of memory/encode error | Error singkat tanpa stack/internal detail; resource dibersihkan; pengguna dapat mencoba format lebih ringan atau file lebih kecil. |
| Reset | Membersihkan file, state, error, Blob URL, preview, canvas/bitmap dan input element supaya memilih file yang sama lagi tetap memicu perubahan. |

### Aksesibilitas

- Gunakan label eksplisit untuk input file, pemilih format, slider, dan warna latar bila ada.
- Semua operasi tersedia dengan keyboard; fokus dan focus-visible mengikuti komponen LKTech.
- Umumkan proses, sukses, dan error melalui region status/alert tanpa mengumumkan detail file sensitif yang tidak diperlukan.
- Kontras preview checkerboard/area alpha cukup; informasi tidak hanya memakai warna.
- Preview memiliki alt text generik (contoh “Pratinjau gambar WebP”), bukan nama file mentah.
- Hormati `prefers-reduced-motion`; hindari animasi panjang untuk state konversi.

---

## 7. Arsitektur teknis yang direncanakan

### 7.1 Prinsip implementasi

1. Proses input dan output tetap di browser. Tidak menambah route API, unggah Cloudinary, Firebase Storage, atau endpoint konversi.
2. Gunakan decoder gambar browser yang sudah ada jika hasilnya kompatibel; tambah helper hanya bila perlu untuk signature/animasi/validasi.
3. Pisahkan helper murni (signature, parsing container, batas, ekstensi/nama, format, kebijakan) dari kode DOM/canvas/codec.
4. Gunakan adapter encoder berdasarkan target format. Adapter harus mengembalikan Blob yang diverifikasi dan error yang dapat dipahami.
5. Muat kode/library berat hanya ketika format terkait dipilih (dynamic import/lazy load yang benar-benar mengurangi bundle awal).
6. Jangan menjalankan codec bersamaan secara paralel untuk satu gambar jika itu menggandakan buffer/canvas dan meningkatkan risiko memori.
7. Batasi referensi resource: tutup `ImageBitmap`, revoke object URL, kosongkan canvas bila aman, dan hindari menyimpan Data URL/base64 besar dalam state React.
8. Capability check dilakukan untuk encoder aktual. Jika memakai codec WASM, tes runtime wasm/CSP, worker, bundler, fallback dan browser yang disasar.

### 7.2 Spike encoder sebelum implementasi fitur

Sebelum memilih dependensi atau menulis UI penuh, buat spike terukur untuk target **PNG, JPG, GIF, BMP, AVIF**:

- Uji Canvas native untuk PNG/JPEG dan AVIF pada browser target; cek MIME Blob dan magic bytes, bukan hanya `toDataURL()`.
- Uji kandidat encoder lokal untuk GIF/BMP/AVIF; verifikasi versi aktif, API, maintenance, dependency transitif, keamanan, lisensi, ukuran gzip/uncompressed dan kualitas output.
- Untuk GIF, ukur quantization/palette, transparansi, warna gradient, dithering, dan konsumsi memori.
- Untuk BMP, verifikasi apakah output 24-bit dibutuhkan, orientasi/row padding dan magic header.
- Untuk AVIF, uji alpha, kualitas pada tekstur/foto, runtime WASM, CSP, dynamic import, worker dan waktu cold start.
- Uji hasil dengan decoder independen (browser/fixture) dan minimal file alpha, opaque, resolusi kecil, resolusi besar yang diizinkan, dan WebP malformed.
- Catat hasil spike di dokumen ini sebelum menandai implementasi siap.

Tidak ada library codec tertentu yang dikunci dalam planning ini. Pemilihan dependensi harus berdasarkan spike dan kebijakan lisensi repo, bukan asumsi bahwa semua format tersedia di browser.

### 7.3 Validasi input dan batas resource

Rekomendasi batas awal untuk dibahas saat spike:

| Batas | Rekomendasi awal | Alasan |
|---|---:|---|
| Ukuran file terkompresi | Maks. 15 MB | Konsisten dengan tool gambar LKTech yang sudah ada; tetap bukan pengganti batas decoded pixels. |
| Jumlah file | 1 | Menghindari batch dan puncak memori gabungan pada rilis awal. |
| Dimensi sisi | Maks. 8192 px (usulan) | Membatasi canvas ekstrem, termasuk gambar sangat panjang/narrow. |
| Jumlah pixel | Maks. 16 megapixel (usulan) | Mengendalikan buffer RGBA dan lonjakan memori pada perangkat mobile; wajib diukur ulang pada spike. |
| Output paralel | 1 | Format diubah satu per satu, bukan membuat lima hasil bersamaan. |

Angka dimensi/pixel di atas adalah **usulan awal**, belum merupakan batas produk yang sudah disetujui. Sebelum implementasi, ukur setidaknya perangkat desktop dan mobile kelas menengah. Validasi pixel dilakukan sesudah header/dimensi decode diketahui tetapi sebelum alokasi canvas/encoder besar. Hindari integer overflow dengan validasi finite, integer positif, batas per sisi, lalu perkalian dimensi.

Validasi input setidaknya:

- File tidak kosong dan ukuran <= batas.
- Ekstensi/MIME boleh membantu pemilih file, tetapi identitas WebP diverifikasi dari byte `RIFF` dan `WEBP` pada offset yang tepat serta panjang container yang masuk akal.
- Jangan percaya `file.type` saja; MIME dapat kosong atau palsu.
- Container/chunk malformed, panjang tidak konsisten, decode error, dimensi nol/tidak masuk akal, atau melebihi batas ditolak sebelum proses mahal.
- Deteksi animasi dilakukan sebelum mengambil jalur satu-frame.

### 7.4 Strategi encoder dan fallback

- Bentuk kontrak target terpusat, misalnya `png | jpeg | gif | bmp | avif`, dengan ekstensi/MIME/label/setting yang tidak ditentukan dari string bebas pengguna.
- Encoder mengembalikan `{ blob, mimeType, extension, width, height }` atau typed error. Hasil tidak masuk state/download sampai validasi MIME dan signature lulus.
- Capability UI mencerminkan encoder yang benar-benar bisa dijalankan. Bila codec AVIF belum termuat, tampilkan status memuat; bila gagal, jangan tampilkan pilihan seolah siap.
- Jangan fallback diam-diam dari AVIF/GIF/BMP ke PNG/JPEG sambil tetap mengunduh ekstensi format awal.
- Error codec harus memuat aksi selanjutnya: coba ulang, pilih format yang tersedia, atau gunakan gambar lebih kecil.
- Jika ada fallback Canvas, fallback hanya boleh menuju target yang sama dan diverifikasi; selain itu gagalkan secara eksplisit.

### 7.5 Metadata, privacy, dan observability

- Re-encode melalui Canvas/codec dapat membuang EXIF/XMP dan metadata lain; jelaskan ini di FAQ/panduan bila terkonfirmasi dari spike.
- Tidak mengirim file, preview, base64, nama file, hash konten, atau teks error yang memuat path ke analytics/log server.
- Jangan persist input/output di localStorage/IndexedDB. Pilihan UI boleh disimpan lokal hanya jika benar-benar membantu dan tidak diperlukan untuk v1.
- Tidak ada perubahan auth; route workspace tetap mengikuti `UserGuard`/layout tools yang ada, sedangkan panduan publik tetap tidak memuat file.
- Untuk error operasional, cukup event/status agregat tanpa konten dan tanpa identitas file; idealnya tidak menambah instrumentasi baru di v1.

---

## 8. Kandidat file implementasi (belum diubah)

| File | Perubahan yang direncanakan |
|---|---|
| `src/lib/tools-registry-pure.ts` | Tambahkan metadata `webp-to-image`, related tools, ringkasan, format, limit dan keyword. Ubah deskripsi/format `image-to-webp` hanya bila ada kesalahan aktual; hindari scope creep. |
| `src/components/tools/tool-workspace.tsx` | Import dan petakan `webp-to-image` ke komponen baru. |
| `src/components/tools/webp-to-image-tool.tsx` | UI state, pilihan format, kontrol yang sesuai, preview, download, error dan reset. |
| `src/lib/tools/webp-conversion-pure.ts` (nama usulan) | Signature WebP, parser RIFF/chunk dan animasi, kebijakan target/validasi/nama; tanpa DOM. Evaluasi apakah helper umum lebih tepat diperluas. |
| `src/lib/tools/image-client.ts` atau adapter terpisah | Decode/Canvas/capability atau wrapper codec bila reuse aman. Jangan membuat `image-client` menjadi gudang dependensi format tanpa batas. |
| `src/lib/tools-guides-pure.ts` | Tambah panduan unik untuk slug baru; akurasi format/limit harus cocok dengan UI final. Perbarui tanggal editorial panduan. |
| `src/components/tools/tool-icon.tsx` | Tambahkan pemetaan ikon hanya jika ikon pilihan belum dipetakan. |
| `scripts/tools-webp-conversion.test.ts` (nama usulan) | Tes pure parser, signature, animasi, MIME/target mapping, validasi dan limit. |
| `scripts/tools-pages.test.ts` / `scripts/tools-registry.test.ts` | Perbarui assertion yang mengunci daftar/count kategori; pastikan tool tersedia punya panduan dan slug. |
| `scripts/tools-dashboard-wiring.test.ts` | Tambah pemeriksaan wiring komponen dan mapping bila test wiring UI dipertahankan sebagai pola. |
| `e2e/auth/tools-dashboard.spec.ts` atau spec tools terkait | Tambahkan smoke flow lewat login emulator untuk tool baru; jangan membuat shortcut login produksi. |
| `package.json` | Tambahkan script test khusus dan dependency hanya bila hasil spike membuktikan perlu. |

Route workspace dinamis/statis harus tetap bersumber dari registry dan test `generateStaticParams`; jangan menambahkan route khusus di luar pola tool saat ini.

---

## 9. Rencana fase implementasi

### F0 — Konfirmasi keputusan produk

- Konfirmasi nama tool dan pilihan satu format per proses.
- Putuskan kebijakan WebP animasi (rekomendasi: tolak pada v1).
- Putuskan apakah GIF statis satu frame memenuhi ekspektasi pengguna.
- Konfirmasi batas 15 MB dan pilih dimensi/pixel cap setelah spike mobile.
- Konfirmasi transparansi JPG/BMP (rekomendasi: putih), alpha GIF/AVIF, dan kualitas default.

### F1 — Spike kompatibilitas/codec

- Buat fixture WebP valid: alpha, opaque, ukuran kecil, ukuran dekat batas, serta WebP animasi dan malformed.
- Uji decode WebP dan deteksi animasi di browser target.
- Uji semua encoder, format/MIME/signature, alpha, kualitas, output dimensions, error, runtime dan waktu cold start.
- Evaluasi ukuran bundle, dynamic import, lisensi, CSP/WASM dan maintenance.
- Tetapkan browser minimum dan strategi disable/fallback per format.
- Catat keputusan dan angka limit yang disetujui sebelum melanjutkan.

### F2 — Logika murni dan test

- Buat helper murni untuk memvalidasi RIFF/WebP dan mendeteksi animasi.
- Uji offset/chunk/padding, panjang invalid, file terpotong, byte overflow dan input adversarial.
- Definisikan tipe target dan pemetaan label, ekstensi, MIME, capability, quality/transparency policy.
- Tambahkan pure tests yang deterministik tanpa browser/API jaringan.

### F3 — Adapter konversi browser

- Implementasikan satu jalur per format dengan lazy load untuk encoder berat.
- Pertahankan ukuran asli dan reject jika batas decoded pixels dilampaui.
- Verifikasi output MIME dan magic bytes; uji buka kembali hasil melalui decoder independen.
- Terapkan cleanup resource pada success, error, ganti file, unmount dan reset.
- Pastikan memilih format berulang tidak menyisakan Blob URL atau buffer sebelumnya.

### F4 — Workspace dan discovery

- Buat komponen UI berdasarkan pola Image to WebP tanpa mengorbankan semantik error khusus format.
- Tambahkan tool ke registry dan workspace dispatch.
- Tambahkan panduan publik, ikon mapping jika perlu, FAQ privasi/animasi/alpha/ukuran.
- Pastikan muncul di kartu katalog/dashboard, filter pencarian, sidebar collapse/full, shortcut terkait dan landing showcase sesuai aturan yang ada.
- Pastikan judul cover hanya milik kartu; workspace memakai `ToolShell` biasa.

### F5 — QA dan rilis

- Jalankan unit test pure, tests registry/pages/dashboard, TypeScript, lint dan production build Webpack.
- Jalankan E2E melalui Firebase Auth Emulator UI dengan login flow yang berlaku.
- Tes manual desktop/mobile pada browser target; uji canvas memory dan waktu encode untuk tiap format.
- Uji keyboard/screen reader, reduced motion, storage diblokir, slow codec load dan error fallback.
- Periksa bundle diff, dependency/license, CSP, tidak ada request berisi file, serta network panel saat proses.
- Perbarui dokumen ini dengan keputusan F0/F1, file aktual, batas final, hasil pengujian, dan status rilis.

---

## 10. Strategi pengujian

### Unit/pure tests

- WebP signature benar dan salah; RIFF panjang cocok/tidak cocok; MIME palsu atau kosong.
- Chunk length ganjil/padding, chunk tak dikenal yang valid, chunk malformed, truncation dan nilai ekstrem.
- Deteksi WebP animasi (VP8X/ANIM/ANMF) dan statis; input animasi tidak melanjutkan ke encode.
- Format target memetakan ekstensi/MIME/label yang tepat; ekstensi output tidak dapat disuntikkan.
- Sanitasi nama termasuk karakter path, Unicode, spasi, ekstensi berulang, nama kosong dan nama panjang.
- Ukuran, dimensi per sisi, pixel count, finite/overflow, file kosong, dan batas tepat pada ambang.
- Kebijakan transparansi per output, nilai quality dan default, bila helper pure disiapkan.

### Browser/component tests

- PNG/JPG encoder dan masing-masing adapter menghasilkan tipe benar; unsupported format ditangani tanpa fallback palsu.
- Alpha PNG/AVIF tetap transparan bila didukung; JPG/BMP flatten sesuai pilihan/default; GIF alpha diperlakukan sesuai spesifikasi.
- File output dibuka kembali; uji signature output (`89 50 4E 47`, JPEG marker, `GIF87a/GIF89a`, `BM`, dan `ftypavif`/signature AVIF yang valid berdasarkan encoder).
- Reset/ganti file membebaskan semua object URL/bitmap dan tombol memilih ulang file yang sama tetap bekerja.
- Error decode/encode/WASM/network-free codec tidak mengunci UI.
- Keyboard: pilih format, set kualitas, konversi, unduh, reset; status diumumkan tanpa info sensitif.

### E2E dan QA lintas browser

- Login dilakukan melalui Auth Emulator UI sebagaimana suite tools, bukan state injection/shortcut ke auth produksi.
- Buka `/tools/webp-to-image`, unggah fixture WebP, pilih format yang capability-nya tersedia, konversi, cek success dan nama download.
- Format unsupported/animasi ditampilkan dengan pesan yang sesuai dan tidak menghasilkan output palsu.
- Smoke test setidaknya Chromium (Playwright). Tambahkan verifikasi manual/otomatis Firefox dan Safari/WebKit untuk decoder dan codec yang dirilis; keterbatasan harus tercantum, bukan diasumsikan.
- Verifikasi tidak ada request upload saat file dipilih/diproses dan setelah download.

---

## 11. Acceptance criteria

### Produk/UX

- Tool punya slug `webp-to-image`, nama dan ringkasan yang mudah dipahami, kategori gambar, format output, limit jujur dan panduan publik unik.
- Pengguna bisa memilih satu file WebP dan tepat satu dari PNG/JPG/GIF/BMP/AVIF yang tersedia pada browser tersebut.
- File input ditolak jika bukan WebP valid, kosong, melewati batas, malformed, animasi (jika kebijakan v1 disetujui), atau melewati batas dimensi/pixel.
- UI tidak menawarkan format sebagai siap pakai bila encoder lokal tidak didukung/gagal dimuat.
- Kualitas, transparansi dan keterbatasan GIF dijelaskan sesuai output aktual.
- Preview output, file name, ekstensi, MIME, signature dan isi file konsisten; hasil dapat dibuka dengan decoder independen.
- Seluruh state idle/ready/loading/success/error/reset dapat digunakan desktop dan mobile, keyboard, dan screen reader.

### Privasi/keamanan/resource

- Tidak ada file/hasil dikirim ke server, disimpan permanen, atau dicatat di analytics.
- File dicek dari signature dan decode; nama/ekstensi/MIME klien tidak menjadi bukti format.
- Batas ukuran dan decoded pixel ditegakkan sebelum alokasi proses besar.
- Kode tidak menghasilkan output dengan ekstensi target ketika encoder sebenarnya memberi format lain.
- Object URL, ImageBitmap, canvas, buffer dan resource WASM/worker dibersihkan sesuai lifecycle.
- Tidak ada dependency codec yang ditambahkan tanpa evaluasi lisensi, bundle, maintenance, dan keamanan.

### Engineering/release

- Registry, route workspace, sidebar, katalog, related tools dan panduan tidak punya tautan mati.
- Tests pure, registry, pages, wiring, E2E relevan, TypeScript, lint dan build production lulus.
- Build menggunakan konfigurasi repo (`next build --webpack`) dan API Next.js diverifikasi dari panduan lokal sebelum kode ditulis.
- Dokumen planning diperbarui ke status implementasi hanya setelah seluruh kriteria yang disepakati benar-benar terpenuhi.

---

## 12. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Browser/Canvas mengembalikan PNG fallback | File tampak bernama target tetapi formatnya salah | Verifikasi `Blob.type` dan signature; gagalkan bila tidak cocok. |
| AVIF encoder WASM besar/lambat atau terhalang CSP | Bundle/performa buruk, error hanya pada production | Spike awal, lazy load, uji CSP/production build, target device dan cold start. |
| GIF palette mengurangi warna/gradient | Hasil jauh berbeda dari sumber | Peringatan palet 256 warna, test gradient/alpha, pertimbangkan dithering; jangan mengklaim lossless. |
| JPG/BMP kehilangan alpha | Area transparan menjadi hitam/berwarna tak diharapkan | Flatten eksplisit ke background putih dan tampilkan preview/catatan sebelum konversi. |
| BMP membuat file sangat besar | Download lama dan penggunaan storage tinggi | Tampilkan estimasi bila dapat dihitung, peringatan hasil besar, batas pixel dan satu output per proses. |
| WebP animasi terkonversi jadi frame tunggal tanpa disadari | Kehilangan konten | Deteksi animasi dari container dan tolak dengan pesan v1; jangan silent fallback. |
| File kecil dengan pixel sangat tinggi/decompression bomb | Browser tab crash/OOM | File-size + pixel/dimension caps, validasi sebelum canvas/codec, test perangkat mobile. |
| Decoder/encoder mengubah warna atau metadata | Hasil berbeda/metadata tidak tersedia | Dokumentasikan perilaku yang terukur; fixture color profile dan alpha; jangan janji byte-identical. |
| Dependency berlisensi/maintenance bermasalah | Risiko hukum, supply chain, atau beban bundle | Tinjau lisensi/transitif/maintenance/scan sebelum memilih; pin versi sesuai kebijakan repo. |
| Multi-output meningkatkan peak memory | Perangkat mobile gagal | V1 satu target sekali proses; resource dibersihkan sebelum encode ulang. |

---

## 13. Keputusan terbuka sebelum coding

Tiap keputusan harus ditutup pada F0/F1 dan direkam pada bagian status dokumen:

1. Apakah v1 benar hanya menerima WebP statis, atau pengguna mengharapkan WebP animasi menjadi GIF animasi? **Rekomendasi:** statis saja; animasi ditolak eksplisit.
2. Apakah output GIF satu frame masih memenuhi kebutuhan, atau sebaiknya GIF dikeluarkan dari v1 sampai animasi didukung? **Rekomendasi:** label batasan dengan jelas; validasi kebutuhan sebelum rilis.
3. Apakah konversi menghasilkan satu format per proses atau membuat seluruh format sekaligus? **Rekomendasi:** satu format agar UX sederhana dan memori terkendali.
4. Batas dimensi/pixel final untuk desktop dan mobile? **Rekomendasi awal:** file <=15 MB, sisi <=8192 px, total <=16 MP; ukur ulang saat spike.
5. Untuk JPG/BMP, apakah background putih cukup atau pengguna perlu memilih warna? **Rekomendasi:** putih pada v1 dengan penjelasan; color picker dapat ditunda.
6. Apakah transparansi AVIF dipertahankan oleh encoder lokal terpilih pada seluruh browser target?
7. Berapa default dan rentang kualitas JPG/AVIF yang konsisten lintas encoder? Nilai slider tidak selalu identik persepsinya antarkodek.
8. Browser minimum yang akan dinyatakan didukung (Chrome/Edge/Firefox/Safari dan versi mobile)?
9. Encoder mana yang memenuhi kualitas, ukuran bundle, lisensi, maintenance, CSP dan keamanan? Belum ditentukan sebelum spike.
10. Perlukah menambah analytics agregat format sukses/gagal? **Rekomendasi:** tidak untuk v1; jangan merekam file/metadata sensitif.

---

## 14. Checklist eksekusi

### Sebelum implementasi

- [x] Keputusan F0 dicatat; lihat bagian status implementasi.
- [x] Spike semua format dijalankan pada Chromium production build via E2E; perangkat/browser lain belum dicakup.
- [ ] Library/codec, versi, lisensi dan bundle impact disetujui melalui audit formal.
- [x] Format animasi, alpha, metadata, quality dan batas resource ditetapkan; cross-browser masih perlu QA.
- [x] Panduan Next.js lokal relevan dibaca sebelum perubahan kode.

### Implementasi dan QA

- [x] Helper validasi/parser pure dan tes ditambahkan.
- [x] Adapter encoder menguji MIME serta signature output.
- [x] UI mempunyai state, pengaturan kondisional, preview dan download.
- [x] Registry, route, ikon, guide dan related links diperbarui.
- [ ] Cleanup/cancel/error path diuji menyeluruh; cleanup diimplementasikan, tetapi belum semua resource/jalur diuji browser.
- [x] Test relevan tool, lint, TypeScript, E2E Auth Emulator (15/15), dan production build lulus.
- [ ] Privasi diverifikasi melalui inspeksi network manual; pemrosesan lokal ditegaskan dalam kode/UI, tetapi inspeksi manual belum tercatat.
- [x] Limit dan keterbatasan animasi/GIF/JPG/BMP/AVIF terlihat pada tool/panduan.

---

## 15. Log keputusan dan status implementasi

| Tanggal | Fase | Keputusan/hasil | Status |
|---|---|---|---|
| 2026-11-16 | Implementasi | Tool `webp-to-image` diaktifkan; satu file/target, proses browser-only, WebP statis, limit 15 MB/8 MP/8192 px, tanpa resize diam-diam. PNG/JPG via Canvas, GIF `gifenc`, BMP 24-bit lokal, AVIF `@jsquash/avif` lazy-loaded dengan aset self-hosted. | Diimplementasikan |
| 2026-11-16 | QA Chromium | E2E Auth Emulator terisolasi melewati konversi PNG/JPG/GIF/BMP/AVIF setelah memperbaiki import named `gifenc`. Tes pure dan wiring terkait lulus. | Lulus |
| 2026-11-16 | QA tambahan | Auth E2E penuh lulus 15/15 setelah selector konfirmasi hapus diselaraskan dengan accessible name aktual. Beberapa log server `NoFallbackError` tetap terlihat meski test terkait lulus; browser selain Chromium, audit dependency/license, dan inspeksi network manual belum selesai. | Lulus dengan tindak lanjut |

> Dokumen ini adalah planning, bukan laporan rilis. Jangan mengubah status menjadi “selesai” atau menyebut encoder/browser didukung sampai spike, implementasi, dan tes pada format terkait selesai.
