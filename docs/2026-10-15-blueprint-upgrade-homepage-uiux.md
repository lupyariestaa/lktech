# Blueprint — Upgrade UI/UX Halaman Beranda (Storytelling Scroll + Premium Minimalis)

> **Status:** 🚧 Berjalan (F0–F2 selesai — kode; F3–F6 belum)
> **Tanggal:** 2026-10-15
> **Pemilik:** Lupy (LKTech)
> **Keputusan tema:** **A (Storytelling Scroll)** + **B (Premium Minimalis Modern)**
> **Efek khusus:** **pinned/sticky scroll** (halaman "diam", elemen bergerak mengikuti scroll)
> **3D/WebGL:** hanya **tablet ke atas** (≥ 768px); mobile menyusul bila hasilnya memuaskan
> **Batasan keras:** **konten TIDAK boleh dipangkas** — beranda tetap kaya (semua section dipertahankan, bahkan diperkaya)

---

## 1. Ringkasan

Beranda LKTech **sudah modern** (Hero 3D-tilt, aurora gradient, marquee teknologi, counter statistik,
FAQ accordion, Framer Motion di hampir semua section, a11y `prefers-reduced-motion`). Jadi ini
**bukan** proyek "rombak dari nol".

Masalah sebenarnya: **belum ada identitas visual yang khas** dan beberapa pola masih **seragam &
statis** (grid kartu 3-kolom berulang, transisi antar-section berupa "potongan keras", belum ada
efek scroll yang mengikat cerita). Tujuan upgrade: memberi **wow factor yang khas** tanpa mengorbankan
**performa, aksesibilitas, dan konten**.

---

## 2. Tujuan & Scope

### In-scope
- Efek **scroll-driven** (parallax, pinned/sticky, scroll progress) di beranda.
- **Animated headline** & mikro-interaksi (cursor glow, hover reveal) — desktop.
- **Section transition** yang halus (bukan potongan keras antar latar).
- **Bento grid** untuk section layanan (variasi ukuran, bukan 3 kolom seragam).
- **Timeline scroll-driven** untuk section proses (garis tumbuh mengikuti scroll).
- **Lapisan 3D/WebGL** di Hero (tablet ke atas), lazy-loaded + fallback aman.
- **Trust bar** berbasis **data nyata** (statistik klien / bukti sosial) — tanpa angka palsu.

### Out-of-scope (tidak dikerjakan di fase ini)
- Multi-bahasa (ditunda — keputusan terpisah).
- Chatbot AI (di-skip atas keputusan pemilik).
- Rombak halaman selain beranda (halaman dalam menyusul setelah pola terbukti).
- Perubahan struktur konten/Firestore (kecuali bila memang dibutuhkan & diminta).

### Batasan (constraints)
- **Konten tetap banyak** — tidak ada section yang dihapus/diringkas demi "minimalis".
- **Performa:** jaga Core Web Vitals (LCP/INP/CLS). Animasi wajib GPU-friendly (`transform`/`opacity`).
- **A11y:** hormati `prefers-reduced-motion` (helper sudah ada) + navigasi keyboard tetap utuh.
- **Mobile-first:** efek berat hanya aktif di layar besar; mobile tetap ringan & cepat.
- **Tanpa scroll-hijack** yang memblokir scroll (kecuali pinning native berbasis CSS `sticky`).

---

## 3. Audit Kondisi Saat Ini

### 3.1 Fakta teknis
| Aspek | Nilai |
| --- | --- |
| Next.js | `^16.3.6` (App Router) |
| React | `^19.3.0` |
| Animasi | `framer-motion ^13.4.4` (sudah ada) |
| Styling | Tailwind **v4** (token di `src/app/globals.css`, tanpa `tailwind.config`) |
| 3D/WebGL | **belum ada** (`three`, `@react-three/fiber`, `@react-three/drei` tidak terpasang) |
| Smooth scroll | **belum ada** (`lenis` tidak terpasang); saat ini `html { scroll-behavior: smooth }` |
| Struktur beranda | `src/app/page.tsx` — 11 section berurutan + `IntroLoader` + `Navbar` + `Footer` |
| Helper animasi | `src/components/motion.tsx` (`Reveal`, `staggerContainer`, `staggerItem`) |
| Design tokens | warna brand, `--radius-4xl/5xl`, `animate-marquee/float/aurora`, util `.glass`, `.text-gradient`, `.grid-lines`, `.glow-primary` |
| Total `src` | ~67.185 baris; 243 file `.tsx` |

