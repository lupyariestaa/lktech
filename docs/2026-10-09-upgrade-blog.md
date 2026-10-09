# Upgrade Sistem Blog LKTech — Dokumen Hasil (B0–B8)

## Ringkasan

Upgrade sistem blog dari sisi dashboard admin, backend, data, konten, hingga
tampilan publik. Dikerjakan per fase (satu commit per fase), setiap fase lolos
`tsc`, `lint`, `test:blog`, dan `build`.

Dokumen perencanaan: [`2026-10-09-planning-upgrade-blog.md`](2026-10-09-planning-upgrade-blog.md).
Checklist per fase: [`2026-10-09-task-upgrade-blog.md`](2026-10-09-task-upgrade-blog.md).

## Keputusan desain

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Editor | Markdown + toolbar + pratinjau (bukan WYSIWYG penuh) | Ringan, tanpa dependensi besar, output konsisten dengan renderer publik |
| Parser | Tetap custom (diperluas), tanpa `react-markdown` | Sudah aman (whitelist URL, tanpa `innerHTML`), diff lebih kecil |
| Pratinjau draft | Hanya admin (sesi login), tanpa link token publik | Permukaan keamanan lebih kecil |
| Rename slug | Redirect 301 dari slug lama (`slugHistory`) | Menjaga SEO dan tautan lama |
| Artikel demo | Dihapus dari kode (`DEFAULT_ARTICLES`) | Blog produksi tidak menampilkan konten contoh |
| Scheduled publish | Filter saat baca + cron revalidate | Tidak perlu deploy ulang saat jadwal tiba |
| Cron | `CRON_SECRET` wajib, fail-closed, tanpa `vercel.json` | Plan Hobby tidak mendukung Vercel Cron |
| Pencarian & paginasi | Di memori, lewat URL | Volume artikel masih kecil; index Firestore belum perlu |

## Ringkasan per fase

- **B0 Perbaikan bug:** `coverAlt` tersimpan; revalidate lengkap (kategori, tag, RSS, sitemap); batas upload satu sumber; demo fallback dihapus; cover tidak lagi menghapus berkas Cloudinary yang mungkin masih dipakai.
- **B2 Markdown:** gambar `![alt](url)` (host dibatasi), blockquote, kode fenced dengan tombol salin, daftar bernomor, heading `####` dengan id anchor. Parser dipisah ke `markdown-parse.ts` (murni, dites).
- **B1 Media:** pilih cover dari media library; sisip gambar di posisi kursor (alt wajib, pilihan `wide`); upload dari form dicatat ke library; pelacakan pemakaian media memindai body.
- **B5 Backend:** field `metaTitle`, `metaDescription`, `scheduledAt`, `slugHistory`, `readingTime`; filter tayang; cron `/api/cron/articles`; pencarian `?q=`; paginasi `limit`/`cursor`; redirect 301.
- **B3 Editor:** toolbar, pratinjau berdampingan, hitung kata, autosave (localStorage) dengan pulihkan/buang, tag chip, field SEO dengan penghitung karakter, jadwal WIB, pratinjau admin.
- **B4 Dashboard:** filter (status, kategori, tag, kata kunci) disimpan di URL; aksi massal (terbitkan, tarik, hapus; maks 50; hasil per item); duplikat sebagai draft; peringatan rename; audit untuk enam aksi artikel.
- **B6 Publik:** layout 3 kolom (daftar isi, isi, sidebar); sidebar berisi artikel terkait, CTA layanan sesuai kategori, WhatsApp, dan produk digital (tersembunyi bila kosong); share WhatsApp dan salin tautan; daftar `/blog`, kategori, dan tag memakai komponen yang sama dengan pencarian dan paginasi via URL.
- **B7 SEO:** RSS `content:encoded` (HTML aman, gambar absolut); gambar OG dengan fallback; metadata memakai `metaTitle`/`metaDescription`; JSON-LD `image` dan `wordCount`.
- **B8 Observability & QA:** event analitik blog (`article_view`, `article_share`, `related_click`, `cta_click`) tanpa data pribadi; test coverage fungsi murni; `test:blog` masuk CI.

## Daftar file kunci

**Murni (dites, tanpa React/alias):**
- `src/lib/markdown-parse.ts`, `src/lib/markdown-html.ts`, `src/lib/markdown-insert.ts`
- `src/lib/article-logic.ts`, `src/lib/article-editor.ts`, `src/lib/article-manage.ts`, `src/lib/article-ui.ts`
- `src/lib/upload-limits.ts`

