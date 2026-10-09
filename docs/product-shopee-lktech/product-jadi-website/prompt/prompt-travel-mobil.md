# PROMPT MASTER - Website Travel Mobil (Fullstack)

> **Untuk:** AI Agent di workspace terpisah.
> **Tujuan:** Membangun aplikasi web **Travel Mobil fullstack** yang lengkap, terintegrasi, siap produksi, dengan alur implementasi bertahap.
> **Berkas:** `prompt-travel-mobil.md` (folder `docs/product-shopee-lktech/product-jadi-website/prompt/`).
> **Versi:** 1.1 - 2026-10-06 (revisi: ketersediaan per layanan, auto-expired hold, pricing lengkap, kupon, otorisasi multi-cabang, seed contoh, design tokens, MVP vs nice-to-have).
> **Cara pakai:** salin seluruh berkas ini sebagai instruksi awal ke AI agent. Jalankan **fase demi fase** (bagian 12) dan laporkan hasil tiap fase.

---

## 0. PERAN & CARA KERJA AGENT

Anda adalah **Senior Fullstack Engineer + Product Engineer + UI/UX Engineer**. Anda membangun aplikasi ini **bertahap per-fase**, bukan sekali jadi.

**Aturan kerja:**
1. **Baca seluruh prompt ini sampai selesai** sebelum menulis kode.
2. Kerjakan **fase demi fase** sesuai **bagian 12 (Roadmap Implementasi)**. Jangan melompati fase.
3. Di akhir **setiap fase**, jalankan **quality gate** (bagian 13) dan **laporkan** (format di bagian 18).
4. **Prioritas:** kerjakan semua item `[MVP]` dulu; item `[NICE]` boleh ditunda bila waktu/kendala.
5. **Jangan berhenti untuk bertanya hal sepele** - gunakan keputusan terbaik yang wajar & konsisten dengan prompt ini. Bertanya hanya bila benar-benar ambigu & berdampak besar.
6. **Backward-compatible & aman:** jangan hardcode kredensial, jangan commit `.env`, validasi semua input di server.
7. **Kualitas > kecepatan:** kode rapi, terstruktur, tanpa `any` sembarangan, aksesibel, responsif mobile-first.
8. Bila ada keraguan implementasi teknis, pilih **solusi paling sederhana yang benar** (YAGNI), tapi tetap rapi & mudah dikembangkan.

---

## 1. RINGKASAN PROYEK

Membangun **website Travel Mobil** untuk bisnis yang menyediakan **3 layanan sekaligus**:
1. **Rental mobil** (lepas kunci / self-drive & dengan driver).
2. **Travel antar kota** (antar-jemput/shuttle dengan jadwal & rute).
3. **Paket wisata / tour** (paket perjalanan dengan itinerary).

**Model transaksi:** **tanpa payment gateway**. Pelanggan memilih -> mengisi form booking ringkas -> **dialihkan ke WhatsApp** dengan pesan otomatis berisi ringkasan booking. Konfirmasi & pembayaran dilakukan manual oleh admin lewat WhatsApp.

**Prinsip UX booking:** **sederhana, tidak ribet, sesingkat mungkin** - pelanggan tidak perlu membuat akun untuk booking.

> **Dua hal paling mudah salah - baca dulu:** (1) **ketersediaan berbeda per layanan** (rental = kalender armada, travel = kursi per jadwal, wisata = kuota per tanggal) - lihat bagian 5.2; (2) karena konfirmasi manual, booking `MENUNGGU` **harus punya auto-expired** agar tidak memblokir slot selamanya - lihat bagian 5.4.

---

## 2. TUJUAN & NON-TUJUAN

**Tujuan (harus tercapai):**
- Website profesional, cepat, SEO-friendly, responsif (mobile-first).
- Katalog armada, travel, dan paket wisata yang rapi & mudah ditelusuri.
- Alur booking mulus -> WhatsApp dengan data lengkap & valid + disclaimer estimasi.
- Dashboard admin lengkap (multi-cabang, driver, booking, konten, kupon, laporan).
- **Anti overbooking** sesuai model ketersediaan **per layanan** + **auto-expired hold**.
- Siap deploy (Vercel + Postgres serverless) dengan dokumentasi.

**Non-tujuan (jangan dikerjakan):**
- Payment gateway / integrasi pembayaran online (DILARANG - semua ke WhatsApp).
- Aplikasi mobile native (cukup web responsif/PWA ringan bila sempat).
- Multi-mata uang / multi-bahasa kompleks (cukup Bahasa Indonesia + IDR).
- Integrasi marketplace/OTA pihak ketiga.

---

## 3. TEKNOLOGI & TOOLS (WAJIB)

**Core stack:**
- **Next.js 15** (App Router, Server Components, Server Actions bila cocok) + **TypeScript** (strict).
- **React 19**, **Tailwind CSS** (+ `tailwindcss-animate`), **shadcn/ui** untuk komponen.
- **Prisma ORM** + **PostgreSQL** (serverless: **Neon** atau **Supabase**).
- **NextAuth (Auth.js)** - kredensial untuk admin & driver (tanpa OAuth publik; guest booking tidak butuh akun).
- **Zod** untuk validasi skema (input API & form).
- **React Hook Form** + `@hookform/resolvers` untuk form.
- **UploadThing** atau **Cloudinary** untuk upload gambar (armada, banner, blog).
- **Resend** (opsional) untuk email notifikasi booking baru ke admin.
- **Vercel** untuk hosting/deploy.

**Pendukung:**
- **lucide-react** untuk ikon; **date-fns** untuk tanggal; **recharts** untuk grafik laporan.
- **nuqs** atau search params standar untuk filter katalog.
- **Sentry** (opsional) untuk error monitoring.
- **ESLint + Prettier** + **Husky/lint-staged** (opsional).
- **Vitest** (unit) + **Playwright** (e2e, opsional) untuk testing.

