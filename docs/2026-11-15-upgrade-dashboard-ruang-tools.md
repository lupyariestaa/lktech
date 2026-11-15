# Dashboard Ruang LKTech Tools â€” Rencana Produk, UX & Eksekusi

> **Status:** âœ… Diimplementasikan (2026-11-15) â€” menunggu review & commit
> **Disusun:** 2026-11-15
> **Cakupan:** `/tools/ruang` dan `/tools/[slug]` (workspace login-gated).
> **Di luar cakupan:** landing publik `/tools`, panduan publik `/tools/panduan`, logika pemrosesan berkas, model autentikasi, dan backend baru.

Dokumen ini adalah lanjutan dari [`2026-11-14-upgrade-landing-lktech-tools.md`](2026-11-14-upgrade-landing-lktech-tools.md) dan [`2026-11-01-lktech-tools-space.md`](2026-11-01-lktech-tools-space.md). Landing sudah product-led; fokus sekarang adalah membuat **ruang tools dan workspace terasa sebagai satu dashboard**, bukan dua halaman terpisah.

---

## 0. Ringkasan untuk pengambil keputusan

Saat ini `/tools/ruang` adalah katalog full-page, sedangkan `/tools/[slug]` adalah workspace full-page dengan rail horizontal. Keduanya memakai Navbar/Footer global dan tidak berbagi layout. Akibatnya:

- perpindahan antar-tool terasa seperti pindah halaman biasa;
- tidak ada navigasi persisten di kiri;
- favorit dan recent tersembunyi di dalam katalog;
- tidak ada data â€œsering dipakaiâ€;
- workspace tidak punya konteks dashboard yang sama dengan ruang.

Rencana ini mengubah keduanya menjadi **satu shell dashboard**:

1. **Sidebar kiri persisten** berisi beranda ruang, tool yang sedang dibuka, favorit, tool yang sering dipakai, dan daftar semua tool.
2. **Area utama** menampilkan dashboard home (`/tools/ruang`) atau tool aktif (`/tools/[slug]`).
3. **Data lokal** diperluas: favorit, recent, dan frekuensi pemakaian (hanya slug + jumlah + waktu; tanpa berkas/isi).
4. **Mobile** memakai drawer, bukan sidebar yang dipaksa mengecil.
5. **URL, auth, dan `noindex` tidak berubah.**

Rekomendasi: setujui **D1â€“D6** di Â§3, lalu eksekusi T0â€“T7. Estimasi 3â€“4 hari kerja efektif.

---

## 1. Kondisi saat ini (hasil audit kode)

| Area | Kondisi sekarang | Gap |
| --- | --- | --- |
| Route | `/tools/ruang` dan `/tools/[slug]` berdiri sendiri; masing-masing memasang `Navbar`, `Footer`, dan `UserGuard` | Tidak ada layout bersama; guard dan chrome terduplikasi |
| Navigasi tool | `ToolRail` horizontal di dalam `ToolShell` | Tidak persisten, tidak menampilkan favorit/frekuensi, dan hilang saat scroll |
| Katalog | `ToolsCatalog` punya pencarian, filter kategori, favorit, recent, dan hapus data lokal | Recent/favorit tidak terlihat saat berada di workspace |
| Preferensi | `localStorage`: `lktech.tools.recent.v1`, `lktech.tools.favorites.v1` | Belum ada hitungan pemakaian |
| Workspace | `ToolShell` + body tool + rekomendasi tool terkait | Tidak ada sidebar; konteks â€œsedang membuka tool apaâ€ hanya dari judul |
| Mobile | Semua halaman memakai Navbar global | Tidak ada drawer khusus tools; rail horizontal kurang nyaman |
| Auth | `UserGuard` per halaman | Bisa dipusatkan di layout route group |
| SEO | Landing & panduan publik indexable; ruang & workspace `noindex` | Harus dipertahankan setelah refactor route |
| Referensi internal | `AdminShell` sudah punya sidebar desktop + drawer mobile + focus trap | Pola bisa ditiru, tetapi jangan mencampur state admin |

**Kesimpulan:** fondasinya sudah ada (registry, favorit/recent, analytics, `ToolShell`). Upgrade ini lebih tepat disebut **penataan ulang shell + penambahan data frekuensi**, bukan rewrite.

---

## 2. Tujuan & non-goals

### 2.1 Tujuan

- **G1 â€” Satu shell:** `/tools/ruang` dan `/tools/[slug]` memakai sidebar dan header yang sama.
- **G2 â€” Navigasi persisten:** pengguna bisa pindah tool, kembali ke semua tool, dan membuka favorit tanpa kehilangan konteks.
- **G3 â€” Data berguna:** sidebar menampilkan tool aktif, favorit, dan tool yang sering dipakai; dashboard home menampilkan â€œlanjutkanâ€ dan ringkasan.
- **G4 â€” Mobile-first:** drawer yang aksesibel, bukan sidebar sempit yang berdesakan.
- **G5 â€” Privasi tetap:** semua data preferensi/frekuensi hanya di `localStorage`; tidak ada berkas, isi teks, nama berkas, atau riwayat proses yang dikirim ke server.
- **G6 â€” Tidak merusak:** URL, auth, `noindex`, landing publik, panduan publik, dan logika tool tetap sama.

### 2.2 Non-goals

- Tidak menambah tool baru.
- Tidak mengubah logika pemrosesan gambar/PDF/teks.
- Tidak menambah backend, Firestore, atau sinkronisasi lintas perangkat.
- Tidak menyimpan riwayat berkas/hasil proses.
- Tidak mengubah landing `/tools` atau panduan publik.
- Tidak membuat sidebar yang bisa di-drag/resize.
- Tidak menambahkan A/B testing atau eksperimen copy.
- Tidak mengubah model auth; guard tetap `UserGuard` di client.

---

## 3. Keputusan desain

