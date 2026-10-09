# Planning — Testimoni "Taman Pixel" (Hewan sebagai Pemberi Testimoni)

> Status: **PLANNING** (belum dieksekusi). Setelah keputusan pemilik dijawab, dokumen ini dipecah menjadi flow implementasi (`docs/…-task-testimoni-taman-pixel.md`).
> Tanggal: 2026-10-10.
> Dokumen terkait: `docs/2026-10-06-upgrade-beranda.md` (H2 kejujuran data, H5 seksi produk), `docs/2026-10-05-ulasan-rating-produk.md` (ulasan verified purchase), `docs/2026-10-05-retensi-tema2.md` (newsletter & unsubscribe).

---

## 1. Ringkasan

Testimoni ditampilkan sebagai **frame taman pixel** (pixel art) yang berisi beberapa **hewan**. Setiap hewan mewakili satu testimoni. Ketika pengunjung mengklik hewan, muncul kartu (popover/modal) berisi isi testimoni: nama, peran/usaha, pesan, dan rating.

Tujuan:
- Membuat bagian testimoni **lebih hidup, berkesan, dan mudah diingat**.
- Tetap **jujur**: hanya testimoni nyata, tanpa angka karangan.
- Dikelola admin tanpa menulis kode.

## 2. Tujuan & non-tujuan

**Tujuan**
1. Visual taman pixel yang responsif (desktop & mobile) dengan hewan yang dapat diklik/ditekan.
2. Kartu detail testimoni per hewan: nama pemberi, peran/usaha, pesan, rating, tanggal, dan (opsional) tautan ke proyek/produk.
3. Admin dapat menambah, mengedit, menonaktifkan, dan mengurutkan testimoni beserta pilihan hewannya.
4. Hanya testimoni yang **disetujui** yang tampil publik (moderasi).
5. Aksesibel: keyboard, screen reader, `prefers-reduced-motion`.
6. Performa ringan (gambar pixel kecil, lazy load, tanpa library berat).

**Non-tujuan (di luar lingkup awal)**
- Pengiriman testimoni oleh pengunjung dari halaman publik (lihat pertanyaan Q7 — default: tidak).
- Animasi berjalan kompleks (game engine). Default: animasi sederhana CSS.
- Mengganti sistem ulasan produk (`reviews`) atau testimoni portofolio (`project.testimonial`).

## 3. Kondisi sistem saat ini (baseline)

| Area | Kondisi | Referensi |
| --- | --- | --- |
| Testimoni beranda | Dikelola via `/admin/content` (`ManagedTestimonial`: `name`, `role`, `quote`, `rating`). Disembunyikan bila masih placeholder (`isDefaultTestimonials`). | `src/lib/content-types.ts`, `src/components/sections/testimonials.tsx` |
| Testimoni portofolio | Per proyek (`project.testimonial`: `quote`, `author`, `role`), JSON-LD `Review`. | `src/lib/project-types.ts`, `src/app/portofolio/[slug]/page.tsx` |
| Ulasan produk | Model `Review` dengan `uid`, `buyerName`, moderasi, verified purchase. **`uid` dan nama lengkap tidak boleh tampil publik.** | `src/lib/review-types.ts` |
| Prinsip | Tanpa testimoni karangan, tanpa angka palsu (H2, P4). | `docs/2026-10-06-upgrade-beranda.md` |

**Keputusan arsitektur:** testimoni Taman Pixel **memakai/memperluas** sistem `ManagedTestimonial` (sumber data beranda), bukan model baru yang terpisah. Alasan: menghindari duplikasi data dan admin cukup satu tempat. Lihat pertanyaan Q1.

## 4. Rancangan UX

### 4.1 Frame taman
- Panel persegi panjang berbentuk "taman" dengan latar pixel (rumput, langit, pagar, pohon, tanah) — gaya **pixel art** konsisten.
- Hewan ditempatkan di posisi tetap (grid/koordinat persen) agar responsif. Default: 6–8 hewan maksimal per tampilan (lihat Q5).
- Hewan punya **keadaan**: diam (idle, bergerak perlahan), hover/fokus (highlight), aktif (kartu terbuka).

