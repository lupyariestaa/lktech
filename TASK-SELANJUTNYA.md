# Task Selanjutnya — LKTech Website

> Dokumen ini mencatat pekerjaan yang **belum terselesaikan** & rencana lanjutan.
> Terakhir diperbarui: sesi **Upgrade Sistem Portfolio (F1–F7)**.

---

## 🎉 Sesi Terakhir — Upgrade Sistem Portfolio (F1–F7)

Upgrade sistem portfolio berdasarkan `docs/2026-10-02-upgrade-sistem-portfolio.md`
—— **F1–F6 selesai**; F7 = uji browser & deploy (manual).

| Fase | Hasil | Status |
| --- | --- | --- |
| F1 | Field `featured`/`order` + **generalisasi galeri** (`MediaGallery`/`MediaLightbox`, dipakai Produk & Portfolio) | ✅ |
| F2 | **Detail profesional**: galeri interaktif (thumbnail+lightbox), metrics dinamis, tags, "proyek terkait" relevan, OG image, ratio 16:9 | ✅ |
| F3 | **Daftar kuat**: search + filter kategori & tema + sort + URL state + pagination + empty state | ✅ |
| F4 | **Dashboard**: kelola gambar proyek (MediaPicker+reorder+set cover), toggle Unggulan, urutan, kategori datalist, validasi | ✅ |
| F5 | Penanda **"Contoh"** untuk data demo | ✅ |
| F6 | **SEO**: JSON-LD per proyek (`CreativeWork`+`BreadcrumbList`) + sitemap `lastModified` nyata | ✅ |
| F7 | QA statis ✅ · uji browser & deploy | ⏳ manual |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅.

**Sisa manual:** uji browser (galeri, search/filter/sort, kelola gambar, JSON-LD) + isi data asli proyek + deploy.

---

## 🎉 Sesi Sebelumnya — Revisi Sistem Produk

Revisi 5 poin sistem produk (`docs/2026-10-02-revisi-sistem-produk.md`, FASE 0–7) **selesai**:

| # | Revisi | Hasil |
| --- | --- | --- |
| 1 | Galeri manual → MediaPicker | Field galeri admin pakai `MediaPickerDialog mode="multiple"` + crop 16:9 + reorder/hapus |
| 2 | Galeri statis → interaktif | `ProductGallery` (thumbnail klik → ganti besar) + `ProductLightbox` (navigasi/keyboard) |
| 3 | Ratio 16:9 | Semua gambar produk (`aspect-video` + `object-cover`) — kartu, cover, galeri, thumbnail |
| 4 | Kanvas paket | `VariantCanvas` — pan (drag) + zoom `+/−` + reset/"Sesuaikan" |
| 5 | Alur pilih paket | `ProductPurchasePanel` di sidebar — CTA **disabled sampai paket dipilih** |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅.

**Sisa manual:** uji browser (galeri, lightbox, kanvas touch, alur pilih paket) + deploy.

---

## 🎉 Sesi Sebelumnya — Perbaikan Bug Integrasi Orders (pasca-rilis)

Pemilik melaporkan: **riwayat pesanan pembeli kosong** padahal order masuk di dashboard admin.

**Akar masalah:** composite index Firestore. Query `where(uid)` + `orderBy(createdAtISO)` menuntut composite index; index belum ada → query gagal → riwayat kosong (kegagalan ditelan best-effort). Investigasi juga menemukan bug tersembunyi kedua (filter status admin).

| Kode | Perbaikan |
| --- | --- |
| `getOrdersByUser` | Buang `orderBy` dari query → urutkan di memori (riwayat pembeli pulih) |
| `getOrdersPage` | `orderBy` saja + saring status di memori (filter admin pulih) |
| `firestore.indexes.json` | Baru — index `orders` untuk kesiapan skala; registrasi di `firebase.json` |
| `EmailNotifier` | Teks menyebut notifikasi lead **&** pesanan |

