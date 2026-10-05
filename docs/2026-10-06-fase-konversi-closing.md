# FASE DETAIL — Konversi & Closing (Pembayaran Online, Bundling, Urgency, Abandoned Checkout)

> **Status:** 🚧 Sedang dikerjakan — **FASE P0, P1 & P2 selesai** (kode; uji sandbox P0/P1 terverifikasi), P3–P6 belum.
> **Panduan operasional setup:** `docs/2026-10-06-setup-pembayaran-mayar.md`.
> **Disusun:** sesi pasca-Roadmap (`docs/2026-10-06-roadmap-pengembangan.md`, Tema 1).
> **Gateway terpilih:** **Mayar.id** (Headless API V2) — alasan: onboarding produksi jauh lebih ringan daripada Midtrans/Xendit (verifikasi bisnis ringan, cocok perorangan/UMKM), mendukung QRIS/VA/e-wallet, ada sandbox.
> **Prasyarat baca:** `docs/2026-10-06-roadmap-pengembangan.md`, `docs/2026-10-05-analitik-penjualan.md`, `docs/2026-10-05-kupon-diskon.md`, `docs/2026-10-05-email-transaksional-pembeli.md`, `TASK-SELANJUTNYA.md`.
> **Prinsip:** ikuti pola sehat proyek — **server-authoritative**, observability, a11y, dokumentasi fase, backward-compatible.

---

## 1. Ringkasan & Tujuan

Mengubah alur penjualan LKTech dari **"checkout via WhatsApp manual"** menjadi **"checkout & bayar otomatis 24/7"**, lalu meningkatkan konversi lewat bundling, urgency, dan pemulihan keranjang.

**Hasil yang diharapkan:**
1. Pembeli bisa **bayar sendiri** (QRIS/VA/e-wallet) tanpa menunggu admin.
2. Order **otomatis berubah status** saat pembayaran diterima (webhook).
3. Produk digital instan → **unduhan otomatis**; produk jasa → **alur konsultasi/konfirmasi**.
4. **AOV naik** via bundling & cross-sell.
5. **Keranjang terbengkalai** dapat dipulihkan (email/WA).

---

## 2. Keputusan Desain Kunci

### 2.1 Gateway: Mayar.id (Headless API V2)
| Aspek | Keputusan |
| --- | --- |
| API | **V2** (`/hl/v2`) — V1 deprecated 1 Okt 2026 |
| Base URL | Prod `https://api.mayar.id/hl/v2` · Sandbox `https://api.mayar.io/hl/v2` |
| Auth | `Authorization: Bearer <MAYAR_API_KEY>` (buat di web.mayar.id/api-keys) |
| Pembuatan tagihan | `POST /invoices/create` → respons `data.link` (halaman bayar), `data.id` (invoice id), `data.transactionId`, `data.expiredAt` |
| Korelasi order | Simpan `orderId` di **`extraData`** invoice (di-echo balik saat webhook) |
| Webhook | Event **`payment.received`** (POST JSON) → verifikasi + update order |
| Mode | Sandbox untuk dev (env `MAYAR_MODE=sandbox`), prod untuk live |

### 2.2 Alur Pembayaran (baru)
```
Pembeli → Checkout (keranjang) → POST /api/orders
   ├─ [JASA]  → order dibuat status "menunggu_konfirmasi" (tanpa bayar online) → email "kami akan menghubungi"
   └─ [INSTAN]→ order dibuat status "menunggu_bayar"
              → POST Mayar /invoices/create (extraData: { orderId })
              → simpan mayarInvoiceId/link/expiredAt di order
              → arahkan pembeli ke data.link (halaman bayar Mayar)
Pembeli bayar (QRIS/VA/e-wallet)
   → Mayar kirim webhook payment.received
   → POST /api/webhooks/mayar: verifikasi → order.status = "dibayar"
   → [INSTAN] generate akses unduhan + email "Pembayaran diterima + link unduhan"
   → [JASA] (tidak pakai jalur ini)
```
WhatsApp tetap tersedia sebagai **opsi sekunder** ("Checkout via WhatsApp") — tidak dihapus.

