# Task Selanjutnya — LKTech Website

> Dokumen ini mencatat pekerjaan yang **belum terselesaikan** & rencana lanjutan.
> Terakhir diperbarui: sesi Blog/Artikel.

---

## ✅ Sudah Selesai (ringkasan)

| # | Fitur | Status |
| --- | --- | --- |
| 1 | Landing page (hero, layanan, keunggulan, proses, stats, testimoni, harga, FAQ, CTA, footer) | ✅ |
| 2 | Halaman Layanan (daftar + detail per layanan) | ✅ |
| 3 | Halaman Portofolio (galeri + studi kasus) | ✅ |
| 4 | Halaman Kontak + form ke Firestore (+ fallback WhatsApp) | ✅ |
| 5 | Dashboard Admin (login Firebase Auth, kelola lead & media) | ✅ |
| 6 | Cloudinary signed upload (gambar portofolio) | ✅ |
| 7 | SEO / Performa / Aksesibilitas (metadata, robots, sitemap, JSON-LD, OG image, favicon) | ✅ |
| 8 | Deploy ke Vercel (live di `lktech.vercel.app`) | ✅ |
| 9 | Data kontak dinamis (halaman Pengaturan dashboard) | ✅ |
| 10 | CRUD Portofolio dari dashboard | ✅ |
| 11 | Notifikasi email saat lead masuk (Resend) | ✅ |
| 12 | Blog/Artikel + CRUD dari dashboard | ✅ |

---

## 🔜 Belum Terselesaikan

### Prioritas Menengah

#### 1. Analytics & Monitoring
- [ ] Pasang **Vercel Analytics** (atau Google Analytics 4) untuk memantau pengunjung.
- [ ] Pasang **error tracking** (Sentry atau sejenis) untuk mendeteksi bug di produksi.
- [ ] (Opsional) Event tracking untuk konversi (klik WhatsApp, submit form).

#### 2. Domain Sendiri
- [ ] Beli domain (mis. `lktech.id` / `lktech.com`).
- [ ] Sambungkan domain ke Vercel.
- [ ] Update `SITE_URL` di env Vercel ke domain baru.
- [ ] Tambahkan domain ke **Firebase Auth → Authorized domains**.
- [ ] Update `identitas-perusahaan.md` bagian kontak/website.

### Prioritas Lanjutan (Nice to Have)

#### 3. Upload Gambar Sampul Langsung di Editor Blog
- [ ] Integrasikan `ImageUploader` ke form artikel (`/admin/blog`) agar sampul bisa diunggah langsung, bukan hanya tempel URL.

#### 4. Isi Data Asli
- [ ] Ganti konten **portofolio** placeholder dengan proyek nyata (via `/admin/projects`).
- [ ] Ganti **testimoni** placeholder dengan yang asli.
- [ ] Isi **logo klien** asli (bagian "Trusted By").
- [ ] Lengkapi `identitas-perusahaan.md` (kontak, sosmed, tagline resmi).
- [ ] Update `identitas-perusahaan.md` & `tech-stack.md` bila ada perubahan.

#### 5. Verifikasi Domain Email (Resend)
- [ ] Verifikasi domain di Resend agar email notifikasi bisa dikirim ke alamat mana pun (saat ini hanya ke email terdaftar Resend).
- [ ] Ganti `EMAIL_FROM` ke `LKTech <notifikasi@domain-anda>`.

#### 6. Peningkatan Dashboard (opsional)
- [ ] Filter/pencarian lead lebih lanjut + ekspor CSV.
- [ ] Statistik lead (grafik tren).
- [ ] Kelola layanan (services) dari dashboard (saat ini masih di kode).
- [ ] Kelola FAQ & harga dari dashboard.

#### 7. Peningkatan SEO (lanjutan)
- [ ] Daftarkan ke **Google Search Console** + submit sitemap.
- [ ] Daftarkan **Google Business Profile**.
- [ ] (Opsional) Halaman kategori/tag blog.

---

## ⚙️ Catatan Teknis Penting

### Environment Variables (di Vercel & `.env.local`)
```
# Firebase (client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server-only)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Admin
ADMIN_EMAILS=lupyariestaa@gmail.com

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# WhatsApp
NEXT_PUBLIC_WHATSAPP_NUMBER=6283159688549

# Site SEO
SITE_URL=https://lktech.vercel.app

# Email (Resend)
RESEND_API_KEY=
EMAIL_FROM=LKTech <onboarding@resend.dev>
LEAD_NOTIFY_EMAILS=lupyariestaa@gmail.com
```

### Firestore Security Rules
- File: `firestore.rules`
- **PENTING:** setiap ada koleksi baru (`settings`, `projects`, `articles`), rules harus di-**Publish ulang** di Firebase Console → Firestore → Rules.
- Koleksi: `leads`, `media`, `settings`, `projects`, `articles`.

### Deploy
- Repo GitHub: `https://github.com/lupyariestaa/lktech`
- Auto-deploy via Vercel (push ke `main` → redeploy otomatis).
- Setiap perubahan kode → `git push` → tunggu Vercel build.

### Perintah Penting
```bash
npm run dev      # jalankan dev server lokal
npm run build    # build produksi (cek error sebelum push)
npm run lint     # lint
```

---

## 📌 Quick Start Sesi Berikutnya
1. `npm run dev` (pastikan port 3000 tidak dipakai project lain).
2. Baca dokumen ini untuk task yang belum selesai.
3. Pilih task & lanjutkan.

> Dokumentasi setup admin lengkap: lihat `ADMIN-SETUP.md`.