**Verifikasi:** diuji langsung via Admin SDK (query sekarang mengembalikan data) ✅ · tsc/lint/build bersih ✅.

**Sisa manual:** uji di produksi setelah deploy — buka `/akun` (riwayat muncul), filter status di `/admin/orders`.

---

## 🎉 Sesi Sebelumnya — Modul Admin Orders/Pesanan

Halaman **Pesanan** admin dibangun dari nol (`docs/2026-10-02-orders-admin-module.md`, FASE 0–7):

| Fase | Hasil |
| --- | --- |
| 1 | Data layer: `getOrdersPage/summary/updateStatus/delete` + util `format.ts` |
| 2 | API `GET/PATCH/DELETE /api/admin/orders` (+`?summary=1`) + klien `admin-orders-api.ts` |
| 3 | Halaman `/admin/orders` + `orders-manager.tsx` (list, filter, cari, detail dialog, ubah status, ekspor CSV, pagination); nav grup **"Toko"** |
| 4 | Badge generik **`newOrders`** (lead + order satu hook) + **email notifikasi order** |
| 5 | Metrik pesanan di dashboard overview (Total/Baru/Diproses/Omzet) |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅.

**Sisa manual (belum otomatis):**
- [ ] Uji browser: buat order → muncul di `/admin/orders`; filter/cari/detail/ubah status/ekspor.
- [ ] Uji badge pesanan & email notifikasi; cek metrik di dashboard.
- [ ] **Deploy**: `git push` ke `main` → Vercel → uji produksi.

---

## 🎉 Sesi Sebelumnya — Upgrade Sidebar Dashboard Admin

Upgrade menyeluruh sidebar dashboard admin berdasarkan
`docs/2026-10-02-sidebar-dashboard-upgrade.md` (FASE 0–7) **selesai**:

| Fase | Hasil |
| --- | --- |
| 1 | Config nav terpusat (`src/lib/admin-nav.ts`) + komponen baru `components/admin/sidebar/*` |
| 2 | **A11y**: drawer conditional-render + `role="dialog"`/`aria-modal`, focus trap + restore (`use-drawer-focus`), `inert` konten saat drawer buka, `id="konten"` (SkipLink hidup di admin), touch target ≥44px, **fix modified-click** (Ctrl/Cmd+Click buka tab baru) |
| 3 | **IA**: grouping menu + section label; header judul jadi `<p>` (tak lagi dobel h1); metadata `title` per halaman |
| 4 | **Fitur**: badge lead baru, **mode rail** desktop (persist `localStorage`), **user menu** di footer sidebar |
| 5 | **Polish**: rail marker item aktif, scroll-fade nav, animasi backdrop/drawer |
| 6 | **Command palette** `Ctrl/Cmd+K` + shortcut `[` toggle rail + tombol cari di header |

**Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · `npm run build` sukses ✅.

**Sisa manual:** uji manual browser + deploy (belum diverifikasi sebelum sesi Orders).

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
| 13 | Upload gambar sampul langsung di editor blog (`/admin/blog`) | ✅ |
| 14 | Ekspor CSV lead (menghormati pencarian & filter) | ✅ |
| 15 | Grafik tren lead 14 hari terakhir di dashboard | ✅ |
| 16 | Vercel Analytics (`@vercel/analytics`) terpasang di layout | ✅ |
| 17 | Kelola **Layanan** dari dashboard (CRUD penuh termasuk detail, fitur, paket, FAQ) | ✅ |
| 18 | Kelola **FAQ** beranda dari dashboard | ✅ |
| 19 | Kelola **Harga/Paket** beranda dari dashboard | ✅ |
| 20 | Kelola **Konten Beranda** (Keunggulan, Alur Kerja, Statistik, Testimoni) dari dashboard | ✅ |
| 21 | Upgrade dashboard: full-width, header dinamis, toast konsisten, rate limit lead, guard akses admin | ✅ |
| 22 | Upgrade sidebar dashboard: grouping menu, badge lead, mode rail, user menu, a11y drawer (focus trap/dialog), command palette `Ctrl+K` | ✅ |
| 23 | Modul admin Orders/Pesanan: halaman `/admin/orders`, API admin, badge pesanan, notifikasi email order, metrik dashboard | ✅ |
| 24 | Revisi sistem produk: galeri via MediaPicker, lightbox galeri, ratio 16:9, kanvas paket (pan+zoom), alur wajib pilih paket | ✅ |
| 25 | Upgrade portfolio F1–F3: generalisasi galeri, detail profesional, daftar (search/filter/sort/URL/pagination) | ✅ |
| 26 | Upgrade portfolio F4–F6: kelola gambar di form, featured/urutan, badge Contoh, JSON-LD + sitemap | ✅ |

