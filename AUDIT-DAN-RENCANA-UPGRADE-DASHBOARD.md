# AUDIT SISTEM & RENCANA UPGRADE UI/UX DASHBOARD — LKTech

> **Status dokumen:** 📝 Temuan audit + Rencana kerja (belum dieksekusi)
> **Disusun:** sesi "Audit Menyeluruh"
> **Cakupan:** Dashboard admin, landing page, seluruh API, data layer, security, SEO, a11y, UI/UX.
> **Tujuan:** (1) Daftar lengkap gap/masalah/sistem yang belum benar. (2) Rencana upgrade UI/UX dashboard (full-width, lebih proper) siap dikerjakan sesi berikutnya.

---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Metodologi & Catatan Verifikasi](#2-metodologi--catatan-verifikasi)
3. [TEMUAN AUDIT — Gap & Masalah](#3-temuan-audit--gap--masalah)
   - 3.1 Prioritas Kritis (harus sebelum launch)
   - 3.2 Prioritas Tinggi
   - 3.3 Prioritas Menengah
   - 3.4 Prioritas Rendah
   - 3.5 Temuan yang TERVERIFIKASI BUKAN GAP (klarifikasi)
4. [Peta Integrasi Konten Dinamis](#4-peta-integrasi-konten-dinamis)
5. [RENCANA UPGRADE UI/UX DASHBOARD](#5-rencana-upgrade-uiux-dashboard)
6. [RENCANA TEKNIS — Refactor & Perbaikan](#6-rencana-teknis--refactor--perbaikan)
7. [ALUR EKSEKUSI (Roadmap Bertahap)](#7-alur-eksekusi-roadmap-bertahap)
8. [Definition of Done & Kriteria Uji](#8-definition-of-done--kriteria-uji)
9. [Lampiran: Daftar File Terkait](#9-lampiran-daftar-file-terkait)

---

## 1. Ringkasan Eksekutif

Audit menemukan **~45 temuan** di berbagai tingkat. Yang paling penting:

**Kekuatan sistem saat ini:**
- Semua route admin (`/api/admin/**`) **konsisten** memanggil `requireAdmin()` — tidak ada route admin tanpa guard.
- Tidak ada `TODO/FIXME/HACK` di source.
- `/api/content` sudah `no-store` (perbaikan sesi lalu berhasil).
- Build & TypeScript bersih.

**Masalah utama yang harus dibereskan:**
1. **Konten belum 100% terhubung ke dashboard.** Yang sudah dikelola: Layanan, FAQ, Harga, Hero, Portofolio, Blog, Media, Pengaturan kontak. Yang **masih hardcoded**: `WHY_US`, `PROCESS`, `STATS`, `TESTIMONIALS`, dan nomor "15+ klien".
2. **Data placeholder (contoh) ditampilkan seolah-olah asli** — testimoni rekaan, metrik proyek rekaan, avatar stok Unsplash sebagai "klien". Risiko trust/legal.
3. **Cache pengaturan (`/api/settings`) masih `s-maxage=300`** + `SettingsProvider` selalu menimpa data segar dengan hasil fetch (bisa stale). Ini bug "data basi" yang **sama** seperti yang diperbaiki pada content, tapi belum diperbaiki di settings.
4. **Feedback toast hanya aktif di sebagian manager.** Manager Artikel, Portofolio, Media, Lead, Pengaturan belum memakai toast (padahal `ToastProvider` sudah ada).
5. **Pola fetch berulang** di 7 komponen (duplikasi kode besar; sebagian sudah diekstrak ke `useSiteContent`).
6. **Dashboard masih dibatasi lebar (`max-w-7xl`)** — ini yang ingin Anda perbesar/full-width.

---

## 2. Metodologi & Catatan Verifikasi

Audit dilakukan dengan membaca seluruh source (`src/**`), menelusuri flow data (simpan → server → cache → baca → render), dan **memverifikasi langsung** temuan yang berpotensi keliru.

**Temuan yang SAYA VERIFIKASI ULANG dan dikoreksi (agar tidak salah lapor):**
| Klaim awal | Hasil verifikasi | Kesimpulan |
|---|---|---|
| Skip-link rusak karena halaman dalam tak punya `id="konten"` | `id="konten"` **ADA** di `blog/layout`, `kontak/layout`, `layanan/layout`, `portofolio/layout`, dan `page.tsx` | ❌ **BUKAN gap** |
| Avatar Unsplash gagal render karena `remotePatterns` belum diatur | `images.unsplash.com` **sudah** ada di `next.config.ts` | ❌ **BUKAN gap** (tapi tetap ada isu etika/legal) |
| Logo schema.org rusak (file tak ada) | `public/logo/lktech-logo.svg` **ADA** | ❌ **BUKAN gap** |

Catatan: audit ini tidak menjalankan aplikasi secara end-to-end untuk tiap fitur; sebagian temuan bersifat "perlu diuji saat eksekusi".

---

## 3. TEMUAN AUDIT — Gap & Masalah

Format tiap temuan: **[ID] Judul** — *Severity* — Lokasi — Deskripsi — Rekomendasi.

### 3.1 Prioritas Kritis (sebelum launch)

**KR-1 — Data placeholder ditampilkan sebagai kenyataan** — *Critical (trust/legal)*
- Lokasi: `src/lib/content.ts` (`PROJECTS`, `TESTIMONIALS`), `src/components/sections/hero.tsx` (avatar stok + "15+ klien").
- Masalah: Testimoni (`Andi Pratama`, dll), metrik proyek (`+40%`, `< 1,5s`), dan avatar foto stok ditampilkan sebagai klien/metrik nyata. Bila dilihat calon klien → menyesatkan.
- Rekomendasi: Ganti dengan data asli, **atau** tandai jelas sebagai contoh, **atau** kosongkan sampai data asli siap. Minimal: hapus avatar stok & ubah klaim "15+ klien" jadi dinamis.

**KR-2 — Settings masih rentan "data basi" (bug lama belum tuntas di settings)** — *Critical*
- Lokasi: `src/app/api/settings/route.ts:17`, `src/components/settings-provider.tsx:32-47`, `src/lib/admin-api.ts` (`fetchSettings`).
- Masalah:
  - `/api/settings` masih `Cache-Control: public, s-maxage=300`.
  - `SettingsProvider` **selalu** refetch `/api/settings` dan **menimpa** `initial` segar dari server (sama seperti bug ContentProvider yang lalu).
  - `fetchSettings` (dashboard) membaca endpoint publik yang ter-cache → form pengaturan bisa menampilkan data lama & menyimpan menimpa data baru.
- Rekomendasi: (a) `/api/settings` → `no-store`; (b) `SettingsProvider` jangan timpa bila `initial` ada; (c) tambah `GET /api/admin/settings` (no-store) untuk dashboard; (d) `revalidatePath` saat simpan settings.

**KR-3 — Rate limiting / anti-bot form lead tidak ada** — *Critical (abuse/cost)*
- Lokasi: `src/app/api/lead/route.ts`.
- Masalah: Endpoint publik POST tanpa rate limit/honeypot/captcha. Bisa di-spam → biaya Firestore + email Resend + data kotor.
- Rekomendasi: Tambah rate limit berbasis IP (`x-forwarded-for`), honeypot field, dan/atau captcha. Batasi jumlah per IP.

### 3.2 Prioritas Tinggi

**HI-1 — `WHY_US` (Keunggulan) hardcoded** — *High*
- Lokasi: `src/lib/content.ts:1010-1041`, `src/components/sections/why-us.tsx`.
- Rekomendasi: Masukkan ke `SiteContent` (`managedWhyUs`) + normalizer + UI dashboard baru.

**HI-2 — `PROCESS` (Alur Kerja) hardcoded** — *High*
- Lokasi: `src/lib/content.ts:1043-1064`, dipakai di beranda & `src/app/layanan/page.tsx`.
- Rekomendasi: Jadikan konten terkelola.

**HI-3 — `STATS` hardcoded** — *High*
- Lokasi: `src/lib/content.ts:1066-1071`, `src/components/sections/stats.tsx`.
- Rekomendasi: Jadikan konten terkelola (angka marketing yang sering berubah).

**HI-4 — `TESTIMONIALS` hardcoded** — *High*
- Lokasi: `src/lib/content.ts:1082-1104`, `src/components/sections/testimonials.tsx`.
- Rekomendasi: Jadikan konten terkelola, atau turunkan dari `project.testimonial` (sudah terkelola).

**HI-5 — `fetchSettings` dashboard baca endpoint publik ter-cache** — *High*
- Lokasi: `src/lib/admin-api.ts` (`fetchSettings` → `/api/settings`).
- Rekomendasi: Endpoint admin khusus (lihat KR-2).

**HI-6 — Toast belum konsisten di semua manager** — *High*
- Lokasi: Artikel (`articles-manager.tsx`), Portofolio (`projects-manager.tsx`), Media (`media-manager.tsx`), Lead (`leads-manager.tsx`), Pengaturan (`settings-manager.tsx`), Email test (`email-notifier.tsx`).
- Masalah: Simpan/hapus sukses tanpa feedback. `ToastProvider` sudah ada & hanya dipakai `use-site-content.ts`.
- Rekomendasi: Pakai `useToast()` di semua manager (sukses & gagal).

**HI-7 — Duplikasi pola fetch (load + mount-fetch) di 7 komponen** — *High (maintainability)*
- Lokasi: `articles-manager`, `projects-manager`, `media-manager`, `leads-manager`, `media-picker-dialog`, `dashboard-overview`, `settings-manager`, `use-site-content`.
- Rekomendasi: Ekstrak hook bersama `useAsyncList<T>()` / `useAdminResource()`.

**HI-8 — `projects-manager` over-fetch seluruh `SiteContent`** — *High*
- Lokasi: `projects-manager.tsx` (`useSiteContent()` hanya untuk daftar layanan).
- Rekomendasi: Buat `useServices()` ringan atau kirim daftar layanan sebagai prop.

**HI-9 — Auth guard dashboard hanya client-side** — *High (security UX)*
- Lokasi: `src/components/admin/auth-guard.tsx`, `login-form.tsx`.
- Masalah: User Firebase yang login tapi **bukan** admin tetap bisa masuk shell dashboard (API-nya menolak, tapi UI terlihat rusak/kosong tanpa pesan jelas).
- Rekomendasi: Endpoint ringan `/api/admin/me` untuk cek keanggotaan; tampilkan "Tidak punya akses" dan redirect.

**HI-10 — Form pengaturan/konten panjang tanpa proteksi "belum disimpan"** — *High (UX/data loss)*
- Lokasi: `services-manager`, `hero-showcase-manager`, `faq-manager`, `pricing-manager`, `settings-manager`.
- Rekomendasi: `beforeunload` + konfirmasi saat pindah menu bila ada perubahan belum disimpan.

### 3.3 Prioritas Menengah

**ME-1 — `normalizeSiteContent` fallback saat array KOSONG** — *Medium*
- Lokasi: `src/lib/site-content.ts`.
- Masalah: Jika admin sengaja menghapus semua layanan/FAQ/harga, yang tampil malah **default hardcoded** lagi (tidak bisa berstatus kosong).
- Rekomendasi: Bedakan "belum diatur (undefined)" vs "sengaja kosong ([])".

**ME-2 — Fallback PROJECTS/ARTICLES serupa** — *Medium*
- Lokasi: `src/lib/projects.ts`, `src/lib/articles.ts`.
- Masalah: Setelah hapus semua sample, sample muncul lagi.
- Rekomendasi: Sama seperti ME-1.

**ME-3 — `defaultSiteContent()` shallow-copy detail layanan** — *Medium*
- Lokasi: `src/lib/content-types.ts` (`buildDefaultServices`).
- Masalah: Array nested (`highlights`, `features`, dll) berbagi referensi dengan konstanta statis → risiko mutasi merusak default.
- Rekomendasi: `structuredClone()`.

**ME-4 — Cache endpoint publik lain belum konsisten** — *Medium*
- Lokasi: `/api/projects` (30s), `/api/media` (60s + `revalidate`), `/api/articles` (60s).
- Rekomendasi: Selaraskan kebijakan (mis. `no-store` untuk yang dikelola dashboard, atau dokumentasikan).

**ME-5 — `title.template: "%s"` no-op** — *Medium (SEO)*
- Lokasi: `src/app/layout.tsx:31`.
- Masalah: Template tidak berefek; tiap halaman manual menambah "— LKTech".
- Rekomendasi: Pakai `"%s | LKTech"` dan hapus suffix manual, atau hapus template.

**ME-6 — `structured-data` foundingDate bukan ISO & alamat hardcoded** — *Medium (SEO)*
- Lokasi: `src/components/structured-data.tsx:20,23`.
- Rekomendasi: `foundingDate` format ISO (`YYYY-MM-DD`), alamat turunkan dari settings.

**ME-7 — `sitemap.ts` pakai `getServiceSlugs()` statis** — *Medium (SEO)*
- Lokasi: `src/app/sitemap.ts`.
- Masalah: Layanan yang ditambah dari dashboard tidak masuk sitemap.
- Rekomendasi: Baca dari `getSiteContent()`.

**ME-8 — A11y: filter portfolio/blog tanpa `aria-pressed`** — *Medium*
- Lokasi: `portfolio-grid.tsx`, `blog-grid.tsx`.
- Rekomendasi: `aria-pressed` + `role="group"` + label.

**ME-9 — A11y: FAQ accordion tanpa `aria-controls`/`id`** — *Medium*
- Lokasi: `faq-accordion.tsx`.

**ME-10 — A11y: MediaPicker tanpa focus trap & label input** — *Medium*
- Lokasi: `media-picker-dialog.tsx` (search, select kategori/urutkan tanpa label; tanpa focus trap).

**ME-11 — A11y: input lead (search & filter) tanpa label/`aria-label`** — *Medium*
- Lokasi: `leads-manager.tsx`.

**ME-12 — A11y: toggle "Status" hero dibungkus `<label>` (bukan form control)** — *Medium*
- Lokasi: `hero-showcase-manager.tsx`.
- Rekomendasi: `role="switch"` + `aria-checked`.

**ME-13 — Toast error pakai `role="status"` (bukan `alert`)** — *Medium*
- Lokasi: `toast.tsx`.

**ME-14 — Sidebar dashboard: footer `absolute` bisa tumpang tindih** — *Medium*
- Lokasi: `admin-shell.tsx` (`absolute inset-x-4 bottom-4` tanpa scroll).
- Rekomendasi: `flex-col` + area nav `overflow-y-auto` + footer via flex.

**ME-15 — Konfirmasi hapus tidak konsisten** — *Medium*
- Lokasi: `faq-manager`/`pricing-manager` tanpa confirm; lain pakai `window.confirm`.
- Rekomendasi: Komponen `ConfirmDialog` bersama; definisikan aturan (draft = tanpa confirm, terhapus permanen = confirm).

**ME-16 — Validasi form minim** — *Medium*
- Lokasi: `articles-manager`, `projects-manager` (hanya judul).
- Rekomendasi: Validasi slug, tahun (range), field wajib.

**ME-17 — `email/test` bisa kirim ke alamat sembarang** — *Medium (abuse)*
- Lokasi: `src/app/api/admin/email/test/route.ts`.
- Rekomendasi: Batasi ke `check.email` atau validasi ketat.

**ME-18 — Duplikasi `authHeaders`/`handle` & `sendTestEmail(to?)` tak terpakai** — *Medium*
- Lokasi: `admin-api.ts`, `admin-content-api.ts`.
- Rekomendasi: Ekstrak `src/lib/admin-fetch.ts`; hapus param `to`.

### 3.4 Prioritas Rendah

**LO-1** — `verifyIdToken` tanpa `checkRevoked: true` (`admin-guard.ts`).
**LO-2** — `FIREBASE_ADMIN_PRIVATE_KEY` replace `\n` tanpa `.trim()` (`firebase-admin.ts`).
**LO-3** — `dashboard-overview` menampilkan angka 0 saat error (menyesatkan).
**LO-4** — `settings-manager` form tetap aktif saat load gagal (risiko simpan default).
**LO-5** — `media-manager` `catch {}` menelan error saat fetch proyek.
**LO-6** — `api/media` mengembalikan `{items:[]}` + 200 saat error (tak bisa dibedakan).
**LO-7** — `hero-showcase-carousel`: `priority` pada carousel auto-rotate (risiko LCP).
**LO-8** — blog cover `Image` pakai `width/height` tetap (distorsi bila rasio beda).
**LO-9** — `structured-data` alamat & `COMPANY.email` duplikasi dengan settings.
**LO-10** — `CLIENTS` export tak terpakai; `CONTACT` jam kerja & koordinat peta hardcoded.
**LO-11** — `SOCIALS: []` default; ok.
**LO-12** — CSV export tak ada guard formula injection (minor).
**LO-13** — Tidak ada pagination pada lead (skalabilitas).
**LO-14** — `login-form` mengizinkan self-registration Firebase.
**LO-15** — `sitemap` `lastModified` selalu "now".
**LO-16** — `robots` blokir semua `/api/`.
**LO-17** — `COUNTER` toast `setTimeout` tak dibersihkan saat unmount (minor).
**LO-18** — `dashboard-overview` chart tanpa alt/`role="img"`.

### 3.5 Temuan yang TERVERIFIKASI BUKAN GAP (klarifikasi)

- **Skip-link** — target `#konten` ADA di semua layout + homepage. OK.
- **Avatar Unsplash render** — `images.unsplash.com` ADA di `next.config.ts`. OK (isu etika tetap ada di KR-1).
- **Logo schema.org** — `public/logo/lktech-logo.svg` ADA. OK.
- **Guard API admin** — semua route admin sudah `requireAdmin()`. OK.

---

## 4. Peta Integrasi Konten Dinamis

Status keterhubungan konten ke dashboard:

| Konten | Sumber saat ini | Dikelola dashboard? | Lokasi |
|---|---|---|---|
| Layanan (kartu + detail) | Firestore `content/site.services` | ✅ Ya | `/admin/services` |
| FAQ beranda | `content/site.faqs` | ✅ Ya | `/admin/faq` |
| Harga/Paket | `content/site.pricing` | ✅ Ya | `/admin/pricing` |
| Hero carousel | `content/site.hero` | ✅ Ya | `/admin/hero` |
| Portofolio (proyek) | Firestore `projects` | ✅ Ya | `/admin/projects` |
| Blog (artikel) | Firestore `articles` | ✅ Ya | `/admin/blog` |
| Media | Firestore `media` | ✅ Ya | `/admin/media` |
| Kontak (email/WA/lokasi/sosial) | Firestore `settings/site` | ⚠️ Ya, tapi cache stale | `/admin/settings` |
| **Keunggulan (`WHY_US`)** | **Hardcoded** | ❌ Tidak | `content.ts` |
| **Alur Kerja (`PROCESS`)** | **Hardcoded** | ❌ Tidak | `content.ts` |
| **Statistik (`STATS`)** | **Hardcoded** | ❌ Tidak | `content.ts` |
| **Testimoni (`TESTIMONIALS`)** | **Hardcoded** | ❌ Tidak | `content.ts` |
| **"15+ klien" & avatar hero** | **Hardcoded** | ❌ Tidak | `hero.tsx` |
| Teknologi (`TECH_STACK`) | Hardcoded (aset di `public/tech`) | ❌ Tidak (wajar) | `content.ts` |
| Jam kerja & koordinat peta | Hardcoded | ❌ Tidak | `kontak/page.tsx` |
| Navigasi (NAV_LINKS) | Hardcoded | ❌ Tidak (wajar) | `content.ts` |

**Kesimpulan:** ~50% konten sudah dinamis. Target upgrade: pindahkan `WHY_US`, `PROCESS`, `STATS`, `TESTIMONIALS`, dan klaim klien ke dashboard.

---

## 5. RENCANA UPGRADE UI/UX DASHBOARD

### 5.1 Tujuan
- **Full-width**: hapus batas `max-w-7xl` pada shell dashboard.
- Lebih **proper, rapi, modern, konsisten** — tapi tidak mengubah identitas brand.
- Lebih **lapang** & **efisien** untuk data padat (lead, media, tabel).

### 5.2 Prinsip Desain
1. **Full-bleed layout**: sidebar tetap, konten utama `w-full` dengan padding responsif (`px-4 sm:px-6 lg:px-8`). `max-w-*` hanya dipakai pada paragraf teks panjang & form (opsional, agar enak dibaca).
2. **Konsisten spacing**: skala `gap`/`p` seragam (`4/6/8`).
3. **Konsisten komponen**: tombol, input, kartu, badge diseragamkan (idealnya via komponen kecil `ui/`).
4. **Feedback jelas**: toast sukses/gagal di semua aksi.
5. **A11y**: label, focus ring, keyboard, kontras.

### 5.3 Perubahan Layout Inti (`admin-shell.tsx`)

**Sebelum:**
```tsx
<div className="mx-auto flex max-w-7xl">   {/* ≤ 1280px, menyisakan margin besar */}
  <aside className="fixed ... w-64 ... lg:static ..." />
  ...
  <main className="flex-1 px-5 py-6 lg:px-8">{children}</main>
</div>
```

**Sesudah (usulan):**
```tsx
<div className="flex w-full">
  <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-white lg:static lg:translate-x-0">
    <div className="p-4">{/* logo */}</div>
    <nav className="flex-1 overflow-y-auto px-4">{/* menu, scrollable */}</nav>
    <div className="border-t p-4">{/* "Lihat Website", pinned via flex */}</div>
  </aside>
  <div className="flex min-h-screen w-full flex-col">
    <header className="sticky top-0 ... w-full">{/* header full-width */}</header>
    <main className="flex-1 w-full px-4 py-6 sm:px-6 lg:px-8">{children}</main>
  </div>
</div>
```

### 5.4 Task UI/UX (rinci)

| ID | Task | Detail |
|---|---|---|
| UX-1 | Hapus `max-w-7xl` | shell `w-full`; konten `w-full` + padding responsif |
| UX-2 | Sidebar flex-column | nav scrollable, footer pinned (bukan `absolute`) |
| UX-3 | Header full-width | judul section dinamis (dari pathname), bukan "Dashboard" statis |
| UX-4 | Tutup drawer saat route berubah | `useEffect` pada `pathname` + tutup via Escape |
| UX-5 | Grid kartu statistik responsif | `sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4` |
| UX-6 | Grid media/portofolio lebih lebar | banyak kolom di layar besar (`2xl:grid-cols-5/6`) |
| UX-7 | Tabel lead (opsional) | mode tabel di layar besar, kartu di mobile |
| UX-8 | Konsistensi tombol/aksi | tinggi, radius, warna, ikon seragam |
| UX-9 | Empty state & loading skeleton | seragam di semua halaman |
| UX-10 | Breadcrumb / judul halaman | konsisten tiap halaman admin |
| UX-11 | Dark mode (opsional) | bila diinginkan (butuh audit warna) |
| UX-12 | Perbaiki komponen form | label, error inline, required marker |

### 5.5 Referensi visual (guideline)
- Sidebar lebar tetap `16rem` (64) di desktop, drawer di mobile.
- Konten padding: `p-4` mobile → `p-8` desktop.
- Radius & shadow mengikuti yang sudah ada (`rounded-2xl/3xl`, `shadow-sm/lg`).
- Warna tetap pakai token brand (`primary`, `secondary`, `surface`, `muted`).

---

## 6. RENCANA TEKNIS — Refactor & Perbaikan

### 6.1 Perbaikan Cache & Freshness (kembar dengan sesi lalu)
- [ ] `/api/settings` → `Cache-Control: no-store`.
- [ ] `SettingsProvider` jangan refetch bila `initial` ada (mengikuti pola `ContentProvider`).
- [ ] Tambah `GET /api/admin/settings` (no-store) untuk dashboard.
- [ ] `revalidatePath` saat simpan settings (`/`, `/kontak`).
- [ ] Selaraskan `/api/projects`, `/api/media`, `/api/articles` (putuskan strategi).

### 6.2 Toast & Feedback
- [ ] Pakai `useToast()` di `articles-manager`, `projects-manager`, `media-manager`, `leads-manager`, `settings-manager`, `email-notifier`.
- [ ] `toast.tsx`: variant error → `role="alert"`.

### 6.3 Ekstraksi Hook & API Client
- [ ] `src/lib/admin-fetch.ts`: `adminFetch`, `authHeaders`, `handle` (dipakai `admin-api` & `admin-content-api`).
- [ ] `src/hooks/use-async-list.ts` (atau `src/components/admin/use-async-list.ts`): `{ data, loading, error, reload, setData }`.
- [ ] `useServices()` ringan untuk `projects-manager`.

### 6.4 Konten Dinamis Baru (memperluas `SiteContent`)
- [ ] Tambah ke `SiteContent`: `whyUs`, `process`, `stats`, `testimonials`.
- [ ] Update `normalizeSiteContent` + `saveSiteContent` + `DEFAULT_*`.
- [ ] Ubah `why-us.tsx`, `process.tsx`, `stats.tsx`, `testimonials.tsx` untuk pakai `useContent()`.
- [ ] Halaman dashboard baru: `/admin/content-extra` atau tab di Pengaturan (why us/process/stats/testimoni).
- [ ] Hero: klaim klien dinamis (dari stats/testimonial).

### 6.5 Fallback "kosong vs belum diatur"
- [ ] `site-content.ts`, `projects.ts`, `articles.ts`: bedakan `undefined` vs `[]`.

### 6.6 SEO
- [ ] `title.template` → `"%s | LKTech"` + hapus suffix manual (atau hapus template).
- [ ] `structured-data`: `foundingDate` ISO, alamat dari settings.
- [ ] `sitemap.ts`: baca slug layanan/artikel/proyek dari data dinamis; `lastModified` per-resource.
- [ ] Tambah JSON-LD Breadcrumb di halaman detail.

### 6.7 A11y
- [ ] `aria-pressed` filter; `aria-controls` FAQ; label input (lead, media picker); `role="switch"` toggle hero.
- [ ] Focus trap + `inert` di MediaPicker; restore focus.
- [ ] Chart dashboard: alternatif teks/`role="img"`.

### 6.8 Security & Robustness
- [ ] Rate limit `/api/lead`.
- [ ] Batasi `email/test`.
- [ ] `verifyIdToken(token, true)`.
- [ ] Guard admin punya pesan akses jelas (via `/api/admin/me`).

### 6.9 UX Form
- [ ] `beforeunload` + guard navigasi saat dirty.
- [ ] `ConfirmDialog` bersama.
- [ ] Validasi slug/tahun/field wajib.

### 6.10 Data Placeholder
- [ ] Ganti/tandai testimoni, metrik proyek, avatar hero dengan data asli.
- [ ] Sinkronkan copy testimonial vs detail proyek (Ritel Jaya).

---

## 7. ALUR EKSEKUSI (Roadmap Bertahap)

> Disusun agar bisa dikerjakan bertahap tanpa merusak yang sudah jalan. Setiap fase berdiri sendiri & bisa dites.

### FASE 0 — Persiapan (0.5 hari)
1. Baca dokumen ini & `TASK-SELANJUTNYA.md`.
2. `npm run dev`, pastikan baseline jalan.
3. `git checkout -b upgrade/dashboard-ux` (opsional, atau langsung `main`).

### FASE 1 — Perbaikan Data Freshness (KR-2, HI-5) — *prioritas karena bug nyata*
1. `/api/settings` → `no-store`.
2. `SettingsProvider` guard `initial`.
3. `GET /api/admin/settings` + `fetchSettings` dashboard ke endpoint itu.
4. `revalidatePath` saat simpan settings.
5. Uji: ubah kontak → simpan → hard refresh → langsung berubah.

### FASE 2 — Feedback & Kualitas UI Dashboard (HI-6, UX-1..UX-4)
1. Pasang `useToast` ke semua manager.
2. Full-width shell + sidebar flex + header judul dinamis + tutup drawer on route change.
3. Uji responsif (mobile/desktop/ultrawide).

### FASE 3 — Refactor Hook & API Client (HI-7, HI-8, ME-18)
1. `admin-fetch.ts` + `use-async-list.ts`.
2. Migrasi 7 komponen ke hook.
3. `useServices()` untuk projects.
4. Uji tiap halaman dashboard.

### FASE 4 — Konten Dinamis Baru (HI-1..HI-4)
1. Perluas `SiteContent` (whyUs, process, stats, testimonials).
2. Normalizer + save + default.
3. UI dashboard baru.
4. Update section beranda + layanan.
5. Uji simpan → tampil.

### FASE 5 — SEO + A11y + Security (ME-5..ME-13, ME-17, KR-3)
1. SEO (template, structured data, sitemap).
2. A11y (aria, focus trap, switch).
3. Rate limit lead + batasi email test + guard admin.

### FASE 6 — Data Asli & Konten Placeholder (KR-1)
1. Ganti testimoni/metrik/avatar.
2. Verifikasi tidak ada lagi data contoh.

### FASE 7 — QA Menyeluruh & Deploy
1. `npm run lint`, `npx tsc --noEmit`, `npm run build`.
2. Uji manual semua halaman (dashboard + publik).
3. Push → Vercel → verifikasi produksi.

**Estimasi kasar:** FASE 1–3 (inti bug + UX dasar) selesai dalam 1 sesi; FASE 4–7 bertahap sesuai waktu.

---

## 8. Definition of Done & Kriteria Uji

**Definition of Done (per fase):**
- `npx tsc --noEmit` bersih.
- `npm run build` sukses.
- Tidak ada regresi pada fitur yang sudah jalan.
- Dokumentasi diperbarui (bila mengubah arsitektur).

**Kriteria Uji Manual (checklist):**
- [ ] Ubah **kontak** → simpan → langsung tampil (tanpa tunggu cache).
- [ ] Simpan **Layanan/FAQ/Harga/Hero** → ada toast hijau → tampil di beranda.
- [ ] Simpan **Portofolio/Blog/Media** → ada toast → tampil.
- [ ] Hapus item → ada konfirmasi → hilang permanen setelah refresh.
- [ ] Dashboard **full-width** di layar 1920px (tanpa margin besar).
- [ ] Sidebar rapi (tidak tumpang tindih footer) di layar pendek.
- [ ] Mobile: drawer buka/tutup benar; konten tidak terpotong.
- [ ] Keyboard: Tab bisa mencapai semua kontrol; Escape menutup dialog/drawer.
- [ ] Semua input punya label (screen reader).
- [ ] `WHY_US`/`PROCESS`/`STATS`/`TESTIMONIALS` bisa diubah dari dashboard.
- [ ] Tidak ada lagi testimoni/avatar palsu tampil sebagai klien nyata.

---

## 9. Lampiran: Daftar File Terkait

**Dashboard shell & halaman**
- `src/components/admin/admin-shell.tsx` (full-width — titik utama)
- `src/app/admin/(dashboard)/layout.tsx`, `src/app/admin/(dashboard)/*/page.tsx`
- `src/components/admin/toast.tsx`, `use-site-content.ts`

**Manager dashboard**
- `articles-manager.tsx`, `projects-manager.tsx`, `media-manager.tsx`, `leads-manager.tsx`, `settings-manager.tsx`, `services-manager.tsx`, `faq-manager.tsx`, `pricing-manager.tsx`, `hero-showcase-manager.tsx`, `dashboard-overview.tsx`, `media-picker-dialog.tsx`, `image-uploader.tsx`, `email-notifier.tsx`

**API**
- Admin: `src/app/api/admin/**`
- Publik: `src/app/api/{content,settings,projects,media,articles,lead,cloudinary}/**`

**Data layer**
- `src/lib/site-content.ts`, `content-types.ts`, `content.ts`, `settings.ts`, `settings-types.ts`, `projects.ts`, `articles.ts`, `admin-api.ts`, `admin-content-api.ts`, `admin-guard.ts`, `firebase-admin.ts`

**Publik (landing & inner)**
- `src/app/layout.tsx`, `page.tsx`, `layanan/**`, `portofolio/**`, `blog/**`, `kontak/**`
- `src/components/sections/**`, `content-provider.tsx`, `settings-provider.tsx`, `hero-showcase-carousel.tsx`, `structured-data.tsx`

**Config**
- `next.config.ts`, `firestore.rules`, `.env.example`, `sitemap.ts`, `robots.ts`

---

## CATATAN PENUTUP

Dokumen ini sengaja lengkap agar bisa dikerjakan lintas sesi. Prioritas yang saya sarankan **dimulai**:
1. **FASE 1** (fix cache settings — bug nyata, cepat).
2. **FASE 2** (full-width dashboard + toast — permintaan utama Anda).
3. Lanjut FASE 3–4.

Bila ingin langsung mengejar permintaan UI/UX dashboard, **FASE 2 (UX-1..UX-4)** bisa dikerjakan lebih dulu tanpa menunggu fase lain.

> Setelah Anda menyetujui urutan, eksekusi mengikuti §7.
