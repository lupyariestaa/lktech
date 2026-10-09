# Gap Audit — Hasil Eksekusi Upgrade Blog (B0–B8)

> Cross-check hasil implementasi terhadap `2026-10-09-planning-upgrade-blog.md`
> dan `2026-10-09-task-upgrade-blog.md`. Status: **temuan, menunggu persetujuan**.
> Tidak ada kode yang diubah oleh audit ini.

## Cara membaca

- **Severity**: `Tinggi` = bisa merusak data/keamanan/UX utama; `Sedang` = fitur
  tidak sesuai rencana atau rawan regresi; `Rendah` = kualitas/konsistensi.
- **Status verifikasi**: `Terverifikasi` = sudah dicek di kode; `Dugaan` = perlu
  diuji manual atau dengan test.

## Temuan

### G1 — Aksi massal ikut menyalin field `id` ke penyimpanan
- **Severity**: Rendah · **Status**: Terverifikasi
- **Lokasi**: `src/app/api/admin/articles/bulk/route.ts` (publish/unpublish).
- **Gap**: `current` berasal dari `getStoredArticles()` yang mengembalikan `id`
  (doc id). `next = { ...current, status }` lalu `saveArticle(next)` ikut
  membawa `id` ke payload Firestore (field `id` tersimpan di dokumen).
- **Dampak**: data tidak konsisten (field `id` ganda dengan doc id), tidak
  mengganggu tampilan tetapi kotor.
- **Perbaikan usulan**: buang `id` sebelum simpan (destructure `{ id, ...rest }`).

### G2 — Estimasi baca tidak tampil di editor (B3.3 belum lengkap)
- **Severity**: Sedang · **Status**: Terverifikasi
- **Lokasi**: `src/components/admin/markdown-editor.tsx`, `articles-manager.tsx`.
- **Gap**: rencana B3.3 minta "penghitung kata dan estimasi waktu baca".
  Editor hanya menampilkan jumlah kata (`{words} kata`). `readingMinutes()` di
  `article-editor.ts` sudah ada dan dites, tetapi tidak dipanggil di UI.
- **Perbaikan usulan**: tampilkan "N kata · ~M menit baca" memakai `readingMinutes`.

### G3 — Route API artikel tidak punya test
- **Severity**: Sedang · **Status**: Terverifikasi
- **Lokasi**: `src/app/api/admin/articles/route.ts`, `bulk/route.ts`,
  `src/app/api/cron/articles/route.ts`.
- **Gap**: semua test blog menguji fungsi murni. Logika yang berisiko justru ada
  di route: validasi, `renamedFrom`/`slugHistory`, audit (publish/unpublish/
  duplicate), batas 50 item bulk, guard cron (`CRON_SECRET`). Tidak ada test
  yang menjaga kontrak ini.
- **Perbaikan usulan**: ekstrak keputusan (mis. `decideAuditAction`,
  `buildSlugHistory`, `checkCronSecret`) ke fungsi murni dan tambahkan test.
  Tidak perlu framework HTTP.

### G4 — Rename slug: riwayat tidak dibersihkan saat slug kembali ke asal
- **Severity**: Rendah · **Status**: Dugaan
- **Lokasi**: `route.ts` baris ~84–95 (`slugHistory`).
- **Gap**: jika artikel A → B → A, `history` menghapus `A` (`history.delete(slug)`),
  itu benar. Tetapi jika ada dua artikel yang slug lamanya sama (mis. A rename ke
  B, lalu artikel C dibuat dengan slug A), redirect dari `/blog/A` akan
  bertabrakan: halaman `A` (C) tampil lebih dulu daripada redirect ke B. Ini
  perilaku benar secara urutan, tetapi tidak dijaga/dites.
- **Perbaikan usulan**: tolak pembuatan artikel dengan slug yang ada di
  `slugHistory` artikel lain (atau beri peringatan di UI). Tambahkan test.

### G5 — Tidak ada `prefers-reduced-motion` di komponen blog baru
- **Severity**: Sedang · **Status**: Terverifikasi
- **Lokasi**: `src/components/blog/article-toc.tsx`, `article-share.tsx`,
  halaman `/blog` (`blog-index.tsx`).
- **Gap**: rencana B6.8 meminta pola reduced-motion seperti beranda. Komponen
  blog baru memakai transisi (`transition-colors`, `transition-transform`,
  `scroll` default pada TOC) tanpa `motion-reduce:` atau pengecekan preferensi.
  Scroll otomatis (anchor TOC) tidak dihormati pengaturan reduced-motion.
- **Perbaikan usulan**: tambahkan `motion-reduce:transition-none` pada transisi
  dan `scroll-behavior: auto` untuk pengguna reduced-motion pada tautan TOC.

### G6 — Heading `h1` dan halaman detail: kemungkinan duplikat `h1`
- **Severity**: Rendah · **Status**: Dugaan
- **Lokasi**: `src/app/blog/[slug]/page.tsx` (`PageHero` memakai judul artikel),
  `src/components/page-hero.tsx`.
- **Gap**: rencana B6.8 meminta satu `h1` per halaman. Perlu dicek apakah
  `PageHero` merender judul sebagai `h1` dan apakah isi markdown bisa memuat `#`
  (renderer hanya `##`+, jadi `h1` tidak dihasilkan dari body). Kemungkinan aman,
  belum diverifikasi di DOM.
- **Perbaikan usulan**: verifikasi di browser atau dengan test render.

### G7 — Ringkasan TOC: heading tanpa teks menghasilkan id kosong
- **Severity**: Rendah · **Status**: Dugaan
- **Lokasi**: `src/lib/markdown-parse.ts` (`headingId`).
- **Gap**: heading yang hanya berisi simbol (mis. `## ***`) menghasilkan
  `id = ""`. `buildToc` melewati id kosong (sudah benar), tetapi heading tetap
  dirender tanpa anchor.
