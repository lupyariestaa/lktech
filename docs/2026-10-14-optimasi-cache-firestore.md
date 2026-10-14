# Optimasi Cache Firestore — Hemat Kuota Baca (unstable_cache + revalidateTag)

**Tanggal:** 2026-10-14 · **Status:** ✅ Selesai (kode) · **Kategori:** Performa / biaya

## 1. Ringkasan

Setelah perbaikan build `/admin` (lihat
[`2026-10-14-perbaikan-build-admin-prerender.md`](2026-10-14-perbaikan-build-admin-prerender.md)),
konsumsi kuota baca Firestore (Spark: 50K read/hari) masih **boros** karena
pembaca publik dipanggil berulang kali — terutama saat `next build` (≈72 halaman,
tiap halaman membaca `settings` + `content` + koleksi terkait) dan saat ISR
revalidate.

Optimasi ini menambahkan **lapisan cache data** (`unstable_cache`) untuk pembaca
**publik**, dengan invalidasi eksplisit (`revalidateTag`) dari setiap mutasi
dashboard agar data **tidak basi**.

> Proyek ini **tidak** memakai Cache Components (`cacheComponents` belum aktif),
> jadi jalur yang benar adalah model lama: `unstable_cache` + `revalidateTag`.
> Lihat `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`.

## 2. Akar masalah konsumsi kuota

- **Amplifikasi saat build.** Root layout memanggil `getSiteSettings()` +
  `getSiteContent()` di **setiap** halaman. React `cache()` hanya men-dedupe
  dalam **satu** render (satu halaman), bukan lintas-halaman → ±72×2 read per
  build hanya untuk dua dokumen ini. Ditambah koleksi `articles`/`products`/
  `projects`/`coupons` per halaman.
- **Amplifikasi saat runtime.** ISR merevalidasi halaman tiap 60–300 detik;
  tiap revalidasi mengulang pembacaan.
- **Deploy sering** = build sering = read menumpuk → kuota harian habis.

`unstable_cache` menyimpan hasil **lintas-request** di data cache Next, sehingga
dokumen `settings`/`content` dibaca **sekali** per build (bukan per halaman),
dan koleksi lain tidak dipindai berulang.

## 3. Keputusan desain

### 3a. `unstable_cache` untuk pembaca publik, reader terpisah untuk admin

Setiap modul dipisah menjadi:

- **`read*()`** — pembacaan MENTAH (tanpa cache), selalu segar.
- **`get*()` / `list*()`** — versi ber-`unstable_cache` (tag + TTL), untuk
  halaman publik.

Dashboard memakai reader **mentah** (mis. `readSiteSettings()`,
`readSiteContent()` di route GET admin) agar form admin selalu menampilkan data
terbaru — sesuai komentar lama "selalu `no-store`, bukan versi cache".

### 3b. Invalidasi WAJIB via `revalidateTag` (bukan hanya `revalidatePath`)

`revalidatePath` hanya menyegarkan **halaman** pada kunjungan berikutnya —
entri `unstable_cache` yang dipakai halaman lain **tetap basi**. Karena itu
setiap mutasi admin memanggil **keduanya**:

```ts
revalidateTag(CACHE_TAGS.products, REVALIDATE_NOW); // buang cache DATA
revalidatePath("/produk");                          // segarkan HALAMAN
```

### 3c. Next 16: `revalidateTag` dua argumen

`revalidateTag(tag)` satu-argumen sudah **DEPRECATED** di Next 16. Dari Route
Handler (bukan Server Action) gunakan `{ expire: 0 }` untuk invalidasi langsung
(dibungkus konstanta `REVALIDATE_NOW`).

### 3d. Tag terpusat

`src/lib/cache-tags.ts` menjadi **satu sumber kebenaran** tag
(`CACHE_TAGS.settings|content|articles|products|projects|promos`), plus
`REVALIDATE_NOW` dan `ALL_CACHE_TAGS`.

### 3e. Cache TTL singkat untuk analitik