### 4.2 Interaksi
- **Klik/tap** hewan → kartu testimoni muncul di dekat hewan (desktop: popover; mobile: bottom sheet).
- **Keyboard**: hewan bisa difokus (Tab), Enter/Space membuka kartu, Esc menutup, panah berpindah antar hewan.
- Kartu: tombol tutup, navigasi "sebelumnya/berikutnya" (opsional), dan fokus dikembalikan ke hewan setelah ditutup.
- Hanya satu kartu terbuka dalam satu waktu.

### 4.3 Isi kartu testimoni
Field yang ditampilkan (lihat Q3 untuk daftar final):
- Foto/avatar atau inisial (tanpa email).
- Nama pemberi (nama depan + inisial bila diminta, lihat Q4).
- Peran/usaha (mis. "Pemilik Toko Kopi, Tasikmalaya").
- Hewan yang dipilih (ikon), tanggal, rating bintang (opsional).
- Pesan/quote.
- Tautan opsional ke proyek/produk terkait.

**Tidak pernah ditampilkan:** email, nomor telepon, uid, alamat, nama lengkap bila tidak disetujui.

### 4.4 Mobile
- Frame tetap responsif (skala proporsional, hewan lebih besar pada layar kecil).
- Kartu menjadi bottom sheet dengan area sentuh minimal 44px.

### 4.5 Keadaan kosong
- Bila belum ada testimoni yang disetujui, **seksi disembunyikan** (sesuai H2). Bukan menampilkan contoh palsu.
- Bila jumlah < minimum (mis. 3), tampilkan dengan layout sederhana atau sembunyikan (Q6).

## 5. Model data

### 5.1 Perluasan `ManagedTestimonial` (usulan)
```ts
type ManagedTestimonial = {
  id: string;                    // baru: stabil untuk referensi
  name: string;                  // nama pemberi (sudah ada)
  role: string;                  // peran/usaha (sudah ada)
  quote: string;                 // pesan (sudah ada)
  rating: number;                // 1–5 (sudah ada)
  // ── baru ──
  animal: AnimalKey;             // hewan pixel yang mewakili (enum, lihat 5.3)
  avatarUrl?: string;            // opsional, Cloudinary (bukan email)
  dateISO?: string;              // tanggal testimoni (tampil sebagai "Bulan Tahun")
  source?: "manual" | "ulasan";  // asal: input admin atau diangkat dari ulasan
  sourceRefId?: string;          // id ulasan/proyek bila diangkat (internal, tidak tampil)
  projectSlug?: string;          // tautan opsional ke portofolio
  productSlug?: string;          // tautan opsional ke produk
  status: "draft" | "published" | "hidden"; // moderasi (baru)
  order: number;                 // urutan tampil
};
```

### 5.2 Aturan data
- **Email tidak disimpan** di model testimoni (privasi). Bila perlu untuk verifikasi, simpan terpisah di koleksi internal yang tidak diekspos (lihat Q8).
- `status` default `draft`. Hanya `published` yang tampil publik.
- `animal` wajib (default: hewan pertama yang belum dipakai).
- Batas panjang: `name` ≤ 80, `role` ≤ 120, `quote` ≤ 400 karakter (lihat Q9).

### 5.3 Katalog hewan (usulan awal)
Enum `AnimalKey` dengan sprite pixel SVG/PNG kecil (≤ 4 KB per hewan, lihat Q10):
`kucing`, `kelinci`, `burung`, `rubah`, `beruang`, `kura-kura`, `kupu-kupu`, `ikan`. Jumlah & jenis hewan terbuka untuk diubah (Q11).

