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
| Sprite hewan | **24×24/frame**, **6 pose per hewan**, sprite sheet horizontal | Revisi V2-2: pada 16×16 detail tidak cukup (mata/moncong/ekor hilang) dan hanya 1 pose terasa mati. Keputusan pemilik: 24×24 + 6 pose agar hidup (idle, walk, run, +3 khusus per hewan). |
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
- [x] Panel admin: izinkan mengubah hewan + warna (lihat V2-8 untuk UI lengkap; di sini cukup API).
- [x] Aksi **Rapikan**: tetapkan hewan **dan varian** merata untuk testimoni terbit.
- [x] Test: normalisasi variasi, validasi pasangan, tint, rapikan menetapkan varian berbeda.

**Verifikasi:** `test:taman` hijau (termasuk test baru), `build` hijau.

---

## V2-2 — Aset (tile, sprite, objek)

- [x] Perluas `scripts/gen-taman-sprites.mjs`:
  - Tile peta: rumput, jalan, air kolam, tanah, atap/lantai rumah, dinding, pagar, pohon, bunga, kabel listrik, tiang.
  - Sprite hewan **dengan frame animasi**. 8 hewan, satu set dasar (untuk tint): **24×24 px, 6 pose** (idle0, idle1, walk0, walk1, +2 aksi khusus per hewan). Kucing jadi template; 7 hewan lain menyusul setelah kucing dinyatakan pass.
  - Objek: wortel, biji, dan dekor kecil (wortel sudah ada; biji/dekor menyusul jika perlu).
- [x] Hasilkan atlas sederhana (satu PNG per kelompok) atau JSON tilemap; dokumentasikan cara memuatnya di Phaser.
- [x] Ukur total ukuran aset; usahakan ≤ 150 KB untuk seluruh tile + sprite dasar.
- [x] Simpan hasil di `public/taman/v2/` (tidak menimpa aset v1 agar aman sampai kanvas baru dipakai).

**Verifikasi:** script dijalankan, hasil di-commit, ukuran dilaporkan.

### Status V2-2 (aktual)

- Generator hewan baru: `scripts/gen-taman-animals.mjs` (+ `scripts/gen-taman-animal-art.mjs` untuk data grid).
- Script npm: `npm run gen:taman-animals` (hewan 24×24/6 pose), `npm run gen:taman-v2` (tile/objek).
- 8 hewan **selesai** dengan 6 pose: kucing, kelinci, burung, rubah, beruang, kura-kura, kupu-kupu, ikan.
- Ukuran sprite hewan total **2.690 B (~2,6 KB)** — jauh di bawah anggaran 150 KB.
- Halaman pratinjau: **`/taman/aset`** (`src/app/taman/aset/page.tsx` + `src/components/taman/aset-preview.tsx`) — pilih warna (tint) & ukuran, lihat semua pose tiap hewan.
- Gate fase: `tsc` hijau, `eslint` hijau, `test:taman` 67 hijau, `build` hijau.
- Perwarnaan masih via `filter: drop-shadow` di halaman pratinjau; tint Phaser sesungguhnya menyusul di V2-5.


---

## V2-3 — Halaman form `/taman/tulis`

- [x] Halaman baru `/taman/tulis` (Navbar/Footer seperti halaman lain). Gate login → `/masuk?next=/taman/tulis`.
- [x] Form lengkap: nama tampil, peran, pesan, rating, tanggal, tautan proyek/produk (opsional).
- [x] Pemilih hewan: grid 8 hewan, pratinjau sprite.
- [x] Pemilih warna: deretan varian untuk hewan terpilih, pratinjau tint langsung.
- [x] Pratinjau mini "hewan + warna" sesuai tampilan di kanvas.
- [x] Persetujuan: checkbox + teks. Tombol kirim memanggil `/api/taman/submit` dengan `animal` + `variant`.
- [x] `/taman/kirim` lama dialihkan ke `/taman/tulis` (redirect), agar tautan lama tidak rusak.

**Verifikasi:** `tsc`/`lint`/`build` hijau. Uji manual oleh pemilik.

### Status V2-3 (aktual)

- Komponen pemilih reusable: `src/components/taman/taman-animal-picker.tsx` (`AnimalPicker`, `AnimalSprite`) — dipakai juga di dashboard V2-7.
- Form: `src/components/taman/taman-tulis-form.tsx` (pengganti `taman-submit-form.tsx` lama, yang dihapus).
- Halaman: `src/app/taman/tulis/page.tsx`.
- Redirect 301: `next.config.ts` → `/taman/kirim` ⇒ `/taman/tulis` (folder `src/app/taman/kirim` dihapus).
- Tautan diperbarui: `account-taman.tsx` (tombol "Tulis testimoni" → `/taman/tulis`).
- Tint pratinjau via `V2_VARIANT_TINT` (`taman-logic.ts`) + `filter: drop-shadow`.
- Gate fase: `tsc` ✅ · `eslint` ✅ · `test:taman` 67 ✅ · `build` ✅.


