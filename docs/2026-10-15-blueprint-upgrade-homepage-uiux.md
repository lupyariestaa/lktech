# Blueprint — Upgrade UI/UX Halaman Beranda (Storytelling Scroll + Premium Minimalis)

> **Status:** ✅ Selesai (F0–F8 + F6 — kode, QA, & dokumentasi)
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
| — | Intro loader | `components/intro-loader.tsx` | Client | Panel ganda + progress, ~2,1 dtk, kunci scroll. Selalu tampil tiap kunjungan beranda. *(F5: bug reduced-motion diperbaiki)* |
| — | Navbar | `sections/navbar.tsx` | Client | Sticky, dropdown desktop + akordeon mobile. Sudah rapi. |
| 1 | Hero | `sections/hero.tsx` + `sections/hero-3d.tsx` | Client | Beranda: parallax + animated headline + trust bar + cursor glow ✅ (F1); **scene 3D/WebGL lazy** di tablet+ ✅ (F5), kini **terpusat di kolom visual kanan** (F7). Mobile: hero murni teks. |
| 1b | Pratinjau | `sections/showcase.tsx` | Client | **Baru (F7):** mockup browser (carousel, gambar `browser` saja) — dipindah dari hero. Tepat setelah hero. |
| 2 | Services | `sections/services.tsx` (grid, `/tentang`) + `sections/services-bento.tsx` (bento, beranda) | Client | Beranda: **bento** ✅ (F4) — banner unggulan + 4 kartu, spotlight kursor. `/tentang` tetap grid 3 kolom. |
| 3 | Technologies | `sections/technologies.tsx` | Client | **F8:** strip "Teknologi yang kami gunakan" dipindah ke **antara Layanan & Portofolio** (dulu tepat setelah Pratinjau); marquee kini **dua baris** — atas ke kiri (`animate-marquee`), bawah ke kanan (urutan dibalik, `animate-marquee-reverse`), satu mask kiri/kanan untuk keduanya; pause saat hover. **F6.2:** tombol **Jeda/Mainkan** (WCAG 2.2.2), disembunyikan saat reduced-motion. |
| 4 | Portfolio Teaser | `sections/portfolio-teaser.tsx` | Server | Grid 3 kolom, ambil `getProjects()`. |
| 5 | Why Us | `sections/why-us.tsx` | Client | Grid 3 kolom + stagger. Pola berulang. |
| 6 | Process | `sections/process.tsx` (grid, `/tentang`) + `sections/process-timeline.tsx` (pinned, beranda) | Client | Beranda: **timeline scroll-driven pinned** ✅ (F3). `/tentang` tetap grid 4 kolom + pulse. |
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
- **Process (beranda)** ✅: diubah jadi **timeline scroll-driven** — section di-pin (CSS `position:
  sticky` native, tanpa scroll-hijack) selama ~3 layar; garis rel terisi mengikuti scroll, simpul
  langkah menyala bergantian, dan kartu detail langkah aktif bertukar halus (`cross-fade`).
  - Komponen **baru** `src/components/sections/process-timeline.tsx` dipakai **hanya di beranda**.
    `src/components/sections/process.tsx` (grid) **tidak diubah** karena juga dipakai `/tentang` —
    halaman itu tetap tampil seperti semula (diverifikasi: `static`, 4 langkah).
  - **Konten utuh**: seluruh langkah (step/title/description) tetap dirender di DOM. Di mobile &
    `prefers-reduced-motion` **semua kartu tampil** tersusun normal (tanpa pin); di desktop hanya
    kartu aktif yang tampak, sisanya tetap ada di DOM (SEO & a11y) via `cross-fade`.
  - **`PinnedSection` diperbaiki (CSS-driven)** — lihat catatan di bawah.
- **Satu section "pin" tambahan** ⏭️ **ditunda/ditiadakan (keputusan F3):** satu pin yang dieksekusi
  baik lebih efektif daripada dua. Menambah pin kedua menambah panjang scroll beranda secara
  signifikan (beranda sudah panjang) dan berisiko terasa "lengket berlebihan". Opsi tetap terbuka
  bila setelah review diinginkan.
- Semua konten lama **dipertahankan** (hanya penyajian berubah).

> **Catatan F3 — `PinnedSection` kini CSS-driven (bukan JS-gated):**
> Versi awal F0 menggerakkan pinning via JS (`useReducedMotionPreference` + `useMediaQuery`). Itu
> menyebabkan **CLS** (server merender grid pendek → setelah mount melompat ke section 300vh) dan
> berpotensi hydration mismatch. Versi F3 menggantinya dengan kelas **`motion-safe:md:*`** (yakni
> `@media (prefers-reduced-motion: no-preference)` + `md:`): tinggi section `motion-safe:md:h-[var(--pin-h)]`
> dan panel `motion-safe:md:sticky … h-screen`. Hasilnya: markup server = klien (tanpa mismatch),
> tanpa lompatan layout, pengguna reduced-motion otomatis dapat alur statis, dan tata letak tetap
> benar walau JS mati. Diverifikasi via Playwright: desktop pin aktif (h=3600px, `sticky`, panel
> menempel di `top≈0`), garis rel terisi monoton 0→1, 4 langkah menyala bergantian; mobile &
> reduced-motion `static` dengan semua kartu `opacity: 1`.

### F4 — Services: Bento Grid — effort M
- **Services (beranda)** ✅: grid 3 kolom seragam → **bento**: kartu **unggulan jadi banner lebar**
  (baris 1) berisi ikon + judul/tagline/deskripsi + **poin singkat** (`landingPoints`) dalam chip
  bercentang; **4 layanan lain sebaris** di bawahnya (baris 2, `lg:col-span-3`). Hierarki jelas,
  tanpa ruang kosong.
  - Komponen **baru** `src/components/sections/services-bento.tsx` dipakai **hanya di beranda**.
    `src/components/sections/services.tsx` (grid 3 kolom) **tidak diubah** karena juga dipakai
    `/tentang` (diverifikasi: tetap 3 kolom, 5 kartu).
  - **Hover lebih kaya**: **spotlight mengikuti kursor** (radial-gradient via CSS var `--mx/--my`,
    ditulis langsung ke elemen → **tanpa state React / re-render**) + glow aksen sudut + ikon
    membesar + judul berubah warna. Kartu tetap `<a>` (fokus keyboard & Enter berfungsi).
  - **Konten tidak dipangkas**: tiap layanan tetap menampilkan ikon, judul, tagline, deskripsi,
    tautan "Lihat detail"; kartu unggulan menambah poin singkat yang sudah ada di data.
  - Mobile: 1 kolom (banner unggulan di atas, 4 kartu di bawah); tablet: 2 kolom.

### F5 — 3D/WebGL (tablet ke atas) — effort L
- **Dependensi** ✅: `three` + `@react-three/fiber` (+ `@types/three` dev). **Tanpa `drei`** agar tetap
  ramping — shader & geometri (`sphere`, `torus`, `Points`) ditulis sendiri.
- **Scene** ✅ (`src/components/sections/hero-3d.tsx`): **"digital core"** — bola dengan **custom GLSL
  shader**: permukaan bergelombang (simplex-noise *displacement* di vertex shader) + gradasi warna &
  **fresnel rim** di fragment shader; ditambah **halo ~900 partikel** (`Points`, additive) dan **dua
  cincin** tipis yang mengorbit. Tanpa `drei`/postprocessing — shader ditulis sendiri.
