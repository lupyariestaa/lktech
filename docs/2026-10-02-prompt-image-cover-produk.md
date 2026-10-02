# PROMPT GENERATE IMAGE — COVER PRODUK LKTech

> **Dokumen untuk:** membuat gambar cover (thumbnail/hero) tiap produk paket LKTech memakai AI image generator (Midjourney, DALL·E, Ideogram, Leonardo, Flux, dsb.).
> **Cara pakai:** untuk tiap produk, salin blok **PROMPT** ke AI generator. Lampirkan (attach) file logo LKTech sebagai referensi.
> **Jumlah prompt:** 6 (sesuai 6 produk aktif di website).

---

## ⚙️ ATURAN GLOBAL (berlaku untuk SEMUA prompt)

Aturan ini **sudah ditulis ulang di setiap prompt** agar kamu tinggal salin tanpa perlu mengingat — tapi di sini dijelaskan supaya kamu paham maksudnya.

| Aspek | Ketentuan |
|---|---|
| **Rasio / ukuran** | **16:9 landscap**e, resolusi tinggi (mis. 1920×1080 atau lebih) |
| **Background** | **Putih minimalis & bersih** (clean white). Boleh gradasi sangat halus dari putih ke biru muda di sudut |
| **Warna primary** | **Biru LKTech `#004EDF`** (primary). Aksen: `#003BB3` (dark), `#4D82EC` (light), `#EEF3FF` (sangat muda) |
| **Warna teks** | Judul: hampir hitam pekat `#0A0F1E` (secondary); subteks: abu `#64748B` |
| **Gaya** | **Modern, clean, profesional.** Teks TIDAK banyak (simple & jelas). Plenty of white space |
| **Layout** | **Kiri** = teks (logo di pojok kiri-atas, lalu judul hook, lalu subteks singkat, lalu CTA). **Kanan** = elemen utama (laptop + smartphone) menampilkan produk |
| **Elemen utama** | **Laptop + smartphone** modern, layar menampilkan produk yang dimaksud |
| **Elemen pemanis** | **3D playful** di sekitar elemen utama / bingkai (bentuk geometris mengambang, lembut, warna biru) |
| **Logo LKTech** | **Kiri-atas**, di atas judul teks |
| **Kualitas** | **Super HD, detail tajam, no typo, bersih** |

### 💡 Tips teknis per generator
- **Midjourney:** tambahkan `--ar 16:9 --style raw --v 6` di akhir prompt.
- **Ideogram / DALL·E 3 / Flux:** paling baik untuk **teks di dalam gambar** (judul & CTA). Salin prompt apa adanya.
- **Attach logo:** lampirkan file logo, lalu tulis di prompt bahwa logo harus ditempel di kiri-atas. Sebagian tool butuh referensi gambar (`--cref` di Midjourney, atau "reference image" di Leonardo/Flux).
- **Jika teks sering typo:** generate tanpa teks (atau pakai placeholder), lalu tambahkan teks & logo manual di editor (Canva/Figma/Photoshop). Prompt di bawah sudah menyertakan alternatif "no-text version".

### 🎨 Palet warna (salin jika perlu)
```
Primary Blue   : #004EDF
Primary Dark   : #003BB3
Primary Light  : #4D82EC
Primary Soft   : #EEF3FF
Text Dark      : #0A0F1E
Text Muted     : #64748B
Background     : #FFFFFF
```

---

## 1️⃣ PAKET WEBSITE PORTFOLIO

**Produk:** Website portfolio profesional siap pakai (Basic / Profesional / Custom).
**Pesan utama:** Tampilkan karya & diri Anda secara profesional.

### PROMPT

