# Upgrade Landing LKTech Tools — Rencana Produk, UX & Eksekusi

> **Status:** ✅ Diimplementasikan (Paket A+B+C) — 2026-11-15  
> **Disusun:** 2026-11-14  
> **Cakupan:** upgrade landing publik `/tools`, katalog `/tools/ruang`, konsistensi workspace `/tools/[slug]`, dan halaman panduan publik `/tools/panduan/[slug]`.  
> **Di luar cakupan:** monetisasi/berbayar, perubahan logika pemrosesan berkas, dan perubahan model autentikasi.

Dokumen ini adalah lanjutan dari [`2026-11-01-lktech-tools-space.md`](2026-11-01-lktech-tools-space.md) §17. Landing `/tools` dan ruang `/tools/ruang` **sudah ada**; fokus di sini adalah meningkatkan pengalaman produknya, bukan membangun dari nol.

---

## 0.1 Hasil implementasi (2026-11-15)

Semua paket yang disetujui (**A+B+C**) sudah masuk ke working tree. Arsitektur akses tidak berubah: `/tools` publik & indexable; `/tools/ruang` dan `/tools/[slug]` tetap `UserGuard` + `noindex`; seluruh pemrosesan berkas tetap lokal di browser.

| Area | Yang dibangun |
| --- | --- |
| Landing `/tools` | Hero split dengan mockup workspace CSS, H1 “Berkas beres, tanpa unggah.”, 5 intent tile, demo mini warna/JSON tanpa akun, bukti privasi “0 byte” + alur berkas, katalog berkategori, pita alur 3 langkah, 6 FAQ + CTA, feedback widget, sticky CTA mobile yang bisa ditutup |
| Katalog `/tools/ruang` | Header ringkas + statistik, pencarian & filter kategori, state URL `q`/`kategori` yang bisa dibagikan, favorit & recent lokal (hanya slug), “Hapus data lokal”, pintasan `/` & `Esc`, empty state, `Suspense` untuk `useSearchParams` |
| Workspace `/tools/[slug]` | Chip format/batas/“Lokal”, tautan panduan & bantuan, tool rail dengan `aria-current="page"`, rekomendasi tool terkait, analytics pembukaan workspace |
| Panduan publik | Hub `/tools/panduan` + 5 halaman statis `/tools/panduan/[slug]`, konten unik per tool, FAQ accordion + `FAQPage` JSON-LD, canonical, masuk sitemap, `robots.txt` mengizinkan `/tools/panduan` |
| Fondasi | Registry diperluas (`format`, `limitLabel`, `related`, `isNew`, `TOOL_INTENTS`, helper URL), logika discovery murni, external store localStorage, wrapper analytics Tools, badge, CTA sadar-login, `ToolCard` baru, OG image `/tools` |

**Verifikasi otomatis:** `npm run lint` bersih; `npx tsc --noEmit` bersih; test Tools lulus — registry 17, discovery 14, pages 12, color 11, image 9, text 11, PDF 8 (total 82). `npm run build` sukses: 217/217 halaman, termasuk `/tools`, `/tools/ruang`, 5 workspace, `/tools/panduan`, 5 panduan, dan `/tools/opengraph-image`. Smoke produksi memastikan 8 route Tools mengembalikan 200 dengan tipe konten benar, landing/panduan `index, follow`, ruang/workspace `noindex, nofollow`, robots & sitemap memuat panduan, serta OG image PNG valid. **E2E Playwright publik 18/18 lulus**, termasuk tautan panduan dari landing dan halaman panduan yang indexable.

**Belum diverifikasi manual:** Lighthouse mobile, uji keyboard/screen reader lintas browser, screenshot responsif 360–1440, dan verifikasi event di preview analytics. Item ini tetap ada di §12 sebagai checklist rilis.

---

## 0. Ringkasan untuk pengambil keputusan

Landing Tools saat ini sudah berfungsi dan rapi secara dasar: publik, indexable, punya hero, 5 kartu tool, cara kerja, privasi, FAQ, dan CTA. Yang belum ada adalah **rasa produk**: hero masih generik, belum ada visual workspace, belum ada momen mencoba, dan ruang/workspace belum terasa sebagai satu sistem.

Rencana ini mengusulkan tiga lapis upgrade:

1. **Landing yang menjual pengalaman** — hero split dengan visual produk, pintu masuk berbasis kebutuhan, bukti privasi, katalog yang lebih informatif.
2. **Ruang yang terasa seperti workspace** — header ringkas, pencarian/filter yang bisa dibagikan, recent/favorites lokal, empty state yang membantu.
3. **Workspace yang mudah dijelajahi** — tool rail, metadata batas/format, rekomendasi tool berikutnya.

| Aspek | Sekarang | Setelah upgrade |
| --- | --- | --- |
| Hero | Teks generik + dua CTA | Split hero + mockup workspace CSS |
| Discovery | Grid 5 kartu | Intent tiles + filter kategori |
| Privasi | 3 kartu berisi klaim | Demo mini + diagram “0 byte berkas” |
| Ruang | Katalog dengan state lokal | Search URL state + recent/favorites |
| Workspace | Kembali ke ruang untuk pindah tool | Tool rail + chip format/batas + tool lain |
| Mobile | ±7.118 px, section panjang | Lebih padat; target tidak lebih panjang dari baseline + 10% |

| Paket | Isi | Estimasi kasar | Rekomendasi |
| --- | --- | --- | --- |
| **A — Fondasi landing (P0)** | Hero product-led, intent tiles, bukti privasi, katalog lebih kaya, alur ringkas, CTA sadar-login, analytics, QA | 3–4 hari | **Ambil sekarang** |
| **B — Produk terasa (P1)** | Demo mini, filter katalog, ruang dengan URL state + recent/favorites, tool rail workspace | 3–4 hari | **Ambil sekarang** |
| **C — Pertumbuhan (P2)** | Halaman publik per tool, OG image, sticky CTA mobile, roadmap/usulan tool, eksperimen copy | 2–3 hari | Tunda sampai ada data |

**Rekomendasi:** setujui **A + B** dalam satu rilis, dengan checkpoint preview bertahap (hero/intent → katalog/FAQ → ruang/workspace). Paket C dievaluasi setelah 2 minggu data.

---

## 1. Audit kondisi sekarang

### 1.1 Yang sudah baik

- `/tools` adalah landing publik yang `index, follow`, punya canonical, Open Graph, dan JSON-LD (`BreadcrumbList`, `ItemList`, `FAQPage`).
- `/tools/ruang` dan `/tools/[slug]` sudah dilindungi `UserGuard`, `noindex`, dan konsisten dengan model akses saat ini.
- Registry murni `tools-registry-pure.ts` sudah menjadi satu sumber metadata untuk 5 tool: Color Picker, Gambar ke WebP, Gambar ke PDF, Formatter Teks, PDF ke Gambar.
- Semua tool memproses berkas **lokal di browser** — ini pembeda produk yang kuat dan sudah benar secara teknis.
- Sudah ada test registry, color, image, text, pdf, dan wiring halaman (`test:tools-*`), serta build yang sehat.
- Ada helper analytics terpusat `trackEvent` (Vercel Web Analytics) yang aman dan tanpa PII.

### 1.2 Gap utama