- **Lazy + client-only** ✅: di-`dynamic import` dengan `ssr: false` dari `hero.tsx`. Terverifikasi
  `three` berada di **chunk terpisah** dan **tidak** direferensikan di HTML awal → bundel awal/SSR
  tidak bertambah.
- **Gate** ✅: hanya `≥768px` (`MEDIA_QUERIES.tabletUp`) **dan** bukan `prefers-reduced-motion`.
  Mobile/reduced-motion tetap memakai **mockup CSS** (fallback yang sudah ada). Plus **guard WebGL**:
  bila `getContext("webgl")` gagal → `<Canvas>` tidak dirender sama sekali.
- **Hemat GPU** ✅: `dpr=[1,1.5]`; `frameloop: "never"` saat hero keluar viewport
  (IntersectionObserver) — diverifikasi frame naik setelah hero di-scroll keluar.
- **Tidak menghalangi** ✅: lapisan `aria-hidden` + `pointer-events: none` (termasuk `<canvas>`),
  konten hero di `z-10`. Diverifikasi CTA tetap "clickable" di semua skenario.
- **Adaptif** ✅: posisi/skala menyesuaikan orientasi — desktop (hero 2 kolom) objek di sudut
  kanan-atas; tablet portrait (hero 1 kolom) dikecilkan & digeser agar tidak menimpa teks.

> **Catatan F5 — bug pre-existing ditemukan & diperbaiki (reduced-motion):**
> `IntroLoader` menginisialisasi `phase` dari `useState(reduced ? "done" : "enter")`. Karena
> `useReducedMotionPreference()` bernilai `false` pada SSR/first render (baru benar setelah mount),
> pengguna `prefers-reduced-motion` **tidak pernah** membuat loader selesai: overlay
> `fixed inset-0 z-[10000]` tetap ada → **memblokir semua klik & mengunci scroll** (`body
> overflow: hidden`) di beranda. Diperbaiki dengan menurunkan **fase efektif** (`reduced ? "done" :
> phase`) — bukan `setState` di dalam effect (mematuhi aturan `react-hooks`). Diverifikasi: loader
> hilang, CTA bisa diklik, scroll bebas.

> **Catatan F5 — keputusan mobile:** scene 3D hanya di tablet ke atas. Mobile tetap mockup CSS
> (sesuai permintaan awal: "efek berat hanya ≥768px; mobile nyusul bila hasil bagus"). Bila nanti
> diinginkan, gate tinggal diperluas.
>
> **Catatan F7 (revisi):** sejak hero kolom kanan diisi inti digital, mockup **dipindah** ke section
> `Pratinjau` (lihat F7). Mobile kini **hero murni teks** (tanpa mockup apa pun); visual pindah ke
> section Pratinjau di bawahnya.

### F7.1 — Hero 3D "hidup & interaktif" (upgrade atas F5/F7) — effort L
- **Permintaan pemilik:** elemen 3D kolom kanan dibuat lebih menarik & interaktif — "lebih hidup".
- **Interaksi pointer** ✅: inti **miring** & kamera **parallax** mengikuti kursor; kursor jadi
  **"lampu"** yang menerangi partikel terdekat (`uPointer` di shader halo). Di-update via motion value
  → **tanpa re-render React**. Hanya didengar saat scene aktif.
- **Reaksi scroll** ✅: saat hero di-scroll, inti **mengecil, menjauh (z), & memutar lebih cepat**;
  halo memuai & memudar (`uScroll`). Panggung juga memudar halus (`opacity` 1→0.65).
- **Drag-to-spin** ✅: tahan & seret (mouse) untuk memutar inti, lalu **inersia**. Kursor `grab`/
  `grabbing`; sentuh tetap bebas scroll (drag hanya `pointerType === "mouse"`).
- **Entrance** ✅: inti tumbuh dari ~0, rim "menyala" lalu stabil, partikel **mengumpul dari luar**,
  cincin & satelit memekar (~1,3 dtk).
- **Kekayaan visual** ✅: **konstelasi** garis antar partikel terdekat (jejak "jaringan"),
  **2 satelit** orbit, **starfield** kedalaman; plus **bloom sinematik** nyata.
- **Dependensi baru** ✅: `@react-three/postprocessing` + `postprocessing` (peer react 19 / fiber 9.7
  / three ≥0.156 terpenuhi). Di-`dynamic import` bersama scene → tetap chunk lazy terpisah.
- **Guardrail tetap** ✅: tablet+; `prefers-reduced-motion` → **canvas tidak dirender** (fallback CSS
  `CoreFallback`); `frameloop: "never"` saat hero keluar viewport; `aria-hidden`; konten hero `z-10`.
- **Diverifikasi (Playwright):** desktop bloom+konstelasi+satelit render; tilt mengikuti kursor;
  drag memutar; scroll membuat inti menjauh; tablet skala lebih kecil; reduced-motion canvas = 0;
  tanpa error konsol. Gate tsc/eslint/unit(593)/build(161) hijau.

### F7 — Hero fokus + section Pratinjau (revisi atas F5) — effort M
- **Permintaan pemilik:** elemen 3D menjadi pengganti mockup di kolom kanan hero; konten mockup
  (2 gambar yang saling berganti) dipindah ke bawah section header.
- **Hero** ✅: kolom kanan hero kini **panggung visual** untuk `Hero3D` (canvas di-scope ke kolom,
  inti digital **terpusat & diskalakan** ke sisi viewport — bukan lagi aksen sudut). Chip melayang
  ("Garansi"/social proof + "Clean Code") **dihapus**. Kolom kanan **disembunyikan di mobile** →
  hero murni teks.
- **Fallback** ✅: `CoreFallback` CSS statis (tanpa animasi) tampil di panggung saat scene tak aktif
  (reduced-motion / WebGL gagal) → tidak ada panggung kosong.
- **Section `Pratinjau`** ✅ (`sections/showcase.tsx`, tepat setelah hero): mockup **browser** di-redesign
  lebih proper (kartu membulat, bar browser, glow lembut) memakai carousel yang sama
  (`HeroShowcaseCarousel`) — **hanya gambar `browser`**; gambar `mobile` (mockup ponsel) **belum dipakai**.
  Judul+deskripsi memakai `SectionHeading` (eyebrow "Pratinjau").
- **Plumbing** ✅: prop `socialProof` pada `Hero` + `getSocialProof()` di `page.tsx` dihapus (tak lagi
  terpakai). `Showcase` membaca `hero` dari `useContent()` (data & pengaturan carousel yang sama — tanpa
  data baru). `SocialProof` tetap dipakai halaman produk.
- **Diverifikasi:** desktop 1440 (3D kanan, showcase tepat di bawah hero), tablet 834 (3D di bawah teks
  1 kolom), mobile 390 (hero teks saja — canvas 0, sesuai gate). tsc/eslint/unit/build hijau.

### F7.2 — Hero 3D tidak lagi "terpotong" kotak — effort S
- **Masalah (laporan pemilik):** elemen 3D tampak **ter-cut garis lurus** mengikuti frame panggung
  (batas `<canvas>`). Sebabnya: (a) halo partikel disebar dengan bias **ke luar** sehingga
  silhouette terpadat jatuh persis di tepi frame; (b) cincin orbit radius 2.5 **lebih besar** dari
  separuh frame; (c) skala komposisi tidak dikaitkan ke ukuran frame.
