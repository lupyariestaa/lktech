# Planning — Taman Testimoni v2 (Form Terpisah, Varian Warna, Kanvas Phaser)

> Status: **PLANNING** (belum dieksekusi). Setelah disetujui, dipecah menjadi task doc per fase.
> Tanggal: 2026-10-10.
> Lanjutan dari: [`2026-10-10-taman-pixel.md`](2026-10-10-taman-pixel.md) (v1) dan [`2026-10-10-planning-testimoni-taman-pixel.md`](2026-10-10-planning-testimoni-taman-pixel.md).
> Referensi terkait: berkas panjang di `docs/product-shopee-lktech/product.md` untuk gaya penulisan produk (tidak dipakai sebagai acuan teknis).

---

## 1. Ringkasan permintaan pemilik

1. **Dua jalur kirim testimoni**: dari dashboard akun **dan** langsung dari halaman Taman di beranda.
2. **Form jadi halaman sendiri** (`/taman/tulis`), bukan popup atau dialog. Di dalamnya user **memilih hewan** dan **varian warna hewan**.
3. **Kanvas penuh layar**: lebar 100% dan tinggi 100vh di desktop **dan** mobile. Judul, badge, dan deskripsi seksi dipindah **ke dalam frame kanvas** di bagian tengah atas, dengan font pixel.
4. **Kanvas seperti game**: peta taman luas (rumah, ladang, kolam, kabel listrik, pagar, pohon), hewan bergerak bebas dan interaktif, bisa menampung **±15 testimoni** dalam satu kanvas.
5. **Mesin kanvas**: **Phaser** (keputusan pemilik, setelah dijelaskan konsekuensinya).

## 2. Non-tujuan

- Multiplayer atau interaksi antar pengunjung.
- Menyimpan posisi hewan di server (posisi dihasilkan klien, deterministik dari id).
- Mengubah sistem ulasan produk, kupon, atau pesanan.
- Mengganti JSON-LD dan daftar `sr-only` (tetap dipertahankan untuk SEO dan aksesibilitas).

## 3. Keputusan yang sudah pasti

| # | Topik | Keputusan |
| --- | --- | --- |
| K1 | Pemilih hewan & warna | **User** memilih saat mengirim. Admin boleh mengubah saat moderasi. |
| K2 | Mesin kanvas | **Phaser**. Dimuat hanya di halaman Taman, bukan di bundel global. |
| K3 | Urutan kerja | Fase 1 data & form dulu, kanvas menyusul (sesuai pilihan pemilik). |
| K4 | Ukuran kanvas | **100% lebar, 100vh**, di desktop dan mobile. |
| K5 | Judul seksi | Badge, judul, deskripsi **di dalam frame**, tengah atas, font pixel. |
| K6 | Kapasitas | Sekitar 15 hewan aktif dalam satu kanvas (peta luas, hewan kecil). |
| K7 | SEO & a11y | Teks testimoni tetap dirender DOM (`sr-only`) + JSON-LD tetap dari data sah. |
| K8 | Contoh (sample) | Aturan lama tetap: hanya lokal & pratinjau admin, tidak tampil publik (D2 v1). |

## 4. Konsekuensi Phaser (dicatat, agar tidak mengejutkan)

- **Ukuran bundel**: Phaser menambah ±1 MB. Mitigasi: dynamic import (`await import("phaser")`) hanya saat komponen kanvas mount, sehingga halaman lain tidak terpengaruh. Saya akan ukur dampaknya di fase QA.
- **SEO**: isi `<canvas>` tidak dibaca crawler. Mitigasi: daftar testimoni `sr-only` tetap ada, dan JSON-LD tetap dibangun dari data.
- **Aksesibilitas**: pengguna screen reader tidak dapat mengakses hewan di canvas. Mitigasi: sediakan daftar tombol tersembunyi secara visual (`sr-only`) yang membuka kartu testimoni, sehingga pengalaman keyboard dan screen reader tetap penuh. Tombol DOM ini juga menjadi jalur utama navigasi keyboard.
- **Performa mobile**: banyak sprite + gerak bebas bisa berat. Mitigasi: batasi jumlah sprite aktif, gunakan tekstur atlas kecil, dan hormati `prefers-reduced-motion` (kanvas tetap tampil, gerakan dimatikan).