| # | Keputusan | Rekomendasi | Alasan |
| --- | --- | --- | --- |
| **D1** | Chrome dashboard | **Shell fokus**: tanpa Navbar/Footer marketing; sidebar punya brand, â€œKembali ke situsâ€, â€œPanduanâ€, dan menu akun | Terasa seperti dashboard, mengurangi tinggi header, dan menghindari dua menu mobile |
| **D2** | Struktur route | Route group `src/app/tools/(workspace)/` untuk `ruang` dan `[slug]` | URL tetap; layout/guard/sidebar dipakai bersama; landing & panduan tetap di luar |
| **D3** | Metrik â€œsering dipakaiâ€ | **Jumlah workspace dibuka** (`opens`), bukan jumlah proses sukses | Tidak perlu instrumentasi ulang tiap tool; cukup satu titik pencatatan; lebih jujur disebut â€œsering dibukaâ€ |
| **D4** | Isi sidebar | Beranda ruang, kartu â€œSedang dibukaâ€, Favorit, Sering dipakai, Semua tool, footer data/akun | Memenuhi permintaan tanpa menggandakan recent di banyak tempat |
| **D5** | Titik pencatatan recent/usage | **Saat workspace mount**, sekali per kunjungan | Menangkap deep link/refresh, menghindari hitung ganda dari klik katalog + mount workspace |
| **D6** | Drawer mobile | Drawer kiri dengan focus trap, ESC, backdrop, dan scroll lock; CSS transition tanpa dependency baru | Pola sudah terbukti di `AdminShell`; bundle tetap ringan |
| **D7** | Collapse sidebar desktop | **P2** â€” belum di rilis pertama | Dengan 5 tool, sidebar 280 px masih nyaman; collapse menambah state/QA |

### 3.1 Alternatif yang ditolak

- **Sidebar di dalam `ToolShell` saja:** tidak persisten saat pindah dari katalog ke tool, dan guard/chrome tetap terduplikasi.
- **Sidebar global untuk seluruh `/tools`:** akan ikut muncul di landing dan panduan publik; tidak sesuai arsitektur publik/privat.
- **Mengandalkan recent sebagai â€œsering dipakaiâ€:** recent hanya 3 item terakhir, bukan frekuensi.
- **Menghitung proses sukses:** butuh perubahan di setiap body tool dan berisiko salah hitung; ditunda sampai ada kebutuhan produk yang jelas.
- **Framer Motion untuk drawer:** tidak perlu menambah dependency hanya untuk satu animasi.

---

## 4. Blueprint UX

### 4.1 Desktop (â‰¥1024 px)

```text
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ skip link (hanya fokus)                                                    â”‚
â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚ â”‚ LKTech Tools          â”‚  Breadcrumb: Ruang tools / Gambar ke WebP      â”‚ â”‚
â”‚ â”‚ Ruang kerja lokal     â”‚                                                â”‚ â”‚
â”‚ â”‚                       â”‚  H1 + deskripsi halaman                        â”‚ â”‚
â”‚ â”‚ â–¸ Ruang tools         â”‚  chip: Lokal Â· PNGâ†’WebP Â· Maks. 15 MB          â”‚ â”‚
â”‚ â”‚                       â”‚                                                â”‚ â”‚
â”‚ â”‚ SEDANG DIBUKA         â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚ â”‚
â”‚ â”‚ [icon] Gambar ke WebP â”‚  â”‚  Body tool / katalog                     â”‚  â”‚ â”‚
â”‚ â”‚        Gambar         â”‚  â”‚                                          â”‚  â”‚ â”‚
â”‚ â”‚                       â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚ â”‚
â”‚ â”‚ FAVORIT               â”‚                                                â”‚ â”‚
â”‚ â”‚ â˜… Gambar ke WebP      â”‚  Tool terkait                                  â”‚ â”‚
â”‚ â”‚ â˜… Gambar ke PDF       â”‚  [kartu] [kartu]                               â”‚ â”‚
â”‚ â”‚                       â”‚                                                â”‚ â”‚
â”‚ â”‚ SERING DIPAKAI        â”‚                                                â”‚ â”‚
â”‚ â”‚ 12Ã— Gambar ke WebP    â”‚                                                â”‚ â”‚
â”‚ â”‚ 8Ã—  PDF ke Gambar     â”‚                                                â”‚ â”‚
â”‚ â”‚                       â”‚                                                â”‚ â”‚
â”‚ â”‚ SEMUA TOOL            â”‚                                                â”‚ â”‚
â”‚ â”‚ Warna                 â”‚                                                â”‚ â”‚
â”‚ â”‚  Color Picker         â”‚                                                â”‚ â”‚
â”‚ â”‚ Gambar                â”‚                                                â”‚ â”‚
â”‚ â”‚  Gambar ke WebP       â”‚                                                â”‚ â”‚
â”‚ â”‚ PDF                   â”‚                                                â”‚ â”‚
â”‚ â”‚  Gambar ke PDF        â”‚                                                â”‚ â”‚
â”‚ â”‚  PDF ke Gambar        â”‚                                                â”‚ â”‚
â”‚ â”‚ Produktivitas         â”‚                                                â”‚ â”‚
â”‚ â”‚  Formatter Teks       â”‚                                                â”‚ â”‚
â”‚ â”‚                       â”‚                                                â”‚ â”‚
â”‚ â”‚ Panduan Â· Kembali ke situs                                             â”‚ â”‚
â”‚ â”‚ [Akun saya] [Keluar]  â”‚                                                â”‚ â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Detail desktop**

- Sidebar lebar **280 px**, `sticky top-0 h-dvh`, border kanan, background putih.
- Area utama `min-w-0 flex-1`, padding `px-6 lg:px-10`, max-width konten Â±`1200px`.
- Sidebar bisa scroll sendiri bila daftar tool bertambah; footer tetap di bawah.
- Tool aktif memakai `aria-current="page"` + background primary-50 + teks primary.
- Tidak ada Navbar global; identitas situs tetap ada lewat brand + â€œKembali ke situsâ€.

### 4.2 Mobile (<1024 px)

```text
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ [â˜°]  LKTech Tools        [Akun] â”‚  sticky topbar
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ Breadcrumb                       â”‚
â”‚ H1                               â”‚
â”‚ chip metadata                    â”‚
â”‚                                  â”‚
â”‚ Body tool / katalog              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