- **Perbaikan (tanpa menyentuh `overflow-hidden`/layout):**
  - Komposisi **di-fit ke frame**: `COMPOSITION_HALF` (radius grup 2.6 == tepi frame) → inti
    (r 1.3) ≈ **50% tinggi frame** di layar mana pun, dan cincin/satelit selalu di dalam.
  - Halo di-**bias ke dalam** (radius 1.5–3.0) → tepi terluar menyebar halus, bukan padat.
  - **Soft-fade tepi 2 lapis**: fade radial per-partikel di shader halo (`smoothstep` pada NDC)
    **plus** `mask-image` radial pada wrapper canvas → sisa partikel/bloom memudar sebelum
    menyentuh batas kanvas.
- **Verifikasi:** uji piksel sepanjang tepi kanan & bawah → **tidak ada diskontinuitas**
  (kolom 89→91 di tepi: 233.0→232.9→232.9); desktop & tablet bersih; mobile/reduced-motion tetap
  canvas 0; tsc/eslint/unit(593)/build hijau.

### F7.3 — Hero kolom kiri: tipografi, entrance & mikro-interaksi — effort M
- **Permintaan pemilik:** sisi kiri (teks) hero dibuat lebih menarik — "lebih hidup".
- **A. Tipografi & ritme** ✅: kicker jadi **chip uppercase** (`tracking`, ikon gradient), judul
  dengan `tracking` lebih rapat + `leading` lebih ketat, paragraf `max-w-xl` dengan **penekanan
  bergaris** (`underline decoration-primary`) pada frasa kunci. **Teks/kalimat TIDAK diubah**
  (nol risiko SEO/konten) — pemilik memberi izin rombak, tapi dipilih tetap sama.
- **B. Entrance mask-reveal** ✅: judul muncul **dari balik topeng** (`overflow-hidden` +
  `translateY`), **transform-only** (ramah kompositor) dan tetap **satu `<h1>`** teks utuh untuk
  SEO/screen reader. Blok lain (kicker/paragraf/CTA/trust) memakai **satu induk `stagger`**
  (`staggerChildren` + `delayChildren` dari `introDelay`) menggantikan delay manual.
- **C. Mikro-interaksi** ✅: CTA utama dapat **magnetic** (spring, ±5px, desktop saja) + **shine
  sweep** saat hover (dekoratif, `aria-hidden`); CTA sekunder glow lembut; trust bar angka
  **count-up** sekali saat masuk viewport (tulis langsung ke DOM via `animate()` → **tanpa
  re-render**) + ikon scale halus saat hover.
- **D. Spotlight** ✅: `CursorGlow` (cahaya mengikuti kursor di belakang teks) dipertahankan.
  Garis editorial vertikal sempat dicoba lalu **dibuang** — terbaca sebagai artefak, bukan detail.
- **E. Scroll berlapis** ✅: tiap blok turun dengan **laju berbeda** (`yKicker/-18 · yHead/-38 ·
  yPara/-26 · yCta/-14 · yTrust/-6`) → teks terasa "mengurai" saat hero ditinggalkan; kolom tetap
  memudar utuh (`opacityText`).
- **Verifikasi:** `h1` & paragraf terbaca utuh (SEO), trust akhir `"20+ klien mempercayai kami"`;
  magnetic terukur (`none` di tengah → `-4.71px` / `+4.77px` di tepi); desktop/tablet/mobile/
  reduced-motion & scroll bersih; nol error konsol; tsc/eslint/unit(593)/build(161) hijau.

### F7.4 — Judul & sub-judul hero berputar (animasi ketik) — effort M
- **Permintaan pemilik:** judul "Teknologi Modern, Hasil Nyata" jadi **3 judul berbeda** yang
  bergantian dengan **animasi ketikan**; sub-judul juga ikut berganti (3 varian).
- **Mesin tik** ✅: `useTypewriter` (tanpa depan baru) — **ketik per karakter → sub fade-in →
  jeda 3 dtk → hapus → varian berikutnya**, berputar terus. Tempo: 55 ms/ketik, 24 ms/hapus
  (3 karakter), jeda antar varian 260 ms.
- **Isolasi render** ✅: state tik hidup di komponen kecil `HeroTyped` → `Hero` dan scene 3D
  **tidak** re-render tiap karakter (~18 update/detik).
- **Anti-CLS** ✅: kotak judul & sub pakai `grid` + salinan **tak terlihat** semua varian
  (`invisible col-start-1 row-start-1`) → tinggi dikunci varian tertinggi; mengetik/menghapus
  tidak menggeser CTA & trust bar. Terukur: `ctaY` **563.3 → 563.3** sepanjang siklus (desktop
  & mobile).
- **SSR/SEO/LCP** ✅: render pertama = varian `#1` **utuh** (bukan kosong) — HTML statis berisi
  naskah lengkap; animasi baru jalan setelah mount (`startMs = introDelay`, jadi varian `#1`
  tidak terhapus di balik intro loader).
- **A11y** ✅: salinan varian `aria-hidden` + `visibility:hidden` (di luar accessibility tree);
  `prefers-reduced-motion` → statis di varian `#1`, tanpa kursor ketik. Kursor ketik berkedip
  = keyframe `caret` di `globals.css` (murni dekoratif, `aria-hidden`).
- **Catatan:** penekanan ber-garis + bold pada paragraf lama dilepas — paragraf kini teks polos
  karena isinya berganti-ganti (styling per-varian bisa ditambah bila diminta).
- **Verifikasi:** 3 varian tampil berurutan (desktop 1440 & mobile 390), sub terlihat ±3 dtk
  tiap siklus, `ctaY` konstan (nol CLS), tanpa overflow-x di mobile, reduced-motion statis,
  nol error konsol; tsc/eslint/unit(593)/build hijau.

### F7.5 — Section Pratinjau: band gambar melengkung (loop ala silinder) — effort M
- **Permintaan pemilik:** gambar di section "Pratinjau" (sebelumnya carousel satu kartu)
  diganti **band melengkung yang mengalir terus** — referensi kode `TiltedGridHero` dipakai
  gayanya, disesuaikan ke tech kita.
- **Komponen baru** ✅ `src/components/sections/showcase-band.tsx`: satu baris gambar berjalan
  kanan→kiri mengelilingi **bagian dalam silinder**. Kotak CSS tak bisa dibengkokkan, jadi tiap
  tile dipotong **12 pita vertikal** (faset datar), masing-masing diputar beberapa derajat pada
  sumbu silinder; yang bergerak = tile-nya (`preserve-3d`, satu `rotateY`), sehingga pita tak
  mungkin terpisah atau menampilkan gambar berbeda. Delay negatif tiap tile menentukan posisinya
  di busur. Murni `transform` (compositor) + mask fade statis — **tanpa WebGL, tanpa dependensi
  baru**.
- **Gambar bawaannya cuma berganti saat tile membungkus di luar layar** (handler
  `onAnimationIteration`), jadi resize/putaran tidak pernah menukar gambar yang sedang tampil.
  Semua gambar diunduh di awal (`new Image()`); tile pertama = placeholder `bg-slate-100`.
