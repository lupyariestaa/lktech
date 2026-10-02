# PROMPT UNTUK AGENT PROJECT — Ekstraksi Data Proyek → File .md (Portofolio LKTech)

> **Cara pakai:**
> 1. Buka/buka agent di dalam **workspace project klien** (project yang akan dijadikan portofolio LKTech).
> 2. Salin **seluruh isi blok "PROMPT"** di bawah ini, tempel ke agent tersebut, lalu kirim.
> 3. Agent akan menuliskan **satu file `.md`** berisi data proyek sesuai format.
> 4. Kirim file `.md` hasilnya ke sesi LKTech untuk diubah menjadi seed script portofolio.

---

## PROMPT (salin mulai dari baris ini)

```
Kamu adalah asisten yang bertugas mengumpulkan data sebuah proyek perangkat lunak
untuk dijadikan BAHAN PORTOFOLIO. Tulis hasilnya ke SATU file Markdown.

PENTING: Lakukan RISET NYATA dari project ini (baca kode, struktur folder, config,
README, package.json, aset, dsb.). JANGAN mengarang fakta teknis yang bisa dicek.
Bagian "Tantangan/Solusi/Hasil/Metrik/Testimoni" bersifat OPSIONAL — isi hanya bila
ada bukti; bila tidak ada, tulis "SKIP" (jangan mengarang). Lihat bagian ATURAN.

=== LANGKAH RISET (lakukan dulu sebelum menulis) ===
1. Baca file konfigurasi: package.json, README, next.config / config lain, .env.example.
2. Telusuri struktur folder (src/, app/, pages/, components/, api/, prisma/, dsb.).
3. Identifikasi:
   - Nama project & deskripsi singkat (dari README/package.json).
   - Jenis project (website profil, landing page, toko online, aplikasi, dashboard, dll).
   - Klien / pemilik project (nama brand/instansi bila ada).
   - Tahun pengerjaan (dari git log bila ada, atau tahun berjalan).
   - Fitur utama (dari halaman/route/komponen yang ada).
   - Jumlah halaman/layar/modul (hitung dari route/section).
   - Teknologi & library yang benar-benar dipakai (dari package.json / imports).
4. Jika ada screenshot/aset gambar di folder publik, sebutkan path-nya.
5. Simpulkan kategori & teknologi yang paling tepat.

=== OUTPUT: tulis SATU file Markdown ===
Nama file: PORTOFOLIO-DATA.md
Isi persis mengikuti TEMPLATE di bawah (jangan tambah/kurangi judul field).
Isi setiap field dengan data hasil riset.
Field WAJIB: Judul, Slug, Klien, Kategori, Layanan, Tahun, Ringkasan,
Jumlah Halaman, Tags, Teknologi.
Field OPSIONAL (isi atau tulis "SKIP"): Tantangan, Solusi, Hasil, Metrik, Testimoni.

=== TEMPLATE (salin & isi) ===

# Data Portofolio Proyek

## Info Dasar
- **Judul Proyek:** <nama project, singkat & menarik, mis. "Website Profil Kopi Lokal">
- **Slug:** <huruf kecil, tanda hubung, tanpa spasi, mis. website-profil-kopi-lokal>
- **Klien:** <nama brand/perusahaan/instansi/perorangan>
- **Kategori:** <pilih/sesuaikan salah satu: Website | Landing Page | Aplikasi Mobile | E-commerce | Toko Online | Web App | Desain & Branding | Digital Marketing | Company Profile | Sekolah & Instansi | Lainnya>
- **Layanan LKTech Terkait:** <pilih: pembuatan-website | aplikasi-mobile | konsultasi-teknologi | desain-branding | digital-marketing>
- **Tahun:** <tahun pengerjaan, 4 digit, mis. 2025>

## Deskripsi
- **Ringkasan (1–2 kalimat):** <ringkasan proyek untuk kartu portofolio & meta description>
- **Jumlah Halaman/Layar:** <mis. "5 halaman" / "12 layar" / "8 modul". Bila tidak jelas, tulis perkiraan dari jumlah route/section.>
- **Tantangan (OPSIONAL):** <isi HANYA bila kamu yakin/temukan bukti di project. Bila tidak ada data/ragu, tulis: "SKIP" — jangan mengarang.>
- **Solusi (OPSIONAL):** <isi HANYA bila kamu yakin/temukan bukti. Bila tidak ada data/ragu, tulis: "SKIP" — jangan mengarang.>

## Tags
<3–6 kata kunci, satu per baris, mis.:
website
umkm
responsive>

## Hasil (OPSIONAL — poin dampak)
<isi HANYA bila ada bukti/kamu sangat yakin. Bila tidak, tulis: "SKIP".
Jangan mengarang klaim dampak bisnis yang tidak bisa diverifikasi.>

## Metrik (OPSIONAL)
<isi HANYA bila ada angka nyata (mis. dari kode: jumlah halaman/modul). Bila
tidak ada, tulis: "SKIP". Jangan mengarang angka.
Contoh format bila ada: Halaman = 5 halaman>

## Teknologi
<Teknologi yang BENAR dipakai (dari package.json/imports), satu per baris, mis.:
Next.js
Tailwind CSS
Firebase>

## Testimoni (OPSIONAL)
> <kutipan testimoni klien — bila tidak ada, tulis "SKIP">
- **Nama:** <nama pemberi testimoni, atau "SKIP">
- **Jabatan:** <jabatan, perusahaan, atau "SKIP">

## Data Gambar (opsional)
<Path/lokasi screenshot atau gambar di project ini (untuk diunggah ke Media LKTech).
Bila tidak ada, tulis "TIDAK ADA". Contoh:
public/screenshots/home.png
public/screenshots/mobile.png>

## Catatan Verifikasi
<Daftar hal yang KAMU TIDAK YAKINI / perlu dicek manusia, satu per baris.
Contoh:
- Angka metrik dikarang (tidak ada data asli).
- Tahun pengerjaan tidak ditemukan di git log -> pakai tahun berjalan.
- Nama klien diambil dari README, mohon dikonfirmasi.>

=== ATURAN ===
1. Bahasa Indonesia.
2. Fakta teknis (teknologi, jenis proyek, fitur) HARUS dari hasil riset — jangan karang.
3. PENTING: Bagian "Tantangan, Solusi, Hasil, Metrik, Testimoni" bersifat OPSIONAL.
   Isi HANYA bila kamu menemukan bukti/kamu sangat yakin. Bila ragu atau tidak ada
   data di project, tulis "SKIP" — JANGAN mengarang. Proyek tetap valid tanpa bagian
   tersebut (website portofolio akan menyembunyikan bagian yang kosong).
4. Yang WAJIB ada: Judul, Slug, Klien, Kategori, Layanan, Tahun, Ringkasan,
   Tags, Teknologi.
5. Slug: huruf kecil, tanda hubung, tanpa karakter aneh.
6. Jangan menambahkan bagian lain di luar template.
7. Setelah selesai, konfirmasi: "File PORTOFOLIO-DATA.md sudah dibuat." dan
   ringkas 3 fakta utama yang kamu temukan.
```

## (akhir PROMPT)

---

## Catatan untuk LKTech (internal — bukan bagian prompt)

Setelah file `.md` diterima, LKTech akan:
1. Memetakan field ke tipe `Project` (`src/lib/project-types.ts`):
   `slug, title, client, category, serviceSlug, year, summary, pages?, cover, accent,
   tags, challenge, solution, results[], metrics[], techStack[], testimonial?`.
   Field bertanda `?` / opsional boleh kosong (dilewati bila "SKIP").
2. `cover` diisi `"default"` (placeholder) + `accent` gradient default; gambar asli
   diunggah ke Media (kategori `portofolio`, `projectSlug`) via dashboard atau
   disiapkan terpisah.
3. Membuat `scripts/seed-project-<slug>.mjs` (idempoten, pola sama seperti
   `seed-product-*.mjs`) lalu menjalankannya → data masuk koleksi `projects`.

Catatan: **tantangan/solusi/hasil/metrik opsional** — halaman detail otomatis
menyembunyikan bagian tersebut bila kosong, sehingga proyek tetap tampil rapi
walau hanya berisi data dasar (kategori, judul, klien, tahun, layanan, tags,
teknologi, deskripsi, jumlah halaman, gambar).