### 3.2 Inventaris section beranda (urutan render)

| # | Section | File | Jenis | Catatan audit |
| --- | --- | --- | --- | --- |
| — | Intro loader | `components/intro-loader.tsx` | Client | Panel ganda + progress, ~2,1 dtk, **kunci scroll**. Selalu tampil tiap kunjungan beranda. |
| — | Navbar | `sections/navbar.tsx` | Client | Sticky, dropdown desktop + akordeon mobile. Sudah rapi. |
| 1 | Hero | `sections/hero.tsx` | Client | 3D-tilt mouse-follow, aurora, mockup browser+phone, chip mengambang. **Headline statis**, belum scroll-driven. |
| 2 | Technologies | `sections/technologies.tsx` | Client | Marquee logo (CSS `animate-marquee`), pause saat hover. Sudah bagus. |
| 3 | Services | `sections/services.tsx` | Client | Grid **3 kolom seragam** + `ServiceCard` (tilt). Pola berulang. |
| 4 | Portfolio Teaser | `sections/portfolio-teaser.tsx` | Server | Grid 3 kolom, ambil `getProjects()`. |
| 5 | Why Us | `sections/why-us.tsx` | Client | Grid 3 kolom + stagger. Pola berulang. |
| 6 | Process | `sections/process.tsx` | Client | Grid 4 kolom + garis statis + pulse. **Belum scroll-driven**. |
| 7 | Featured Products | `sections/featured-products.tsx` | Server | Grid 3 kolom. Sembunyi bila kosong. |
| 8 | Stats | `sections/stats.tsx` | Client | Counter animasi. **Sembunyi bila masih data contoh** (jujur, tapi sering tak tampil). |
| 9 | Pricing | `sections/pricing.tsx` | Client | Grid 3 kartu, satu highlight. |
| 10 | FAQ | `sections/faq.tsx` | Client | Accordion, `max-w-3xl`. |
| 11 | CTA Contact | `sections/cta-contact.tsx` | Client | Kartu gradient besar + blob animasi. Sudah kuat. |
| — | Footer | `sections/footer.tsx` | Client | 4 kolom + newsletter. Sudah rapi. |

### 3.3 Kekuatan (pertahankan!)
- Design system konsisten (token, util glass/gradient, radius besar).
- A11y sudah dipikirkan: `prefers-reduced-motion`, focus-visible, `sr-only-focusable`, ARIA di carousel/FAQ/navbar.
- Performa dasar baik: `next/image`, `serverExternalPackages`, `optimizePackageImports`, `revalidate`.
- Kejujuran data (stats/social proof hanya tampil bila nyata) — pertahankan.

### 3.4 Temuan / peluang perbaikan (severity)