- **Adaptasi ke stack kita** ✅:
  - Tile = **gambar polos rounded** (pilihan pemilik), bukan mockup browser — kartu mockup lama
    tetap dipakai sebagai **keadaan kosong** bila belum ada gambar / fitur dimatikan.
  - **Teks section rata tengah** (`align="center"`): eyebrow, judul, dan deskripsi terpusat di atas\n    band full-bleed → komposisi simetris (revisi pemilik).\n  - **Full-bleed** (tepi ke tepi) — ujung band melengkung & memudar ke tepi layar; tinggi band
    eksplisit (`h-[280px] sm:h-[340px] lg:h-[400px]`) karena `container-type: size` mematikan
    sizing dari konten.
  - **Ukuran tile** `tileHeight` **52%** tinggi band (referensi 26%) + `aspectRatio` **1.6** =
    rasio asli tangkapan layar (1902×1198) sehingga `object-cover` praktis tak memotong isi;
    tile tengah ± 334×214 px di desktop dan ± 214×134 px di ponsel. Sudut tile **tipis 4px**
    (semula `rounded-2xl`).
  - **Optimasi gambar (temuan audit):** tile memakai PNG asli Cloudinary lewat `<img>` polos —
    artinya **6 MB** untuk 6 gambar (satu file 3,5 MB), karena `<img>` melewati optimizer Next.
    Kini URL Cloudinary disisipi `f_auto,q_auto,w_900` langsung di komponen (tanpa impor
    `cloudinary-client.ts`, yang akan menarik Firebase client ke bundel beranda) →
    **372 KB total, ~16× lebih kecil**, dan preload-nya ditunda lewat `IntersectionObserver`
    (`rootMargin` 800 px) + `loading="lazy"` agar tidak berebut di pemuatan awal (LCP).
  - **`SLICES` 12 → 8** & `CAMERA` **2.0 → 2.4**: simpangan faset masih < 1 px (tak terlihat),
    dan bbox tile ujung turun dari **1430×2302 px** menjadi **398×448 px** (tablet 768) — raster
    lebih ringan & gambar lebih tajam (tidak diperbesar terus).
  - `CAMERA` **2.0** (referensi 1.6): dengan 1.6 tile di ujung membengkak 5–16× (raster
    compositor membuangnya → tile tampak abu-abu, terbukti lewat sampling piksel). 2.0 membuat
    busur tetap terasa tapi pembengkakannya ~2.5× → aman untuk perangkat lemah.
  - Ukuran pita 12 (referensi 16) demi jumlah layer compositor yang lebih ringan.
- **`prefers-reduced-motion`** ✅: tiap tile **ditempatkan statis** pada busurnya (`transform:
  turn(-sweep + t*pitch)` + `visibility` mengikuti `limit`) = satu frame band yang beku, tetap
  melengkung & utuh. Tidak bisa memakai pola referensi (`animation-play-state: paused`): aturan
  global kita mematikan **semua** animasi pada mode itu (`animation-duration: 0.001ms`), sehingga
  band "dijeda" justru berakhir menumpuk di tengah sebagai `transform: none`.
- **A11y/SEO** ✅: band `aria-hidden` (gambar dekoratif yang terus bergerak), tapi `alt` tetap
  ditulis pada pita pertama tiap tile; judul/deskripsi section tetap sumber makna. Band baru
  mulai terlihat setelah `ResizeObserver` mengukur, jadi paint pertama berukuran salah tak
  pernah tampil.
- **Verifikasi (audit 5 viewport + reduced-motion):** 390 / 768 / 1440 / 1920 px — band
  full-bleed sesuai viewport (`1440×400`, `768×340`, `390×280`, `1920×400`), **overflow-x 0 px**,
  **CLS 0–0.0007** (ambang "baik" 0,1), semua tile terlihat **ter-paint gambarnya** (sampling
  piksel `slate≈0%`), dan nol error konsol (kecuali 404 `_vercel/insights` di server lokal).
  `prefers-reduced-motion`: band beku & utuh di busurnya.
  Long-task headless sempat terlihat besar, tapi setelah ditelusuri sumbernya **WebGL hero**
  (software raster), bukan band — terbukti long-task tetap ada saat band di-scroll jauh dari
  viewport, dan nol di mobile 390 (tak ada scene 3D). tsc/eslint/unit(593)/build hijau.

### F7.6 — Hero 3D: gerbang intro + audit pemuatan & optimasi — effort M
- **Permintaan pemilik:** elemen 3D di header **jangan ikut dimuat/muncul sebelum intro loader
  beres** ("kayak ada sedikit glitch"), sekaligus minta audit + QA + optimasi menyeluruh.
- **Akar masalah (terukur lewat instrumentasi Playwright, bukan dugaan):**
  - **Panggung kosong ±6 detik.** HTML awal dari server merender `CoreFallback` (media query di
    server = false) → saat **hidrasi** `sceneEnabled` berbalik jadi true → fallback
    **di-unmount**, sementara `<canvas>` WebGL baru muncul setelah chunk `three` selesai diunduh
    + shader dikompilasi (draw pertama **8.310 ms** di lingkungan uji). Antara 2,1 s–7 s itu
    panggung benar-benar kosong (terlihat jelas di frame screencast 7.004 ms).
  - **Init 3D berebut dengan animasi intro.** Unduh + eval chunk (265 KB), pembuatan konteks
    WebGL, kompilasi shader, dan alokasi render target bloom terjadi **di dalam jendela intro**
    (long task 431 ms terukur di 2,2 s) → animasi pembuka patah-patah = glitch yang dirasakan.
  - **Konteks WebGL dibuat 3×** — kanvas probe `getContext()` tidak pernah dilepas (memori GPU
    hidup terus sepanjang umur halaman).
  - `antialias: true` di kanvas **sia-sia**: scene dirender ke FBO `EffectComposer` yang sudah
    punya MSAA sendiri (`multisampling`), jadi MSAA kanvas hanya menambah memori + satu resolve
    pass tanpa menambah kehalusan.
  - **Entrance scene tak pernah terlihat**: skala 0,25 → 1 selesai jauh sebelum loader membuka,
    dan ukurannya "melompat" dibanding fallback yang baru memudar.
- **Perbaikan** ✅:
  - **Gerbang intro** baru `src/components/intro-gate.tsx` (`IntroGate`, `useIntroDone`,
    `useIntroFinisher`). State-nya **per-mount halaman** — navigasi ulang ke beranda memainkan
    intro lagi dan scene 3D ikut menunggu lagi, tanpa state basi dari kunjungan sebelumnya.
    `app/page.tsx` membungkus loader + seluruh halaman; `IntroLoader` memanggil `finish()` saat
    fase `done` (termasuk jalur reduced-motion yang langsung selesai).
  - `Hero`: `mountScene = sceneEnabled && introDone` → **nol kerja 3D** (unduh chunk, konteks,
    shader) sebelum intro selesai; listener pointer juga baru dipasang saat scene hidup.
  - **Fallback CSS tidak pernah dibuang lagi**: tampil terus sampai scene melaporkan frame
    pertamanya (`onReady` dari `FirstFrame` + `useFrame`), lalu **cross-fade 700 ms** (canvas
    memudar masuk, fallback memudar keluar) dan fallback baru di-unmount 900 ms setelahnya →
    tidak ada momen panggung kosong, dan tak ada dua inti tampil bersamaan.
  - `probeWebgl()` melepas konteks probe lewat `WEBGL_lose_context` → konteks WebGL hidup **3 → 2**.
  - `antialias: false`; bola inti **96² → 64²** (vertex shader-nya yang paling berat: 2× simplex
    noise per vertex → beban vertex turun ~55%, silhouette tetap halus karena normal dihitung
    analitis, bukan dari faset); entrance diperhalus (skala awal grup 0,62; cincin & konstelasi
    0,8) supaya tidak "melompat" terhadap fallback.
