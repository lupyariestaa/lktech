# LKTech Tools — Product & Technical Development Plan

> **Status:** MVP selesai (F1–F3) + perluasan F2d/F2e (Formatter Teks, PDF ke Gambar) — lihat §14–§16  
> **Disusun:** 2026-11-01  
> **Cakupan:** Space khusus pengguna LKTech yang sudah login, berisi katalog dan workspace tools produktivitas.  
> **Prinsip:** Mulai dari fondasi yang aman dan beberapa tools inti; tambah tools bertahap berdasarkan kebutuhan dan biaya operasional.

## 1. Ringkasan

LKTech Tools adalah area dalam website LKTech yang berfungsi sebagai dashboard/studio untuk menemukan dan menggunakan berbagai tools praktis. Pengguna harus login untuk membuka space maupun menjalankan tool. Pengalaman awal berupa katalog yang dapat dicari dan difilter, lalu setiap tool memiliki halaman/workspace tersendiri.

Rilis awal difokuskan pada portal dan 2–3 tools ringan. Kandidat yang disebutkan: **Color Picker**, konversi gambar (**gambar ke WebP**), serta konversi PDF/gambar (PDF ke gambar dan gambar ke PDF). Tools lain dapat ditambahkan sebagai backlog. Tidak ada riwayat penggunaan yang disimpan pada MVP.

Pada fase pengembangan, akses direncanakan tanpa biaya. Arah bisnis berikutnya adalah kemungkinan biaya **Rp10.000** untuk membuka akses semua tools dan penggunaan unlimited. Ini adalah rencana, bukan harga/fitur yang sudah disahkan atau harus aktif pada MVP. Model penagihan, masa berlaku, batas wajar penggunaan, metode pembayaran, dan penanganan biaya layanan eksternal masih perlu diputuskan.

## 2. Tujuan dan indikator keberhasilan

- Menyediakan satu tempat terpusat untuk tools yang berguna bagi pengguna LKTech.
- Membuat tools mudah ditemukan melalui pencarian, kategori, deskripsi, dan status akses.
- Menjaga pengalaman tetap konsisten dengan brand, komponen, navigasi, dan responsivitas website LKTech.
- Mengutamakan pemrosesan lokal di browser untuk file/gambar bila layak, agar privasi lebih baik dan biaya server lebih rendah.
- Memastikan halaman dan API terlindungi oleh autentikasi server-side, bukan sekadar menyembunyikan UI.
- Menambah tools secara modular tanpa membuat katalog dan setiap tool saling bergantung.

Indikator setelah rilis dapat mencakup: tools yang paling sering dibuka, keberhasilan penyelesaian aksi, kegagalan konversi, waktu pemrosesan, serta feedback pengguna. Analitik harus menghindari pencatatan isi file/input.

## 3. Keputusan produk yang sudah disepakati

| Area | Keputusan |
|---|---|
| Pengguna | Semua pengguna yang sudah login; tidak memerlukan role khusus pada MVP. |
| Pengalaman | Katalog/dashboard utama, kemudian halaman workspace terpisah per tool. |
| Scope awal | Portal + 2–3 tools inti, bukan membangun semua tool sekaligus. |
| Kandidat tool | Productivity tools umum; termasuk color picker dan alat konversi gambar/PDF yang disebutkan. |
| Riwayat | Tidak disimpan pada MVP; hindari menyimpan file dan input sensitif secara default. |
| Branding | Mengikuti desain dan navigasi LKTech yang sudah ada. |
| Monetisasi | Rencana masa depan: kemungkinan Rp10.000 untuk akses semua tools dan unlimited. Belum menjadi scope implementasi awal. |

## 4. Scope

### In-scope MVP

