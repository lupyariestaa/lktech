# PROMPT MASTER - Aplikasi Kasir / POS Retail (Fullstack, PWA Offline-First)

> **Untuk:** AI Agent di workspace terpisah.
> **Tujuan:** Membangun aplikasi **Kasir / POS (Point of Sale)** retail/minimarket yang lengkap, offline-first, siap produksi & siap dijual sebagai produk sekali jadi.
> **Berkas:** `prompt-pos-kasir.md` (folder `docs/product-shopee-lktech/product-jadi-website/prompt/`).
> **Versi:** 1.0 - 2026-10-06.
> **Cara pakai:** salin seluruh berkas ini sebagai instruksi awal ke AI agent. Jalankan **fase demi fase** (bagian 13) dan laporkan hasil tiap fase.

---

## 0. PERAN & CARA KERJA AGENT

Anda adalah **Senior Fullstack Engineer + Product Engineer + UI/UX Engineer**. Anda membangun aplikasi ini **bertahap per-fase**, bukan sekali jadi.

**Aturan kerja:**
1. **Baca seluruh prompt ini sampai selesai** sebelum menulis kode.
2. Kerjakan **fase demi fase** sesuai **bagian 13 (Roadmap Implementasi)**. Jangan melompati fase.
3. Di akhir **setiap fase**, jalankan **quality gate** (bagian 14) dan **laporkan** (format di bagian 19).
4. **Prioritas:** kerjakan semua item `[MVP]` dulu; item `[NICE]` boleh ditunda.
5. **Jangan berhenti untuk bertanya hal sepele** - gunakan keputusan terbaik yang wajar & konsisten dengan prompt ini. Bertanya hanya bila benar-benar ambigu & berdampak besar.
6. **Aman:** jangan hardcode kredensial, jangan commit `.env`, validasi semua input di server.
7. **Kualitas > kecepatan:** kode rapi, terstruktur, tanpa `any` sembarangan, aksesibel, responsif.
8. Bila ragu, pilih **solusi paling sederhana yang benar** (YAGNI), tapi rapi & mudah dikembangkan.
9. **Tidak ada landing page.** Aplikasi ini **hanya dashboard** (aplikasi internal toko). Rute utama = `/login` lalu `/app` (dashboard kasir & manajemen).

---

## 1. RINGKASAN PROYEK

Membangun **aplikasi Kasir/POS** untuk **toko retail/minimarket**:
- Kasir melakukan transaksi penjualan cepat (scan barcode / cari produk -> keranjang -> bayar -> cetak struk).
- Manajemen produk, stok, pembelian/supplier, dan laporan.
- **Offline-first:** kasir tetap bisa transaksi walau internet mati; data disinkronkan saat online.

**Model transaksi:** pembayaran **tunai** atau **QRIS statis** (pelanggan scan QR milik toko). **Tanpa payment gateway.** Struk dicetak via browser (thermal 58/80mm) atau diekspor ke PDF.

**Model jual:** **lisensi tunggal per instalasi** (satu toko, satu database). Setelah di-deploy & diisi data, langsung pakai.

**Prinsip:** cepat, minim klik, tahan gangguan internet, mudah dipakai orang awam (kasir toko).

---

## 2. TUJUAN & NON-TUJUAN

**Tujuan (harus tercapai):**
- Kasir transaksi cepat & andal (barcode, keranjang, diskon, kembalian, hold, void).
- **Offline-first**: transaksi tetap jalan saat offline, sinkron otomatis saat online.
- Manajemen produk + varian + **multi-harga** (umum/grosir/satuan).
- Manajemen stok + peringatan stok minimum + pembelian/supplier.
- Laporan penjualan, produk terlaris, rekap bayar & **shift kasir**, laporan stok, export, grafik.
- Cetak struk proper (thermal/PDF) + riwayat & cetak ulang struk.
- Dashboard ringkas (KPI) untuk owner.
- Siap deploy (Vercel + Postgres serverless) + dokumentasi lengkap.

**Non-tujuan (jangan dikerjakan):**
- **Landing page / halaman marketing / katalog publik** (DILARANG - ini aplikasi internal).
- Payment gateway online (cukup tunai + QRIS statis).
- Multi-tenant / multi-toko dalam satu instalasi (satu instalasi = satu toko).
- Marketplace/e-commerce sync, aplikasi mobile native.
- E-faktur pajak resmi / integrasi DJP (bila perlu, ditandai NICE & disederhanakan).

---

