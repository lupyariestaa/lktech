# GAP ANALYSIS MENYELURUH — Website LKTech

> **Tujuan dokumen:** catatan hasil *cross-check* seluruh project (bukan membuat kode).
> Dokumen ini mendaftar **semua gap / bug / risiko** yang ditemukan lintas aspek,
> agar bisa dikerjakan bertahap pada sesi-sesi berikutnya.
>
> **Status:** hasil audit baru (fresh), dipisah dari `AUDIT-DAN-RENCANA-UPGRADE-DASHBOARD.md`
> yang sudah dieksekusi. Sebagian temuan lama **sudah selesai**; temuan di dokumen ini
> adalah temuan yang **masih berlaku** per audit terakhir.
>
> **Tanggal audit:** sesi cross-check terbaru.
> **Metode:** baca seluruh `src/**`, `firestore.rules`, konfigurasi, lalu verifikasi
> langsung file-file yang diklaim bermasalah. Baseline statis diverifikasi ulang.

---

## 0. Ringkasan Eksekutif

### Log eksekusi

| Fase | Cakupan | Status |
| --- | --- | --- |
| **A** | Keamanan & integritas data: SEC-01, SEC-02, SEC-03, SEC-08, SEC-09, ADM-01, USR-01 | ✅ Selesai |
| **B** | Funnel pembelian: USR-03, USR-04, USR-05, USR-06, USR-08, USR-09, USR-14, USR-15, USR-16, USR-19 | ✅ Selesai |
| **C** | Keandalan dashboard & UX: ADM-02, ADM-03, ADM-04, ADM-06, ADM-08, ADM-11, ADM-12, ADM-13, ADM-14 | ✅ Selesai |
| **D** | Konten, SEO, a11y, kinerja, sisa security/config | ✅ Selesai (item tertentu di-defer — lihat bawah) |

### Status akhir: semua fase (A–D) dieksekusi

**Ringkasan hasil:** dari **77 temuan**, mayoritas **selesai**. Yang **sengaja di-defer**
(bukan terlewat) karena butuh keputusan/infrastruktur:

| Item | Alasan defer |
| --- | --- |
| SEC-04 | Limiter terdistribusi butuh Redis/Upstash (keputusan infra berbayar). Sudah ditambah TTL sweep. |
| SEOP-12 | Konversi ~10 section homepage ke server component = refactor besar berisiko. |
| ADM-05 | Guard admin retry/re-verifikasi (edge case token refresh). |
| ADM-09 | Lost-update PUT SiteContent (perlu versioning/optimistic-concurrency). |
| ADM-10 | Cache bersama media (perlu react-query/SWR). |
| ADM-16 | Konsistensi loading/empty/error (kosmetik). |
| USR-02 | User & admin berbagi 1 sesi Firebase — keputusan arsitektur (single-identity). |
| USR-07/11/18/20 | Rate limit user, stok/kuantitas, popup redirect, retensi PII — butuh keputusan produk. |
| CFG-03 | Error tracking (Sentry) butuh akun & dependency baru. |
| CFG-02/CFG-01 | Isi env & publish rules = **langkah manual pemilik** (bukan kode). |

> **Langkah manual wajib:** publish ulang `firestore.rules`; isi env Resend/`SITE_URL`
> di Vercel; isi data asli (testimoni/klien/proyek) via dashboard.

> **Langkah manual setelah Fase A:** publish ulang `firestore.rules` (SEC-01/02/03).

### Baseline teknis (terverifikasi saat audit ini)

| Pemeriksaan | Hasil |
| --- | --- |
| `npx tsc --noEmit` | ✅ Bersih (0 error) |
| `npm run lint` | ✅ Bersih (0 error — utang lint pra-ada sudah beres) |
| `npm run build` | ✅ Sukses |

Jadi **tidak ada masalah build/kualitas statis**. Semua gap di bawah adalah
soal **keamanan, kebenaran data, konsistensi konten, SEO, a11y, dan UX** — bukan
soal kompilasi.

### 5 temuan paling kritis (urutan prioritas)

| # | Temuan | Aspek | Severity | Status |
| --- | --- | --- | --- | --- |
| 1 | `firestore.rules` memberi hak tulis/read ke **semua** user yang login (bukan hanya admin) → semua authenticated user bisa baca PII lead & ubah konten via client SDK | Security | 🔴 Critical | ✅ Selesai (Fase A) |
| 2 | Manager konten menimpa data produksi dengan `defaultSiteContent()` bila fetch awal gagal (silent total data-loss) | Data integrity | 🔴 Critical | ✅ Selesai (Fase A) |
| 3 | Keranjang pakai 1 key localStorage global (`lktech.cart.v1`) → bocor antar user di perangkat bersama + tidak dibersihkan saat logout | Privacy/UX | 🔴 Critical | ✅ Selesai (Fase A) |
| 4 | Checkout/total harga 100% dipercaya dari client & memakai harga lama (snapshot) tanpa re-check server; tidak ada order record sama sekali | Correctness | 🟠 High | ✅ Selesai (Fase B) |
| 5 | Login user tidak pernah membaca `?next=` → user yang mau beli selalu mendarat di `/akun`, bukan kembali ke produk/keranjang | UX funnel | 🟠 High | ✅ Selesai (Fase B) |

**Kesimpulan:** arsitektur & UI sudah matang, tetapi ada **celah keamanan data-layer**
(rules), **bug data-loss di dashboard**, dan **rantai funnel pembelian user yang bocor**
(cart isolation + redirect + trust pada client). Ini yang sebaiknya dibereskan lebih dulu.

---

## 1. Keamanan & Data-Layer (SEC)

### ✅ SEC-01 — Firestore Rules: semua user login diperlakukan sebagai admin — **SELESAI (Fase A)**
- **Lokasi:** `firestore.rules`
- **Masalah:** Setiap koleksi (`leads`, `media`, `settings`, `projects`, `articles`,
  `content`) memakai `if request.auth != null` untuk read/write. Tapi definisi "admin"
  di aplikasi adalah whitelist email (`ADMIN_EMAILS`, lihat `admin-guard.ts`). Karena
  website **mendukung login user Google umum** (`/api/user/profile`), maka **user biasa
  yang login otomatis lolos rules** → bisa membaca seluruh **PII lead** (nama, email,
  telepon) dan mengubah/menghapus konten lewat Firebase Client SDK (config publik
  `NEXT_PUBLIC_FIREBASE_*` memang publik).
- **Dampak:** Kebocoran data lead + defacement konten oleh user login mana pun.
- **Fix yang diterapkan:** `firestore.rules` diubah menjadi **deny-all untuk semua akses
  langsung dari klien** (`allow read, write: if false`). Ini aman karena **seluruh akses
  data sudah lewat Firebase Admin SDK di server** (API route / server component), dan
  klien hanya memakai Firebase Auth (tidak ada pemakaian client Firestore SDK — sudah
  diverifikasi). `ADMIN_EMAILS` tetap menjadi satu-satunya gate admin di `/api/admin/*`.
  ⚠️ **WAJIB publish ulang rules** di Firebase Console → Firestore → Rules.

