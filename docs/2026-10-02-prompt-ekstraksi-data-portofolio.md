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
Yang boleh dikarang hanya bagian "studi kasus" (tantangan/solusi/hasil) jika memang
tidak ada data tertulis — tandai bagian itu dengan jelas (lihat bagian ATURAN).

=== LANGKAH RISET (lakukan dulu sebelum menulis) ===
1. Baca file konfigurasi: package.json, README, next.config / config lain, .env.example.
2. Telusuri struktur folder (src/, app/, pages/, components/, api/, prisma/, dsb.).
3. Identifikasi:
   - Nama project & deskripsi singkat (dari README/package.json).
   - Jenis project (website profil, landing page, toko online, aplikasi, dashboard, dll).
   - Klien / pemilik project (nama brand/instansi bila ada).
   - Tahun pengerjaan (dari git log bila ada, atau tahun berjalan).
   - Fitur utama (dari halaman/route/komponen yang ada).
   - Teknologi & library yang benar-benar dipakai (dari package.json / imports).
4. Jika ada screenshot/aset gambar di folder publik, sebutkan path-nya.
5. Simpulkan kategori & teknologi yang paling tepat.

=== OUTPUT: tulis SATU file Markdown ===
Nama file: PORTOFOLIO-DATA.md
Isi persis mengikuti TEMPLATE di bawah (jangan tambah/kurangi judul field).
Isi setiap field dengan data hasil riset. Jangan sisakan placeholder "..." —
kalau tidak ada data, tulis nilai default yang masuk akal.

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
- **Tantangan:** <apa masalah/kebutuhan klien sebelum proyek INI — 2–4 kalimat>
- **Solusi:** <bagaimana proyek ini menjawab tantangan tsb — 2–4 kalimat>

## Tags
<3–6 kata kunci, satu per baris, mis.:
website
umkm
responsive>

## Hasil (poin dampak)
<3–6 poin, satu per baris, boleh hasil kualitatif MISALNYA:
Website resmi online 24 jam
Konten bisa dikelola mandiri
Tampilan responsif di semua perangkat>

## Metrik
<2–6 baris, format: Label = Nilai. Boleh angka realistis bila tak ada data asli:
Waktu muat = < 2 detik
Skor performa = 90+
Halaman = 5 halaman>

## Teknologi
<Teknologi yang BENAR dipakai (dari package.json/imports), satu per baris, mis.:
Next.js
Tailwind CSS
Firebase>

## Testimoni (opsional)
> <kutipan testimoni klien — bila tidak ada, tulis "TIDAK ADA">
- **Nama:** <nama pemberi testimoni, atau "TIDAK ADA">
- **Jabatan:** <jabatan, perusahaan, atau "TIDAK ADA">

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
3. Bagian "Tantangan/Solusi/Hasil/Metrik/Testimoni" boleh disusun/dikarang secara
   REALISTIS bila tidak ada data tertulis, TAPI wajib dicatat di "Catatan Verifikasi".
4. Slug: huruf kecil, tanda hubung, tanpa karakter aneh.
5. Jangan menambahkan bagian lain di luar template.
6. Setelah selesai, konfirmasi: "File PORTOFOLIO-DATA.md sudah dibuat." dan
   ringkas 3 fakta utama yang kamu temukan.

```

## (akhir PROMPT)

---

## Catatan untuk LKTech (internal — bukan bagian prompt)

Setelah file `.md` diterima, LKTech akan:
1. Memetakan field ke tipe `Project` (`src/lib/project-types.ts`):
   `slug, title, client, category, serviceSlug, year, summary, cover, accent, tags,
   challenge, solution, results[], metrics[], techStack[], testimonial?`.
2. `cover` diisi `"default"` (placeholder) + `accent` gradient default; gambar asli
   diunggah ke Media (kategori `portofolio`, `projectSlug`) via dashboard atau
   disiapkan terpisah.
3. Membuat `scripts/seed-project-<slug>.mjs` (idempoten, pola sama seperti
   `seed-product-*.mjs`) lalu menjalankannya → data masuk koleksi `projects`.