> Catatan: semua tools di atas **gratis-tier friendly**. Gunakan versi terbaru stabil. Bila ada yang tidak tersedia, pilih padanan terdekat dan catat di laporan fase.

---

## 4. ARSITEKTUR & STRUKTUR FOLDER

**Arsitektur:** Next.js fullstack (App Router) - UI server components + API routes/server actions; data via Prisma ke Postgres; auth via NextAuth (role: `ADMIN_PUSAT`, `ADMIN_CABANG`, `DRIVER`). Semua logika bisnis penting (harga, ketersediaan, validasi) di **server**.

**Struktur folder yang diharapkan:**
```
/app
  /(public)                 -> halaman publik
    page.tsx                -> Beranda
    /mobil                  -> katalog
    /mobil/[slug]           -> detail mobil
    /travel                 -> daftar travel antar kota
    /travel/[slug]          -> detail travel
    /wisata                 -> paket wisata
    /wisata/[slug]          -> detail paket
    /cek-booking            -> lacak pesanan by kode
    /blog, /blog/[slug]
    /syarat, /faq, /cara-pesan
    /tentang, /kontak
  /(admin)/admin            -> dashboard (protected)
    /dashboard, /armada, /booking, /driver, /cabang,
    /travel, /wisata, /konten, /blog, /pelanggan, /ulasan,
    /laporan, /pengaturan
  /api                      -> API routes (lihat bagian 11)
    /auth/[...nextauth]
    /mobil, /travel, /wisata, /booking, /review, /availability
    /admin/...
    /upload
/components
  /ui                       -> shadcn/ui
  /public                   -> komponen halaman publik
  /admin                    -> komponen dashboard
  /shared                   -> navbar, footer, dsb
/lib
  /db.ts (prisma client), /auth.ts, /validators (zod),
  /whatsapp.ts, /utils.ts, /availability.ts, /pricing.ts
/prisma
  schema.prisma, seed.ts
/hooks, /types, /config, /public (aset)
```

**Konvensi:** nama file kebab-case; komponen PascalCase; server-only util diberi `import "server-only"`; pisahkan tipe aman-klien bila perlu.

---

## 5. MODEL BISNIS & ATURAN PRODUK

### 5.1 Tiga jenis layanan
- **Rental Mobil:** punya durasi (hari), lokasi ambil/kembali, opsi lepas kunci / dengan driver.
- **Travel Antar Kota:** rute (asal->tujuan), jadwal keberangkatan, kapasitas/kursi, harga per penumpang.
- **Paket Wisata:** durasi (mis. 2 hari 1 malam), itinerary, include/exclude, harga per orang / per grup.

### 5.2 Ketersediaan (anti double-booking) - TERPISAH PER LAYANAN

> **PENTING:** ketiga layanan punya model ketersediaan yang **berbeda**. Jangan menyamakan semuanya.

**A. Rental Mobil - kalender armada (per unit mobil)**
- 1 mobil fisik hanya bisa disewa oleh 1 booking pada rentang tanggal yang sama.
- Booking aktif **memblokir rentang** (`startDate` s.d. `endDate`) untuk `carId` tersebut.
- Validasi server: **tolak** booking baru bila ada overlap tanggal untuk mobil yang sama.
- Mobil punya status: `TERSEDIA`, `DISEWA`, `MAINTENANCE`, `NONAKTIF`.

**B. Travel Antar Kota - kursi per jadwal (seat inventory)**
- Yang dijual = **kursi**, bukan mobil. Setiap rute punya beberapa **jadwal keberangkatan** (`TripSchedule`), masing-masing dengan `capacity` (mis. 12 kursi) & `seatsBooked`.
- Booking menambah `passengers` ke `seatsBooked` jadwal tersebut.
- Validasi server: **tolak** bila `seatsBooked + passengers > capacity` (overbooking kursi).
- Ketersediaan ditampilkan sebagai **"sisa X kursi"** per jadwal.

**C. Paket Wisata - kuota peserta per tanggal**
- Setiap paket punya `maxPaxPerDate` (kuota per tanggal keberangkatan). Booking menambah `participants`.
- Validasi server: **tolak** bila total peserta pada tanggal itu melampaui kuota.
- Ketersediaan ditampilkan sebagai **"sisa X slot"** per tanggal.

> Semua validasi ketersediaan dilakukan di **server** (server-authoritative), bukan sekadar tampilan.

### 5.3 Perhitungan harga (server-authoritative)

- **Dasar:**
  - Rental: `hargaPerHari x jumlahHari` (+ `biayaDriver` bila withDriver).
  - Travel: `hargaPerPenumpang x jumlahPenumpang`.
  - Wisata: `hargaPerOrang x jumlahPeserta` (atau `hargaPaket` bila per-grup).
- **Diskon durasi (rental, opsional tapi disarankan):** tier berdasarkan jumlah hari, mis. 1-2 hari = tarif normal, 3-6 hari = -10%, >=7 hari = -15%. Simpan sebagai konfigurasi (`durationDiscount`), bukan hardcode.
- **Biaya tambahan (opsional per booking):** drop-off beda kota, overtime, BBM/lelahan, tambahan kursi/child seat. Simpan sebagai `extraFees` (JSON) di booking.
- **Deposit (rental lepas kunci):** `deposit` yang **tidak** dihitung sebagai pendapatan; tampilkan terpisah (dikembalikan setelah sewa).
- **Urutan hitung:** `subtotal = dasar` -> `+ extraFees` -> `- diskonDurasi` -> `+ depositRefundable`. Tampilkan rincian.
- Estimasi ditampilkan di form; **harga final dikonfirmasi admin via WhatsApp** (selalu beri label **"estimasi"** dan keterangan "harga final menunggu konfirmasi").

### 5.4 Aturan booking (anti "booking hantu")

