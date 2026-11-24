# Rencana Upgrade LKTech Tools Menjadi Workspace Produktivitas

> **Status:** Sebagian dieksekusi — Color Studio P0 serta batch dua arah WebP + ZIP lokal sudah dirilis; sisa fase per tool mengikuti status di bawah.
> **Disusun:** 2026-11-22
> **Cakupan:** Mengembangkan enam tool yang tersedia menjadi workspace yang lebih lengkap, konsisten, aman untuk batch, dan tetap memproses data secara lokal di browser.
> **Prinsip non-negosiasi:** Tidak ada unggah atau penyimpanan isi berkas pengguna di server. Nama berkas, isi dokumen, piksel gambar, palet, dan hasil konversi tidak boleh dikirim ke analytics.

---

## Status eksekusi

### Rilis awal — Color Studio P0 ✅ selesai (2026-11-22)

Implementasi pertama memprioritaskan kebutuhan yang paling mendesak tanpa menunggu seluruh program upgrade selesai:

- `color-picker` tetap memakai slug yang sama demi tautan lama, tetapi tampil sebagai **Color Studio** di katalog dan workspace.
- Pengguna dapat memilih warna secara visual/HEX, mengatur alfa, dan menyalin HEX, RGB, HSL, serta CSS.
- Menu **Dari gambar** menerima satu gambar lokal hingga limit tool gambar, menganalisis salinan canvas yang dibatasi 720 px pada sisi terpanjang, lalu memungkinkan pengguna mengambil warna dengan klik serta membuat palet representatif maksimal delapan warna.
- Menu **Kontras** menampilkan rasio dan ambang WCAG 2.x untuk teks normal/besar; menu **Gradient** menghasilkan CSS linear gradient. Palet dapat disalin sebagai CSS variables.
- Tab dapat dinavigasi dengan panah/Home/End. Preview gambar dapat dioperasikan dengan keyboard: panah memindahkan titik sampel (Shift = 10 px), Enter/Spasi mengambil warna.
- Tidak ada input URL, proxy, atau request upload pada rilis ini. Dukungan URL/EyeDropper layar tetap P1 karena CORS, privasi, dan kompatibilitas browser memerlukan desain/QA tersendiri.
- Logika color math, rasio kontras, variasi warna, dan ekstraksi palet mendapatkan regression test; E2E workspace menambahkan fixture gambar lokal.
- Verifikasi: `tsc` & `eslint` bersih; `test:tools-color` 14/14, `test:tools-registry` 18/18, `test:tools-pages` 16/16; E2E Auth Emulator **16/16** (termasuk Color Studio). Suite E2E kini login sekali per suite dan memakai ulang `storageState`, bukan membuka popup emulator di setiap test.

### Batch WebP + fondasi ZIP ✅ selesai (kode, 2026-11-22)

- `image-to-webp` kini menjadi **Batch WebP Optimizer**: menerima hingga 30 gambar lokal (15 MB/berkas, total 100 MB), memproses **berurutan**, dan menampilkan status serta hasil per item.
- Setiap item dapat diunduh sendiri; item gagal dapat diulang tanpa mengulang item yang sudah berhasil. Antrean dapat dihentikan setelah item aktif dan dibersihkan dengan pencabutan object URL.
- Hasil tidak ditawarkan sebelum lolos verifikasi: MIME `image/webp`, container RIFF/WEBP, bukan animasi, serta dimensi hasil sama dengan target.
- Nama hasil disanitasi dan dibuat unik (sufiks `-2`, `-3`, …) sebelum masuk unduhan atau ZIP.
- **Spike ZIP selesai:** proyek memakai penulis **ZIP32 `store` internal** (`src/lib/tools/zip-store.ts`), bukan dependensi baru. Alasan: gambar sudah terkompresi, metode store menghindari biaya CPU, dan tidak menambah permukaan audit dependensi. Arsip menulis CRC32, nama UTF-8, menolak path/duplikat, serta dibatasi 100 MB hasil.
- ZIP dibangun hanya saat diminta, setelah hasil selesai; unduhan per item tetap tersedia bila ZIP ditolak karena batas.
- Verifikasi: `tsc` & `eslint` bersih; build produksi 89/89 halaman; `test:tools-batch` 8/8, `test:tools-zip` 4/4, `test:tools-registry` 18/18, `test:tools-pages` 16/16. ZIP diuji struktur biner dan dibuka dengan `Expand-Archive` Windows; E2E Auth Emulator mencakup antrean dua gambar, unduhan ZIP nyata, dan reset.
- **Sisa untuk fase berikutnya:** mode crop `contain`/`cover`, latar solid untuk sumber transparan, pengaturan lebar/tinggi per sumbu, thumbnail antrean, serta uji perangkat low-memory. Tool PDF/teks belum diubah pada fase ini.

Fondasi antrean (`batch-pure.ts`) dan penulis ZIP kini tersedia untuk tool berikutnya, tetapi belum dipaksakan ke semua tool agar perubahan tetap dapat ditinjau per tool.

### Batch WebP ke Gambar ✅ selesai (kode, 2026-11-22)

