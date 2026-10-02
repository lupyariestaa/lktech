# Data Portofolio Proyek

## Info Dasar
- **Judul Proyek:** KOSMO — Toko Online Instrumen Meja Kerja dengan Checkout WhatsApp
- **Slug:** kosmo-toko-online-instrumen-meja-kerja
- **Klien:** KOSMO Instruments (konsep merek; alamat, email, dan nomor kontak masih placeholder di `src/config/business.js`)
- **Kategori:** E-commerce
- **Layanan LKTech Terkait:** pembuatan-website
- **Tahun:** 2026

## Deskripsi
- **Ringkasan (1–2 kalimat):** Toko online untuk merek perangkat meja kerja presisi bernama KOSMO — menampilkan katalog 10 produk dalam 5 kategori dengan keranjang belanja nyata, penyimpanan keranjang di browser, dan checkout yang mengirim rincian pesanan langsung ke WhatsApp. Tanpa payment gateway; WhatsApp menjadi kanal pemesanan akhir.
- **Jumlah Halaman/Layar:** 7 halaman/route (`/`, `/katalog`, `/katalog/:categoryId`, `/produk/:slug`, `/keranjang`, `/teknologi`, `/tentang`, plus halaman 404 catch-all) yang dibangun dari 7 modul section beranda + 18 komponen.
- **Tantangan (OPSIONAL):** Selama pengujian dengan browser otomatis (Puppeteer) ditemukan beberapa cacat nyata yang tidak terlihat dari pemeriksaan kode saja: (1) seluruh section di bawah layar tampil kosong karena `IntersectionObserver` dengan `threshold: 0.12` tidak pernah terpicu pada elemen tinggi saat scroll cepat; (2) halaman bisa di-scroll horizontal hingga 682px di mobile akibat margin negatif pada rail produk unggulan; (3) 161 kegagalan kontras warna WCAG AA karena token `--text-muted: #8b8e94` hanya mencapai rasio 2,9:1; (4) slider filter harga berukuran 240px di mobile karena `flex-basis` pada layout kolom berubah menjadi tinggi; (5) badge "Pre-order" tampil ganda, dan angka ulasan di section testimoni saling bertentangan.
- **Solusi (OPSIONAL):** Setiap temuan diperbaiki di akarnya lalu diverifikasi ulang, bukan sekadar ditekan. Hook `useReveal` ditulis ulang dengan prinsip "fail visible" (`threshold: 0` + timer backstop) sehingga konten tidak mungkin permanen tersembunyi; rail produk dipin ke lebar viewport dan `overflow-x: clip` diterapkan di root; token warna digelapkan (`--text-muted: #6b6e75`, hijau WhatsApp diperdalam) hingga audit kontras kembali 0 kegagalan; slider diberi tinggi 44px agar memenuhi target sentuh; data ulasan diturunkan otomatis dari katalog sehingga tidak bisa lagi bertentangan. Verifikasi dijalankan pada build produksi: 45 kombinasi route × viewport, uji ketahanan animasi reveal, audit kontras WCAG AA, dan pengujian alur belanja end-to-end — semuanya tanpa masalah.

## Tags
toko-online
e-commerce
whatsapp-checkout
react
responsive
umkm

## Hasil (OPSIONAL — poin dampak)
- Proyek berhasil di-build dan dijalankan sebagai build produksi tanpa error (`npm run build`, `vite preview`), dengan verifikasi otomatis pada 45 kombinasi route × viewport menghasilkan 0 masalah.
- Alur belanja end-to-end berfungsi: tambah ke keranjang, ubah jumlah, hapus item, keranjang bertahan setelah refresh, validasi form, hingga pembuatan pesan WhatsApp — 12 dari 12 pemeriksaan isi pesan lolos.
- Aksesibilitas diperbaiki hingga 0 kegagalan kontras WCAG AA pada 6 tipe halaman, dengan 88 atribut ARIA, skip-link, focus state, dan dukungan `prefers-reduced-motion`.
- Catatan: klaim dampak bisnis (penjualan, konversi, kunjungan) TIDAK dapat diverifikasi karena ini proyek konsep tanpa data pengguna nyata.