1. Route/area LKTech Tools yang hanya dapat diakses setelah login.
2. Dashboard katalog dengan search, kategori, kartu tool, deskripsi singkat, dan status ketersediaan.
3. Route workspace tersendiri untuk tiap tool.
4. Pola komponen/kontrak tool yang konsisten: input, validasi, proses, hasil, unduh/reset, loading, error, dan empty state.
5. 2–3 tools terpilih setelah spike kompatibilitas browser dan penilaian keamanan.
6. Pemrosesan lokal untuk file bila memungkinkan; file tidak diunggah atau disimpan di server secara default.
7. Layout responsif, keyboard-accessible, dan selaras dengan desain LKTech.
8. Pengukuran teknis minimum tanpa merekam konten input/file.

### Kandidat backlog (prioritas final belum diputuskan)

- Color Picker: pilih warna dari kontrol visual, tampilkan HEX/RGB/HSL, salin nilai.
- Image to WebP: ubah gambar lokal ke WebP, pilihan kualitas/dimensi bila implementasinya mendukung.
- PDF to Image: render halaman PDF menjadi gambar yang dapat diunduh.
- Image to PDF: susun satu atau beberapa gambar menjadi PDF.
- Tools produktivitas tambahan, misalnya formatter/konverter teks atau generator sederhana.

Jangan menganggap seluruh kandidat di atas pasti masuk rilis MVP. Pilih 2–3 berdasarkan utilitas, kemudahan implementasi, batas ukuran file, kompatibilitas browser, aksesibilitas, dan kebutuhan dependensi.

### Out of scope MVP

- Paket berbayar, checkout, entitlement, billing, invoice, dan pembatalan.
- Klaim komersial “unlimited” tanpa definisi fair-use dan evaluasi biaya.
- Akun/role khusus untuk tools, admin tool-builder, atau marketplace/plugin.
- Penyimpanan permanen file, hasil, riwayat, dan sinkronisasi antar perangkat.
- Pemrosesan AI/API eksternal atau upload file ke layanan pihak ketiga sebelum privasi, biaya, dan persetujuan ditentukan.
- Implementasi semua tools yang tercantum di backlog.

## 5. Struktur halaman dan UX

Rute final harus disesuaikan dengan struktur routing yang ditemukan saat implementasi. Konsep yang disarankan:

```text
/tools                 katalog / dashboard
/tools/[tool-slug]     workspace tool
```

Dashboard memuat:

- Header “LKTech Tools” dengan pengantar singkat dan akses ke navigasi utama.
- Search tools dengan hasil kosong yang jelas.
- Kategori/filter (mis. Gambar, PDF, Warna, Produktivitas).
- Kartu tool berisi nama, manfaat singkat, kategori, dan status (tersedia/akan datang).
- Bila akses berbayar kelak berlaku, tampilkan status entitlement dan CTA yang informatif; jangan tampilkan upsell pada fase gratis kecuali keputusan produk berubah.

Workspace tool memuat:

- Breadcrumb/kembali ke katalog, judul, ringkasan, dan instruksi singkat.
- Area input yang spesifik pada tool; dropzone file harus punya alternatif tombol pilih file.
- Validasi tipe dan batas ukuran/jumlah file dengan pesan yang mudah dimengerti.
- Progres untuk pekerjaan yang lama, pencegahan aksi ganda, serta pembatalan bila didukung.
- Area hasil dengan pratinjau yang aman, unduh/salin, dan reset.
- Penjelasan yang jujur jika proses dilakukan lokal atau data dikirim ke server.
- Error state untuk format tak didukung, file rusak, resource habis, atau proses gagal.

## 6. Autentikasi, otorisasi, dan keamanan

