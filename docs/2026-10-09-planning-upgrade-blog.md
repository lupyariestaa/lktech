# Planning Upgrade Sistem Blog LKTech

> Status: **PLANNING** (belum dieksekusi). Setelah disetujui, dipecah jadi `TASK-BLOG.md` (flow implementasi per fase).
> Tanggal: 2026-10-09

---

## 1. Tujuan

Meningkatkan sistem blog LKTech dari sisi:
- **Dashboard admin**: kelola artikel, editor, kelola media.
- **Backend**: data model, API, validasi, audit, cache.
- **Public interface**: tampilan list dan detail artikel, layout, konten pendukung.
- **Konten**: gambar inline, elemen markdown yang lebih kaya.

---

## 2. Kondisi Saat Ini (ringkas)

| Area | Kondisi | Referensi |
| --- | --- | --- |
| Public list | Satu kolom, filter kategori/tag client-side, tanpa search, tanpa paginasi | `src/app/blog/page.tsx:30`, `src/components/blog-grid.tsx:23` |
| Public detail | Cover, body, tag, CTA WhatsApp, 3 related, CtaContact. Layout satu kolom `max-w-3xl`, tidak ada sidebar | `src/app/blog/[slug]/page.tsx:147-214`, `src/app/blog/layout.tsx:4` |
| Render body | Markdown custom. Tidak ada gambar `![]()`, blockquote, kode, daftar bernomor | `src/lib/markdown.tsx:73` |
| Data model | `Article`: slug, title, excerpt, body, category, tags, cover, coverImage, coverAlt, author, status, publishedAt, updatedAt | `src/lib/article-types.ts:4-21` |
| Editor admin | Textarea polos, tanpa toolbar, preview, atau gambar inline | `src/components/admin/articles-manager.tsx:405-418` |
| Pilih cover | Hanya upload baru. Belum ada media picker | `articles-manager.tsx:494-552` |
| Media library | Ada, tapi upload cover tidak tercatat di library | `src/app/api/admin/media/route.ts:141` |
| Scheduled | Tidak ada. Filter status saja, tanpa cek `publishedAt` | `src/lib/articles.ts:158` |
| Audit | Tidak ada untuk artikel | `src/app/api/admin/articles/route.ts` |
| Test | Tidak ada test blog | `scripts/*.test.ts` |

### Bug yang sudah terkonfirmasi
- **B1. `coverAlt` tidak tersimpan.** Schema dan form mengirim `coverAlt`, tetapi objek artikel di route tidak menyertakannya (`src/app/api/admin/articles/route.ts:60-75`). Alt cover selalu hilang.
- **B2. Hapus cover menghapus file Cloudinary** (`articles-manager.tsx:513-526`). File bisa masih dipakai artikel lain atau berasal dari media library.
- **B3. Revalidate tidak lengkap.** DELETE hanya `/blog`. Kategori, tag, RSS, dan sitemap tidak di-revalidate.
- **B4. Edit slug membuat dokumen baru.** Dokumen lama tetap ada, tanpa redirect.
- **B5. Batas ukuran tidak konsisten.** `image-uploader.tsx:13` = 5 MB, `cloudinary.ts:47` = 8 MB.

---

## 3. Ruang Lingkup Pengembangan

### Fase B0 - Perbaikan Bug (prasyarat)
Dikerjakan dulu agar fase berikutnya berdiri di data yang benar.
- B0.1 Simpan `coverAlt` di route POST/PUT artikel (B1).
- B0.2 Hapus cover Cloudinary hanya jika file tidak dipakai di tempat lain (cek `media-usage.ts`) (B2).
- B0.3 Revalidate lengkap saat create, update, delete: `/blog`, `/blog/[slug]`, kategori, tag, sitemap, RSS (B3).
- B0.4 Samakan batas ukuran upload (B5).
- B0.5 Tambahkan test untuk `articleSchema`, `taxonomySlug`, `pickRelatedArticles`.

### Fase B1 - Media Picker untuk Cover dan Gambar Inline
Permintaan utama. Memakai `MediaPickerDialog` yang sudah ada.
- B1.1 Tombol "Pilih dari media" di `CoverUploader`, buka `MediaPickerDialog` (tetap bisa upload baru).
- B1.2 Upload dari form artikel (cover maupun inline) selalu memanggil `saveMedia`, sehingga tercatat di media library (perbaikan dari gap 4).
- B1.3 Gambar inline di body: tombol "Sisipkan gambar" di editor, buka media picker, lalu sisipkan syntax `![alt](url)`.
- B1.4 Tiap gambar inline punya field alt wajib (validasi a11y).
- B1.5 Pilihan ukuran/tampilan gambar inline: `full` (default) atau `wide`, sintaks ditentukan di F2.
- B1.6 `media-usage.ts` memindai isi `body` untuk gambar, sehingga file yang masih dipakai di body tidak bisa dihapus sembarangan.