### ✅ SEC-02 — Koleksi `users` & `products` tidak tercakup rules secara eksplisit — **SELESAI (Fase A)**
- **Lokasi:** `firestore.rules` vs `src/lib/user-profile.ts`, `src/lib/products.ts`
- **Masalah:** Rules hanya mendefinisikan `leads, media, settings, projects, articles,
  content`. Koleksi `users` dan `products` jatuh ke catch-all.
- **Fix yang diterapkan:** Dengan kebijakan **deny-all klien** (SEC-01), semua koleksi
  (`users`, `products`, dst.) kini tertutup eksplisit dari akses klien; hanya Admin SDK
  (server) yang mengaksesnya. Tidak ada lagi postur implisit.

### ✅ SEC-03 — Lead bisa ditulis langsung via client SDK (bypass zod + rate limit + honeypot) — **SELESAI (Fase A)**
- **Lokasi:** `firestore.rules` vs `src/app/api/lead/route.ts` + `src/lib/lead-schema.ts`
- **Masalah:** `isValidLead` lebih lemah dari skema zod; publik bisa `create` lead
  langsung dari client SDK (bypass `/api/lead`).
- **Fix yang diterapkan:** Karena aturan kini **menolak semua tulis dari klien**, satu-satunya
  jalur menulis lead adalah `POST /api/lead` (yang memakai zod + honeypot + rate limit).
  Pengecekan `isValidLead` yang lemah tidak lagi dapat dieksploitasi dari klien.

### 🟠 SEC-04 — Rate limiter in-memory (tidak efektif di serverless multi-instance) - **SEBAGIAN (Fase D: TTL sweep; terdistribusi di-defer)**
- **Lokasi:** `src/lib/rate-limit.ts:14` (`const buckets = new Map()`)
- **Masalah:** Komentar file sendiri mengakui hitungan tidak dibagi antar instance.
  Di Vercel, tiap instance punya Map sendiri → limit mudah dilewati / di-reset.
  Bucket juga tidak pernah di-evict kecuali pada hit key yang sama (minor memory leak).
- **Dampak:** Proteksi anti-spam lead praktis bisa ditembus.
- **Fix arah:** Pakai penyimpanan terdistribusi (Upstash Redis / Vercel KV) + TTL cleanup.

### 🟠 SEC-05 — Rate limit hanya ada di `/api/lead` - **SELESAI (Fase D)**
- **Lokasi:** `src/app/api/*` (import `rateLimit` hanya di `lead/route.ts`)
- **Masalah:** Endpoint rawan yang **tanpa** rate limit: `/api/cloudinary/sign`,
  `/api/cloudinary/destroy`, `/api/user/profile` (POST tiap request), `/api/media`
  (baca seluruh koleksi), `/api/admin/email/test`, dan semua endpoint baca publik.
- **Dampak:** Cost-DoS (Firestore read/write + email Resend), spam email test.
- **Fix arah:** Pasang limiter bersama ke endpoint-endpoint tsb.

### 🟠 SEC-06 — `clientIp()` mempercayai `x-forwarded-for` mentah - **SELESAI (Fase D)**
- **Lokasi:** `src/lib/rate-limit.ts:56-59`
- **Masalah:** Mengambil entri XFF pertama tanpa verifikasi proxy. Bila header tidak
  distrip, IP bisa dipalsukan → rate limit lead dilewati. Fallback `"unknown"`
  menggabung semua request tanpa header ke satu bucket (self-DoS).
- **Fix arah:** Gunakan IP tepercaya dari platform (Vercel), dokumentasikan asumsi.

### 🟠 SEC-07 — Hanya 1 endpoint memakai zod; sisanya validasi ad-hoc - **SELESAI (Fase D)**
- **Lokasi:** `admin/content`, `admin/settings`, `admin/products`, `admin/projects`,
  `admin/articles`, `admin/media`, `api/user/profile`
- **Masalah:** Mass-assignment sebagian dicegah dengan memilih key eksplisit, tapi
  **tidak ada kontrak skema**; tidak ada batas panjang/ukuran string & array → risiko
  content/storage DoS. Contoh: `products/route.ts` `Number(body.price) || 0` menerima
  harga negatif; `socials[].href`/`cover` URL tidak divalidasi.
- **Fix arah:** Definisikan zod schema per resource (semua string `.max()`, tolak key asing).

### ✅ SEC-08 — Cloudinary destroy menerima `publicId` arbitrer (tanpa cek folder/ownership) — **SELESAI (Fase A)**
- **Lokasi:** `src/app/api/cloudinary/destroy/route.ts`, `src/lib/cloudinary.ts` (`destroyAsset`)
  + `admin/media/route.ts` (hapus via query `publicId`)
- **Masalah:** Tidak diverifikasi bahwa `publicId` berawalan `lktech/` atau terdaftar
  di koleksi `media`. Token admin yang bocor/dikompromi bisa menghapus aset Cloudinary
  mana pun (termasuk folder/env lain yang berbagi akun).
- **Fix yang diterapkan:** `destroyAsset()` (chokepoint server) kini **menolak** `publicId`
  yang tidak berprefix `lktech/` atau mengandung `..`. Route `destroy` juga memvalidasi
  lebih awal dan mengembalikan **HTTP 400** (bukan 500) untuk `publicId` invalid.

### ✅ SEC-09 — Signed upload: folder UI tidak cocok dengan allow-list (silent downgrade) — **SELESAI (Fase A)**
- **Lokasi:** `src/lib/cloudinary.ts`, `src/app/api/cloudinary/sign/route.ts`, `src/lib/cloudinary-client.ts`
- **Masalah:** `ALLOWED_FOLDERS` tidak memuat `lktech/blog` (folder artikel) → upload blog
  dipaksa ke `lktech/lainnya`. Signature juga hanya menandatangani `{folder, timestamp}`
  (tanpa batas tipe/ukuran berkas).
- **Fix yang diterapkan:**
  - `CLOUDINARY_FOLDERS` kini berisi `portofolio`, **`blog`**, **`produk`**, `banner`,
    `lainnya` — satu sumber kebenaran yang dipakai API & UI.
  - Folder yang tidak dikenal kini **ditolak (400)**, bukan diganti diam-diam.
  - Signature mengikat **`allowed_formats`** (`jpg,jpeg,png,webp,avif`) dan mengembalikan
    **`maxBytes`** (8 MB); client mengirim `allowed_formats` yang sama & menolak berkas
    kelebihan ukuran lebih awal. Cloudinary akan menolak upload yang tak sesuai signature.

### 🟡 SEC-10 — `admin/media` menyimpan `secureUrl`/`publicId` klaim client tanpa verifikasi - **SELESAI (Fase D)**
- **Lokasi:** `src/app/api/admin/media/route.ts`
- **Masalah:** Client mengirim metadata aset dan langsung disimpan; tidak dicek bahwa
  aset benar-benar ada / diupload oleh admin ini. `secureUrl` bisa menunjuk ke mana saja
  (host selain remotePatterns → gambar gagal, tapi tetap tersimpan).
- **Fix arah:** Verifikasi aset di Cloudinary (mis. Admin API) sebelum menyimpan record.

### 🟡 SEC-11 — `/api/media` membocorkan seluruh `publicId` & mengembalikan `{items:[]}` saat error - **SELESAI (Fase D)**
- **Lokasi:** `src/app/api/media/route.ts`
- **Masalah:** GET publik mengembalikan seluruh media (termasuk `publicId`) tanpa
  paginasi; error → 200 `{items:[]}` (tidak bisa dibedakan dari kosong).