| ID | Temuan | Dampak | Severity |
| --- | --- | --- | --- |
| **A1** | ~~`body { overflow-x: hidden }` mematikan `position: sticky`~~ — **DIKOREKSI (uji empiris F0):** kondisi repo saat ini (`html: visible` + `body: overflow-x: hidden`) **tetap membuat sticky bekerja** (overflow `body` dipropagasi ke viewport). Yang **benar-benar** mematikan sticky: (a) `overflow: hidden/clip` pada **`html`** *dan* `body` sekaligus, atau (b) **wrapper div** ber-`overflow: hidden` di antara container & elemen sticky. | **Aturan wajib**: jangan bungkus konten sticky dengan elemen `overflow: hidden`. Bila perlu memotong luapan horizontal → pakai `overflow-x: clip`. | 🟠 Sedang (aturan, bukan bug aktif) |
| **A2** | Grid kartu **3 kolom seragam berulang** (Services, Portfolio, WhyUs, Products, Pricing) → monoton, kurang hierarki. | Beranda terasa "datar" & panjang | 🔴 Tinggi |
| **A3** | **Transisi antar-section keras** — tiap section ganti latar (white→surface→secondary) tanpa jahitan/transisi. | Hilang rasa "satu cerita" | 🟠 Sedang |
| **A4** | **Tidak ada scroll progress indicator** & tidak ada efek scroll-driven (parallax/pin). | Scroll terasa pasif, bukan "hidup" | 🟠 Sedang |
| **A5** | **Headline Hero statis** (teks muncul sekali saat load, lalu diam). | Momen "wow" pertama kurang | 🟠 Sedang |
| **A6** | `SectionHeading` **selalu center** dengan pola eyebrow→judul→deskripsi sama di semua section. | Repetitif | 🟡 Rendah |
| **A7** | **IntroLoader tampil tiap kunjungan** (~2,1 dtk, kunci scroll). | Bisa terasa lambat bagi pengunjung berulang | 🟡 Rendah |
| **A8** | **Belum ada trust bar** (logo klien / badge kredibilitas) di atas fold. | Bukti kepercayaan kurang di awal | 🟡 Rendah |
| **A9** | Efek **3D/WebGL** belum ada (baru tilt CSS). | Belum ada pembeda "high-tech" | 🟡 Rendah (opsional) |
| **A10** | `Stats` sering **tidak tampil** (data contoh). | Kehilangan section bukti angka | 🟡 Rendah (perlu data nyata) |

> **Catatan A1 (dikoreksi lewat uji empiris, F0):** Dugaan awal bahwa `body { overflow-x: hidden }`
> mematikan `position: sticky` **terbukti keliru** untuk kondisi repo ini. Uji dengan Chromium
> (Playwright) menunjukkan `html: visible` + `body: overflow-x: hidden` **tetap** membuat sticky
> lengket — karena overflow pada `body` **dipropagasi ke viewport**, sehingga `body` bukan
> scroll-container. Yang benar-benar mematikan sticky hanya: (a) `overflow: hidden/clip` pada
> **`html`** *dan* `body` bersamaan, atau (b) **wrapper div** ber-`overflow: hidden`.
> **Konsekuensi:** `body` **tidak diubah** (mengubahnya tanpa manfaat = risiko regresi di browser
> lama). Aturannya cukup: **jangan bungkus elemen sticky dengan wrapper `overflow: hidden`**; bila
> perlu memotong luapan horizontal, gunakan `overflow-x: clip`.

---

## 4. Keputusan Desain (yang sudah disetujui)

| # | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Arah **A + B**: storytelling scroll + premium minimalis | Paling cocok untuk bisnis jasa (butuh cerita & kesan tepercaya/mahal) |
| D2 | Efek **pinned/sticky** sebagai tulang punggung "wow" | Yang paling diinginkan pemilik ("halaman diam, elemen jalan") |
| D3 | **3D/WebGL hanya tablet ke atas** (≥ 768px) | Menjaga performa mobile; mobile menyusul setelah terbukti |
| D4 | **Konten tetap kaya** (tanpa pemangkasan) | Permintaan eksplisit pemilik |
| D5 | **Tanpa scroll-hijack** — pakai CSS `position: sticky` native untuk pinning | Performa terbaik + a11y terjaga + tanpa dependensi berat |
| D8 | **Tidak mengubah `body { overflow-x: hidden }`** (koreksi A1) | Uji empiris: tidak mematikan sticky di konfigurasi repo; mengubahnya hanya menambah risiko. Aturan: hindari wrapper `overflow: hidden` untuk konten sticky |
| D6 | **Framer Motion** cukup untuk scroll-driven (tidak perlu GSAP) | `useScroll`/`useTransform`/`useSpring` sudah tersedia |
| D7 | **Lenis (smooth scroll) = opsional**, di-gate reduced-motion | Tidak wajib; bisa ditunda bila bentrok dengan `scroll-behavior: smooth` |

### Alternatif yang ditolak (dan alasannya)
- **GSAP + ScrollTrigger:** kuat, tapi menambah dependensi besar padahal Framer Motion sudah ada.
- **Scroll-hijack murni JS** (wheel/touch di-intercept): buruk untuk a11y & performa → ditolak.
- **Three.js scene global selalu aktif:** berat di mobile → ditolak (pakai lazy + gate ukuran layar).
- **Rombak total jadi minimalis:** akan memangkas konten → bertentangan dengan D4.

