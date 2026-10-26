# Checklist Verifikasi Manual — SEO (AUD-02…AUD-10) & Section Statistik (S1–S4)

> **Status:** 🔄 Aktif — untuk pemilik (uji browser/staging).
> **Dibuat:** 2026-10-26.
> **Konteks:** perubahan kode sudah di-commit & di-push (`6f5f7ea` SEO, `4fa882e` statistik).
> Dokumen ini **bukan** pengganti E2E terautentikasi; ia memandu uji manual yang tidak
> dapat dijalankan otomatis tanpa kredensial/browser produksi.
>
> Cara pakai: kerjakan tiap butir, centang `[x]`, catat temuan di kolom Catatan.

---

## A. Panel SEO — Status & observabilitas (AUD-03)

Halaman: `/admin/seo` → section **"Status & observabilitas"**.

- [ ] Panel termuat tanpa galat (ikon putar sebentar lalu tabel muncul).
- [ ] Tombol **muat ulang** (ikon ↻) menyegarkan angka.
- [ ] Bila belum ada pemanggilan provider: muncul teks "Belum ada pemanggilan provider yang tercatat di proses ini." (bukan tabel kosong).
- [ ] Setelah membuka GSC/audit/GA4: baris provider muncul dengan **Sukses**, **Gagal**, **Kode error**, **Kuota**, **Latency (avg · max)**, **Terakhir**.
- [ ] Catatan "per-proses (in-memory)" terbaca (bukan dikira monitoring produksi).

## B. Kill switch fitur SEO (AUD-10)

- [ ] Set `SEO_DISABLED_FEATURES=ga4` di env (lokal) → buka `/admin/seo`:
      panel GA4 **tidak** dirender, diganti pemberitahuan "…dinonaktifkan sementara".
- [ ] Hilangkan `ga4` dari env → panel GA4 kembali muncul (redeploy/restart).
- [ ] `GET /api/admin/seo/ga4` (saat `ga4` nonaktif) mengembalikan **503** `seo_feature_disabled` (bukan crash).
- [ ] Chip status di panel observabilitas menampilkan `ga4: nonaktif` (amber) / `aktif` (hijau).

## C. GA4 — validasi parameter & laporan (AUD-04/05/06)

- [ ] `GET /api/admin/seo/ga4?days=28` → laporan normal.
- [ ] `GET /api/admin/seo/ga4?evil=1` → **400** "Parameter tidak dikenal."
- [ ] `GET /api/admin/seo/ga4?days=7&days=28` → **400** "Parameter ganda tidak diizinkan."
- [ ] `GET /api/admin/seo/ga4?startDate=2026-13-01&endDate=2026-13-09` → **400** (rentang tak sah).
- [ ] Saat sebagian query gagal: status **partial** + daftar section tak tersedia (bukan "no_data" menyesatkan).
- [ ] Tanpa env GA4: status **not_configured** + panduan (bukan galat).
- [ ] **Tidak ada** query URL/token/secret yang tampil di UI maupun log.

## D. Retensi audit SEO (AUD-07/08)

- [ ] Jalankan audit teknis > 10 kali dari `/admin/seo`.
- [ ] Di `/admin/seo`, riwayat audit hanya menyisakan **10 run terakhir** (yang lama terhapus).
- [ ] Respons audit **tidak** terasa menunggu proses pembersihan (pemangkasan dijalankan setelah respons).
- [ ] Log server memuat peringatan aman bila pemangkasan mencapai batas putaran (tanpa data sensitif).

## E. `.env.example` (AUD-09)

- [ ] Buka `.env.example` di editor: tidak ada karakter pengganti `�` (U+FFFD).
- [ ] Komentar env SEO (`SEO_DISABLED_FEATURES`, `GA4_*`, `GSC_*`) terbaca wajar.

---

## F. Section Statistik — tampilan publik (S1–S3)

- [ ] Beranda: section statistik tampil sesuai aturan — mode ketat aktif **hanya** bila ada item `verified: true`.
- [ ] Bila belum ada item terverifikasi: data lama tetap tayang (backward-compatible).
- [ ] Angka memakai **pemisah ribuan** gaya Indonesia (mis. `1.000`, `10.000`).
- [ ] Tombol **sorotan** (`featured`) memilih satu item untuk trust bar hero; tidak ada yang ganda.
- [ ] Caption **periode** (`statsAsOf`) tampil bila diisi.
- [ ] Grid rapi untuk 3–8 item (desktop & mobile), tanpa overflow horizontal.

## G. Section Statistik — aksesibilitas (S3)

- [ ] Pembaca layar (NVDA/VoiceOver) membacakan judul section & tiap angka secara bermakna (`aria-labelledby`, teks `sr-only`).
- [ ] Urutan fokus logis; kontras teks lolos AA.
- [ ] `prefers-reduced-motion`: animasi count-up tidak mengganggu (atau dimatikan).

## H. Section Statistik — editor & angka turunan (S4)

Editor: `/admin/content` → tab **Statistik**.

- [ ] Dropdown **"Sumber angka"** per item: **Manual**, atau **Turunan — Proyek/Layanan/Kota**.
- [ ] Pilih "Turunan — Proyek": label & sufiks terisi default bila kosong.
- [ ] Tombol **"Sinkronkan angka turunan"** aktif hanya bila ada ≥1 item turunan; saat diproses ikon putar tampil.
- [ ] Setelah sinkron: nilai item turunan berubah sesuai jumlah nyata (proyek/layanan/kota); muncul keterangan waktu sinkron.
- [ ] Item **manual** (mis. "Klien Puas") **tidak berubah** saat sinkron.
- [ ] **Simpan** menerapkan perubahan; muat ulang halaman mempertahankan nilai.
- [ ] `GET /api/admin/stats/derived` (tanpa token) → **401/403**; (admin) → `{ counts, asOf }`.
- [ ] Tidak ada cara menjadikan "Klien Puas"/klaim sosial sebagai turunan (tidak ada di dropdown).

## I. Regresi cepat (kode, opsional)

- [ ] `npm run test:stats` — 18/18.
- [ ] `npm run test:seo-endpoints` — 9/9.
- [ ] `npm run test:seo-ops` — 5/5.
- [ ] `npm run test:unit` — 799/799.
- [ ] `npx tsc --noEmit` bersih.

---

## Catatan temuan

| Tanggal | Bagian | Temuan | Tindak lanjut |
| --- | --- | --- | --- |
|  |  |  |  |