- **Fix arah:** Jangan ekspos `publicId` publik bila tak perlu; kembalikan status error
  yang benar; pertimbangkan paginasi.

### 🟡 SEC-12 — `/api/admin/email/test` tanpa rate limit & mengembalikan body error provider - **SELESAI (Fase D)**
- **Lokasi:** `src/app/api/admin/email/test/route.ts`, `src/lib/email.ts:96`
- **Masalah:** Pengiriman ke `check.email` sudah benar (tidak ada recipient injection),
  tetapi tidak di-throttle → bisa di-loop spam; pesan error Resend diteruskan mentah ke
  client (info disclosure).
- **Fix arah:** Rate limit; kembalikan error generik, log detail di server.

### 🟡 SEC-13 — Email test/lead: potensi volume email tanpa kontrol
- **Lokasi:** `src/app/api/lead/route.ts:104` → `sendLeadNotification`
- **Masalah:** Tiap lead terkirim memicu email; digabung lemahnya rate limit (SEC-04/06)
  bisa menghasilkan volume email (biaya/spam ke `LEAD_NOTIFY_EMAILS`).
- **Fix arah:** Limiter efektif + (opsional) batas harian.

### 🟡 SEC-14 — Markdown link tanpa allow-list skema (potensi stored XSS) - **SELESAI (Fase D)**
- **Lokasi:** `src/lib/markdown.tsx`
- **Masalah:** `[text](url)` dirender jadi `<a href={url}>` tanpa membatasi skema
  (`javascript:`), tanpa `rel="noopener"`. Body artikel dikelola admin, tapi bila digabung
  SEC-01 (user login bisa menulis artikel via client SDK) jadi jalur stored-XSS.
- **Fix arah:** Izinkan hanya `http/https/mailto`; tambahkan `rel="noopener noreferrer"`.

### 🟡 SEC-15 — Slug dijadikan document ID tanpa sanitasi panjang/charset - **SELESAI (Fase D)**
- **Lokasi:** `admin/articles/route.ts`, `articles.ts` (doc id = slug)
- **Masalah:** Slug klien dipakai verbatim sebagai Firestore doc ID (hanya fallback
  `slugify`). Tidak ada batas panjang/charset konsisten.
- **Fix arah:** Normalisasi/validasi slug di server (batas panjang + charset) untuk
  semua resource (`articles`, `projects`, `products`).

### 🟡 SEC-16 — `/api/admin/*` menyebut nama env var saat 503 - **SELESAI (Fase D)**
- **Lokasi:** `src/lib/admin-guard.ts` (pesan: "... Isi FIREBASE_ADMIN_* di .env.local")
- **Masalah:** Info disclosure minor saat konfigurasi belum lengkap.
- **Fix arah:** Pesan generik di produksi.

### 🟢 SEC-17 — Hardcoded PII/kontak nyata sebagai default di source
- **Lokasi:** `src/lib/settings-types.ts:17-18` (`lupyariestaa@gmail.com`,
  `6283159688549`), `.env.example:33,49`
- **Masalah:** Email pribadi & nomor WhatsApp nyata di-commit sebagai default (masuk
  bundle client & git history). Dua tempat default nomor (`settings-types.ts` &
  `whatsapp.ts:1`) berisiko drift.
- **Fix arah:** Placeholder netral; wajib dari env; satu sumber nomor WhatsApp.

### 🟢 SEC-18 — Normalisasi nomor WhatsApp lokal (mis. `08…`) tidak diubah ke `62…` - **SELESAI (Fase D)**
- **Lokasi:** `src/lib/settings.ts:14`, `src/lib/whatsapp.ts:9`
- **Masalah:** `.replace(/\D/g,"")` saja; nomor format lokal menghasilkan `wa.me/08…` rusak.
- **Fix arah:** Normalisasi `0…` → `62…`.

---

## 2. Integritas Data & Dashboard Admin (ADM)

### ✅ ADM-01 — Manager konten bisa menimpa data produksi dengan default (silent data-loss) — **SELESAI (Fase A)**
- **Lokasi:** `src/components/admin/use-site-content.ts`
- **Masalah:** Jika `fetchSiteContent()` gagal saat mount, `content` tetap berisi
  **default seed**. Form tetap tampil penuh. Begitu admin menyimpan apa pun, seluruh
  dokumen Firestore ditimpa `defaultSiteContent()` (+ satu patch) → **seluruh konten
  produksi hilang**.
- **Fix yang diterapkan:** Hook `useSiteContent` kini melacak `loadFailed`. Bila pemuatan
  gagal, `commit()` **ditolak total** (tidak menyimpan), menampilkan toast & pesan error.
  Setiap manager (services, faq, pricing, hero, content-extra) menonaktifkan tombol
  Simpan saat `loadFailed` dan menampilkan peringatan "Muat ulang sebelum menyimpan agar
  tidak menimpa data yang ada". `reload()` yang berhasil mereset flag ini.

### ✅ ADM-02 — Tidak ada proteksi "perubahan belum disimpan" di form mana pun — **SELESAI (Fase C)**
- **Lokasi:** `src/components/admin/use-unsaved-changes.ts`, `src/components/admin/unsaved-changes.tsx`
- **Fix yang diterapkan:** Hook `useUnsavedChanges` + provider `UnsavedChangesProvider`
  memberi: (a) peringatan `beforeunload` saat ada perubahan; (b) `guard(action)` yang
  menampilkan `ConfirmDialog` sebelum membuang edit. Dipasang di form artikel, produk,
  proyek, layanan, hero, FAQ, harga, konten, dan pengaturan.

### ✅ ADM-03 — Perubahan pindah menu saat mengedit hilang senyap — **SELESAI (Fase C)**
- **Lokasi:** `src/components/admin/admin-shell.tsx`, `unsaved-changes.tsx`
- **Fix yang diterapkan:** `AdminShell` mengintersep klik menu sidebar via
  `requestNavigation()`; bila ada perubahan belum disimpan, muncul dialog konfirmasi
  sebelum pindah halaman.

### ✅ ADM-04 — Auth guard hanya client-side (tanpa middleware/server gate) — **SELESAI (Fase C)**
- **Lokasi:** `src/proxy.ts` (dulu `middleware.ts`), `src/app/api/admin/session/route.ts`,
  `src/lib/session.ts`, `src/lib/session-constants.ts`, `auth-guard.tsx`, `login-form.tsx`
- **Fix yang diterapkan:** Gate server/edge untuk `/admin/*`. `POST /api/admin/session`
  memverifikasi admin lalu membuat **session cookie HttpOnly** (`__session`) via
  Firebase `createSessionCookie`. `proxy.ts` me-redirect ke `/admin/login` bila cookie
  tidak ada (mendukung `?next=`). Cookie dihapus saat logout. Verifikasi kriptografis
  tetap di `requireAdmin` (defense-in-depth).

### 🟡 ADM-05 — Guard admin rentan false-negative & verifikasi sekali per sesi
- **Lokasi:** `src/components/admin/auth-guard.tsx:30-49`
- **Masalah:** (a) Jika `getIdToken()` error sesaat, admin sah langsung mendapat layar
  "Tidak punya akses" (satu-satunya jalan keluar: logout/login) — tidak ada retry.
  (b) Efek hanya bergantung `[loading, user]` → keanggotaan diverifikasi **sekali**;
  token refresh ~1 jam tidak memicu re-verifikasi; jika `ADMIN_EMAILS` diubah, sesi
  lama tetap tampil sampai reload (API akan 403 → UI rusak parsial).