---

## 5. Arsitektur Teknis

### 5.1 Prinsip
1. **CSS-first**: pinning & parallax ringan pakai CSS (`sticky`, `transform`, custom property).
2. **Progressive enhancement**: 3D/WebGL = lapisan tambahan; bila gagal/di-skip, beranda tetap utuh.
3. **Gated by capability**: aktif hanya bila `(min-width: 768px)` **dan** bukan `prefers-reduced-motion`.
4. **Isolasi**: komponen berat di-`dynamic import` (client-only), tidak membebani bundle awal.
5. **Reuse**: manfaatkan `motion.tsx`, token warna/radius, dan util yang sudah ada.

### 5.2 Pola pinned/sticky (inti "wow")
```
<section class="relative">                     // tinggi total = N × viewport
  <div class="sticky top-0 h-screen">          // panel yang "diam"
     ... konten yang bertransformasi mengikuti scroll ...
  </div>
</section>
```
- Scroll progress dihitung via Framer Motion `useScroll({ target, offset })`.
- Nilai di-`useTransform` → `opacity`, `y`, `scale`, atau index langkah aktif.
- **Tanpa** mencegah scroll user (native).

### 5.3 Gate kemampuan (hook baru)
`useMediaQuery` (client) untuk `(min-width: 768px)` + `useReducedMotionPreference()` (sudah ada).
Komponen 3D hanya di-mount bila keduanya lolos; selain itu render fallback (gambar/CSS).

### 5.4 Dependensi yang akan ditambahkan (hanya bila fase 3D disetujui)
| Paket | Untuk | Catatan |
| --- | --- | --- |
| `three` | Render WebGL | Berat → wajib `dynamic import` + gate |
| `@react-three/fiber` | React renderer untuk three | Versi harus cocok React 19 |
| `@react-three/drei` | Helper (kamera, env, dsb.) | Opsional, kurangi impor tak terpakai |
| `lenis` *(opsional)* | Smooth scroll | Gate reduced-motion; uji vs `scroll-behavior` |

> **Belum dipasang di dokumen ini** — hanya direncanakan. Pemasangan dilakukan saat F5 dimulai.

---

## 6. Rencana Fase Implementasi

> Tiap fase **independen & bisa di-commit terpisah**. Bisa berhenti kapan saja tanpa merusak beranda.
> Estimasi "effort" = relatif (S/M/L), bukan jam.

### F0 — Fondasi & util (prasyarat) — effort S
- **Koreksi A1 (uji empiris):** konfirmasi `body { overflow-x: hidden }` **tidak** mematikan
  `position: sticky` pada kondisi repo → **`body` tidak diubah**. Aturan dipindah ke dokumentasi
  (`PinnedSection`) + catatan risiko.
- Tambah hook **`useMediaQuery`** (`src/lib/use-media-query.ts`) — gate SSR-safe untuk efek berat.
- Tambah komponen **`ScrollProgress`** (`src/components/scroll-progress.tsx`) — bar progres scroll.
- Tambah komponen **`PinnedSection`** (`src/components/pinned-section.tsx`) — wrapper sticky generik
  dengan render-prop `progress`, hormati `prefers-reduced-motion`, dan peringatan wrapper overflow.
- Pasang **`ScrollProgress`** di beranda (`app/page.tsx`) — **satu-satunya perubahan UI** di F0.
- Token animasi/spacing tambahan **ditunda** sampai benar-benar dibutuhkan (F2) — hindari token
  tak terpakai.

### F1 — Hero upgrade (momen pertama) — effort M
- **Scroll parallax** ✅: konten hero naik & memudar halus saat di-scroll (Framer `useScroll`;
  fade mulai 0.35 agar tidak hilang terlalu cepat); mockup bergerak berlawanan arah (kedalaman).
- **Animated headline** ✅: baris 1 kata-per-kata (stagger), baris 2 gradient naik sebagai satu unit;
  tetap **satu `<h1>`** (SEO) dengan spasi teks asli agar terbaca "Teknologi Modern, Hasil Nyata".