- **Perbaikan usulan**: beri fallback id (mis. `bagian-N`) agar setiap heading
  bisa ditautkan, atau dokumentasikan perilakunya.

### G8 — Feed RSS: `lastBuildDate` dan cache tidak selaras dengan jadwal
- **Severity**: Rendah · **Status**: Dugaan
- **Lokasi**: `src/app/blog/rss.xml/route.ts` (`revalidate = 3600`).
- **Gap**: artikel terjadwal yang jatuh tempo baru masuk feed setelah revalidate
  RSS (maks 1 jam), sedangkan cron `/api/cron/articles` hanya me-revalidate
  halaman HTML dan `rss.xml` terpisah. Tidak salah, tetapi tidak sinkron.
- **Perbaikan usulan**: tambahkan `/blog/rss.xml` ke daftar path cron (sudah
  ada di `revalidatePath`, perlu diverifikasi), atau cukup dokumentasikan.

### G9 — Verifikasi manual belum dilakukan untuk fitur kritis
- **Severity**: Tinggi · **Status**: Terverifikasi (belum diuji)
- **Gap**: alur berikut belum dicek di browser atau server berjalan:
  1. sisip gambar di tengah body dan tampil di publik,
  2. autosave + pulihkan draft,
  3. bulk publish/hapus,
  4. redirect 301 setelah rename,
  5. cron `/api/cron/articles` dengan `CRON_SECRET`,
  6. layout 3 kolom dan sticky sidebar,
  7. event analitik muncul di dashboard.
- **Perbaikan usulan**: checklist uji manual di `docs/2026-10-09-upgrade-blog.md`
  (sudah ada daftarnya), dijalankan di Vercel preview sebelum rilis.

### G10 — Dokumen rencana dan kode belum sinkron di beberapa item
- **Severity**: Rendah · **Status**: Terverifikasi
- **Gap**:
  - B6.2 menyebut "artikel terkait berdasarkan kategori dan tag" (sudah),
    tetapi B6.2 juga menyebut "kartu newsletter di sidebar" yang di kode ada di
    bawah artikel (keputusan AI, tercatat di task doc).
  - B4.6 "preview token" tidak diimplementasi (keputusan 5: admin saja, sudah
    tercatat).
  - Checklist B5.6 ditandai "SKIP" di task doc, tetapi di planning masih
    tertulis sebagai kebutuhan.
- **Perbaikan usulan**: satu bagian "Deviasi dari rencana" di dokumen hasil
  (`2026-10-09-upgrade-blog.md`) agar jelas tanpa membaca commit.

## Status perbaikan

- **G1** — selesai: field id dibuang sebelum simpan di aksi massal.
- **G2** — selesai: editor menampilkan kata dan estimasi baca (countWords, eadingMinutes).
- **G10** — selesai: deviasi dari rencana didokumentasikan di docs/2026-10-09-upgrade-blog.md (bagian Deviasi, D1–D11).
- **G3** — selesai: keputusan route API (riwayat slug, pilihan audit, path revalidate, otorisasi cron) dipindah ke src/lib/article-api-logic.ts dan dites di scripts/article-api.test.ts (19 test).
- **G4** — selesai: POST artikel menolak (409) slug yang masih jadi riwayat redirect artikel lain (indHistoryConflict, src/lib/slug-conflict.ts).
- **G7** — selesai: parser memberi id unik per heading (duplikat diberi sufiks -2, -3; heading simbol diberi agian). Generator ada di src/lib/markdown-parse.ts.
- **G6** — diverifikasi, bukan bug: heading body dipetakan ke h2 (# dan ##), jadi satu h1 per halaman datang dari PageHero. Ditambah test regresi.
- **G8** — diverifikasi, bukan bug: evalidationPaths sudah menyertakan /blog/rss.xml, dan RSS evalidate = 3600. Ditambah test regresi.
- **G5** — selesai sebagian, dengan koreksi: globals.css sudah memakai prefers-reduced-motion global (scroll-behavior: auto, durasi transisi nol). Yang ditambahkan: motion-reduce:transition-none pada komponen blog (TOC, tombol share, filter).

## Ringkasan

| ID | Severity | Status | Ringkas |
| --- | --- | --- | --- |
| G1 | Rendah | Terverifikasi | Bulk menyalin field `id` |
| G2 | Sedang | Terverifikasi | Estimasi baca tidak tampil di editor |
| G3 | Sedang | Terverifikasi | Route API artikel tanpa test |
| G4 | Rendah | Dugaan | Tabrakan slug lama vs artikel baru |
| G5 | Sedang | Terverifikasi | Reduced-motion belum di komponen blog |
| G6 | Rendah | Dugaan | Potensi duplikat `h1` |
| G7 | Rendah | Dugaan | Heading tanpa teks → id kosong |
| G8 | Rendah | Dugaan | RSS tidak ikut revalidate cron |
| G9 | Tinggi | Belum diuji | Verifikasi manual fitur kritis |
| G10 | Rendah | Terverifikasi | Deviasi rencana belum terdokumentasi terpusat |

## Usulan urutan perbaikan (menunggu persetujuan)

1. **G1 + G2** — perbaikan kecil, risiko rendah.
2. **G5** — aksesibilitas, sesuai rencana B6.8.
3. **G3** — ekstrak keputusan route ke fungsi murni + test.
4. **G4 + G7** — edge case slug dan heading.
5. **G6 + G8** — verifikasi, bisa sekalian dengan G9.
6. **G9** — uji manual (dilakukan pemilik, di Vercel preview).
7. **G10** — dokumentasi deviasi.

Eksekusi hanya setelah persetujuan.