- **Verifikasi** ✅ (instrumentasi: timestamp `getContext`, draw pertama, long task, rAF stall +
  screencast CDP, 1440×900 dan 390×844, server produksi):
  - **Sebelum:** konteks WebGL 3× (7.909/7.947/8.104 ms), draw pertama 8.310 ms, fallback hilang
    saat hidrasi (frame 7.004 ms = panggung kosong), long task 431 ms di dalam intro + 1.591 ms
    pada frame pertama.
  - **Sesudah:** **nol kejadian GL sebelum intro selesai**; fallback terlihat di semua frame
    1,5–10,9 s; konteks WebGL **2×**; draw pertama 6.256 ms; `canvas opacity 1` (fade-in selesai)
    dan fallback ter-unmount.
  - Mobile 390: tanpa canvas, stage `display: none`, overflow-x 0. Reduced-motion 1440: tanpa
    konteks GL sama sekali, fallback statis opasitas 1. Soft-nav beranda → halaman lain →
    beranda: selama intro diputar ulang **0 konteks GL**, 3D menyala setelah intro selesai.
  - Chunk `three` tetap terpisah (**1.001 KB** mentah / 265 KB terkirim) dan **tidak ada** di 19
    `<script>` HTML awal → bundel awal tidak berubah. tsc/eslint/unit/build hijau.

### F7.7 — Hero 3D: "frame beku" sampai cross-fade tuntas — effort S
- **Keluhan pemilik (verbatim):** *"loh kok masih bug kayak ada 2 element 3D yang berbeda gitu pas
  awal refres dan pas udah beres loading, kok agak sulit menjelaskannya"* (+2 tangkapan layar:
  bola fallback halus di jendela pemuatan vs bola 3D yang sudah "hidup" setelah loading).
- **Investigasi (terukur: screencast CDP + profil radial, bukan dugaan):**
  - Fallback CSS memang sudah disalin dari kondisi frame-0 (`uIntro = 0`), tapi **frame pertama yang
    benar-benar tampil di kanvas bukan frame-0**: render pertama scene (kompilasi shader + alokasi
    render target bloom) memblokir main thread **±4 detik** di lingkungan uji. R3F memakai
    `clock.getDelta()` tiap tick (`update()` @react-three/fiber), jadi begitu render pertama selesai
    `elapsedTime` sudah ±4 s → frame yang dipresentasikan sudah `uIntro ≈ 1` = bola bergelombang +
    partikel + satelit. Fallback (halus) vs kanvas (hidup) = dua elemen berbeda.
  - Efek samping: `onReady` menyala di `useFrame` pertama, *sebelum* `gl.render` selesai.
- **Perbaikan** ✅:
  - **Frame beku (`FrozenFrame` di `hero-3d.tsx`)**: selama `play` belum menyala, kanvas memakai
    `frameloop="never"` dan digambar manual satu frame per rAF dengan `advance(0)`. Di mode `never`
    R3F memaksa `delta = timestamp − elapsedTime` dan `elapsedTime = timestamp` (lihat `update()`
    @react-three/fiber) → `advance(0)` membuat semua `useFrame` membaca **`t = 0` dan `delta = 0`**:
    persis kondisi frame-0 yang disalin fallback (tanpa gelombang, mottling, partikel, satelit,
    rotasi, atau inersia) — berapa pun lamanya render pertama.
  - `hero.tsx` mengirim `play={!fallbackOn}` (cross-fade tuntas, ±0,9 s setelah frame pertama).
    Saat itu `frameloop` berubah ke `"always"` → R3F me-reset jam (`stop()` → `elapsedTime = 0` →
    `start()`) → timeline entrance mulai dari nol **tepat di momen handoff**, bukan sejak frame
    pertama yang tak sesiapa lihat.
  - Delay `lateAt` dipendekkan (inti 0,7→0,25 s; halo 0,55→0,15; cincin/konstelasi 0,5→0,15;
    satelit 0,9→0,4) karena jendela cross-fade kini dijaga pembekuan, bukan oleh delay.
  - **Fallback disetel ulang terhadap frame beku** (bukan terhadap kondisi stabil):
    - `CORE_GRADIENT` diukur ulang per radius dari frame beku `uIntro = 0` (tiap stop = rata-rata
      piksel render 3D di radius itu). Rim fresnel di kondisi itu di-boost (`1 − uIntro`) sehingga
      tepi bola jauh lebih putih — di ukur sebelumnya (kondisi stabil) tepi fallback 40–55 level
      lebih gelap dari kanvas.
    - Cincin kini **proyeksi eksak** torus (perspektif kamera z=6, fov 45): ring1
      60,7 × 10,0cqmin @ −3°, ring2 69,0 × 4,0cqmin @ −29,9° (sebelumnya 58,5 × 11,9 @ 0° dan
      66,2 × 4,8 @ −29°; perkiraan "pipih dari normal torus" melewatkan koreksi perspektif).
- **Verifikasi** ✅ (screencast CDP, software-WebGL, 1440×900; referensi = frame terakhir sebelum
  kanvas tampil, diff di-crop ke kotak panggung):
  - **Fase beku:** diff vs fallback **1,83 mean / 0,28 % piksel > 24** dan **konstan** ±1 s (bukti
    jam benar-benar beku) — sebelumnya 4,05–6,9 dengan 4–14 % piksel > 24 karena bola sudah hidup.
    Profil radial: glow luar (r ≥ 264 px) **identik 0,0,0**; tepi bola 2,65 mean; band cincin
    **17,75 → 3,54 mean** dan **33,9 % → 0,97 % piksel > 24**.
  - **Setelah `play`:** diff naik **bertahap** 1,88 → 2,22 → 3,02 → 3,77 → 4,56 → … → 6,6
    (entrance ±2,5 s) — tidak ada lompatan: scene "bangun", bukan "berganti".
  - Komposit bukti: fallback ≡ frame tengah cross-fade (bola yang sama), baru frame terakhir hidup.
  - tsc/eslint/unit(593)/build hijau.

### F7.8 — Hero 3D: panggung kosong dulu, lalu muncul dengan animasi — effort S
- **Keluhan pemilik (verbatim):** *"wait ini masih gini, bisa ngga si element 3D di header itu sebelum
  loading page beres displaynya kayak nonde dulu gitu nah kalo loading sudah beres nanti element 3D
  mucul dengan animasi ngga instan banget"* (+1 tangkapan layar: bola sudah ada di panggung saat
  halaman masih menjalankan animasi masuknya).
- **Masalah:** F7.6/F7.7 justru menaruh bola CSS (fallback) **sejak awal** dan menyamarkannya dengan
  cross-fade. Hasilnya bola terasa "sudah ada" — pergantian ke 3D tak pernah terbaca sebagai
  *kemunculan*, sekalipun tak terasa jahitnya.
