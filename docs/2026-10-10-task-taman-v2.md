# Task Implementasi — Taman Testimoni v2

> Turunan dari `docs/2026-10-10-planning-taman-v2.md`.
> Status: **SIAP DIEKSEKUSI**. Urutan fase wajib diikuti.
> Gate per fase: `npx tsc --noEmit`, `npx eslint .`, `npm run test:taman`, `npm run build` harus hijau sebelum lanjut.

---

## 0. Keputusan final (jawaban pemilik)

| # | Topik | Keputusan |
| --- | --- | --- |
| 1 | Peta | **Tile set**, disusun di Phaser |
| 2 | Varian warna | Bebas; saya tentukan per hewan dengan peta varian |
| 3 | Lebih dari kapasitas | **Gacha/random/refresh** untuk menampilkan testimoni lain |
| 4 | Judul di dalam frame | Ya; heading asli tetap ada di DOM untuk SEO |
| 5 | Kartu testimoni | **Popup** berisi data testimoni **dan** pratinjau hewan (dengan warnanya) |
| 6 | Font pixel | Pakai font pixel gratis; dimuat hanya di section Taman |
| 7 | Budget ukuran | Ya; diukur di QA |
| 8 | Rapikan 4 testimoni lama | Ya; sekaligus **upgrade dashboard kelola testimoni secara lengkap** |
| 9 | Mesin kanvas | **Phaser** (dynamic import, hanya di halaman Taman) |

### Tambahan dari keputusan #8 (dashboard lengkap)

- Kolom hewan + warna di daftar testimoni, dengan pratinjau.
- Pemilih hewan + warna di panel detail admin (dengan pratinjau tint).
- Halaman **Pratinjau Kanvas** memakai kanvas Phaser sesungguhnya (bukan daftar sederhana).
- Pengaturan tata letak: prioritas urutan, dan tombol acak pool untuk pratinjau.
- Ringkasan statistik per hewan (jumlah testimoni terbit per hewan) untuk membantu variasi.

---

## V2-0 — Audit & keputusan teknis

- [x] Audit aset & kanvas v1 (`public/taman`, `gen-taman-sprites.mjs`, `taman-client.tsx`) dan catat apa yang bisa dipakai ulang.
- [x] Tetapkan ukuran tile (usulan 16 px, diskalakan 3–4× di Phaser) dan ukuran dunia (mis. 40×24 tile).
- [x] Tetapkan struktur atlas sprite hewan: frame jalan (2–4), ukuran, dan titik jangkar.
- [x] Tetapkan peta varian warna per hewan (`ANIMAL_VARIANTS`) beserta nilai tint.
- [x] Tetapkan titik spawn hewan per zona (darat, kolam, kabel listrik, langit) agar cocok dengan perilaku.
- [ ] Ukur baseline: ukuran bundel halaman `/` sebelum Phaser, dan target setelahnya.
- [x] Tulis keputusan ke bagian "Keputusan V2-0" di bawah.

### Keputusan V2-0

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Format aset | **PNG** (bukan SVG) | Phaser tidak memuat SVG sebagai tekstur dengan andal. Aset v1 (SVG) tetap dipakai komponen v1 sampai kanvas baru mengambil alih. |
| Ukuran tile | **16×16 px**, diskalakan di Phaser | Peta luas dengan sprite asli kecil; sesuai permintaan "hewan kecil-kecil, peta luas". |
| Ukuran dunia | **40×24 tile** (640×384 px) | Cukup luas untuk rumah, ladang, kolam, kabel listrik; diskalakan penuh ke layar. |
| Sprite hewan | **16×16/frame**, 4 frame jalan (down/up/side pakai flip) | Animasi jalan sederhana, hemat aset. |
| Warna | 8 varian lewat **tint**, satu sprite dasar per hewan | Menghindari 64 set sprite; aset kecil. |
| Tile peta | Tile 16×16: rumput, jalan, air, tanah, atap, dinding, pagar, pohon, bunga, kabel listrik, tiang | Disusun jadi peta di scene. |
| Zona spawn | `darat`, `kolam`, `kabel`, `langit` | Perilaku hewan mengikuti zona. |
| Pembuatan PNG | `sharp` (devDependency eksplisit) dijalankan manual via `npm run gen:taman` | Tidak menambah beban runtime; `sharp` sudah ada di pohon dependensi. |

**Verifikasi:** dokumen diperbarui; tidak ada perubahan kode yang perlu build.

---

## V2-1 — Data, validasi, dan migrasi