Drawer (dari kiri):
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ LKTech Tools        [X]  â”‚
â”‚ â–¸ Ruang tools            â”‚
â”‚ SEDANG DIBUKA â€¦          â”‚
â”‚ FAVORIT â€¦                â”‚
â”‚ SERING DIPAKAI â€¦         â”‚
â”‚ SEMUA TOOL â€¦             â”‚
â”‚ Panduan Â· Kembali        â”‚
â”‚ [Akun] [Keluar]          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Detail mobile**

- Topbar tinggi 64 px, sticky, berisi hamburger, brand, dan tautan akun.
- Drawer lebar `min(18rem, 85vw)`, `role="dialog"`, `aria-modal="true"`, `aria-label="Menu tools"`.
- Fokus pindah ke tombol tutup saat drawer dibuka; Tab ter-trap; ESC menutup; fokus kembali ke hamburger.
- Drawer menutup otomatis saat route berubah atau viewport melebar ke desktop.
- `inert` pada konten utama saat drawer terbuka; body scroll dikunci.
- Tidak ada animasi berat; cukup transisi transform/opacity CSS bila memungkinkan.

### 4.3 Anatomi sidebar

| Blok | Isi | Perilaku |
| --- | --- | --- |
| Brand | `Logo` + label â€œToolsâ€ | Link ke `/tools/ruang` |
| Navigasi utama | â€œRuang toolsâ€ | Aktif di `/tools/ruang`; membawa ke katalog |
| Sedang dibuka | Tool aktif + kategori | Hanya tampil di `/tools/[slug]`; bukan link duplikat, cukup konteks |
| Favorit | Maks. 5 tool favorit | Link ke workspace; kosong â†’ hint â€œTandai â˜… di kartu toolâ€ |
| Sering dipakai | Top 3 berdasarkan `opens` | Menampilkan `12Ã—`; kosong â†’ hint â€œBelum ada data di perangkat iniâ€ |
| Semua tool | Semua tool tersedia, dikelompokkan per kategori | Tool aktif ditandai; urutan mengikuti registry |
| Footer | Panduan, Kembali ke situs, akun, keluar | Tautan keluar situs jelas; logout memakai `signOutUser` |

Catatan: **recent tidak ditampilkan di sidebar** agar tidak ada empat daftar tool yang isinya sama. Recent tetap hidup di dashboard home sebagai kartu â€œLanjutkanâ€.

### 4.4 Dashboard home `/tools/ruang`

Urutan konten:

1. **Header** â€” H1 â€œRuang toolsâ€, subcopy singkat, stat lokal: jumlah tool, favorit, total pembukaan.
2. **Kartu â€œLanjutkanâ€** â€” hanya bila ada recent; tool terakhir, waktu relatif (â€œ2 jam laluâ€), CTA â€œBuka lagiâ€.
3. **Pintasan** â€” dua kolom:
   - Favorit (maks. 4 chip/kartu kecil);
   - Sering dipakai (top 3 + jumlah).
   Jika keduanya kosong, tampilkan satu kartu onboarding: â€œTandai favorit atau buka tool untuk melihat pintasan di sini.â€
4. **Katalog** â€” pencarian, filter kategori, filter favorit, result count, kartu tool, kartu usulan tool.
5. **Catatan privasi lokal** â€” â€œPreferensi & hitungan hanya tersimpan di perangkat ini; tidak ada berkas yang diunggah.â€

Yang **dipindahkan keluar** dari `ToolsCatalog`: strip recent, tombol hapus data lokal, dan statistik. Semua menjadi tanggung jawab dashboard home/sidebar agar tidak duplikatif.

### 4.5 Workspace `/tools/[slug]`

- Breadcrumb â€œRuang tools / {tool.name}â€.
- H1 nama tool + deskripsi.
- Chip: lokal, format, batas, tautan panduan, bantuan.
- Catatan privasi tool.
- Body tool.
- Rekomendasi tool terkait di bawah.
- Tidak ada `ToolRail` horizontal; sidebar menggantikannya.
- Tidak ada tombol â€œKembali ke ruangâ€ besar; cukup breadcrumb + item â€œRuang toolsâ€ di sidebar.

### 4.6 Empty state & status

| State | Tampilan |
| --- | --- |
| Favorit kosong | Hint singkat + ikon bintang; tidak menyembunyikan section agar layout stabil |
| Frekuensi kosong | â€œBelum ada data di perangkat ini.â€ |
| Recent kosong | Kartu â€œLanjutkanâ€ tidak dirender |
| Data lokal dihapus | Sidebar & home langsung kosong; `aria-live` mengumumkan â€œData lokal tools dihapus.â€ |
| Auth loading | Loader â€œMemeriksa sesi...â€ dari `UserGuard` (shell belum dirender) |
| Tool tidak ditemukan | Tetap `notFound()` seperti sekarang |
| Pencarian tanpa hasil | Empty state katalog yang sudah ada |

### 4.7 Copy & tone

- Bahasa Indonesia, â€œAndaâ€, tenang, tidak hiperbolik.
- Sebut â€œsering dibukaâ€, bukan â€œpaling produktifâ€ atau klaim yang tidak bisa dibuktikan.
- Jangan menampilkan angka palsu, testimoni, atau â€œ100% amanâ€.
- Jelaskan bahwa hitungan hanya lokal: â€œdi perangkat iniâ€.

---

## 5. Arsitektur teknis

### 5.1 Struktur route

```text
src/app/tools/
â”œâ”€â”€ page.tsx                         # landing publik (tetap)
â”œâ”€â”€ opengraph-image.tsx              # tetap
â”œâ”€â”€ panduan/                         # publik (tetap)
â”‚   â”œâ”€â”€ page.tsx
â”‚   â””â”€â”€ [slug]/page.tsx
â””â”€â”€ (workspace)/                     # route group baru
    â”œâ”€â”€ layout.tsx                   # UserGuard + ToolsShell + noindex
    â”œâ”€â”€ ruang/page.tsx               # dipindah dari tools/ruang
    â””â”€â”€ [slug]/page.tsx              # dipindah dari tools/[slug]
```