- `webp-to-image` kini menerima hingga **20 WebP statis** lokal (15 MB/berkas, total 80 MB), lalu memprosesnya **berurutan** ke satu format global: PNG, JPG, GIF, BMP, atau AVIF.
- Parser container menolak input malformed dan **WebP animasi**; validasi ukuran, dimensi, dan piksel tetap berlaku sebelum encode. Kegagalan satu item tidak menghentikan item lain dan dapat diulang per item.
- Setiap hasil melalui verifikasi MIME serta magic signature format target sebelum diberi object URL, unduhan individual, atau dimasukkan ke ZIP. Nama output disanitasi dan dibuat unik.
- JPG/BMP diberi matte putih untuk alpha; GIF dijelaskan sebagai output statis berpalet 256 warna; AVIF dimuat lokal secara lazy. ZIP memakai kembali penulis ZIP32 `store`, maksimal 100 MB hasil.
- Mengubah format membatalkan hasil lama dan mencabut object URL-nya, sehingga hasil dengan format sebelumnya tidak dapat terunduh keliru.
- Verifikasi: `tsc` & `eslint` bersih; `test:tools-registry` 18/18, `test:tools-pages` 16/16, `test:tools-webp-conversion` 6/6; E2E Auth Emulator **17/17**, termasuk konversi batch WebP→PNG dan unduhan per-item.

### Preflight header gambar ✅ selesai (kode, 2026-11-22)

- Sebelum `createImageBitmap` atau fallback `<img>` mendekode piksel, empat alur pemrosesan (`image-to-webp`, `webp-to-image`, `image-to-pdf`, dan Color Studio) membaca maksimal **256 KiB** awal file untuk signature serta dimensi.
- Parser lokal murni mencakup PNG, JPEG, GIF, BMP, WebP, dan AVIF. Signature harus cocok dengan MIME yang dipilih.
- Input ditolak sebelum decode bila header malformed/tidak dikenali, sisi lebih dari **8.192 px**, atau luas lebih dari **8 megapiksel**. Batas ini mengurangi risiko alokasi memori dari dekompresi-bomb.
- Setelah decode, validasi WebP yang sudah ada tetap dijalankan lagi pada tool WebP untuk pertahanan berlapis.

---

## 1. Ringkasan keputusan produk

LKTech Tools saat ini memiliki fondasi yang baik: tool berjalan lokal, memakai workspace yang sama, dan sudah memiliki validasi dasar. Upgrade ini mengubahnya dari kumpulan utilitas satu-aksi menjadi **workspace per kebutuhan**: pengguna dapat memilih beberapa berkas saat relevan, mengatur proses, melihat antrean serta hasil, lalu mengunduh seluruh hasil dengan aman.

Enam tool yang menjadi ruang lingkup:

1. **Color Picker** → **Color Studio**: ambil warna dari gambar, ekstrak palet, uji kontras, buat variasi/gradient, dan ekspor token warna.
2. **Gambar ke WebP** → konverter batch dengan preset, resize/crop opsional, kontrol kualitas, dan ZIP hasil.
3. **WebP ke Gambar** → konverter batch aman untuk WebP statis, dengan pengaturan output yang konsisten serta ZIP hasil.
4. **Gambar ke PDF** → penyusun PDF dengan thumbnail, susun ulang yang lebih nyaman, orientasi/layout halaman, dan metadata dokumen.
5. **PDF ke Gambar** → pemilih halaman visual, batch output yang dapat diunduh sebagai ZIP, serta kontrol render yang jelas.
6. **Formatter Teks** → workspace format/validasi untuk JSON, teks biasa, dan format terstruktur tambahan yang benar-benar dapat divalidasi dengan baik.

### Keputusan awal yang dipakai dalam rencana

| Topik | Keputusan |
|---|---|
| Privasi | Pemrosesan dilakukan pada perangkat pengguna. Berkas tidak melewati API, Firebase Storage, Cloudinary, maupun server proxy. |
| Batch | Tool gambar boleh mendukung banyak file, tetapi harus memakai antrean **berurutan**, batas total yang jelas, pembatalan aman, dan pelepasan memori setelah tiap item. |
| Unduhan banyak hasil | Sediakan satu unduhan ZIP jika jumlah hasil lebih dari satu. Jangan memaksa browser membuka banyak unduhan individual. |
| File dari URL | Tidak ada server proxy. URL gambar hanya dapat diproses langsung dari browser bila server asal mengizinkan CORS. Jika tidak, pengguna diminta mengunduh gambar lalu memilihnya dari perangkat. |
| Gambar dari halaman web | Gunakan `EyeDropper` API bila tersedia untuk mengambil **satu warna dari layar**. Fitur ini tidak menjamin ekstraksi seluruh gambar halaman; browser membatasi akses piksel lintas-origin demi keamanan. |
| Penyimpanan preferensi | Hanya preferensi non-sensitif (mis. format terakhir, kualitas, tampilan) yang boleh disimpan di `localStorage`, dengan tombol hapus data lokal. Jangan menyimpan file, preview, hasil, isi teks, atau URL sumber. |
| Kualitas hasil | MIME type, ekstensi, dan signature hasil harus cocok. Tidak boleh mengganti ekstensi tanpa benar-benar mengubah format. |
| Kinerja | Untuk pekerjaan berat, gunakan Web Worker/codec lazy-load setelah spike kompatibilitas; UI harus tetap dapat dibatalkan atau di-reset. |
| Peluncuran | Fitur besar diluncurkan bertahap per tool, dengan capability check dan fallback yang jujur. Tidak ada klaim dukungan lintas-browser tanpa pengujian. |

