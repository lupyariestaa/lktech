# Task Implementasi Upgrade Sistem Blog LKTech

> Turunan dari `docs/2026-10-09-planning-upgrade-blog.md`.
> Status: **SIAP DIKERJAKAN**. Urutan fase wajib diikuti. Centang `[x]` setelah selesai dan lolos verifikasi fase.
> Aturan per fase: satu commit konvensional, lalu `npx tsc --noEmit`, `npm run lint`, `npm run test:blog` (dibuat di B0), dan `npm run build` harus hijau sebelum lanjut.

---

## Keputusan Pemilik (dari jawaban planning)

| # | Topik | Keputusan |
| --- | --- | --- |
| 1 | Editor | Markdown + toolbar + preview. Tanpa WYSIWYG penuh. |
| 2 | Sidebar kanan | Setuju usulan + boleh tambahan dari AI. |
| 3 | Sidebar kiri | TOC. Boleh tambah kategori/tag. |
| 4 | Scheduled | Bebas, diputuskan di B5. |
| 5 | Preview draft | **Keputusan AI**: preview hanya untuk admin (sesi login). Tanpa link token publik. Alasan: lebih sedikit surface keamanan, cukup untuk kebutuhan sekarang. |
| 6 | Rename slug | Setuju redirect 301 dari slug lama. Riwayat slug disimpan di field `slugHistory`. |
| 7 | Library | Boleh. **Keputusan AI**: parser markdown tetap custom (diperluas). Alasan: sudah ada dan aman, extend lebih kecil diff daripada ganti library. Tambah library hanya bila fitur tidak bisa dibuat dengan wajar. |
| 8 | Urutan | B0 dulu. Setelah B0, B2 (render gambar/markdown) sebelum B1, karena gambar inline butuh renderer dulu. |
| 9 | Artikel demo | **Dihapus**. `DEFAULT_ARTICLES` dan fallback demo di `src/lib/articles.ts` dihapus. Data demo dipindah ke seed script (`scripts/seed-articles.mjs`) yang diisi manual bila perlu. |

---

## Fase B0 - Perbaikan Bug (prasyarat)

- [x] **B0.1** Simpan `coverAlt` di route POST/PUT artikel.
  - File: `src/app/api/admin/articles/route.ts` (objek artikel baris ~60-75).
  - Verifikasi: create artikel dengan `coverAlt`, baca dokumen Firestore, field ada.
- [x] **B0.2** Hapus file Cloudinary saat cover dihapus hanya jika file tidak dipakai di tempat lain.
  - File: `src/components/admin/articles-manager.tsx` (baris ~513-526), gunakan `src/lib/media-usage.ts`.
  - Verifikasi: cover yang juga ada di media library atau artikel lain tidak ikut terhapus.
- [x] **B0.3** Revalidate lengkap saat create, update, delete: `/blog`, `/blog/[slug]`, kategori, tag, sitemap, RSS.
  - File: `src/app/api/admin/articles/route.ts`.
  - Verifikasi: kode mencakup semua path di atas (review manual).
- [x] **B0.4** Samakan batas ukuran upload cover (satu konstanta).
  - File: `src/components/admin/image-uploader.tsx` (`MAX_MB = 5`), `src/lib/cloudinary.ts:47` (8 MB). Pilih satu nilai, pakai di keduanya.
- [x] **B0.5** Test blog pertama.
  - Buat `scripts/article-schema.test.ts` (articleSchema), `scripts/article-taxonomy.test.ts` (taxonomySlug, resolveLabelFromSlug), `scripts/article-related.test.ts` (pickRelatedArticles).
  - Tambah script `"test:blog"` di `package.json` yang menjalankan ketiganya dengan pola `node --experimental-strip-types --test`.
  - Verifikasi: `npm run test:blog` hijau.
- [x] **B0.6** Hapus demo fallback (keputusan 9).
  - File: `src/lib/articles.ts` (`DEFAULT_ARTICLES` dan logika fallback baris ~152). Jika DB tidak terkonfigurasi, `getArticles` mengembalikan `[]` (dan log error di server).
  - Pindahkan isi demo ke `scripts/seed-articles.mjs` jika belum ada di sana.
  - Verifikasi: build sukses, halaman `/blog` tampil kosong tanpa error bila DB kosong.

**Commit:** `fix(blog): simpan coverAlt, revalidate lengkap, hapus demo fallback, tambah test blog`

---

## Fase B2 - Konten Markdown yang Lebih Kaya

Dikerjakan sebelum B1 karena B1 butuh gambar inline bisa dirender.