- Terapkan pola autentikasi pengguna yang sudah ada di repo (rencana awal: `UserGuard` untuk pengalaman halaman dan guard server seperti `requireUser` untuk endpoint).
- Redirect pengguna anonim ke alur login LKTech dengan tujuan kembali ke URL tool yang diminta.
- Setiap API/action yang memproses data harus memverifikasi sesi/token di server. UI guard bukan batas keamanan.
- Jangan menerima `uid`, email, role, atau status akses sebagai fakta dari request body; ambil identitas dan entitlement dari sesi/data server yang tepercaya.
- Batasi ukuran, jumlah, MIME/type yang diizinkan, dimensi/resolusi, durasi, dan biaya pemrosesan; jangan percaya ekstensi/nama file saja.
- Bila pemrosesan dilakukan di browser: bersihkan object URL dan buffer setelah selesai/reset, cegah kebocoran antar file, dan jelaskan batas kompatibilitas.
- Bila kelak ada upload/server-side conversion: validasi ulang konten, isolasi proses, timeout, kuota/rate limit, pemindaian yang sesuai, retensi minimum, dan penghapusan terjadwal wajib dirancang sebelum rilis.
- Jangan menaruh rahasia atau kredensial layanan pihak ketiga di bundle klien.
- Pertimbangkan rate limit untuk API mahal dan perlindungan terhadap abuse. “Unlimited” tidak boleh menonaktifkan proteksi kapasitas dan keamanan.
- Tambahkan metadata `noindex` untuk halaman privat bila mengikuti pola halaman akun LKTech; tetap jangan mengandalkan robots sebagai kontrol akses.

## 7. Data dan privasi

MVP tidak memerlukan model data riwayat. Katalog tools dapat berupa konfigurasi statis/registry kode sampai kebutuhan administrasi dinamis terbukti. Simpan hanya data yang memang diperlukan untuk autentikasi, entitlement masa depan, dan agregat operasional yang tidak memuat isi input.

Default privasi: file dan hasil hanya berada di sesi browser dan tidak dikirim ke server kecuali tool memang membutuhkannya dan perilakunya dijelaskan sebelum penggunaan. Jangan menyimpan nama file, konten, prompt, gambar, atau hasil dalam log analitik/error. Jika kelak dibutuhkan riwayat opt-in, tentukan retensi, penghapusan, akses lintas perangkat, dan dasar persetujuannya terlebih dahulu.

## 8. Arsitektur teknis yang disarankan

- **App shell:** gunakan layout dan komponen LKTech yang ada, bukan membuat aplikasi terpisah tanpa kebutuhan.
- **Tool registry:** satu daftar metadata untuk slug, nama, deskripsi, kategori, ikon, status, route, dan kebutuhan akses. Jangan menjadikan registry client-side sebagai kontrol otorisasi.
- **Tool workspace:** modul per tool dengan kontrak UI/proses yang konsisten dan isolasi kode.
- **Pemrosesan:** utamakan Web APIs/library yang berjalan di browser untuk file lokal; lakukan evaluasi ukuran bundle dan lisensi dependensi sebelum menambah library.
- **Server API:** tambahkan hanya jika benar-benar perlu (contoh: layanan eksternal atau pemrosesan server). Setiap endpoint wajib auth, validasi, rate limit, batas biaya dan penghapusan data.
- **Entitlement masa depan:** abstraksikan pemeriksaan “boleh memakai tool” agar nanti bisa membedakan akses gratis/berbayar, tetapi jangan membangun billing spekulatif pada MVP.
- **Observability:** log status/error teknis secara minim dan tersanitasi; analitik hanya event penggunaan yang tidak membawa input.

Detail framework, versi API, folder, auth guard, lint/build, dan panduan Next.js harus diverifikasi terhadap repo dan dokumentasi lokal `node_modules/next/dist/docs/` sebelum kode ditulis. Dokumen ini tidak mengunci pilihan library atau nama file implementasi.

## 9. Rencana fase implementasi

### F0 — Discovery dan keputusan

- Audit routing, layout publik/akun, auth guard, komponen design system, pola API, serta panduan framework lokal.
- Putuskan 2–3 tools MVP, browser minimum, kebutuhan SEO/noindex, batas file, dan dukungan mobile.
- Untuk setiap tool, catat apakah proses lokal atau server, format input/output, dan risiko.

### F1 — Fondasi LKTech Tools

- Buat route terlindungi dan entry point navigasi yang konsisten.
- Bangun dashboard katalog, search, filter, status tool, loading/error/empty states.
- Bentuk tool registry dan pola workspace yang reusable.
- Uji anon redirect, akses langsung, refresh, dan navigasi mobile.

### F2 — Tools inti