- **Tanpa akun** (guest). Cukup nama, no. WhatsApp, tanggal, jumlah, catatan.
- Setelah submit: buat **kode booking** (mis. `TRV-XXXXXX`) -> arahkan ke **WhatsApp** dengan pesan ringkas otomatis.
- Status booking: `MENUNGGU` -> `DIKONFIRMASI` -> `BERJALAN` -> `SELESAI` | `DIBATALKAN` | `KEDALUWARSA`.
- **AUTO-EXPIRED (KRITIS):** karena konfirmasi manual via WA, booking berstatus `MENUNGGU` **memblokir ketersediaan secara sementara**. Beri **kedaluwarsa otomatis**:
  - Default `HOLD_JAM = 24` (config). Setelah lewat, booking `MENUNGGU` otomatis jadi `KEDALUWARSA` dan **membebaskan** slot (kursi/kalender).
  - Cara: endpoint cron (`/api/cron/expire-bookings`) dipanggil periodik; **tanpa cron**, lakukan lazy-expire saat ada akses ketersediaan (cek & bebaskan yang sudah lewat). Sebutkan keduanya.
  - Admin juga bisa memperpanjang `hold` atau langsung `DIBATALKAN`.
- **Batas pemesanan:** batasi jumlah booking `MENUNGGU` aktif per nomor HP (mis. maks 3) & per IP (best-effort) untuk mencegah spam.
- Pelanggan bisa **lacak** di `/cek-booking` pakai **kode booking + 4 digit terakhir nomor HP** (jangan hanya kode, agar privasi terjaga).

---

## 6. SKEMA DATABASE (PRISMA - DETAIL)

> Sesuaikan nama field tetap; tambahkan `createdAt`/`updatedAt` di semua tabel utama.

**User** (auth admin/driver)
- id, name, email (unique), passwordHash, role (`ADMIN_PUSAT` | `ADMIN_CABANG` | `DRIVER`), branchId? (untuk ADMIN_CABANG/DRIVER), phone?, active, timestamps.

**Branch** (cabang)
- id, name, slug (unique), address, city, phone, whatsapp, mapsUrl?, image?, active, timestamps.

**Car** (armada)
- id, name, slug (unique), brand, model, year, type (mis. MPV/SUV/LCGC), transmission (`MANUAL`|`MATIC`), fuel, seats, luggage?, plateNumber (unique), pricePerDay (Int, IDR), priceWithDriver? (Int), branchId (FK), status (`TERSEDIA`|`DISEWA`|`MAINTENANCE`|`NONAKTIF`), description, features (String[] / JSON), images (String[]), featured (Boolean), timestamps.

**CarAvailability** (blokir tanggal / catatan ketersediaan)
- id, carId (FK), startDate, endDate, reason (mis. booking/maintenance), bookingId? (FK nullable), timestamps.
- Alternatif: hitung dari Booking; tabel ini untuk maintenance/hold.

**Driver**
- id, name, phone, licenseNumber?, branchId (FK), active, photo?, userId? (FK ke User bila driver login), timestamps.

**TravelRoute** (travel antar kota)
- id, name, slug (unique), origin, destination, durationLabel (mis. "4 jam"), basePrice (Int, per penumpang), capacityDefault, includes (String[]), image?, branchId?, active, timestamps.

**TripSchedule** (jadwal keberangkatan travel - seat inventory)
- id, travelRouteId (FK), departureDate (DateTime), departureTime (String "08:00"), capacity (Int), seatsBooked (Int default 0), price? (Int, opsional menimpa basePrice), active, timestamps.
- **Unik:** (travelRouteId, departureDate, departureTime).
- Ketersediaan = `capacity - seatsBooked`. Validasi overbooking kursi di server.

**TourPackage** (paket wisata)
- id, name, slug (unique), destination, durationLabel (mis. "3 Hari 2 Malam"), pricePerPerson (Int), pricePerGroup? (Int, opsional), pricingMode (`PER_PERSON`|`PER_GROUP`), minPax?, maxPaxPerDate (Int, kuota per tanggal), itinerary (JSON: hari -> item[]), includes (String[]), excludes (String[]), images (String[]), featured, active, timestamps.
- Ketersediaan per tanggal dihitung dari total `participants` booking aktif pada tanggal itu vs `maxPaxPerDate`.

**Driver**
- id, name, phone, licenseNumber?, branchId (FK), active, photo?, userId? (FK ke User bila driver login), timestamps.
- **Validasi:** driver tidak boleh di-assign ke 2 booking rental yang jadwalnya **bentrok** (cek overlap tanggal di server).

**Booking**
- id, code (unique, mis. TRV-XXXXXX), type (`RENTAL` | `TRAVEL` | `TOUR`), status (lihat 5.4).
- customerName, customerPhone, customerEmail?, notes?.
- Rental fields: carId?, driverId?, startDate?, endDate?, withDriver (Bool), pickupLocation?, dropoffLocation?.
- Travel fields: travelRouteId?, tripScheduleId?, passengers?.
- Tour fields: tourPackageId?, startDate?, participants?.
- Harga: estimatedTotal (Int), finalTotal? (Int, diisi admin), deposit? (Int, refundable), extraFees? (JSON), discount? (Int).
- Diskon/kupon: couponId? (FK Coupon, opsional), discountAmount? (Int).
- Hold: holdExpiresAt (DateTime?), expiredAt (DateTime?).
- Meta: source (mis. "web"), branchId?, timestamps.
- **Index penting:** (carId, startDate, endDate), (tripScheduleId), (tourPackageId, startDate), (status, holdExpiresAt).

**Coupon** (kupon/promo - WAJIB ada karena fitur "Promo & Kupon" disebut)
- id, code (unique), type (`PERCENT` | `FIXED`), value (Int), minSpend?, maxDiscount?, appliesTo (JSON: type layanan/id), quota?, used (Int default 0), startAt?, endAt?, active, timestamps.
- Validasi server saat booking; tolak bila kedaluwarsa/kuota habis.

