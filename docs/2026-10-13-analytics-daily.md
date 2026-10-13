# Agregasi Harian Analitik — `analytics_daily` (`AN-P3`, B4)

> **Status:** ✅ Selesai (kode).
> **Disusun:** 2026-10-13. **Basis:** `docs/2026-10-05-audit-email-kupon-analitik.md`
> `[AN-P3]` & `docs/2026-10-06-roadmap-pengembangan.md` §4.3.
> **Cakupan:** Materialisasi ringkasan harian `analytics_daily/{yyyy-mm-dd}` +
> jalur baca cepat (fallback otomatis ke perhitungan LIVE).
> **DI LUAR CAKUPAN:** backfill historis satu kali untuk seluruh riwayat (cukup
> jalankan `?days=N` manual bila perlu).

---

## 1. Ringkasan & Tujuan

Dashboard analitik (`getSalesAnalytics`) saat ini memindai koleksi `orders` pada
setiap permintaan (2× jendela, agar bisa membandingkan periode lalu). Pada volume
tinggi ini boros. `AN-P3` memindahkan beban itu ke **ringkasan harian** yang
dihitung sekali per hari (dan saat order berubah), lalu dibaca murah.

**Prinsip (mengikuti pola proyek):**
- **Kebenaran lebih dulu:** agregat HANYA dipakai bila **lengkap** untuk seluruh
  hari jendela. Bila ada hari hilang → fungsi mengembalikan `null` → jalur LIVE
  lama dipakai. **Angka tidak pernah "menebak".**
- **Fail-safe:** semua I/O agregat non-fatal (log + lanjut). Tanpa cron/DB,
  dashboard tetap benar (selalu LIVE).
- **Tanpa dependensi baru.**

## 2. Keputusan Desain

| # | Keputusan | Alasan | Alternatif ditolak |
| - | --- | --- | --- |
| K1 | **Dokumen per hari** `analytics_daily/{yyyy-mm-dd}` | Kunci deterministik → `getAll` tanpa indeks komposit; mudah diaudit | satu dokumen besar (hot-doc / limit 1 MiB) |
| K2 | **Simpan TOTAL per STATUS** (bukan per mode) | Mode `completed`/`all` dihitung saat baca, tanpa dua salinan | simpan dua salinan (boros + bisa drift) |
| K3 | **Snapshot produk per mode** (`productsCompleted`/`productsAll`) | Peringkat "Produk Terlaris" identik dengan jalur live | hitung ulang saat baca (tak mungkin tanpa scan) |
| K4 | **Baca hanya bila LENGKAP**, else LIVE | Menjamin metrik omzet/status tak pernah salah | pakai agregat parsial (angka meleset) |
| K5 | **Cron tiap jam** (`/api/cron/analytics-daily`) menimpa (idempoten) | Recompute = selalu sinkron; tak ada intermediate state rusak | increment delta (sulit idempoten) |
| K6 | **`dropDayAggregate` saat order berubah** | Hari yang terpengaruh dihitung ulang; sisanya tetap cepat | andalkan TTL saja (bisa basi ≤1 jam) |
| K7 | **Kill-switch `ANALYTICS_DAILY=off`** | Bisa paksa LIVE tanpa deploy | tanpa toggle (sulit rollback) |

## 3. Alur

```
order dibuat/ubah status ──► dropDayAggregate(hari)      (invalidate ringan)
cron tiap jam ────────────► backfillDailyAggregates(3)   (tulis ulang 3 hari)
GET /admin/analytics ─────► getSalesAnalytics
                              ├─ daily lengkap? → baca analytics_daily (CEPAT)
                              └─ ada hari hilang? → LIVE scan orders (BENAR)
```

Batas hari memakai zona `Asia/Jakarta` (`dayKeyInTz`) — sama dengan jalur live,
sehingga pengelompokan hari konsisten (hindari geser UTC vs WIB).

## 4. File

| File | Peran |
| --- | --- |
| `src/lib/analytics-daily-pure.ts` | Murni: `aggregateDay`, `mergeDailyAggregates` (teruji) |
| `src/lib/analytics-daily.ts` | Server: `backfillDailyAggregates`, `dropDayAggregate`, `loadExistingDocs`, `dayKeyInTz` |
| `src/app/api/cron/analytics-daily/route.ts` | Cron (fail-closed, `CRON_SECRET`) |
| `.github/workflows/cron.yml` | Jadwal `45 * * * *` (tiap jam) |
| `src/lib/sales-analytics.ts` | Jalur cepat `getSalesAnalyticsFastPath` + `buildAnalyticsResult` |
| `src/lib/orders.ts` | `invalidateAnalyticsForOrder` di titik mutasi |
| `scripts/analytics-daily.test.ts` | Uji murni (`npm run test:analytics-daily`) |

## 5. Operasional

- **Aktif default.** Tidak perlu env tambahan; cron mengisi agregat otomatis.
- **Backfill panjang** (mis. 90 hari pertama): panggil manual
  `POST /api/cron/analytics-daily?days=90` (Bearer `CRON_SECRET`).
- **Matikan** jalur cepat: set `ANALYTICS_DAILY=off` (Vercel env) → selalu LIVE.
- **Sampai cron pertama jalan**, dashboard memakai LIVE (tidak ada perubahan
  perilaku). Setelah agregat lengkap, pembacaan berpindah otomatis ke agregat.

## 6. Verifikasi

- `npm run test:analytics-daily` — 7 uji (agregasi per status/mode/varian, merge,
  batas 10 produk, null saat hari hilang).
- `node ./node_modules/typescript/bin/tsc --noEmit` — bersih.
- Build Next (`npm run build`) — rute `/api/cron/analytics-daily` ter-generate.