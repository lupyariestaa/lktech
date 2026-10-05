# Setup Pembayaran Online & Unduhan (Mayar.id) — Panduan Operasional

> **Status:** Aktif (sandbox terverifikasi). Dokumen panduan operasional.
> **Berlaku untuk:** FASE P0 (pembayaran) & P1 (webhook + unduhan) —
> lihat `docs/2026-10-06-fase-konversi-closing.md`.
> **Sifat:** panduan langkah manual (bukan changelog). Tujuan: sesi berikutnya
> / pemilik dapat mengulang setup tanpa membaca riwayat chat.

---

## 0. Ringkas arsitektur

```
Pembeli → /keranjang → POST /api/orders
  ├─ INSTAN (kategori ≠ jasa) → status "menunggu_bayar"
  │    → POST Mayar /hl/v2/invoices/create (extraData:{orderId, mobile WAJIB})
  │    → simpan payUrl → pembeli diarahkan ke halaman bayar Mayar
  └─ JASA (kategori = jasa)   → status "menunggu_konfirmasi" (tanpa invoice)

Pembeli bayar → Mayar kirim webhook "payment.received"
  → POST /api/webhooks/mayar  (verifikasi lunak + korelasi orderId + idempoten + cek nominal)
  → markOrderPaid → status "dibayar"
  → fulfillOrder → buat token unduhan (downloads/{tokenId}) + email "Pembayaran Diterima"
  → tampil tombol "Unduh produk" di /akun → /unduhan/[token]
```

**Fallback aman:** jika `MAYAR_API_KEY` kosong ATAU invoice gagal → order tetap
dibuat (`menunggu_bayar`) & checkout dialihkan ke **WhatsApp** (dengan alasan
ditampilkan di keranjang). Tidak pernah error ke pembeli.

---

## 1. Cek status konfigurasi (diagnostik)

```
GET https://<domain>/api/health/payment
```
Respons contoh (semua sehat):
```json
{
  "mayar":    { "configured": true, "mode": "sandbox", "webhookTokenSet": true },
  "download": { "configured": true },
  "email":    { "configured": true }
}
```
- `mayar.configured: false` → `MAYAR_API_KEY` kosong → checkout jatuh ke WhatsApp.
- `download.configured: false` → `DOWNLOAD_TOKEN_SECRET` & `MAYAR_API_KEY` dua-duanya kosong → unduhan nonaktif.

---

## 2. Environment variables

Ada **dua tempat**: `.env.local` (lokal `npm run dev`) dan **Vercel → Settings →
Environment Variables** (produksi). Isi keduanya. Setelah menambah/mengubah env
di Vercel → **wajib Redeploy**.

```bash
# ===== Mayar.id =====
MAYAR_API_KEY=            # WAJIB untuk invoice otomatis (Read & Write)
MAYAR_MODE=sandbox        # sandbox | production
MAYAR_BASE_URL=           # opsional override penuh (mis. https://api.mayar.id/hl/v2)
MAYAR_INVOICE_TTL_MINUTES=1440
MAYAR_WEBHOOK_TOKEN=      # disarankan: shared-secret verifikasi webhook

# ===== Unduhan Produk Digital =====
DOWNLOAD_TOKEN_SECRET=    # HMAC token unduhan; fallback ke MAYAR_API_KEY bila kosong
DOWNLOAD_LINK_DAYS=30
DOWNLOAD_MAX_HITS=5
```

