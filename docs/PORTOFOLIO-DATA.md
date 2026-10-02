# Data Portofolio Proyek

## Info Dasar
- **Judul Proyek:** Duitin — SaaS Pengelolaan Keuangan Pribadi
- **Slug:** duitin-saas-pengelolaan-keuangan-pribadi
- **Klien:** Duitin (brand produk perangkat lunak keuangan milik pengembang)
- **Kategori:** Web App
- **Layanan LKTech Terkait:** pembuatan-website
- **Tahun:** 2025

## Deskripsi
- **Ringkasan (1–2 kalimat):** Duitin adalah platform SaaS pengelolaan keuangan pribadi berbasis web yang membantu pengguna mencatat pemasukan/pengeluaran, budgeting, utang-piutang, target tabungan, hingga laporan grafik, lengkap dengan CMS admin multi-role dan sistem langganan berbayar.
- **Tantangan:** Banyak orang kesulitan melacak arus kas karena mencatat keuangan secara manual di spreadsheet yang rumit dan rentan salah hitung, sementara catatan utang piutang serta tagihan rutin sering terlewat. Aplikasi keuangan yang beredar umumnya penuh iklan dan meminta izin data yang berlebihan. Klien membutuhkan satu platform terpusat yang aman, privat, dan mudah dipahami untuk mengelola seluruh kondisi finansial dalam satu tempat.
- **Solusi:** Duitin dibangun sebagai aplikasi web modern satu pintu yang menggabungkan pencatatan transaksi, budgeting dengan peringatan limit, pelacakan utang-piutang, saving goals, reminder tagihan, dan laporan analitik real-time. Sistem autentikasi Firebase dengan role-based access control memisahkan akses member dan admin, sedangkan pembayaran langganan diotomasi lewat Midtrans Snap berikut verifikasi webhook di sisi server. Seluruh modul dapat dikelola mandiri oleh admin melalui CMS internal.

## Tags
saas
aplikasi keuangan
keuangan pribadi
web app
firebase
midtrans

## Hasil (poin dampak)
Aplikasi web resmi yang dapat diakses 24 jam
Pencatatan pemasukan, pengeluaran, dan utang piutang terpusat
Budgeting dengan peringatan otomatis saat limit mendekati batas
Ekspor laporan keuangan ke PDF & Excel (.xlsx)
Sistem langganan berbayar dengan aktivasi akun otomatis
CMS admin multi-role untuk mengelola member, paket, dan konten

## Metrik
Modul member = 8 tab (Overview, Transactions, Debts, Budgeting, Savings, Reports, Reminders, Settings)
Modul admin CMS = 7 tab (Overview, Members, Staff, Plans, FAQs, Broadcasts, Settings)
Harga langganan = Rp 29.000 / 30 hari
Rating kepuasan = 4.9 / 5.0
Waktu muat = < 3 detik

## Teknologi
React 19
TypeScript
Vite
Tailwind CSS
Express
Firebase (Authentication, Firestore, Cloud Functions)
Firebase Admin SDK
Midtrans (Payment Gateway)
Cloudinary (Media Upload)
Google Gemini AI (@google/genai)
Recharts
jsPDF
SheetJS (xlsx)
Motion
Lucide React
Vitest

## Testimoni (opsional)
> "Sebagai freelancer dengan income fluktuatif, dulu saya sering bingung uang lari ke mana. Fitur multi-rekening & budgeting di Duitin bikin saya bisa pisahkan dana operasional, pajak, dan tabungan pribadi secara otomatis."
- **Nama:** Rian Pratama
- **Jabatan:** Freelance UI/UX Designer & Remote Worker

## Data Gambar (opsional)
public/image/Logo-Duitin.svg
public/image/feature-budgeting.svg
public/image/feature-export.svg
public/image/feature-grafik.svg
public/image/feature-pencatatan.svg
public/image/feature-reminder.svg
public/image/feature-tabungan.svg
public/image/feature-utang.svg
public/image/showcase-overview.svg
public/image/showcase-transactions.svg
public/image/showcase-debts.svg
public/image/showcase-budgeting.svg
public/image/showcase-reports.svg
public/image/avatar-1.svg
public/image/avatar-2.svg
public/image/avatar-3.svg
public/videos/pricing-bg.mp4

## Catatan Verifikasi
- Nama klien tidak ditemukan sebagai badan usaha/instansi tertulis di repo; "Duitin" adalah brand nama produk (diambil dari metadata.json dan konfigurasi aplikasi), mohon dikonfirmasi apakah ini proyek internal/LKTech sendiri atau untuk klien eksternal.
- Tahun pengerjaan: dokumen audit (audit/INDEX.md) tertulis "March 2025" namun git log komit terbaru bertanggal 2026-09-03; diambil 2025 dari dokumen audit resmi, mohon disesuaikan bila tanggal pengerjaan sebenarnya berbeda.
- Bagian Tantangan & Solusi disusun secara realistis dari fitur yang ada di kode (tidak ada dokumen brief klien tertulis) -> perlu ditinjau ulang.
- Bagian Hasil (dampak) merupakan penyusunan ulang dari fitur teknis, bukan klaim dampak bisnis terukur.
- Metrik: hanya "8 tab member", "7 tab admin", dan "harga Rp 29.000/30 hari" yang bersumber dari kode/audit; angka "Rating 4.9/5.0" diambil dari konten hero/landing (bersifat marketing internal), dan "Waktu muat < 3 detik" adalah estimasi yang dikarang.
- Testimoni diambil dari section TestimonialsSection.tsx pada landing page. Testimoni ini tampaknya disusun sebagai konten marketing internal, bukan testimoni klien nyata -> perlu dikonfirmasi keasliannya sebelum dipublikasikan.