### 2.3 Fulfillment Dua Jalur (keputusan pemilik produk)
Produk sudah punya `category` (`template|software|aplikasi|ebook|jasa|lainnya`). Petakan ke **jenis fulfillment**:

| Jenis | Kategori produk | Setelah bayar | Alur |
| --- | --- | --- | --- |
| **INSTAN** (download) | `template`, `software`, `ebook`, `aplikasi`, `lainnya` | Otomatis: link unduhan di email + `/akun` | Bayar → `dibayar` → unduh |
| **JASA** (human service) | `jasa` | Perlu konfirmasi/konsultasi | Order → `menunggu_konfirmasi` → admin hubungi → (opsional) invoice manual via Mayar → `dibayar` → `diproses` |

> **Catatan penting (Mayar MoR):** Mayar adalah *Merchant of Record* **khusus barang digital** — **tidak mendukung "entirely human services" (konsultasi/jasa penuh)**. Karena itu **produk JASA memakai alur berbeda**: tidak lewat invoice Mayar otomatis; pembayaran jasa dilakukan **setelah konsultasi & kesepakatan** (invoice manual/offline atau payment link yang dibuat admin). Produk INSTAN sepenuhnya lewat Mayar. Ini keputusan kepatuhan, bukan sekadar teknis.

**Detail produk instan (download):**
- Tambah field produk: `downloadable: { enabled: boolean; files: { name: string; url: string }[]; }` (URL Cloudinary/aman).
- Setelah `dibayar`: buat **token unduhan** (HMAC/opaque) berbatas waktu + batas jumlah unduh; kirim link lewat email & tampilkan di `/akun`.
- Halaman `/unduhan/[token]` — validasi token, sajikan daftar file, catat unduhan.
- Admin (opsional): lihat jumlah unduhan per order.

**Produk jasa:**
- CTA di halaman produk jasa: **"Konsultasi dulu"** (WhatsApp) — arahkan sebelum checkout (sesuai permintaan pemilik).
- Bila tetap checkout: order `menunggu_konfirmasi`, email ke pembeli & admin.
- Admin bisa: kirim invoice manual (buat invoice Mayar via admin) atau ubah status manual.

### 2.4 Model Status Order (diperluas)
```
baru → (jasa) menunggu_konfirmasi → diproses → selesai
baru → (instan) menunggu_bayar → dibayar → (instant: selesai otomatis / manual)
menunggu_bayar → kedaluwarsa (auto)
* → dibatalkan
```
Migrasi backward-compatible: order lama (status `baru|diproses|selesai|dibatalkan`) tetap valid; `normalizeOrder` menambah status baru dengan aman.

---

## 3. Arsitektur Teknis

### 3.1 Env baru (`.env.example` & Vercel)
```
# Mayar
MAYAR_API_KEY=
MAYAR_MODE=sandbox                 # sandbox | production
MAYAR_BASE_URL=                    # opsional override; default ikut MAYAR_MODE
# Keamanan webhook (opsional tapi disarankan)
MAYAR_WEBHOOK_TOKEN=               # shared secret/verifikasi (bila didukung)
# Akses unduhan
DOWNLOAD_TOKEN_SECRET=             # HMAC untuk token unduhan
```

### 3.2 File/modul baru (rencana)
| File | Peran |
| --- | --- |
| `src/lib/mayar.ts` | Klien Mayar (create invoice, get detail, register webhook). Server-only. |
| `src/lib/payment-types.ts` | Tipe aman-klien (status bayar, info invoice). |
| `src/lib/order-fulfillment.ts` | Tentukan jalur INSTAN/JASA dari produk; orkestrasi fulfillment. |
| `src/lib/downloads.ts` | Token unduhan (HMAC), catat & batasi unduhan. |
| `src/lib/order-status.ts` | Perluasan status + helper transisi (atau perluas `order-types.ts`). |
| `src/app/api/webhooks/mayar/route.ts` | Endpoint webhook `payment.received`. |
| `src/app/api/orders/[id]/pay/route.ts` | (Opsional) buat ulang/ambil link bayar. |
| `src/app/unduhan/[token]/page.tsx` | Halaman unduhan produk digital. |
| `src/components/admin/order-payment-panel.tsx` | Panel pembayaran di detail order admin. |
| `src/components/pay-button.tsx` / `payment-status.tsx` | UI pembayaran di keranjang & `/akun`. |