## 6. Pengambilan dari ulasan (opsional, Q12)
- Admin dapat **mengangkat** ulasan produk berbintang tinggi menjadi testimoni taman (menyalin nama, quote, rating; menyimpan `sourceRefId`).
- Ulasan asli tetap di `reviews`; salinan testimoni diedit admin sebelum publish.
- Tidak ada publikasi otomatis.

## 7. Admin (dashboard)

### 7.1 Halaman
- Di `/admin/content` (tab Testimoni) — dimodifikasi, atau halaman baru `/admin/taman` (lihat Q13).
- Daftar testimoni: nama, hewan (ikon), rating, status, urutan, aksi.
- Form: semua field 5.1, pemilih hewan visual (grid ikon), pratinjau kartu, toggle publish.
- Penyusunan posisi hewan di frame: **tidak** ada drag-and-drop pada v1 (urutan = field `order`, Q14).

### 7.2 Keamanan & audit
- Semua aksi dilindungi `requireAdmin` (sesi admin).
- Aksi create/update/publish/hide/delete tercatat di audit log (`recordAdminAudit`), dengan aksi baru `testimonial.*`.
- Validasi zod di server (panjang, enum hewan, rating 1–5).

## 8. Arsitektur teknis

| Lapisan | Komponen usulan |
| --- | --- |
| Data | Perluasan `ManagedTestimonial` di `content` (`site-content.ts`) + normalisasi backward-compat (testimoni lama tanpa `animal` → hewan default berurutan, `status: published` bila sudah tampil sebelumnya). |
| Logika murni | `src/lib/taman-logic.ts`: pilih hewan default, filter publik (`status === published`), urutkan, batas jumlah, validasi slug/hewan. Dites. |
| UI publik | `src/components/sections/taman-testimoni.tsx` (seksi), `taman-frame.tsx` (frame pixel + hewan), `taman-card.tsx` (kartu/popover/bottom sheet). |
| Aset | `public/taman/*.svg` (latar & hewan pixel), dimuat lazy. |
| Admin | Tab testimoni diperluas + `taman-form.tsx`, `animal-picker.tsx`. |
| API | Memakai `/api/admin/content` yang sudah ada, ditambah validasi baru. |
| Analitik | Event `taman_open` (hewan, indeks) dan `taman_close` — tanpa PII (Q15). |

Menggantikan `testimonials.tsx` yang lama secara bertahap (lihat Q16).

## 9. Aksesibilitas
- Setiap hewan adalah `button` dengan `aria-label` berisi nama pemberi dan ringkasan ("Testimoni dari Budi, Pemilik Toko Kopi, bintang 5").
- Frame punya `role="group"` dengan label seksi; hewan non-interaktif tidak dibaca ganda.
- Fokus dikelola: masuk kartu ke elemen pertama, keluar ke hewan pemicu.
- `prefers-reduced-motion`: matikan animasi idle; kartu tetap berfungsi.
- Kontras teks kartu ≥ 4.5:1; tap target ≥ 44px.
- Gambar pixel `alt=""` (dekoratif), sedangkan avatar `alt` nama pemberi.

## 10. SEO & performa
- Teks testimoni tetap tercrawl (dirender server, bukan hanya di dalam kartu tersembunyi). Opsi: daftar tersembunyi visual untuk crawler (`sr-only`) berisi quote.
- JSON-LD `Review`/`AggregateRating` hanya dari testimoni `published` dan rating valid (konsisten dengan P4: tidak ada angka karangan).
- Sprite hewan dikompres (SVG kecil), total aset frame ≤ 60 KB (Q10).
- Frame dirender sebagai server component; interaktivitas hanya di komponen klien kecil.

## 11. Analitik & observability
- `taman_open` (hewan, indeks, sumber), `taman_close` (durasi opsional).
- Tanpa menyimpan isi testimoni di event.

## 12. Migrasi
- Testimoni yang sudah ada (`ManagedTestimonial`) tetap tampil. Bila `status` belum ada → dianggap `published` (agar tidak hilang), kecuali data placeholder (sudah disembunyikan H2).
- `animal` yang kosong diisi otomatis berurutan dari katalog.
- Tidak ada perubahan pada ulasan produk dan testimoni portofolio.

