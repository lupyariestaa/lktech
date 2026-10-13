# E2E Playwright + CI (`P3`, B5)

> **Status:** ✅ Selesai (kode + CI).
> **Disusun:** 2026-10-13. **Basis:** `docs/2026-10-06-roadmap-pengembangan.md`
> §4.4 (`E2E Playwright — ditunda`).
> **Cakupan:** Smoke E2E halaman publik + aset/endpoint kunci, jalan di CI.
> **DI LUAR CAKUPAN:** uji alur ber-kredensial (checkout/login/admin) — butuh
> data & auth nyata (di luar smoke).

---

## 1. Ringkasan & Tujuan

CI sudah menjalankan `tsc + lint + unit test + build`. Yang belum ada: **verifikasi
runtime** bahwa build produksi benar-benar menyajikan halaman. E2E menutup celah
"build hijau tapi halaman 500".

**Prinsip:**
- **Sempit & deterministik:** hanya halaman publik tanpa auth → tak flaky.
- **Tanpa kredensial:** halaman publik fail-safe saat env kosong (data kosong,
  bukan error) — pola yang sama dengan build CI.
- **Server sendiri:** Playwright menjalankan `next start` (build sudah ada di CI).

## 2. Keputusan Desain

| # | Keputusan | Alasan | Alternatif ditolak |
| - | --- | --- | --- |
| K1 | **Uji `next start` produksi**, bukan `next dev` | Menangkap masalah build/hydration nyata; dev terlalu permisif | dev server (tak mewakili produksi) |
| K2 | **Hanya halaman publik** | Deterministik, tanpa seed/auth | alur checkout/admin (flaky, butuh data) |
| K3 | **`request` API untuk aset/health** | Cepat & stabil (tanpa render browser) | render tiap aset (lambat) |
| K4 | **Satu project `chromium`** | Cukup untuk smoke; hemat CI | 3 browser (lambat, tanpa nilai tambah di tahap ini) |
| K5 | **E2E di job CI yang sama** setelah build | Reuse `npm ci` + build yang sudah ada | job terpisah (install ulang) |

## 3. File

| File | Peran |
| --- | --- |
| `playwright.config.ts` | Konfigurasi; `webServer` = `next start` di port 3100 |
| `e2e/public-pages.spec.ts` | 11 uji halaman publik (200, `lang=id`, konten, 404) |
| `e2e/assets.spec.ts` | Manifest, `sw.js`, robots, sitemap, health, cron fail-closed |
| `.github/workflows/ci.yml` | Step E2E (install chromium + `npm run test:e2e`) |
| `package.json` | `test:e2e`, `test:e2e:ui` |

## 4. Operasional

```bash
npm run build            # E2E butuh build (config menjalankan next start)
npm run test:e2e         # jalankan smoke E2E lokal
npm run test:e2e:ui      # mode UI (debug)
```

- Bila server sudah jalan: `E2E_BASE_URL=https://... npm run test:e2e` (playwright
  tidak menaikkan `next start`).
- Port default 3100; override via `PORT`.

## 5. Verifikasi

- `npx playwright test` — **16 uji lulus** (lokal, Chromium).
- `node ./node_modules/typescript/bin/tsc --noEmit` — bersih.
- CI: step E2E jalan setelah build (install `chromium --with-deps`).