| # | Gap | Dampak | Bukti/observasi |
| --- | --- | --- | --- |
| 1 | **Hero belum product-led** | Pengunjung harus membayangkan sendiri bentuk produknya; diferensiasi lokal belum terasa di layar pertama | Hero masih teks + dua CTA; tidak ada mockup workspace/visual hasil |
| 2 | **Discovery masih katalog-first** | Pengguna yang tidak tahu nama tool harus memindai 5 kartu; friction untuk first-time visitor | Landing hanya berisi grid `ToolCard`; belum ada pintu masuk berbasis masalah |
| 3 | **Privasi masih berupa klaim** | Klaim “tidak diunggah” belum dibuktikan secara visual/teknis; pengunjung skeptis bisa ragu | 3 kartu privasi berbentuk teks; belum ada demo atau diagram alur berkas |
| 4 | **Belum ada momen mencoba sebelum login** | Semua interaksi penuh butuh akun; pengunjung harus berkomitmen sebelum merasakan nilai | CTA langsung ke `/tools/ruang`; tidak ada demo mini |
| 5 | **Ruang masih terasa seperti katalog biasa** | Belum terasa seperti “rumah” untuk kembali; tidak ada recent/favorites/onboarding | `ToolsCatalog` hanya search + filter kategori berbasis state lokal |
| 6 | **Workspace tidak punya cross-navigation** | Untuk pindah tool, pengguna harus kembali ke ruang; discovery antar-tool rendah | `ToolShell` hanya punya tautan “Kembali ke ruang tools” |
| 7 | **Landing, ruang, dan workspace belum satu bahasa visual** | Tiga halaman terasa seperti tiga produk berbeda | Landing memakai section pemasaran; ruang memakai `PageHero`; workspace memakai `ToolShell` |
| 8 | **Halaman mobile panjang** | Section bawah (FAQ/CTA) bisa tidak tercapai; energi pengguna habis sebelum konversi | Tinggi halaman ±7.118 px di 390 px; desktop ±4.366 px |
| 9 | **Belum ada event analytics khusus Tools** | Tidak bisa mengetahui CTA/intent/tool mana yang bekerja; optimasi berbasis tebakan | Tidak ada `trackEvent` di komponen tools |
| 10 | **Alasan login belum jelas** | Login terasa seperti tembok, bukan bagian dari alur yang masuk akal | FAQ hanya bilang “agar penggunaan tetap terjaga” |

### 1.3 Baseline terukur

| Aspek | Kondisi saat ini |
| --- | --- |
| Rute publik | `/tools` — `index, follow`, canonical `/tools` |
| Rute privat | `/tools/ruang`, `/tools/[slug]` — `UserGuard`, `noindex, nofollow` |
| Tool tersedia | 5 tool (semua `status: "tersedia"`) |
| Landing desktop (1440×900) | Tinggi ±4.366 px, 5 kartu, tanpa overflow horizontal |
| Landing mobile (390×844) | Tinggi ±7.118 px, 5 kartu, tanpa overflow horizontal |
| Analytics | `trackEvent` tersedia; belum ada event khusus Tools |
| Personalisasi | Belum ada recent/favorites; belum ada `localStorage` di komponen tools |
| Test | `test:tools-registry`, `test:tools-pages`, `test:tools-color/image/text/pdf` |
| Build | Sukses; warning `[firebase-admin] Firestore has already been initialized` sudah ada sebelumnya dan tidak terkait Tools |

### 1.4 Prinsip upgrade

1. **Product-led, bukan marketing-led.** Tunjukkan produknya, bukan hanya menjelaskan manfaatnya.
2. **Lebih padat, bukan lebih panjang.** Tambah nilai dengan memadatkan section, bukan menumpuk section baru.
3. **Privacy as proof.** Buktikan pemrosesan lokal lewat demo/diagram, bukan hanya klaim.
4. **Satu sistem.** Landing, ruang, dan workspace memakai komponen, token, dan bahasa visual yang sama.
5. **Jujur.** Tidak ada testimoni palsu, angka pengguna fiktif, atau klaim “100% aman” yang tidak bisa diverifikasi.
6. **Mobile-first & cepat.** Tidak menambah dependensi berat; visual hero memakai CSS, bukan gambar besar.
7. **Jangan merusak yang sudah bekerja.** SEO landing, `UserGuard`, `noindex` ruang/workspace, dan logika pemrosesan tool tetap dipertahankan.

---

## 2. Visi & positioning

**Positioning:** *Ruang kerja lokal untuk berkas sehari-hari — cepat, privat, dan cukup satu tab.*

**Untuk siapa:** desainer, mahasiswa, admin/operasional, developer, dan siapa pun yang sering berurusan dengan gambar, PDF, atau teks dalam pekerjaan kecil sehari-hari.

**Bukan:** pengganti alat desain profesional, bukan penyimpanan berkas, bukan situs konverter yang mengunggah dokumen ke server.

**Tiga pilar:**

| Pilar | Arti praktis | Bukti di UI |
| --- | --- | --- |
| **Lokal** | Berkas tidak meninggalkan perangkat | Demo, diagram “0 byte”, catatan teknis |
| **Cepat** | Tidak ada antrean unggah; proses langsung di browser | Visual konversi, microcopy “tanpa unggah” |
| **Satu ruang** | 5 tool, satu akun, satu alur yang konsisten | Intent tiles, katalog, tool rail, related tools |

**Nada komunikasi:** pertahankan “Anda” agar konsisten dengan situs saat ini, tetapi lebih hangat dan konkret. Hindari jargon teknis di headline; taruh detail teknis di disclosure/FAQ.

### 2.1 Arah copy

| Elemen | Rekomendasi | Alternatif |
| --- | --- | --- |
| H1 | **Berkas beres, tanpa unggah.** | “Satu ruang untuk gambar, PDF, dan teks.” |
| Subheadline | Kompres gambar, susun PDF, ambil warna, dan rapikan teks — semuanya diproses lokal di browser. Gratis dengan akun LKTech. | “Tools yang bekerja di perangkat Anda, bukan di server kami.” |
| CTA utama | **Buka ruang tools** | “Mulai gratis” (lebih ramah, tetapi kurang menjelaskan tujuan) |
| CTA sekunder | **Lihat cara kerjanya** / **Coba demo** | “Jelajahi tool” |
| Trust line | Gratis · Butuh akun LKTech · Tanpa unggah berkas | “5 tool siap · Tanpa instalasi · Tanpa unggah” |

H1 “Berkas beres, tanpa unggah.” dipilih karena singkat, berirama, dan langsung menyatakan manfaat + pembeda. Jika brand ingin lebih formal, gunakan “Berkas rapi, tanpa unggah.”

---

## 3. Peta pengalaman

```text
/tools  (publik, index)
  Hero
    → Intent tiles
    → Demo + bukti privasi
    → Katalog tool
    → Alur 3 langkah
    → FAQ + CTA akhir

/tools/ruang  (login, noindex)
  Header ringkas + sapaan
    → Recent / lanjutkan
    → Search + filter (URL state)
    → Katalog + favorit
    → Empty state + usulkan tool

/tools/[slug]  (login, noindex)
  Header tool + metadata + tool rail
    → Body tool (tidak diubah di fase ini)
    → Tool lain / related
```