- [x] **B2.1** Render gambar `![alt](url)`.
  - File: `src/lib/markdown.tsx` (`Markdown`, baris ~73).
  - Gunakan `next/image` dengan lazy load. Hanya izinkan URL https dari host Cloudinary (`res.cloudinary.com`) atau path lokal `/`. Selain itu jadi teks biasa.
  - `alt` wajib. Jika kosong, render tanpa gambar dan beri teks peringatan kecil di admin preview saja (publik tidak menampilkan).
- [x] **B2.2** Blockquote `> teks`.
- [x] **B2.3** Blok kode fenced ```` ``` ```` dan inline `` `kode` ``, dengan tombol salin (komponen client kecil).
- [x] **B2.4** Daftar bernomor `1. item`.
- [x] **B2.5** Heading `####`. Anchor id otomatis (slug dari teks heading) untuk TOC di B6.
- [ ] **B2.6** Tabel sederhana (pipe table). Opsional, kerjakan bila waktu cukup.
- [x] **B2.7** Test parser: `scripts/markdown.test.ts`. Kasus: gambar valid, gambar URL tidak aman ditolak, escape HTML tidak dieksekusi, blockquote, kode, daftar bernomor, heading id.
  - Ekspor fungsi parse murni (tanpa React) agar bisa dites dengan `--experimental-strip-types`. Pisahkan ke `src/lib/markdown-parse.ts`.
  - Tambahkan `scripts/markdown.test.ts` ke `test:blog`.

**Verifikasi:** `npm run test:blog` hijau. Cek manual: artikel dengan gambar tampil di `/blog/[slug]`.

**Commit:** `feat(blog): markdown gambar, blockquote, kode, daftar bernomor, heading id`

---

## Fase B1 - Media Picker dan Gambar Inline

- [ ] **B1.1** Tombol "Pilih dari media" di `CoverUploader` membuka `MediaPickerDialog` (`src/components/admin/media-picker-dialog.tsx:89`). Upload baru tetap bisa.
- [ ] **B1.2** Upload dari form artikel (cover dan inline) memanggil `saveMedia` agar tercatat di media library.
  - File: `src/components/admin/image-uploader.tsx`, `src/app/api/admin/media/route.ts`. Cek pola yang dipakai `MediaPickerDialog`.
- [ ] **B1.3** Tombol "Sisipkan gambar" di editor body: buka media picker, lalu sisipkan `![alt](url)` di posisi kursor.
- [ ] **B1.4** Field alt wajib untuk gambar inline. Simpan tombol sisip tidak aktif sampai alt terisi (validasi di UI dan schema).
- [ ] **B1.5** Pilihan tampilan gambar: `full` (default) atau `wide`. Sintaks: `![alt](url "wide")`. Renderer di B2 mendukung title sebagai flag ukuran.
- [ ] **B1.6** `src/lib/media-usage.ts` (`scanArticles`, baris ~136-153) memindai isi `body` juga, bukan hanya `coverImage`. File yang dipakai di body tidak bisa dihapus tanpa peringatan.
  - Verifikasi: test `scripts/media-usage.test.ts` untuk ekstraksi URL dari body.

**Verifikasi:** `npm run test:blog` hijau. Manual: pilih cover dari media, sisip 2 gambar inline di tengah body, simpan, tampil di publik.

**Commit:** `feat(blog): media picker cover dan gambar inline di editor`

---

## Fase B5 - Backend dan Data

Dikerjakan sebelum B3 dan B4 karena UI butuh field baru.

- [ ] **B5.1** Field baru di `Article` (`src/lib/article-types.ts:4-21`): `metaTitle?`, `metaDescription?`, `scheduledAt?` (ISO), `slugHistory?: string[]`, `readingTime?` (menit, dihitung di server saat simpan).
- [ ] **B5.2** Migrasi lunak. `normalizeArticle` (`src/lib/articles.ts:125`) mengisi default untuk field baru. Artikel lama tetap valid tanpa migrasi manual.
- [ ] **B5.3** Scheduled publishing.
  - `getArticles` memfilter `status === "published" && (!scheduledAt || scheduledAt <= now)`. Juga cek `publishedAt <= now`.
  - Cron baru `src/app/api/cron/articles/route.ts` (pola sama dengan cron yang ada, diamankan `CRON_SECRET`) untuk revalidate `/blog` saat jadwal lewat.
  - Verifikasi: test `scripts/article-schedule.test.ts` untuk fungsi filter (ekstrak sebagai fungsi murni).
- [ ] **B5.4** Pencarian: filter di sisi server dari hasil `getArticles` (cukup untuk volume sekarang). Tidak pakai library pencarian.
- [ ] **B5.5** Paginasi `/api/articles` dengan `limit` dan `cursor` (cursor = `publishedAt` + slug). Default `limit=12`, maks 50.
- [ ] **B5.6** Index Firestore `articles`: `status` + `publishedAt`, hanya bila query berubah jadi server-side. Tambah ke `firestore.indexes.json`.
- [ ] **B5.7** Riwayat slug (keputusan 6): saat slug berubah, slug lama masuk `slugHistory`. Halaman `/blog/[slug]` yang tidak ditemukan mengecek `slugHistory` lalu redirect 301 (`redirect()` dari `next/navigation` dengan `permanent`).
  - Verifikasi: test fungsi `findArticleBySlugOrHistory` (murni, dites).