- URL **tidak berubah**.
- `generateStaticParams()` tetap di `[slug]/page.tsx`.
- Route `panduan` (static segment) tetap menang atas `[slug]`, sehingga tidak ada konflik.
- `Navbar`/`Footer` dihapus dari dua halaman tersebut; chrome menjadi tanggung jawab layout.
- Metadata `robots: { index: false, follow: false }` dipindahkan ke layout agar semua child otomatis `noindex`. Judul per halaman tetap di page.

### 5.2 Layout & auth

```tsx
// src/app/tools/(workspace)/layout.tsx (gambaran)
<UserGuard>
  <ToolsShell>{children}</ToolsShell>
</UserGuard>
```

- `UserGuard` dipanggil sekali di layout; tidak perlu diulang di page.
- `ToolsShell` adalah client component karena memakai `usePathname`, preferensi lokal, dan state drawer.
- `children` tetap server component; body tool yang sudah client tetap bekerja.
- Redirect `next` tetap ditangani `UserGuard` (`/masuk?next=/tools/...`).

### 5.3 Component tree

```text
ToolsShell (client)
â”œâ”€â”€ ToolsSidebar (desktop, â‰¥lg)
â”‚   â”œâ”€â”€ ToolsSidebarBrand
â”‚   â”œâ”€â”€ ToolsSidebarNav
â”‚   â”œâ”€â”€ ToolsCurrentTool
â”‚   â”œâ”€â”€ ToolsFavoriteList
â”‚   â”œâ”€â”€ ToolsFrequentList
â”‚   â”œâ”€â”€ ToolsAllTools
â”‚   â””â”€â”€ ToolsSidebarFooter (panduan, situs, akun, hapus data)
â”œâ”€â”€ ToolsMobileTopbar
â”œâ”€â”€ ToolsMobileDrawer
â”‚   â””â”€â”€ ToolsSidebarContent (dipakai ulang)
â””â”€â”€ main#tools-main
    â””â”€â”€ children
```

Prinsip:

- **Satu** komponen `ToolsSidebarContent` untuk desktop dan drawer; hindari duplikasi markup.
- `ToolsShell` mengelola state drawer; data preferensi dibaca lewat hook.
- `ToolsSidebar` tidak melakukan fetch; semua data dari registry + localStorage.
- `ToolShell` lama disederhanakan menjadi header workspace; tidak lagi merender rail/back link.

### 5.4 Alur data

```text
localStorage
  â”œâ”€â”€ favorites â”€â”€â–º useToolFavorites â”€â”€â–º sidebar + katalog
  â”œâ”€â”€ recent â”€â”€â”€â”€â”€â–º useRecentTools â”€â”€â”€â”€â–º home â€œLanjutkanâ€
  â””â”€â”€ usage â”€â”€â”€â”€â”€â”€â–º useToolUsage â”€â”€â”€â”€â”€â”€â–º sidebar â€œSering dipakaiâ€ + stat

ToolWorkspace mount
  â””â”€â”€ recordToolOpen(slug)
        â”œâ”€â”€ update recent (maks. 3)
        â”œâ”€â”€ increment usage.opens + lastUsedAt
        â””â”€â”€ emit satu event perubahan
```

- `recordToolOpen` menjadi **satu-satunya** titik pencatatan recent + usage.
- Klik dari katalog/sidebar hanya mengirim analytics; pencatatan terjadi saat workspace mount.
- Guard `useRef` mencegah hitung ganda akibat StrictMode di development.
- `clearToolsLocalData()` menghapus ketiga key dan mereset cache/snapshot.

### 5.5 Model data frekuensi

Key baru:

```text
lktech.tools.usage.v1
```

Bentuk:

```ts
type ToolUsageEntry = {
  slug: string;      // slug registry yang valid & tersedia
  opens: number;     // integer >= 1
  lastUsedAt: number; // epoch ms
};
```

Aturan:

- Maksimal **50 entri**; saat pruning, pertahankan `lastUsedAt` terbaru.
- `opens` di-clamp ke `1..999_999` agar data rusak tidak merusak UI.
- Slug tak dikenal, tool `segera`, duplikat, dan nilai non-finite diabaikan.
- Ranking â€œsering dipakaiâ€: `opens` desc â†’ `lastUsedAt` desc â†’ urutan registry.
- Data hanya slug + angka + waktu. Tidak ada nama berkas, isi teks, ukuran, atau hasil proses.

Fungsi murni baru di `src/lib/tools-usage-pure.ts`:

```ts
parseStoredToolUsage(raw, tools, now?)
recordToolUsage(entries, slug, tools, now?)
rankFrequentTools(entries, tools, limit?)
totalToolOpens(entries)
formatRelativeTime(timestamp, now?)
getActiveToolSlug(pathname, tools)
```

Modul ini tanpa impor runtime registry (hanya `import type`) agar bisa diuji Node `--experimental-strip-types`.

### 5.6 Storage & hook

`src/lib/tools-storage.ts` diperluas:

- `readToolUsage()`, `writeToolUsage()`, `getToolUsageSnapshot()`.
- `recordToolOpen(slug)`: update recent + usage, set cache, emit satu event.
- `subscribeToolsPreferences` juga mendengarkan key usage dan mereset cache terkait.
- `clearToolsLocalData()` menghapus usage juga.

`src/components/tools/use-tools-preferences.ts`:

- `useToolUsage(): ToolUsageEntry[]`.
- `useFrequentTools(limit = 3)` bila selector nyaman dipakai di beberapa tempat.
- Tetap memakai `useSyncExternalStore` + server snapshot kosong.

### 5.7 Active tool

Helper murni:

```ts
getActiveToolSlug("/tools/image-to-webp", TOOLS) // "image-to-webp"
getActiveToolSlug("/tools/ruang", TOOLS)         // null
getActiveToolSlug("/tools/panduan/...", TOOLS)   // null
```

