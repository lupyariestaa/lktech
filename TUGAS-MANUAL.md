# Tugas Manual Pemilik — Pelacak

> **Status:** 🔄 Aktif (dokumen hidup — di-update tiap ada status baru).
> **Dibuat:** 2026-10-14. **Pemilik:** pemilik proyek (bukan kode).
> **Tujuan:** satu tempat untuk SEMUA pekerjaan yang butuh akun/dashboard/uang
> pemilik (yang tak bisa dikerjakan lewat kode). Centang `[x]` bila beres.
>
> **Cara pakai:** selesai satu langkah → bilang ke asisten ("GSC beres",
> "Mayar produksi aktif", dst) → asisten menandai `[x]` + update kolom Status.
>
> **Sumber teknis:** `docs/2026-10-06-setup-pembayaran-mayar.md` (Mayar),
> `docs/2026-10-12-seo-konten-mesin.md` §S6/S7 (SEO/GSC), `.env.example`.

---

## Peta cepat

| Kode | Tugas | Butuh | Prioritas | Status |
| --- | --- | --- | --- | --- |
| M1 | Search Console: verifikasi + submit sitemap | akun Google | 🔴 Tinggi | ✅ Selesai |
| M2 | Mayar: aktifkan mode produksi | verifikasi bisnis | 🔴 Tinggi | ⬜ Belum |
| M3 | Domain sendiri + Resend terverifikasi | beli domain | 🟠 Sedang | ⬜ Belum |
| M4 | Env opsional (GA4 / GSC API / Upstash / WA) | akun masing-masing | 🟡 Rendah | 🔄 Sebagian (GA4 ✅ · Upstash ✅) |
| M5 | Backfill agregat analitik 90 hari (sekali) | — | 🟡 Rendah | ✅ Selesai |
| M6 | Firestore Rules republish (A4) | Firebase Console | 🟢 Ditunda | ✅ Selesai |

Legenda status: ⬜ Belum · 🔄 Sedang · ✅ Selesai · ⏭️ Ditunda

> **Catatan teknis (2026-10-23):** E2E auth admin sudah berjalan di **Firebase
> Emulator** (7/7, `73a8609`) memakai akun seed lokal. Ini **tidak** membutuhkan
> akun/dashboard pemilik dan **bukan** verifikasi produksi. Sisa verifikasi
> staging/produksi + popup Google adalah backlog teknis, bukan tugas manual di
> halaman ini.

---

## M1 — Google Search Console: verifikasi + submit sitemap

**Guna:** agar halaman terindeks Google (gratis, tuntas cepat).

- [x] Buka https://search.google.com/search-console → **Add property** → **URL prefix**.
- [x] Isi `https://lktech.vercel.app`.
- [x] Verifikasi kepemilikan → pilih **HTML tag** → salin **nilai `content`** saja.
      → Tempel di `/admin/settings/seo` → field **"Google Search Console — verification"** → **Simpan**.
      *(TIDAK perlu ubah kode: `layout.tsx` menyuntik `<meta name="google-site-verification">` otomatis dari `seo.searchConsoleId`.)*
- [x] Setelah terverifikasi → menu **Sitemaps** → isi `sitemap.xml` → **Submit**.
- [x] Cek: `https://lktech.vercel.app/sitemap.xml` (harus valid).
- [ ] Pantau 2–4 minggu (menu **Pages** & **Performance**).

**Status:** ✅ Selesai (2026-10-14) — kepemilikan terverifikasi, sitemap tersubmit.
**Catatan:** TIDAK butuh perubahan kode (sudah ada field SEO di admin).
Tag live terverifikasi: `<meta name="google-site-verification" content="…">` tampil di homepage.

---

## M2 — Mayar: aktifkan mode produksi (uang asli)

**Guna:** invoice otomatis + pembayaran asli (saat ini masih SANDBOX).

- [ ] Daftar/login https://web.mayar.id → **verifikasi bisnis** (diproses Mayar).
- [ ] Setelah disetujui → https://web.mayar.id/api-keys → **Create API Key** → **Read & Write** → salin.
- [ ] Vercel → Settings → Environment Variables (**Production**):
      - [ ] `MAYAR_API_KEY` = key produksi
      - [ ] `MAYAR_MODE` = `production`
      - [ ] `MAYAR_WEBHOOK_TOKEN` = string acak (bila belum ada)
- [ ] **Redeploy** (Vercel → Deployments → Redeploy, atau push commit kosong).
- [ ] Mayar → **Integration → Webhook** → URL:
      `https://lktech.vercel.app/api/webhooks/mayar?token=<MAYAR_WEBHOOK_TOKEN>` → **Test URL** (harus SUCCESS).
- [ ] Uji: checkout 1 produk digital → bayar → cek `/admin/orders` jadi **Dibayar**.
- [ ] Cek diagnostik: `GET /api/health/payment` → `mayar.mode` = `production`.

**Status:** ⬜ Belum
**Catatan:** ⚠️ API key sandbox ≠ produksi (tak bisa tukar). Ganti domain Mayar = key lama mati.

---

## M3 — Domain sendiri + Resend terverifikasi

**Guna:** email transaksional ke SEMUA pembeli (kini hanya ke email terdaftar Resend — HTTP 403 untuk pembeli umum).