### Fase B2 - Konten Markdown yang Lebih Kaya
- B2.1 Render gambar `![alt](url)` dengan `next/image` dan lazy load, tanpa `innerHTML`. Hanya URL dari domain yang diizinkan (Cloudinary dan path lokal) untuk keamanan.
- B2.2 Blockquote `>`.
- B2.3 Blok kode dengan tombol salin (inline dan fenced).
- B2.4 Daftar bernomor.
- B2.5 Heading `####` dan anchor id otomatis untuk TOC.
- B2.6 Tabel sederhana (opsional, dipertimbangkan setelah B2.1-B2.5).
- B2.7 Test untuk parser markdown (kasus aman, escape, URL tidak aman ditolak).

### Fase B3 - Editor Admin
- B3.1 Toolbar: bold, italic, heading, link, daftar, blockquote, kode, gambar.
- B3.2 Preview berdampingan memakai renderer publik yang sama (WYSIWYG-lite).
- B3.3 Penghitung kata dan estimasi waktu baca.
- B3.4 Autosave draft ke localStorage, dan peringatan jika ada perubahan belum tersimpan (`useUnsavedChanges` sudah ada).
- B3.5 Input tags dengan chip, bukan textarea per baris.
- B3.6 Field SEO terpisah: `metaTitle`, `metaDescription` (dengan hitung karakter).
- B3.7 Pilihan penjadwalan: `scheduledAt` (lihat B5.3).

### Fase B4 - Dashboard Kelola Artikel
- B4.1 List dengan pencarian judul, filter status, kategori, dan tag.
- B4.2 Paginasi atau load more.
- B4.3 Aksi massal: publish, unpublish, hapus (dengan konfirmasi).
- B4.4 Duplikat artikel.
- B4.5 Indikator status: draft, published, terjadwal, dan tanggal update.
- B4.6 Preview link ke artikel (draft juga bisa dilihat via token preview).
- B4.7 Rename slug dengan redirect dari slug lama (menyelesaikan B4 lama / gap 2).
- B4.8 Audit log untuk create, update, publish, delete artikel (`recordAdminAudit`, tambahkan tipe aksi di `admin-audit-types.ts`).

### Fase B5 - Backend dan Data
- B5.1 Tambahkan field baru di `Article`: `metaTitle`, `metaDescription`, `scheduledAt`, `readingTime`, `updatedAt` wajib saat simpan.
- B5.2 Migrasi lunak: artikel lama tanpa field baru tetap valid (`normalizeArticle` tetap mengisi default).
- B5.3 Scheduled publishing: `getArticles` memfilter `status === published && publishedAt <= now`. Cron (pola sama dengan cron yang ada di `src/app/api/cron/`) untuk revalidate saat artikel terjadwal jatuh tempo.
- B5.4 Pencarian server-side sederhana atau filter di memori dengan batas jumlah. Tidak perlu Algolia.
- B5.5 Paginasi API publik `/api/articles` (`limit`, `cursor`).
- B5.6 Index Firestore untuk `articles` (status + publishedAt) jika query berubah ke server-side.
- B5.7 Fallback demo (`articles.ts:152`) hanya aktif di development. Di produksi, error jika DB tidak terkonfigurasi.

### Fase B6 - Public UI/UX Blog
- B6.1 Layout detail dengan sidebar kanan (desktop) dan sidebar kiri (desktop) berisi Table of Contents. Di mobile sidebar jatuh ke bawah atau disembunyikan.
- B6.2 Sidebar kanan (sticky): konten bebas, dengan pilihan komponen yang bisa diatur dari dashboard. Usulan awal:
  - Artikel terkait (berdasarkan kategori dan tag, bukan 3 terbaru saja).
  - CTA layanan LKTech (kartu layanan yang relevan dengan kategori artikel).
  - Kartu "Konsultasi via WhatsApp".
  - Kartu produk digital terkait (jika ada, tersembunyi jika kosong).