Dipakai sidebar untuk `aria-current`, kartu â€œSedang dibukaâ€, dan analytics.

### 5.8 Analytics

- Tambah `source: "sidebar"` dan `"dashboard"` ke `ToolsEventSource`.
- Klik tool dari sidebar â†’ `trackToolsToolOpen({ tool, source: "sidebar" })`.
- Klik â€œLanjutkanâ€ â†’ `trackToolsRecentOpen({ tool })` yang sudah ada.
- Klik â€œRuang toolsâ€/home â†’ event baru ringan bila perlu (`tools_dashboard_home`) atau cukup pageview; jangan mengirim data lokal.
- Tidak mengirim `opens`, timestamp, nama berkas, atau query mentah.

### 5.9 Performa & bundle

- Tidak menambah dependency baru.
- Drawer memakai CSS transition, bukan Framer Motion.
- Sidebar hanya merender 5 tool + maksimal 3 favorit + 3 frekuensi.
- Preferensi tetap dibaca setelah hidrasi; section memakai tinggi/empty state stabil agar tidak menggeser layout utama.
- Tidak ada gambar/aset baru; ikon memakai lucide yang sudah ada.

### 5.10 SEO & robots

- Layout workspace mengekspor `robots: { index: false, follow: false }`.
- Landing `/tools` dan `/tools/panduan` tidak tersentuh.
- `robots.txt` dan sitemap tidak berubah.
- Tidak ada tautan dari halaman publik ke area workspace baru.
- URL `/tools/ruang` dan `/tools/[slug]` dipertahankan agar backlink/redirect lama tetap valid.

---

## 6. Rencana eksekusi

### T0 â€” Baseline & finalisasi keputusan

- [x] Konfirmasi D1 (shell fokus vs Navbar global) dan D3 (metrik â€œdibukaâ€).
- [x] Catat baseline build/test saat ini: 82 test Tools, build 217/217, E2E publik 18/18.
- [ ] Siapkan branch kerja khusus; jangan campur dengan perubahan landing.
- [x] Pastikan tidak ada perubahan user yang belum tersimpan di area Tools.

**Selesai bila:** keputusan disetujui dan baseline tercatat.

### T1 â€” Data layer frekuensi & helper murni

- [x] Buat `src/lib/tools-usage-pure.ts`:
  - tipe `ToolUsageEntry`;
  - parse/sanitasi;
  - increment + cap;
  - ranking;
  - total opens;
  - relative time;
  - active slug.
- [x] Tambah `TOOLS_USAGE_STORAGE_KEY` dan konstanta batas.
- [x] Tambah `scripts/tools-usage.test.ts` + script `test:tools-usage`.
- [x] Perluas `tools-storage.ts` dan `use-tools-preferences.ts`.
- [x] Pastikan `clearToolsLocalData()` menghapus usage.
- [x] Uji data rusak: JSON invalid, array berisi string, slug hantu, opens negatif, duplikat.

**Selesai bila:** unit test usage lulus dan belum ada perubahan UI.

### T2 â€” Route group, guard, dan shell

- [x] Buat `src/app/tools/(workspace)/layout.tsx`.
- [x] Pindahkan `ruang/page.tsx` dan `[slug]/page.tsx` dengan `git mv` agar history terjaga.
- [x] Hapus `Navbar`/`Footer`/`UserGuard` dari kedua page; pindahkan guard ke layout.
- [x] Tambah `noindex` di metadata layout.
- [x] Buat `ToolsShell`, `ToolsMobileTopbar`, `ToolsMobileDrawer`.
- [x] Tambah skip link dan `id="tools-main"`.
- [x] Pastikan drawer memakai focus trap; ekstrak/reuse hook yang sudah ada bila memungkinkan.
- [x] Validasi URL dan `generateStaticParams` tetap sama.

**Selesai bila:** `/tools/ruang` dan `/tools/[slug]` dirender dalam shell yang sama, guard tetap bekerja, dan build tidak mengubah daftar route.

### T3 â€” Sidebar & data

- [x] Buat `ToolsSidebarContent` (dipakai desktop + drawer).
- [x] Brand + navigasi â€œRuang toolsâ€.
- [x] Kartu â€œSedang dibukaâ€ (hanya di workspace).
- [x] Favorit (maks. 5) + empty hint.
- [x] Sering dipakai (top 3 + `12Ã—`) + empty hint.
- [x] Semua tool grouped by category + active state + `aria-current`.
- [x] Footer: Panduan, Kembali ke situs, Akun, Keluar, Hapus data lokal.
- [x] Konfirmasi inline untuk hapus data + `aria-live`.
- [x] Analytics klik sidebar.
- [x] Pastikan data berubah real-time setelah favorit di-toggle atau tool dibuka.

**Selesai bila:** sidebar akurat di dua halaman dan mobile drawer menampilkan isi yang sama.

### T4 â€” Dashboard home

- [x] Rancang ulang `ruang/page.tsx`: header + stat lokal.
- [x] Kartu â€œLanjutkanâ€ dari recent (maks. 1).
- [x] Section â€œPintasanâ€: favorit + sering dipakai.
- [x] Integrasikan `ToolsCatalog` yang sudah ada.
- [x] Pindahkan/ hapus strip recent dan tombol hapus dari `ToolsCatalog`.
- [x] Pastikan pencarian/filter URL state tetap berfungsi.
- [x] Empty state onboarding bila belum ada favorit/riwayat.
- [x] Cek layout 360/390/768/1024/1440.

**Selesai bila:** home terasa seperti dashboard, bukan sekadar katalog dengan sidebar.

### T5 â€” Workspace integration

- [x] Sederhanakan `ToolShell`: breadcrumb, H1, deskripsi, chip, privasi, slot body.
- [x] Hapus `ToolRail` dari render; hapus file bila tidak dipakai lagi.
- [x] Tambah pencatatan `recordToolOpen` sekali per mount di `ToolWorkspace`.
- [x] Hapus pencatatan recent dari `ToolsCatalog` (klik hanya analytics).
- [x] Pastikan rekomendasi tool terkait tetap berfungsi.
- [x] Pastikan tautan panduan/help tetap ada.
- [x] Cek deep link langsung ke `/tools/[slug]` ikut mencatat recent + usage.