## 3. TEKNOLOGI & TOOLS (WAJIB)

**Core stack:**
- **Next.js 15** (App Router, Server Components, Server Actions bila cocok) + **TypeScript** (strict).
- **React 19**, **Tailwind CSS** (+ `tailwindcss-animate`), **shadcn/ui**.
- **Prisma ORM** + **PostgreSQL** (serverless: **Neon** atau **Supabase**).
- **NextAuth (Auth.js)** - kredensial, role `OWNER` & `KASIR`.
- **Zod** (validasi) + **React Hook Form** (form).
- **Vercel** (hosting/deploy).

**Offline-first (WAJIB):**
- **Dexie.js** (IndexedDB) sebagai **database lokal klien** = sumber data saat kasir bekerja.
- **Service Worker / PWA** (next-pwa atau custom) untuk cache aplikasi.
- **Sinkronisasi**: queue perubahan lokal -> push ke server saat online; pull data master saat online.
- Strategi konflik: **last-write-wins** untuk master data + **event-based** untuk transaksi (transaksi = append-only, tidak di-edit).

**Cetak struk:**
- **Browser print** dengan **CSS khusus thermal** (lebar 58mm & 80mm) + preview.
- **Ekspor PDF** (mis. via `react-to-print` atau `jspdf`/`html2canvas` - pilih yang paling andal).

**Pendukung:**
- **lucide-react** (ikon), **date-fns** (tanggal), **recharts** (grafik laporan).
- **sonner**/`toast` untuk notifikasi; **ESLint + Prettier**.
- **Vitest** (unit) untuk logika harga/stok; **Playwright** (e2e, NICE).
- **Barcode**: input via keyboard wedge (scanner USB/Bluetooth umumnya mengetik lalu Enter) -> cukup sediakan input fokus + auto-submit. **Kamera-scan barcode** (mis. `@zxing/browser`) = NICE.

> Semua tools **gratis-tier friendly**. Gunakan versi stabil terbaru. Bila ada yang tak tersedia, pilih padanan terdekat & catat di laporan fase.

---

## 4. ARSITEKTUR & STRUKTUR FOLDER

**Arsitektur:** Next.js fullstack (App Router). Klien memakai **Dexie (IndexedDB)** sebagai sumber data operasional (agar offline-first); server (Next API + Prisma + Postgres) sebagai **backend sinkronisasi & backup**. Auth via NextAuth (role OWNER/KASIR). Semua perhitungan penting (harga, diskon, stok) **juga** divalidasi di server saat sync.

**Struktur folder:**
```
/app
  /login                    -> halaman login
  /(app)                    -> area dashboard (protected)
    /kasir                  -> layar kasir (transaksi)
    /transaksi              -> riwayat transaksi + cetak ulang
    /produk                 -> manajemen produk & varian & harga
    /kategori                -> kategori produk
    /stok                   -> stok, penyesuaian/opname, stok masuk-keluar
    /pembelian              -> purchase order / supplier
    /supplier               -> data supplier
    /laporan                -> laporan & grafik
    /shift                  -> buka/tutup shift kasir + rekap
    /pengaturan             -> pengaturan toko, struk, pajak, QRIS
    /pengguna               -> kelola user (Owner only)
  /api                      -> API sinkronisasi & resource
    /auth/[...nextauth]
    /sync/push, /sync/pull, /sync/status
    /products, /transactions, /stock, /purchases, /reports, ...
/lib
  /db.ts (prisma), /auth.ts, /validators (zod)
  /offline/db.ts (Dexie schema), /offline/sync.ts (queue & sync)
  /pos/cart.ts, /pos/pricing.ts, /pos/stock.ts (logika murni, teruji)
  /receipt.ts (builder struk + format)
/public (manifest.json, service worker, ikon)
/components
  /ui (shadcn), /kasir, /produk, /laporan, /shared
/prisma
  schema.prisma, seed.ts
```

**Konvensi:** file kebab-case; komponen PascalCase; logika murni (cart/pricing/stock) **dipisah** agar mudah diuji; akses IndexedDB lewat wrapper di `/lib/offline`.

---

## 5. MODEL BISNIS & ATURAN POS

### 5.1 Peran & akses
- **OWNER:** akses semua (produk, stok, pembelian, laporan, shift, pengaturan, pengguna).
- **KASIR:** layar kasir, transaksi, buka/tutup shift, riwayat transaksinya. **Tidak** boleh ubah harga/kelola produk secara bebas (kecuali diizinkan di pengaturan).