## Metrik (OPSIONAL)
Halaman/route = 7 halaman (termasuk 404 catch-all)
Modul section beranda = 7 section
Komponen = 18 komponen (brand, cart, layout, product, ui, icons)
Produk dalam katalog = 10 produk
Kategori produk = 5 kategori
Ikon SVG kustom = 28 ikon (tanpa library ikon pihak ketiga)
Jumlah atribut ARIA = 88
Ukuran build produksi = 290 kB JS (88 kB gzip) + 103 kB CSS (17 kB gzip)

## Teknologi
React 18
React Router DOM 6
Vite 5
CSS murni (satu stylesheet global + 26 berkas CSS per-komponen, bukan CSS Modules)
SVG inline (ilustrasi produk & ikon dibuat sendiri, tanpa file gambar)
Web Storage API (localStorage untuk persistensi keranjang)
WhatsApp Click-to-Chat API (wa.me deep link)
Google Fonts (Inter Tight & Inter)

## Testimoni (OPSIONAL)
> SKIP
- **Nama:** SKIP
- **Jabatan:** SKIP
- *(Alasan: section testimoni di dalam situs memuat kutipan fiktif dan kode secara eksplisit menyatakan "Ulasan dan angka pada bagian ini adalah konten ilustratif untuk konsep merek KOSMO, bukan data terverifikasi dari sumber eksternal." Tidak ada testimoni klien nyata di dalam proyek.)*

## Data Gambar (opsional)
TIDAK ADA
*(Proyek ini tidak menyimpan screenshot atau foto produk. Seluruh visual produk digambar sebagai SVG inline melalui `src/components/product/ProductVisual.jsx`, dan satu-satunya berkas gambar di repo adalah `referensi-design.jpg` (gambar acuan desain, bukan aset situs) serta `public/favicon.svg` (favicon). Screenshot untuk keperluan portofolio perlu diambil sendiri dengan menjalankan `npm run dev`.)*

## Catatan Verifikasi
- Nama klien "KOSMO Instruments" diambil dari `src/config/business.js` dan tidak dapat dikonfirmasi sebagai entitas bisnis nyata — ini konsep merek. Mohon dikonfirmasi.
- Nomor WhatsApp, email (`halo@kosmo.id`), alamat (Jl. Cihampelas No. 118, Bandung), dan tautan media sosial di `src/config/business.js` masih placeholder dan WAJIB diganti sebelum situs dipakai sungguhan.
- Tahun 2026 diambil dari tahun berjalan karena proyek ini BUKAN repositori git (tidak ada `.git`), sehingga tidak ada git log untuk memverifikasi tanggal pengerjaan. Berkas sumber paling awal bertanggal 2 Oktober 2026.
- Tidak ada README, .env, atau dokumentasi apa pun di dalam proyek; seluruh deskripsi disimpulkan dari pembacaan kode, `package.json`, `index.html`, dan `src/config/business.js`.
- Jumlah "7 halaman" dihitung dari definisi `<Route>` di `src/App.jsx`. Karena ini Single Page Application, semuanya dilayani dari satu `index.html`.
- Bagian Tantangan/Solusi diisi berdasarkan temuan cacat yang benar-benar terjadi dan diperbaiki selama sesi pengujian proyek ini (terverifikasi lewat skrip Puppeteer yang dijalankan terhadap dev server dan build produksi), bukan klaim dampak bisnis.
- Angka pada bagian Metrik dihitung langsung dari berkas sumber (jumlah route, komponen, produk, ikon, dan ukuran output build), bukan estimasi.
- Belum ada pengujian unit/integration formal (tidak ada Jest/Vitest/Playwright di `package.json`); pengujian yang dilakukan bersifat manual melalui skrip browser sementara yang tidak disertakan ke dalam repo.
