# Tech Stack — Website LKTech

> Dokumen ini menjelaskan pilihan teknologi yang digunakan untuk membangun website LKTech. Pengembangan dilakukan **secara bertahap (iteratif)**, dimulai dari **Landing Page / Home**.

---

## 1. Ringkasan Stack

| Kategori | Teknologi |
| --- | --- |
| Framework | **Next.js** (App Router) |
| Bahasa | **TypeScript** |
| Styling | **Tailwind CSS** |
| UI Components | **shadcn/ui** + **Radix UI** |
| Ikon | **lucide-react** |
| Animasi | **Framer Motion** |
| Forms & Validasi | **React Hook Form** + **Zod** |
| Database | **Firebase Firestore** |
| Autentikasi | **Firebase Authentication** |
| Penyimpanan Gambar | **Cloudinary** |
| Integrasi Chat | **WhatsApp (deep link / wa.me)** |
| Hosting | **Vercel** (frontend) |
| Package Manager | **pnpm** |
| Linting & Format | **ESLint** + **Prettier** |
| Version Control | **Git** + **GitHub** |

---

## 2. Arsitektur Umum

```
┌─────────────────────────────────────────────┐
│                 Klien (Browser)             │
└───────────────────────┬─────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────┐
│        Next.js (App Router) — Vercel        │
│  - Landing Page / Home                       │
│  - Halaman Layanan / Produk (bertahap)       │
│  - Dashboard Admin (bertahap)                │
└───────┬───────────────┬──────────────┬───────┘
        │               │              │
        ▼               ▼              ▼
┌──────────────┐ ┌─────────────┐ ┌────────────┐
│  Firebase    │ │ Cloudinary  │ │  WhatsApp  │
│  Firestore   │ │ (gambar)    │ │  (wa.me)   │
│  + Auth      │ │             │ │            │
└──────────────┘ └─────────────┘ └────────────┘
```

---

## 3. Penjelasan Pilihan Teknologi

### 3.1 Framework: Next.js + TypeScript
- **Next.js (App Router)** dipilih karena mendukung:
  - **SSR/SSG** → landing page cepat dimuat & ramah SEO.
  - **Routing berbasis folder** → mudah dikembangkan bertahap (home → layanan → portofolio → dashboard).
  - **API Routes** → bisa jadi backend ringan untuk endpoint yang perlu rahasia (mis. Cloudinary signed upload).
- **TypeScript** → kode lebih aman, terstruktur, dan minim bug saat proyek membesar.

### 3.2 Styling: Tailwind CSS + shadcn/ui
- **Tailwind CSS** → styling cepat, konsisten, dan mudah dikustom tema (termasuk warna primary).
- **shadcn/ui + Radix UI** → komponen siap pakai (button, card, navbar, dialog) yang aksesibel dan mudah diubah.
- **lucide-react** → ikon ringan dan konsisten.
- **Framer Motion** → animasi halus untuk landing page yang modern.

### 3.3 Database: Firebase Firestore
- Database **NoSQL berbasis dokumen**, cocok untuk data seperti:
  - Daftar layanan/produk
  - Portofolio proyek
  - Testimoni klien
  - Pesan/lead dari form kontak
- Realtime & mudah diintegrasikan dengan Next.js.
- Skema fleksibel → memudahkan eksperimen di tahap awal.

### 3.4 Autentikasi: Firebase Authentication
- Menangani login admin/klien (mis. Google & Email/Password).
- Digunakan untuk melindungi **Dashboard Admin** (pengelolaan konten & lead).
- Terintegrasi langsung dengan Firestore lewat Security Rules.

### 3.5 Penyimpanan Gambar: Cloudinary
- Menyimpan & mengoptimalkan gambar (logo, thumbnail portofolio, banner).
- Fitur unggulan yang dipakai:
  - Auto-compress & auto-format (WebP/AVIF).
  - Transformasi URL on-the-fly (resize, crop, quality).
  - Upload via **signed upload** melalui API route agar API secret tidak terekspos ke browser.

### 3.6 Integrasi WhatsApp (tipis)
- Menggunakan **deep link `wa.me`** — ringan, tanpa biaya, tanpa backend khusus.
- Implementasi:
  - Tombol "Chat via WhatsApp" di navbar & section kontak.
  - Pesan otomatis terisi (kustom per konteks, mis. "Halo LKTech, saya tertarik membuat website...").
- Opsi lanjutan (nanti, bila perlu): WhatsApp Cloud API untuk notifikasi otomatis.