### 5.2 Satuan & multi-harga (penting untuk retail)
- Produk punya **satuan dasar** (mis. `pcs`, `gram`, `ml`).
- Produk bisa dijual dalam beberapa **satuan jual** + konversi (mis. 1 `dus` = 12 `pcs`; 1 `kg` = 1000 `gram`).
- **Multi-harga per produk:** minimal `hargaUmum`, `hargaGrosir` (dengan `minQty` grosir), dan harga per satuan jual. Kasir dapat memilih jenis harga (default umum; grosir otomatis bila qty memenuhi).
- **Produk ber-varian:** varian (mis. ukuran/rasa) dengan SKU & stok masing-masing.
- **Barcode:** produk/varian bisa punya barcode (boleh lebih dari satu).

### 5.3 Perhitungan transaksi (server + klien harus sama - logika murni)
- Baris: `subtotalItem = hargaSatuan x qty` (qty boleh desimal untuk kg/gram).
- Diskon: per item (`diskonItem`) dan/atau total (`diskonTotal`), tipe `PERCENT`/`FIXED`.
- Pajak (opsional): `PPN %` dari subtotal setelah diskon (config).
- Pembulatan (opsional): ke ratusan terdekat (config).
- `total = subtotal - diskonTotal + pajak`, lalu dibulatkan.
- **Kembalian**: `dibayar - total` (khusus tunai). QRIS: `dibayar = total`.
- Simpan rincian agar struk & laporan akurat.

### 5.4 Stok
- `stok` per produk/varian. Setiap penjualan mengurangi stok (per satuan dasar).
- **Pembelian (PO)** menambah stok + mencatat hutang supplier.
- **Penyesuaian stok / opname** (tambah/kurangi dengan alasan).
- **Peringatan stok minimum** (`minStock`) -> notifikasi di dashboard & daftar reorder.
- Riwayat pergerakan stok (kartu stok): masuk, keluar (penjualan), penyesuaian, retur.

### 5.5 Shift kasir
- Kasir **buka shift** (input kas awal) -> transaksi -> **tutup shift** (input kas akhir, hitung selisih, rekap tunai vs QRIS).
- Laporan per shift & per kasir.

### 5.6 Transaksi & void/refund
- Transaksi = **append-only** (tidak diedit). Koreksi via **void item** atau **refund** (buat catatan koreksi, jangan hapus).
- **Hold / parkir pesanan:** simpan keranjang sementara, lanjutkan nanti.
- Setiap transaksi punya nomor unik (mis. `TRX-YYYYMMDD-XXXX`) & struktur struk.

### 5.7 Offline-first (aturan penting)
- Saat offline: kasir tetap transaksi memakai data lokal (Dexie). Transaksi masuk **queue**.
- Saat online: push queue ke server, pull data master terbaru.
- **Idempotensi:** setiap transaksi punya `localId` (UUID) agar tidak dobel saat sync ulang.
- Tampilkan **status koneksi** (online/offline) & jumlah item menunggu sync.

---

## 6. SKEMA DATABASE

> **Dua lapis:** (A) **Prisma/Postgres** (server, sumber kebenaran & backup) dan (B) **Dexie/IndexedDB** (klien, mirror untuk offline). Skema harus **selaras** (nama field konsisten). Tambahkan `createdAt`/`updatedAt`.

### 6A. Prisma (Postgres)

**User**
- id, name, email (unique), passwordHash, role (`OWNER`|`KASIR`), active, timestamps.

**StoreSetting** (singleton)
- id, storeName, address?, phone?, logo?, receiptFooter?, taxPercent? (Int), roundingTo? (Int), currency ("IDR"), qrisImageUrl?, lowStockGlobal?, timestamps.

**Category**
- id, name, slug?, sortOrder, active, timestamps.

**Product**
- id, name, sku? (unique), barcode?, categoryId? (FK), baseUnit (mis. "pcs"), description?, image?, isVariant (Bool), minStock? (Int), active, timestamps.

**ProductVariant** (bila isVariant)
- id, productId (FK), name (mis. "Merah / L"), sku? (unique), barcode?, timestamps.

**ProductUnit** (satuan jual + konversi + harga)
- id, productId (FK), variantId? (FK), unitName (mis. "pcs"/"dus"/"kg"), conversionQty (Int/Decimal ke satuan dasar), priceUmum (Int), priceGrosir? (Int), grosirMinQty?, isDefault (Bool), timestamps.