**Backend & API:**
- `src/app/api/admin/articles/route.ts`, `src/app/api/admin/articles/bulk/route.ts`
- `src/app/api/articles/route.ts`, `src/app/api/cron/articles/route.ts`
- `src/app/blog/rss.xml/route.ts`

**Dashboard admin:**
- `src/components/admin/articles-manager.tsx`, `articles-list.tsx`
- `src/components/admin/markdown-editor.tsx`, `article-preview.tsx`
- `src/app/admin/(dashboard)/blog/preview/[slug]/page.tsx`

**Publik:**
- `src/app/blog/page.tsx`, `src/app/blog/[slug]/page.tsx`, kategori, tag
- `src/components/blog/` (`blog-index`, `article-toc`, `article-share`, `article-sidebar`, tracker)

**Test:** `scripts/article-*.test.ts`, `scripts/markdown.test.ts` (dijalankan lewat `npm run test:blog`).

## Verifikasi

- `tsc --noEmit`: lolos.
- `npm run lint`: lolos.
- `npm run test:blog`: 120 test lolos.
- `npm run build`: sukses.

## Belum diverifikasi (manual)

- Alur di browser: pilih cover, sisip gambar, autosave dan pulihkan, bulk, filter URL.
- Tampilan desktop 3 kolom dan sticky sidebar; TOC aktif.
- Redirect 301 slug lama di server yang berjalan.
- Cron `/api/cron/articles` dengan `CRON_SECRET` asli.
- Feed `/blog/rss.xml` di validator RSS; preview OG di alat sosial media.
- Event analitik muncul di dashboard Vercel Web Analytics.

## Catatan teknis

- Tipe AST di `markdown-html.ts` disalin dari `markdown-parse.ts` (menghindari impor berekstensi `.ts` yang ditolak tsc). Jika AST berubah, sinkronkan keduanya.
- File dengan BOM UTF-8 dihindari: menulis dengan `Set-Content -Encoding UTF8` di PowerShell 5.1 menambah BOM yang membuat `package.json` tidak bisa di-parse Node.
- Cache `.next` yang dibuat dari build gagal harus dihapus sebelum build ulang.

## Deviasi dari rencana

Bagian ini mencatat perbedaan antara rencana (`2026-10-09-planning-upgrade-blog.md`) dan implementasi, supaya tidak perlu menelusuri commit.

| # | Rencana | Implementasi | Alasan / status |
| --- | --- | --- | --- |
| D1 | B2.6 tabel pipa (opsional) | Belum dikerjakan | Opsional dan belum dibutuhkan |
| D2 | B6.9 print stylesheet (opsional) | Belum dikerjakan | Opsional |
| D3 | B5.6 index Firestore `status` + `publishedAt` | Di-skip | Query masih in-memory; index belum perlu |
| D4 | B4.6 link pratinjau draft via token | Hanya pratinjau admin (sesi login) | Keputusan 5: lebih sedikit permukaan keamanan |
| D5 | B6.2 newsletter di sidebar | Di bawah artikel | Lebih sesuai alur baca; tercatat di task doc |
| D6 | B2.3 tombol salin untuk kode | Hanya blok kode fenced (kode inline tanpa tombol) | Kode inline terlalu kecil untuk tombol |
| D7 | Parser markdown: library (opsional, keputusan 7) | Parser custom, diperluas | Diff lebih kecil, sudah teruji; library tidak diperlukan |
| D8 | Renderer RSS memakai output publik | Memakai AST yang disalin di `markdown-html.ts` | Menghindari impor berekstensi `.ts` yang ditolak tsc; sinkron manual |
| D9 | B1.5 opsi lebar gambar | Sintaks title `"wide"` | Sesuai desain sintaks; tanpa kontrol UI terpisah |
| D10 | G4: cegah slug yang dipakai artikel aktif | Hanya cek riwayat slug (`slugHistory`) | Slug aktif masih ditimpa upsert; perlu keputusan lanjutan |
| D11 | B3.8 pratinjau draft lewat API admin | Mengambil daftar lalu mencari slug di klien | Sederhana; endpoint detail tunggal belum ada |

### Tindak lanjut yang disarankan

- D10: tentukan apakah simpan artikel baru dengan slug yang sudah dipakai artikel aktif harus ditolak (409) atau menjadi edit eksplisit.
- D8: bila AST berubah, sinkronkan `markdown-html.ts` dengan `markdown-parse.ts`, atau pindahkan tipe ke satu modul tanpa impor relatif berekstensi.
- D11: tambahkan `GET /api/admin/articles/[slug]` bila daftar artikel makin besar.