| Halaman | Peran | Akses | SEO |
| --- | --- | --- | --- |
| `/tools` | Menjual pengalaman, menjelaskan nilai, mengarahkan ke tool/ruang | Publik | `index, follow` |
| `/tools/ruang` | Workspace home: mencari, memilih, melanjutkan | `UserGuard` | `noindex` |
| `/tools/[slug]` | Mengerjakan satu tool | `UserGuard` | `noindex` |

**Alur utama:**

1. **First-time:** landing → intent tile/demo → login (`next` ke tool) → proses → unduh → tool lain.
2. **Returning:** landing/CTA → ruang → recent/search → tool.
3. **Logged-in:** navbar → ruang → tool.

**Catatan penting:** intent tile mengarah langsung ke `/tools/{slug}`. Jika belum login, `UserGuard` akan mengarahkan ke `/masuk?next=/tools/{slug}`, sehingga setelah login pengguna mendarat di tool yang dipilih — bukan dilempar ke katalog. Ini mengurangi satu langkah friction.

---

## 4. Desain landing baru

### 4.1 Hero — “Berkas beres, tanpa unggah.”

**Tujuan:** dalam 5 detik, pengunjung tahu ini apa, untuk siapa, kenapa berbeda, dan harus klik ke mana.

**Layout:**

- Desktop: grid 12 kolom, 6/6. Kiri: eyebrow, H1, subcopy, CTA, trust line. Kanan: visual workspace.
- Mobile: teks + CTA dulu; visual di bawah CTA (bukan di atas), agar LCP dan pesan utama cepat terlihat.
- H1, subcopy, dan CTA utama harus terlihat tanpa scroll di 390×844 dan 1440×900.

**Isi:**

- Eyebrow: `LKTech Tools · Ruang kerja lokal`
- H1: `Berkas beres, tanpa unggah.`
- Subcopy: `Kompres gambar, susun PDF, ambil warna, dan rapikan teks — semuanya diproses lokal di browser. Gratis dengan akun LKTech.`
- CTA utama: `Buka ruang tools` (ikon kunci/gembok opsional)
- CTA sekunder: `Coba demo` (scroll ke `#demo`) atau `Lihat cara kerjanya`
- Trust line: `Gratis · Butuh akun LKTech · Tanpa unggah berkas`

**Visual workspace (CSS, bukan gambar besar):**

- Frame browser dengan grid halus dan label “LKTech Tools”.
- Kartu utama: `Gambar ke WebP` — baris `foto-produk.png 4,8 MB` → `foto-produk.webp 812 KB`, badge `−83%`, progress bar selesai.
- Kartu kecil mengambang: swatch `#2563EB` dengan nilai HEX/HSL.
- Kartu kecil mengambang: tumpukan halaman PDF `12 halaman → PNG`.
- Pill privasi: `0 byte berkas diunggah` dengan ikon perisai.
- Beri label kecil `ilustrasi` dan `aria-hidden="true"` pada elemen dekoratif; sediakan teks alternatif visual di DOM untuk screen reader.
- Di mobile, tampilkan kartu utama + pill privasi; kartu mengambang disembunyikan agar tidak sesak.

**CTA sadar-login:**

- Belum login: tautan langsung ke `/masuk?next=%2Ftools%2Fruang` untuk menghindari flash layar `UserGuard`.
- Sudah login: tautan ke `/tools/ruang`.
- Saat status auth masih `loading`, render varian “belum login” agar tidak ada hydration mismatch; beri `min-width` pada tombol agar label tidak bergeser.

**Teknis:**

- Hero tetap server component; hanya CTA yang client island kecil (`ToolsCta`).
- Visual memakai CSS/Tailwind dan ikon lucide yang sudah ada. Tidak ada gambar hero besar, tidak ada video, tidak ada 3D.
- Animasi masuk memakai `Reveal` yang sudah ada; hormati `prefers-reduced-motion`.

### 4.2 Intent tiles — “Mulai dari kebutuhan, bukan nama tool.”

**Tujuan:** mengurangi beban memilih. Pengunjung tidak perlu tahu nama “Gambar ke WebP”; cukup tahu masalahnya.

**Isi (5 tile):**

| Masalah | Label tile | Tool tujuan |
| --- | --- | --- |
| Gambar terlalu besar | Kompres gambar ke WebP | `/tools/image-to-webp` |
| Foto perlu jadi satu PDF | Gabung gambar jadi PDF | `/tools/image-to-pdf` |
| Butuh warna dari referensi | Ambil kode warna | `/tools/color-picker` |
| JSON/teks berantakan | Rapikan teks & JSON | `/tools/text-formatter` |
| PDF perlu jadi gambar | Pecah PDF jadi PNG/JPG | `/tools/pdf-to-image` |

**Desain:**

- Setiap tile: ikon, satu baris masalah, nama tool + panah.
- Desktop: 5 kolom ringkas; tablet: 2 kolom; mobile: 1 kolom (atau 2 kolom dengan tile terakhir melebar, jika tinggi teks aman).
- Hover: lift halus + border primary; focus ring jelas.
- Klik tile = link langsung ke tool. Tidak perlu lewat katalog.
- Tambahkan event `tools_intent_click` dengan props `{ tool, intent }`.

**Kenapa ini penting:** ini adalah upgrade konversi dengan biaya teknis rendah. Semua data sudah ada di registry; yang ditambah hanya pemetaan masalah → slug dan komponen presentasional.

### 4.3 Demo + bukti privasi — “Coba rasakan lokalnya.”

**Tujuan:** mengubah klaim privasi menjadi pengalaman. Pengunjung melihat sendiri bahwa proses berjalan di browser, lalu percaya pada workspace penuh.

**Layout:** dua kolom di desktop (demo 7/12, privasi 5/12); mobile: demo dulu, lalu privasi.

**Demo mini (P1, disarankan):**

- Dua tab sederhana: **Warna** dan **Teks**.
- **Warna:** `<input type="color">`, nilai HEX yang bisa disalin, tombol “Salin” dengan feedback `aria-live="polite"`.
- **Teks:** textarea + tombol “Rapikan JSON” (parse + stringify) + “Salin”. Batas input 20.000 karakter agar tetap ringan.
- Label jelas: `Demo mini — tanpa akun. Workspace lengkap ada di ruang tools.`
- Tidak ada upload berkas, tidak ada download, tidak ada penyimpanan. Demo tidak menggantikan tool penuh.
- Semua proses memakai API browser standar; tidak menambah dependensi.
- Jika demo > 15 KB, pisahkan dengan `dynamic import` + placeholder setinggi konten untuk mencegah CLS.

**Fallback P0 (jika demo tanpa login tidak disetujui):** tampilkan kartu before/after statis (contoh gambar → WebP) + tiga poin privasi. Tetap ada bukti visual, tanpa interaksi.

**Bukti privasi:**

- Stat besar: `0 byte` — “berkas dikirim ke server.”
- Tiga poin: `Diproses di perangkat`, `Tanpa riwayat berkas`, `Tanpa unggahan`.
- Diagram sederhana: `Berkas → Browser → Unduh`, dengan server dicoret/abu-abu dan label `tidak dilewati`.
- Disclosure “Cara kerjanya”: Canvas API, `FileReader`, pdf.js berjalan lokal; tidak ada request berisi berkas. Tulis dengan bahasa manusia, bukan spesifikasi teknis.
- Ajakan verifikasi: `Buka DevTools → Network saat memproses gambar; tidak ada request berisi berkas.` Ini klaim yang bisa dicek dan memperkuat kepercayaan.
- Jangan menulis “100% aman”; tulis “berkas tidak diunggah” dan “diproses lokal”.