**Stock** (stok per produk/varian dalam satuan dasar)
- id, productId (FK), variantId? (FK), qty (Decimal), minStock? (Int), updatedAt.

**StockMovement** (kartu stok)
- id, productId (FK), variantId? (FK), type (`IN`|`OUT`|`ADJUST`|`SALE`|`RETURN`|`PURCHASE`), qty (Decimal, +/-, satuan dasar), refType?, refId?, note?, userId?, createdAt.

**Supplier**
- id, name, phone?, email?, address?, note?, timestamps.

**Purchase** (PO / pembelian)
- id, code (unique), supplierId (FK), status (`DRAFT`|`ORDERED`|`RECEIVED`|`CANCELLED`), total (Int), paid (Int), due (Int), note?, createdBy (FK User), receivedAt?, timestamps.

**PurchaseItem**
- id, purchaseId (FK), productId (FK), variantId? (FK), unitName?, qty (Decimal), costPrice (Int), subtotal (Int).

**Transaction** (penjualan)
- id, localId (unique UUID - idempotensi sync), code (unique `TRX-...`), shiftId? (FK), cashierId (FK User), customerName?, memberPhone?.
- subtotal (Int), discountTotal (Int), tax (Int), roundingAdj (Int), total (Int).
- paymentMethod (`CASH`|`QRIS`|`OTHER`), paidAmount (Int), changeAmount (Int).
- status (`COMPLETED`|`VOID`|`REFUNDED`), note?, createdAt (kirim waktu lokal), syncedAt?.

**TransactionItem**
- id, transactionId (FK), productId (FK), variantId? (FK), unitName?, nameSnapshot (nama saat jual), priceSnapshot (Int), qty (Decimal), discountItem (Int), subtotal (Int).

**Shift** (shift kasir)
- id, cashierId (FK User), openedAt, closedAt?, openingCash (Int), closingCash?, expectedCash?, expectedQris?, difference?, note?, status (`OPEN`|`CLOSED`).

**StockAdjustment** (opname)
- id, productId (FK), variantId? (FK), qtyBefore (Decimal), qtyAfter (Decimal), reason?, userId (FK), createdAt.

> **Index penting:** Transaction(localId unique, code unique, createdAt), Stock(productId, variantId), StockMovement(productId, createdAt), PurchaseItem(purchaseId).

### 6B. Dexie (IndexedDB - klien, mirror untuk offline)

- Tabel mirror: `products`, `productUnits`, `categories`, `stock`, `settings` (read-only cache).
- Tabel operasional lokal: `cart` (keranjang aktif), `heldCarts` (hold pesanan), `transactionsLocal` (transaksi belum sync), `syncQueue` (antrean push), `meta` (versi data terakhir).
- Setiap transaksi lokal punya `localId` (UUID) & `synced` (Bool).

> **Aturan sync:** transaksi dibuat lokal -> masuk `syncQueue` -> saat online, `POST /api/sync/push` mengirim batch (idempoten by `localId`) -> server simpan + set `synced`. `GET /api/sync/pull?since=` mengunduh perubahan master (produk/stok/harga) ke Dexie.

---

## 7. HALAMAN & ALUR KASIR (HANYA DASHBOARD)

### 7.1 Halaman
| Halaman | Isi |
| --- | --- |
| **Login** (`/login`) | Form login (email + password). |
| **Kasir** (`/kasir`) | Layar utama: kolom scan/cari barcode, grid produk terlaris/kategori, keranjang, diskon, pilih harga, bayar, hold, void. |
| **Transaksi** (`/transaksi`) | Riwayat transaksi (filter tanggal/kasir/metode), detail, **cetak ulang struk**, refund/void. |
| **Produk** (`/produk`) | CRUD produk + varian + satuan & multi-harga + barcode + gambar; import/export CSV. |
| **Kategori** (`/kategori`) | CRUD kategori + urutan. |
| **Stok** (`/stok`) | Daftar stok, peringatan stok minimum, penyesuaian/opname, kartu stok (riwayat pergerakan). |
| **Pembelian** (`/pembelian`) | PO ke supplier, terima barang (tambah stok), status & hutang. |
| **Supplier** (`/supplier`) | CRUD supplier. |
| **Shift** (`/shift`) | Buka/tutup shift, rekap kas (tunai vs QRIS), selisih. |
| **Laporan** (`/laporan`) | Penjualan (periode), produk terlaris, rekap metode bayar, laporan stok, grafik; export CSV/PDF. |
| **Pengaturan** (`/pengaturan`) | Info toko, footer struk, pajak/pembulatan, upload QRIS, preferensi kasir. |
| **Pengguna** (`/pengguna`) | Kelola user (Owner only). |