## 5. Model data (perubahan)

### 5.1 `AnimalVariant` (baru)
```ts
type AnimalKey = "kucing" | "kelinci" | "burung" | "rubah" | "beruang" | "kura-kura" | "kupu-kupu" | "ikan";
type AnimalVariant = "normal" | "putih" | "hitam" | "coklat" | "emas" | "biru" | "abu" | "merah";
```
- Warna disimpan per testimoni: `animal: AnimalKey`, `variant: AnimalVariant`.
- Backward-compat: data lama tanpa `variant` → `"normal"`.
- Daftar varian yang tersedia per hewan diatur di satu peta (`ANIMAL_VARIANTS`), karena tidak semua warna cocok untuk semua hewan (mis. ikan tanpa "emas"? — dicek di fase desain aset).

### 5.2 Perubahan validasi
- `tamanSchema` untuk submit: `animal` dan `variant` **wajib** (dari pilihan user).
- Aturan lama "admin menetapkan hewan" diganti: hewan datang dari user; admin boleh mengubah.
- Hewan tetap divalidasi terhadap daftar resmi (tidak menerima nilai sembarang).

### 5.3 Data lama
- 4 testimoni yang sudah ada (semua `kucing`, `order: 0`) diberi varian berbeda lewat aksi **Rapikan hewan & urutan** yang sudah ada, diperluas agar juga menetapkan varian merata.

## 6. Aset (perlu ditambah)

1. **Peta taman** (satu gambar besar, pixel art) atau disusun dari tile:
   - Rumah, ladang, kolam (untuk ikan), kabel listrik (untuk burung), pagar, pohon, jalan setapak, bunga.
   - Opsi: **tile set** (16×16 atau 32×32) lalu disusun di Phaser, atau **satu peta jadi** (PNG besar). Saya usulkan **tile set**, karena lebih kecil dan mudah diubah susunannya.
2. **Sprite hewan dengan animasi**: tiap hewan minimal 2–4 frame untuk berjalan. Total 8 hewan × 8 warna = 64 kombinasi. Menyimpan 64 set frame penuh itu berat.
   - **Keputusan teknis usulan**: satu sprite dasar per hewan (grayscale/putih), lalu **tint** warna saat runtime di Phaser. Dengan begitu hanya perlu 8 sprite dasar + daftar warna tint. Ini mengurangi aset drastis.
3. **Sprite objek**: wortel (untuk kelinci makan), biji/umpan, dan elemen dekor.
4. Generator aset tetap `scripts/gen-taman-sprites.mjs`, diperluas untuk tile dan frame animasi.

## 7. Rancangan halaman Taman (beranda)

- Section **full-bleed**: lebar 100%, tinggi 100vh (`h-[100dvh]`), tanpa padding luar.
- **Judul di dalam frame**: badge (eyebrow), judul, dan deskripsi dirender sebagai DOM di atas canvas (posisi tengah atas), memakai font pixel untuk badge dan judul. Diletakkan di DOM, bukan di canvas, agar tetap terbaca dan tajam.
- **Canvas Phaser** mengisi seluruh section di belakang judul.
- **Kartu testimoni**: tetap DOM, muncul saat hewan diklik. Popover diposisikan terhadap koordinat hewan (dari canvas ke layar), atau bottom sheet di mobile.
- **Tombol "Tulis testimoni"** di dalam frame (mis. pojok bawah), mengarah ke `/taman/tulis`.
- **Daftar tombol `sr-only`** untuk navigasi keyboard dan screen reader.