---

## 2. Sasaran keberhasilan

### Sasaran pengguna

- Pengguna dapat melakukan pekerjaan umum desain, konten, dan dokumen tanpa berpindah ke banyak situs atau mengunggah file sensitif.
- Pengguna memahami apa yang akan diubah sebelum menjalankan proses: jumlah file, format, dimensi, transparansi, kualitas, ukuran estimasi bila tersedia, dan batasan format.
- Untuk pekerjaan batch, pengguna dapat melihat item yang lolos/gagal, menjalankan ulang item gagal, serta memperoleh hasil terorganisir.
- Setiap tool mempunyai kemampuan yang cukup dalam satu halaman, tetapi tetap mudah digunakan untuk aksi utama pertama kali.

### Indikator penerimaan produk

1. Aksi utama setiap tool bisa diselesaikan dengan keyboard dan memiliki status aksesibel (`aria-live`).
2. Semua input file diperiksa berdasarkan ukuran, tipe, dan signature yang sesuai—bukan ekstensi semata.
3. Tidak ada result URL, canvas, `ImageBitmap`, buffer besar, atau worker yang tertinggal setelah item dihapus, reset, halaman ditutup, atau hasil diganti.
4. Batch tetap responsif pada batas resmi perangkat; proses tidak menjalankan semua encoding paralel.
5. Output batch bisa diunduh satu per satu dan sebagai ZIP; ZIP hanya dibuat setelah hasil selesai dan tetap divalidasi.
6. Setiap tool mempunyai panduan publik yang mencerminkan kemampuan aktual, limit, privasi, serta kompatibilitasnya.
7. Telemetri hanya mengukur pembukaan workspace dan interaksi agregat yang tidak mengandung data berkas/teks/piksel, jika memang diperlukan dan disetujui.

### Bukan tujuan fase ini

- Server-side conversion, antrean cloud, penyimpanan riwayat berkas, atau akun untuk menyimpan hasil.
- AI image generation/editing, OCR, pengenalan wajah, atau analisis konten yang mengirim data ke layanan pihak ketiga.
- Mengakali CORS dengan proxy server untuk gambar dari URL.
- Dukungan penuh berkas animasi (animated WebP/GIF) sebelum ada desain khusus per-frame, batas waktu, dan uji memori.
- Menambahkan banyak format hanya demi daftar fitur tanpa validasi output dan QA lintas browser.

---

## 3. Fondasi bersama: Tool Workspace v2

Sebelum memperbesar fitur tiap tool, perlu ada fondasi bersama agar perilaku dan batasnya konsisten. Fondasi ini menggantikan pola state per-komponen yang serupa namun terduplikasi.

### 3.1 Komponen dan helper bersama yang direncanakan

| Bagian | Tanggung jawab |
|---|---|
| `ToolTaskQueue` | Menjalankan pekerjaan berat secara berurutan, memantau status item (`waiting`, `processing`, `success`, `failed`, `cancelled`), dan mencegah aksi ganda. |
| `ToolFileQueue` | Menambah/validasi banyak berkas, deduplikasi yang tidak merusak file bernama sama, urutkan item, hapus item, dan tampilkan error per-item. |
| `ToolResultCollection` | Menyimpan metadata hasil dan object URL; mengelola unduhan individual/ZIP serta pembersihan seluruh URL. |
| `LocalFilePolicy` | Satu sumber batas jumlah file, ukuran per file, ukuran total, megapiksel, dimensi, format, serta pesan error yang konsisten. Batas boleh berbeda per tool. |
| `OutputVerifier` | Memeriksa MIME type, magic bytes/signature, nama keluaran aman, dan format yang dipilih sebelum hasil dapat diunduh. |
| `ToolSettingsStorage` | Menyimpan setting non-sensitif versi-terkunci di local storage; memiliki migrasi ringan dan aksi “hapus preferensi tool”. |
| `ToolProgress` | Pola UI progres yang jujur: progress per-item bila diketahui, bukan progres palsu berbasis waktu. |
| `ToolDownloadZip` | Adapter ZIP local, dimuat malas hanya saat dibutuhkan. Nama file dalam archive disanitasi dan collision ditangani. |
| `ToolCapabilityNotice` | Mendete ksi API/browser/codec yang diperlukan dan menampilkan fallback yang dapat ditindaklanjuti. |

### 3.2 Aturan antrean dan memori

- Default pekerjaan gambar: satu encode/render pada satu waktu. Decode berikutnya hanya dilakukan jika batas memori aman.
- Setiap item membebaskan canvas, `ImageBitmap`, ArrayBuffer sementara, dan object URL segera setelah tidak diperlukan.
- Hasil unduhan tetap tersedia sampai pengguna menghapusnya, me-reset workspace, atau meninggalkan halaman; setelah itu URL harus dicabut.
- Pembatalan menghentikan pekerjaan yang belum mulai. Pekerjaan codec yang tidak dapat diinterupsi ditandai “selesai pada item ini lalu berhenti”, bukan diberi tombol batal palsu.
- Worker dan WASM dimuat on-demand; kegagalan worker tidak boleh membuat seluruh halaman macet.
- Tidak menyimpan base64/data URL besar di React state atau `localStorage`.

### 3.3 Batas batch awal yang harus diuji ulang saat spike