**Kenapa ini penting:** privasi adalah pembeda utama LKTech Tools. Tanpa bukti, klaim ini mudah disamakan dengan situs konverter biasa.

### 4.4 Katalog — “Lima tool, satu ruang.”

**Tujuan:** memberi gambaran lengkap produk dan jalan cepat ke tool, tanpa menduplikasi ruang.

**Isi:**

- Heading + subcopy singkat.
- Grid 5 kartu tool yang lebih informatif.
- Kartu ke-6: **“Tool yang Anda butuhkan belum ada?”** — dashed card, ikon lampu, tautan `Usulkan tool` ke `/kontak`. Ini mengisi grid 3×2 dan membuka feedback loop tanpa backend baru.
- Link kecil di bawah grid: `Butuh pencarian dan filter? Buka ruang tools.` untuk menjelaskan perbedaan landing vs ruang.

**Upgrade kartu:**

| Elemen | Sekarang | Setelah |
| --- | --- | --- |
| Status | “Tersedia” | “Tersedia” + badge “Lokal” |
| Format | Tidak ada | `PNG/JPG → WebP` (dari metadata registry) |
| Batas | Tidak ada | `Maks. 15 MB` (dari metadata registry) |
| Aksi | “Buka tool” | “Buka tool” + panah, seluruh kartu tetap klik |
| Tool `segera` | Kartu non-klik | Tetap non-klik + alasan singkat, bukan UI palsu |

**Filter kategori di landing (P1):**

- Chip `Semua / Warna / Gambar / PDF / Produktivitas` dengan jumlah.
- Filter dilakukan client-side memakai `filterTools` yang sudah ada.
- Hasil filter diberi `aria-live` (“3 tool ditemukan”).
- Saat filter aktif dan kosong, tampilkan empty state dengan tombol reset.
- Jangan menambahkan search di landing untuk saat ini; search adalah pembeda ruang. Dengan 5 tool, intent tiles + filter sudah cukup.

**Teknis:**

- Jika `ToolCard` diberi tombol favorit (P1), **jangan** menaruh `<button>` di dalam `<Link>` seluruh kartu. Refactor menjadi kartu `<article>` dengan tautan utama (stretched link) dan tombol favorit terpisah agar HTML valid dan aksesibel.
- Metadata baru (`io`, `limitLabel`) ditambahkan opsional di registry agar tool lama tetap valid.
- Audit agar batas di kartu tidak bertentangan dengan batas di body tool. Jangan mengubah validasi tool di fase ini.

### 4.5 Alur 3 langkah — “Tanpa instalasi.”

**Tujuan:** menjelaskan alur tanpa mengambil ruang terlalu banyak.

**Desain:** band horizontal ringkas dengan 3 langkah bernomor dan garis penghubung; bukan tiga kartu besar.

1. **Pilih tool** — dari kebutuhan atau katalog.
2. **Proses di browser** — berkas tetap di perangkat Anda.
3. **Unduh hasil** — tidak ada antrean unggah.

Microcopy: `Perlu akun LKTech — gratis, sekali masuk. Tidak ada berkas yang diunggah.`

**Perubahan penting:** langkah login tidak lagi menjadi “Langkah 1”. Login adalah prasyarat, bukan nilai produk. Ini mengurangi kesan bahwa login adalah pekerjaan utama.

### 4.6 FAQ + CTA akhir — “Masih ada pertanyaan?”

**Tujuan:** menjawab keberatan terakhir dan memberi CTA tanpa section tambahan yang panjang.

**Layout:** desktop 7/5. Kiri: accordion FAQ. Kanan: kartu CTA dengan latar lembut, primary button, 3 trust bullet. Mobile: FAQ lalu CTA.

**FAQ yang disarankan (6):**

1. Apakah berkas saya benar-benar tidak diunggah?
2. Kenapa saya perlu akun LKTech?
3. Apakah bisa dipakai di HP?
4. Apa batas ukuran berkas?
5. Apakah hasil saya disimpan?
6. Apakah LKTech Tools gratis?

**Jawaban “kenapa akun”:**

> “Akun membantu kami menjaga akses tetap terkontrol dan mencegah penyalahgunaan. Login tidak memberi kami akses ke berkas Anda — proses tetap berjalan lokal di browser.”

**CTA akhir:**

- Heading: `Siap membereskan berkas?`
- Primary: `Buka ruang tools`
- Trust: `Gratis · Tanpa unggah · Tanpa instalasi`
- Secondary: `Ada pertanyaan?` → `/kontak`

**JSON-LD:** `FAQPage` harus memuat pertanyaan/jawaban yang sama dengan yang terlihat. Pertahankan `BreadcrumbList` dan `ItemList`; jangan menambah schema yang tidak didukung konten.

### 4.7 Anggaran section & bahasa visual

- Maksimal **6 section utama** di landing: hero, intent, demo+privasi, katalog, alur, FAQ+CTA.
- Jangan menambah section baru tanpa memadatkan/menghapus section lama.
- Target mobile: **tidak lebih panjang dari baseline + 5–10%** (±7.500 px), dengan stretch goal ±6.500 px. Jika demo membuat halaman lebih panjang, padatkan alur/FAQ.
- Gunakan token dan komponen yang sudah ada: `SectionHeading`, `ButtonLink`, `Reveal`, `FaqAccordion`, `ToolIcon`, `ToolCard`, `Navbar`, `Footer`.
- Palet: primary/secondary/surface yang ada; emerald untuk privasi; amber hanya untuk status “segera”. Tidak menambah palet baru.
- Visual: mockup UI, ikon, grid halus, aurora yang sudah ada. Tidak ada stok foto, tidak ada ilustrasi 3D baru.
- Motion: reveal sekali, hover lift, tanpa parallax; hormati `prefers-reduced-motion`.

### 4.8 Copy deck ringkas

| Section | Headline | Subcopy | CTA |
| --- | --- | --- | --- |
| Hero | Berkas beres, tanpa unggah. | Kompres gambar, susun PDF, ambil warna, dan rapikan teks — semuanya diproses lokal di browser. | Buka ruang tools |
| Intent | Mulai dari kebutuhan, bukan nama tool. | Pilih masalah yang ingin dibereskan; kami arahkan ke tool yang tepat. | — |
| Demo | Coba rasakan lokalnya. | Demo kecil ini berjalan di browser Anda. Workspace lengkap ada di ruang tools. | Salin / Rapikan |
| Privasi | Berkas tidak pernah meninggalkan perangkat Anda. | Bukan janji kosong — ini cara kerjanya. | Cara kerjanya |
| Katalog | Lima tool, satu ruang. | Dari gambar sampai teks, semuanya dengan alur yang sama: pilih, proses, unduh. | Buka tool |
| Alur | Tiga langkah, tanpa instalasi. | Perlu akun LKTech — gratis, sekali masuk. Tidak ada berkas yang diunggah. | — |
| FAQ/CTA | Siap membereskan berkas? | Gratis. Tanpa unggah. Tanpa instalasi. | Buka ruang tools |