## 8. Rancangan form `/taman/tulis`

- Halaman sendiri (bukan popup), memakai `Navbar`/`Footer` seperti halaman lain.
- Gate login: belum masuk → arahkan ke `/masuk?next=/taman/tulis`.
- Langkah form:
  1. Data testimoni: nama tampil, peran/usaha, pesan, rating, tanggal, tautan proyek/produk (opsional).
  2. **Pemilih hewan**: grid 8 hewan dengan pratinjau sprite.
  3. **Pemilih warna**: deretan varian untuk hewan terpilih, dengan pratinjau langsung (tint).
  4. Persetujuan: checkbox + teks persetujuan.
- Pratinjau: miniatur "hewan + warna" yang dipilih, sesuai tampilan di kanvas.
- Setelah kirim: sukses dan tautan ke tab "Testimoni saya".
- Jalur kedua (dashboard akun) tetap ada: tab "Testimoni saya" mendapat tombol "Tulis testimoni" menuju halaman yang sama.

## 9. Perilaku hewan di kanvas (usulan)

| Hewan | Perilaku |
| --- | --- |
| Kucing | Berlari mengejar hewan lain secara berkala (tanpa menyentuh), lalu berhenti menjilat |
| Kelinci | Mendekati wortel, makan (animasi), lalu melompat-lompat |
| Burung | Terbang mondar-mandir, sesekali hinggap di kabel listrik |
| Ikan | Berenang di kolam, muncul ke permukaan, kembali menyelam |
| Kura-kura | Berjalan pelan mondar-mandir |
| Rubah | Berjalan mengelilingi ladang |
| Beruang | Duduk dekat rumah, sesekali berdiri dan berjalan |
| Kupu-kupu | Terbang tidak beraturan di antara bunga |

- Klik/tap hewan → kamera mendekat sedikit, lalu kartu testimoni terbuka.
- `prefers-reduced-motion`: hewan diam di posisinya, kartu tetap bisa dibuka.

## 10. Rencana fase

| Fase | Fokus | Ketergantungan |
| --- | --- | --- |
| **V2-0** | Audit & keputusan teknis (peta tile vs peta jadi, atlas sprite, tint warna, ukuran canvas) | — |
| **V2-1** | Data & validasi: `AnimalVariant`, peta varian, submit menerima `animal`+`variant`, normalisasi & migrasi, `Rapikan` menetapkan varian, test | V2-0 |
| **V2-2** | Aset: tile peta, sprite hewan dengan animasi, objek; generator diperluas; anggaran ukuran | V2-0 |
| **V2-3** | Halaman form `/taman/tulis` (data + pemilih hewan + pemilih warna + pratinjau) | V2-1 |
| **V2-4** | Beranda: section full-bleed 100vh, judul di dalam frame (font pixel), tombol tulis, integrasi kartu testimoni | V2-3 |
| **V2-5** | Kanvas Phaser: peta, spawn hewan (maks ±15), AI gerak, interaksi klik | V2-2, V2-4 |
| **V2-6** | Aksesibilitas & SEO: daftar `sr-only` sebagai jalur keyboard, JSON-LD tetap, reduced-motion | V2-5 |
| **V2-7** | QA, performa (ukuran bundel, FPS mobile), dokumentasi, rilis | semua |

## 11. Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Bundel +1 MB (Phaser) | Halaman lain ikut berat bila salah import | Dynamic import hanya di komponen kanvas; ukur di V2-7 |
| SEO turun karena konten di canvas | Crawler tidak melihat testimoni | Daftar `sr-only` + JSON-LD tetap |
| Screen reader tidak bisa akses hewan | Kehilangan aksesibilitas | Tombol DOM `sr-only` sebagai jalur penuh |
| 15 hewan + animasi berat di mobile | FPS rendah, baterai boros | Batas sprite aktif, atlas kecil, matikan gerak saat reduced-motion |
| 64 kombinasi hewan×warna | Aset membengkak | Satu sprite dasar per hewan + tint runtime |
| Perubahan data `variant` | Data lama tidak konsisten | Normalisasi default + aksi Rapikan |