`getSalesAnalytics()` (pemindaian `orders` relatif mahal, dipanggil berkali-kali
di dashboard) diberi **cache memori** TTL 120s + dedupe `inflight`, meniru pola
`getOrdersSummary`. Cache dibersihkan (`invalidateSalesAnalyticsCache()`)
setiap order dibuat/diubah/dihapus → aksi admin langsung tercermin.

### 3f. Yang SENGAJA tidak di-cache

- `getProductsBySlugs()` — verifikasi harga checkout **harus** selalu segar.
- `getStored*()` (artikel/produk/proyek untuk dashboard) — termasuk draft/nonaktif.
- `getProductBySlug()` — read 1 dokumen (murah); menghindari risiko produk
  nonaktif "keburu" tampil.

## 4. Alur implementasi

1. Tambah `src/lib/cache-tags.ts`.
2. Bungkus pembaca publik: `settings`, `site-content`, `articles`, `products`,
   `projects`, `promos` — pisahkan `read*()` mentah.
3. Tambah `readSiteSettings()`/`readSiteContent()` untuk route GET admin.
4. Tambah `revalidateTag` di semua route mutasi: settings, content, articles
   (POST/DELETE/bulk), products, projects, coupons, reviews (→ `products`),
   backup restore (→ semua tag), cron artikel terjadwal (→ `articles`), dan
   "bersihkan cache" (→ semua tag).
5. Cache TTL untuk `getSalesAnalytics` + invalidasi di `orders.ts`.
6. Guard regresi statis + wiring `package.json`/`tsconfig`/CI.

## 5. Daftar file

| File | Peran | Jenis |
| --- | --- | --- |
| `src/lib/cache-tags.ts` | Konstanta tag + `REVALIDATE_NOW` | baru |
| `src/lib/settings.ts` | `readSiteSettings()` (mentah) + `getSiteSettings` ber-cache | diubah |
| `src/lib/site-content.ts` | `readSiteContent()` (mentah) + `getSiteContent` ber-cache | diubah |
| `src/lib/articles.ts` | `readArticles()` + `getArticles` ber-cache | diubah |
| `src/lib/products.ts` | `readProducts()` + `getProducts` ber-cache | diubah |
| `src/lib/projects.ts` | `readProjects()` + `getProjects` ber-cache | diubah |
| `src/lib/promos.ts` | `readPublicPromos()` + `listPublicPromos` ber-cache | diubah |
| `src/lib/sales-analytics.ts` | Cache memori TTL + `invalidateSalesAnalyticsCache()` | diubah |
| `src/lib/orders.ts` | `invalidateOrderDerivedCaches()` (ringkasan + analitik) | diubah |
| `src/app/api/admin/{settings,content,articles,articles/bulk,products,projects,coupons,reviews,backup}/route.ts` | `revalidateTag` untuk tag terkait | diubah |
| `src/app/api/admin/settings/cache/route.ts` | Invalidasi semua tag + cache analitik | diubah |
| `src/app/api/cron/articles/route.ts` | `revalidateTag(articles)` saat artikel jatuh tempo | diubah |
| `scripts/cache-wiring.test.ts` | Guard regresi (statis) wiring cache | baru |
| `package.json` · `tsconfig.json` · `.github/workflows/ci.yml` | Skrip `test:cache-wiring` + wiring | diubah |

## 6. Verifikasi

- `npx tsc --noEmit` bersih · lint file terkait bersih ·
  `npm run test:cache-wiring` ✅ (4).
- `npm run build` **sukses** (uji dengan kredensial admin dikosongkan → 0 read
  Firestore; konten fallback ke default).
- Invalidasi diuji lewat guard: setiap route mutasi memanggil `revalidateTag`
  untuk tag yang tepat, dan semua `revalidateTag` dua-argumen.

## 7. Catatan operasional

- **Data basi maksimum** bila invalidasi terlewat: `settings`/`content` 5 menit,
  `products`/`promos` 2 menit, `articles`/`projects` 1 menit (TTL jaring pengaman).
- **Analitik admin** maksimum 2 menit (atau langsung segar setelah aksi order).
- Tetap disarankan naik ke **Blaze** (kuota gratis sama, tanpa hard-stop) agar
  lonjakan trafik/deploy tidak menghentikan data admin — optimasi ini menurunkan
  pemakaian, bukan menghapus batas.