**Verifikasi:** `npm run test:blog` hijau. `npm run build` hijau.

**Commit:** `feat(blog): field SEO, scheduled publish, paginasi, riwayat slug`

---

## Fase B3 - Editor Admin

- [ ] **B3.1** Toolbar: bold, italic, heading, link, daftar, daftar bernomor, blockquote, kode, gambar (memanggil B1.3).
  - Komponen baru `src/components/admin/markdown-editor.tsx`. Operasi teks murni (wrap selection) dipisah ke fungsi dan dites.
- [ ] **B3.2** Preview berdampingan memakai `Markdown` yang sama dengan publik (B2).
- [ ] **B3.3** Penghitung kata dan estimasi baca (pakai fungsi B5.1 `readingTime`).
- [ ] **B3.4** Autosave draft ke `localStorage` per slug/id. Peringatan perubahan belum tersimpan memakai `useUnsavedChanges` yang sudah ada.
- [ ] **B3.5** Tags sebagai chip (input + Enter), menggantikan textarea per baris.
- [ ] **B3.6** Field SEO `metaTitle` dan `metaDescription` dengan hitung karakter (rekomendasi 60 dan 160).
- [ ] **B3.7** Field `scheduledAt` (datetime-local) dengan keterangan zona waktu WIB.
- [ ] **B3.8** Preview draft **hanya admin** (keputusan 5): tombol "Lihat pratinjau" membuka `/admin/blog/preview/[slug]` yang butuh sesi admin (`requireAdmin`), tanpa mengubah status publik.

**Verifikasi:** `npm run test:blog` hijau (termasuk test operasi teks toolbar). Manual: buat artikel dari toolbar, lihat preview, simpan.

**Commit:** `feat(blog): editor markdown dengan toolbar, preview, autosave, SEO, jadwal`

---

## Fase B4 - Dashboard Kelola Artikel

- [ ] **B4.1** List dengan pencarian judul, filter status, kategori, dan tag. Filter berupa state URL (`searchParams`) agar bisa dibagikan.
- [ ] **B4.2** Paginasi dengan tombol "Muat lagi" (cursor dari B5.5).
- [ ] **B4.3** Aksi massal: publish, unpublish, hapus. Hapus memakai `ConfirmDialog` dan menjelaskan jumlah item.
  - API: `POST /api/admin/articles/bulk` dengan `{ action, slugs[] }`, validasi zod, batas 50 item.
- [ ] **B4.4** Duplikat artikel (buat draft baru dengan slug `-salinan`).
- [ ] **B4.5** Indikator status: `draft`, `published`, `terjadwal` (scheduledAt di masa depan), dan tanggal update.
- [ ] **B4.6** Link "Lihat" ke artikel publik (published) atau pratinjau admin (draft).
- [ ] **B4.7** Rename slug dengan redirect (B5.7). UI menampilkan peringatan bahwa slug lama akan redirect.
- [ ] **B4.8** Audit log untuk create, update, publish, unpublish, delete, duplikat.
  - Tambah tipe aksi di `src/lib/admin-audit-types.ts` (dengan label, dan lolos test `admin-audit.test.ts` yang sudah ada).
  - Panggil `recordAdminAudit` (`src/lib/admin-audit.ts:30`) di route artikel.

**Verifikasi:** `npm run test:blog` dan `npm run test:audit` hijau. Manual: bulk publish 2 draft, cek audit log.

**Commit:** `feat(blog): dashboard kelola artikel (filter, bulk, duplikat, audit)`

---

## Fase B6 - Public UI/UX Blog

- [ ] **B6.1** Layout detail: 3 kolom di desktop (`lg+`): sidebar kiri (TOC), konten tengah (`max-w-3xl`), sidebar kanan (sticky). Di mobile: satu kolom, TOC jadi accordion di atas artikel, sidebar kanan di bawah konten.
  - File: `src/app/blog/layout.tsx` (saat ini satu kolom), `src/app/blog/[slug]/page.tsx`.
- [ ] **B6.2** Sidebar kanan berisi (urutan):
  1. Artikel terkait berdasarkan kategori dan tag (ganti logika 3 terbaru).
  2. CTA layanan LKTech yang relevan dengan kategori artikel (kartu layanan dari `src/lib/services`).
  3. Kartu "Konsultasi via WhatsApp" (pakai helper `whatsapp.ts` yang sudah ada).
  4. Produk digital terkait (tersembunyi jika kosong).
  - Tambahan dari AI: kartu newsletter (form ke modul newsletter yang sudah ada). Tampil di bawah artikel, bukan di sidebar.