### 7.2 Alur kasir (WAJIB mulus & cepat)
```
Login -> (wajib) Buka Shift (kas awal)
-> Layar Kasir:
   - Scan barcode / cari produk -> masuk keranjang
   - Ubah qty (desimal bila kg/gram), pilih satuan, pilih harga (umum/grosir), diskon item
   - Diskon total (opsional), pajak otomatis
   - (Opsional) Hold pesanan / ambil hold
-> Bayar:
   - Pilih metode: Tunai (input dibayar -> kembalian) / QRIS (tampil QR -> konfirmasi)
   - Simpan transaksi (lokal, langsung, walau offline)
   - Cetak struk (browser print) / ekspor PDF
-> Tutup Shift (kas akhir, rekap, selisih)
```

### 7.3 Prinsip UX kasir
- **Minim klik**: fokus ke kolom scan; Enter menambah item; shortcut keyboard (F2 bayar, F4 hold, Esc batal).
- Tombol besar, kontras tinggi, responsif (PC/tablet).
- **Indikator koneksi** (online/offline) + badge "X transaksi menunggu sinkron".
- Bila produk tidak ketemu: tombol "produk custom/non-SKU" (opsional) atau arahkan tambah produk cepat (Owner).
- Konfirmasi untuk aksi merusak (void/refund/hapus).
- Dukungan **light + dark** (default light).

---

## 8. STRUK / RECEIPT

- **Template struk** memuat: nama toko, alamat, no. telp, tanggal/jam, no. transaksi, kasir, item (nama, qty, satuan, harga, subtotal), diskon, pajak, total, metode bayar, dibayar, kembalian, footer terima kasih (+ QRIS note bila metode QRIS).
- **Ukuran**: 58mm (**~32 karakter/baris**, monospace) & 80mm (**~48 karakter/baris**). Buat layout menyesuaikan lebar (jangan overflow).
- **Metode cetak:** (1) browser print dengan CSS `@media print` khusus thermal; (2) preview di layar; (3) ekspor PDF.
- **Cetak ulang** dari riwayat transaksi.
- Bila QRIS: tampilkan gambar QR toko + catatan "sudah/belum dibayar" sesuai konfirmasi kasir.

---

## 9. INTEGRASI & LAYANAN

- **PWA + Offline:** manifest, service worker, mode offline (Dexie), indikator status, sync otomatis saat online.
- **Barcode:** input scanner (keyboard wedge) sebagai utama; kamera-scan = NICE.
- **QRIS statis:** upload gambar QR toko di Pengaturan -> tampil di layar bayar & struk.
- **Cetak:** browser print (thermal/PDF) - lihat bagian 8.
- **Export:** CSV (produk, transaksi, laporan) & PDF (laporan/struk) sesuai kebutuhan.
- **Email/cadangan (NICE):** export backup data (JSON/CSV) manual; email terjadwal = NICE.

**Prinsip:** semua integrasi **fail-safe** - bila fitur tak tersedia (mis. printer), tetap ada jalur alternatif (PDF/offline), jangan crash.

---

## 10. KEAMANAN, VALIDASI & KUALITAS

- Validasi **semua** input di server (Zod) saat sync; klien tetap validasi untuk UX.
- **Server-authoritative** untuk data master; transaksi divalidasi ulang saat sync (harga/qty wajar, stok).
- Password: hash (bcrypt/argon2). Sesi via NextAuth; middleware melindungi area `/(app)`.
- **Otorisasi:** helper `requireRole(session, roles[])` di setiap server action/route. Kasir tak bisa kelola produk/pengguna.
- **Idempotensi sync:** transaksi by `localId`; jangan simpan ganda.
- Rate-limit endpoint auth & sync (anggap lapisan tipis; Upstash = NICE).
- Sanitasi input teks (nama produk, catatan, footer struk) untuk cegah XSS.
- Jangan commit `.env`; sediakan `.env.example`.
- **Zona waktu:** simpan waktu transaksi asli (klien, WIB) + `createdAt` server (UTC).
- Error handling konsisten, pesan ramah, log server. A11y: label, fokus, kontras, keyboard (kasir sering keyboard).

---

## 11. DAFTAR API ENDPOINT (RINGKAS)

