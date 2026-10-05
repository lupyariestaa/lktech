# Dokumentasi Pengembangan LKTech

Folder ini berisi dokumentasi pengembangan (development docs) untuk proyek
LKTech — bukan dokumentasi user-facing. Semua catatan teknis, rencana, alur
implementasi, dan status task ditulis di sini agar rapi & mudah dilacak.

## Konvensi penamaan

```
docs/
  README.md                         # indeks ini
  YYYY-MM-DD-<slug-fitur>.md        # satu dokumen per task/fitur besar
```

Contoh: `2026-02-14-auth-split-dan-produk.md`

## Isi yang disarankan per dokumen

- **Ringkasan** — apa yang dikerjakan & mengapa.
- **Tujuan / Scope** — batasan jelas (in-scope & out-of-scope).
- **Keputusan desain** — pilihan arsitektur + alasan (dan alternatif yang ditolak).
- **Alur implementasi** — langkah/tahapan teknis.
- **Daftar file** — file baru/diubah beserta perannya.
- **Status task** — checklist progres (Done / In Progress / Todo).
- **Catatan operasional** — env, migrasi data, langkah manual, dll.

## Daftar dokumen

### Dokumen task / fitur (berdasarkan tanggal)

| Tanggal    | Dokumen                                                                 | Status      |
| ---------- | ----------------------------------------------------------------------- | ----------- |
| 2026-02-14 | [Auth split (admin/user) + Sistem Produk](2026-02-14-auth-split-dan-produk.md) | Selesai |
| 2026-10-02 | [Rencana Upgrade Sistem Media (M1–M6)](2026-10-02-media-system-upgrade.md) | Selesai |
| 2026-10-02 | [Upgrade Sidebar Dashboard Admin (audit UI/UX + task flow)](2026-10-02-sidebar-dashboard-upgrade.md) | Selesai |
| 2026-10-02 | [Modul Admin Orders/Pesanan (audit + task flow)](2026-10-02-orders-admin-module.md) | Selesai |
| 2026-10-02 | [Revisi Sistem Produk (galeri, lightbox, ratio 16:9, kanvas paket, alur pilih paket)](2026-10-02-revisi-sistem-produk.md) | Selesai |
| 2026-10-02 | [Prompt Generate Image Cover Produk (6 prompt)](2026-10-02-prompt-image-cover-produk.md) | Referensi |
| 2026-10-02 | [Upgrade Sistem Portfolio (audit + task flow)](2026-10-02-upgrade-sistem-portfolio.md) | Selesai |
| 2026-10-02 | [Prompt Ekstraksi Data Portofolio (untuk agent project klien)](2026-10-02-prompt-ekstraksi-data-portofolio.md) | Referensi |
| 2026-10-02 | [Upgrade Sistem Layanan (landing bergantian + detail hardcoded)](2026-10-02-upgrade-sistem-layanan.md) | Selesai |
| 2026-10-03 | [Peningkatan Blog — SEO & Discovery (kategori, tag, RSS, JSON-LD)](2026-10-03-peningkatan-blog-seo-discovery.md) | Selesai |
| 2026-10-03 | [Halaman Harga / Paket Publik (`/harga`)](2026-10-03-halaman-harga-publik.md) | Selesai |
| 2026-10-05 | [Portal Akun Pengguna — Perluasan (profil, favorit, alamat, pesan lagi)](2026-10-05-portal-akun-pengguna.md) | Selesai |
| 2026-10-05 | [Modul Pengguna & Nomor WhatsApp (profil WA + "Kelola User" dashboard)](2026-10-05-modul-pengguna-dan-whatsapp.md) | Selesai |
| 2026-10-05 | [Email Transaksional ke Pembeli (konfirmasi pesanan & update status)](2026-10-05-email-transaksional-pembeli.md) | Selesai |
| 2026-10-05 | [Kupon / Diskon — Modul Promo (admin + penerapan di keranjang & checkout)](2026-10-05-kupon-diskon.md) | Selesai |
| 2026-10-05 | [Dashboard Analitik Penjualan (grafik omzet, tren pesanan, produk terlaris)](2026-10-05-analitik-penjualan.md) | Selesai |
| 2026-10-05 | [Audit & Rencana Peningkatan: Email Transaksional, Kupon, Analitik](2026-10-05-audit-email-kupon-analitik.md) | Selesai (R0–R7) |
| 2026-10-06 | [🚀 Roadmap Pengembangan (Konsep & Arah Lanjutan)](2026-10-06-roadmap-pengembangan.md) | 📝 Rencana |
| 2026-10-06 | [Fase Detail — Konversi & Closing (Mayar.id, bundling, urgency, abandoned checkout)](2026-10-06-fase-konversi-closing.md) | ✅ P0–P6 selesai (kode) |
| 2026-10-06 | [Setup Pembayaran Online & Unduhan (Mayar.id) — Panduan Operasional](2026-10-06-setup-pembayaran-mayar.md) | 🔧 Setup (aktif) |
| 2026-10-05 | [Ulasan & Rating Produk (verified purchase + moderasi + JSON-LD)](2026-10-05-ulasan-rating-produk.md) | ✅ Selesai (R0–R6) |
| 2026-10-05 | [Operasional & Kualitas Teknis (Tema 4: audit log, rate-limit, env, CI, visual)](2026-10-05-operasional-tema4.md) | ✅ Selesai (O1–O5) |
| 2026-10-05 | [Laporan Otomatis & CRM Mini (Tema 3 lanjutan)](2026-10-05-laporan-crm-mini.md) | ✅ Selesai (L1–L6) |

### Dokumen pendukung (referensi & setup)

| Dokumen | Isi |
| ------- | --- |
| [ADMIN-SETUP.md](ADMIN-SETUP.md) | Panduan mengaktifkan dashboard admin (Firebase Auth + Firestore) |
| [tech-stack.md](tech-stack.md) | Pilihan teknologi & arsitektur proyek |
| [identitas-perusahaan.md](identitas-perusahaan.md) | Profil & identitas resmi LKTech (branding, kontak) |
| [SETUP-LOGO-TEKNOLOGI.md](SETUP-LOGO-TEKNOLOGI.md) | Cara memasang logo teknologi di section marquee |
| [PORTOFOLIO-DATA.md](PORTOFOLIO-DATA.md) | Data proyek portofolio (contoh) |

> Rencana kerja aktif & task yang belum selesai: lihat [`TASK-SELANJUTNYA.md`](../TASK-SELANJUTNYA.md) di root proyek — mulai dari blok **"STATUS & PETA SEKARANG"** di bagian atasnya (kondisi live, fase roadmap, NEXT TASK, konvensi kerja).