```
A modern, clean, professional marketing cover image, 16:9 landscape, super HD, sharp details, minimal and elegant.

LAYOUT:
Left side — content text area (approximately left 45% of the frame) with generous white space.
Right side — hero product visual: a sleek modern silver laptop and a premium smartphone side by side, both screens showing a beautiful minimalist personal PORTFOLIO website (elegant hero section with a profile photo, name text, a photo gallery grid of creative work/projects, and a clean navigation bar). The laptop and smartphone float slightly with soft realistic shadows.

TOP-LEFT CORNER: place the LKTech logo (use the attached logo image exactly as provided) at the top-left, above the headline.

HEADLINE (largest text, bold modern sans-serif, dark navy #0A0F1E, Indonesian language): "Website Portfolio Profesional"
SUBHEADLINE (smaller, muted gray #64748B, keep it very short): "Tampilkan karya Anda secara online"
CTA BUTTON (rounded pill button, solid LKTech blue #004EDF, white bold text): "Mulai Sekarang"

DECORATIVE 3D ELEMENTS: playful glossy 3D shapes floating around the laptop and smartphone and near the frame edges — soft rounded spheres, a 3D cursor arrow, small image/photo frame icons, subtle glossy rings, tiny star sparkles — all in LKTech blue tones (#004EDF, #003BB3, #4D82EC) with soft glossy plastic/clay render style, gentle shadows, not cluttered.

BACKGROUND: clean minimalist WHITE (#FFFFFF), with a very subtle soft blue gradient glow (#EEF3FF) in one corner. Lots of negative space. Do not fill the background with patterns.

STYLE: modern SaaS / tech startup aesthetic, professional, airy, high-end, crisp, no clutter, minimal text only. Ultra high resolution, clean edges, no typography errors.

BRAND COLORS: primary blue #004EDF, dark blue #003BB3, light blue #4D82EC.

NEGATIVE: no messy text, no lorem ipsum, no spelling errors, no watermark, no distorted logos, no clutter, avoid oversaturated colors.
```

**Alternatif tanpa teks (jika AI sering salah teks):** hapus bagian `HEADLINE`, `SUBHEADLINE`, `CTA BUTTON` dan ganti dengan:
```
Leave clean empty space at the top-left for a logo, and a clear empty area below it for a headline and a button (do not render any text).
```

---

## 2️⃣ PAKET WEBSITE COMPANY PROFILE

**Produk:** Website profil perusahaan (Basic / Profesional / Custom).
**Pesan utama:** Wajah resmi & kredibel perusahaan Anda.

### PROMPT

```
A modern, clean, professional marketing cover image, 16:9 landscape, super HD, sharp details, minimal and elegant.

LAYOUT:
Left side — content text area (approximately left 45% of the frame) with generous white space.
Right side — hero product visual: a sleek modern silver laptop and a premium smartphone side by side, both screens showing a professional CORPORATE / COMPANY PROFILE website (elegant corporate hero with a company name, a clean business team photo, a services overview grid, statistics badges like "500+ clients", and a professional navigation bar). The laptop and smartphone float slightly with soft realistic shadows.

TOP-LEFT CORNER: place the LKTech logo (use the attached logo image exactly as provided) at the top-left, above the headline.

HEADLINE (largest text, bold modern sans-serif, dark navy #0A0F1E, Indonesian language): "Website Company Profile"
SUBHEADLINE (smaller, muted gray #64748B, keep it very short): "Bangun citra profesional bisnis Anda"
CTA BUTTON (rounded pill button, solid LKTech blue #004EDF, white bold text): "Mulai Sekarang"

DECORATIVE 3D ELEMENTS: playful glossy 3D shapes floating around the laptop and smartphone and near the frame edges — soft rounded spheres, glossy office/business icons (briefcase, chart bar, handshake, building), subtle glossy rings, tiny star sparkles — all in LKTech blue tones (#004EDF, #003BB3, #4D82EC) with soft glossy plastic/clay render style, gentle shadows, not cluttered.

BACKGROUND: clean minimalist WHITE (#FFFFFF), with a very subtle soft blue gradient glow (#EEF3FF) in one corner. Lots of negative space. Do not fill the background with patterns.

STYLE: modern SaaS / tech startup aesthetic, professional, trustworthy, airy, high-end, crisp, no clutter, minimal text only. Ultra high resolution, clean edges, no typography errors.

BRAND COLORS: primary blue #004EDF, dark blue #003BB3, light blue #4D82EC.

NEGATIVE: no messy text, no lorem ipsum, no spelling errors, no watermark, no distorted logos, no clutter, avoid oversaturated colors.
```