- **Perbaikan** ✅:
  - **Panggung dibiarkan kosong** selama menunggu: fallback tidak lagi dirender sebagai tampilan
    awal (`fallbackOn` mulai `false`). Fallback turun pangkat jadi **jaring pengaman**, hanya tampil
    bila scene tak akan/tak boleh hidup: reduced-motion, WebGL tak tersedia, atau kanvas tak melapor
    siap dalam **4 s** (`SAFETY_FALLBACK_MS`) — supaya panggung tidak kosong selamanya.
  - **Semua kemunculan fallback lewat fade** (prop `hidden` di `CoreFallback`, satu frame jeda
    sebelum kelas opacity-nya berubah) — tidak pernah "pop".
  - **Kemunculan 3D dianimasikan**: wrapper kanvas di `hero-3d.tsx` sekarang
    `transition-[opacity,scale] duration-[900ms] ease-out` dari `scale-[0.94] opacity-0` → `scale-100
    opacity-100`. Catatan: Tailwind v4 memakai properti `scale` (bukan `transform`), jadi
    `transition-transform`/`transition-[opacity,transform]` **tidak** menangkapnya.
  - **`play` digeser** dari `!fallbackOn` (setelah cross-fade tuntas) ke `sceneReady` — jadi jam R3F
    di-reset dan entrance mulai dari nol **di momen yang sama** dengan fade-in-nya: yang terlihat
    bukan "pergantian elemen", melainkan 3D yang datang sambil bangun (bola mulus → bergelombang,
    partikel mengumpul, cincin & satelit memuai).
- **Verifikasi** ✅ (Playwright + CDP, software-WebGL, 1440×900; produksi `next start -p 3987`):
  - **Panggung kosong:** setelah intro, stage `children=0` (fallback dilepas) sampai kanvas mount;
    kanvas mount dengan `opacity 0,000` / `scale 0,94` (belum tergambar) — jadi panggung memang
    kosong ±5,4 s di lingkungan uji (di GPU nyata: ±0,2–1 s). Piksel: plato rata stage
    **253,5–255 dengan diff ≤ 0,25** (tidak ada apa pun di panggung).
  - **Kemunculan beranimasi:** `opacity` 0 → 0,33/0,59 → 0,71/0,84 → 0,91/0,96 → 0,99 → 1,000 dengan
    `scale` 0,94 → 0,960/0,975 → 0,982/0,990 → 0,994/0,998 → 1,000 (≥ 5 keadaan antara, ±0,75 s) —
    bukan lompatan satu frame. Piksel: rata-rata panggung turun bertahap 254,5 → 252,5 → 250,2 →
    247,6 dengan diff per frame 0,5–2,7 (fade halus).
  - **Scene benar-benar hidup setelah tampil:** diff antar `captureScreenshot` 1,6 s terpisah =
    **7,28** dan **5,01** (bola bergelombang + partikel bergerak) — sekaligus bukti `play` menyala
    (kalau beku, diff-nya 0). Catatan QA: **screencast CDP bisa basi** untuk isi kanvas di mode
    software (diff 0,00 palsu) — verifikasi isi kanvas harus pakai `captureScreenshot`.
  - **Jaring pengaman tidak menyala** di jalur normal (`fb=none` sepanjang run) walau render pertama
    makan ±2,7 s di lingkungan uji. **Jalur reduced-motion:** fallback satu-satunya visual (tanpa
    kanvas sama sekali), fade-in 0 → 1, tampilan bola + cincin sesuai kalibrasi F7.7 (dicek visual).
  - tsc/eslint/unit(593)/build hijau.

### F8 — Teknologi: pindah posisi + marquee dua baris — effort S
- **Permintaan pemilik (verbatim):** *"okeey nice, next section Teknologi yang kami gunakan, nah aku pengen
  section tersebut jangan di bawah section Pratinjau, tapi aku pengen section tersebut di bawah section
  Layanan Kami diatas section Portofolio. nah terus ada perubahan sedikit section Teknologi yang kami
  gunakan perubahannya: Kan sekarang mah cuman satu baris yaa logo yang berjajar dan berjalan ke samping
  kiri, nah ku pengen sekarang mah ada dua baris jadi yang satu majunya ke kiri yang satunya ke kanan jadi
  ada dua baris kebawah."*
- **Perubahan** ✅:
  - **Urutan beranda:** `Hero → Pratinjau → Layanan → **Teknologi** → Portofolio → …` (sebelumnya strip
    Teknologi tepat setelah Pratinjau). Tidak ada section/teks yang dihapus — hanya urutan.
  - **Marquee dua baris** di `technologies.tsx` (komponen lokal `MarqueeRow`):
    - baris 1 — konten urutan asli, `animate-marquee` (30 s, ke **kiri**);
    - baris 2 — urutan **dibalik**, `animate-marquee-reverse` (36 s, ke **kanan**). Arah kanan dicapai
      dengan `animation-direction: reverse` pada keyframes `marquee` yang sama: mulai dari −50 % menuju
      0 %, jadi loop tetap mulus karena konten digandakan.
    - Satu mask gradien kiri/kanan membungkus kedua baris; jarak antar-baris 12 px.
    - **A11y:** baris kedua `aria-hidden` (hanya gema visual) + salinan duplikat tiap baris juga
      `aria-hidden` — screen reader tetap membaca daftar teknologi **sekali**.
    - **Token baru** `--animate-marquee-reverse` di `globals.css`; `--animate-marquee` (30 s) tidak
      berubah sehingga marquee di `/tentang` tetap seperti dulu.
    - Catatan kecil: class `group` pada track dihapus — dulu membuat **semua** kartu ikut ter-highlight
      saat kursor berada di mana pun atas marquee; kini highlight per kartu.
- **Verifikasi** ✅ (Playwright, produksi `next start -p 3987`, 1440×900 + 390×844):
  - **Urutan DOM:** `#layanan` (y 1713) → `#teknologi` (y 2841) → `#portofolio` (y 3127) di desktop;
    urutan sama di mobile.
  - **Dua baris:** 40 kartu/baris (20 logo × 2), tinggi section 286 px; baris 2 mulai dari logo terbalik
    ("Figma" vs "React").
  - **Arah benar-benar berlawanan:** `transform` tx baris 1 **−143,8 px/s** (kiri), baris 2
    **+119,8 px/s** (kanan) pada desktop. `animation-name`/`duration`/`direction` terverifikasi
    (`marquee` 30 s normal vs `marquee` 36 s reverse).
  - **Tanpa overflow horizontal:** `scrollWidth = innerWidth` (1440 / 390) — dua baris tetap terkunci
    di dalam mask. Tangkapan layar desktop & mobile diperiksa (dua pita, tepi memudar, ritme rapi).
  - tsc/eslint/unit(593)/build hijau.

