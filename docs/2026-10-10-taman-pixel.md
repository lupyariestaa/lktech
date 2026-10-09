# Taman Testimoni (Taman Pixel) — Dokumen Hasil (T0–T12)

## Ringkasan

Testimoni klien ditampilkan sebagai frame pixel art berisi hewan. Setiap hewan mewakili satu testimoni. Klik hewan untuk membaca testimoninya. Pengunjung bisa mengirim testimoni sendiri setelah login Google, dan testimoni tampil publik hanya setelah disetujui admin dan persetujuan pemberi tercatat.

Dokumen perencanaan: [`2026-10-10-planning-testimoni-taman-pixel.md`](2026-10-10-planning-testimoni-taman-pixel.md).
Checklist per fase: [`2026-10-10-task-testimoni-taman-pixel.md`](2026-10-10-task-testimoni-taman-pixel.md).
Prosedur hapus: [`2026-10-10-prosedur-hapus-testimoni.md`](2026-10-10-prosedur-hapus-testimoni.md).

## Keputusan utama

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Penyimpanan | Dua koleksi: `taman_testimonials` (publik-aman) dan `taman_private` (email, bukti persetujuan) | Konten situs dikirim ke browser lewat `ContentProvider`, jadi email tidak boleh ada di sana (D1) |
| Contoh (sample) | Hanya di lokal dan pratinjau admin, tidak pernah publik | Aturan situs melarang testimoni karangan di halaman publik (D2) |
| Publikasi | Harus `real`, `published`, dan persetujuan pemberi tercatat dengan bukti | Gate di server, tidak bisa dilewati dari UI atau bulk (Q19) |
| Tampilan | Frame hanya muncul bila ada ≥ 3 testimoni nyata | Tidak menampilkan kekosongan atau data palsu (Q6) |
| Gacha | Tombol "Acak lagi" memilih subset dengan bobot; yang baru tampil diberi bobot kecil | Pengunjung melihat set berbeda tanpa kehilangan testimoni (Q5b) |
| Privasi | Whitelist di setiap respons; audit tanpa uid atau email | Email dan uid tidak pernah keluar ke klien (T9) |
| Impor | Testimoni lama masuk sebagai draft `pending`, contoh bawaan dilewati | Tidak ada testimoni yang tampil tanpa persetujuan (T11) |
| Hewan | 8 hewan SVG, dibuat dari grid oleh script (6,5 KB) | Anggaran aset 60 KB; bisa diganti aset asli nanti |

## Yang sudah dibangun

- **Data & logika murni**: tipe, normalisasi, `shortName`, `publicView`, `pickSlots`, `canPublish`, `validateSubmit`, `planLegacyImport`, `buildTamanReviewJsonLd`, `toMineView`.
- **API publik**: `GET /api/taman` (whitelist, cache), `POST /api/taman/submit` (login, email terverifikasi, persetujuan, rate limit, maksimal 1 pending per akun), `GET` dan `DELETE /api/taman/mine`.
- **API admin**: list, PATCH dengan gate publish, DELETE, bulk (maks 50), impor dari ulasan, impor testimoni lama (dengan dry run), contoh (lokal saja).
- **Admin UI**: `/admin/taman` (daftar, filter, urutan ▲▼, pilih banyak, detail panel dengan persetujuan dan bukti, impor, contoh), `/admin/taman/pratinjau`, tombol "Angkat jadi testimoni" di `/admin/reviews`, menu sidebar.
- **Frame publik**: `TamanSection` di beranda, dengan hewan yang bergerak (CSS, mati di reduced motion), gacha, kartu popover (desktop ≥ 768px) dan bottom sheet (mobile), navigasi keyboard, dan daftar teks `sr-only`.
- **Kirim & akun**: `/taman/kirim` (gate login ke `/masuk?next=`, form, persetujuan), tab "Testimoni saya" di `/akun`.
- **SEO & analitik**: JSON-LD `Review` hanya dari testimoni sah; event `taman_open`, `taman_refresh`, `taman_submit` tanpa data pribadi.

## Verifikasi (T12)

- `tsc --noEmit`: lolos.
- `eslint .`: lolos.
- Seluruh suite test (16 perintah `test:*`): semua lolos. Total 396 test, termasuk 55 test taman.
- `npm run build`: sukses. Semua route dan halaman taman terbentuk.
- Pemeriksaan pola berbahaya di kode taman:
  - `dangerouslySetInnerHTML` hanya di JSON-LD, dengan data yang sudah whitelist.
  - Komponen publik tidak menyebut email, uid, atau nama lengkap.
  - Sample hanya dibuat lewat route dengan guard development, dan dikeluarkan dari pool publik.

## Belum diverifikasi (perlu pemeriksaan manual)

Berikut hal yang tidak bisa dibuktikan dari sesi ini, dan perlu dicek di browser dan dengan data nyata:

- **Frame di beranda**: animasi hewan, posisi popover di dalam frame, bottom sheet di mobile, dan gacha.
- **Keyboard dan screen reader**: Tab ke hewan, panah berpindah, Esc menutup, fokus kembali.
- **Reduced motion**: aktifkan preferensi di sistem dan pastikan animasi berhenti.
- **Kontras**: teks kartu dan tombol memenuhi rasio minimal (4.5:1) dan target sentuh 44px.
- **Alur kirim**: login, kirim, status di tab akun, dan hapus.
- **Alur admin dengan data nyata**: publish dengan bukti, urutan, bulk, impor ulasan, dan impor testimoni lama.
- **JSON-LD**: validasi dengan Rich Results Test setelah ada testimoni nyata.
- **Rate limit**: di Vercel dengan banyak instance, batas memori tidak ketat. Untuk pembatasan yang kuat, perlu Upstash.
- **Firestore rules**: publish ulang rules di dokumen operasional bila diperlukan. Rules tidak diubah di fase ini, dan koleksi baru tetap tertutup dari klien.

## Catatan teknis

- Tipe AST di `markdown-html.ts` disalin dari `markdown-parse.ts` (menghindari impor berekstensi `.ts`). Jika AST berubah, sinkronkan keduanya.
- Route `[id]` dan path berkurung siku tidak bisa diakses lewat wildcard PowerShell; gunakan alat edit atau `-LiteralPath`.
- Menulis file dengan `Set-Content -Encoding UTF8` di PowerShell 5.1 menambah BOM yang membuat `package.json` gagal di-parse. Gunakan `WriteAllText` dengan `UTF8Encoding($false)`.
- `window.confirm` dipakai untuk hapus dan impor. Itu konsisten dengan sebagian bagian akun, tetapi sebaiknya diganti dialog bersama di rilis berikutnya.
- Tab "Poin" ada di `ACCOUNT_TABS` tetapi tidak di `VALID_TABS` (selisih lama yang tidak diubah di fase ini).