### Membuat secret acak (Windows PowerShell, tanpa install)
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```
Jalankan dua kali: satu untuk `MAYAR_WEBHOOK_TOKEN`, satu untuk `DOWNLOAD_TOKEN_SECRET`.

> ⚠️ **Penting (Mayar):** API key **sandbox** (`web.mayar.io`) dan **production**
> (`web.mayar.id`) TIDAK bisa saling tukar. Perubahan domain/subdomain Mayar juga
> membuat API key lama tidak valid → buat ulang.

> ⚠️ **Token `MAYAR_WEBHOOK_TOKEN`:** sebaiknya hindari karakter `/` dan `=` (bisa
> bermasalah di URL). Verifikasi token bersifat **lunak** (tidak 401 bila tak
> cocok) — keamanan sesungguhnya dari korelasi `extraData.orderId` + idempotensi +
> cek nominal.

---

## 3. Setup akun Mayar + API key

### Sandbox (untuk uji)
1. Daftar/login di **https://web.mayar.io**.
2. Buka **https://web.mayar.io/api-keys** → **Create API Key** → pilih **Read & Write**.
3. Salin API key → isi `MAYAR_API_KEY`, set `MAYAR_MODE=sandbox`.

### Production (uang asli — nanti)
1. Daftar/login di **https://web.mayar.id** → **verifikasi bisnis** (diproses Mayar).
2. Buat API key (Read & Write) → isi `MAYAR_API_KEY` (produksi), set `MAYAR_MODE=production`.
3. Redeploy + daftarkan ulang webhook (langkah 4).

---

## 4. Daftarkan URL webhook Mayar

1. Dashboard Mayar → **Integration → Webhook**.
2. Isi **URL Webhook**:
   - Produksi: `https://<domain>/api/webhooks/mayar?token=<MAYAR_WEBHOOK_TOKEN>`
   - Sandbox: `http://<tunnel-ngrok>/api/webhooks/mayar?token=<MAYAR_WEBHOOK_TOKEN>` (butuh tunnel bila dev lokal)
3. **Save** → **Test URL**.
   - Endpoint membalas `{"statusCode":200,"messages":"success"}` untuk event `testing` → Test URL seharusnya **SUCCESS**.
   - Event asli saat bayar = `payment.received`.
4. Cek ketersihan endpoint di browser: `GET https://<domain>/api/webhooks/mayar` → `{"ok":true,"endpoint":"mayar-webhook"}`.

**Verifikasi:** setelah ada pembayaran, buka **Vercel → Deployments → Logs** →
harus muncul `POST 200 /api/webhooks/mayar`, dan status order di `/admin/orders`
berubah menjadi **Dibayar**.

---

## 5. Set produk digital (agar unduhan berfungsi)

1. Buka `/admin/products` → edit/buat produk.
2. **Kategori WAJIB digital** (`template`/`software`/`ebook`/`aplikasi`/`lainnya`) —
   **JANGAN `jasa`** (kategori jasa → jalur konsultasi, bukan unduhan).
3. **Harga > 0** (wajib; kalau 0, invoice tidak dibuat).
4. Bagian **"Unduhan Otomatis (produk digital)"** → toggle **Aktifkan unduhan** →
   **Tambah Berkas**: isi **Nama berkas** + **URL berkas** (URL Cloudinary/aman,
   harus `https://` & bisa diakses).
5. (Opsional) Masa berlaku link (default 30 hari), Batas unduh (default 5×), Catatan.
6. **Simpan Produk**.

### Mendapatkan URL berkas (Cloudinary)
Cloudinary Console → Media Library → **Upload** file (mis. `.zip`/PDF) → klik file
→ **Copy URL**. Untuk file mentah biasanya berbentuk
`https://res.cloudinary.com/<cloud>/raw/upload/v.../namafile.zip`.

### Seed produk contoh (opsional)
```bash
node scripts/seed-product-template-katalog.mjs
```
Membuat produk "Template Katalog Produk UMKM" (`template-katalog-umkm`, Rp149rb).
Blok unduhan sengaja **kosong** — isi berkasnya manual lewat langkah di atas.

---

## 6. Uji end-to-end (sandbox)

1. `/produk` → pilih produk digital → tambah ke keranjang → **login** → `/keranjang` → **Checkout**.
2. Yang diharapkan: dialihkan ke **halaman bayar Mayar**. (Jika jatuh ke WhatsApp → cek §1 diagnostik; alasan tampil di keranjang.)
3. Selesaikan pembayaran di sandbox Mayar.
4. Cek hasil:
   - `/admin/orders` → status **Dibayar**.
   - `/akun` → tab **Pesanan** → tombol **Unduh produk**.
   - `/unduhan/<token>` → daftar berkas → tombol **Unduh** (redirect + catat hit).
   - Email ke pembeli (⚠️ hanya ke email terdaftar Resend — lihat §8).