**Review** (polymorphic - perbaiki relasi)
- id, name, rating (1-5), comment, approved (Bool, default false).
- Ref: carId? **ATAU** travelRouteId? **ATAU** tourPackageId? (salah satu wajib; satu review hanya untuk satu item).
- bookingId? (FK, opsional - untuk verifikasi "sudah booking"; bila diisi, tandai **"ulasan terverifikasi"**).
- **Aturan anti-spam:** 1 review per (bookingId + item) bila bookingId ada; endpoint publik dibatasi rate-limit.
- **JANGAN** menulis "Booking 1-N Review" sebagai kewajiban - review utama tidak bergantung pada booking.

**Wishlist** - **localStorage** di klien (tanpa tabel DB; tanpa sinkron antar-device). Beri disclaimer kecil "tersimpan di perangkat ini". Tombol: di kartu mobil/detail (tambah/hapus), halaman `/wishlist` menampilkan daftar dari localStorage.

**Post** (blog)
- id, title, slug (unique), excerpt, content (rich text/MD), coverImage?, tags (String[]), published (Bool), publishedAt?, authorId?, timestamps.

**PageContent** (halaman statis / konten dinamis: tentang, syarat, faq, cara-pesan)
- id, key (unique, mis. "about"/"terms"/"faq"), title, content (JSON/MD), timestamps.

**SiteSetting** (pengaturan)
- id (singleton), siteName, logo?, tagline, whatsappNumber, phone, email, address, mapsEmbed?, socialLinks (JSON), operationalHours (JSON), seoDefault (JSON), timestamps.

**ContactMessage** (pesan kontak)
- id, name, email?, phone, message, read (Bool), timestamps.

**Banner / Promo** (opsional)
- id, title, image, link?, position, active, startAt?, endAt?.

> **Relasi kunci:** Branch 1-N Car; Branch 1-N Driver; Branch 1-N Booking; Car 1-N Booking; Car 1-N Review; TravelRoute 1-N TripSchedule; TravelRoute 1-N Booking; TripSchedule 1-N Booking; TourPackage 1-N Booking; TourPackage 1-N Review; Review opsional terkait Booking (untuk "terverifikasi"). Coupon 1-N Booking (opsional).
> **Catatan:** provider Prisma **wajib `postgresql`** (karena memakai `String[]`); jangan beralih ke SQLite untuk dev. Untuk kolom fleksibel gunakan `Json`.

---

## 7. HALAMAN PUBLIK & USER FLOW

### 7.1 Halaman
| Halaman | Isi utama |
| --- | --- |
| **Beranda** (`/`) | Hero + pencarian cepat (tipe layanan, tanggal, cabang), armada unggulan, paket travel populer, paket wisata, keunggulan, testimoni (ulasan approved), blog terbaru, CTA WhatsApp, cabang. |
| **Katalog Mobil** (`/mobil`) | Filter (tipe, transmisi, kapasitas, harga, cabang, status), urut, kartu mobil (foto, nama, harga/hari, badge). |
| **Detail Mobil** (`/mobil/[slug]`) | Galeri, spesifikasi, fitur, harga (lepas kunci/driver), kalender ketersediaan, syarat sewa, ulasan, mobil serupa, **CTA booking -> WA**. |
| **Travel Antar Kota** (`/travel`, `/travel/[slug]`) | Daftar rute (asal->tujuan, harga, jadwal), detail + booking. |
| **Paket Wisata** (`/wisata`, `/wisata/[slug]`) | Daftar paket, detail (itinerary, include/exclude) + booking. |
| **Cek Booking** (`/cek-booking`) | Input kode booking + no. HP -> tampilkan status & detail. |
| **Blog** (`/blog`, `/blog/[slug]`) | Daftar artikel + detail, kategori/tag, SEO. |
| **Syarat & Ketentuan** (`/syarat`), **FAQ** (`/faq`), **Cara Pesan** (`/cara-pesan`) | Konten statis dari `PageContent`. |
| **Tentang** (`/tentang`), **Kontak** (`/kontak`) | Profil, cabang, form kontak, peta. |

### 7.2 User flow booking (WAJIB mulus & singkat)
```
Buka katalog/detail -> (opsional set tanggal & durasi)
  -> klik "Pesan Sekarang"
  -> form ringkas: Nama, No. WhatsApp, tanggal, jumlah/durasi, catatan (opsional)
  -> sistem validasi + hitung ESTIMASI harga + cek ketersediaan
  -> submit => buat Booking (status MENUNGGU, kode booking) 
  -> redirect ke WhatsApp dengan pesan ringkas otomatis
  -> (halaman sukses menampilkan kode booking + tombol lacak)
```
**Isi pesan WhatsApp otomatis (contoh):**
```
Halo [Nama Toko], saya mau booking.
Kode: TRV-XXXXXX
Layanan: Rental - Toyota Avanza
Tanggal: 12-14 Okt 2026 (2 hari)
Lokasi ambil: [cabang]
Estimasi: Rp xxx.xxx (estimasi - harga final menunggu konfirmasi)
Nama: [nama]
No. WA: [nomor]
Catatan: [opsional]
Mohon dikonfirmasi. Terima kasih.
```

### 7.3 Prinsip UX
- Mobile-first; tombol WA sticky/floating.
- Booking **tanpa login**; jangan paksa daftar akun.
- Estimasi harga transparan + label "estimasi" + catatan "harga final menunggu konfirmasi".
- Semua gambar ber-`alt`; form ber-label; kontras memadai.