- **Fix arah:** Tambah retry + re-verifikasi berkala / saat token refresh.

### ✅ ADM-06 — Toast tidak konsisten di manager konten — **SELESAI (Fase C)**
- **Lokasi:** `use-site-content.ts` (`reject()`), semua manager konten
- **Fix yang diterapkan:** `useSiteContent` mengekspos `reject(msg)` yang set banner
  **dan** toast. Semua error validasi (layanan, FAQ, harga) kini memakai `reject`;
  `ListEditor` (konten) memakai `onError={reject}`.

### 🟡 ADM-07 — `useServices()` over-fetch (memuat seluruh SiteContent hanya untuk dropdown) - **SELESAI (Fase D)**
- **Lokasi:** `src/components/admin/use-services.ts`
- **Masalah:** Meski komentarnya menyatakan "tanpa perlu memuat seluruh SiteContent",
  fungsi tetap memanggil `fetchSiteContent()` (seluruh dokumen) lalu memetakan hanya
  `services`. Dipakai `projects-manager` untuk sebuah `<select>`.
- **Fix arah:** Endpoint/hook ringan khusus daftar layanan, atau kirim sebagai prop.

### ✅ ADM-08 — Dashboard membaca endpoint **publik** ter-cache untuk dropdown — **SELESAI (Fase C)**
- **Lokasi:** `src/components/admin/media-manager.tsx`
- **Fix yang diterapkan:** Dropdown "Proyek terkait" kini memakai `fetchProjects()` (API
  admin, `no-store`) alih-alih `fetch("/api/projects")` mentah.

### 🟡 ADM-09 — Potensi lost-update: PUT seluruh dokumen SiteContent (last-write-wins)
- **Lokasi:** `src/components/admin/use-site-content.ts:62-88` + `api/admin/content/route.ts`
- **Masalah:** `commit` mengirim **seluruh** SiteContent. Bila dua admin membuka dua
  halaman konten berbeda (basis sama), simpan kedua menimpa perubahan pertama di bagian
  yang tak berhubungan. Tidak ada versi/optimistic-concurrency.
- **Fix arah:** Kirim patch per-bagian, atau tambah version/timestamp check.

### 🟡 ADM-10 — Media fetch berulang (tidak ada cache bersama)
- **Lokasi:** `hero-showcase-manager` → `MediaPickerDialog` memanggil `fetchMedia()` sendiri
- **Masalah:** Tiap buka dialog mengunduh ulang seluruh media; tidak ada cache SWR.
- **Fix arah:** Cache bersama / react-query.

### ✅ ADM-11 — Konfirmasi hapus tidak konsisten — **SELESAI (Fase C)**
- **Lokasi:** `src/components/admin/confirm-dialog.tsx` + manager (artikel, produk,
  proyek, media, lead, layanan, pengaturan)
- **Fix yang diterapkan:** Komponen `ConfirmDialog` bersama (aksesibel: `role="dialog"`,
  focus trap sederhana, Escape, restore focus). Semua hapus **permanen** memakai dialog
  ini, bukan `window.confirm`. (Sisa `confirm()` hanya pada penghapusan **baris draft**
  di editor hero/gambar — non-permanen, masih dapat diterima.)

### ✅ ADM-12 — Validasi form minim — **SELESAI (Fase C)**
- **Lokasi:** `products-manager.tsx`, `projects-manager.tsx`, `lib/utils.ts`
- **Fix yang diterapkan:** Produk: harga tidak boleh negatif; `originalPrice` harus
  ≥ harga jual. Proyek: slug unik + normalisasi slug + validasi rentang tahun
  (2000..currentYear+1). Ditambahkan util `slugify` bersama di `lib/utils`. (Validasi
  server-side menyeluruh lewat zod = pekerjaan Fase D / SEC-07.)

### ✅ ADM-13 — Race pada optimistic update (rollback pakai snapshot lama) — **SELESAI (Fase C)**
- **Lokasi:** `media-manager.tsx`, `articles-manager.tsx`, `products-manager.tsx`,
  `projects-manager.tsx`
- **Fix yang diterapkan:** Setelah mutasi sukses, daftar **dimuat ulang** dari server
  (`load({ silent: true })`) untuk rekonsiliasi — mengurangi risiko rollback memakai
  snapshot lama. Rollback optimistik tetap ada sebagai fallback saat error.

### ✅ ADM-14 — Double-submit race pada ubah status lead — **SELESAI (Fase C)**
- **Lokasi:** `src/components/admin/leads-manager.tsx`
- **Fix yang diterapkan:** Menyimpan `busyIds` (Set id lead yang sedang diproses);
  `<select>` status di-`disabled` selama request berjalan dan `onStatus` mengabaikan
  klik ganda. Menghilangkan request tak berurutan dari perubahan status cepat.

### 🟡 ADM-15 — A11y dashboard
- `admin-shell.tsx`: `<nav>` tanpa `aria-label`; link aktif hanya warna (tanpa
  `aria-current="page"`); drawer mobile tanpa focus trap/`aria-expanded`/`inert`.
- Banner error inline tanpa `role="alert"`/`aria-live` (mis. `articles-manager`,
  `leads-manager`) → validasi senyap bagi screen reader (kontras: `toast.tsx` sudah benar).
- Banyak input hanya `placeholder` tanpa `<label>` (mis. `content-extra-manager`,
  `services-manager`).
- Link `target="_blank"` tanpa `rel="noopener noreferrer"` (`articles-manager`,
  `products-manager`) — beda dari `leads-manager` yang sudah ada.

### 🟡 ADM-16 — Loading/empty/error tidak konsisten & menyesatkan
- **Lokasi:** `dashboard-overview`, `articles-manager`, `content-extra-manager`,
  `settings-manager`, `media-manager` (5 gaya berbeda).
- `use-async-list`: `loading=false` di `finally` walau error → media/leads menampilkan
  **empty-state** ("Belum ada…") padahal fetch gagal → admin mengira data nol.
- `use-site-content`: `error` "lengket" setelah gagal; form tetap render default (lihat ADM-01).

### 🟢 ADM-17 — Dead code & idiom berulang (maintainability)
- `const { id: _id, ...rest } = x; void _id;` diulang 3× (articles/products/projects).
- `const refresh = async () => { await load(); }` (no-op wrapper) diulang 5×.
- `useToast()` fallback no-op (`toast.tsx`) menyembunyikan bug provider.
- `counter` module-scope di `toast.tsx` (sebaiknya `useRef`/`randomUUID`).
- Re-export tipe dari `content-extra-manager.tsx` (indireksi tak perlu).
- Endpoint `isSlugTaken`/`isProductSlugTaken` (PUT) **tidak dipanggil** client mana pun.
- `ToastProvider` di-pakai `use-site-content` tapi tidak semua manager.
- IA tidak konsisten: FAQ & Pricing punya menu sendiri, tapi Testimoni/Stats/WhyUs/Process
  tersembunyi di menu "Konten".

---