- [ ] `taman-types.ts`: tambah `AnimalVariant`, `ANIMAL_VARIANTS` (peta hewan → varian yang tersedia), `VARIANT_TINT` (nilai warna untuk runtime).
- [ ] `TamanTestimonial`: tambah `variant: AnimalVariant`.
- [ ] `taman-logic.ts`: normalisasi `variant` (data lama → `"normal"`), validasi pasangan hewan+warna, helper `variantTint`.
- [ ] `submit/route.ts`: terima `animal` + `variant` dari user (validasi ketat), ganti aturan "admin menetapkan hewan".
- [ ] `api-schemas.ts`: tambah field ke schema validasi submit.
- [ ] Panel admin: izinkan mengubah hewan + warna (lihat V2-8 untuk UI lengkap; di sini cukup API).
- [ ] Aksi **Rapikan**: tetapkan hewan **dan varian** merata untuk testimoni terbit.
- [ ] Test: normalisasi variasi, validasi pasangan, tint, rapikan menetapkan varian berbeda.

**Verifikasi:** `test:taman` hijau (termasuk test baru), `build` hijau.

---

## V2-2 — Aset (tile, sprite, objek)

- [ ] Perluas `scripts/gen-taman-sprites.mjs`:
  - Tile peta: rumput, jalan, air kolam, tanah, atap/lantai rumah, dinding, pagar, pohon, bunga, kabel listrik, tiang.
  - Sprite hewan **dengan frame animasi** (jalan 2–4 frame). 8 hewan, satu set dasar (untuk tint).
  - Objek: wortel, biji, dan dekor kecil.
- [ ] Hasilkan atlas sederhana (satu PNG per kelompok) atau JSON tilemap; dokumentasikan cara memuatnya di Phaser.
- [ ] Ukur total ukuran aset; usahakan ≤ 150 KB untuk seluruh tile + sprite dasar.
- [ ] Simpan hasil di `public/taman/v2/` (tidak menimpa aset v1 agar aman sampai kanvas baru dipakai).

**Verifikasi:** script dijalankan, hasil di-commit, ukuran dilaporkan.

---

## V2-3 — Halaman form `/taman/tulis`

- [ ] Halaman baru `/taman/tulis` (Navbar/Footer seperti halaman lain). Gate login → `/masuk?next=/taman/tulis`.
- [ ] Form lengkap: nama tampil, peran, pesan, rating, tanggal, tautan proyek/produk (opsional).
- [ ] Pemilih hewan: grid 8 hewan, pratinjau sprite.
- [ ] Pemilih warna: deretan varian untuk hewan terpilih, pratinjau tint langsung.
- [ ] Pratinjau mini "hewan + warna" sesuai tampilan di kanvas.
- [ ] Persetujuan: checkbox + teks. Tombol kirim memanggil `/api/taman/submit` dengan `animal` + `variant`.
- [ ] `/taman/kirim` lama dialihkan ke `/taman/tulis` (redirect), agar tautan lama tidak rusak.

**Verifikasi:** `tsc`/`lint`/`build` hijau. Uji manual oleh pemilik.

---

## V2-4 — Beranda: section full-bleed + judul di dalam frame

- [ ] Section Taman: lebar 100%, tinggi `100dvh`, tanpa padding luar.
- [ ] Judul (badge, judul, deskripsi) dipindah ke dalam frame, tengah atas, memakai font pixel. **Heading asli tetap di DOM** (`h2`) untuk SEO.
- [ ] Muat font pixel hanya di section ini (mis. `next/font` atau CSS `@font-face` dengan `display: swap`).
- [ ] Tombol **"Tulis testimoni"** di dalam frame → `/taman/tulis`.
- [ ] Tombol **"Acak lagi"** (gacha) tetap ada, dipindah ke dalam frame.
- [ ] Area kartu testimoni disiapkan sebagai lapisan DOM di atas kanvas.

**Verifikasi:** `tsc`/`lint`/`build` hijau; cek manual ukuran penuh di desktop & mobile.

---

## V2-5 — Kanvas Phaser

- [ ] Pasang Phaser sebagai dependensi, **dynamic import** hanya di komponen kanvas (`ssr: false`).
- [ ] `taman-phaser.tsx`: inisialisasi game, scene peta (tile), kamera mengikuti ukuran container.
- [ ] Peta: susun tile dari V2-2 (rumah, ladang, kolam, kabel listrik, pagar, pohon, jalan).
- [ ] Spawn hewan: maksimum 15, posisi awal dari zona per hewan, warna dari `variant` (tint).
- [ ] AI gerak bebas per hewan (lihat tabel perilaku di planning §9): kejar-kejaran, makan wortel, terbang mondar-mandir lalu hinggap di kabel, berenang di kolam, jalan pelan, dll.
- [ ] Interaksi: klik/tap hewan → kabari React (event) untuk membuka kartu; kamera zoom ringan.
- [ ] Gacha: hewan yang ditampilkan diambil dari pool (maks 15), tombol acak memilih subset baru.
- [ ] Batas performa: jumlah sprite aktif, dan hentikan animasi bila tab tidak aktif.