**Auth:** `POST /api/auth/[...nextauth]` (login/logout/session), `GET /api/me`.

**Sync (inti offline-first):**
- `POST /api/sync/push` (batch transaksi/pergerakan lokal; idempoten by `localId`)
- `GET /api/sync/pull?since=` (perubahan master: produk, unit, harga, stok, setting)
- `GET /api/sync/status`

**Resource (dipakai dashboard + fallback online):**
- `CRUD /api/products` (+ `/variants`, `/units`) - `CRUD /api/categories`
- `GET/PATCH /api/stock` (+ `/adjust`) - `GET /api/stock/movements`
- `CRUD /api/suppliers` - `CRUD /api/purchases` (+ `PATCH` terima/status)
- `GET /api/transactions` (+ `GET /:id`, `POST /:id/refund`, `POST /:id/void`)
- `POST /api/shifts/open` - `POST /api/shifts/close` - `GET /api/shifts`
- `GET /api/reports/sales?from=&to=` - `/reports/top-products` - `/reports/payments` - `/reports/stock`
- `GET/PATCH /api/settings` - `POST /api/settings/qris` (upload gambar) - `CRUD /api/users`
- `POST /api/import/products` (CSV) - `GET /api/export/...` (CSV/PDF)

> Gunakan **Server Actions** untuk mutasi dashboard bila lebih rapi; validasi server tetap wajib.

---

## 12. RINGKASAN MODUL DASHBOARD

| Modul | Fungsi | Role |
| --- | --- | --- |
| Dashboard KPI | Omzet hari ini, transaksi, produk terlaris, stok menipis, grafik tren. | Owner (Kasir: versi ringkas) |
| Kasir | Layar transaksi (inti). | Owner, Kasir |
| Transaksi | Riwayat, detail, cetak ulang, void/refund. | Owner (Kasir: miliknya) |
| Produk/Kategori | CRUD produk, varian, satuan & multi-harga, barcode, import/export. | Owner |
| Stok | Stok, low-stock, opname, kartu stok. | Owner |
| Pembelian/Supplier | PO, terima barang, hutang supplier. | Owner |
| Shift | Buka/tutup shift, rekap kas. | Owner, Kasir |
| Laporan | Penjualan, terlaris, bayar, stok, grafik, export. | Owner |
| Pengaturan | Toko, struk, pajak, QRIS, preferensi. | Owner |
| Pengguna | Kelola user. | Owner |

---

## 13. ROADMAP IMPLEMENTASI (FASE DEMI FASE)

> Kerjakan berurutan. Tiap fase = output jelas + lolos quality gate (bagian 14) + laporan (bagian 19).
> **Penanda:** `[MVP]` = wajib rilis pertama. `[NICE]` = boleh ditunda.

**FASE 0 - Fondasi `[MVP]`**
- Setup Next.js 15 + TS + Tailwind + shadcn/ui + ESLint/Prettier; struktur folder (bagian 4).
- `.env.example`, README, `.gitignore`.
- Skema Prisma lengkap (bagian 6A) + koneksi Postgres; `prisma migrate dev`.
- `prisma/seed.ts` dasar (StoreSetting, 2 user, contoh kategori/produk).
- Selesai bila: `npm run dev` jalan; migrate & seed sukses; README memuat setup.

**FASE 1 - Auth & Shell `[MVP]`**
- NextAuth (credentials), role OWNER/KASIR, middleware proteksi `/(app)`.
- Seed admin pertama (OWNER) + 1 KASIR.
- Layout dashboard (sidebar, topbar: nama toko, indikator koneksi, user menu).
- Selesai bila: login sukses; kasir tak bisa buka halaman Owner (uji negatif).

**FASE 2 - Master Data Produk `[MVP]`**
- CRUD Kategori, Produk (+ varian, satuan & konversi, **multi-harga**, barcode, gambar).
- Import/export produk CSV.
- Selesai bila: produk multi-satuan & multi-harga tersimpan benar; import CSV berhasil & tervalidasi.

**FASE 3 - Stok & Pembelian `[MVP]`**
- Stock + StockMovement (kartu stok), penyesuaian/opname, low-stock.
- Supplier + Pembelian (PO) + terima barang (tambah stok) + hutang.
- Selesai bila: stok bertambah saat terima PO; kartu stok akurat; low-stock muncul.