- Implementasikan 2–3 kandidat terpilih secara terpisah.
- Tambahkan validasi file, progres, hasil, unduh/salin, reset, dan pesan privasi.
- Uji file valid/rusak/besar, banyak file, browser yang didukung, dan pemakaian memori.

### F3 — Hardening dan QA

- Audit akses seluruh halaman/API, batas resource, aksesibilitas keyboard/screen reader, dan responsivitas.
- Periksa bundle/dependensi/lisensi, error telemetry, kebocoran data, serta performa.
- Jalankan pemeriksaan tipe, lint, test, build dan verifikasi browser sesuai pola repo.

### F4 — Persiapan model berbayar (terpisah dari MVP)

- Tetapkan apakah Rp10.000 adalah pembayaran satu kali, langganan, atau bentuk lain; masa akses dan aturan pembaruan.
- Definisikan “unlimited”/fair-use, batas ukuran file, concurrency, biaya layanan eksternal, abuse, dan komunikasi batas kapasitas.
- Pilih payment provider, webhook idempotency, status entitlement, refund, kegagalan bayar, dukungan pelanggan, pajak/kebijakan yang relevan.
- Uji akses berbayar dan pembatalan sebelum mengiklankan harga. Jangan membuka semua tool hanya berdasarkan status checkout dari klien.

## 10. Acceptance criteria MVP

- Pengguna anonim yang membuka katalog atau workspace diarahkan ke login dan dapat kembali ke tujuan semula.
- Pengguna login dapat menemukan tool dari katalog melalui search/kategori dan membuka workspace.
- Tiap tool punya loading, success, empty/reset, dan error state; alur utama dapat digunakan di desktop dan mobile.
- File yang tidak didukung atau melewati batas ditolak dengan alasan yang jelas sebelum proses dimulai.
- Hasil dapat diunduh/disalin sesuai fungsi tool, dan aksi reset membersihkan state/resource sementara.
- Tidak ada riwayat/file/input yang tersimpan secara default di server.
- Endpoint server (jika ada) memverifikasi auth dan melakukan validasi server-side serta perlindungan resource.
- Akses ditolak tetap berlaku untuk request langsung/API; bukan sekadar kartu/tautan disembunyikan.
- Desain sesuai pola LKTech dan dapat digunakan dengan keyboard; status proses/error tidak disampaikan lewat warna saja.
- Typecheck, lint, test yang relevan, dan build lulus mengikuti skrip repo; tidak ada rahasia di client bundle.

## 11. Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| File besar menghabiskan memori browser | Batas ukuran/dimensi, proses bertahap bila memungkinkan, peringatan, uji perangkat mobile. |
| Privasi file tidak jelas | Default lokal; jelaskan setiap pengiriman; minimalkan log dan retensi. |
| Tool server-side berbiaya atau dapat disalahgunakan | Auth, rate limit, kuota, timeout, batas concurrency dan monitoring biaya. |
| “Unlimited” menghasilkan biaya tak terkendali | Tetapkan fair-use/capacity policy dan hitung biaya sebelum penawaran; jangan menafsirkan unlimited sebagai tanpa proteksi. |
| Banyak tool membuat UI/maintenance tidak konsisten | Registry dan kontrak workspace reusable; rilis bertahap. |
| Dependensi konversi berat/berlisensi tak sesuai | Spike teknis, pemeriksaan ukuran bundle, lisensi, keamanan, dan maintenance sebelum adopsi. |
| User menganggap harga/fitur yang direncanakan sudah aktif | Tandai rencana monetisasi sebagai belum tersedia sampai keputusan dan implementasi disahkan. |

## 12. Keputusan terbuka

1. Tool mana tepatnya yang menjadi 2–3 tool pertama dan urutannya?
2. Batas ukuran file, jumlah file/halaman, format, resolusi, dan browser minimum per tool?
3. Apakah seluruh kandidat dapat diproses lokal dengan kualitas dan performa yang diterima?
4. Di mana entry point muncul pada navbar/akun dan apakah perlu halaman publik pengenalan?
5. Apakah metrik agregat penggunaan diaktifkan, dan berapa lama retensinya?
6. Rp10.000: sekali bayar atau berulang, masa berlaku, kapan mulai ditagih, metode pembayaran dan refund?
7. Apa definisi “unlimited” dan kebijakan fair-use, khususnya untuk tool yang memakai server/API berbayar?
8. Apakah perlu masa gratis/trial atau akses gratis permanen untuk sebagian tool?
9. Apakah diperlukan administrasi katalog/status tool dari dashboard, atau registry kode cukup untuk jangka awal?