---

## V2-4 — Beranda: section full-bleed + judul di dalam frame

- [x] Section Taman: lebar 100%, tinggi `100dvh`, tanpa padding luar.
- [x] Judul (badge, judul, deskripsi) dipindah ke dalam frame, tengah atas, memakai font pixel. **Heading asli tetap di DOM** (`h2`) untuk SEO.
- [x] Muat font pixel hanya di section ini (mis. `next/font` atau CSS `@font-face` dengan `display: swap`).
- [x] Tombol **"Tulis testimoni"** di dalam frame → `/taman/tulis`.
- [x] Tombol **"Acak lagi"** (gacha) tetap ada, dipindah ke dalam frame.
- [x] Area kartu testimoni disiapkan sebagai lapisan DOM di atas kanvas.

**Verifikasi:** `tsc`/`lint`/`build` hijau; cek manual ukuran penuh di desktop & mobile.

### Status V2-4 (aktual)

- Font pixel: `src/components/taman/taman-font.ts` — `Press_Start_2P` (`next/font/google`, `preload:false`, `display:swap`) → CSS var `--font-taman-pixel`, hanya dipakai di seksi Taman (tidak diunduh di halaman lain).
- `taman-section.tsx`: `<section>` full-bleed (`h-[100dvh] min-h-[560px] w-full`), heading `h2` asli di `sr-only` (`aria-labelledby`), visual judul di dalam frame.
- `taman-client.tsx`: judul/badge/deskripsi + tombol **Tulis testimoni** & **Acak lagi** kini di dalam frame (overlay DOM di atas peta); kartu popover/sheet tetap.
- CSS var font dipakai lewat kelas `font-[family-name:var(--font-taman-pixel)]`.
- Kanvas Phaser asli menyusul di V2-5 (sekarang masih DOM + latar SVG v1).
- Gate fase: `tsc` ✅ · `eslint` ✅ · `test:taman` 67 ✅ · `build` ✅ (beranda tetap Static).


---

## V2-5 — Kanvas Phaser

- [x] Pasang Phaser sebagai dependensi, **dynamic import** hanya di komponen kanvas (`ssr: false`).
- [x] `taman-phaser.tsx`: inisialisasi game, scene peta (tile), kamera mengikuti ukuran container.
- [x] Peta: susun tile dari V2-2 (rumah, ladang, kolam, kabel listrik, pagar, pohon, jalan).
- [x] Spawn hewan: maksimum 15, posisi awal dari zona per hewan, warna dari `variant` (tint).
- [x] AI gerak bebas per hewan (lihat tabel perilaku di planning §9): kejar-kejaran, makan wortel, terbang mondar-mandir lalu hinggap di kabel, berenang di kolam, jalan pelan, dll.
- [x] Interaksi: klik/tap hewan → kabari React (event) untuk membuka kartu; kamera zoom ringan.
- [x] Gacha: hewan yang ditampilkan diambil dari pool (maks 15), tombol acak memilih subset baru.
- [x] Batas performa: jumlah sprite aktif, dan hentikan animasi bila tab tidak aktif.

**Verifikasi:** `tsc`/`lint`/`build` hijau; laporan FPS kasar di desktop & mobile (jika bisa diukur).

### Status V2-5 (aktual)

- Dependensi: **phaser 3.90.0** (`dependencies`).
- Data dunia murni: `src/lib/taman-world.ts` (peta 40×24, zona `darat/kolam/kabel/langit`, gaya gerak & kecepatan, helper `parseWorld`/`randomInZone`/`mulberry32`) — ikut diuji.
- Scene Phaser: `src/components/taman/taman-scene.ts` (`startTamanPhaser`) — muat tile & sprite sheet 6-frame, bangun peta, spawn hewan + `setTint` per varian, AI per gaya, klik→`onPick(id)`, kamera auto-fit.
- Wrapper React: `src/components/taman/taman-phaser.tsx` — dynamic import (klien saja), sinkron callback via effect.
- Integrasi: `taman-client.tsx` kanvas di belakang judul/tombol (DOM), jalur keyboard/screen reader pakai tombol `sr-only`; popover diposisikan dari posisi hewan (px→persen lewat `ResizeObserver`).
- `taman-animal.tsx` (DOM hewan v1) dihapus — visual dipindah ke kanvas.
- `TamanPublicView` kini menyertakan `variant` (whitelist aman) agar tint & pratinjau kartu benar.
- `prefers-reduced-motion`: hewan diam di posisinya (tanpa tween), kanvas tetap tampil.
- **Ukuran bundel:** chunk Phaser ≈ **1.164 KB**, **tidak** di-preload di HTML beranda (dynamic import terbukti) — halaman lain tidak terbebani.
- Gate fase: `tsc` ✅ · `eslint` ✅ · `test:taman` **72** ✅ · `build` ✅.