### 7.4 UX Fallback (WAJIB - jangan buntu saat slot tak tersedia)
- **Rental (tanggal bentrok):** tampilkan "Mobil ini tidak tersedia pada tanggal tersebut" + **rekomendasi mobil sejenis/tersedia** pada rentang tanggal yang dipilih.
- **Travel (kursi penuh):** tampilkan "Kursi jadwal ini penuh" + daftar **jadwal lain** (tanggal/jam terdekat) + tombol "Tanya ketersediaan via WA".
- **Wisata (kuota penuh):** tampilkan "Kuota tanggal ini penuh" + **tanggal terdekat yang tersedia**.
- **Selalu sediakan jalur WA** sebagai alternatif bila data tidak pasti: "Butuh tanggal/hal khusus? Chat kami".
- **Booking MENUNGGU (hold):** tampilkan sisa waktu hold (mis. "Slot ditahan 24 jam sampai [jam]").

---

## 8. DASHBOARD ADMIN (DETAIL MODUL)

> Akses: `/admin` (protected). Role: `ADMIN_PUSAT` (semua cabang), `ADMIN_CABANG` (hanya cabangnya), `DRIVER` (lihat tugas/trip-nya sendiri bila relevan).

| Modul | Fungsi |
| --- | --- |
| **Dashboard** (`/admin/dashboard`) | Ringkasan KPI: booking hari ini, menunggu konfirmasi, armada tersedia, pendapatan estimasi, grafik tren booking. |
| **Armada** (`/admin/armada`) | CRUD mobil, galeri, tarif, status, assign cabang, kelola ketersediaan/blokir tanggal. |
| **Booking** (`/admin/booking`) | Daftar booking, filter status/tanggal/cabang, detail, ubah status, isi harga final, kirim ulang ke WA, tambah catatan. |
| **Driver** (`/admin/driver`) | CRUD driver, assign ke booking, status aktif. |
| **Cabang** (`/admin/cabang`) | CRUD cabang, armada per cabang (Admin Pusat). |
| **Travel** (`/admin/travel`) | CRUD rute travel (harga, jadwal, kapasitas, include). |
| **Paket Wisata** (`/admin/wisata`) | CRUD paket (itinerary, harga, include/exclude). |
| **Konten** (`/admin/konten`) | Kelola halaman statis, banner/promo, kontak info. |
| **Blog** (`/admin/blog`) | CRUD artikel (draft/publish), tag, cover. |
| **Pelanggan & Pesan** (`/admin/pelanggan`) | Daftar kontak/pesan masuk + penanda sudah dibaca. |
| **Ulasan** (`/admin/ulasan`) | Moderasi ulasan (approve/reject), balas (opsional). |
| **Laporan & Analitik** (`/admin/laporan`) | Booking per periode, pendapatan estimasi, armada terpopuler, sumber, grafik. |
| **Pengaturan** (`/admin/pengaturan`) | Profil situs, nomor WA, jam operasional, SEO default, sosial, dan user management (Admin Pusat). |

**Ketentuan:** semua tabel punya pencarian, filter, paginasi; aksi penting dikonfirmasi; perubahan tercatat (opsional audit log). UI dashboard responsif.

---

## 9. INTEGRASI & LAYANAN

- **WhatsApp (inti):** util `buildWhatsappLink(phone, message)` -> `https://wa.me/<nomor>?text=<encode>`. Nomor dari `SiteSetting` (fallback `NEXT_PUBLIC_WHATSAPP_NUMBER`). Pesan otomatis dari data booking. **Tidak ada payment gateway.**
  - **Notifikasi ke ADMIN juga via WhatsApp:** setelah booking dibuat, sediakan **deep link WA ke admin** (tombol "Kirim ke Admin") DAN/OR integrasi WA Cloud API (opsional) untuk notif otomatis. Karena admin hidup di WhatsApp, ini lebih penting daripada email.
  - **Disclaimer di pesan WA:** cantumkan "Harga ini estimasi; harga final menunggu konfirmasi admin" agar tidak jadi sengketa.
- **Upload gambar:** UploadThing/Cloudinary; validasi tipe (jpg/png/webp) & ukuran (mis. <=5MB); simpan URL. **Sediakan hapus aset** saat entitas dihapus/diganti (hindari storage menumpuk).
- **Email (NICE-TO-HAVE):** Resend -> notifikasi booking baru ke admin. Fail-safe: bila env kosong, email dinonaktifkan (tidak menggagalkan booking).
- **Maps:** embed Google Maps dari `mapsUrl` (kontak/cabang).
- **Analytics (NICE-TO-HAVE):** Vercel Analytics + event sederhana (lihat/filter/submit booking).

**Prinsip integrasi:** semua integrasi **fail-safe** - bila kredensial kosong, fitur nonaktif dengan aman (jangan crash), dan booking tetap bisa jalan (WA tetap bisa manual).

---

## 10. KEAMANAN, VALIDASI & KUALITAS

- Validasi **semua** input di server dengan Zod; jangan percaya klien.
- **Server-authoritative** untuk harga, ketersediaan, dan status booking.
- Password admin/driver: hash (bcrypt/argon2).
- **Otorisasi per-aksi (WAJIB - pola konkret):**
  - Middleware melindungi seluruh `/admin` (kecuali `/admin/login`).
  - Helper `requireRole(session, allowedRoles[])` dipanggil di **setiap** server action/route admin; tolak bila tidak sesuai.
  - Helper `scopedBranchWhere(session)` -> **ADMIN_PUSAT** lihat semua cabang; **ADMIN_CABANG** dipaksa `WHERE branchId = session.branchId`; **DRIVER** hanya data terkait dirinya.
  - **Uji negatif wajib:** pastikan Admin Cabang **tidak bisa** membaca/mengubah data cabang lain (sebutkan langkah uji di laporan fase).