## 13. Catatan eksekusi

Dokumen ini adalah rencana produk-teknis, bukan laporan implementasi. Belum ada endpoint, halaman, tool, atau sistem pembayaran yang diklaim selesai. Sebelum mulai coding, audit implementasi auth dan routing aktual, lalu perbarui dokumen dengan keputusan tool MVP, file yang akan disentuh, status fase, serta hasil QA.

---

## 14. F0 — Hasil discovery & keputusan (2026-11-01)

### Temuan kode aktual

- **Auth user:** login Google Firebase di klien; token ID dikirim sebagai
  `Authorization: Bearer` dan diverifikasi server dengan `requireUser(req)`
  (`src/lib/admin-guard.ts`). Tidak ada cookie sesi user (cookie hanya untuk admin).
- **Guard halaman:** pola repo memakai `UserGuard` (klien) yang mengarahkan ke
  `/masuk?next=<path>`; `next` divalidasi `safeRedirectPath`
  (`src/app/masuk/page.tsx`). Dipakai halaman `/akun`.
- **Layout & desain:** root layout hanya memasang provider + analytics; `Navbar`
  dan `Footer` dirakit per halaman. Hero halaman dalam memakai `PageHero`;
  tombol memakai `@/components/ui/button`; ikon `lucide-react`.
- **API user:** pola `src/app/api/user/*` + `requireUser`; klien menyisipkan
  Bearer lewat `getIdToken()` (`src/lib/user-account-api.ts`).
- **Framework:** Next.js 16.3.6 / React 19.3; `params`/`searchParams` berupa
  Promise dan metadata hanya di Server Component (sesuai `node_modules/next/dist/docs/`).

### Keputusan F0

1. **Tools MVP:** Color Picker, Gambar ke WebP, dan Gambar ke PDF.
2. **Pemrosesan:** 100% lokal di browser untuk ketiga tool. Tidak ada endpoint
   server baru dan tidak ada model data riwayat pada MVP. Konsekuensi jujur:
   batas keamanan halaman bersifat UI (`UserGuard`) seperti `/akun`; bila kelak
   ada API, endpoint wajib `requireUser` + validasi server-side.
3. **Image→PDF:** memakai `pdf-lib` **1.17.1 (MIT)**, di-`dynamic import` hanya
   saat tool dibuka agar tidak membebani bundle halaman lain.
4. **Rute:** `/tools` (katalog) dan `/tools/[slug]` (workspace); keduanya
   `noindex, nofollow` dan dilindungi `UserGuard`.
5. **Registry:** konfigurasi kode murni `src/lib/tools-registry-pure.ts`
   (bukan kontrol otorisasi).
6. **Batas default:** gambar ≤ 15 MB/berkas; ≤ 20 gambar untuk PDF; dimensi
   output maks 4096 px; kualitas WebP 0.1–1.0; tipe divalidasi dengan decode,
   bukan ekstensi.
7. **Monetisasi/entitlement:** belum aktif; abstraksi disiapkan tetapi tidak
   ada billing pada MVP (F4 terpisah).

### Rencana sprint & file