Nilai berikut adalah target awal, bukan janji final. Nilai final ditetapkan dari pengujian perangkat low-memory dan hasil benchmark.

| Kelas tool | Batas awal yang diusulkan |
|---|---|
| Image → image | Maks. 30 file, 15 MB/file, 100 MB total input, 8 MP/file, sisi terpanjang 8192 px. |
| WebP → image | Maks. 20 file statis, 15 MB/file, 80 MB total input, 8 MP/file. AVIF/GIF dapat memiliki batas batch lebih kecil. |
| Image → PDF | Maks. 30 gambar, 15 MB/file, 150 MB total input; batas berdasarkan estimasi pixel juga wajib. |
| PDF → image | Satu PDF per pekerjaan, maks. 25 MB dan maks. 30 halaman yang dirender dalam satu run. ZIP diperbolehkan untuk hasil banyak halaman. |
| Color extraction | Maks. satu gambar aktif; 15 MB, 8 MP. Analisis dilakukan atas salinan canvas yang diperkecil agar tidak membebani perangkat. |
| Text formatter | Maks. 2 juta karakter awalnya; format baru memiliki limit parser sendiri yang terdokumentasi. |

Jika perangkat tidak mampu, tool berhenti secara aman dengan pesan yang menyarankan batch lebih kecil—bukan menghasilkan output parsial tanpa penjelasan.

---

## 4. Rencana fitur per tool

## 4.1 Color Picker → Color Studio

### Tujuan

Menjadikan Color Picker alat lengkap untuk memperoleh, memahami, menguji, dan memakai warna. Aksi paling sederhana—memilih dan menyalin HEX—tetap berada di depan.

### Struktur menu dalam workspace

1. **Pilih warna** — visual picker, input HEX/RGB/HSL/HSV, alfa, recent colors lokal, dan preset.
2. **Ambil dari gambar** — klik titik piksel pada gambar lokal atau gambar URL yang CORS-nya mengizinkan; zoom/loupe; daftar titik warna yang diambil.
3. **Palet** — ekstraksi warna dominan, variasi tints/shades/tones, edit/hapus/lock warna, dan reorder palet.
4. **Kontras** — perbandingan foreground/background, skor WCAG untuk teks normal/besar, rekomendasi alternatif yang tetap menjaga hue sebanyak mungkin.
5. **Gradient & ekspor** — linear/radial gradient, stop warna, sudut, dan ekspor CSS variables/JSON/ASE-compatible bila format tersebut dapat dibuat serta diuji secara lokal.

### Fitur prioritas

| Prioritas | Fitur | Perilaku yang disyaratkan |
|---|---|---|
| P0 | Input warna lengkap | HEX 3/4/6/8 digit, RGB/RGBA, HSL/HSLA; normalisasi jelas tanpa mengubah draf yang sedang diketik secara mengejutkan. |
| P0 | Ambil warna dari gambar lokal | Dropzone satu gambar, preview berskala, koordinat klik, loupe, daftar sampel; gambar tidak disimpan setelah reset. |
| P0 | Ekstrak palet gambar | Pilih 5/8/12 warna dominan; abaikan alpha sesuai kebijakan; gunakan downsample dan algoritme deterministik yang dapat diuji. |
| P0 | Uji kontras | Rasio WCAG 2.x, status AA/AAA untuk teks normal dan besar, simulasi tampilan teks. |
| P0 | Salin/ekspor | Salin satu warna, seluruh palet sebagai CSS/JSON, dan gradient CSS; clipboard fallback yang tetap memungkinkan salin manual. |
| P1 | EyeDropper layar | Gunakan `EyeDropper` API dengan feature detection; hanya mengambil satu warna yang pengguna pilih. |
| P1 | Import URL gambar | Permintaan `fetch` langsung dari browser; tampilkan domain sumber dan peringatan bahwa URL dapat dilihat server asal. Tolak bila CORS tidak mengizinkan—tanpa proxy. |
| P1 | Generator harmoni | Complementary, analogous, triadic, split complementary, monochromatic; semua hasil editable. |
| P2 | Pemeriksaan buta warna | Simulasi preview sebagai bantuan desain, dengan catatan bahwa ini bukan pengganti audit aksesibilitas profesional. |

### Batasan teknis penting

- Gambar dari website lain hanya bisa dibaca pikselnya jika respons memiliki CORS yang sesuai. Tanpa itu, canvas menjadi tainted dan palet tidak dapat diekstrak dengan aman.
- `EyeDropper` adalah fitur browser tertentu; fallback-nya adalah pilih gambar lokal atau input kode warna.
- Ekstraksi palet tidak mengklaim “warna paling akurat”; algoritme dan jumlah sampel harus dijelaskan sebagai palet representatif.

### Kriteria penerimaan Color Studio

- Pengguna bisa memilih warna dari gambar lokal lalu menyalin HEX/RGB/HSL secara akurat.
- Palet yang diekstrak deterministik untuk fixture yang sama dan tidak mengirim piksel ke jaringan.
- Rasio kontras diuji dengan test fixture dan membedakan normal/large text secara benar.
- Fitur URL gagal secara informatif pada CORS, tanpa request ke server LKTech.

---

## 4.2 Gambar ke WebP → Batch WebP Optimizer

### Status implementasi P0 (2026-11-22)