- Rate-limit untuk endpoint publik (booking, contact, review). **Catatan jujur:** in-memory rate-limit **tidak andal di Vercel serverless** (tiap instance beda memori) -> anggap hanya lapisan tipis. Untuk produksi nyata gunakan **Upstash Redis** (NICE-TO-HAVE); bila tidak ada, tetap pakai in-memory + akui batasannya.
- Sanitasi konten rich text (blog/halaman) untuk mencegah XSS.
- Jangan commit `.env`; sediakan `.env.example`.
- **Zona waktu:** simpan timestamp **UTC** di DB; konversi & tampilkan dalam **WIB (Asia/Jakarta)**. Untuk tanggal/jadwal (travel/wisata) simpan sebagai tanggal murni (tanpa jam) agar tidak off-by-one.
- Error handling konsisten; pesan ramah ke pengguna; log server.
- A11y: label, fokus, kontras, keyboard; SEO: metadata dinamis per `[slug]`, sitemap dinamis, robots, canonical, JSON-LD (LocalBusiness/VehicleRental + produk/paket).

---

## 11. DAFTAR API ENDPOINT (RINGKAS)

**Publik:**
- `GET /api/mobil` (filter, paginasi) - `GET /api/mobil/[slug]` - `GET /api/mobil/[slug]/availability?start=&end=`
- `GET /api/travel` - `GET /api/travel/[slug]` (dengan daftar jadwal & sisa kursi) - `GET /api/travel/schedules?routeId=&date=`
- `GET /api/wisata` - `GET /api/wisata/[slug]` (dengan sisa slot per tanggal) - `GET /api/wisata/availability?id=&date=`
- `POST /api/booking` (validasi ketersediaan + hitung estimasi + buat booking + kembalikan `code` & `waLink`)
- `GET /api/booking/track?code=&phoneLast4=` (lacak - butuh 4 digit terakhir HP)
- `POST /api/coupon/validate` (cek kupon saat booking)
- `POST /api/review` (submit; rate-limit) - `GET /api/review?ref=...` (approved saja)
- `GET /api/blog`, `GET /api/blog/[slug]`
- `POST /api/contact` (simpan pesan) - `GET /api/settings/public`
- `POST /api/availability/check` (cek ketersediaan generik per layanan & tanggal)

**Cron (internal, terlindungi secret):**
- `GET /api/cron/expire-bookings` (bebaskan booking `MENUNGGU` yang lewat `holdExpiresAt`)

**Admin (protected):**
- `CRUD /api/admin/cars` (+ availability/blok tanggal) - `/api/admin/bookings` (+`PATCH` status/harga/hold) - `/api/admin/drivers`
- `CRUD /api/admin/branches` - `/api/admin/travel` (+ `/schedules`) - `/api/admin/tours`
- `CRUD /api/admin/coupons`
- `CRUD /api/admin/posts` - `/api/admin/pages` - `/api/admin/banners`
- `GET /api/admin/reviews` + `PATCH` (approve) - `GET /api/admin/messages` (+ read)
- `GET /api/admin/reports?range=` - `CRUD /api/admin/users` - `PATCH /api/admin/settings`
- `POST /api/upload` (signed upload) + `DELETE /api/upload`

> Gunakan **Server Actions** untuk mutasi di dashboard bila lebih rapi; tetap validasi server-side.

---

## 12. ROADMAP IMPLEMENTASI (FASE DEMI FASE)

> Kerjakan berurutan. Tiap fase = output jelas + lolos quality gate (bagian 13) + laporan (bagian 18).
> **Penanda prioritas:** `[MVP]` = wajib untuk rilis pertama. `[NICE]` = boleh ditunda, jangan blocker.
> **Kriteria selesai** tiap fase ditulis sebagai daftar uji konkret (bukan "halaman tampil").

**FASE 0 - Fondasi & Perencanaan `[MVP]`**
- Setup Next.js 15 + TS + Tailwind + shadcn/ui + ESLint/Prettier; struktur folder (bagian 4).
- `.env.example`, README awal, `.gitignore`.
- **Skema Prisma lengkap (bagian 6)** + koneksi DB Postgres; `prisma migrate dev`.
- `prisma/seed.ts`: **data dasar** (SiteSetting, 1 Branch, halaman statis) - dijalankan agar app tidak kosong.
- Selesai bila: `npm run dev` jalan; `prisma migrate` & `prisma db seed` sukses; README memuat cara setup.

**FASE 1 - Auth & Shell Admin `[MVP]`**
- NextAuth (credentials), role `ADMIN_PUSAT`/`ADMIN_CABANG`/`DRIVER`, middleware proteksi `/admin`.
- **Seed user admin pertama** (ADMIN_PUSAT) - agar bisa login.
- Layout admin (sidebar, topbar), halaman login.
- Selesai bila: login sukses; `/admin` terproteksi; role tidak sesuai **ditolak** (uji: driver buka halaman admin -> 403).

**FASE 2 - Manajemen Armada & Cabang (Admin) `[MVP]`**
- CRUD Branch, Car (upload gambar, fitur, status, tarif, assign cabang).
- Manajemen blokir tanggal (`CarAvailability`).
- **Terapkan `scopedBranchWhere`** (Admin Cabang hanya kelola cabangnya).
- Selesai bila: CRUD berfungsi; uji negatif Admin Cabang tidak bisa lihat/edit cabang lain.

**FASE 3 - Katalog Publik & Detail `[MVP]`**
- Beranda, `/mobil` (filter: tipe/transmisi/kapasitas/harga/cabang), `/mobil/[slug]` (galeri, spesifikasi, kalender ketersediaan, ulasan, mobil serupa).
- SEO dasar: `generateMetadata`, sitemap dinamis, robots, JSON-LD.
- Selesai bila: filter mengembalikan hasil server-side; detail menampilkan ketersediaan nyata; Lighthouse mobile >= 80.

**FASE 4 - Travel & Paket Wisata `[MVP]`**
- CRUD admin TravelRoute (+ `TripSchedule` dengan kursi) & TourPackage (kuota per tanggal).
- Halaman `/travel`, `/travel/[slug]` (pilih jadwal + sisa kursi), `/wisata`, `/wisata/[slug]` (pilih tanggal + sisa slot).
- Selesai bila: jadwal travel & kuota wisata tampil akurat; sisa kursi/slot terhitung benar.