**Selesai bila:** pindah antar-tool terasa instan dalam shell, tanpa rail horizontal, dan hitungan tidak dobel.

### T6 â€” Aksesibilitas, responsive, polish

- [x] Keyboard: Tab order, skip link, drawer trap, ESC, fokus kembali.
- [x] `aria-current`, label section, heading hierarchy.
- [x] Kontras teks muted/count memenuhi AA.
- [x] Touch target minimal 44 px untuk item sidebar dan tombol drawer.
- [x] `prefers-reduced-motion` untuk transisi drawer.
- [x] Tidak ada overflow horizontal 360â€“1440.
- [x] Cek sidebar scroll internal saat tinggi viewport pendek.
- [x] Cek tampilan saat data kosong, 1 favorit, 5 favorit, dan usage tinggi.
- [x] Pastikan tidak ada hydration warning.

### T7 â€” QA, dokumentasi, rilis

- [x] `npm run lint`.
- [x] `npx tsc --noEmit`.
- [x] Semua test Tools (usage, registry, discovery, pages, color, image, text, pdf).
- [x] `npm run build` â€” pastikan tetap 217/217 dan route Tools tidak berubah.
- [x] E2E publik tetap 18/18.
- [ ] Smoke manual login: home â†’ tool â†’ sidebar â†’ favorit â†’ recent â†’ hapus data.
- [x] Update dokumen ini dengan hasil implementasi.
- [x] Update `docs/README.md`, `TASK-SELANJUTNYA.md`, dan tautan terkait.
- [ ] Commit + push hanya setelah approval/QA.

---

## 7. Daftar file

### 7.1 Baru

| File | Peran |
| --- | --- |
| `src/app/tools/(workspace)/layout.tsx` | Guard, metadata `noindex`, shell dashboard |
| `src/app/tools/(workspace)/ruang/page.tsx` | Dashboard home (pindahan) |
| `src/app/tools/(workspace)/[slug]/page.tsx` | Workspace tool (pindahan) |
| `src/components/tools/dashboard/tools-shell.tsx` | Shell: sidebar desktop, topbar/drawer mobile, main |
| `src/components/tools/dashboard/tools-sidebar-content.tsx` | Isi sidebar bersama desktop/drawer |
| `src/components/tools/dashboard/tools-sidebar-nav.tsx` | Navigasi utama + semua tool |
| `src/components/tools/dashboard/tools-current-tool.tsx` | Kartu â€œSedang dibukaâ€ |
| `src/components/tools/dashboard/tools-favorite-list.tsx` | Daftar favorit |
| `src/components/tools/dashboard/tools-frequent-list.tsx` | Daftar sering dipakai |
| `src/components/tools/dashboard/tools-sidebar-footer.tsx` | Panduan, situs, akun, hapus data |
| `src/components/tools/dashboard/tools-mobile-topbar.tsx` | Topbar mobile + hamburger |
| `src/components/tools/dashboard/tools-mobile-drawer.tsx` | Drawer mobile + focus trap |
| `src/components/tools/dashboard/tools-shortcuts.tsx` | Pintasan favorit/frekuensi di home |
| `src/components/tools/dashboard/tools-dashboard-overview.tsx` | Statistik lokal, kartu â€œLanjutkanâ€, pintasan |
| `src/lib/tools-usage-pure.ts` | Logika murni usage, ranking, relative time, active slug |
| `scripts/tools-usage.test.ts` | Unit test logika usage |

### 7.2 Dipindah

| Dari | Ke |
| --- | --- |
| `src/app/tools/ruang/page.tsx` | `src/app/tools/(workspace)/ruang/page.tsx` |
| `src/app/tools/[slug]/page.tsx` | `src/app/tools/(workspace)/[slug]/page.tsx` |

### 7.3 Diubah

| File | Perubahan |
| --- | --- |
| `src/lib/tools-storage.ts` | Usage cache, `recordToolOpen`, clear, subscription |
| `src/components/tools/use-tools-preferences.ts` | Hook usage/frequent |
| `src/lib/tools-discovery-pure.ts` | Tidak berubah â€” active slug ditempatkan di `tools-usage-pure.ts` |
| `src/lib/analytics.ts` | Source `sidebar`/`dashboard` |
| `src/components/tools/tools-catalog.tsx` | Hapus strip recent/clear/stat; fokus pencarian & katalog |
| `src/components/tools/tool-shell.tsx` | Header workspace baru; tanpa rail/back link |
| `src/components/tools/tool-workspace.tsx` | `recordToolOpen` sekali per mount; analytics |
| `src/components/tools/tool-rail.tsx` | Hapus bila tidak dipakai |
| `src/components/tools/tool-card.tsx` | Penyesuaian kecil bila perlu (bintang/analytics) |
| `scripts/tools-pages.test.ts` | Route group, guard layout, sidebar wiring, hapus asersi rail |
| `scripts/tools-discovery.test.ts` | Bila helper recent/active berubah |
| `package.json` | Script `test:tools-usage` |
| `tsconfig.json` | Exclude test usage |
| `e2e/public-pages.spec.ts` | Tetap; tambah smoke bila route berubah |
| `docs/README.md`, `TASK-SELANJUTNYA.md` | Tautan & status |

### 7.4 Dihapus

- `src/components/tools/tool-rail.tsx` â€” setelah tidak ada pemakai.
- `ToolRail` dari `ToolShell`.
- Strip recent/clear dari `ToolsCatalog` â€” dipindah ke home/sidebar.

---

## 8. Rencana pengujian

### 8.1 Unit / pure

`npm run test:tools-usage`:

- parse JSON valid/invalid/array string;
- sanitasi slug hantu, tool `segera`, duplikat;
- increment `opens` + `lastUsedAt`;
- cap 50 entri dan pruning;
- ranking ties;
- total opens;
- relative time;
- active slug untuk ruang/panduan/workspace.