### 3.3 Perubahan file inti
- `src/lib/order-types.ts` — tambah status (`menunggu_bayar`, `menunggu_konfirmasi`, `dibayar`, `kedaluwarsa`), field `payment` (`method`, `mayarInvoiceId`, `paidAt`, `amount`, `expiresAt`), field `fulfillment` (`type`, `downloadTokenId?`).
- `src/lib/orders.ts` — `createOrder` menyimpan info pembayaran; helper `markOrderPaid` (idempoten).
- `src/app/api/orders/route.ts` — setelah `createOrder`: bila INSTAN → buat invoice Mayar & kembalikan `payUrl`; bila JASA → status `menunggu_konfirmasi`.
- `src/lib/order-schema.ts` — tambah `paymentMethod` pilihan (opsional).
- `src/app/api/admin/orders/route.ts` — status baru di filter; aksi "buat invoice manual" untuk jasa.
- `src/lib/order-status.ts`/`order-types.ts` — label, warna badge, aturan restore kupon saat `kedaluwarsa`/`dibatalkan`.
- `src/components/cart-view.tsx` — setelah checkout: bila ada `payUrl`, arahkan ke halaman bayar; tampilkan opsi WA sebagai sekunder.
- Sitemap/robots: `/unduhan/*` **noindex**.

### 3.4 Webhook — kontrak & keamanan (`payment.received`)
Payload (ringkas dari dok Mayar):
```json
{
  "event": "payment.received",
  "data": {
    "id": "<invoiceId>",
    "status": true,
    "amount": 150000,
    "customerEmail": "...",
    "productId": "...",
    "extraData": { "orderId": "<orderId-kita>" }
  }
}
```
Handler:
1. **Verifikasi** (token/signature bila disediakan; minimal cocokkan `extraData.orderId` ada & valid).
2. **Idempoten**: bila order sudah `dibayar`, abaikan (return 200).
3. Validasi `amount` ≥ `order.total` (toleransi metode fee) — bila kurang, tandai `payment_mismatch` & alert admin, jangan auto-selesai.
4. `markOrderPaid(orderId, {method, paidAt, amount})` → transisi status.
5. Trigger fulfillment (INSTAN: generate unduhan + email; catat email via `email-status`).
6. Semua best-effort tercatat; selalu balas `200` cepat (jangan blok Mayar).

> **Kepatuhan restore kupon (`KP-C2`):** saat order → `kedaluwarsa` atau `dibatalkan`, panggil `restoreCouponUsage` (reuse modul yang sudah ada).

### 3.5 Kedaluwarsa otomatis
- `expiredAt` invoice ikut disimpan. Endpoint `/api/cron/expire-orders` (dilindungi `CRON_SECRET`) menandai order `menunggu_bayar` yang lewat `expiresAt` → `kedaluwarsa` + restore kupon. **Dijadwalkan dari cron eksternal** (cron-job.org / GitHub Actions) — fitur Vercel Cron bawaan (`vercel.json`) butuh plan Pro dan membuat deploy GAGAL di plan Hobby.
- Alternatif ringan: periksa saat admin membuka daftar (lazy) — tapi cron lebih benar.

---

## 4. Bundling & Cross-Sell

### 4.1 Data model
- Produk: `relatedSlugs: string[]` (manual, admin) + `bundlesWith` opsional.
- Sumber otomatis (opsional, fase lanjut): co-purchase dari riwayat `orders`.

### 4.2 UI
- Detail produk: section **"Sering dibeli bersama"** (server-rendered).
- Keranjang: saran tambah item (cross-sell) bila relasi ada.

### 4.3 Diskon bundel
- Perluas model kupon (backlog `KP-P2`): `appliesToSlugs?: string[]`, `minItems?: number`, `eligibleSubtotal`.
- Validasi bundel di server (`validateCoupon`) — hanya berlaku bila keranjang memenuhi syarat.

---

## 5. Urgency & Trust