### 4.9 SEO & structured data

- Pertahankan `/tools` sebagai satu-satunya halaman Tools yang `index, follow`; canonical tetap `/tools`.
- Pertahankan `robots.txt` `Disallow: /tools/` tanpa memblokir `/tools`; sitemap tetap memuat `/tools`.
- Pertahankan `BreadcrumbList`, `ItemList`, `FAQPage`; pastikan `ItemList` memuat 5 tool dan `FAQPage` sinkron dengan FAQ visible.
- Satu `<h1>` saja; section memakai `<h2>`; kartu memakai `<h3>`.
- Link internal deskriptif: “Kompres gambar ke WebP”, bukan “Klik di sini”.
- Jangan menambahkan halaman publik per tool di fase ini; itu keputusan produk/SEO terpisah (P2).
- Open Graph image khusus `/tools` adalah nice-to-have P2; jangan menahan rilis karenanya.

### 4.10 Analytics

Gunakan `trackEvent` yang sudah ada di `src/lib/analytics.ts`. Tambahkan wrapper bertipe agar nama event konsisten:

| Event | Kapan | Props yang diizinkan |
| --- | --- | --- |
| `tools_cta_click` | CTA hero/akhir diklik | `location`, `auth`, `target` |
| `tools_intent_click` | Intent tile diklik | `tool`, `intent` |
| `tools_demo_interact` | Demo dibuka/diinteraksikan | `demo`, `action` |
| `tools_catalog_filter` | Filter kategori di landing/ruang | `category`, `has_query`, `result_count` |
| `tools_tool_open` | Tool dibuka | `tool`, `source` |
| `tools_tool_success` | Proses tool berhasil | `tool`, `duration_bucket` |
| `tools_tool_error` | Proses tool gagal | `tool`, `code` |
| `tools_favorite_toggle` | Favorit ditambah/dihapus | `tool`, `action` |

**Aturan:** jangan kirim nama berkas, isi teks, query pencarian mentah, ukuran berkas, atau data pribadi apa pun. Untuk query, kirim `has_query` dan `result_count` saja.

---

## 5. Upgrade ruang `/tools/ruang`

**Masalah:** ruang saat ini adalah katalog dengan `PageHero` besar. Untuk dashboard, ini terlalu “landing” dan kurang “app”.

### 5.1 Header ringkas

Ganti `PageHero` besar dengan header workspace yang lebih pendek:

- Breadcrumb kecil: `Beranda / Tools / Ruang`.
- Judul: `Ruang tools`.
- Subcopy: `5 tool siap dipakai. Semua proses lokal di browser.`
- Stat kecil: `5 tersedia · 4 kategori · 0 unggahan`.
- Opsional sapaan: `Selamat datang, {nama}` jika `displayName` tersedia; jangan paksa jika kosong.
- Aksi: `Kembali ke halaman pengantar` sebagai link teks kecil.

**Manfaat:** katalog langsung terlihat, mengurangi scroll, dan terasa seperti workspace.

### 5.2 Fitur katalog

| Fitur | Perilaku | Prioritas |
| --- | --- | --- |
| Search + filter | Tetap ada; dipertajam | P0 |
| URL state | `?q=webp&kategori=gambar`; refresh/back/forward bekerja; link bisa dibagikan | P1 |
| Result count | `aria-live`: “3 tool ditemukan” | P0 |
| Empty state | Reset filter + `Usulkan tool` | P0 |
| Keyboard | `/` fokus ke search, `Esc` membersihkan | P1 |
| Recent | “Terakhir dipakai” maks. 3, dari `localStorage` | P1 |
| Favorites | Bintang di kartu + filter “Favorit” | P1 |
| Onboarding | Banner kecil “Baru di sini? Mulai dari…” (dismissible) | P2 |
| Request tool | Kartu/tautan “Usulkan tool” | P1 |

**Catatan teknis:**

- Untuk URL state, gunakan `useSearchParams` + `router.replace(..., { scroll: false })`; bungkus dengan `<Suspense>` jika build Next 16 meminta. Verifikasi dengan `npm run build`, bukan hanya dev.
- `localStorage` dibungkus `try/catch`; jika tidak tersedia (private mode), fallback ke state in-memory. Jangan pernah menyimpan berkas atau isi teks.
- Favorites/recent hanya menyimpan slug + timestamp; validasi slug terhadap registry saat dibaca.
- Sediakan “Hapus data lokal” kecil di dekat recent/favorites (P2) agar pengguna tetap memegang kendali.
- `ToolsCatalog` tetap client component; jangan menambah panggilan server baru.

### 5.3 Peran ruang vs landing

- **Landing** = discovery + persuasi. Tidak perlu search penuh.
- **Ruang** = pencarian, personalisasi, dan titik kembali. Boleh lebih “app-like”.
- Jangan menduplikasi hero pemasaran di ruang; gunakan header ringkas.

---

## 6. Upgrade workspace `/tools/[slug]`

**Masalah:** workspace bagus untuk satu tool, tetapi tidak membantu pengguna berpindah atau memahami batas tool.

### 6.1 Header tool yang lebih informatif

Tambahkan di bawah judul/deskripsi:

- Chip `Lokal di browser`.
- Chip format: `PNG/JPG → WebP`.
- Chip batas: `Maks. 15 MB` / `Maks. 25 MB · 30 halaman`.
- Link `Butuh bantuan?` ke `/tools#faq` (tambahkan `id="faq"` di landing).

Data diambil dari registry agar konsisten dengan kartu. Audit manual: batas di registry harus sama dengan batas yang ditegakkan body tool.

### 6.2 Tool rail

- Rail horizontal di bawah header: ikon + nama semua tool `tersedia`.
- Tool aktif memakai `aria-current="page"` dan gaya primary.
- Mobile: `overflow-x-auto` dengan snap; tetap bisa diakses keyboard.
- Saat tool > 10, ubah menjadi dropdown/kategori. Untuk 5 tool, rail lebih cepat.
- Tidak perlu JS; cukup link dan `usePathname`/prop slug untuk status aktif.

**Manfaat:** pengguna bisa berpindah tool dalam satu klik, tanpa kembali ke katalog.

### 6.3 Tool lain / related

- Di bawah body tool, tampilkan 2 kartu “Tool lain”.
- Gunakan `related` eksplisit di registry hanya jika relasinya kuat:
  - `image-to-webp` ↔ `image-to-pdf`
  - `image-to-pdf` ↔ `pdf-to-image`
  - `pdf-to-image` ↔ `image-to-webp`
- Untuk `color-picker` dan `text-formatter`, jangan memaksakan label “sering dipakai setelah ini” jika tidak ada data. Gunakan “Jelajahi tool lain” tanpa klaim.
- Jangan menampilkan rekomendasi berdasarkan berkas pengguna; itu bisa disalahartikan sebagai analisis konten.

### 6.4 Konsistensi hasil (P2)

- Pertimbangkan komponen `ToolResultActions` bersama: `Unduh`, `Proses lagi`, `Buka tool lain`.
- Ini menyentuh 5 body tool; jangan dikerjakan bersamaan dengan landing jika ingin rilis lebih cepat.
- Sebelum refactor, audit perilaku tiap tool agar tidak ada regresi.