## 12. Keputusan final pemilik (pertanyaan sudah dijawab)

1. Peta: **tile set** (ya).
2. Varian warna: diserahkan ke saya; pakai peta varian per hewan.
3. Lebih dari kapasitas: **gacha/random/refresh** (ya).
4. Judul di dalam frame: ya; heading asli tetap di DOM.
5. Kartu: **popup** berisi data + **pratinjau hewan**.
6. Font pixel: font gratis, dimuat hanya di section Taman.
7. Budget ukuran: ya, diukur di QA.
8. Rapikan 4 testimoni lama: ya, sekaligus **upgrade dashboard lengkap**.

### Catatan pertanyaan (arsip)

1. **Peta**: setuju memakai **tile set** dan menyusunnya di Phaser (bukan satu gambar peta jadi)? *(Usulan saya: ya.)*
2. **Warna**: dari daftar varian usulan (`normal, putih, hitam, coklat, emas, biru, abu, merah`), mana yang boleh dipakai semua hewan, dan mana yang khusus? Misalnya "emas" hanya untuk ikan, "merah" untuk rubah.
3. **Jumlah hewan per kanvas**: 15 adalah target. Kalau testimoni lebih dari 15, apakah sisanya diacak (gacha seperti v1) atau ditampilkan bertahap? *(Usulan: gacha tetap.)*
4. **Judul di dalam frame**: tetap ada teks alternatif untuk SEO (heading asli di DOM)? *(Usulan: ya, heading DOM di atas canvas.)*
5. **Kartu testimoni**: popover mengikuti posisi hewan, atau panel tetap (mis. kiri bawah) agar tidak menutup peta? *(Usulan: popover mengikuti hewan di desktop, bottom sheet di mobile.)*
6. **Font pixel**: pakai font pixel web (mis. "Press Start 2P", lisensi SIL OFL) atau font pixel lokal yang kamu sediakan? *(Usulan: font pixel gratis, dimuat hanya di section Taman.)*
7. **Performance budget**: target ukuran tambahan halaman Taman, mis. ≤ 1,3 MB total dengan Phaser. Setuju? *(Usulan: ya, diukur di V2-7.)*
8. **Aksi rapikan**: boleh saya jalankan untuk merapikan 4 testimoni yang sudah ada (menetapkan varian berbeda)? *(Usulan: ya.)*

## 13. Definition of Done (v2)

1. User bisa mengirim testimoni dari beranda dan dari akun; keduanya menuju halaman form yang sama.
2. Form adalah halaman terpisah, dan user memilih hewan serta warna dengan pratinjau.
3. Kanvas memenuhi 100% lebar dan 100vh di desktop dan mobile, dengan judul (badge, judul, deskripsi) di dalam frame.
4. Kanvas menampilkan peta taman dan maksimal ±15 hewan yang bergerak, dengan perilaku berbeda per hewan.
5. Klik hewan membuka kartu testimoni yang benar.
6. Keyboard dan screen reader dapat mengakses semua testimoni (via jalur DOM `sr-only`).
7. `prefers-reduced-motion` dihormati.
8. JSON-LD dan daftar `sr-only` tetap membuat testimoni terbaca crawler.
9. `tsc`, `lint`, semua test, dan `build` hijau; ukuran tambahan halaman Taman diukur dan dilaporkan.

## 14. Langkah berikut setelah persetujuan

1. Jawab pertanyaan §12.
2. Buat task doc `docs/2026-10-10-task-taman-v2.md` (rincian per fase V2-0…V2-7).
3. Eksekusi berurutan, satu commit per fase, dengan gate `tsc`/`lint`/test/`build` di setiap fase.