**FASE 5 - Alur Booking + WhatsApp (INTI) `[MVP]`**
- `pricing.ts` (estimasi + diskon durasi + extraFees + deposit) & `availability.ts` (per layanan) - **server-authoritative**.
- `POST /api/booking`: validasi ketersediaan + hitung estimasi + buat booking (`MENUNGGU`, `holdExpiresAt`) + generate kode + **waLink**.
- Form booking ringkas, halaman sukses, **redirect WA**, disclaimer estimasi.
- **Auto-expire HOLD** (`/api/cron/expire-bookings` + lazy-expire) - bebas slot saat kedaluwarsa.
- `/cek-booking` (kode + 4 digit HP). Kupon (`/api/coupon/validate`) `[NICE]`.
- Selesai bila: booking end-to-end menghasilkan WA link benar; **overbooking ditolak** (uji: booking bentrok tanggal/ kursi/kuota -> error jelas); booking `MENUNGGU` lewat hold -> otomatis `KEDALUWARSA` & slot bebas; lacak berfungsi.

**FASE 6 - Dashboard Booking, Driver & Laporan `[MVP]`**
- Booking (daftar/filter/status/harga final/hold/extend/kirim ulang WA), Driver (CRUD + assign **dengan cek bentrok jadwal**), Dashboard KPI, Laporan & Analitik (grafik + periode).
- Selesai bila: admin dapat menuntaskan siklus booking; assign driver bentrok ditolak.

**FASE 7 - Konten, Blog, Ulasan, Pengaturan, Pesan `[MVP]`**
- Blog (CRUD + publish + tag), halaman statis (syarat/faq/cara-pesan/tentang), banner/promo, Coupon admin.
- Ulasan (submit publik + moderasi admin, tandai "terverifikasi"), pesan kontak, pengaturan situs (nomor WA), user management.
- Selesai bila: ulasan approved muncul di publik; nomor WA pengaturan dipakai di waLink.

**FASE 8 - Polesan UI/UX, SEO, A11y, Performa `[MVP]`**
- Konsistensi desain (design tokens - bagian 17), animasi halus, empty/loading/error states.
- Optimasi `next/image`, audit a11y, SEO lanjutan, sitemap dinamis lengkap.
- Wishlist (localStorage) `[NICE]`; PWA `[NICE]`.
- Selesai bila: design system konsisten; semua state (loading/empty/error) rapi; audit a11y dasar lolos.

**FASE 9 - QA, Keamanan, Deploy & Dokumentasi `[MVP]`**
- Unit test `pricing` & `availability` (teruji); e2e alur booking `[NICE]`.
- Hardening keamanan (uji negatif role), perbaikan bug.
- **Seed data contoh lengkap** (bagian 16). Dokumentasi + deploy Vercel + DB produksi + verifikasi env.
- Selesai bila: DoD global (bagian 15) terpenuhi; aplikasi live & teruji manual end-to-end.

---

## 13. QUALITY GATE (JALANKAN TIAP FASE)

Sebelum menandai fase selesai, wajib:
- `npx tsc --noEmit` **bersih**.
- `npm run lint` **bersih**.
- `npm run build` **sukses**.
- Test relevan **lolos** (setelah fase testing dimulai).
- Manual check: alur yang dibuat **berfungsi** (sebutkan langkah uji di laporan).

**Standar kode:**
- TypeScript strict, hindari `any`.
- Komponen kecil & reuse; util di `/lib`.
- Nama jelas; komentar hanya bila perlu.
- Konsisten format (Prettier).

---

## 14. DEPLOY & KONFIGURASI (ENV)

**Hosting:** Vercel. **DB:** Neon/Supabase (Postgres serverless).

`.env.example` (sesuaikan bila menambah):
```
# Database (WAJIB)
DATABASE_URL=                   # gunakan connection pooling URL
DIRECT_URL=                     # koneksi langsung untuk migrasi (Neon/Supabase pooler)

# Auth (WAJIB)
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Upload (WAJIB - salah satu)
UPLOADTHING_TOKEN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# WhatsApp (WAJIB untuk booking)
NEXT_PUBLIC_WHATSAPP_NUMBER=    # fallback bila SiteSetting kosong
WA_ACCESS_TOKEN=                # opsional: WA Cloud API untuk notif admin
WA_PHONE_NUMBER_ID=             # opsional

# Cron protection (WAJIB bila pakai cron expire)
CRON_SECRET=

# Nice-to-have
RESEND_API_KEY=                 # email notifikasi booking
ADMIN_NOTIFY_EMAIL=
UPSTASH_REDIS_REST_URL=         # rate-limit terdistribusi
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_SITE_URL=
HOLD_JAM=24                     # lama hold booking MENUNGGU (jam)
```

**Catatan Prisma + serverless (penting):**
- Gunakan **connection pooler** untuk `DATABASE_URL` (Neon: pooled; Supabase: pgbouncer port 6543) dan `DIRECT_URL` untuk migrasi (port 5432). Set `directUrl = env("DIRECT_URL")` di `datasource`.
- Tanpa pooling, koneksi akan bocor/error di serverless.

**Langkah deploy (dokumentasikan):**
1. Buat DB Postgres (Neon/Supabase) -> isi `DATABASE_URL` (pooled) + `DIRECT_URL`.
2. `npx prisma migrate deploy` (produksi) lalu jalankan **seed dasar + admin**.
3. Set semua env di Vercel -> deploy.
4. Login admin pertama -> uji alur booking ke WA.
5. Verifikasi: katalog tampil, booking menghasilkan WA link benar, overbooking ditolak, cron expire jalan, dashboard jalan.

---

## 15. DEFINISI SELESAI / DoD GLOBAL