**Alternatif tanpa teks:** sama seperti di produk #1 (ganti 3 baris teks dengan instruksi ruang kosong).

---

## 3️⃣ PAKET WEBSITE MARKETPLACE (TOKO ONLINE)

**Produk:** Toko online lengkap untuk satu bisnis (Basic / Profesional / Custom).
**Pesan utama:** Jual produk Anda secara online dengan toko sendiri.

### PROMPT

```
A modern, clean, professional marketing cover image, 16:9 landscape, super HD, sharp details, minimal and elegant.

LAYOUT:
Left side — content text area (approximately left 45% of the frame) with generous white space.
Right side — hero product visual: a sleek modern silver laptop and a premium smartphone side by side, both screens showing a modern E-COMMERCE / ONLINE STORE website (clean product catalog grid with product cards, prices in Rupiah, a shopping cart icon with a badge counter, a category menu, and a "add to cart" button). Small floating product boxes and a shopping bag near the devices. The laptop and smartphone float slightly with soft realistic shadows.

TOP-LEFT CORNER: place the LKTech logo (use the attached logo image exactly as provided) at the top-left, above the headline.

HEADLINE (largest text, bold modern sans-serif, dark navy #0A0F1E, Indonesian language): "Website Toko Online"
SUBHEADLINE (smaller, muted gray #64748B, keep it very short): "Jual produk Anda dengan toko sendiri"
CTA BUTTON (rounded pill button, solid LKTech blue #004EDF, white bold text): "Mulai Sekarang"

DECORATIVE 3D ELEMENTS: playful glossy 3D shapes floating around the laptop and smartphone and near the frame edges — soft rounded spheres, a glossy 3D shopping bag, a 3D shopping cart, a small 3D price tag, subtle glossy rings, tiny star sparkles — all in LKTech blue tones (#004EDF, #003BB3, #4D82EC) with soft glossy plastic/clay render style, gentle shadows, not cluttered.

BACKGROUND: clean minimalist WHITE (#FFFFFF), with a very subtle soft blue gradient glow (#EEF3FF) in one corner. Lots of negative space. Do not fill the background with patterns.

STYLE: modern SaaS / tech startup aesthetic, professional, commercial, airy, high-end, crisp, no clutter, minimal text only. Ultra high resolution, clean edges, no typography errors.

BRAND COLORS: primary blue #004EDF, dark blue #003BB3, light blue #4D82EC.

NEGATIVE: no messy text, no lorem ipsum, no spelling errors, no watermark, no distorted logos, no clutter, avoid oversaturated colors.
```

**Alternatif tanpa teks:** sama seperti di produk #1.

---

## 4️⃣ PAKET APLIKASI MOBILE

**Produk:** Aplikasi Android & iOS untuk bisnis (Basic / Profesional / Custom).
**Pesan utama:** Aplikasi mobile untuk bisnis Anda.

### PROMPT

```
A modern, clean, professional marketing cover image, 16:9 landscape, super HD, sharp details, minimal and elegant.

LAYOUT:
Left side — content text area (approximately left 45% of the frame) with generous white space.
Right side — hero product visual: a large premium smartphone in the center-front, with a small secondary smartphone and a modern laptop slightly behind, all screens showing a beautiful MOBILE BUSINESS APP (home screen with product/service cards, a bottom navigation bar, a clean app icon, and a user profile). The devices float with soft realistic shadows, tilted slightly for dynamism.

TOP-LEFT CORNER: place the LKTech logo (use the attached logo image exactly as provided) at the top-left, above the headline.

HEADLINE (largest text, bold modern sans-serif, dark navy #0A0F1E, Indonesian language): "Aplikasi Mobile Bisnis"
SUBHEADLINE (smaller, muted gray #64748B, keep it very short): "Android & iOS untuk bisnis Anda"
CTA BUTTON (rounded pill button, solid LKTech blue #004EDF, white bold text): "Mulai Sekarang"

DECORATIVE 3D ELEMENTS: playful glossy 3D shapes floating around the devices and near the frame edges — soft rounded spheres, glossy 3D app icons, a 3D bell/notification icon, a 3D chat bubble, a 3D smartphone frame, subtle glossy rings, tiny star sparkles — all in LKTech blue tones (#004EDF, #003BB3, #4D82EC) with soft glossy plastic/clay render style, gentle shadows, not cluttered.

BACKGROUND: clean minimalist WHITE (#FFFFFF), with a very subtle soft blue gradient glow (#EEF3FF) in one corner. Lots of negative space. Do not fill the background with patterns.

STYLE: modern SaaS / tech startup aesthetic, mobile-first, professional, airy, high-end, crisp, no clutter, minimal text only. Ultra high resolution, clean edges, no typography errors.

BRAND COLORS: primary blue #004EDF, dark blue #003BB3, light blue #4D82EC.

NEGATIVE: no messy text, no lorem ipsum, no spelling errors, no watermark, no distorted logos, no clutter, avoid oversaturated colors.
```