## 3. Auth, Produk, Cart & Checkout (USR)

### ✅ USR-01 — Keranjang pakai 1 key localStorage global (bocor antar user) — **SELESAI (Fase A)**
- **Lokasi:** `src/components/cart-provider.tsx`
- **Masalah:** Satu key `lktech.cart.v1` dipakai semua orang; logout tidak membersihkan
  cart → di perangkat bersama user B melihat/membeli isi keranjang user A.
- **Fix yang diterapkan:** Keranjang kini **per-identitas**: key `lktech.cart.v1:<uid>`
  untuk user login, `lktech.cart.v1:guest` untuk anonim. `CartProvider` memakai `useAuth()`
  dan memanggil `setCartOwner(user?.uid ?? null)` saat identitas berubah. Saat login dari
  guest, item guest **digabung** ke keranjang user (tidak hilang). Saat logout, owner
  kembali ke guest → keranjang user tidak lagi terbaca (tidak bocor).

### 🟠 USR-02 — User & admin berbagi SATU sesi Firebase (tidak ada isolasi sesi nyata)
- **Lokasi:** `src/app/layout.tsx` (satu `AuthProvider` global) + `admin/layout.tsx`
- **Masalah:** Dokumen desain mengklaim "isolasi sesi via guard", padahal hanya
  **otorisasi** yang berbeda; admin yang login = user yang login (bisa isi cart/checkout).
  Email/password admin memakai client auth yang sama dengan Google user.
- **Fix arah:** Dokumentasikan sebagai single-identity by design, atau pisahkan instance
  app / gate admin via sesi server.

### ✅ USR-03 — `?next=` tidak dibaca → login selalu mendarat di `/akun` — **SELESAI (Fase B)**
- **Lokasi:** `src/app/masuk/page.tsx`, `src/lib/redirect.ts`
- **Masalah:** Login mengabaikan `?next=` sehingga user yang mau beli selalu mendarat
  di `/akun`, bukan kembali ke produk/keranjang.