### F6 — Polish & QA — effort M
- **Temuan audit (P1–P3) & resolusi** ✅:
  - **P1 — cover produk terpotong:** cover asli 16:9 dipaksa ke bingkai 4:3 + `object-cover`, teks di dalam cover terpangkas ±25% lebarnya. **F6.1:** bingkai kartu jadi `aspect-[16/9]`; prop baru `imageSizes` (default `/produk` 2 kolom: `(max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw`; beranda & detail: `(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw`) agar `srcset` tidak mengunduh 100vw. Bila cover gagal dimuat (timeout optimizer/aset hilang), `onError` menampilkan placeholder ikon — bukan kartu kosong.
  - **P1 — kontras AA gagal:** nomor proses non-aktif `text-slate-400` (2,63:1) → `text-slate-500`; tautan footer di atas gradien (3,88:1) → `text-slate-600` (≈7,6:1). axe-core: **0 violation** desktop & mobile (sebelumnya 5 node kontras).
  - **P2 — target sentuh <24 px:** tautan footer 15–18 px → `inline-flex py-1` = **28 px**; tombol pause **31 px**.
  - **P2 — konten bergerak tanpa kontrol (WCAG 2.2.2):** marquee teknologi & band Pratinjau kini punya **tombol Jeda/Mainkan** (`MotionToggle`, `aria-label` dinamis); hover-pause per baris tetap ada; tombol disembunyikan saat `prefers-reduced-motion` (animasi memang statis).
  - **P2 — intro 2,13 dtk setiap load:** intro kini **sekali per sesi tab** (`sessionStorage` `lktech:intro-seen`). Reload/navigasi ulang ke beranda melewati loader; entrance hero & navbar tidak lagi memakai delay 2,13 dtk — animasi dimulai saat `introDone` (bukan `delayChildren` yang bisa "basi"), jadi tak ada layar kosong menunggu delay yang sudah tidak ada.
  - **P3 — `sizes` mismatch** (lihat P1) & **ritme heading:** dipertahankan sebagai pola yang disengaja — section ber-aksi kanan (Layanan, Portofolio, Produk) rata kiri; section naratif rata tengah. Tidak ada churn kode; keputusan didokumentasikan di sini.
- **F6.4 — QA & perf** ✅:
  - **Gate:** tsc 0 error, eslint 0 error, unit **593/593**, build **161 halaman**, E2E **22/22** (produksi `next start -p 3987`).
  - **axe-core** (WCAG 2.0/2.1/2.2 A+AA): **0 violation** desktop 1440×900 & mobile 390×844.
  - **Chromium QA:** pause marquee (2 baris) & band (5 tile) `running → paused → running`; tombol dapat dijangkau keyboard; tanpa overflow horizontal; cover 16:9 (rasio 1,778; natural 359×202); reload melewati intro (loader hilang ~2,3 dtk = batas hidrasi lokal, bukan +2,13 dtk); fallback cover terverifikasi (6/6 ikon saat request gambar di-abort).
  - **Firefox** (Playwright headless): desktop + mobile — tanpa overflow, pause berfungsi, cover 16:9, **0 page error**. **WebKit** belum terverifikasi (unduhan browser Playwright timeout di jaringan sesi ini).
  - **Lighthouse produksi (`lktech.vercel.app`, mobile throttle):** A11y **100**, Best Practices **100**, SEO **92**, CLS **0**. Performa **32** (LCP 19,1 dtk / TBT 13,4 dtk) di lingkungan uji **tanpa GPU** — didominasi script-evaluation hidrasi app + gtag. **F6.4:** GA4 ditunda ke `lazyOnload` (dari `afterInteractive`; ~3,9 dtk script-eval) untuk mengangkat LCP/TBT; ukur ulang setelah deploy. Optimasi bundle/hidrasi lanjutan (mis. menunda init Firebase Auth) dicatat sebagai kandidat fase berikutnya — bukan regresi F6.
  - Catatan: angka LCP/TBT lokal & Lighthouse tanpa GPU tidak representatif untuk perangkat pengguna; PSI API publik terkena **429** saat sesi ini, Lighthouse CLI dipakai sebagai gantinya.

---

## 7. Daftar File (rencana)

### Baru (usulan)
| File | Peran |
| --- | --- |
| `src/lib/use-media-query.ts` | Hook `useMediaQuery` (SSR-safe) untuk gate efek |
| `src/components/scroll-progress.tsx` | Bar progres scroll (beranda) |
| `src/components/pinned-section.tsx` | Wrapper sticky generik untuk storytelling |
| `src/components/section-seam.tsx` *(F2)* | Jahitan gradien di batas antar-section |
| `src/components/sections/hero-3d.tsx` *(F5)* | Scene 3D/WebGL hero, lazy + gated (tablet+, bukan reduced-motion); *(F7.1)* pointer/scroll/drag/entrance + konstelasi/satelit/starfield + bloom; *(F7.2)* komposisi di-fit ke frame + soft-fade tepi (shader + mask); *(F7.6)* probe WebGL melepas konteks (`WEBGL_lose_context`), cross-fade frame pertama (`FirstFrame` → `onReady`), `antialias:false`, bola inti 64², entrance diperhalus; *(F7.7)* `FrozenFrame` — frame beku via `advance(0)` selama `frameloop="never"` sampai `play`, lalu jam R3F di-reset → entrance mulai dari nol; *(F7.8)* wrapper kanvas = kemunculan beranimasi (`transition-[opacity,scale]` 0,9 s dari `scale-[0.94] opacity-0`) dan `play` menyala tepat saat itu (`sceneReady`) | ✅ Selesai |
| `src/components/sections/process-timeline.tsx` *(F3)* | Timeline scroll-driven beranda (pinned) — `process.tsx` tetap untuk `/tentang` | ✅ Selesai |
| `src/components/sections/services-bento.tsx` *(F4)* | Bento grid layanan (beranda) — `services.tsx` tetap untuk `/tentang` | ✅ Selesai |
| `src/components/sections/showcase.tsx` *(F7)* | Section "Pratinjau" (mockup browser) — dipindah dari hero; *(F7.5)* ganti carousel satu kartu → **band melengkung full-bleed** (`ShowcaseBand`), kartu mockup lama jadi keadaan kosong; *(F6.2)* state pause + tombol Jeda/Mainkan di bawah band | ✅ Selesai |
| `src/components/sections/showcase-band.tsx` *(F7.5)* | Band gambar melengkung ala silinder (12 pita/tile, loop murni CSS `transform`, statis saat reduced-motion); *(F6.2)* prop `paused` → `animationPlayState` per tile | ✅ Selesai |
| `src/components/motion-toggle.tsx` *(F6.2)* | Tombol **Jeda/Mainkan** bersama untuk konten bergerak otomatis (marquee teknologi & band Pratinjau) — WCAG 2.2.2; `aria-label` dinamis, ikon Pause/Play | ✅ Selesai |
| `src/components/intro-gate.tsx` *(F7.6)* | Gerbang intro beranda: `IntroGate` (provider per-mount halaman) + `useIntroDone` / `useIntroFinisher` — sumber tunggal "intro loader sudah selesai?" untuk scene 3D; *(F6.3)* `useIntroSkip` + cek `sessionStorage` di layout-effect → intro sekali per sesi tab | ✅ Selesai |
| `docs/2026-10-15-blueprint-upgrade-homepage-uiux.md` | **Dokumen ini** |