**Verifikasi:** `tsc`/`lint`/`build` hijau; laporan FPS kasar di desktop & mobile (jika bisa diukur).

---

## V2-6 — Kartu testimoni (popup + hewan), aksesibilitas, SEO

- [ ] Popup kartu: berisi data testimoni **dan** pratinjau hewan besar dengan warnanya (keputusan #5).
- [ ] Posisi: mengikuti koordinat hewan di desktop (konversi canvas → layar); bottom sheet di mobile.
- [ ] Keyboard: jalur tombol DOM `sr-only` untuk membuka tiap testimoni; Esc menutup; fokus kembali.
- [ ] Screen reader: daftar `sr-only` lengkap + tombol nyata (bukan hanya teks).
- [ ] `prefers-reduced-motion`: hewan diam (tidak bergerak), kanvas tetap tampil, kartu tetap berfungsi.
- [ ] JSON-LD tetap dibangun dari data sah (`buildTamanReviewJsonLd`), tidak berubah.

**Verifikasi:** `tsc`/`lint`/`build` hijau; cek manual keyboard & reduced motion.

---

## V2-7 — Dashboard kelola testimoni (lengkap, keputusan #8)

- [ ] Daftar: kolom **hewan + warna** dengan pratinjau kecil, selain kolom yang sudah ada.
- [ ] Panel detail: pemilih hewan **dan** warna (pratinjau tint), selain field lama.
- [ ] Halaman **Pratinjau Kanvas** (`/admin/taman/pratinjau`): pakai kanvas Phaser sungguhan, termasuk tombol acak, cocok untuk melihat hasil sebelum publikasi.
- [ ] Pengaturan tata letak: prioritas urutan (sudah ada) + tombol **Acak pool** untuk pratinjau distribusi.
- [ ] Ringkasan statistik per hewan: jumlah testimoni terbit per hewan (bantu variasi).
- [ ] Aksi **Rapikan hewan & urutan** diperluas: tetapkan varian juga.

**Verifikasi:** `tsc`/`lint`/`build` hijau; cek manual.

---

## V2-8 — QA, performa, dokumentasi, rilis

- [ ] Ukur dampak Phaser: ukuran bundel halaman Taman sebelum vs sesudah (dynamic import terbukti tidak membebani halaman lain).
- [ ] Cek jumlah sprite vs FPS di mobile (perkiraan, jika memungkinkan).
- [ ] Uji regresi: beranda tanpa testimoni (section tersembunyi), kartu, gacha, form kirim, dashboard, JSON-LD, `sr-only`.
- [ ] Jalankan gate penuh: `tsc`, `lint`, semua `test:*`, `build`.
- [ ] Perbarui `docs/2026-10-10-taman-pixel.md` (atau dokumen v2 baru) + `docs/README.md` + `TASK-SELANJUTNYA.md`.
- [ ] Commit & push **hanya setelah** pemilik minta.

---

## Definition of Done (v2)

1. Dua jalur kirim testimoni (beranda & akun) menuju halaman form yang sama.
2. Form halaman sendiri, user memilih hewan **dan** warna dengan pratinjau.
3. Kanvas 100% lebar dan 100vh di desktop & mobile; judul di dalam frame dengan font pixel; heading DOM tetap ada.
4. Kanvas menampilkan peta tile (rumah, ladang, kolam, kabel listrik) dan hingga 15 hewan dengan perilaku berbeda.
5. Klik hewan membuka popup yang menampilkan data testimoni **dan** hewan.
6. Keyboard & screen reader dapat mengakses semua testimoni; `prefers-reduced-motion` dihormati.
7. JSON-LD dan `sr-only` membuat testimoni tetap terbaca crawler.
8. Dashboard lengkap: daftar + panel detail (hewan & warna), Pratinjau Kanvas nyata, statistik per hewan, aksi Rapikan (hewan + varian).
9. `tsc`, `lint`, semua test, `build` hijau; ukuran tambahan halaman Taman dilaporkan.

## Risiko utama (diingat saat eksekusi)

1. **Phaser ±1 MB** dan tidak ramah crawler — dimuat dinamis, DOM `sr-only` dipertahankan.
2. **15 hewan + animasi** bisa berat di mobile — batasi sprite, hentikan saat tab tidak aktif.
3. **Aset 8 hewan × 8 warna** — satu sprite dasar per hewan + tint runtime.
4. **Perubahan bentuk data** (variant) — normalisasi + aksi Rapikan.