**Alternatif tanpa teks:** sama seperti di produk #1.

---

## 5️⃣ PAKET LANDING PAGE

**Produk:** Landing page fokus konversi (Basic / Profesional / Custom).
**Pesan utama:** Satu halaman yang fokus mendatangkan pelanggan.

### PROMPT

```
A modern, clean, professional marketing cover image, 16:9 landscape, super HD, sharp details, minimal and elegant.

LAYOUT:
Left side — content text area (approximately left 45% of the frame) with generous white space.
Right side — hero product visual: a sleek modern silver laptop and a premium smartphone side by side, both screens showing a single high-converting LANDING PAGE (a bold hero headline, a friendly call-to-action button, a simple lead form with name/email fields, and trust badges). The laptop and smartphone float slightly with soft realistic shadows.

TOP-LEFT CORNER: place the LKTech logo (use the attached logo image exactly as provided) at the top-left, above the headline.

HEADLINE (largest text, bold modern sans-serif, dark navy #0A0F1E, Indonesian language): "Landing Page yang Menjual"
SUBHEADLINE (smaller, muted gray #64748B, keep it very short): "Ubah pengunjung jadi pelanggan"
CTA BUTTON (rounded pill button, solid LKTech blue #004EDF, white bold text): "Mulai Sekarang"

DECORATIVE 3D ELEMENTS: playful glossy 3D shapes floating around the laptop and smartphone and near the frame edges — soft rounded spheres, a glossy 3D cursor arrow, a 3D "click" button, a 3D funnel, a 3D thumbs-up, subtle glossy rings, tiny star sparkles — all in LKTech blue tones (#004EDF, #003BB3, #4D82EC) with soft glossy plastic/clay render style, gentle shadows, not cluttered.

BACKGROUND: clean minimalist WHITE (#FFFFFF), with a very subtle soft blue gradient glow (#EEF3FF) in one corner. Lots of negative space. Do not fill the background with patterns.

STYLE: modern SaaS / tech startup aesthetic, conversion-focused, professional, airy, high-end, crisp, no clutter, minimal text only. Ultra high resolution, clean edges, no typography errors.

BRAND COLORS: primary blue #004EDF, dark blue #003BB3, light blue #4D82EC.

NEGATIVE: no messy text, no lorem ipsum, no spelling errors, no watermark, no distorted logos, no clutter, avoid oversaturated colors.
```

**Alternatif tanpa teks:** sama seperti di produk #1.

---

## 6️⃣ PAKET WEBSITE SEKOLAH & INSTANSI

**Produk:** Website resmi sekolah / yayasan / instansi (Basic / Profesional / Custom).
**Pesan utama:** Website resmi yang kredibel untuk lembaga Anda.

### PROMPT