---

## 7. Usulan tambahan & prioritas

Tabel ini merangkum ide di luar struktur inti §4–§6. Prioritas ditentukan oleh dampak ke pengalaman dan biaya.

| Prioritas | Usulan | Manfaat | Effort | Catatan |
| --- | --- | --- | --- | --- |
| **P0** | Hero product-led + visual CSS | Diferensiasi langsung terasa | M | Tanpa aset berat |
| **P0** | Intent tiles | Mengurangi friction memilih tool | S | Data registry sudah ada |
| **P0** | Bukti privasi + diagram | Mengubah klaim menjadi kepercayaan | S | Jangan klaim “100% aman” |
| **P0** | Kartu dengan format/batas/lokal | Mengurangi trial-and-error | S | Audit batas dengan body tool |
| **P0** | CTA sadar-login + deep link `next` | Mengurangi flash guard & langkah login | S | Uji logged-in/out |
| **P0** | Event analytics Tools | Dasar optimasi | S | Tanpa PII |
| **P1** | Demo mini warna/teks tanpa akun | Momen “aha” sebelum login | M | Batasi 20k karakter; tanpa file |
| **P1** | Filter kategori di landing | Discovery lebih cepat | S | Reuse `filterTools` |
| **P1** | URL state di ruang | Search bisa dibagikan & back bekerja | M | Suspense + build test |
| **P1** | Recent + favorites lokal | Ruang terasa personal | M | localStorage, tanpa server |
| **P1** | Tool rail workspace | Pindah tool satu klik | S | `aria-current` |
| **P1** | Keyboard `/` di ruang | Power user & a11y | S | Tampilkan hint |
| **P2** | Halaman publik per tool | Menangkap long-tail SEO | L | Keputusan produk/SEO terpisah; workspace tetap gated |
| **P2** | OG image `/tools` | Share preview lebih menarik | S | `ImageResponse`; tidak menahan rilis |
| **P2** | Sticky CTA mobile | Konversi di layar kecil | S | Harus dismissible, jangan mengganggu |
| **P2** | “Baru” badge | Menonjolkan tool baru | S | Butuh `addedAt` di registry |
| **P2** | Roadmap / usulan tool | Feedback loop & retensi | M | Jangan tampilkan tool fiktif |
| **P2** | Feedback widget | Mengukur kepuasan halaman | S | Butuh tujuan data |
| **P2** | A/B test H1/CTA | Optimasi berbasis data | M | Butuh traffic memadai |
| **P2** | Audit offline/PWA | Tools tetap jalan saat offline | L | pdf.js/worker perlu diuji |
| **P2** | Favorit lintas perangkat | Personalisasi antar-device | L | Butuh penyimpanan akun + review privasi |
| **P2** | Dashboard usage tools | Melihat tool paling sering dipakai | M | Agregat, tanpa PII |

**Yang sengaja tidak dilakukan sekarang:**

- Membuat `/tools/[slug]` publik/indexable. Workspace tetap `noindex`; halaman publik per tool adalah inisiatif terpisah.
- Menambahkan paywall/monetisasi. F4 masih di luar cakupan.
- Mengubah logika pemrosesan/validasi tool. Fokus fase ini adalah pengalaman masuk dan discovery.
- Menambahkan dependensi animasi/3D baru. Halaman harus cepat.
- Menampilkan testimoni/angka pengguna yang belum terverifikasi.

---

## 8. Fase eksekusi

| Fase | Fokus | Deliverable | Estimasi | Gate |
| --- | --- | --- | --- | --- |
| **T0** | Baseline & keputusan | Approve paket, H1/tone, kebijakan demo; baseline screenshot + Lighthouse; inventaris format/batas 5 tool | 0,5–1 hari | Copy & scope disetujui |
| **T1** | Fondasi bersama | Metadata registry (`io`, `limitLabel`, `related`), helper discovery murni + test, wrapper analytics, `ToolCard` baru, `ToolsCta`, `LocalBadge` | 1–1,5 hari | `tsc`, test registry hijau |
| **T2** | Hero + intent | Hero split + visual CSS, trust line, intent grid, CTA sadar-login, tracking | 1,5–2 hari | Preview visual desktop/mobile |
| **T3** | Demo + privasi | Demo mini (P1), bukti privasi, disclosure teknis, a11y, lazy load | 1–1,5 hari | Demo tidak mengganggu LCP/INP |
| **T4** | Katalog + alur + FAQ/CTA | Showcase 5+1 kartu, filter (P1), alur ringkas, FAQ+CTA gabungan, JSON-LD | 1–1,5 hari | Copy & SEO review |
| **T5** | Ruang + workspace | Header ringkas, URL state, recent/favorites, empty state, keyboard, tool rail, chip metadata, related | 1,5–2 hari | Uji login/logout & build |
| **T6** | QA & polish | Responsive 360–1440, a11y, performance, SEO, analytics, cross-browser | 1–1,5 hari | Checklist §12 |
| **T7** | Rilis & monitor | Preview, produksi, verifikasi event, monitor 48 jam | 0,5 hari | Rilis disetujui |

**Total estimasi A+B:** 7–10 hari kerja (satu developer, tanpa review eksternal panjang).  
**Paket A saja:** 3–4 hari. **Paket C:** 2–3 hari, setelah data.

**Urutan aman:**

1. T0–T1 (fondasi, tidak terlihat pengguna).
2. T2 (hero/intent) → preview pertama.
3. T3–T4 (demo, katalog, FAQ) → preview kedua.
4. T5 (ruang/workspace) → preview ketiga.
5. T6–T7 (QA, rilis).

Jika ingin lebih cepat, Paket A bisa rilis lebih dulu; Paket B menyusul tanpa menunggu perubahan besar.

---

## 9. File yang akan disentuh

### 9.1 Baru

| File | Peran | Paket |
| --- | --- | --- |
| `src/components/tools/landing/tools-hero.tsx` | Hero split + copy + CTA | A |
| `src/components/tools/landing/tools-hero-visual.tsx` | Mockup workspace CSS | A |
| `src/components/tools/landing/tools-intent-grid.tsx` | 5 intent tile + tracking | A |
| `src/components/tools/landing/tools-privacy-proof.tsx` | Stat, diagram, disclosure | A |
| `src/components/tools/landing/tools-showcase.tsx` | Grid katalog + filter (P1) | A/B |
| `src/components/tools/landing/tools-workflow.tsx` | Alur 3 langkah ringkas | A |
| `src/components/tools/landing/tools-faq-cta.tsx` | FAQ + CTA gabungan | A |
| `src/components/tools/landing/tools-demo.tsx` | Demo warna/teks (client) | B |
| `src/components/tools/tools-cta.tsx` | CTA sadar-login | A |
| `src/components/tools/tool-local-badge.tsx` | Badge “Lokal” | A |
| `src/components/tools/tool-rail.tsx` | Rail tool di workspace | B |
| `src/components/tools/request-tool-card.tsx` | Kartu “Usulkan tool” | A |
| `src/components/tools/tools-empty-state.tsx` | Empty state katalog | A |
| `src/lib/tools-discovery-pure.ts` | Parse URL state, recent/favorites, related, intent mapping | A/B |
| `scripts/tools-discovery.test.ts` | Test helper discovery | A/B |

### 9.2 Diubah