## 13. Rencana uji
- Unit (`scripts/taman.test.ts`): pemilihan hewan default, filter publik, urutan, validasi, batas panjang, normalisasi data lama.
- Integrasi: API admin create/update/hide, validasi zod, audit tercatat.
- Visual & aksesibilitas (manual): keyboard, screen reader, mobile, reduced motion, kontras.
- Regresi: beranda tanpa testimoni (seksi tersembunyi), testimoni portofolio, ulasan produk.

---

## 14. PERTANYAAN UNTUK PEMILIK (wajib dijawab sebelum eksekusi)

Jawab per nomor. Jika tidak dijawab, saya pakai **asumsi default** yang tertulis.

### A. Konsep & visual
1. **Sumber data:** perluas testimoni beranda yang sudah ada (`/admin/content`) — default: **ya** — atau buat sistem terpisah khusus taman? *(default: perluas)*
2. **Gaya visual:** pixel art seperti apa? Pilih: (a) gaya retro 8-bit (warna terbatas), (b) gaya modern-pixel (lebih halus), (c) minimalis kotak. *(default: a — retro 8-bit, warna terbatas)*
3. **Isi kartu:** field apa saja yang tampil? Ceklis: nama, peran/usaha, foto/avatar, quote, rating, tanggal, tautan proyek/produk, kota/lokasi. *(default: nama, peran, quote, rating, tanggal, tautan proyek bila ada)*
4. **Format nama publik:** tampilkan nama lengkap, nama depan + inisial (mis. "Budi S."), atau nama samaran/brand? *(default: nama depan + inisial)*
5. **Jumlah hewan** dalam satu frame: berapa maksimal? *(default: 6–8)*
6. **Jumlah minimum** agar frame tampil: berapa testimoni? Di bawah itu seksi disembunyikan atau tampil biasa? *(default: tampil bila ≥ 3, di bawah itu disembunyikan)*

### B. Interaksi & tampilan
7. **Pengunjung boleh mengirim testimoni** dari halaman publik? *(default: tidak — hanya admin yang input; pengiriman publik butuh moderasi & anti-spam terpisah)*
8. **Kartu ditampilkan** sebagai popover di dekat hewan (desktop) dan bottom sheet (mobile)? Atau modal penuh di semua ukuran? *(default: popover desktop, bottom sheet mobile)*
9. **Navigasi antar testimoni** di dalam kartu (tombol sebelumnya/berikutnya)? *(default: ya)*
10. **Animasi hewan:** diam, bergerak perlahan (idle), atau melompat saat hover? *(default: idle bergerak perlahan, berhenti bila reduced-motion)*
11. **Daftar hewan:** setuju dengan katalog usulan (kucing, kelinci, burung, rubah, beruang, kura-kura, kupu-kupu, ikan)? Ada hewan lain yang diinginkan? *(default: katalog usulan)*
12. **Sumber testimoni:** boleh diangkat dari ulasan produk yang berbintang tinggi (dengan edit admin)? *(default: ya, tidak otomatis)*

### C. Admin & operasional
13. **Lokasi kelola:** di tab "Testimoni" pada `/admin/content`, atau halaman sendiri `/admin/taman`? *(default: tab di /admin/content)*
14. **Urutan hewan di frame:** cukup field urutan angka, atau perlu penempatan visual (drag posisi hewan di frame)? *(default: urutan angka, tanpa drag pada v1)*
15. **Analitik:** catat klik hewan dan tutup kartu untuk mengukur minat? Ini memakai event baru tanpa data pribadi. *(default: ya)*
16. **Penggantian seksi testimoni lama:** ganti total seksi testimoni beranda dengan Taman Pixel, atau tampil berdampingan? *(default: ganti total setelah v1 stabil)*
17. **Notifikasi:** admin perlu notifikasi saat ada testimoni baru yang diangkat dari ulasan? *(default: tidak pada v1)*