```
A modern, clean, professional marketing cover image, 16:9 landscape, super HD, sharp details, minimal and elegant.

LAYOUT:
Left side — content text area (approximately left 45% of the frame) with generous white space.
Right side — hero product visual: a sleek modern silver laptop and a premium smartphone side by side, both screens showing a professional EDUCATION / SCHOOL / INSTITUTION website (a clean campus hero image, an announcement/news section, a "PPDB / Pendaftaran" call-to-action button, a photo gallery of activities, and a school logo placeholder area). The laptop and smartphone float slightly with soft realistic shadows.

TOP-LEFT CORNER: place the LKTech logo (use the attached logo image exactly as provided) at the top-left, above the headline.

HEADLINE (largest text, bold modern sans-serif, dark navy #0A0F1E, Indonesian language): "Website Sekolah & Instansi"
SUBHEADLINE (smaller, muted gray #64748B, keep it very short): "Profil resmi lembaga Anda"
CTA BUTTON (rounded pill button, solid LKTech blue #004EDF, white bold text): "Mulai Sekarang"

DECORATIVE 3D ELEMENTS: playful glossy 3D shapes floating around the laptop and smartphone and near the frame edges — soft rounded spheres, a glossy 3D graduation cap, a 3D book, a 3D calendar, a 3D graduation scroll/diploma, subtle glossy rings, tiny star sparkles — all in LKTech blue tones (#004EDF, #003BB3, #4D82EC) with soft glossy plastic/clay render style, gentle shadows, not cluttered.

BACKGROUND: clean minimalist WHITE (#FFFFFF), with a very subtle soft blue gradient glow (#EEF3FF) in one corner. Lots of negative space. Do not fill the background with patterns.

STYLE: modern SaaS / tech startup aesthetic, professional, trustworthy, airy, high-end, crisp, no clutter, minimal text only. Ultra high resolution, clean edges, no typography errors.

BRAND COLORS: primary blue #004EDF, dark blue #003BB3, light blue #4D82EC.

NEGATIVE: no messy text, no lorem ipsum, no spelling errors, no watermark, no distorted logos, no clutter, avoid oversaturated colors.
```

**Alternatif tanpa teks:** sama seperti di produk #1.

---

## 📋 RINGKASAN PROMPT (daftar cepat)

| # | Produk | Judul (hook) di gambar | Elemen utama di layar |
|---|---|---|---|
| 1 | Website Portfolio | "Website Portfolio Profesional" | Website portfolio + galeri karya |
| 2 | Website Company Profile | "Website Company Profile" | Website korporat + tim + statistik |
| 3 | Website Marketplace | "Website Toko Online" | Toko online + katalog + keranjang |
| 4 | Aplikasi Mobile | "Aplikasi Mobile Bisnis" | App mobile + nav bawah |
| 5 | Landing Page | "Landing Page yang Menjual" | Landing + form + CTA |
| 6 | Website Sekolah & Instansi | "Website Sekolah & Instansi" | Website sekolah + PPDB + galeri |

---

## ✅ GUIDELINE KONSISTENSI (agar 6 gambar seragam)

- **Tata letak identik:** logo kiri-atas → judul → subteks → tombol CTA (kiri); laptop+HP (kanan).
- **Warna identik:** biru `#004EDF` sebagai aksen utama, background putih.
- **Font identik:** sans-serif modern tebal untuk judul, abu untuk subteks.
- **Elemen 3D identik gaya:** glossy clay 3D, lembut, biru; hanya ikon temanya yang beda per produk.
- **Bar & tombol CTA:** bentuk pill (kapsul), biru solid, teks putih.
- **Pencahayaan & bayangan:** lembut & konsisten (soft shadows, terang dari atas).

> **Rekomendasi alur kerja:** generate produk #1 dulu → jika hasilnya sudah pas (layout, warna, gaya 3D), **pakai gambar itu sebagai referensi gaya** (`--cref` / image reference) untuk 5 produk lain, agar konsisten. Ganti hanya judul & elemen di layar + ikon 3D temanya.

> **Jika teks/logo sering salah:** gunakan versi "no-text", lalu susun teks + logo LKTech secara manual memakai Canva/Figma agar hasilnya rapi & presisi. Semua prompt di atas menyediakan instruksi versi tanpa teks.

---

*Dokumen ini berisi 6 prompt siap-salin. Warna primary LKTech: `#004EDF`.*