| File | Perubahan |
| --- | --- |
| `src/app/tools/page.tsx` | Rewrite landing: hero, intent, demo/privasi, katalog, alur, FAQ+CTA; metadata/JSON-LD dipertahankan |
| `src/app/tools/ruang/page.tsx` | Header ringkas, recent, catalog baru; tetap `UserGuard` + `noindex` |
| `src/components/tools/tool-card.tsx` | Metadata format/batas/lokal; varian; refactor jika ada tombol favorit |
| `src/components/tools/tools-catalog.tsx` | URL state, keyboard, result count, empty state, favorites/recent |
| `src/components/tools/tool-shell.tsx` | Chip metadata, tool rail, related/other tools |
| `src/lib/tools-registry-pure.ts` | Field opsional `io`, `limitLabel`, `related`; tetap murni |
| `src/lib/analytics.ts` | Wrapper event Tools bertipe |
| `scripts/tools-registry.test.ts` | Test metadata baru & validasi `related` |
| `scripts/tools-pages.test.ts` | Update assertion struktural; tetap jaga publik/noindex/robots/sitemap |
| `docs/README.md` | Tambah entri dokumen ini |
| `docs/2026-11-01-lktech-tools-space.md` | Catatan tautan ke rencana upgrade (tanpa menulis ulang sejarah) |
| `TASK-SELANJUTNYA.md` | Catatan status rencana/approval (setelah disetujui) |

### 9.3 Tidak perlu diubah (kecuali ditemukan bug)

- `src/app/robots.ts` — aturan `/tools/` sudah benar.
- `src/app/sitemap.ts` — `/tools` sudah ada.
- `src/components/auth/user-guard.tsx` — model akses tetap.
- Body tool (`color-picker-tool.tsx`, `image-to-webp-tool.tsx`, dst.) — tidak diubah di Paket A/B, kecuali penyesuaian copy batas yang terbukti tidak konsisten.

---

## 10. Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Halaman makin panjang | Pengguna tidak sampai CTA | Maks. 6 section; padatkan alur/FAQ; ukur tinggi mobile |
| Landing vs ruang tumpang tindih | Bingung mau search di mana | Landing = discovery; ruang = search/personalization; jelaskan lewat link kecil |
| Login tetap menjadi friction | Drop-off sebelum mencoba | Intent deep link + demo mini + CTA sadar-login + copy “kenapa akun” |
| Demo memperlambat LCP/INP | Pengalaman awal memburuk | Client island kecil, tanpa dependensi, lazy load, placeholder anti-CLS |
| Klaim privasi tidak dipercaya | Diferensiasi hilang | Diagram, disclosure teknis, ajakan cek DevTools, hindari klaim absolut |
| Regresi SEO | Trafik `/tools` turun | Pertahankan canonical/index/JSON-LD; test robots/sitemap; validasi Rich Results |
| Analytics mengirim PII | Risiko privasi | Event taxonomy; tanpa nama/isi berkas; review sebelum rilis |
| Tombol favorit di dalam link | HTML tidak valid, a11y rusak | Refactor `ToolCard` jadi article + stretched link + button terpisah |
| `useSearchParams` bentrok dengan build statis | Build gagal | Bungkus `Suspense`; uji `npm run build` |
| Metadata batas tidak sinkron | Pengguna salah kira | Audit manual 5 tool; jadikan registry sumber tampilan; test metadata |
| Redirect login tidak kembali ke tool | Pengguna kehilangan konteks | Uji `next` encoding untuk semua intent tile; uji logged-in/out |
| `localStorage` tidak tersedia | Error di private mode | `try/catch` + fallback in-memory |
| Scope creep ke body tool | Rilis melar | Batasi Paket A/B pada shell/landing; result actions di P2 |
| Warning Firestore saat build | Salah dianggap regresi | Catat sebagai pre-existing; bandingkan baseline build |

---

## 11. Metrik keberhasilan

### 11.1 Prinsip pengukuran

- Ukur **perilaku**, bukan hanya pageview: CTA, intent, login completion, tool activation.
- **Tanpa PII:** jangan kirim nama berkas, isi teks, query mentah, atau ukuran berkas.
- Baseline ideal: 7 hari sebelum rilis. Jika event Tools belum ada, instrumentasi lebih dulu atau gunakan pageview/CTA yang sudah tersedia dan akui keterbatasannya.
- Evaluasi awal: 48 jam (health), 1 minggu (arah), 2 minggu (keputusan).

### 11.2 KPI

| Metrik | Definisi | Target awal |
| --- | --- | --- |
| CTR landing → ruang/login | Klik CTA utama / pengunjung landing | +20% vs baseline |
| Intent CTR | Klik intent tile / pengunjung landing | Ukur; target ≥15% |
| Login completion | Berhasil login setelah CTA Tools / klik CTA | Naik dari baseline |
| Tool activation | Sesi dengan satu proses sukses / sesi ruang | +15% |
| Time to first tool | Waktu dari landing/ruang ke tool pertama | −20% |
| Zero-result search | Pencarian tanpa hasil / total pencarian | <10% |
| Demo interaction (P1) | Pengunjung yang menginteraksikan demo | ≥10% |
| Return usage 7 hari | Pengguna yang kembali ke ruang dalam 7 hari | +10% |
| Guardrail performa | LCP / CLS / INP | ≤2,5 s / ≤0,05 / ≤200 ms |
| Guardrail a11y | Lighthouse Accessibility | 100 |
| Guardrail SEO | Lighthouse SEO | 100 |
| Guardrail bundle | JS tambahan landing vs baseline | ≤50 KB gzip |

Target di atas adalah **target awal**, bukan janji. Evaluasi setelah 2 minggu dan sesuaikan.

### 11.3 Event taxonomy

Lihat §4.10. Tambahan untuk ruang/workspace:

- `tools_recent_open` — `{ tool }`
- `tools_switcher_open` — `{ from, to }`
- `tools_empty_state_action` — `{ action: "reset" | "request" }`

Semua event memakai `trackEvent` dan hanya properti non-sensitif.

---

## 12. Acceptance criteria

> `[x]` = sudah diverifikasi lewat test otomatis atau review kode. Item manual
> (Lighthouse, browser, screenshot) tetap dicentang saat QA rilis.

### 12.1 Produk & konten

- [ ] H1, subcopy, dan CTA utama terlihat tanpa scroll di 390×844 dan 1440×900.
- [x] 5 tool dapat dijangkau dari landing dalam ≤2 klik; intent tile mengarah ke slug yang benar.
- [x] Kartu ke-6 “Usulkan tool” mengarah ke `/kontak` dan tidak menjanjikan fitur.
- [x] FAQ visible dan `FAQPage` JSON-LD memuat pertanyaan/jawaban yang sama.
- [x] Tidak ada testimoni/angka pengguna/klaim “100% aman” yang tidak terverifikasi.

### 12.2 Responsif & visual

- [ ] Tanpa overflow horizontal di 360, 390, 768, 1024, 1440.
- [ ] Hero visual tidak menutupi CTA di mobile; tidak ada teks terpotong.
- [ ] Tinggi mobile tidak lebih dari baseline + 10% (≤7.800 px); stretch goal ≤6.500 px.
- [ ] Hover/focus state konsisten; tidak ada layout shift saat auth state berubah.