- B6.3 TOC otomatis dari heading `##` dan `###`, dengan highlight section aktif.
- B6.4 Tombol share (WhatsApp, salin tautan). Tanpa tracking pihak ketiga.
- B6.5 Estimasi waktu baca dan tanggal update di header artikel.
- B6.6 Halaman `/blog` dengan pencarian, paginasi atau load more, dan kartu yang lebih informatif.
- B6.7 Halaman kategori dan tag memakai komponen list yang sama.
- B6.8 Kompatibilitas a11y: heading berurutan, alt wajib, kontras, tap target 44px (mengacu H4 beranda).
- B6.9 Print-friendly (opsional).

### Fase B7 - SEO dan Distribusi
- B7.1 `metaTitle` dan `metaDescription` dipakai di `generateMetadata`, fallback ke judul dan excerpt.
- B7.2 OG image dari cover artikel.
- B7.3 RSS dengan `content:encoded` (body sudah dirender ke HTML), dan gambar absolut.
- B7.4 Sitemap dengan `lastModified` dari `updatedAt`.
- B7.5 JSON-LD BlogPosting diperbarui dengan `dateModified`, `image`, dan `wordCount`.

### Fase B8 - Observability dan QA
- B8.1 Event analytics: `article_view`, `article_share`, `related_click`, `cta_click` (memakai pola `TrackedLink` dari H7).
- B8.2 Test unit: markdown parser, schema, slug rename, scheduled filter, related picker, sidebar selection.
- B8.3 Update CI (`.github/workflows/ci.yml`) dan `npm run test:blog`.
- B8.4 Dokumentasi: `docs/2026-10-xx-upgrade-blog.md` dan update `TASK-BLOG.md`.

---

## 4. Urutan Eksekusi yang Disarankan

1. **B0** Perbaikan bug (cepat, mengurangi risiko).
2. **B1** Media picker dan gambar inline (permintaan utama).
3. **B2** Markdown yang lebih kaya (prasyarat B1.3 dan B6).
4. **B5** Backend dan data (field baru, scheduled, paginasi).
5. **B3** Editor admin.
6. **B4** Dashboard kelola artikel.
7. **B6** Public UI/UX (sidebar, TOC, share).
8. **B7** SEO dan distribusi.
9. **B8** Observability, test, dan dokumentasi.

Setiap fase dibuat sebagai commit terpisah dan lolos `tsc`, `lint`, `test`, dan `build` sebelum lanjut.

---

## 5. Definition of Done (usulan)

1. `tsc`, `lint`, `build`, dan semua test lolos.
2. Gambar bisa dipilih dari media library di cover dan body.
3. Gambar inline wajib punya alt dan tampil di halaman publik.
4. Artikel terjadwal tampil tepat waktu tanpa deploy ulang.
5. Setiap aksi admin terhubung ke audit log.
6. Tidak ada `innerHTML` dari input admin. URL gambar dan link divalidasi.
7. Mobile-first dan lolos pengecekan aksesibilitas dasar.
8. Artikel lama tetap tampil tanpa migrasi manual.

---

## 6. Pertanyaan Terbuka (perlu keputusan pemilik)

1. **Editor**: cukup markdown dengan toolbar dan preview (rekomendasi, ringan), atau mau WYSIWYG penuh (library seperti TipTap, menambah dependensi)?
2. **Sidebar kanan**: komponen mana yang diprioritaskan? Usulan saya: artikel terkait, CTA layanan, kartu WhatsApp. Ada tambahan?
3. **Sidebar kiri**: setuju TOC? Atau sidebar kiri berisi kategori dan tag?
4. **Scheduled publishing**: cukup dengan cron yang ada, atau perlu notifikasi ke admin saat artikel terbit?
5. **Preview draft**: perlu link preview untuk draft yang bisa dibagikan ke klien (dengan token), atau cukup admin saja?
6. **Rename slug**: setuju dengan redirect 301 dari slug lama? Perlu simpan riwayat slug di dokumen.
7. **Dependensi baru**: boleh tambah library markdown (misal `react-markdown` + `remark-gfm`) untuk tabel dan edge case lain, atau tetap parser custom?
8. **Prioritas**: apakah B1 (media picker dan gambar inline) dikerjakan dulu sebelum B0, atau B0 dulu seperti urutan rekomendasi?
9. **Konten**: apakah artikel demo di `DEFAULT_ARTICLES` dihapus di produksi, atau tetap sebagai contoh?

---

## 7. Di Luar Scope (tidak dikerjakan di rencana ini)

- Komentar pembaca dan moderasi.
- Newsletter per artikel (sudah ada modul newsletter terpisah, dihubungkan nanti).
- Multi-penulis dengan role dan approval.
- Terjemahan multi-bahasa.
- Analitik pihak ketiga selain event internal.