- [ ] **B6.3** TOC otomatis dari `##` dan `###` (anchor dari B2.5). Highlight section aktif memakai `IntersectionObserver`. Komponen client kecil.
- [ ] **B6.4** Tombol share: WhatsApp (`wa.me` dengan teks + URL) dan salin tautan. Tanpa script pihak ketiga.
- [ ] **B6.5** Header artikel: kategori, tanggal terbit, tanggal update (`updatedAt`), estimasi baca.
- [ ] **B6.6** `/blog`: search (query `?q=`), filter kategori dan tag, paginasi/load more (B5.5), kartu informatif (waktu baca, excerpt).
  - Ganti filter client-side di `src/components/blog-grid.tsx` dengan state URL.
- [ ] **B6.7** Halaman `/blog/kategori/[category]` dan `/blog/tag/[tag]` memakai komponen list yang sama dengan `/blog`.
- [ ] **B6.8** A11y: heading berurutan (satu `h1`), alt wajib, kontras AA, tap target 44px (mengacu H4 beranda). Pakai pola `prefers-reduced-motion` seperti beranda.
- [ ] **B6.9** Print stylesheet sederhana (sembunyikan sidebar dan tombol share saat print). Opsional.

**Verifikasi:** `npm run build` hijau. Manual: cek desktop dan mobile, TOC aktif, sidebar tidak overlap.

**Commit:** `feat(blog): layout 3 kolom, TOC, sidebar CTA, share, pencarian`

---

## Fase B7 - SEO dan Distribusi

- [ ] **B7.1** `generateMetadata` memakai `metaTitle` dan `metaDescription`, fallback ke judul dan excerpt.
- [ ] **B7.2** OG image dari `coverImage` artikel (fallback OG default beranda).
- [ ] **B7.3** RSS: tambah `content:encoded` (HTML dari `Markdown` server-side, gambar absolut). File: `src/app/blog/rss.xml/route.ts`.
- [ ] **B7.4** Sitemap: `lastModified` dari `updatedAt`. File: `src/app/sitemap.ts`.
- [ ] **B7.5** JSON-LD BlogPosting: `dateModified`, `image`, `wordCount`.
- [ ] **B7.6** Test: `scripts/article-seo.test.ts` untuk fungsi pembuat metadata/RSS item (murni).

**Verifikasi:** `npm run test:blog` hijau. Cek `/blog/rss.xml` dan sitemap di build lokal.

**Commit:** `feat(blog): metadata SEO, RSS content, sitemap lastmod, JSON-LD`

---

## Fase B8 - Observability, Test, Dokumentasi

- [ ] **B8.1** Event analytics memakai pola `TrackedLink` (H7): `article_view`, `article_share`, `related_click`, `cta_click` di blog. Tanpa tracking pihak ketiga.
- [ ] **B8.2** Lengkapi test: tambahkan suite yang belum ada dari fase sebelumnya. Target: semua fungsi murni blog punya test.
- [ ] **B8.3** `package.json`: script `test:blog` sudah ada. Pastikan `.github/workflows/ci.yml` menjalankan `test:blog`.
- [ ] **B8.4** Dokumentasi: `docs/2026-10-xx-upgrade-blog.md` (ringkasan hasil per fase, keputusan) dan update `docs/README.md`.
- [ ] **B8.5** Update `TASK-SELANJUTNYA.md` dengan status upgrade blog.

**Verifikasi:** `tsc`, `lint`, semua `test:*`, `build` hijau.

**Commit:** `docs(blog): dokumentasi upgrade blog dan CI test:blog`

---

## Definition of Done

1. `tsc`, `lint`, `build`, dan semua test (termasuk `test:blog`) hijau.
2. Gambar bisa dipilih dari media library untuk cover dan body.
3. Gambar inline wajib alt dan tampil di publik.
4. Artikel terjadwal tampil tepat waktu tanpa deploy ulang.
5. Aksi admin tercatat di audit log.
6. Tidak ada `innerHTML` dari input admin. URL gambar dan link divalidasi.
7. Mobile-first dan lolos pengecekan a11y dasar.
8. Artikel lama tetap tampil tanpa migrasi manual.
9. Slug lama redirect 301 setelah rename.

---

## Catatan Eksekusi

- Setiap fase = 1 commit. Jangan gabung dua fase dalam satu commit.
- Jika ada keputusan baru di tengah jalan, tulis di bagian "Keputusan Pemilik" atau catatan fase, jangan diam-diam.
- Library baru hanya jika fitur tidak bisa dibuat dengan wajar. Catat alasan di commit message.