### 12.3 Auth & navigasi

- [x] Belum login: CTA mengarah ke `/masuk?next=...`; setelah login kembali ke tujuan.
- [x] Sudah login: CTA mengarah ke `/tools/ruang`.
- [x] `/tools` tidak memakai `UserGuard`; `/tools/ruang` dan `/tools/[slug]` tetap `UserGuard` + `noindex`.
- [x] Tidak ada redirect loop; `next` ter-encode dengan benar.
- [x] Tool rail menandai tool aktif dengan `aria-current="page"`.

### 12.4 Privasi & kepercayaan

- [x] Copy privasi akurat: “tidak diunggah”, bukan “100% aman”.
- [x] Demo (jika ada) tidak mengirim berkas/isi ke server; tidak ada request upload.
- [x] Disclosure teknis bisa dipahami dan tidak menyesatkan.
- [x] Event analytics tidak memuat PII.

### 12.5 Aksesibilitas

- [ ] Semua elemen interaktif bisa diakses keyboard; focus terlihat.
- [x] Demo punya label, instruksi, dan `aria-live` untuk feedback salin/format.
- [x] Filter kategori memakai `aria-pressed`/state yang jelas; result count diumumkan.
- [ ] `prefers-reduced-motion` dihormati.
- [ ] Kontras teks/latar memenuhi AA.
- [ ] Tidak ada `<button>` di dalam `<a>`.

### 12.6 Performa

- [ ] Lighthouse mobile preview: Performance ≥90, Accessibility 100, SEO 100, Best Practices ≥95.
- [ ] LCP ≤2,5 s; CLS ≤0,05; INP ≤200 ms.
- [ ] JS tambahan landing ≤50 KB gzip vs baseline; demo tidak di jalur kritis jika >15 KB.
- [ ] Tidak ada gambar hero besar; visual hero CSS.
- [ ] Tidak ada console error baru.

### 12.7 SEO

- [x] `/tools` `index, follow`, canonical `/tools`, OG tags benar.
- [x] `robots.txt` `Disallow: /tools/` tanpa memblokir `/tools`; `/tools/panduan` diizinkan.
- [x] `sitemap.xml` memuat `/tools` dan 5 panduan publik.
- [ ] JSON-LD valid (Rich Results Test) dan sesuai konten.
- [x] Satu `<h1>`; heading hierarkis; link deskriptif.

### 12.8 Analytics

- [ ] Event `tools_cta_click`, `tools_intent_click`, `tools_tool_open`, `tools_tool_success` terkirim.
- [ ] Props sesuai taxonomy; tidak ada nama/isi berkas.
- [ ] Event terverifikasi di preview (Vercel Analytics debug/GA4 debug jika ada).

### 12.9 Quality gate

- [x] `npm run lint` bersih.
- [x] `npx tsc --noEmit` bersih.
- [x] `npm run test:tools-registry` lulus (17).
- [x] `npm run test:tools-pages` lulus (12).
- [x] `npm run test:tools-discovery` lulus (14).
- [x] `npm run test:tools-color`, `test:tools-image`, `test:tools-text`, `test:tools-pdf` lulus (11/9/11/8).
- [x] `npm run build` sukses (217/217 halaman); warning Firestore pre-existing dicatat, bukan regresi.
- [x] `npx playwright test e2e/public-pages.spec.ts` lulus (18/18), termasuk panduan publik.
- [ ] Smoke manual 5 tool: color picker copy, WebP, image→PDF, text formatter, PDF→image.
- [ ] Chrome + Safari mobile + Firefox (minimal Chrome + Safari mobile).

### 12.10 Dokumentasi

- [x] `docs/README.md` memuat dokumen ini.
- [x] `docs/2026-11-01-lktech-tools-space.md` menautkan rencana upgrade.
- [x] `TASK-SELANJUTNYA.md` diperbarui setelah approval/eksekusi.
- [ ] Catatan hasil rilis + metrik awal ditambahkan setelah 2 minggu.

---

## 13. Keputusan & approval

### 13.1 Rekomendasi

**Setujui Paket A + B sekarang.** Keduanya saling melengkapi: A membuat landing terasa seperti produk; B membuat pengalaman setelah klik juga terasa seperti produk. Paket C ditunda sampai ada data.

### 13.2 Keputusan yang perlu dikonfirmasi

| # | Keputusan | Rekomendasi | Alternatif |
| --- | --- | --- | --- |
| 1 | H1 & tone | “Berkas beres, tanpa unggah.” + “Anda” | Versi lebih formal: “Berkas rapi, tanpa unggah.” |
| 2 | Demo mini tanpa login | **Ya**, hanya warna/teks, tanpa file/download | Tidak ada demo; pakai before/after statis |
| 3 | Intent tile langsung ke tool | **Ya**; login redirect dengan `next` | Arahkan ke ruang dulu |
| 4 | Recent/favorites lokal | **Ya**, hanya `localStorage`, tanpa server | Tidak ada personalisasi |
| 5 | Halaman publik per tool | **Sudah dikerjakan** (Paket C): `/tools/panduan/[slug]` | Workspace tetap gated; panduan publik untuk SEO |

### 13.3 Cara approve

Balas salah satu:

- `approve A+B` — rekomendasi (landing + demo + ruang/workspace).
- `approve A` — landing dulu, B menyusul.
- `approve A+B+C` — semua, termasuk P2.
- Atau sebutkan nomor keputusan yang ingin diubah (mis. “demo jangan tanpa login”).

Setelah approval, saya mulai T0–T1, lalu kirim preview setelah T2 (hero + intent) sebelum melanjutkan ke T3–T4.

---

## 14. Referensi

- [`2026-11-01-lktech-tools-space.md`](2026-11-01-lktech-tools-space.md) — produk & teknis Tools, §14–§17.
- [`../src/app/tools/page.tsx`](../src/app/tools/page.tsx) — landing saat ini.
- [`../src/app/tools/ruang/page.tsx`](../src/app/tools/ruang/page.tsx) — ruang saat ini.
- [`../src/components/tools/tool-card.tsx`](../src/components/tools/tool-card.tsx) — kartu tool.
- [`../src/components/tools/tools-catalog.tsx`](../src/components/tools/tools-catalog.tsx) — search + filter.
- [`../src/components/tools/tool-shell.tsx`](../src/components/tools/tool-shell.tsx) — kerangka workspace.
- [`../src/lib/tools-registry-pure.ts`](../src/lib/tools-registry-pure.ts) — registry 5 tool.
- [`../src/lib/analytics.ts`](../src/lib/analytics.ts) — helper `trackEvent`.
- [`../scripts/tools-pages.test.ts`](../scripts/tools-pages.test.ts) — penjaga regresi publik/noindex.
- [`../TASK-SELANJUTNYA.md`](../TASK-SELANJUTNYA.md) — status task proyek.

---

> **Catatan implementasi (2026-11-15):** dokumen ini awalnya rencana; pemilik menyetujui **A+B+C**, lalu seluruh paket diimplementasikan. Arsitektur akses tidak berubah — `/tools` publik, `/tools/ruang` & `/tools/[slug]` login-gated, dan panduan publik berada di route terpisah `/tools/panduan`. Status detail ada di §0.1; checklist manual di §12 tetap menjadi gerbang QA rilis.