- **Cursor glow** ✅ (desktop ≥1024px): cahaya halus mengikuti kursor, transform-only, mulai
  `opacity: 0` lalu memudar masuk saat mouse bergerak (tanpa "disc" menggantung).
- **Trust bar** ✅: sinyal **jujur** — statistik klien (bila ada data nyata) + "Konsultasi gratis" +
  "Respon cepat". Tanpa angka palsu.
- **Perbaikan bug (pre-existing)** ✅: chip kaca hero kosong (`<SocialProof/>` render `null` →
  `??` fallback tak aktif). Kini `page.tsx` hanya mengirim elemen bila ada label nyata; fallback
  "Garansi Kualitas" kembali berfungsi.
- Seluruh teks & CTA lama dipertahankan (tidak ada konten terpangkas).

### F2 — Ritme & transisi antar-section — effort M
- **Scroll progress bar** ✅ (dipasang di F0; tetap aktif di beranda).
- **Jahitan antar-section** ✅: komponen baru `SectionSeam` — gradien tipis (40px, `opacity-60`) yang
  meleburkan batas terang↔gelap di section **statistik** (tetangga `surface`), sehingga perpindahan
  warna tidak "memotong keras". Section terang↔terang lainnya sudah halus (putih vs `surface`).
- **Variasi `SectionHeading`** ✅: prop baru `align="left"` + `action` (slot kanan). Dipakai 3 section
  katalog (**layanan, portofolio, produk**) → judul rata kiri dengan tautan "Lihat semua →" di kanan,
  memindahkan CTA dari bawah grid ke samping heading (konten tetap, tidak dipangkas). Section
  proses/harga/faq tetap tengah (ritme berselang).
- Token spacing tambahan tidak diperlukan (semua section sudah `py-24`, konsisten).

### F3 — Pinned storytelling (inti permintaan) — effort L
- **Process**: ubah jadi **timeline scroll-driven** — section di-pin, garis tumbuh, langkah menyala bergantian mengikuti scroll.
- **Satu section "pin" tambahan** (mis. "Cara kami bekerja" / ringkasan layanan) sebagai penutup cerita.
- Semua konten lama **dipertahankan** (hanya penyajian berubah).

### F4 — Services: Bento Grid — effort M
- Ubah grid 3 kolom seragam → **bento** (kombinasi kartu besar/kecil) dengan hierarki visual.
- Hover reveal lebih kaya (ikon/aksen bergerak), tetap aksesibel keyboard.
- Jaga jumlah kartu & teks (tidak memangkas).

### F5 — 3D/WebGL (tablet ke atas) — effort L
- Pasang `three` + `@react-three/fiber` (+ `drei` bila perlu).
- Scene ringan (mis. objek abstrak/brand 3D) di Hero, **lazy + client-only**.
- **Gate:** hanya ≥ 768px & bukan reduced-motion; selain itu fallback (mockup CSS saat ini).
- Batasi DPR & frame agar hemat GPU; hentikan render saat tidak terlihat (IntersectionObserver).

### F6 — Polish & QA — effort M
- Audit performa (Lighthouse/Core Web Vitals), perbaiki regresi CLS/INP.
- Audit a11y (keyboard, kontras, reduced-motion, screen reader).
- Uji mobile & lintas browser (Chrome/Safari/Firefox, iOS/Android).
- Gate: `tsc`, eslint, unit test, `npm run build` hijau.

---

## 7. Daftar File (rencana)

### Baru (usulan)
| File | Peran |
| --- | --- |
| `src/lib/use-media-query.ts` | Hook `useMediaQuery` (SSR-safe) untuk gate efek |
| `src/components/scroll-progress.tsx` | Bar progres scroll (beranda) |
| `src/components/pinned-section.tsx` | Wrapper sticky generik untuk storytelling |
| `src/components/section-seam.tsx` *(F2)* | Jahitan gradien di batas antar-section |
| `src/components/sections/hero-3d.tsx` *(F5)* | Scene 3D/WebGL, lazy + gated |
| `src/components/sections/process-timeline.tsx` *(F3)* | Timeline scroll-driven (ganti isi `process.tsx`) |
| `src/components/sections/services-bento.tsx` *(F4)* | Bento grid layanan |
| `docs/2026-10-15-blueprint-upgrade-homepage-uiux.md` | **Dokumen ini** |