| Sprint | Isi | File utama |
|---|---|---|
| F1a | Registry + logika pencarian/filter murni + tes | `src/lib/tools-registry-pure.ts`, `scripts/tools-registry.test.ts` |
| F1b | Katalog `/tools`, kartu, search/filter, empty state, entry point | `src/app/tools/page.tsx`, `src/components/tools/*` , `src/lib/nav.ts`, `src/components/auth/account-overview.tsx` |
| F1c | Workspace `/tools/[slug]` + shell + dispatch + 404 | `src/app/tools/[slug]/page.tsx`, `src/components/tools/tool-workspace.tsx`, `tool-shell.tsx` |
| F2a | Color Picker + helper murni | `src/components/tools/color-picker-tool.tsx`, `src/lib/tools/color-pure.ts` |
| F2b | Gambar ke WebP + validasi/limit | `src/components/tools/image-to-webp-tool.tsx`, `src/lib/tools/image-tool-pure.ts` |
| F2c | Gambar ke PDF (pdf-lib dynamic import) | `src/components/tools/image-to-pdf-tool.tsx`, `scripts/tools-image.test.ts` |
| F2d | Formatter Teks (JSON pretty/minify, rapikan teks) | `src/components/tools/text-formatter-tool.tsx`, `src/lib/tools/text-pure.ts`, `scripts/tools-text.test.ts` |
| F2e | PDF ke Gambar (pdf.js self-host, rentang halaman) | `src/components/tools/pdf-to-image-tool.tsx`, `src/lib/tools/pdf-tool-pure.ts`, `scripts/copy-pdfjs-assets.mjs`, `scripts/tools-pdf.test.ts` |
| F3 | Hardening/QA: a11y, batas, bundle, tsc/lint/test/build | — |
| F4 | Model berbayar | di luar cakupan sekarang |

### Status

- F0: ✅ selesai (dokumen ini).
- F1: ✅ selesai (registry, katalog `/tools`, workspace `/tools/[slug]`, entry point
  nav + akun, `robots.txt`).
- F2a: ✅ selesai (Color Picker + `color-pure` + tes).
- F2b/F2c: ✅ selesai (Gambar ke WebP & Gambar ke PDF + `image-tool-pure` + tes).
- F2d/F2e: ✅ selesai (Formatter Teks & PDF ke Gambar + `text-pure`/`pdf-tool-pure` + tes; lihat §16).
- F3: ✅ selesai (lihat §15).
- F4: ⏸️ di luar cakupan.

## 15. F3 — Hardening/QA (2026-11-01)

### Verifikasi

- `npx tsc --noEmit` — bersih.
- `npx eslint .` — bersih.
- `npm run test:unit` — **1082 lulus / 0 gagal** (termasuk 11 tes registry, 11 tes
  warna, dan 9 tes gambar).
- `npm run build` — sukses; rute statis terbentuk: `/tools`,
  `/tools/color-picker`, `/tools/image-to-webp`, `/tools/image-to-pdf`.
- **Bundle:** `pdf-lib@1.17.1` berada di chunk lazy terpisah (~431 KB) dan
  **tidak** termasuk chunk yang dimuat saat `/tools/image-to-pdf` dibuka; UI
  tool (~36 KB) dimuat lebih dulu dan library baru diambil saat tombol
  "Buat PDF" ditekan.

### Batas & perilaku

- Gambar ≤ 15 MB/berkas, ≤ 20 gambar per PDF, sisi terpanjang hasil 4096 px,
  kualitas WebP 0.1–1.0 (di-clamp).
- Tipe berkas divalidasi dengan **decode** (bukan ekstensi); jika decode gagal,
  tool menampilkan pesan kesalahan dan tidak menghasilkan berkas.
- WebP: browser yang tidak dapat meng-encode WebP ditolak dengan pesan jelas;
  bila blob yang dikembalikan bukan `image/webp`, proses dibatalkan.
- Object URL dan bitmap dilepas saat reset, ganti berkas, dan unmount.
- PDF: urutan gambar dapat diubah; margin & ukuran halaman diatur; halaman
  "sesuaikan gambar" memakai ukuran gambar itu sendiri.

### Aksesibilitas

- Dropzone memakai tombol yang dapat difokus keyboard (seret-lepas hanya
  alternatif).
- Semua kontrol memiliki label; filter katalog memakai `aria-pressed`; input
  HEX menandai `aria-invalid`.
- Status/progres diumumkan lewat wilayah `aria-live="polite"`.

### Keterbatasan jujur