**FASE 4 - Offline Foundation & Sync `[MVP]`**
- Dexie schema (bagian 6B) + wrapper `/lib/offline`.
- PWA (manifest + service worker) + indikator online/offline.
- Sinkronisasi: `syncQueue`, `POST /api/sync/push` (idempoten), `GET /api/sync/pull`.
- Selesai bila: data master tersimpan ke Dexie; transaksi dummy offline masuk queue & tersync saat online (uji: matikan internet -> buat transaksi -> nyalakan -> cek server).

**FASE 5 - Layar Kasir & Transaksi (INTI) `[MVP]`**
- Logika murni `pos/cart.ts`, `pos/pricing.ts` (diskon, pajak, pembulatan, kembalian).
- Layar kasir: scan/cari, keranjang, edit qty/satuan/harga, diskon, hold, void.
- Simpan transaksi **lokal (Dexie) + queue**; kurangi stok lokal; shift.
- Selesai bila: transaksi end-to-end di kasir berhasil **offline**; total & kembalian benar (test); kurangi stok.

**FASE 6 - Struk & Shift `[MVP]`**
- Builder struk + layout 58/80mm + preview + browser print + ekspor PDF + cetak ulang.
- Buka/tutup shift + rekap kas (tunai vs QRIS) + selisih.
- Selesai bila: struk tercetak/terekspor rapi (tidak overflow); rekap shift benar.

**FASE 7 - Riwayat, Void/Refund & Sync Lanjutan `[MVP]`**
- Halaman Transaksi (filter, detail, cetak ulang, void/refund).
- Kokohkan sync (retry, status, konflik sederhana).
- Selesai bila: void/refund tercatat benar (tidak menghapus riwayat); sync tahan retry.

**FASE 8 - Laporan & Dashboard KPI `[MVP]`**
- Laporan: penjualan (periode), produk terlaris, rekap metode bayar, laporan stok; grafik; export CSV/PDF.
- Dashboard KPI ringkas.
- Selesai bila: angka laporan **cocok** dengan data transaksi (uji hitung manual).

**FASE 9 - Polesan, Pengaturan, A11y, Performa `[MVP]`**
- Pengaturan toko/struk/pajak/QRIS; konsistensi desain (design tokens - bagian 18); light+dark.
- State loading/empty/error; a11y; performa (bundle, caching PWA).
- Selesai bila: seluruh layar rapi & konsisten; QRIS tampil di bayar & struk.

**FASE 10 - QA, Keamanan, Deploy & Dokumentasi `[MVP]`**
- Unit test logika murni (cart/pricing/stock) + uji offline->sync; e2e `[NICE]`.
- Hardening keamanan (uji negatif role), perbaikan bug.
- **Seed data contoh lengkap** (bagian 16). Dokumentasi + deploy Vercel + DB produksi.
- Selesai bila: DoD global (bagian 15) terpenuhi; aplikasi live & teruji (termasuk mode offline).

---

## 14. QUALITY GATE (JALANKAN TIAP FASE)

- `npx tsc --noEmit` bersih.
- `npm run lint` bersih.
- `npm run build` sukses.
- Test relevan lolos (mulai fase 5+ untuk logika kasir).
- Manual check alur yang dibuat (sebutkan langkah uji di laporan).

**Standar kode:** TypeScript strict, hindari `any`; logika murni dipisah & diuji; util di `/lib`; Prettier.

---

## 15. DEFINISI SELESAI / DoD GLOBAL

1. `tsc`/`lint`/`build` bersih + test logika kasir (cart/pricing/stock) lolos.
2. Login + role OWNER/KASIR berjalan; uji negatif role benar.
3. Kasir transaksi end-to-end: scan/cari -> keranjang -> diskon -> bayar (tunai/QRIS) -> kembalian -> **cetak struk**.
4. **Offline-first berjalan**: transaksi tetap bisa saat offline; sinkron otomatis saat online; **tidak ada data dobel** (idempoten).
5. Master data lengkap: produk + varian + **multi-satuan & multi-harga** + barcode; import/export CSV.
6. Stok akurat (kartu stok, opname, low-stock) + pembelian/supplier + hutang.
7. Shift kasir (buka/tutup, rekap tunai vs QRIS, selisih).
8. Laporan (penjualan/terlaris/bayar/stok) **akurat** + grafik + export.
9. Struk proper (58/80mm, PDF, cetak ulang).
10. Pengaturan toko/struk/pajak/QRIS berfungsi.
11. PWA (installable) + responsif + a11y + light/dark.
12. Aman: validasi server, proteksi role, sanitasi, tanpa kredensial ter-commit.
13. Terdokumentasi: README (setup, env, cara pakai, alur sync) + panduan deploy.
14. **Tanpa landing page** - hanya dashboard.
15. Backward-compatible & mudah dikembangkan.