### D. Privasi & etika
18. **Email pemberi testimoni:** apakah perlu disimpan untuk verifikasi (mis. konfirmasi bahwa ia klien asli)? Bila ya, disimpan di mana dan siapa yang bisa melihat? *(default: tidak disimpan di model testimoni; bila perlu, koleksi internal terpisah yang tidak diekspos)*
19. **Persetujuan pemberi:** apakah testimoni wajib memiliki persetujuan tertulis/digital dari pemberinya sebelum tampil? Perlu bukti (screenshot/email) yang dicatat? *(default: wajib dicatat di catatan internal admin, belum ada alur otomatis)*
20. **Hak hapus:** pemberi bisa minta testimoninya dihapus? Siapa yang menanganinya dan lewat kanal apa? *(default: admin menghapus atas permintaan, lewat WhatsApp/email)*
21. **Nama hewan vs pemberi:** nama hewan (mis. "Si Kucing") ditampilkan juga, atau hanya ikon? *(default: hanya ikon + nama pemberi)*

### E. Konten & data
22. **Testimoni awal:** dari mana isinya? Ada testimoni nyata yang siap diisi, atau perlu dikumpulkan dulu? (Ingat: placeholder tidak boleh tampil.) *(default: frame tersembunyi sampai ada ≥ 3 testimoni nyata)*
23. **Bahasa:** hanya Bahasa Indonesia, atau perlu terjemahan? *(default: Bahasa Indonesia)*
24. **Tautan testimoni:** apakah perlu tautan ke portofolio/produk, atau cukup teks? *(default: opsional, bila ada proyek/produk terkait)*

### F. Teknis & aset
25. **Aset pixel:** kamu sudah punya aset hewan dan latar pixel, atau aku buatkan dari SVG kode (sederhana)? Bila buat sendiri, kualitas gambar sebatas apa? *(default: SVG kode sederhana, bisa diganti aset asli nanti)*
26. **Batas ukuran aset:** total aset frame ≤ 60 KB? *(default: ya)*
27. **Library animasi:** boleh pakai Framer Motion yang sudah ada, atau murni CSS? *(default: CSS untuk idle; Framer Motion hanya bila perlu)*
28. **Dukungan browser lama:** perlu fallback untuk browser lama? *(default: browser modern saja)*

### G. Prioritas & rilis
29. **Ruang lingkup v1:** cukup frame + kartu + admin dasar (publish, urutan, hewan), atau langsung termasuk angkat dari ulasan dan analitik? *(default: v1 = frame, kartu, admin dasar; angkat ulasan & analitik di v2)*
30. **Target rilis:** kapan ingin tampil di produksi? Ini memengaruhi prioritas dibanding sistem lain. *(default: setelah planning disetujui)*

---

## 15. Usulan urutan eksekusi (setelah pertanyaan dijawab)
1. Model data & normalisasi (backward-compat) + logika murni + test.
2. Admin: form, pemilih hewan, status, urutan, audit.
3. Frame publik: aset, layout, hewan, state idle/hover.
4. Kartu: popover/bottom sheet, keyboard, fokus, reduced motion.
5. SEO (teks tercrawl, JSON-LD dari `published` saja) dan analitik.
6. Uji (unit, API, aksesibilitas manual), dokumentasi, dan penggantian seksi lama (v1 berdampingan atau menggantikan sesuai Q16).

## 16. Definition of Done (usulan)
1. Seksi tersembunyi bila testimoni nyata < minimum; tidak ada data karangan tampil.
2. Hanya testimoni `published` yang tampil; email & uid tidak pernah dikirim ke klien.
3. Semua hewan dapat diakses keyboard dan dibaca screen reader; kartu dapat dibuka/ditutup dengan benar.
4. `prefers-reduced-motion` dihormati.
5. Admin dapat membuat, mengedit, publish/hide, dan mengurutkan; setiap aksi tercatat di audit.
6. `tsc`, `lint`, test, dan `build` hijau.