- Batas keamanan halaman bersifat **UI** (`UserGuard`), sama seperti `/akun`.
  Tidak ada endpoint atau data server pada MVP, sehingga tidak ada otorisasi
  server-side yang perlu/tersedia.
- PDF dibuat dengan me-render ulang gambar ke PNG/JPEG lewat kanvas; hasilnya
  mengikuti codec browser, bukan konversi lossless.
- Kelima tool registry kini berstatus "tersedia" dan punya rute workspace
  (PDF ke Gambar & Formatter Teks menyusul di §16).
- Belum ada riwayat penggunaan, kuota, atau model berbayar (F4 terpisah).

## 16. F2d/F2e — Formatter Teks & PDF ke Gambar (2026-11-02)

Melanjutkan registry: dua tool yang terakhir berstatus "segera" kini **tersedia**,
sehingga kelima tool punya workspace.

### Formatter Teks (`text-formatter`)

- `src/lib/tools/text-pure.ts` + `scripts/tools-text.test.ts` (11 tes);
  komponen `src/components/tools/text-formatter-tool.tsx`.
- Mode: rapikan JSON (`json-pretty`, indentasi 2/4/tab), minify JSON, dan rapikan
  teks biasa (samakan akhir baris, buang spasi ujung, ringkas baris kosong).
- Opsi "urutkan kunci" menyortir kunci objek secara rekursif (array tetap pada urutannya).
- Batas lunak input **2.000.000 karakter**, dilaporkan jujur bila terlampaui.
- Hasil dapat disalin atau diunduh (`.json`/`.txt`).

### PDF ke Gambar (`pdf-to-image`)

- `src/lib/tools/pdf-tool-pure.ts` + `scripts/tools-pdf.test.ts` (8 tes);
  komponen `src/components/tools/pdf-to-image-tool.tsx`.
- **pdf.js `pdfjs-dist@6.4.299` (Apache-2.0)** di-`dynamic import`; JS inti (~423 KB)
  hanya dimuat saat **berkas PDF dipilih**, bukan saat halaman tool dibuka.
- Worker & aset runtime **di-self-host** di `public/pdfjs/` (worker, `cmaps`,
  `standard_fonts`, `wasm`, `iccs`) lewat `scripts/copy-pdfjs-assets.mjs`
  (`predev`/`prebuild`). `GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs"`
  (worker dibuat sebagai `{ type: "module" }`, same-origin — sesuai CSP
  `worker-src 'self'`).
- `public/pdfjs/` masuk `.gitignore` dan daftar `ignores` ESLint (aset pihak ketiga,
  tidak di-lint).

### Batas & perilaku

- PDF ≤ **25 MB**/berkas, ≤ **30 halaman per proses** (kelebihan dipotong & dilaporkan),
  skala render **0,5–3**, sisi terpanjang gambar **≤ 4096 px** (di-clamp).
- Pemilihan halaman: kosong = semua; mendukung `1-3,5` juga bentuk terbuka `-4`/`8-`.
- PDF berpassword (`PasswordException`) & PDF rusak (`InvalidPDFException`) ditolak
  dengan pesan spesifik.
- Object URL & dokumen pdf.js dilepas saat reset, ganti berkas, dan unmount.
- Unduhan per halaman; browser umumnya memblokir unduhan massal otomatis.

### Verifikasi

- `npx tsc --noEmit` — bersih.
- `npx eslint .` — bersih.
- `npm run test:unit` — **1101 lulus / 0 gagal** (1082 + 11 tes teks + 8 tes PDF).
- `npm run build` — sukses; rute statis mencakup `/tools/text-formatter` dan
  `/tools/pdf-to-image`; `prebuild` menyalin aset `/pdfjs/*` untuk disajikan.
- Server produksi (`next start`) diuji: `/pdfjs/pdf.worker.min.mjs`,
  `cmaps`, `standard_fonts`, `wasm`, dan `iccs` semua **200**, serta
  `/tools/pdf-to-image` **200**. JS inti pdf.js (~423 KB) berada di chunk lazy
  terpisah dan **tidak** ada di HTML awal halaman.
