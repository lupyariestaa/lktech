# LKTech Tools — Product & Technical Development Plan

> **Status:** Rencana / belum diimplementasikan  
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