---

## 🔜 Belum Terselesaikan

### Prioritas Menengah

#### 1. Analytics & Monitoring
- [x] Pasang **Vercel Analytics** (`@vercel/analytics` + `<Analytics />` di `layout.tsx`). ⚠️ **Aktifkan di dashboard Vercel** (Project → Analytics) agar data mulai terkumpul.
- [ ] Pasang **error tracking** (Sentry atau sejenis) untuk mendeteksi bug di produksi.
- [ ] (Opsional) Event tracking untuk konversi (klik WhatsApp, submit form).

#### 2. Domain Sendiri — SKIP (diputuskan belum beli domain)
- [ ] Beli domain (mis. `lktech.id` / `lktech.com`).
- [ ] Sambungkan domain ke Vercel.
- [ ] Update `SITE_URL` di env Vercel ke domain baru.
- [ ] Tambahkan domain ke **Firebase Auth → Authorized domains**.
- [ ] Update `identitas-perusahaan.md` bagian kontak/website.

### Prioritas Lanjutan (Nice to Have)

#### 3. Upload Gambar Sampul Langsung di Editor Blog
- [x] Integrasikan `ImageUploader` ke form artikel (`/admin/blog`) agar sampul bisa diunggah langsung, bukan hanya tempel URL. (URL tempel tetap tersedia sebagai cadangan.)

#### 4. Isi Data Asli — SKIP (diisi manual nanti via dashboard)
- [ ] Ganti konten **portofolio** placeholder dengan proyek nyata (via `/admin/projects`).
- [ ] Ganti **testimoni** placeholder dengan yang asli.
- [ ] Isi **logo klien** asli (bagian "Trusted By").
- [ ] Lengkapi `identitas-perusahaan.md` (kontak, sosmed, tagline resmi).
- [ ] Update `identitas-perusahaan.md` & `tech-stack.md` bila ada perubahan.

> Catatan: layanan, FAQ, dan harga kini dapat diubah dari dashboard (`/admin/services`, `/admin/faq`, `/admin/pricing`).

#### 5. Verifikasi Domain Email (Resend) — SKIP (diputuskan tanpa domain sendiri)
- [ ] Verifikasi domain di Resend agar email notifikasi bisa dikirim ke alamat mana pun.
- [ ] Ganti `EMAIL_FROM` ke `LKTech <notifikasi@domain-anda>`.

> Kondisi saat ini: `EMAIL_FROM=LKTech <onboarding@resend.dev>`, notifikasi hanya bisa ke email terdaftar Resend (`lupyariestaa@gmail.com`).

#### 6. Peningkatan Dashboard (opsional)
- [x] Filter/pencarian lead lebih lanjut + ekspor CSV.
- [x] Statistik lead (grafik tren).
- [x] Kelola layanan (services) dari dashboard — termasuk detail tiap layanan.
- [x] Kelola FAQ & harga dari dashboard.

#### 7. Peningkatan SEO (lanjutan) — SKIP sementara (tunggu proper dulu)
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
- **PENTING:** setiap ada koleksi baru (`settings`, `projects`, `articles`, `content`), rules harus di-**Publish ulang** di Firebase Console → Firestore → Rules.
- Koleksi: `leads`, `media`, `settings`, `projects`, `articles`, `content`.

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