---

## V2-6 — Kartu testimoni (popup + hewan), aksesibilitas, SEO

- [x] Popup kartu: berisi data testimoni **dan** pratinjau hewan besar dengan warnanya (keputusan #5).
- [x] Posisi: mengikuti koordinat hewan di desktop (konversi canvas → layar); bottom sheet di mobile.
- [x] Keyboard: jalur tombol DOM `sr-only` untuk membuka tiap testimoni; Esc menutup; fokus kembali.
- [x] Screen reader: daftar `sr-only` lengkap + tombol nyata (bukan hanya teks).
- [x] `prefers-reduced-motion`: hewan diam (tidak bergerak), kanvas tetap tampil, kartu tetap berfungsi.
- [x] JSON-LD tetap dibangun dari data sah (`buildTamanReviewJsonLd`), tidak berubah.

**Verifikasi:** `tsc`/`lint`/`build` hijau; cek manual keyboard & reduced motion.

### Status V2-6 (aktual)

- Kartu (`taman-card.tsx`) kini menampilkan **pratinjau hewan + warna** (`AnimalSprite`, 48 px) di dalam popup — sesuai keputusan #5.
- Label Indonesia terpusat: `ANIMAL_LABEL` & `VARIANT_LABEL` di `taman-types.ts` (dipakai kartu, picker, pratinjau form).
- Posisi popover desktop dihitung dari posisi hewan di kanvas (px→persen lewat `ResizeObserver`); mobile tetap bottom sheet (`aria-modal`).
- Keyboard: jalur tombol `sr-only` (roving tabindex, panah), Esc menutup, fokus dikembalikan ke tombol hewan setelah tutup. Kanvas `aria-hidden` (pembaca layar memakai jalur DOM).
- Reduced motion: scene tidak meng-update (hewan diam), posisi dilaporkan sekali untuk anchor; kartu & tombol tetap berfungsi.
- Perf: `onFrame` di-throttle ~10 fps (cukup untuk anchor), tidak setState 60×/detik.
- JSON-LD tidak berubah (server, dari `publicPool`).
- Gate fase: `tsc` ✅ · `eslint` ✅ · `test:taman` **74** ✅ · `build` ✅.


---

## V2-7 — Dashboard kelola testimoni (lengkap, keputusan #8)

- [x] Daftar: kolom **hewan + warna** dengan pratinjau kecil, selain kolom yang sudah ada.
- [x] Panel detail: pemilih hewan **dan** warna (pratinjau tint), selain field lama.
- [x] Halaman **Pratinjau Kanvas** (`/admin/taman/pratinjau`): pakai kanvas Phaser sungguhan, termasuk tombol acak, cocok untuk melihat hasil sebelum publikasi.
- [x] Pengaturan tata letak: prioritas urutan (sudah ada) + tombol **Acak pool** untuk pratinjau distribusi.
- [x] Ringkasan statistik per hewan: jumlah testimoni terbit per hewan (bantu variasi).
- [x] Aksi **Rapikan hewan & urutan** diperluas: tetapkan varian juga.

**Verifikasi:** `tsc`/`lint`/`build` hijau; cek manual.

### Status V2-7 (aktual)

- `admin-api.ts`: `TamanAdminItem` + `variant`.
- API admin PATCH `[id]`: terima `variant`; validasi pasangan lewat helper murni baru `resolveAnimalVariant` (`taman-logic.ts`) — ganti hewan tanpa varian mempertahankan varian lama bila sah, jika tidak → `normal`; varian tak sah → 400.
- `taman-manager.tsx`: baris daftar kini pakai `AnimalSprite` (v2, tint varian) + chip "Hewan · Warna"; tambah panel **Statistik hewan terbit** (jumlah published per hewan).
- `taman-detail-panel.tsx`: pemilih hewan v1 (SVG) → `AnimalPicker` v2 (hewan + warna, pratinjau tint); simpan `variant` ikut tersimpan.
- `taman-preview.tsx`: daftar sederhana → **kanvas Phaser nyata** (`TamanPhaser`) + tombol **Acak pool** + ringkasan hewan+warna; klik hewan menampilkan ringkas.
- Aksi **Rapikan** (sudah) menetapkan hewan + varian + urutan.
- Gate fase: `tsc` ✅ · `eslint` ✅ · `test:taman` **78** ✅ · `build` ✅.


---

## V2-8 — QA, performa, dokumentasi, rilis

- [x] Ukur dampak Phaser: ukuran bundel halaman Taman sebelum vs sesudah (dynamic import terbukti tidak membebani halaman lain).
- [x] Cek jumlah sprite vs FPS di mobile (perkiraan, jika memungkinkan).
- [x] Uji regresi: beranda tanpa testimoni (section tersembunyi), kartu, gacha, form kirim, dashboard, JSON-LD, `sr-only`.
- [x] Jalankan gate penuh: `tsc`, `lint`, semua `test:*`, `build`.
- [x] Perbarui `docs/2026-10-10-taman-pixel.md` (atau dokumen v2 baru) + `docs/README.md` + `TASK-SELANJUTNYA.md`.
- [ ] Commit & push **hanya setelah** pemilik minta.

### Hasil QA V2-8

**Dampak bundel (dynamic import terbukti):**
- Chunk Phaser = **±1.164 KB** (satu chunk terpisah).
- Chunk ini **tidak** direferensikan di HTML halaman mana pun (`index.html`, `/produk`, `/harga` → `preload Phaser: false`). Ia hanya dimuat saat komponen kanvas mount (klien).
- JS yang di-preload di beranda `/` = **±1.579 KB** (19 chunk) — **tanpa** Phaser.

**Batas performa:**
- Sprite aktif = jumlah slot (`slotCountFor`): mobile 4, tablet 6, desktop 8 — jauh di bawah target 15.
- `onFrame` di-throttle ~10 fps; posisi hanya untuk anchor kartu.
- `prefers-reduced-motion`: scene tidak update (hewan diam).

**Regresi (semua lolos lewat test suite):**
- Beranda tanpa testimoni → `shouldShowFrame` false → seksi tidak dirender.
- Gacha `pickSlots` (deterministik, tanpa duplikat), kartu, form kirim (`validateSubmit`), dashboard (rapikan/`resolveAnimalVariant`), JSON-LD (`buildTamanReviewJsonLd`), privasi whitelist (`publicView`/`PRIVATE_FIELDS`/`toMineView`).

**Gate penuh:**
- `npx tsc --noEmit` ✅
- `npx eslint .` ✅
- Semua `test:*` hijau — **16 suite / 467 test** (termasuk `test:taman` **78**).
- `npm run build` ✅

**Belum diverifikasi manual (milik pemilik):** tampilan & gerak kanvas di browser, FPS nyata di mobile, keyboard/screen reader, reduced-motion di perangkat asli.


## Definition of Done (v2) — status

1. ✅ Dua jalur kirim testimoni (beranda & akun) menuju halaman form yang sama (`/taman/tulis`).
2. ✅ Form halaman sendiri, user memilih hewan **dan** warna dengan pratinjau.
3. ✅ Kanvas 100% lebar dan 100dvh di desktop & mobile; judul di dalam frame dengan font pixel; heading DOM tetap ada (`sr-only`).
4. ✅ Kanvas menampilkan peta tile (rumah, ladang, kolam, kabel listrik) dan hewan dengan perilaku berbeda (maks slot: 4/6/8 < 15).
5. ✅ Klik hewan membuka popup yang menampilkan data testimoni **dan** hewan (dengan warnanya).
6. ✅ Keyboard & screen reader dapat mengakses semua testimoni (jalur `sr-only`); `prefers-reduced-motion` dihormati.
7. ✅ JSON-LD dan `sr-only` membuat testimoni tetap terbaca crawler.
8. ✅ Dashboard lengkap: daftar + panel detail (hewan & warna), Pratinjau Kanvas nyata, statistik per hewan, aksi Rapikan (hewan + varian).
9. ✅ `tsc`, `lint`, semua test, `build` hijau; ukuran tambahan halaman Taman dilaporkan (chunk Phaser ±1.164 KB, tidak di-preload halaman lain).


## Risiko utama (diingat saat eksekusi)

1. **Phaser ±1 MB** dan tidak ramah crawler — dimuat dinamis, DOM `sr-only` dipertahankan.
2. **15 hewan + animasi** bisa berat di mobile — batasi sprite, hentikan saat tab tidak aktif.
3. **Aset 8 hewan × 8 warna** — satu sprite dasar per hewan + tint runtime.
4. **Perubahan bentuk data** (variant) — normalisasi + aksi Rapikan.