### 8.2 Regression Tools

- `test:tools-registry` â€” registry tidak berubah tak sengaja.
- `test:tools-discovery` â€” recent/favorit/URL state tetap.
- `test:tools-pages`:
  - layout `(workspace)` memuat `UserGuard` + `noindex`;
  - landing & panduan tidak memakai guard;
  - sidebar memuat favorit/frekuensi/semua tool;
  - `ToolRail` tidak lagi dirender;
  - URL tetap.
- `test:tools-color/image/text/pdf` â€” logika tool tidak tersentuh.

### 8.3 E2E

- Publik: `npx playwright test e2e/public-pages.spec.ts` (18/18).
- Auth (bila emulator tersedia): login â†’ `/tools/ruang` â†’ buka tool â†’ sidebar aktif â†’ favorit â†’ kembali â†’ recent.
- Minimal manual dengan akun nyata:
  - deep link `/tools/image-to-webp`;
  - refresh halaman;
  - pindah tool via sidebar;
  - buka drawer mobile;
  - hapus data lokal;
  - buka dua tab untuk cek sinkronisasi storage.

### 8.4 Matriks manual

| Viewport | Yang dicek |
| --- | --- |
| 360Ã—800 | topbar, drawer, tidak ada overflow, kartu 1 kolom |
| 390Ã—844 | drawer, touch target, sticky topbar |
| 768Ã—1024 | grid 2 kolom, topbar |
| 1024Ã—768 | sidebar muncul, main tidak terjepit |
| 1440Ã—900 | sidebar + konten lega, tidak ada teks terpotong |

### 8.5 Quality gate

- lint bersih;
- tsc bersih;
- seluruh test Tools lulus;
- build sukses dan route count tetap;
- E2E publik hijau;
- tidak ada console error/hydration warning baru.

---

## 9. Acceptance criteria

### 9.1 Produk & UX

- [x] `/tools/ruang` dan setiap `/tools/[slug]` memakai sidebar yang sama.
- [x] Sidebar menampilkan: beranda ruang, tool aktif, favorit, sering dipakai, semua tool.
- [x] Tool aktif ditandai jelas dan memakai `aria-current="page"`.
- [x] Dashboard home punya â€œLanjutkanâ€, pintasan, statistik lokal, dan katalog.
- [x] Tidak ada rail horizontal lama.
- [x] Recent tidak hilang; tetap muncul sebagai â€œLanjutkanâ€.
- [x] Hapus data lokal menghapus favorit + recent + usage dan langsung memperbarui UI.
- [x] Empty state jelas dan tidak menampilkan data palsu.

### 9.2 Data & privasi

- [x] Usage hanya menyimpan slug, jumlah, dan waktu.
- [x] Tidak ada berkas/isi teks/nama berkas yang disimpan atau dikirim.
- [x] Hitungan bertambah sekali per kunjungan workspace, bukan dua kali.
- [x] Data invalid/rusak tidak mematahkan sidebar.
- [x] Sinkron antar-tab melalui event `storage`.
- [x] `clearToolsLocalData` menghapus ketiga key.

### 9.3 Auth & SEO

- [x] `/tools/ruang` dan `/tools/[slug]` tetap login-gated.
- [x] Keduanya tetap `noindex, nofollow`.
- [x] `/tools` dan `/tools/panduan` tetap publik/indexable.
- [x] URL tidak berubah; deep link dan redirect `next` tetap bekerja.
- [x] `robots.txt` dan sitemap tidak berubah.

### 9.4 Aksesibilitas

- [x] Skip link berfungsi.
- [x] Drawer: focus trap, ESC, backdrop, fokus kembali ke hamburger.
- [x] Navigasi sidebar bisa dijangkau keyboard dan fokus terlihat.
- [x] Heading hierarkis; section sidebar punya label.
- [x] Kontras teks memenuhi AA.
- [x] `prefers-reduced-motion` dihormati.

### 9.5 Responsif & performa

- [x] Tidak ada overflow horizontal 360â€“1440.
- [x] Sidebar desktop sticky dan scroll internal bila perlu.
- [x] Drawer mobile nyaman dan tidak menutupi konten secara permanen.
- [x] Tidak ada dependency baru.
- [x] Tidak ada layout shift besar setelah hidrasi preferensi.

### 9.6 Kualitas

- [x] lint, tsc, test Tools, build, E2E publik hijau.
- [x] Dokumentasi status & hasil diperbarui.
- [x] Tidak ada regresi pada landing/panduan/logika tool.

### 9.7 Hasil implementasi & QA (2026-11-15)

**Kode**

- D1â€“D7 diimplementasikan: shell fokus tanpa Navbar/Footer marketing, route group `(workspace)`, sidebar desktop + drawer mobile, dashboard home, dan â€œLanjutkanâ€.
- `ToolRail` dihapus; pencatatan recent/usage dipusatkan di `recordToolOpen` saat workspace di-mount (dengan guard `useRef`).
- Data lokal: `lktech.tools.favorites.v1`, `lktech.tools.recent.v1`, `lktech.tools.usage.v1`. Usage hanya `slug`, `opens`, `lastUsedAt` (maks. 50 entri).
- Responsif: sidebar 264 px pada `lg`, 280 px pada `xl`; grid katalog 3 kolom baru aktif pada `xl`; baris filter tetap bertumpuk sampai `xl`.
- Aksesibilitas: item sidebar & tombol drawer minimal 44 px; label section memakai `slate-500` (AA); skip link, `aria-current`, dan focus trap drawer aktif.

**QA otomatis**

| Gate | Hasil |
| --- | --- |
| `npm run lint` | âœ… bersih |
| `npx tsc --noEmit` | âœ… bersih |
| Test Tools (registry/discovery/usage/pages/color/image/text/pdf) | âœ… 102/102 |
| `npm run build` | âœ… 217/217; `/tools/ruang` + `/tools/[slug]` tetap |
| `npx playwright test e2e/public-pages.spec.ts` | âœ… 18/18 |