1. `tsc` / `lint` / `build` bersih + test inti (**pricing & availability**) lolos.
2. Tiga layanan (rental, travel, wisata) tampil lengkap & bisa dibooking.
3. Alur booking -> **WhatsApp** berfungsi dengan data lengkap, ada **disclaimer estimasi** (tanpa gateway).
4. **Anti double-booking berjalan** sesuai model per layanan: rental (kalender armada), travel (kursi per jadwal), wisata (kuota per tanggal). Overbooking **ditolak server**.
5. **Auto-expire HOLD** berjalan: booking `MENUNGGU` lewat `holdExpiresAt` -> `KEDALUWARSA` & slot bebas.
6. Dashboard admin lengkap: armada, booking, driver, cabang & role, travel/wisata, konten/blog, ulasan, pesan, kupon, laporan, pengaturan.
7. **Otorisasi multi-cabang** benar: uji negatif Admin Cabang tidak bisa akses data cabang lain.
8. Lacak booking (`/cek-booking`) berfungsi (kode + 4 digit HP) tanpa membocorkan data.
9. Responsif (mobile-first), SEO dasar per halaman dinamis, a11y memadai, gambar ber-`alt`.
10. Aman: validasi server, proteksi admin, sanitasi konten, rate-limit (anggap sebagai lapisan tipis), tanpa kredensial ter-commit, **timestamp UTC ditampilkan WIB**.
11. Terdokumentasi: README (setup, env, struktur, cara pakai) + panduan deploy.
12. Backward-compatible & mudah dikembangkan (struktur rapi).

---

## 16. DATA SEED CONTOH (WAJIB - agar hasil konsisten)

Buat `prisma/seed.ts` yang mengisi data contoh realistis (dipakai untuk dev & demo). Minimal:
- **SiteSetting:** nama toko (mis. "TravelKu"), tagline, `whatsappNumber`, alamat, jam operasional "Senin-Sabtu 08.00-20.00 WIB".
- **Branch (2):** mis. "Cabang Tasikmalaya", "Cabang Bandung" (nama, kota, WA, alamat).
- **User (3):** 1 `ADMIN_PUSAT`, 1 `ADMIN_CABANG` (branchId cabang Bandung), 1 `DRIVER`.
- **Car (4-6):** mis. Toyota Avanza (MPV, matic, 7 kursi), Daihatsu Xenia, Honda Brio (LCGC), Toyota Innova (MPV, dengan driver), Toyota Hiace (van). Lengkapi harga/hari, fitur, status, cabang, gambar placeholder.
- **Driver (2):** nama, HP, SIM, cabang, aktif.
- **TravelRoute (2-3):** mis. "Tasikmalaya -> Bandung", "Tasikmalaya -> Jakarta", "Bandung -> Garut". Masing-masing + **TripSchedule** beberapa tanggal/jam + kapasitas.
- **TourPackage (2):** mis. "Wisata Pantai Pangandaran 2D1N", "Bromo 3D2N" (itinerary, include/exclude, kuota/tanggal).
- **Post (3):** artikel blog contoh + tag.
- **PageContent:** tentang, syarat, faq, cara-pesan.
- **Coupon (1):** mis. "JALAN10" (10%).
- **Review (3-4):** contoh dengan `approved: true/false`.
- **Booking (2 contoh):** 1 rental, 1 travel (untuk uji dashboard).

> Seed harus **idempoten** (aman dijalankan ulang). Tempat seed: dasar di FASE 0, admin di FASE 1, data contoh lengkap di FASE 9.

---

## 17. DESIGN TOKENS & KOMPONEN (agar UI konsisten)

**Prinsip:** modern, terpercaya, nuansa otomotif; mobile-first; bersih.

**Token warna (sesuaikan bila shadcn memakai CSS variables):**
- Primary: biru gelap (mis. `#0B3D91` / setara) - tombol utama, header.
- Accent: oranye (mis. `#F97316`) - CTA "Pesan Sekarang", badge.
- Netral: putih, abu terang, teks `#0F172A`; sukses hijau, bahaya merah, peringatan kuning.

**Tipografi:** 1 font sans modern (mis. Inter/Geist); hierarki H1-H4 jelas; hindari >2 ukuran dominan.

**Komponen wajib (dari shadcn/ui + kustom):**
- `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Form` (RHF+Zod), `Dialog`, `Sheet` (mobile), `Card`, `Badge`, `Tabs`, `Table` (data + paginasi), `Toast`, `Skeleton`, `Pagination`, `Breadcrumb`, `DatePicker`, `EmptyState`, `ImageGallery`.
- Komponen domain: `CarCard`, `BookingForm`, `AvailabilityCalendar`, `WhatsappButton` (floating), `PriceEstimate`, `ReviewStars`, `StatCard`, `DataTable`.

**Standar state:** setiap halaman punya **loading (skeleton), empty, error** yang rapi. Tombol WA **floating** di mobile.

---

## 18. LAPORAN YANG DIMINTA DARI AGENT (PER FASE)

Akhiri tiap fase dengan ringkasan:
```
FASE X SELESAI
- Yang dibuat: <ringkas>
- File penting: <daftar>
- Cara menjalankan/menguji: <langkah>
- Quality gate: tsc [ok], lint [ok], build [ok], test [ok/na]
- Keputusan penting (bila ada ambiguitas): <...>
- Belum selesai/risiko: <jika ada>
- Fase berikutnya: <nama>
```

---

## 19. CATATAN AKHIR

- Utamakan **kesederhanaan booking** dan **kejelasan alur ke WhatsApp**.
- Jaga konsistensi istilah (Rental / Travel / Wisata; Booking; Cabang; Armada; Driver).
- Bila prompt ini kurang detail di satu area, **putuskan yang paling wajar & aman**, lalu catat keputusan di laporan fase.
- Desain: **modern, terpercaya, nuansa otomotif** (biru gelap/aksen oranye), banyak foto mobil, testimoni nyata, tanpa klaim palsu.

**Mulai dari FASE 0. Selamat membangun.**