Sudah tersedia: multi-select dan drag-and-drop, batas 30 berkas/15 MB/100 MB, preset cepat/seimbang/tinggi, kontrol kualitas, batas sisi terpanjang, **preflight signature/dimensi/piksel sebelum decode**, antrean berurutan, status dan hasil per item, ulangi item gagal, hentikan antrean, bersihkan workspace, unduhan per item, serta ZIP lokal dengan verifikasi signature.

Belum tersedia: pengaturan lebar/tinggi per sumbu, mode `contain`/`cover`, latar solid untuk sumber transparan, dan thumbnail preview.

### Tujuan

Mengonversi banyak gambar lokal menjadi WebP dengan kontrol yang cukup untuk kebutuhan web, katalog, dan konten tanpa mengorbankan transparansi maupun memori perangkat.

### Fitur target

- Multi-select, drag-and-drop, dan antrean thumbnail hingga limit resmi.
- Preset: **Web cepat**, **Seimbang**, **Kualitas tinggi**, serta **Pengaturan manual**.
- Atur kualitas, resize berdasarkan sisi panjang/lebar/tinggi, pertahankan rasio, dan larang upscale secara default.
- Mode fit: `contain` (tanpa crop) dan `cover` (crop); crop harus memiliki preview/penjelasan karena mengubah komposisi.
- Background pilihan untuk sumber transparan bila pengguna ingin hasil dengan latar solid; WebP standar tetap mempertahankan alpha bila pengaturan itu tidak dipilih.
- Per-item status input, dimensi awal/hasil, ukuran awal/hasil, perubahan ukuran, error, ulangi item, dan hapus item.
- Unduh satu hasil atau seluruh hasil sebagai ZIP.
- Template penamaan aman: nama asli + suffix yang tetap unik, contoh `foto-web.webp`; tidak ada path atau karakter berbahaya.

### Tidak dilakukan pada P0

- Edit foto kompleks, layer, filter AI, atau metadata EXIF editor.
- Janji kompresi lebih kecil untuk semua file. Hasil bisa lebih besar dan UI harus menampilkan fakta tersebut.

### Kriteria penerimaan

- Setiap output terbukti `image/webp` melalui MIME dan signature RIFF/WEBP.
- Gagal satu file tidak membatalkan seluruh batch; summary memisahkan sukses/gagal.
- ZIP memuat semua dan hanya hasil valid, dengan nama unik dan aman.
- Transparansi sumber tetap ada bila output/pengaturan mendukungnya.

---

## 4.3 WebP ke Gambar → Batch WebP Converter

### Tujuan

Memperluas tool WebP yang sudah dirilis menjadi konverter batch yang tetap ketat terhadap WebP animasi dan kebenaran format hasil.

### Fitur target

- Pilih banyak WebP statis; masing-masing diperiksa RIFF/container, dimensi, pixel, ukuran, serta status animasi sebelum masuk antrean.
- Satu format keluaran per run (PNG/JPG/GIF/BMP/AVIF) agar setting dan hasil tidak ambigu.
- Pengaturan global yang berlaku pada semua item: kualitas JPG/AVIF, warna flatten JPG/BMP, serta opsi resize yang eksplisit.
- Opsi output lanjutan secara bertahap:
  - PNG: pertahankan transparansi.
  - JPG/BMP: background putih atau warna pilihan pengguna.
  - GIF: statis; palet maksimum 256 warna dengan pesan keterbatasan.
  - AVIF: codec WASM self-hosted lazy-load dengan capability/error handling.
- Per-item hasil dan error; WebP animasi ditolak sebelum encode dan diberi alasan yang jelas.
- ZIP hasil serta penamaan aman/unik.

### Perubahan batas yang harus tetap dihormati

- Batch tidak berarti dukungan WebP animasi. Semua input animasi tetap ditolak, tanpa mengambil frame pertama diam-diam.
- File output hanya tersedia bila MIME **dan** signature cocok dengan target. Ini berlaku untuk setiap item batch dan isi ZIP.
- Encoder berat (GIF/AVIF) mungkin memiliki limit batch yang lebih rendah; UI harus menjelaskan sebelum proses.

### Kriteria penerimaan

- Fixture campuran statis, animasi, malformed, dan over-limit menghasilkan summary yang tepat tanpa crash.
- PNG/JPG/GIF/BMP/AVIF batch yang sukses memiliki magic bytes benar.
- Reset di tengah/akhir proses mencabut seluruh object URL dan tidak membuat batch lama dapat terunduh kembali.

---

## 4.4 Gambar ke PDF → PDF Composer

### Kondisi awal

Tool ini sudah mendukung banyak gambar, urutan dasar, pilihan A4/Letter/fit, margin, dan output lokal. Upgrade memprioritaskan pengalaman penyusunan, bukan hanya menambah format.

### Fitur target

- Thumbnail grid/list yang responsif, drag-and-drop reorder dengan fallback tombol naik/turun untuk keyboard.
- Pemilihan banyak item untuk hapus, rotasi 90°, dan pengaturan per gambar yang transparan.
- Pilihan ukuran halaman: A4, Letter, Legal, ukuran gambar, serta potret/landscape otomatis atau manual.
- Layout: satu gambar per halaman (default), beberapa gambar per halaman sebagai mode lanjutan, cover page opsional, dan nomor halaman opsional.
- Margin, warna latar halaman, fit/contain/cover yang jelas; `cover` harus memperingatkan potensi crop.
- Metadata PDF non-sensitif yang opsional: judul dan author. Jangan menyalin metadata EXIF asli tanpa persetujuan eksplisit.
- Estimasi halaman/ukuran dan pemeriksaan limit sebelum generate.

