# Blueprint Landing Page — LKTech

> Acuan desain & konten untuk **Tahap 1: Landing Page / Home**.
> Karakter: **clean, modern, futuristik, interactive** — light mode only, banyak animasi, kaya visual.

---

## 1. Prinsip Desain

| Aspek | Keputusan |
| --- | --- |
| Tema | **Light mode only** (tidak ada dark mode) |
| Nuansa | **Soft & rounded** + **Futuristik & glassy** |
| Animasi | **Smooth & fluid** (banyak gerak, tapi performa dijaga) |
| First impression | "Waah" — hero interaktif, bukan company profile biasa |
| Warna Primary | `#004EDF` |
| Visual | Dominan SVG ilustrasi + abstract shapes + placeholder gambar |
| Anti-monoton | Kombinasi teks, gambar, ikon, mockup, grafik — bukan blok teks saja |

---

## 2. Efek Interaktif yang Dipakai

1. **Intro / Loading Animation** — splash singkat saat pertama buka.
2. **Custom Cursor** — lingkaran halus mengikuti kursor pada desktop.
3. **Cursor-follow / Parallax** — elemen hero bergerak mengikuti kursor.
4. **Animated Gradient Background** — aurora bergerak lembut.
5. **Scroll Reveal** — section muncul saat masuk viewport.
6. **Animated Counters** — angka statistik menghitung naik.
7. **3D Tilt Cards** — kartu layanan miring saat hover.
8. **Marquee Ticker** — logo/fitur berjalan otomatis.

> Catatan performa: semua animasi ringan (transform/opacity), `prefers-reduced-motion` dihormati, custom cursor & parallax hanya di perangkat dengan pointer presisi.

---

## 3. Struktur Halaman & Konten

### 3.1 Navbar
- Logo LKTech (dari folder `logo lktect/`).
- Menu: **Beranda · Layanan · Keunggulan · Harga · FAQ**
- CTA kanan: tombol **"Chat via WhatsApp"** (primary).
- Efek: sticky + glass blur saat di-scroll, underline animasi pada menu.

### 3.2 Hero Section (PALING "WOW")
- **Eyebrow/badge**: "Solusi Digital untuk Bisnis Anda"
- **Headline**: **"Teknologi Modern, Hasil Nyata"**
- **Subheadline**: 1–2 kalimat — LKTech membantu bisnis naik kelas lewat website, aplikasi mobile, dan konsultasi teknologi yang aksesibel & terjangkau.
- **2 CTA**: 
  - Primary: **"Mulai Konsultasi"** → WhatsApp
  - Secondary: **"Lihat Layanan"** → scroll ke section layanan
- **Visual**: mockup perangkat mengambang (browser + phone) dengan glass panel, blob gradient, elemen parallax yang bergerak mengikuti kursor.
- **Interaksi**: cursor-follow glow, floating animation, animated gradient background.

### 3.3 Trusted By
- Teks kecil: "Dipercaya oleh bisnis & institusi"
- Marquee ticker logo klien (placeholder: Logo Klien A, B, C, …).
- Catatan: data placeholder, ganti dengan logo asli nanti.

### 3.4 Layanan / Services
- Judul: **"Layanan Kami"**
- 5 kartu dengan **3D tilt on hover**:
  1. **Pembuatan Website** — profil, landing page, e-commerce, web app.
  2. **Aplikasi Mobile** — Android & iOS untuk bisnis.
  3. **Konsultasi Teknologi** — arsitektur, strategi digital.
  4. **Desain & Branding** — logo, identitas brand, UI/UX.
  5. **Digital Marketing** — konten & pemasaran digital.
- Tiap kartu: ikon, judul, deskripsi, gradient accent, hover animasi.

### 3.5 Keunggulan / Why Us
- Judul: **"Kenapa Memilih LKTech?"**
- 6 poin dengan ikon:
  - Harga Kompetitif
  - Layanan Personal
  - Kualitas & Clean Code
  - Cepat & Efisien
  - Jujur & Transparan
  - Inovatif
- Layout: grid dengan scroll reveal bertahap.

### 3.6 Proses Kerja / How It Works
- Judul: **"Alur Kerja Kami"**
- 4 langkah (dengan garis/animasi penghubung):
  1. **Konsultasi** — pahami kebutuhan.
  2. **Desain** — rancang solusi & tampilan.
  3. **Pengembangan** — bangun sistem.
  4. **Launch & Dukungan** — rilis dan pendampingan.