### Diubah (usulan)
| File | Perubahan |
| --- | --- |
| `src/app/globals.css` | *(F0: tidak diubah — lihat koreksi A1)*; token animasi/spacing menyusul bila perlu |
| `src/app/page.tsx` | Pasang `ScrollProgress` (F0); susun ulang urutan section bila perlu (F2+) |
| `src/components/sections/hero.tsx` | *(F1)* Parallax, animated headline, trust bar, cursor glow | ✅ Selesai |
| `src/components/section-heading.tsx` | *(F2)* Varian alignment/ukuran + slot `action` | ✅ Selesai |
| `src/components/sections/process.tsx` | *(F3)* Pindah ke timeline pinned |
| `src/components/sections/services.tsx` | *(F4)* Pindah ke bento |
| `package.json` | *(F5)* Tambah `three`, `@react-three/fiber` |
| `docs/README.md` | Tambah baris indeks dokumen ini |

---

## 8. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| **Performa turun** (terlalu banyak animasi/3D) | SEO & konversi turun | Batasi efek, GPU-only, lazy, gate ukuran layar, ukur Lighthouse tiap fase |
| **Mobile lemot** | Pengalaman buruk mayoritas pengguna | Efek berat hanya ≥768px; mobile = versi ringan |
| **CLS/INP memburuk** | Core Web Vitals merah | Hindari animasi layout (pakai transform), reservasi ruang |
| **Sticky tak jalan** (A1) | Fitur utama gagal | **Koreksi A1 (terverifikasi):** kondisi repo aman; cukup hindari wrapper `overflow: hidden` pada konten sticky (pakai `overflow-x: clip` bila perlu) |
| **A11y** (animasi berlebih) | Pusing/disorientasi | Pertahankan `prefers-reduced-motion`; sediakan fallback statis |
| **Bentrok smooth-scroll** | Scroll "lawan" | Lenis opsional; bila dipakai, matikan `scroll-behavior: smooth` |
| **Konten terpangkas** | Melanggar permintaan | Review tiap fase: tidak ada section/teks yang hilang |
| **Regresi test/build** | CI merah | Gate `tsc`/eslint/unit/build tiap fase |

---

## 9. Status Task

| Fase | Deskripsi | Status |
| --- | --- | --- |
| — | Audit detail beranda | ✅ Selesai (dokumen ini) |
| — | Blueprint & rencana fase | ✅ Selesai (dokumen ini) |
| F0 | Fondasi (util `useMediaQuery`, `ScrollProgress`, `PinnedSection`; koreksi A1) | ✅ Selesai (kode) |
| F1 | Hero upgrade | ✅ Selesai (kode) |
| F2 | Ritme & transisi antar-section | ✅ Selesai (kode) |
| F3 | Pinned storytelling (process timeline) | ⬜ Todo |
| F4 | Services bento grid | ⬜ Todo |
| F5 | 3D/WebGL (tablet ke atas) | ⬜ Todo |
| F6 | Polish & QA | ⬜ Todo |

---

## 10. Catatan Operasional

- **Urutan eksekusi disarankan:** F0 → F1 → F2 → F3 → F4 → F5 → F6.
  Bisa berhenti di fase mana pun; tiap fase = 1 commit.
- **Sebelum F5:** konfirmasi ulang (dependensi 3D berat; pastikan hasil F1–F4 sudah memuaskan).
- **Gate wajib tiap fase:** `tsc` + eslint (file terkait) + `npm run test:unit` + `npm run build`.
- **Uji manual tiap fase:** desktop, tablet, mobile, dan mode `prefers-reduced-motion`.
- **Dokumentasi:** perbarui dokumen ini (kolom Status) + `TASK-SELANJUTNYA.md` saat fase mulai/selesai.
- **Referensi konvensi dokumen:** lihat [`docs/README.md`](README.md).
 