### Kriteria penerimaan

- Urutan visual, keyboard, dan PDF akhir selalu sama.
- Gambar transparan pada PDF memiliki kebijakan background yang terlihat dan konsisten.
- PDF yang dihasilkan memiliki signature `%PDF-`, dapat dibuka pembaca PDF umum, dan jumlah halaman sesuai preview.

---

## 4.5 PDF ke Gambar → PDF Render Studio

### Tujuan

Membuat proses memilih halaman dan mengelola banyak hasil PDF menjadi cepat serta rapi, tanpa memicu blokir multi-download browser.

### Fitur target

- Preview thumbnail halaman sebelum render final; select all, clear selection, rentang, serta pilihan halaman ganjil/genap.
- Render PNG/JPG awal; opsi kualitas JPG dan warna background yang eksplisit.
- Preset resolusi: web, standar, cetak, custom scale dengan batas pixel yang dihitung sebelum render.
- Nama hasil dan zero-padding nomor halaman yang konsisten.
- Mode unduh: individual, semua sebagai ZIP, atau hanya halaman yang dipilih.
- Ringkasan per halaman: dimensi, ukuran output, error/retry.
- Pemberitahuan yang jujur bila PDF terlindungi kata sandi, rusak, halaman terlalu besar, atau melewati batas pekerjaan.

### Kriteria penerimaan

- Halaman yang dipilih sama dengan halaman yang masuk ZIP.
- Setiap PNG/JPG hasil diverifikasi sebelum ditambahkan ke hasil/ZIP.
- PDF 30 halaman pada skala yang diizinkan tidak menyebabkan semua halaman/canvas aktif bersamaan di memori.

---

## 4.6 Formatter Teks → Text & Data Formatter

### Tujuan

Memperluas tool tanpa menjadi editor kode penuh. Semua mode harus memiliki parser/validator yang jelas dan hasil yang dapat ditinjau.

### Fitur target

| Prioritas | Mode | Kemampuan |
|---|---|---|
| P0 | JSON | Pretty, minify, validasi, urutkan key secara rekursif bila dipilih, indent 2/4/tab, serta pesan lokasi error yang aman. |
| P0 | Teks | Trim setiap baris, rapikan whitespace, hapus baris kosong berlebih, ubah line ending, hapus duplikat baris opsional, dan statistik perubahan. |
| P1 | CSV | Validasi delimiter/quote, preview tabel terbatas, normalisasi line ending, dan ekspor CSV yang tidak mengubah data tanpa pemberitahuan. |
| P1 | URL list | Trim, validasi sintaks URL, deduplikasi, normalisasi host/protokol yang opsional—tanpa pernah melakukan fetch URL. |
| P2 | Base64 | Encode/decode teks UTF-8, statistik byte, dan batas ukuran ketat. Ini bukan alat enkripsi. |

### UX target

- Mode dipilih pada tab yang jelas, dengan setting spesifik mode.
- Diff ringkas: jumlah baris/karakter berubah, tidak harus visual diff kompleks pada P0.
- Tombol salin, unduh, dan ganti input dengan output (“gunakan sebagai masukan”) dengan konfirmasi untuk mencegah kehilangan draf.
- Tidak menyimpan isi input/output otomatis, termasuk pada analytics dan `localStorage`.

### Kriteria penerimaan

- JSON invalid tidak menghasilkan output palsu dan memberikan pesan yang dapat dimengerti.
- Setiap transformasi murni mendapat regression test (Unicode, CRLF/LF, input besar, delimiter CSV, URL invalid).
- Hasil unduhan memakai MIME/ekstensi yang benar (`application/json`, `text/plain`, `text/csv`).

---

## 5. Arsitektur dan struktur kode yang direncanakan

Perubahan harus mengikuti pola repo saat ini: metadata tool di registry, body tool di workspace dispatcher, logika yang dapat diuji dipisahkan dari React/DOM, serta panduan publik dari sumber yang sama.

| Area | File/lokasi yang kemungkinan berubah | Arah perubahan |
|---|---|---|
| Metadata | `src/lib/tools-registry-pure.ts` | Update deskripsi, format, limit label, keyword, related tool, dan intent setelah fitur benar-benar tersedia. |
| Workspace | `src/components/tools/tool-workspace.tsx` | Tetap dispatcher ringan; jangan memusatkan state/encoder di sini. |
| UI bersama | `src/components/tools/` dan subfolder baru `shared/` | Queue, result list, empty state, batch toolbar, progress, download ZIP, dan dialog reset. |
| Logika murni | `src/lib/tools/` | Kebijakan limit, validator, formatter, parser, penamaan, signature, math warna/kontras, queue reducer, ZIP manifest. |
| Runtime browser | `src/lib/tools/*-client.ts` | Canvas, decode, worker, codec, object URL, feature detection. Semua akses DOM hanya di sini/komponen client. |
| Worker/asset | `public/` dan `scripts/` | Hanya bila spike menyatakan worker/WASM perlu self-host; asset copier terversi dan diuji keberadaannya. |
| Panduan | `src/lib/tools-guides-pure.ts` | Perbarui langkah, batas, FAQ, privasi, dan browser support untuk setiap rilis fitur. |
| Test | `scripts/tools-*.test.ts`, `e2e/` | Test murni, E2E Auth Emulator, visual/manual matrix lintas browser. |