- [ ] Beli domain (mis. `lktech.id`) di registrar (Niagahoster / Cloudflare / Namecheap).
- [ ] Vercel → Project `lktech` → **Domains** → Add → ikuti record DNS.
- [ ] Vercel env: `SITE_URL` = `https://<domain>` → **Redeploy**.
- [ ] Resend → **Add Domain** → salin record **SPF/DKIM** ke DNS registrar → **Verify**.
- [ ] Vercel env: `EMAIL_FROM` = `LKTech <notifikasi@<domain>>` → **Redeploy**.
- [ ] Uji checkout → email "Pembayaran Diterima" masuk ke Gmail pembeli umum.
- [ ] (Opsional) Update GSC (M1) + canonical bila domain berubah.

**Status:** ⬜ Belum
**Catatan:** tidak ada perubahan kode. Rujukan: `docs/2026-10-06-setup-pembayaran-mayar.md` §8.

---

## M4 — Env opsional (fail-safe: kosong = nonaktif, bukan error)

Pilih sesuai kebutuhan. Isi → Vercel → **Redeploy**.

- [x] `NEXT_PUBLIC_GA_ID` — GA4 seluruh situs (`G-XXXXXXX`). ✅ Terpasang (2026-10-15) — `G-HQDT6937K4` live di homepage.
- [ ] `GSC_SERVICE_ACCOUNT` (JSON service account 1 baris) + `GSC_SITE_URL` — panel `/admin/seo`. ⏭️ Ditunda (butuh Google Cloud, menunggu kartu verifikasi).
- [x] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` - rate-limit lintas-instance (memperkuat anti-enumeration kupon KP-M4). ✅ Terpasang (2026-10-15).
- [ ] `BROADCAST_DAILY_QUOTA` - batas email broadcast per hari (zona Asia/Jakarta). Kosong/0 = nonaktif; bila diisi, pengiriman ditolak saat melewati batas dan Sentry menerima alarm di 80%.
- [ ] `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` - notifikasi WhatsApp (Meta Business).

**Status:** 🔄 Sebagian — GA4 ✅ + Upstash ✅ terpasang; GSC API ditunda; WhatsApp belum.
**Catatan:** daftar lengkap env + komentar ada di `.env.example`.

---

## M5 — Backfill agregat analitik 90 hari (sekali, opsional)

**Guna:** mengaktifkan jalur cepat `analytics_daily` untuk rentang 30/90 hari.
(Tanpa ini dashboard tetap **benar** via jalur LIVE, hanya sedikit lebih lambat.)

- [x] Jalankan sekali:

```powershell
$h = @{ Authorization = "Bearer <CRON_SECRET>" }
Invoke-RestMethod -Method POST -Headers $h "https://lktech.vercel.app/api/cron/analytics-daily?days=90"
```

- [x] Harapkan balasan `{"ok":true,"days":90,"written":90,...}`.

**Status:** ✅ Selesai (2026-10-14) — balasan `ok=True, days=90, written=90`.
**Catatan:** cron tiap jam (`cron.yml`) sudah otomatis mengisi 3 hari terakhir;
backfill ini hanya untuk riwayat lebih panjang.

---

## M6 — Firestore Rules republish (A4)

**Guna:** memastikan rules deny-all benar-benar aktif di produksi.
(Rules di repo sudah deny-all & benar; ini hanya verifikasi/re-publish.)

- [x] Buka Firebase Console → Firestore → **Rules** → pastikan `allow read, write: if false;` → **Publish**.
- [x] Verifikasi: `firestore.rules` di repo identik dengan yang tampil di Console.
- [ ] (Opsional) Cek **Indexes**: Firebase Console → Firestore → **Indexes** → pastikan 3 composite index dari `firestore.indexes.json` ada (atau `firebase deploy --only firestore:indexes`). Bila admin orders bisa filter status/tanggal tanpa error, index sudah ada.

**Status:** ✅ Selesai (2026-10-14) — rules deny-all terbaru dipublish.
**Catatan:** Rules cukup copy-paste + Publish (catch-all `match /{document=**}` menolak semua klien; koleksi baru otomatis ikut terlindungi — tak perlu rule terpisah).
Composite **indexes** terpisah dari rules (lihat langkah opsional di atas).

---

## Catatan tugas baru

> Tambahkan tugas manual baru di sini saat muncul (mis. butuh akun lain,
> pembelian, verifikasi pihak ketiga). Format: judul + langkah + status.

- (belum ada)

---

## Riwayat update

| Tanggal | Perubahan |
| --- | --- |
| 2026-10-14 | Dokumen dibuat. M1–M6 terdaftar, semua ⬜ Belum (M6 ditunda). |
| 2026-10-14 | **M5 ✅ Selesai** — backfill analitik 90 hari (`written=90`). |
| 2026-10-14 | **M1 ✅ Selesai** — GSC terverifikasi + sitemap tersubmit (via field admin, tanpa kode). |
| 2026-10-14 | **M6 ✅ Selesai** — Firestore Rules deny-all terbaru dipublish. |
| 2026-10-15 | **M4 🔄 Sebagian** — GA4 (`G-HQDT6937K4`) + Upstash terpasang; GSC API ditunda (butuh Google Cloud). |