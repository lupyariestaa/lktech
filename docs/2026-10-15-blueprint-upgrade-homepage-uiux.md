# Blueprint — Upgrade UI/UX Halaman Beranda (Storytelling Scroll + Premium Minimalis)

> **Status:** 🚧 Berjalan (F0–F5 + F7 + F7.1 + F7.2 + F7.3 + F7.4 + F7.5 selesai — kode; F6 belum)
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
| 2 | Technologies | `sections/technologies.tsx` | Client | Marquee logo (CSS `animate-marquee`), pause saat hover. Sudah bagus. |
| 3 | Services | `sections/services.tsx` (grid, `/tentang`) + `sections/services-bento.tsx` (bento, beranda) | Client | Beranda: **bento** ✅ (F4) — banner unggulan + 4 kartu, spotlight kursor. `/tentang` tetap grid 3 kolom. |
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
  - **Full-bleed** (tepi ke tepi) — ujung band melengkung & memudar ke tepi layar; tinggi band
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
| `src/components/sections/hero-3d.tsx` *(F5)* | Scene 3D/WebGL hero, lazy + gated (tablet+, bukan reduced-motion); *(F7.1)* pointer/scroll/drag/entrance + konstelasi/satelit/starfield + bloom; *(F7.2)* komposisi di-fit ke frame + soft-fade tepi (shader + mask) | ✅ Selesai |
| `src/components/sections/process-timeline.tsx` *(F3)* | Timeline scroll-driven beranda (pinned) — `process.tsx` tetap untuk `/tentang` | ✅ Selesai |
| `src/components/sections/services-bento.tsx` *(F4)* | Bento grid layanan (beranda) — `services.tsx` tetap untuk `/tentang` | ✅ Selesai |
| `src/components/sections/showcase.tsx` *(F7)* | Section "Pratinjau" (mockup browser) — dipindah dari hero; *(F7.5)* ganti carousel satu kartu → **band melengkung full-bleed** (`ShowcaseBand`), kartu mockup lama jadi keadaan kosong | ✅ Selesai |
| `src/components/sections/showcase-band.tsx` *(F7.5)* | Band gambar melengkung ala silinder (12 pita/tile, loop murni CSS `transform`, statis saat reduced-motion) | ✅ Selesai |
| `docs/2026-10-15-blueprint-upgrade-homepage-uiux.md` | **Dokumen ini** |

### Diubah (usulan)
| File | Perubahan |
| --- | --- |
| `src/app/globals.css` | *(F0: tidak diubah — lihat koreksi A1)*; token animasi/spacing menyusul bila perlu |
| `src/app/page.tsx` | Pasang `ScrollProgress` (F0); *(F7)* sisip `Showcase` setelah hero, buang plumbing `socialProof` | ✅ Selesai |
| `src/components/sections/hero.tsx` | *(F1)* Parallax, animated headline, trust bar, cursor glow | ✅ Selesai |
| `src/components/section-heading.tsx` | *(F2)* Varian alignment/ukuran + slot `action` | ✅ Selesai |
| `src/components/sections/process.tsx` | *(F3)* **Tidak diubah** — tetap grid, dipakai `/tentang` | ✅ (dibiarkan) |
| `src/components/sections/services.tsx` | *(F4)* **Tidak diubah** — tetap grid, dipakai `/tentang` | ✅ (dibiarkan) |
| `package.json` | *(F5)* Tambah `three`, `@react-three/fiber` (+ `@types/three` dev); *(F7.1)* `@react-three/postprocessing` + `postprocessing` | ✅ Selesai |
| `src/components/sections/hero.tsx` | *(F1)* Parallax, animated headline, trust bar, cursor glow; *(F5)* mount `Hero3D` lazy + `z-10` konten; *(F7)* kolom kanan → panggung 3D (terpusat) + `CoreFallback`, chip dihapus, mobile hero teks saja, prop `socialProof` dihapus; *(F7.3)* kolom kiri — kicker chip, judul **mask-reveal**, paragraf ber-penekanan, CTA magnetic+shine, trust **count-up**, parallax scroll berlapis; *(F7.4)* judul & sub **berputar 3 varian** (mesin tik + sub fade-in, anti-CLS `grid` reserve, `HeroTyped`) | ✅ Selesai |
| `src/components/intro-loader.tsx` | *(F5)* Perbaiki bug reduced-motion (loader tak pernah unmount → blokir klik & kunci scroll) | ✅ Selesai |
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
 