---

## 16. DATA SEED CONTOH (WAJIB)

`prisma/seed.ts` (idempoten):
- **StoreSetting:** "Toko Maju Jaya", alamat, telp, footer "Terima kasih telah berbelanja", PPN 0 atau 11, pembulatan 100, low-stock global 5.
- **User (2):** OWNER (admin@toko.test) + KASIR (kasir@toko.test) - password contoh di README (hash).
- **Category (4):** Minuman, Makanan, Sembako, Perlengkapan.
- **Product (8-10):** campuran:
  - Satuan tunggal (mis. Air Mineral 600ml, barcode).
  - Multi-satuan (mis. Gula: `kg` & `gram`; Telur: `pcs` & `tray`).
  - Multi-harga (mis. harga umum & grosir min. 12 pcs).
  - Varian (mis. Kopi sachet: Rasa A/B/C).
- **Supplier (2)** + **Purchase (1 contoh)** + **StockMovement** awal + **Transaction (2 contoh)** untuk uji laporan.
- **Shift (1 contoh tertutup)** untuk uji rekap.

---

## 17. DESIGN TOKENS & KOMPONEN

**Prinsip:** bersih, cepat, fokus kasir; minim distraksi; tombol besar; area sentuh/klik nyaman.

**Token warna (light & dark):**
- Primary: biru/indigo tegas untuk aksi utama.
- Sukses hijau (bayar selesai), bahaya merah (void/hapus), peringatan kuning/amber (stok menipis).
- Netral: abu terang/gelap; teks kontras tinggi.

**Tipografi:** 1 font sans modern (mis. Inter); angka jelas (tabular-nums untuk harga/qty).

**Komponen wajib (shadcn/ui + kustom):**
- `Button`, `Input`, `Select`, `Dialog`, `Sheet`, `Card`, `Badge`, `Tabs`, `Table` (+paginasi), `Toast`, `Skeleton`, `EmptyState`, `DropdownMenu`, `DatePicker`.
- Domain: `ProductGrid`, `CartPanel`, `PaymentDialog`, `ReceiptPreview`, `BarcodeInput`, `StockBadge`, `StatCard`, `SalesChart`, `KpiCard`.

**State wajib:** loading/empty/error di tiap halaman; indikator koneksi & sync global.

---

## 18. DEPLOY & KONFIGURASI (ENV)

**Hosting:** Vercel. **DB:** Neon/Supabase (Postgres serverless).

`.env.example`:
```
# Database (WAJIB)
DATABASE_URL=           # pooled URL
DIRECT_URL=             # direct (migrasi)

# Auth (WAJIB)
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Upload (opsional - gambar produk/QRIS)
UPLOADTHING_TOKEN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# App
NEXT_PUBLIC_APP_NAME=
NEXT_PUBLIC_CURRENCY=IDR
NEXT_PUBLIC_SITE_URL=

# NICE
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

**Catatan Prisma + serverless:** pakai connection pooler untuk `DATABASE_URL` + `DIRECT_URL` untuk migrasi (`directUrl = env("DIRECT_URL")`). Tanpa pooling, koneksi bocor di serverless.

**Langkah deploy (dokumentasikan):**
1. Buat DB Postgres -> isi `DATABASE_URL` + `DIRECT_URL`.
2. `npx prisma migrate deploy` + seed (setting + admin + contoh).
3. Set env di Vercel -> deploy.
4. Login OWNER -> isi produk & stok -> uji kasir (tunai & QRIS) -> cetak struk -> cek laporan & sync offline.

---

## 19. LAPORAN YANG DIMINTA DARI AGENT (PER FASE)

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

## 20. CATATAN AKHIR

- **Hanya dashboard** - tidak ada landing page/halaman publik.
- Utamakan **kecepatan kasir** (minim klik, keyboard-friendly) & **ketahanan offline**.
- Jaga konsistensi istilah (Produk, Varian, Satuan, Stok, Transaksi, Shift, Struk, PO).
- Bila prompt kurang detail di satu area, **putuskan yang paling wajar & aman**, catat di laporan fase.
- Desain: bersih & cepat, dukung light + dark.
- **Fokus nilai jual:** sekali pasang, langsung pakai; cocok untuk minimarket/toko retail.

**Mulai dari FASE 0. Selamat membangun.**