Tidak ada penambahan package sebelum spike memperlihatkan kebutuhan nyata, ukuran bundle, lisensi, maintenance, dan keamanan. Kandidat library ZIP/drag-sort/quantizer tidak ditentukan dalam dokumen ini dengan sengaja.

---

## 6. UX, aksesibilitas, dan privasi

### Pola tampilan tiap workspace

1. **Aksi utama / input** di bagian atas, bukan tersembunyi dalam menu.
2. **Panel pengaturan** memakai kelompok yang bisa dipahami (Output, Ukuran, Latar, Penamaan), bukan deretan kontrol teknis.
3. **Antrean** menampilkan thumbnail hanya bila aman dan relevan; nama file dipotong secara visual tetapi tetap bisa diakses melalui label lengkap.
4. **Hasil** menampilkan sukses/gagal per item, ukuran, dimensi, aksi unduh/retry, serta unduh ZIP.
5. **Reset** menjelaskan bahwa file dan hasil lokal akan dibersihkan dari halaman saat ini.

### Aksesibilitas wajib

- Semua dropzone memiliki tombol pilih file asli dan tidak hanya mengandalkan drag-and-drop.
- Reorder memiliki kontrol keyboard yang setara dengan drag-and-drop.
- Fokus berpindah secara masuk akal setelah menambah/menghapus item dan tidak terjebak di dialog.
- Progress dan error diumumkan dengan teks, bukan warna/spinner saja.
- Preview gambar memiliki alt generik yang tidak membocorkan nama file bila tidak dibutuhkan.
- Kontras UI mengikuti design system; kontrol canvas/pipette memiliki alternatif input angka.
- Animasi menghormati `prefers-reduced-motion`.

### Privasi dan jaringan

- Tambahkan disclosure singkat yang konsisten: “Diproses di perangkat Anda. File tidak diunggah.”
- Untuk fitur URL, disclosure berbeda: browser menghubungi domain URL langsung; LKTech tetap tidak menerima berkas. Tampilkan hanya setelah pengguna memilih fitur URL.
- Jangan kirim nama file, byte count detail, halaman PDF, isi teks, URL sumber, warna yang dipilih, atau hasil konversi ke analytics/error tracking.
- Error tracking yang sudah ada harus disanitasi agar tidak menangkap konten input atau nama file mentah.

---

## 7. Strategi pengujian dan quality gate

### 7.1 Unit/regression test

- Validator file: empty, wrong MIME, extension palsu, signature salah, ukuran/pixel/total batch berlebih.
- Output verifier: magic bytes dan MIME untuk setiap encoder/format yang dirilis.
- Penamaan: Unicode, nama kosong, collision, ekstensi ganda, karakter path/HTML.
- Queue reducer: tambah, hapus, retry, cancel, reset, partial failure, urutan item.
- Color math: HEX/RGB/HSL/HSV, alpha, luminance/contrast WCAG, palet deterministik.
- Text transforms: malformed input, Unicode, line ending, max input, validasi mode baru.
- PDF helpers: pilihan halaman, ukuran render, format nama, batas jumlah halaman.

### 7.2 E2E

- Jalankan melalui Firebase Auth Emulator karena workspace login-gated.
- Batch image happy path dan campuran error: hasil individual, ZIP, retry, reset.
- Color Studio: fixture gambar lokal, pilih piksel, ekstrak palet, copy, ekspor; URL CORS failure memakai mock jaringan.
- PDF Composer: tambah/susun ulang/hapus gambar lalu verifikasi PDF valid dan jumlah halaman.
- PDF Render Studio: pilih halaman non-berurutan, render, ZIP, dan verifikasi isi manifest/hasil.
- Uji keyboard dasar untuk semua kontrol utama.

### 7.3 QA manual sebelum rilis tiap fase

| Lingkungan | Minimum pemeriksaan |
|---|---|
| Chromium desktop | Semua fitur dan codec yang disasar, jaringan offline setelah asset termuat, batch batas atas. |
| Firefox desktop | Canvas/clipboard/download/ZIP, picker gambar, PDF worker, error fallback. |
| Safari macOS/iOS | File input, canvas, object URL, memory cleanup, AVIF/codec fallback, download behavior. |
| Android Chrome | Multi-file picker, memory/batch, viewport kecil, ZIP download. |
| Aksesibilitas | Keyboard-only, screen reader smoke, zoom 200%, reduced motion, error/status announcement. |

### Gate rilis

Satu subfitur hanya dianggap tersedia setelah:

1. build, typecheck, lint, unit test, dan E2E relevan lulus;
2. output format diverifikasi dengan fixture nyata;
3. tidak ada request upload saat alat dipakai (kecuali request langsung ke URL sumber yang dipilih pengguna); dan
4. panduan serta limit label sudah sama dengan perilaku aktual.

---

## 8. Roadmap implementasi bertahap

### Fase 0 — Audit dan desain teknis (wajib sebelum coding besar)

