# Perbaikan Build Gagal — `/admin` Ter-prerender + Query Firestore Tanpa Pengaman

**Tanggal:** 2026-10-14 · **Status:** ✅ Selesai (kode) · **Kategori:** Bug build / deploy

## 1. Ringkasan

Deploy ke Vercel **gagal** dengan error `8 RESOURCE_EXHAUSTED: Quota exceeded`
saat build. Akar masalahnya **dua**, bukan satu:

1. **`/admin` ikut di-prerender saat build.** Dashboard yang seharusnya
   auth-gated per-request justru dicoba dijadikan halaman **statis** oleh
   Next.js. Saat build, Next menjalankan komponen server `/admin` — termasuk
   `BusinessHealth` yang membaca Firestore.
2. **`getSalesAnalytics()` membaca Firestore TANPA pengaman.** Ini
   **satu-satunya** pembacaan Firestore di `src/lib` yang tidak dibungkus
   `try/catch`. Modul lain (`settings.ts`, `site-content.ts`, `articles.ts`,
   `analytics-daily.ts`) semua menangkap error → fallback ke nilai default.
   Karena tak ditangkap, error kuota menjatuhkan proses build.

Gejala di log:

```
Error occurred prerendering page "/admin"
Error: 8 RESOURCE_EXHAUSTED: Quota exceeded.
    at q (src/lib/sales-analytics.ts:250:6)
    at async u (src/components/admin/business-health.tsx:61:21)
Export encountered an error on /admin/(dashboard)/page: /admin, exiting the build.
```

## 2. Analisis akar masalah

### 2a. Kenapa `/admin` ter-prerender?

Rute `/admin` tidak mendeklarasikan `dynamic`. Layout `(dashboard)` memakai
`cookies()` (via `AdminServerGuard`) — **tapi pada Next.js 16 `cookies()`
sendiri tidak lagi otomatis membatalkan prerender** untuk tujuan ini, sehingga
Next tetap mencoba menstatiskan halaman. Selama kuota Firestore masih ada,
prerender "kebetulan" berhasil sehingga cacat ini lama tak terlihat. Begitu
kuota habis (atau jaringan/permission bermasalah), build **langsung jatuh**.

Bukti tambahan: halaman admin lain yang memang dinamis (`orders/[id]`,
`coupons/[id]`, `coupons/[id]/edit`) sudah memakai `export const dynamic =
"force-dynamic"`, sedangkan **index `/admin` luput**.

### 2b. Kenapa error Firestore menjatuhkan build?

`getSalesAnalytics()` (dipakai `BusinessHealth`, server component di `/admin`)
memanggil:

```ts
const snap = await db.collection("orders")....get();  // ← tanpa try/catch
```

Bila Admin SDK tersedia (`db != null`) tetapi pembacaan gagal, error dilempar
ke atas → gagal prerender → build exit code 1.

## 3. Perbaikan

### 3a. Paksa area dashboard dinamis

`src/app/admin/(dashboard)/layout.tsx`:

```ts
/**
 * Seluruh area dashboard WAJIB dinamis: bergantung pada cookie sesi admin &
 * data Firestore per-request. Tanpa ini, Next.js mencoba MENSTATISKAN `/admin`
 * saat build — menjalankan query Firestore di waktu build ... yang bisa gagal
 * (kuota/network) dan MENJATUHKAN build.
 */
export const dynamic = "force-dynamic";
```

Efek: build **tidak lagi** merender `/admin` (dan seluruh sub-halaman
dashboard) saat build; halaman dirender per-request setelah auth lolos.

### 3b. Bikin `getSalesAnalytics` fail-safe

`src/lib/sales-analytics.ts`:

- Tambah helper `buildEmptyAnalytics(days, mode)` (keluaran angka-nol, struktur
  tetap valid) — menggantikan objek kosong yang tadinya ditulis inline untuk
  kasus `db == null`.
- Bungkus query `orders` dengan `try/catch`; saat gagal → `console.error` lalu
  `return buildEmptyAnalytics(...)`.

Dengan ini, kegagalan Firestore (kuota, jaringan, izin) **tidak pernah**
menjatuhkan pemanggil — halaman tetap ter-render dengan angka nol, sama seperti
perilaku modul lain (`settings`, `site-content`, `articles`).

> Jalur cepat agregasi harian (`getSalesAnalyticsFastPath` → `loadExistingDocs`)
> sudah aman: `analytics-daily.ts` menangkap error di dalamnya.

## 4. Daftar file

| File | Peran | Jenis |
| --- | --- | --- |
| `src/app/admin/(dashboard)/layout.tsx` | `export const dynamic = "force-dynamic"` untuk seluruh dashboard | diubah |
| `src/lib/sales-analytics.ts` | `buildEmptyAnalytics()` + `try/catch` pada query `orders` | diubah |
| `scripts/admin-dashboard-dynamic.test.ts` | Guard regresi (statis): pastikan `force-dynamic` ada & query `orders` fail-safe | baru |
| `package.json` | Skrip `test:admin-dynamic` | diubah |
| `tsconfig.json` | Kecualikan guard test dari typecheck app | diubah |
| `.github/workflows/ci.yml` | Jalankan `test:admin-dynamic` | diubah |

## 5. Verifikasi

- `npm run build` **berhasil** meski kuota Firestore habis (error tercatat di
  log sebagai `[sales-analytics] gagal memuat pesanan: ...` tetapi **tidak**
  menjatuhkan build).
- `/admin` kini muncul sebagai **ƒ (Dynamic)** di tabel rute build — **bukan**
  static; tak ada lagi `Error occurred prerendering page "/admin"`.
- `npx tsc --noEmit` bersih · `npm run lint` bersih ·
  `npm run test:admin-dynamic` ✅ (2).
- **Guard regresi:** `scripts/admin-dashboard-dynamic.test.ts` mencegah
  `force-dynamic` terhapus diam-diam & memastikan query `orders` tetap
  dibungkus `try/catch`.

## 6. Catatan operasional

- Perbaikan ini bersifat **defensif permanen**: apa pun kondisi Firestore saat
  build/deploy (kuota habis, kredensial berubah, gangguan jaringan), build tidak
  akan jatuh karenanya.
- Kuota Firestore yang habis tetap perlu ditangani dari sisi operasional
  (naikkan kuota / tunggu reset harian) agar data admin benar-benar tampil —
  tetapi hal itu **tidak lagi memblokir deploy**.