### 3.7 Hosting & Tooling
- **Vercel** → deploy Next.js paling mulus, mendukung preview per branch.
- **pnpm** → install dependency cepat & hemat ruang.
- **ESLint + Prettier** → kode konsisten.
- **Git + GitHub** → kontrol versi dan kolaborasi.

---

## 4. Palet Warna / Branding

### Warna Primary
| Nama | Kode HEX | Penggunaan |
| --- | --- | --- |
| **Primary** | `#004EDF` | Tombol utama, link aktif, aksen, highlight brand |

### Saran Palet Pendukung
| Nama | Kode HEX | Penggunaan |
| --- | --- | --- |
| Primary (Brand) | `#004EDF` | Warna utama brand |
| Primary Dark | `#003BB3` | Hover / state aktif tombol |
| Primary Light | `#4D82EC` | Aksen lembut, background highlight |
| Secondary | `#0A0F1E` | Teks utama / dark mode base |
| Neutral / Gray | `#64748B` | Teks sekunder, border |
| Background | `#FFFFFF` | Latar utama terang |
| Surface | `#F8FAFC` | Kartu / section selang-seling |

> Warna di atas masih saran; dapat disesuaikan saat sesi branding/desain visual.

### Contoh Konfigurasi Tailwind (theme)
```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#004EDF",
          dark: "#003BB3",
          light: "#4D82EC",
        },
        secondary: "#0A0F1E",
        surface: "#F8FAFC",
      },
    },
  },
};
```

### Contoh Variabel CSS (design token)
```css
:root {
  --color-primary: #004EDF;
  --color-primary-dark: #003BB3;
  --color-primary-light: #4D82EC;
  --color-secondary: #0A0F1E;
  --color-surface: #F8FAFC;
  --color-text: #0A0F1E;
  --color-text-muted: #64748B;
}
```

---

## 5. Struktur Folder (Rencana)

```
lktech-web/
├─ public/
│  └─ logo/
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/
│  │  │  ├─ page.tsx          # Landing Page / Home
│  │  │  ├─ layanan/
│  │  │  └─ portofolio/
│  │  ├─ (dashboard)/
│  │  │  └─ admin/
│  │  └─ api/
│  │     └─ cloudinary/       # signed upload endpoint
│  ├─ components/
│  │  ├─ ui/                  # komponen shadcn/ui
│  │  └─ sections/            # section landing page
│  ├─ lib/
│  │  ├─ firebase.ts          # init Firebase (client)
│  │  ├─ cloudinary.ts        # helper Cloudinary
│  │  └─ whatsapp.ts          # helper deep link wa.me
│  ├─ hooks/
│  └─ types/
├─ docs/                      # dokumentasi pengembangan
│  ├─ identitas-perusahaan.md
│  └─ tech-stack.md
└─ tailwind.config.ts
```

---

## 6. Rencana Pengembangan Bertahap

| Tahap | Fokus | Status |
| --- | --- | --- |
| **1** | Landing Page / Home (hero, layanan, keunggulan, CTA, kontak, footer) | 🔜 Berikutnya |
| 2 | Halaman Layanan / Produk (detail tiap layanan) | ⏳ Rencana |
| 3 | Halaman Portofolio | ⏳ Rencana |
| 4 | Halaman Kontak + form ke Firestore + tombol WhatsApp | ⏳ Rencana |
| 5 | Firebase Auth + Dashboard Admin pengelolaan konten | ⏳ Rencana |
| 6 | Cloudinary upload gambar (portofolio/banner) | ⏳ Rencana |
| 7 | Optimasi SEO, performa, dan aksesibilitas | ⏳ Rencana |

---

## 7. Catatan Teknis Penting

- **Jangan** menyimpan API secret/keys di sisi klien. Gunakan environment variables (`.env.local`) dan API route untuk operasi sensitif (mis. Cloudinary signed upload).
- Isi environment yang dibutuhkan:
  ```env
  NEXT_PUBLIC_FIREBASE_API_KEY=
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
  NEXT_PUBLIC_FIREBASE_APP_ID=

  CLOUDINARY_CLOUD_NAME=
  CLOUDINARY_API_KEY=
  CLOUDINARY_API_SECRET=

  NEXT_PUBLIC_WHATSAPP_NUMBER=
  ```
- Gunakan **Firestore Security Rules** untuk membatasi baca/tulis sesuai peran.
- Optimalkan gambar lewat Cloudinary (jangan simpan gambar mentah besar).

---

*Dokumen ini hidup dan dapat diperbarui seiring kebutuhan proyek.*