- Inventarisasi perilaku/keterbatasan enam tool sekarang dan kumpulkan fixture aman untuk gambar/PDF/teks.
- Baca dokumentasi Next.js yang sesuai versi repo sebelum perubahan client-only, Worker, WASM, atau static asset.
- Spike ukuran bundle, memori, browser support, dan lisensi untuk ZIP/drag-sort/palette algorithm/worker bila diperlukan.
- Tetapkan batas final berdasarkan benchmark, terutama perangkat mobile/memori rendah.
- Buat desain visual dan interaction states yang konsisten dengan `ToolShell` dan design system sekarang.

**Output fase:** ADR/hasil spike, limit final, daftar dependency yang disetujui, serta desain state/error.

### Fase 1 — Fondasi Workspace v2

- Buat helper murni kebijakan batch, queue, output naming/verifier, dan state reducer dengan test lebih dahulu.
- Buat komponen antrean/result/progress/reset/download ZIP yang reusable.
- Tambahkan pembersihan resource dan capability notices terstandardisasi.
- Pastikan tool yang belum diupgrade tidak regresi.

**Rilis:** internal/staged bila memungkinkan; belum perlu mengubah semua tool sekaligus.

### Fase 2 — Color Studio dan Batch WebP Optimizer

- Upgrade Color Picker terlebih dahulu karena menambah nilai pengguna tanpa dependency codec berat.
- Upgrade Gambar ke WebP memakai fondasi batch sebagai implementasi image-to-image pertama.
- Update registry copy, tool guide, regression test, dan E2E.

**Alasan prioritas:** kebutuhan yang paling jelas dari permintaan pengguna (ambil warna dari gambar dan pilih banyak gambar) serta memberikan validasi fondasi batch lebih awal.

### Fase 3 — Batch WebP Converter

- ✅ Antrean batch, output global, hasil per item, ZIP, parser animasi, dan verifikasi signature sudah diport ke WebP ke Gambar.
- Sisa: QA codec Chrome/Firefox/Safari untuk PNG/JPG/GIF/BMP/AVIF serta uji perangkat low-memory.

### Fase 4 — PDF Composer dan PDF Render Studio

- Tingkatkan pengalaman susun gambar dan pilih halaman dengan komponen antrean/thumbnail yang sama.
- Tambahkan ZIP untuk PDF ke gambar dan output validation.
- Profilkan pdf.js/pdf-lib untuk dokumen batas atas; gunakan cleanup page/canvas secara disiplin.

### Fase 5 — Text & Data Formatter

- Tambahkan mode berdasarkan parser yang aman, dimulai JSON/text lalu CSV/URL list.
- Fokus pada kualitas pesan validasi, statistik transformasi, dan zero persistence.

### Fase 6 — Hardening, dokumentasi, dan observability aman

- Lengkapi cross-browser/mobile/accessibility QA.
- Audit dependency/lisensi serta kerentanan setelah dependency baru ditambahkan.
- Tinjau bundle analyzer, asset caching, CSP Worker/WASM, dan log error agar tidak membocorkan data pengguna.
- Perbarui semua panduan publik, sitemap/static params bila ada tool baru, dan materi katalog.

---

## 9. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Batch besar menghabiskan memori | Tab crash atau perangkat lambat | Limit total/pixel, proses berurutan, downsample saat analisis, cleanup eksplisit, benchmark perangkat mobile. |
| Browser mem-fallback ke format lain | File berekstensi salah/korup | Validasi MIME + signature sebelum memberi unduhan atau menambahkan ke ZIP. |
| URL gambar tidak mendukung CORS | Tidak bisa baca piksel/palet | Jelaskan CORS, tanpa proxy, tawarkan unduh lalu pilih file lokal. |
| ZIP sangat besar | Memori melonjak saat membuat archive | Batasi jumlah/ukuran hasil, hitung estimasi bila bisa, buat ZIP hanya atas aksi pengguna, evaluasi streaming di spike. |
| Worker/WASM tidak kompatibel dengan CSP/bundler | Codec gagal di produksi | Self-host asset, test build produksi, capability notice, fallback format. |
| Scope creep | Tool menjadi rumit dan lambat dirilis | P0/P1/P2 jelas, setiap fase punya acceptance criteria dan rilis mandiri. |
| Drag-and-drop tidak aksesibel | Pengguna keyboard terhambat | Kontrol move up/down dan input file selalu ada. |
| History/preference membocorkan data | Risiko privasi | Simpan hanya setting non-sensitif; tidak ada file, nama file, hasil, teks, URL, atau warna personal di persistence. |

---

## 10. Definisi selesai untuk program upgrade

Program ini dianggap selesai setelah setiap tool yang ditetapkan pada P0:

- mempunyai aksi utama dan fitur lanjutan yang tercantum di atas;
- memakai pola queue/result/privacy/accessibility yang konsisten;
- tidak melakukan upload atau penyimpanan data pengguna;
- menangani partial failure tanpa kehilangan hasil yang valid;
- memiliki test murni dan E2E sesuai fitur;
- lulus QA browser/perangkat target;
- sudah memperbarui metadata katalog dan panduan publik; dan
- telah dideploy melalui CI hijau tanpa regresi tool yang telah ada.

Fitur P1/P2 yang belum lulus spike atau QA tidak diberi label “tersedia”; UI harus menyembunyikannya atau menandainya sebagai rencana secara jujur.