- **Stok nyata**: badge "Sisa N" dari kuota varian (bila ada) atau `soldOut`.
- **Bukti sosial nyata**: "N pembeli minggu ini" (agregat `orders` 7 hari, cache ringan) — **tanpa angka palsu**.
- **Trust badges**: garansi/kebijakan refund, metode bayar (QRIS/VA/e-wallet), "diproses otomatis".
- **Etika**: tidak memakai countdown palsu; hanya data nyata & benar.

---

## 6. Abandoned Checkout Recovery

- **Draft keranjang server-side**: simpan keranjang user login (koleksi `carts/{uid}`) saat berubah.
- **Pengingat H+1**: bila belum checkout, kirim email (dan opsional WA) berisi deep-link kembali ke keranjang.
- **Opt-in & privasi**: hormati preferensi notifikasi; sertakan cara berhenti.
- **Ukur**: event `cart_abandoned_recovered`.
- Ketergantungan: modul email marketing (Tema 2) untuk broadcast; untuk fase ini cukup 1 email pengingat transaksional.

---

## 7. Fase Eksekusi (bertahap, tiap fase mandiri & dites)

### FASE P0 — Fondasi Pembayaran (INSTAN) — ✅ SELESAI (kode; uji sandbox live = manual)
- [x] Env Mayar + `src/lib/mayar.ts` (create invoice, get detail) + `payment-types.ts`.
- [x] Perluasan status order + `normalizeOrder` backward-compat + label/badge.
- [x] `createOrder` simpan `payment` & `fulfillment.type`; checkout INSTAN → invoice Mayar → kembalikan `payUrl`.
- [x] Halaman/redirect bayar + status di `/akun` & keranjang.
- [ ] Uji **sandbox** end-to-end (buat invoice → bayar di sandbox → webhook). *(butuh API key Mayar — manual)*
- **DoD:** order instan dapat dibayar via sandbox; status tersimpan. *(kode siap; verifikasi live menunggu kredensial)*

> **Catatan implementasi P0** (lihat juga `TASK-SELANJUTNYA.md`):
> - Klien Mayar V2: `POST /hl/v2/invoices/create` (items, `extraData:{orderId}`, `expiredAt`), `GET /hl/v2/invoices/{id}`. Base URL dari `MAYAR_MODE`/`MAYAR_BASE_URL`.
> - **Aman tanpa kredensial:** bila `MAYAR_API_KEY` kosong, order INSTAN tetap dibuat (`menunggu_bayar`, `payment.status="belum_bayar"`) dan checkout jatuh ke alur **WhatsApp** (fallback) — tidak ada error.
> - **JASA** → `menunggu_konfirmasi` (tanpa invoice; sesuai kepatuhan MoR). Keranjang campuran (ada jasa) → ikut JASA.
> - Status dikelola `order-types.ts` (`ORDER_STATUSES`/label/badge); `OrdersSummary`, filter admin, dan dropdown status otomatis memuat status baru.
> - Helper server: `updateOrderPayment`, `markOrderPaid` (idempoten) — dipakai P0 & siap untuk webhook P1.
> - `computeCompletionRate` diperluas: status `kedaluwarsa` ikut dikecualikan (terminal non-penghasil).

### FASE P1 — Webhook & Fulfillment Otomatis (INSTAN) — ✅ SELESAI (kode)
- [x] `POST /api/webhooks/mayar` (verifikasi, idempoten, tandai dibayar).
- [x] `markOrderPaid` + email "pembayaran diterima".
- [x] `downloads.ts` + halaman `/unduhan/[token]` + email link unduhan.
- [x] Field admin `downloadable` di form produk.
- **DoD:** bayar → status `dibayar` otomatis → pembeli menerima link unduhan.