### Uji webhook manual (tanpa bayar)
```powershell
$body = '{"event":"payment.received","data":{"amount":149000,"extraData":{"orderId":"<ORDER_ID>"}}}'
Invoke-RestMethod -Uri "https://<domain>/api/webhooks/mayar?token=<MAYAR_WEBHOOK_TOKEN>" `
  -Method POST -ContentType "application/json" -Body $body
```
`<ORDER_ID>` ada di URL detail order admin. Bila `amount` < `order.total` → ditandai
`paymentMismatch`, tidak dilunasi (uji negatif yang berguna).

---

## 7. Tindakan admin terkait pembayaran/unduhan

- **Ubah status order:** `/admin/orders` → filter/detail → dropdown status.
  Transisi ke `dibatalkan`/`kedaluwarsa` → **kuota kupon dikembalikan** (`KP-C2`).
- **Buat / kirim ulang unduhan:** detail order (digital & sudah dibayar) → tombol
  **"Buat / kirim ulang unduhan"**. Berguna bila berkas produk baru ditambahkan
  *setelah* pembayaran. Token lama tetap valid (berkas di-refresh).
  API: `POST /api/admin/orders { id, action: "fulfill" }`.
- **Kirim ulang email:** tombol **"Kirim ulang email"** di detail order.

---

## 8. Email transaksional (Resend) — kondisi & batasan

- Pengirim saat ini: `EMAIL_FROM=LKTech <onboarding@resend.dev>` (domain uji Resend).
- **Batasan:** tanpa domain terverifikasi, email hanya terkirim ke email yang
  terdaftar di akun Resend (mis. `lupyariestaa@gmail.com`). Ke email pembeli umum →
  **HTTP 403** (dilog, **tidak menggagalkan order**).
- **Dampak:** pembeli tetap bisa mengunduh via `/akun` (bukan lewat email).
- **Mengaktifkan (nanti):** beli domain → Resend **Add Domain** → pasang record DNS
  (SPF/DKIM/MX) di registrar → **Verify** → set `EMAIL_FROM=...@domainanda` → redeploy.
  **Tidak ada perubahan kode** yang diperlukan.

---

## 9. Troubleshooting (gejala → penyebab → solusi)

| Gejala | Penyebab umum | Solusi |
| --- | --- | --- |
| Checkout jatuh ke WhatsApp | `MAYAR_API_KEY` kosong / env belum ter-redeploy | Cek `GET /api/health/payment`; isi env → redeploy |
| Log: `Mayar error (HTTP 400): Validation Error` | Field wajib kosong (mis. `mobile`) / format salah | Sudah ditangani: `mobile` diisi no. WA profil/situs |
| Log: `Mayar error (HTTP 401): Unauthorized` | API key salah/dicabut, atau key sandbox↔production tertukar | Buat API key baru sesuai mode |
| Log: `Cannot use "undefined" as a Firestore value (field files.0.size)` | Berkas tanpa ukuran | Sudah ditangani: berkas dibersihkan sebelum simpan |
| Webhook dibalas 401 | (lama) token tak cocok — kini **lunak**, tidak lagi blok | Pastikan `MAYAR_WEBHOOK_TOKEN` konsisten bila ingin verifikasi |
| Webhook tidak masuk | URL salah / server lokal tanpa tunnel / belum Save di Mayar | Perbaiki URL; pakai Ngrok untuk dev lokal |
| Status tetap "Menunggu Bayar" | Webhook tak sampai, atau `amount` < `total` | Cek log Vercel `POST /api/webhooks/mayar` |
| Tombol unduhan tak muncul di `/akun` | Token belum dibuat (berkas produk belum diisi saat bayar) | Isi berkas produk → tombol **Buat/kirim ulang unduhan** di admin |
| Unduhan "nonaktif" / tak bisa diakses | `DOWNLOAD_TOKEN_SECRET` & `MAYAR_API_KEY` dua-duanya kosong | Isi salah satu → redeploy |
| Test URL Mayar "failed" | Event `testing` (endpoint kini balas format sukses) | Pastikan deploy terbaru; cek log Vercel |

---

## 10. Referensi cepat (file & rute)

| Kebutuhan | Lokasi |
| --- | --- |
| Klien Mayar | `src/lib/mayar.ts` |
| Tipe pembayaran (safe-klien) | `src/lib/payment-types.ts` |
| Status order + field `payment`/`fulfillment` | `src/lib/order-types.ts` |
| Pemetaan INSTAN/JASA | `src/lib/order-fulfillment.ts` |
| Orkestrasi fulfillment | `src/lib/order-payment.ts` |
| Token unduhan | `src/lib/download-token.ts`, `src/lib/downloads.ts` |
| Checkout (buat order + invoice) | `src/app/api/orders/route.ts` |
| Webhook | `src/app/api/webhooks/mayar/route.ts` |
| Unduhan (halaman & berkas) | `src/app/unduhan/[token]/page.tsx`, `src/app/api/downloads/[token]/[index]/route.ts` |
| Admin order (aksi fulfill/dll) | `src/app/api/admin/orders/route.ts`, `src/components/admin/orders-manager.tsx` |
| Diagnostik | `src/app/api/health/payment/route.ts` |
| Seed produk contoh | `scripts/seed-product-template-katalog.mjs` |

---

## 11. Kedaluwarsa order otomatis (FASE P2)

Order `menunggu_bayar` yang melewati `payment.expiresAt` otomatis menjadi
`kedaluwarsa` + kuota kupon dikembalikan (`KP-C2`) + email pemberitahuan ke pembeli.

### Aktifkan cron
1. Set env **`CRON_SECRET`** (nilai acak) di Vercel → redeploy.
   ```powershell
   # contoh membuat secret acak (PowerShell)
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
   ```
2. `vercel.json` sudah memuat jadwal cron tiap jam:
   ```json
   { "crons": [{ "path": "/api/cron/expire-orders", "schedule": "0 * * * *" }] }
   ```
   Vercel otomatis memanggil endpoint ini dengan header
   `Authorization: Bearer <CRON_SECRET>`.
3. Uji manual (mis. dari browser/curl):
   ```
   GET https://<domain>/api/cron/expire-orders?token=<CRON_SECRET>
   → { "ok": true, "scanned": N, "expired": N, "couponsRestored": N, "emailsSent": N, ... }
   ```

> **Fail-closed:** bila `CRON_SECRET` kosong, endpoint membalas **503** (`cron_disabled`)
> dan TIDAK memproses apa pun — mencegah penyalahgunaan oleh pihak lain.

### Invoice manual (untuk order JASA)
Di `/admin/orders` → Detail pesanan → tombol **Buat invoice manual**. Membuat
invoice Mayar ber-`extraData.orderId` (webhook tetap menandai lunas otomatis),
menyimpan tautan bayar ke order (`payment.manual = true`), lalu admin mengirim
tautan (mis. via WhatsApp) ke pembeli. Relevan untuk order JASA setelah
kesepakatan, atau order INSTAN yang gagal invoice otomatis.

### Referensi tambahan (P2)
| Kebutuhan | Lokasi |
| --- | --- |
| Logika kedaluwarsa (murni) | `src/lib/order-expiry-pure.ts` |
| Orkestrasi kedaluwarsa | `src/lib/order-expiry.ts` |
| Endpoint cron | `src/app/api/cron/expire-orders/route.ts` |
| Email admin JASA | `sendOrderAwaitingConfirmationToAdmin` (`src/lib/email.ts`) |
| Invoice manual | `createManualOrderInvoice` (`src/lib/order-payment.ts`) |