- **Fix yang diterapkan:** `/masuk` membaca `searchParams.next` dan meneruskannya ke
  `UserLoginForm`. Nilai divalidasi `safeRedirectPath()` (hanya path relatif internal;
  `//evil`, `/\`, backslash, skema aneh ditolak → cegah open-redirect). Default `/akun`.

### ✅ USR-04 — Checkout & total sepenuhnya dipercaya client; tanpa order record — **SELESAI (Fase B)**
- **Lokasi:** `src/app/api/orders/route.ts`, `src/lib/orders.ts`, `src/lib/order-schema.ts`,
  `src/lib/order-types.ts`, `src/lib/order-api.ts`
- **Masalah:** Tidak ada endpoint server yang memverifikasi login, menghitung ulang total,
  mengecek stok, atau menyimpan order.
- **Fix yang diterapkan:** Endpoint baru `POST /api/orders` (wajib login via `requireUser`,
  rate-limited): klien hanya mengirim `{ slug, qty }`; server mengambil produk dari
  Firestore, memverifikasi aktif/tidak sold-out/harga > 0, **menghitung ulang harga & total**,
  menyimpan order ke koleksi `orders`, menaikkan `orderCount` user (best-effort), dan
  mengembalikan pesan WhatsApp **kanonik** + nomor tujuan. `GET /api/orders` mengembalikan
  pesanan milik user sendiri (scoped by uid dari token).

### ✅ USR-05 — Harga lama (snapshot) & tidak ada re-check saat checkout — **SELESAI (Fase B)**
- **Lokasi:** `src/app/api/orders/route.ts` (`getProductsBySlugs` + recompute)
- **Masalah:** Cart memakai harga lama (snapshot di localStorage).
- **Fix yang diterapkan:** Harga diambil ulang dari Firestore saat checkout. Bila harga
  berubah, yang dipakai adalah harga server saat checkout (pesan & order memakai harga
  terverifikasi). Jika produk sudah nonaktif/sold-out/tanpa harga → checkout ditolak
  dengan pesan jelas (HTTP 409 + kode error).

### ✅ USR-06 — Tidak ada cross-tab sync keranjang — **SELESAI (Fase B)**
- **Lokasi:** `src/components/cart-provider.tsx` (`subscribe`)
- **Masalah:** Dua tab menampilkan keranjang berbeda.
- **Fix yang diterapkan:** `subscribe` menambahkan listener `window.addEventListener("storage", …)`;
  saat tab lain mengubah key owner yang sama, `cache` dimuat ulang & pelanggan diumumkan.

### 🟠 USR-07 — `requireUser` menerima akun Google apa pun tanpa allowlist & limit
- **Lokasi:** `src/lib/admin-guard.ts` (`requireUser`), `api/user/profile` POST
- **Masalah:** Siapa pun bisa membuat akun + POST profil tanpa throttle (lihat SEC-05).
- **Fix arah:** Rate limit + (opsional) kontrol abuse.

### ✅ USR-08 — Produk list/detail tidak konsisten saat kosong & error di-mask — **SELESAI (Fase B)**
- **Lokasi:** `src/lib/products.ts`, juga `projects.ts` & `articles.ts`
- **Masalah:** Fallback `DEFAULT_*` muncul walau koleksi sengaja dikosongkan; error DB disamarkan.
- **Fix yang diterapkan:** Fallback default HANYA ketika Admin SDK belum dikonfigurasi (mode
  demo). Saat SDK aktif namun koleksi kosong → kembalikan `[]`; saat error → kembalikan
  kosong/`null` (tidak menampilkan data contoh palsu). Diterapkan konsisten di products,
  projects, dan articles.

### ✅ USR-09 — `price === 0` ("Hubungi kami") tetap dianggap bisa dibeli & `InStock` — **SELESAI (Fase B)**
- **Lokasi:** `src/lib/product-format.ts` (`isPurchasable`), `product-buy-actions.tsx`,
  `produk/[slug]/page.tsx`
- **Masalah:** Tombol beli tetap muncul & JSON-LD `InStock` dengan `price: 0`.
- **Fix yang diterapkan:** Produk tanpa harga menampilkan tombol **"Hubungi kami"**
  (WhatsApp) alih-alih Beli/Keranjang; JSON-LD memakai `PreOrder` & `price` di-omit
  bila tidak ada harga.

### ✅ USR-10 — JSON-LD produk: `price` tipe number, `image` fallback route — **SELESAI (Fase B)**
- **Lokasi:** `src/app/produk/[slug]/page.tsx`
- **Fix yang diterapkan:** `price` kini string (`String(price)`), di-omit bila tak ada harga;
  `image` tidak lagi memakai route `/opengraph-image` sebagai fallback (dibiarkan `undefined`
  bila galeri kosong); `availability` memperhitungkan produk tanpa harga (`PreOrder`).

### 🟡 USR-11 — Tidak ada stok/kuantitas & item sold-out di cart tidak dicek ulang
- **Lokasi:** `cart-provider.tsx` (`setQty` hanya `Math.max(1, qty)`, bisa 9999),
  `cart-view.tsx`, `cart.ts`
- **Masalah:** Hanya `soldOut` boolean tanpa `stock`. Produk yang jadi sold-out setelah
  ditambahkan tetap dapat di-checkout.
- **Fix arah:** Cap jumlah; re-cek availability saat render/checkout.

### 🟡 USR-12 — Duplicate/redundant profile write + schema drift saat login - **SELESAI (Fase D)**
- **Lokasi:** `user-login-form.tsx` `finish()` (POST profil tiap login, dipanggil 2 jalur),
  `user-profile.ts` (create menulis `createdAt`/`lastLoginAt` **dan** `*ISO` = data duplikat)
- **Fix arah:** Tulis hanya `*ISO`; dedupe `finish()`; tulis hanya saat pertama/berubah.

### 🟡 USR-13 — Kegagalan simpan profil senyap + stat `/akun` menyesatkan
- **Lokasi:** `user-login-form.tsx` (`catch {}`), `user-account.tsx` (`orderCount 0`,
  `createdAt "—"`), `user-profile.ts` (return `null` bila Admin SDK absen)
- **Masalah:** User diberi tahu sukses padahal profil mungkin tidak tersimpan.
- **Fix arah:** Notifikasi non-blocking; surface error konfigurasi.

### ✅ USR-14 — "Total Pembelian" selalu 0 & tidak ada riwayat pesanan — **SELESAI (Fase B)**
- **Lokasi:** `src/components/auth/user-account.tsx`, `src/lib/orders.ts`, `src/app/api/orders/route.ts`
- **Masalah:** `incrementUserOrderCount` tidak pernah dipanggil; tidak ada UI riwayat.
- **Fix yang diterapkan:** `POST /api/orders` menaikkan `orderCount` saat order dibuat.
  `/akun` kini menampilkan **Riwayat Pesanan** (dari `GET /api/orders`) dan "Total
  Pembelian" memakai `max(orderCount, jumlah order yang tampil)` sebagai fallback.

### ✅ USR-15 — "Beli Sekarang" diam-diam menambahkan ke cart yang sudah ada — **SELESAI (Fase B)**
- **Lokasi:** `src/components/product-buy-actions.tsx` + `cart-view.tsx`
- **Masalah:** Bila cart sudah berisi item lain, checkout mencakup semuanya — menyesatkan.
- **Fix yang diterapkan:** Checkout kini **selalu** melalui halaman `/keranjang` (langkah review
  eksplisit) sebelum order dibuat, sehingga user melihat seluruh item sebelum memesan.
  (Perilaku "tambah 1 produk lalu review" dipertahankan, tetapi tidak ada lagi checkout
  implisit tanpa konfirmasi.)

### ✅ USR-16 — Tidak ada konfirmasi/sukses checkout & cart tidak dibersihkan — **SELESAI (Fase B)**
- **Lokasi:** `src/components/cart-view.tsx`
- **Masalah:** Checkout tanpa umpan balik; cart tetap; `window.open` bisa diblokir.
- **Fix yang diterapkan:** Alur baru: tombol menampilkan status "Memproses" → order dibuat →
  WhatsApp dibuka → cart dikosongkan → tampil **layar konfirmasi "Pesanan dikirim"**.
  Bila popup diblokir, otomatis dialihkan di tab yang sama (`window.location.href`).

### 🟡 USR-17 — WhatsApp message injection (newline dari field user-admin) — **SELESAI (Fase B)**
- **Lokasi:** `src/lib/cart.ts` (`sanitizeMessageText`, `buildOrderMessage`)
- **Fix yang diterapkan:** Teks dari nama produk & nama pembeli dibersihkan (`sanitizeMessageText`:
  hapus newline/karakter kontrol) sebelum disusun ke pesan. Pesan kanonik dibangun di server.

### 🟡 USR-18 — `popup` blocked tanpa fallback redirect (mobile Safari/webview)
- **Lokasi:** `src/lib/auth.ts` (`signInWithPopup` saja)
- **Masalah:** Tidak ada fallback `signInWithRedirect` saat popup diblokir.
- **Fix arah:** Deteksi `popup-blocked`/`operation-not-supported` → redirect.

### ✅ USR-19 — Avatar Google gagal render (host tidak ada di `remotePatterns`) — **SELESAI (Fase B)**
- **Lokasi:** `next.config.ts`
- **Masalah:** `next/image` untuk avatar Google (`lh3.googleusercontent.com`) akan error.
- **Fix yang diterapkan:** Host `lh3.googleusercontent.com` ditambahkan ke `images.remotePatterns`.

### 🟡 USR-20 — Profil user menyimpan PII tanpa kebijakan retensi/penghapusan
- **Lokasi:** `src/lib/user-profile.ts`, `api/user/profile`
- **Masalah:** Email/nama/foto disimpan; tidak ada TTL/delete-account/notice.
- **Fix arah:** Dokumentasikan + sediakan alur hapus akun.

### 🟢 USR-21 — A11y form user/cart
- Error login/cart/akun tanpa `role="alert"`/`aria-live`.
- Quantity cart pakai `<span>` + tombol `+/-` (tanpa `spinbutton`/`aria-valuenow`).
- "Kosongkan keranjang" destruktif tanpa konfirmasi/undo.

### 🟢 USR-22 — Dead code / nilai hardcoded (sebagian) 
- ✅ Dihapus (Fase B): `BuySpinner` (`product-buy-actions.tsx`), `buildSingleProductMessage` (`cart.ts`).
- ⏳ Sisa: `incrementUserOrderCount` (kini **sudah dipakai** oleh `POST /api/orders`),
  `getProductCategories` (belum dipakai).
- ⏳ Dua default nomor WhatsApp (`whatsapp.ts` & `settings-types.ts`) — belum disatukan.
- ⏳ Klaim `user-guard.tsx` "dengan `next` untuk kembali" — perlu diperbarui (USR-03 sudah
  menangani `next`, tapi `user-guard` masih redirect tanpa `next`).

---

## 4. Konten Publik, SEO & Kinerja (SEOP)

### 🔴 SEOP-01 — Data placeholder tampil sebagai kenyataan (trust/legal)
- **Lokasi:** `src/lib/content.ts` (`STATS`, `TESTIMONIALS`, `PROJECTS`, `CLIENTS`),
  `src/components/sections/hero.tsx` ("15+ klien", avatar stok)
- **Masalah:** Testimoni rekaan, metrik proyek rekaan (`+40%`, `< 1,5s`), avatar stok
  Unsplash sebagai "klien". Di-seed sebagai default & dirender saat Firestore kosong;
  tidak ada guard yang menyembunyikan di situs publik.
- **Dampak:** Menyesatkan calon klien (risiko trust/legal).
- **Fix arah:** Isi data asli, tandai jelas sebagai contoh, atau kosongkan sampai siap;
  minimal hapus avatar stok & buat klaim klien dinamis.

### 🟠 SEOP-02 — Konten belum 100% terhubung ke dashboard
- **Lokasi:** `content.ts` (`TECH_STACK`, `CLIENTS`, `LEAD_SERVICES`), heading section
  (`services/why-us/process/stats/testimonials/pricing/faq/technologies`), `footer.tsx`,
  `kontak/page.tsx` (jam respons).
- **Masalah:** Yang masih hardcoded & tidak bisa dikelola: teknologi, heading/eyebrow/
  deskripsi tiap section, blurb footer, jam respons, chip hero ("100% Kepuasan",
  "Clean Code"). Opsi `LEAD_SERVICES` di form kontak fixed enum → bisa divergen dari
  layanan yang dikelola dashboard.
- **Fix arah:** Perluas `SiteContent` (teknologi, heading section, blurb, jam) atau
  minimal dokumentasikan mana yang sengaja statis.

### 🟠 SEOP-03 — Fallback "array kosong → default muncul lagi" - **SELESAI (Fase D)**
- **Lokasi:** `src/lib/site-content.ts`, `projects.ts`, `articles.ts`, `products.ts`
  (`if (snap.empty) return DEFAULT_*`)
- **Masalah:** Admin menghapus semua item → default contoh muncul kembali; tidak bisa
  benar-benar kosong.
- **Fix arah:** Bedakan `undefined` (belum diatur) vs `[]` (sengaja kosong).

### 🟠 SEOP-04 — Tidak ada `not-found.tsx` / `error.tsx` / `loading.tsx` - **SELESAI (Fase D)**
- **Lokasi:** `src/app/**`
- **Masalah:** `notFound()` dipanggil di halaman detail (`layanan/portofolio/blog/produk`),
  tetapi tidak ada 404 kustom → user melihat 404 Next default tanpa navbar/footer brand.
  Tidak ada error boundary → kegagalan Firestore menampilkan halaman error default.
- **Fix arah:** Tambah `not-found.tsx`, `error.tsx`, `loading.tsx` (global & per-segmen).

### 🟠 SEOP-05 — Title ganda: `— Portofolio | LKTech` - **SELESAI (Fase D)**
- **Lokasi:** `src/app/layout.tsx` (`template: "%s | LKTech"`) vs halaman detail yang
  menambahkan suffix sendiri (`"— Portofolio"`, `"— Blog"`).
- **Masalah:** Judul jadi "Foo — Portofolio | LKTech" (dobel, kepanjangan).
- **Fix arah:** Hapus suffix manual, atau hapus template.

### 🟠 SEOP-06 — Sitemap: `lastModified: now` untuk semua URL - **SELESAI (Fase D)**
- **Lokasi:** `src/app/sitemap.ts`
- **Masalah:** Semua URL dianggap "baru diubah" tiap build; tanggal asli
  (`updatedAtISO`, `publishedAt`) diabaikan → sinyal freshness palsu.
- **Fix arah:** Pakai `lastModified` per-resource.

### 🟠 SEOP-07 — Halaman ISR tidak ter-invalidate saat data dikelola - **SELESAI (Fase D)**
- **Lokasi:** `revalidate` di `/layanan` (300), `/kontak` (300), `/blog` (60),
  `/portofolio` (60), `/produk` (120); `revalidatePath` **hanya** dipanggil di
  `admin/content` & `admin/settings` — **tidak** di `admin/projects/articles/media/products`.
- **Masalah:** Edit proyek/artikel/produk/media bisa tampil basi hingga menit, dan dua
  permukaan (API `no-store` vs halaman ISR) saling berbeda.
- **Fix arah:** Panggil `revalidatePath` relevan saat mutasi, atau selaraskan `no-store`.

### 🟠 SEOP-08 — Kebijakan cache endpoint tidak konsisten
- **Lokasi:** `/api/content` (`no-store`), `/api/settings` (`no-store`),
  `/api/projects` (`s-maxage=30`), `/api/articles` (`s-maxage=60`), `/api/media` (`s-maxage=60` + `revalidate=60`)
- **Fix arah:** Satu strategi; dokumentasikan.

### 🟡 SEOP-09 — `/masuk`, `/akun`, `/keranjang` tidak di `sitemap` & tidak semua `noindex`
- **Lokasi:** `src/app/robots.ts`, `sitemap.ts`, metadata halaman
- **Masalah:** `/masuk`/`/akun` idealnya `noindex`; tidak di-disallow di robots.
- **Fix arah:** Tambah `robots: { index: false }` & atur robots.

### 🟡 SEOP-10 — `generateStaticParams` layanan pakai slug **statis** - **SELESAI (Fase D)**
- **Lokasi:** `src/app/layanan/[slug]/page.tsx` (`getServiceSlugs()` dari konstan statis)
  vs body baca dari Firestore.
- **Masalah:** Layanan baru dari dashboard tidak ikut di-prerender (dan bisa tak sekonsisten
  dengan sitemap yang membaca `content.services`).
- **Fix arah:** Ambil slug dari `getSiteContent()`.

### 🟡 SEOP-11 — "Empat langkah" hardcoded vs jumlah proses dinamis - **SELESAI (Fase D)**
- **Lokasi:** `src/components/sections/process.tsx`
- **Masalah:** Heading "Empat langkah sederhana" bisa salah bila admin menambah/menghapus langkah.
- **Fix arah:** Buat jumlah langkah dinamis / ubah copy.

### 🟡 SEOP-12 — Homepage hampir seluruhnya `"use client"`
- **Lokasi:** `hero`, `navbar`, `services`, `why-us`, `process`, `stats`, `testimonials`,
  `pricing`, `faq`, `cta-contact`, `footer` (semua client; menarik framer-motion)
- **Masalah:** Sebagian besar hanya butuh `useContent()` (data yang statis saat SSR);
  bisa jadi server component dengan props (pola sudah ada di `technologies`/`portfolio-teaser`).
- **Fix arah:** Konversi section murni-tampilan ke server component.

### 🟡 SEOP-13 — `priority` pada image non-LCP + marquee menduplikasi 40 gambar
- **Lokasi:** `hero.tsx` / `hero-showcase-carousel.tsx` (priority pada mockup),
  `technologies.tsx` (`[...TECH_STACK, ...TECH_STACK]`), `technology-logo.tsx` ("use client" per kartu)
- **Masalah:** Prioritas LCP bisa salah sasaran; marquee melipatgandakan request/DOM & membuat
  40 instance client component.
- **Fix arah:** Tinjau `priority`; render marquee via CSS; fallback `onerror` tanpa client.

### 🟡 SEOP-14 — A11y publik - **SELESAI (Fase D)**
- Dot carousel (`hero-showcase-carousel.tsx`) tanpa `aria-label`/`role`/keyboard & tanpa
  kontrol pause (auto-rotate) — WCAG 2.2.2.
- Star rating testimoni tanpa `aria-label` ("5 dari 5 bintang").
- `custom-cursor.tsx` tanpa `aria-hidden`; `intro-loader.tsx` mengunci scroll & fokus bisa
  masuk ke konten di belakang overlay.
- Mobile navbar toggle tanpa focus management.
- Duplikasi id `faq-panel-{i}`/`faq-button-{i}` di `faq-accordion.tsx` (risiko bila 2× di 1 halaman).
- Nav/footer pakai `<a href>` untuk route internal (bukan `next/link`) → reload penuh.

### 🟢 SEOP-15 — Dead code & inkonsistensi kecil - **SELESAI (Fase D)**
- `getServiceBySlug`, `CLIENTS`, `SOCIALS` (di `content.ts`) tidak terpakai.
- `image` JSON-LD Organization pakai `SITE.ogImage` (`/opengraph-image`) yang bukan URL gambar.
- `foundingDate` non-ISO, alamat hardcoded di `structured-data.tsx`.
- Halaman `/produk` metadata didefinisikan di layout **dan** page (duplikat).
- Homepage: klaim klien / chip hero hardcoded (lihat SEOP-02).
- `portfolio-teaser` selalu `slice(0,3)` tanpa kontrol "featured" (produk punya `featured`, proyek tidak).

---

## 5. Konfigurasi & Operasional (CFG)

### 🟡 CFG-01 — `firestore.rules` perlu publish ulang & diperluas
- **Lokasi:** `firestore.rules`
- **Masalah:** Rules kini **deny-all untuk klien** (Fase A, SEC-01/02/03). Perubahan ini
  **baru aktif setelah di-publish ulang** di Firebase Console.
- **Aksi:** Publish ulang `firestore.rules` di Firebase Console → Firestore → Rules.

### 🟡 CFG-02 — `.env.local` minim (email notifikasi inert)
- **Masalah:** Tidak ada `RESEND_API_KEY`/`EMAIL_FROM`/`LEAD_NOTIFY_EMAILS`/`SITE_URL`
  di `.env.local` saat audit → `isEmailConfigured` false → email notifikasi lead
  **tidak dikirim** (lead tetap tersimpan). `/api/admin/email/test` → 503.
- **Aksi:** Lengkapi env di Vercel & lokal.

### 🟡 CFG-03 — Tidak ada error tracking / monitoring produksi
- **Masalah:** Belum ada Sentry/sejenisnya (lihat `TASK-SELANJUTNYA.md`).
- **Aksi:** Pasang error tracking.

### 🟡 CFG-04 — Tidak ada `middleware.ts` (routing/keamanan terpusat) - **SELESAI (Fase D: proxy.ts)**
- **Masalah:** Tidak ada lokasi untuk gate `/admin/*` di edge atau redirect/header terpusat
  (terkait ADM-04).
- **Aksi:** Pertimbangkan `middleware.ts`.

### 🟢 CFG-05 — Dokumentasi bisa tidak sinkron dengan implementasi
- **Masalah:** `TASK-SELANJUTNYA.md` & `AUDIT-DAN-RENCANA-UPGRADE-DASHBOARD.md` menyebut
  4 error lint pra-ada & item yang kini sudah selesai; dokumen `docs/…` mengklaim fitur
  ("riwayat", "isolasi sesi") yang belum benar (USR-02/USR-14).
- **Aksi:** Segarkan status di dokumen agar tidak menyesatkan sesi berikutnya.

---

## 6. Peta Prioritas (Saran Urutan Pengerjaan)

### Fase A — Keamanan & Integritas Data (KRITIS) — ✅ SELESAI
1. ✅ SEC-01/SEC-02/SEC-03 (rules: deny-all klien; semua akses via Admin SDK).
2. ✅ ADM-01 (guard data-loss di manager konten).
3. ✅ USR-01 (cart per-uid + tidak bocor saat logout).
4. ✅ SEC-08/SEC-09 (Cloudinary destroy prefix + folder allow-list & constraint upload).

> ⚠️ **Langkah manual wajib:** publish ulang `firestore.rules` di Firebase Console →
> Firestore → Rules agar penutupan SEC-01/02/03 benar-benar aktif di produksi.

### Fase B — Funnel Pembelian & Correctness — ✅ SELESAI
6. ✅ USR-03 (`?next=` redirect + proteksi open-redirect).
7. ✅ USR-04/05/06 (endpoint `/api/orders` + re-check harga/stok server + cross-tab sync).
8. ✅ USR-08/09 (fallback produk konsisten, produk "Hubungi kami").
9. ✅ USR-14/15/16 (riwayat pesanan, alur checkout review + konfirmasi sukses).
10. ✅ USR-19 (avatar Google), USR-10 (JSON-LD), USR-17 (sanitasi pesan).

### Fase C — Keandalan Dashboard & UX — ✅ SELESAI
10. ✅ ADM-02/ADM-03 (proteksi unsaved-changes: `beforeunload` + guard navigasi sidebar).
11. ✅ ADM-04 (gate `/admin` via session cookie + `proxy.ts`).
12. ✅ ADM-06/08/11/12/13/14 (toast validasi, endpoint admin, ConfirmDialog, validasi, race).
13. Bonus a11y: `aria-label` + `aria-current` pada nav sidebar.

### Fase D — Konten, SEO, A11y, Kinerja, sisa Security/Config — ✅ SELESAI
14. ✅ SEOP-01/02/11/15 (konten: teknologi jadi dinamis & terkelola; teks proses; dead code `CLIENTS`/`SOCIALS`/`getServiceBySlug`/`getProductCategories` dihapus; structured-data diperbaiki).
15. ✅ SEOP-04/05/06/07/08/09/10 (404/error/loading global; title ganda diperbaiki; sitemap `lastModified` nyata; `revalidatePath` di semua mutasi; robots disallow halaman akun; slug layanan dinamis).
16. ✅ SEOP-13/14 + ADM-15 + USR-21 (a11y: dot carousel interaktif + kontrol pause, rating bintang `aria-label`, ID FAQ unik, `aria-current` nav, alt logo non-duplikat, cursor `aria-hidden`).
17. ✅ SEC-04/05/06 (rate limiter TTL-sweep + `clientIp` lebih ketat), SEC-07 (zod di profile/settings/media/article/project/product), SEC-10/11/12/14/15/16/18 (validasi media, sembunyikan publicId publik, error email generik, allow-list skema markdown, sanitasi slug doc-ID, pesan 503 generik, normalisasi nomor WA).
18. ✅ ADM-07 (endpoint `/api/admin/services` ringan), USR-12 (schema profil bersih), CFG-04 (gate `/admin` via proxy).
19. ⏳ **Di-defer (butuh keputusan/insiden besar):** SEC-04 (limiter terdistribusi butuh Redis — infra), SEOP-12 (konversi besar homepage ke server components), ADM-05/09/10/16, USR-02/07/11/13/18/20, CFG-03 (error tracking pihak ketiga). Lihat catatan di bawah.

> **Item yang sengaja di-defer (bukan terlupa):**
> - **SEC-04** — limiter terdistribusi butuh Upstash/Redis (keputusan infra berbayar).
> - **SEOP-12** — memindahkan ~10 section homepage ke server component = refactor besar berisiko; ditunda agar tidak mengganggu stabilitas.
> - **USR-02** — user & admin berbagi satu sesi Firebase = keputusan arsitektur (single-identity); perlu persetujuan sebelum diubah.
> - **CFG-03** — error tracking (Sentry) butuh akun & dependency baru.

---

## 7. Catatan Metodologi & Batasan

- Audit dilakukan dengan **membaca seluruh source** (`src/**`), `firestore.rules`,
  konfigurasi, dan **memverifikasi ulang** file kunci (use-site-content, user-login-form,
  cart-provider, rate-limit, settings-types, cloudinary sign/UI, auth-guard, next.config).
- Baseline statis: `tsc` bersih, `lint` bersih, `build` sukses (dijalankan di sesi ini).
- **Batasan:** audit **tidak** menjalankan alur end-to-end di runtime (uji manual per-fitur
  tetap disarankan), dan tidak menguji langsung di Firebase Console/Cloudinary/Resend.
  Sejumlah temuan bersifat "perlu diverifikasi saat eksekusi".

> **Cara pakai:** pilih item per Fase, centang saat selesai, perbarui status di dokumen ini
> dan `TASK-SELANJUTNYA.md` agar tidak ada gap yang terlewat.