> **Catatan implementasi P1:**
> - Webhook: korelasi order via `data.extraData.orderId` (fallback `productId`); verifikasi opsional `MAYAR_WEBHOOK_TOKEN` (query `?token=` atau header `x-webhook-token`); **idempoten** (order `dibayar` → diabaikan); **cocokkan nominal** (kurang dari `total` → `paymentMismatch`, tidak auto-lunas); selalu balas 200 cepat.
> - Fulfillment (`src/lib/order-payment.ts`): kumpulkan berkas dari `product.downloadable` → buat token HMAC (`downloads.ts`, idempoten per order) → email "Pembayaran Diterima + link unduhan" (template `sendOrderPaidToBuyer`) → simpan `downloadTokenId` ke order.
> - Unduhan: token = `{tokenId}.{HMAC}` (`download-token.ts`, teruji); secret dari `DOWNLOAD_TOKEN_SECRET` (fallback `MAYAR_API_KEY`); masa berlaku & batas unduh dari env/dokumen `downloads/{tokenId}`. `/unduhan/[token]` (halaman) + `/api/downloads/[token]/[index]` (redirect + catat hit). **noindex** + disallow robots.
> - `/akun` tab Pesanan: tombol **Bayar sekarang** (menunggu bayar) & **Unduh produk** (bila `downloadUrl`).
> - Aman tanpa kredensial: tanpa `DOWNLOAD_TOKEN_SECRET`/`MAYAR_API_KEY`, unduhan dinonaktifkan (fail-closed); tanpa `MAYAR_WEBHOOK_TOKEN`, verifikasi token dilewati (tetap valid korelasi+idempotensi).

> **P1 — penyempurnaan pasca-uji (verifikasi sandbox lolos):**
> - **Bug fix:** `mobile` REQUIRED di invoice Mayar → sebelumnya 400 "Validation Error" (checkout jatuh ke WhatsApp). Kini dikirim no. WhatsApp profil / fallback no. situs.
> - **Bug fix:** `size: undefined` di `files` ditolak Firestore → token unduhan gagal dibuat. Kini berkas dibersihkan sebelum disimpan.
> - **Aksi admin "Buat / kirim ulang unduhan"** (`POST /api/admin/orders {action:"fulfill"}`): menyegarkan berkas pada token order (mis. berkas produk baru ditambahkan setelah bayar), menampilkan link, & mengirim ulang email. Token tetap sama (link lama tetap valid).
> - **Diagnostik:** `GET /api/health/payment` (status env Mayar/download/email, tanpa bocorkan kunci).
> - **UI:** keranjang menampilkan alasan bila jatuh ke WhatsApp (pesan `warning` dari server).
> - **Catatan email:** tanpa domain Resend terverifikasi, email ke pembeli umum = 403 (dilog, tidak menggagalkan order) — SKIP sampai punya domain (lihat `TASK-SELANJUTNYA.md` §5).

### FASE P2 — Alur JASA & Kedaluwarsa — ✅ SELESAI (kode)
- [x] Checkout JASA → `menunggu_konfirmasi` + email pembeli (`sendOrderStatusToBuyer`) & **admin** (`sendOrderAwaitingConfirmationToAdmin`).
- [x] CTA "Konsultasi dulu" di halaman produk `jasa` (tunggal & multi-varian; sidebar, panel, bottom sheet mobile).
- [x] Admin: **buat invoice manual** (Mayar) via `POST /api/admin/orders {action:"invoice"}` + tombol di detail order.
- [x] **Cron kedaluwarsa** (`/api/cron/expire-orders`, dilindungi `CRON_SECRET`) → `kedaluwarsa` + restore kupon (`KP-C2`) + email pembeli.
- [x] Panel pembayaran di detail order admin (badge status, nominal, expiresAt, tautan bayar, badge "manual", tombol invoice).
- **DoD:** jasa punya alur konfirmasi; order tak dibayar kedaluwarsa & kuota kembali. ✅

> **Catatan implementasi P2:**
> - **Kedaluwarsa:** logika murni `isOrderExpired` (`order-expiry-pure.ts`, teruji 5 test) + `getExpiredPendingOrders`/`markOrderExpired` (`orders.ts`, idempoten) + orkestrasi `expirePendingOrders` (`order-expiry.ts`: tandai → restore kupon `KP-C2` → email "kedaluwarsa").
> - **Cron:** `GET/POST /api/cron/expire-orders`. **Fail-closed**: tanpa `CRON_SECRET` → 503 (tak bisa dipicu orang lain). Verifikasi `Authorization: Bearer <secret>` atau `?token=`. **Dijadwalkan dari cron eksternal** (mis. cron-job.org / GitHub Actions) — fitur Vercel Cron bawaan (`vercel.json`) butuh plan Pro dan membuat deploy GAGAL di plan Hobby.
> - **Invoice manual:** `createManualOrderInvoice` (order-payment.ts) — buat invoice Mayar ber-`extraData.orderId` (webhook menandai lunas otomatis), simpan `payment` (`manual:true`) tanpa ubah status. Dipakai untuk JASA setelah kesepakatan / INSTAN gagal invoice otomatis.
> - **Email admin JASA:** `sendOrderAwaitingConfirmationToAdmin` (`email.ts`) — terpisah dari email konfirmasi pembeli agar kegagalan salah satu tak memblok yang lain.
> - **`/akun`:** tombol "Bayar sekarang" kini muncul untuk order ber-`payUrl` yang belum lunas (termasuk JASA ber-invoice manual), bukan hanya `menunggu_bayar`.


