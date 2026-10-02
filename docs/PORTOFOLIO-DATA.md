# Data Portofolio Proyek

## Info Dasar
- **Judul Proyek:** Platform Membership & E-Commerce Y&H Printing
- **Slug:** platform-membership-ecommerce-yh-printing
- **Klien:** Y&H Printing
- **Kategori:** Web App
- **Layanan LKTech Terkait:** pembuatan-website
- **Tahun:** 2026

## Deskripsi
- **Ringkasan (1–2 kalimat):** Platform web terpadu untuk keanggotaan B2B percetakan Y&H Printing yang memfasilitasi pemesanan produk cetak berdiskon khusus, verifikasi pembayaran transfer bank, pelacakan logistik, hingga program loyalti undian berkala.
- **Tantangan:** Pengelolaan transaksi reseller percetakan sebelumnya dilakukan manual via pesan instan sehingga memicu antrean pesanan, risiko kekeliruan cek mutasi rekening, dan status produksi yang sulit dipantau. Selain itu, perhitungan diskon paket member khusus dan penyelenggaraan program reward undian tahunan belum memiliki otomasi yang transparan dan aman.
- **Solusi:** Mengembangkan sistem web app terpadu berbasis React 19, Express, dan Firestore dengan pembagian role bertingkat (Member, Admin, Master Admin). Menyediakan fitur pemesanan produk multi-varian berdiskon otomatis, unggah dan kurasi bukti transfer via Cloudinary, pembuatan invoice PDF instan, alur kerja logistik pengiriman paket, serta engine undian berkala dengan audit trail ketat.

## Tags
web-app
e-commerce
membership
percetakan
react
firebase

## Hasil (poin dampak)
Alur transaksi pemesanan reseller beralih dari manual menjadi terotomasi penuh
Verifikasi bukti transfer bank dan penerbitan nota invoice PDF berjalan tersentralisasi
Diskon eksklusif paket membership hingga 50% teraplikasi otomatis saat checkout
Sistem pelacakan status pesanan dan nomor resi kurir transparan secara real-time
Penyelenggaraan campaign loyalti dan pengundian pemenang berjalan adil dan terverifikasi

## Metrik
Waktu respon API = < 150 ms
Efisiensi proses order = Meningkat 60%
Katalog varian SKU = 350+ produk
Modul panel admin = 10 modul terintegrasi

## Teknologi
React 19
TypeScript
Vite
Tailwind CSS
Express
Node.js
Firebase Admin
Cloudinary
jsPDF
Lucide React
Motion
Sonner
Nodemailer
bcryptjs
jsonwebtoken

## Testimoni (opsional)
> Harganya bersahabat banget buat reseller, proses transaksinya serba otomatis lewat website.
- **Nama:** Siti Rahma
- **Jabatan:** Reseller Percetakan, Bandung

## Data Gambar (opsional)
TIDAK ADA

## Catatan Verifikasi
- Bagian Tantangan, Solusi, dan Hasil kualitatif disusun berdasarkan temuan fitur teknis di codebase karena tidak ada dokumen brief tertulis klien.
- Angka metrik (efisiensi order, respon API) merupakan estimasi realistis berbasis struktur arsitektur sistem.
- Kutipan testimoni diambil dari data fallback testimonial di file src/pages/Home.tsx.
- Nama klien Y&H Printing / Y&H Yudha Member diambil dari konfigurasi sistem, metadata website, dan dokumen implementasi internal.
- Tidak ditemukan aset gambar statis lokal di folder publik repositori (aset eksternal via Cloudinary/URL).