### 3.7 Statistik / Numbers
- Animated counters:
  - **20+** Proyek
  - **15+** Klien
  - **3** Layanan Inti
  - **100%** Komitmen
- (Angka modest & jujur untuk perusahaan baru.)

### 3.8 Testimoni Klien
- Judul: **"Kata Klien Kami"**
- 3 kartu testimoni (dummy, realistis — akan diganti nanti): foto placeholder, nama, jabatan/perusahaan, rating bintang, kutipan.
- Efek: scroll reveal, kartu tilt ringan.

### 3.9 Harga / Pricing
- Judul: **"Paket Layanan"**
- 3 tier: **Basic · Professional · Enterprise**
- **Tanpa nominal** → tiap kartu menampilkan fitur + tombol "Konsultasi Gratis" (WhatsApp).
- Tier Professional diberi highlight "Populer".

### 3.10 FAQ
- Judul: **"Pertanyaan Umum"**
- Accordion animasi, contoh pertanyaan:
  - Berapa lama proses pembuatan website?
  - Apakah ada garansi/maintenance?
  - Bagaimana cara pembayarannya?
  - Bisakah request fitur khusus?
  - Apakah bisa konsultasi dulu sebelum order?

### 3.11 CTA Akhir / Contact
- Blok besar dengan gradient `#004EDF`, teks mengajak, tombol **"Chat via WhatsApp"** + tombol **"Kirim Email"**.
- Visual: abstract shapes / glass.

### 3.12 Footer
- Logo + deskripsi singkat.
- Kolom navigasi: Layanan, Perusahaan, Kontak.
- Sosial media (placeholder), WhatsApp, email.
- Copyright © 2026 LKTech.

---

## 4. Sistem Warna

| Token | HEX | Penggunaan |
| --- | --- | --- |
| Primary | `#004EDF` | Brand, tombol utama, aksen |
| Primary Dark | `#003BB3` | Hover tombol |
| Primary Light | `#4D82EC` | Aksen lembut, gradient |
| Secondary | `#0A0F1E` | Teks utama |
| Muted | `#64748B` | Teks sekunder |
| Background | `#FFFFFF` / `#F8FAFC` | Latar |
| Border | `#E2E8F0` | Garis |

---

## 5. Tipografi

- **Display/Heading**: font modern geometris (mis. *Space Grotesk* / *Sora*).
- **Body**: *Inter*.
- Ukuran responsif, heading besar & tegas untuk kesan futuristik.

---

## 6. Aset

| Aset | Sumber | Status |
| --- | --- | --- |
| Logo | `logo lktect/lktech-logo.svg`, `lktech-logo-with-text.svg` | ✅ Ada |
| Ilustrasi | SVG buatan sendiri | 🔜 Dibuat |
| Gambar portofolio | Placeholder | 🔜 Dibuat |
| Foto testimoni | Placeholder avatar | 🔜 Dibuat |

---

## 7. Teknis & Performa

- Next.js App Router + TypeScript + Tailwind.
- Animasi: **Framer Motion**.
- Ikon: **lucide-react**.
- Custom cursor & parallax hanya saat `(pointer: fine)`.
- Hormati `prefers-reduced-motion`.
- Lazy-load section berat, gambar pakai `next/image` / Cloudinary nanti.
- Target: skor performa & aksesibilitas tetap tinggi meski animasi banyak.

---

## 8. Checklist Tahap 1

- [ ] Setup project Next.js + Tailwind + warna primary
- [ ] Font (Space Grotesk + Inter)
- [ ] Navbar (glass sticky)
- [ ] Intro loader + custom cursor
- [ ] Hero interaktif
- [ ] Trusted By (marquee)
- [ ] Services (3D tilt)
- [ ] Why Us
- [ ] Process
- [ ] Stats (counter)
- [ ] Testimonials
- [ ] Pricing
- [ ] FAQ (accordion)
- [ ] CTA akhir + Footer
- [ ] Helper WhatsApp
- [ ] Responsive check (mobile/tablet/desktop)

---

*Dokumen acuan dinamis untuk pengembangan landing page LKTech.*