### FASE P3 — Bundling & Cross-Sell
- [ ] `relatedSlugs`/`bundlesWith` + UI "Sering dibeli bersama".
- [ ] Kupon bundel (`appliesToSlugs`, `minItems`) di `validateCoupon`.
- **DoD:** bundel tampil & diskon bundel tervalidasi server.

### FASE P4 — Urgency & Trust
- [ ] Badge stok + bukti sosial nyata (cache) + trust badges.
- **DoD:** elemen urgency memakai data nyata; a11y label jelas.

### FASE P5 — Abandoned Checkout
- [ ] Draft keranjang server + email pengingat H+1 + tracking recovery.
- **DoD:** keranjang terbengkalai terkirim pengingat; terukur.

### FASE P6 — QA, Observability & Docs
- [ ] Event tracking (`payment_initiated`, `payment_received`, `abandoned_recovered`).
- [ ] Status pembayaran di analitik (konversi checkout → bayar).
- [ ] `tsc`/`lint`/`build` bersih + unit test (kalkulasi & transisi status).
- [ ] Update `TASK-SELANJUTNYA.md`, `docs/README.md`, roadmap.
- **DoD:** semua checklist §9 lolos.

---

## 8. Risiko & Mitigasi
| Risiko | Mitigasi |
| --- | --- |
| Mayar MoR tak dukung **jasa manusia** | Pisahkan alur JASA (konsultasi/manual), jangan lewat invoice otomatis |
| Webhook gagal/dobel | Idempoten (skip bila sudah dibayar) + retry manual dari dashboard Mayar |
| Amount mismatch (fee) | Simpan `amount` diterima; toleransi & flag, jangan auto-selesai bila kurang |
| Kode unduhan bocor | Token HMAC berbatas waktu + batas unduh + catat IP/waktu |
| Selisih total (bulat/desimal) | Butuh store konfirmasi bayar tanpa akun (Mayar kirim email invoice) |
| Sandbox vs prod | Env `MAYAR_MODE`; jangan hardcode base URL |
| Order lama | `normalizeOrder` default aman; status lama tetap valid |

---

## 9. Definition of Done Global
1. `tsc`/`lint`/`build` bersih; ada unit test transisi status & kalkulasi bundel.
2. Uang & akses **hanya** divalidasi server (harga, status bayar, kepemilikan unduhan).
3. Webhook idempoten & aman; kegagalan tercatat + terpantau.
4. Uji sandbox end-to-end lolos untuk INSTAN & JASA.
5. Backward-compatible (order & data lama tetap jalan).
6. A11y & mobile-first; halaman `/unduhan/*` `noindex`.
7. Dokumentasi fase & `TASK-SELANJUTNYA.md` diperbarui.

---

## 10. Pertanyaan Terbuka (untuk diputuskan saat implementasi)
1. **Kanal** yang diaktifkan lebih dulu? (rekomendasi: QRIS + VA utama + e-wallet populer)
2. **Batas unduhan**: jumlah & masa berlaku link (rekomendasi: 5× / 30 hari, bisa diubah).
3. **Email pengingat abandoned**: 1× (H+1) dulu, atau H+1 & H+3?
4. **Bukti sosial "N pembeli"**: ambang minimal order agar tak menampilkan angka kecil (mis. tampil bila ≥ 5)?
5. **Jasa**: apakah invoice jasa tetap via Mayar (dibuat admin setelah deal) atau pembayaran offline penuh?