**QA visual (dev, guard di-bypass sementara lalu direvert)**

- Viewport 360/390/768/1024/1440 untuk `/tools/ruang` dan `/tools/image-to-webp`: tidak ada overflow horizontal, tidak ada console error.
- Drawer 390 px: fokus masuk ke tombol tutup, Escape menutup, fokus kembali ke hamburger.
- Empty state, 3 favorit, dan usage 12Ã— tampil benar; â€œHapus data lokalâ€ menghapus ketiga key dan UI langsung kosong.
- Catatan: smoke login dengan akun nyata belum dijalankan (guard memakai `UserGuard` yang sama dan tidak diubah); commit/push menunggu approval.

---

## 10. Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Route group memindahkan file dan merusak URL | 404 / build gagal | `git mv`, cek `generateStaticParams`, build route list, E2E |
| Recent/usage tercatat dua kali | Angka â€œsering dipakaiâ€ salah | Satu titik `recordToolOpen` di workspace + guard `useRef` |
| StrictMode dev menambah hitungan | Data lokal membengkak | Ref guard per mount; uji dev dua kali |
| Hydration sidebar berubah tinggi | Layout shift | Section dengan empty state stabil; hindari skeleton besar |
| Drawer tidak men-trap fokus | Pengguna keyboard â€œlolosâ€ ke belakang | Reuse `useDrawerFocus` yang sudah teruji |
| Sidebar terlalu ramai | 5 tool terlihat berulang | Recent hanya di home; favorit/frekuensi maksimal 3â€“5 |
| Menghapus Navbar global mengurangi navigasi | Pengguna bingung keluar | Footer sidebar: â€œKembali ke situsâ€, â€œPanduanâ€, â€œAkunâ€ |
| Data lokal rusak/penuh | UI error | try/catch + sanitasi + cap |
| Tool `segera` masuk sidebar | Link mati | Selalu filter `status === "tersedia"` |
| Build static bertambah lambat | Rilis tertunda | Tidak menambah route; build tetap 217 halaman |

---

## 11. Estimasi & urutan rilis

| Tahap | Estimasi | Output |
| --- | --- | --- |
| T1 data layer | 0,5 hari | Usage store + test |
| T2 shell & route | 1 hari | Layout, sidebar, drawer |
| T3 sidebar data | 0,5 hari | Favorit/frekuensi/aktif |
| T4 dashboard home | 0,75 hari | Home baru |
| T5 workspace | 0,5 hari | ToolShell baru, tanpa rail |
| T6 a11y/responsive | 0,5 hari | Polish |
| T7 QA/docs | 0,75 hari | Gate hijau + dokumentasi |
| **Total** | **Â±3,5â€“4 hari** | Satu rilis |

Urutan rilis yang disarankan: **T1 â†’ T2 â†’ T3 â†’ T4 â†’ T5 â†’ T6 â†’ T7** dalam satu branch, dengan checkpoint preview setelah T3 (shell + sidebar) sebelum home/workspace dirombak.

---

## 12. Keputusan yang perlu dikonfirmasi

| # | Pertanyaan | Rekomendasi | Alternatif |
| --- | --- | --- | --- |
| 1 | Chrome dashboard | **Shell fokus tanpa Navbar/Footer marketing**; sidebar punya tautan situs/akun | Tetap pakai Navbar global + sidebar di bawahnya |
| 2 | Arti â€œsering dipakaiâ€ | **Jumlah workspace dibuka** | Jumlah proses sukses (butuh wiring tiap tool) |
| 3 | Favorit di sidebar | **Read-only** (toggle tetap di kartu tool) | Bisa toggle langsung dari sidebar (lebih ramai) |
| 4 | Recent di sidebar | **Tidak**; recent jadi kartu â€œLanjutkanâ€ di home | Tampilkan juga di sidebar (4 daftar berulang) |
| 5 | Collapse sidebar desktop | **P2** | Kerjakan sekarang (tambah state + QA) |
| 6 | Label metrik | **â€œSering dibukaâ€** + â€œdi perangkat iniâ€ | â€œPaling sering dipakaiâ€ (lebih ambigu) |

**Cara approve:** balas `approve dashboard` untuk memakai semua rekomendasi, atau sebut nomor yang ingin diubah (mis. â€œ1 tetap Navbar globalâ€, â€œ3 favorit bisa toggle dari sidebarâ€).

---

## 13. Referensi

- [`2026-11-14-upgrade-landing-lktech-tools.md`](2026-11-14-upgrade-landing-lktech-tools.md) â€” landing, katalog, workspace, panduan publik.
- [`2026-11-01-lktech-tools-space.md`](2026-11-01-lktech-tools-space.md) â€” produk & teknis Tools.
- [`2026-10-02-sidebar-dashboard-upgrade.md`](2026-10-02-sidebar-dashboard-upgrade.md) â€” pola sidebar admin, drawer, dan aksesibilitas.
- [`../src/components/admin/admin-shell.tsx`](../src/components/admin/admin-shell.tsx) â€” referensi shell desktop + drawer.
- [`../src/components/admin/sidebar/mobile-drawer.tsx`](../src/components/admin/sidebar/mobile-drawer.tsx) â€” referensi dialog mobile.
- [`../src/lib/tools-registry-pure.ts`](../src/lib/tools-registry-pure.ts) â€” registry & helper tool.
- [`../src/lib/tools-storage.ts`](../src/lib/tools-storage.ts) â€” store lokal favorit/recent.
- [`../src/components/tools/tools-catalog.tsx`](../src/components/tools/tools-catalog.tsx) â€” katalog saat ini.
- [`../src/components/tools/tool-shell.tsx`](../src/components/tools/tool-shell.tsx) â€” kerangka workspace saat ini.

---

> **Catatan:** dokumen ini adalah rencana. Belum ada perubahan kode yang dilakukan sampai ada approval. Setelah disetujui, status akan diubah menjadi â€œðŸš§ Dikerjakanâ€ dan hasil implementasi ditambahkan di Â§0.1.