### Diubah (usulan)
| File | Perubahan |
| --- | --- |
| `src/app/globals.css` | *(F0: tidak diubah — lihat koreksi A1)*; token animasi/spacing menyusul bila perlu; *(F8)* token `--animate-marquee-reverse` (keyframes `marquee` diputar balik, 36 s) untuk baris kedua strip teknologi | ✅ Selesai |
| `src/app/page.tsx` | Pasang `ScrollProgress` (F0); *(F7)* sisip `Showcase` setelah hero, buang plumbing `socialProof`; *(F7.6)* bungkus seluruh halaman dengan `IntroGate`; *(F8)* pindahkan `Technologies` ke antara `ServicesBento` & `PortfolioTeaser` | ✅ Selesai |
| `src/components/sections/technologies.tsx` | *(F8)* Satu track marquee → **dua baris** (`MarqueeRow`): atas ke kiri (30 s, urutan asli), bawah ke kanan (36 s, urutan dibalik, `animate-marquee-reverse`); mask kiri/kanan tunggal, baris kedua `aria-hidden`, hover pause per baris; *(F6.2)* tombol Jeda/Mainkan di header + `animationPlayState` per baris | ✅ Selesai |
| `src/components/sections/hero.tsx` | *(F1)* Parallax, animated headline, trust bar, cursor glow | ✅ Selesai |
| `src/components/section-heading.tsx` | *(F2)* Varian alignment/ukuran + slot `action` | ✅ Selesai |
| `src/components/sections/process.tsx` | *(F3)* **Tidak diubah** — tetap grid, dipakai `/tentang` | ✅ (dibiarkan) |
| `src/components/sections/services.tsx` | *(F4)* **Tidak diubah** — tetap grid, dipakai `/tentang` | ✅ (dibiarkan) |
| `package.json` | *(F5)* Tambah `three`, `@react-three/fiber` (+ `@types/three` dev); *(F7.1)* `@react-three/postprocessing` + `postprocessing` | ✅ Selesai |
| `src/components/sections/hero.tsx` | *(F1)* Parallax, animated headline, trust bar, cursor glow; *(F5)* mount `Hero3D` lazy + `z-10` konten; *(F7)* kolom kanan → panggung 3D (terpusat) + `CoreFallback`, chip dihapus, mobile hero teks saja, prop `socialProof` dihapus; *(F7.3)* kolom kiri — kicker chip, judul **mask-reveal**, paragraf ber-penekanan, CTA magnetic+shine, trust **count-up**, parallax scroll berlapis; *(F7.4)* judul & sub **berputar 3 varian** (mesin tik + sub fade-in, anti-CLS `grid` reserve, `HeroTyped`); *(F7.6)* `mountScene` (gerbang intro) + `CoreFallback` yang tak pernah dibuang sebelum frame pertama 3D; *(F7.7)* kirim `play={!fallbackOn}`, samakan `CoreFallback` dengan **frame beku** (gradien dari profil render `uIntro=0`, cincin = proyeksi eksak torus); *(F7.8)* panggung **kosong** selama menunggu (`fallbackOn` mulai `false`), fallback turun jadi jaring pengaman (`SAFETY_FALLBACK_MS` 4 s, selalu fade-in lewat prop `hidden`), `play={sceneReady}`; *(F6.3)* entrance teks dijalankan saat `introDone` (tanpa `delayChildren` 2,13 dtk) + `HeroTyped` mulai langsung saat intro dilewati | ✅ Selesai |
| `src/components/intro-loader.tsx` | *(F5)* Perbaiki bug reduced-motion (loader tak pernah unmount → blokir klik & kunci scroll); *(F7.6)* lapor `finish()` ke `IntroGate` saat fase `done`; *(F6.3)* lewati seluruh timeline saat sesi sudah melihat intro + tandai `sessionStorage` di akhir intro pertama | ✅ Selesai |
| `src/components/product-card.tsx` | *(F6.1)* Cover `aspect-[16/9]` (mengikuti rasio asli, tidak terpotong), prop `imageSizes`, fallback `onError` → placeholder ikon | ✅ Selesai |
| `src/components/sections/footer.tsx` | *(F6.1)* Kontras tautan `text-slate-600` + target sentuh 28 px (`inline-flex py-1`, gap dirapatkan) | ✅ Selesai |
| `src/components/sections/process-timeline.tsx` | *(F6.1)* Nomor langkah non-aktif `text-slate-400` → `text-slate-500` (kontras AA) | ✅ Selesai |
| `src/components/sections/featured-products.tsx` + `src/app/produk/[slug]/page.tsx` | *(F6.1)* Teruskan `imageSizes` sesuai grid masing-masing (`33vw` beranda, `50vw` detail) | ✅ Selesai |
| `src/lib/intro.ts` | *(F6.3)* `hasSeenIntro()` / `markIntroSeen()` (kunci `lktech:intro-seen`, aman saat storage diblokir) | ✅ Selesai |
| `src/components/sections/navbar.tsx` | *(F6.3)* Entrance ditahan `introDone` (tanpa `delay` 2,13 dtk) — halaman dalam tetap tampil langsung | ✅ Selesai |
| `src/components/google-analytics.tsx` | *(F6.4)* GA4 `afterInteractive` → `lazyOnload` (audit Lighthouse: ~3,9 dtk script-eval di jalur kritis mobile) | ✅ Selesai |
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
| F3 | Pinned storytelling (process timeline beranda) | ✅ Selesai (kode) |
| F4 | Services bento grid | ✅ Selesai (kode) |
| F5 | 3D/WebGL (tablet ke atas) | ✅ Selesai (kode) |
| F7 | Hero fokus 3D + section Pratinjau (revisi F5) | ✅ Selesai (kode) |
| F7.1 | Hero 3D "hidup & interaktif" (pointer/scroll/drag/entrance + bloom) | ✅ Selesai (kode) |
| F7.2 | Hero 3D bebas "terpotong" kotak (fit frame + soft-fade tepi) | ✅ Selesai (kode) |
| F7.3 | Hero kolom kiri: tipografi, mask-reveal, mikro-interaksi, scroll berlapis | ✅ Selesai (kode) |
| F7.4 | Judul & sub-judul hero berputar 3 varian (animasi ketik) | ✅ Selesai (kode) |
| F7.5 | Section Pratinjau: band gambar melengkung (loop ala silinder) | ✅ Selesai (kode) |
| F7.6 | Hero 3D: gerbang intro (nol kerja GPU sebelum loader beres) + cross-fade fallback + optimasi | ✅ Selesai (kode) |
| F7.7 | Hero 3D: "frame beku" (`advance(0)`) sampai cross-fade tuntas + fallback disetel ke frame-0 | ✅ Selesai (kode) |
| F7.8 | Hero 3D: panggung kosong saat menunggu → muncul dengan animasi (fade + scale 0,9 s); fallback jadi jaring pengaman | ✅ Selesai (kode) |
| F8 | Teknologi: pindah ke antara Layanan & Portofolio + marquee dua baris (kiri/kanan) | ✅ Selesai (kode) |
| F6 | Polish & QA (cover 16:9, kontras/target, pause animasi, intro sekali per sesi, perf & lintas browser) | ✅ Selesai (kode + QA) |

---

## 10. Catatan Operasional

- **Urutan eksekusi:** F0 → F1 → F2 → F3 → F4 → F5 → F7 → F8 → F6. F6 dieksekusi terakhir sebagai polish/QA. Tiap fase = 1 commit (F6 dipecah F6.1–F6.4).
- **Sebelum F5:** konfirmasi ulang (dependensi 3D berat; pastikan hasil F1–F4 sudah memuaskan).
- **Gate wajib tiap fase:** `tsc` + eslint (file terkait) + `npm run test:unit` + `npm run build`.
- **Uji manual tiap fase:** desktop, tablet, mobile, dan mode `prefers-reduced-motion`.
- **Dokumentasi:** perbarui dokumen ini (kolom Status) + `TASK-SELANJUTNYA.md` saat fase mulai/selesai.
- **Referensi konvensi dokumen:** lihat [`docs/README.md`](README.md).
 