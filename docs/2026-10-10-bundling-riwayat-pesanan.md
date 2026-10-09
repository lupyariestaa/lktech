# Bundling dari Riwayat Pesanan — Planning & Task

> Status: **SELESAI (kode)**. Verifikasi browser manual tersisa (lihat bagian 7). Lanjutan FASE P3 (bundling & cross-sell).
> Tanggal: 2026-10-10. Basis: `docs/2026-10-06-fase-konversi-closing.md` (FASE P3) dan `docs/2026-10-06-roadmap-pengembangan.md` (1.2).

## 1. Latar belakang

FASE P3 sudah menyediakan:
- `relatedSlugs` (kurasi manual admin) → section "Sering dibeli bersama".
- Fallback **kategori sama** bila kurasi kurang dari limit.
- Kupon bundel (`appliesToSlugs`, `minItems`).

Celah yang tersisa (roadmap 1.2 — "sering dibeli bersama dari keranjang historis"):
rekomendasi **berbasis perilaku pembeli** belum ada. Fallback kategori tidak
mencerminkan produk yang benar-benar dibeli bersama.

## 2. Tujuan & ruang lingkup

**Tujuan:** menampilkan produk yang paling sering dibeli bersama (dari pesanan
nyata) sebagai rekomendasi, setelah kurasi manual.

**Dalam ruang lingkup:**
- Hitung pasangan produk dari pesanan dengan status `dibayar`, `diproses`, `selesai`.
- Urutan sumber rekomendasi di `getRelatedProducts`: **manual → riwayat → kategori**.
- Ambang minimum (jumlah pesanan bersama ≥ 2) agar tidak menampilkan data kecil.
- Cache memori singkat (pola P4) dan `revalidate` halaman.

**Di luar ruang lingkup:**
- Mengubah UI, endpoint, skema produk, atau aturan kupon.
- Paket bundle resmi (produk gabungan) — keputusan terpisah.
- Personalisasi per pengguna.

## 3. Keputusan desain

| # | Keputusan | Alasan |
| --- | --- | --- |
| K1 | Sumber: `orders.items[].slug` (sudah ada) | Tidak perlu skema baru |
| K2 | Status yang dihitung: `dibayar`, `diproses`, `selesai` | Bukti pembelian nyata; `dibatalkan`/`kedaluwarsa`/`menunggu_bayar` tidak dihitung |
| K3 | Pasangan dihitung per pesanan (set unik slug per order) | Satu pesanan dengan dua item sama tidak dihitung ganda |
| K4 | Ambang ≥ 2 pesanan bersama | Hindari rekomendasi dari satu kebetulan |
| K5 | Urutan: manual > riwayat > kategori | Kurasi admin tetap utama |
| K6 | Cache memori 10 menit, server-only | Pola P4; tidak memukul Firestore tiap request |
| K7 | Logika pemeringkatan murni (`rankCoPurchases`) | Bisa dites tanpa Firestore |

## 4. Rancangan

### 4.1 Logika murni — `src/lib/co-purchase.ts`
- `coPurchasePairs(orders: string[][])`: dari daftar slug per pesanan, hitung
  jumlah pesanan bersama untuk setiap produk pasangannya (set per pesanan).
- `rankCoPurchases(productSlug, pairs, minCount)`: kembalikan slug terurut
  menurun berdasarkan jumlah, hanya yang ≥ `minCount`, tanpa `productSlug` sendiri.

### 4.2 Data layer — `src/lib/co-purchase-server.ts` (`server-only`)
- `getCoPurchaseMap()`: baca `orders` dengan status valid (pakai `.select("items","status")`),
  bangun `Map<slug, Map<slug, count>>`, cache memori 10 menit.
- Best-effort: tanpa Admin SDK atau error → map kosong (fallback kategori tetap jalan).

### 4.3 Integrasi — `getRelatedProducts` (`src/lib/products.ts`)
- Tambah langkah 2 (riwayat) di antara manual dan kategori.
- Parameter baru opsional `coPurchase?: string[]` (slug hasil ranking) agar fungsi
  tetap murni & mudah dites; pemanggil yang menyediakan data (server page/route).

### 4.4 Pemanggil
- `src/app/produk/[slug]/page.tsx` dan `src/app/api/products/related/route.ts`
  mengambil ranking riwayat lalu meneruskannya.

## 5. Task

- [x] **BR-1** Logika murni `co-purchase.ts` (`coPurchasePairs`, `rankCoPurchases`) + test.
- [x] **BR-2** Data layer `co-purchase-server.ts` dengan cache & best-effort.
- [x] **BR-3** `getRelatedProducts` menerima `coPurchase` dan memakainya di antara manual dan kategori.
- [x] **BR-4** Pemanggil (halaman produk & endpoint related) meneruskan ranking riwayat.
- [x] **BR-5** Test regresi: urutan manual > riwayat > kategori, ambang, dan pesanan
      status tak valid diabaikan.
- [x] **BR-6** tsc, lint, test:blog/test lainnya, build hijau.

## 6. Definition of Done

1. Produk yang sering dibeli bersama (≥2 pesanan) muncul sebelum fallback kategori.
2. Kurasi manual tetap di posisi pertama.
3. Pesanan `dibatalkan`/`kedaluwarsa`/`menunggu_bayar` tidak dihitung.
4. Tanpa data riwayat, perilaku sama dengan sebelumnya (fallback kategori).
5. Tidak ada kebocoran data pelanggan: hanya slug produk yang diagregasi.
## 7. Catatan verifikasi & keterbatasan

- Ranking riwayat dibaca dari `orders` (status dibayar/diproses/selesai, 180 hari terakhir) dan di-cache 10 menit di memori proses. Pesanan baru baru terlihat setelah cache kedaluwarsa.
- Pemeriksaan `getRelatedProducts` dengan data Firestore nyata dan tampilan "Sering dibeli bersama" di browser belum dilakukan dari sesi ini.
- Logika ranking (`co-purchase.ts`) dan urutan seleksi (`product-related.ts`) teruji lewat `npm run test:blog` (174 test di seluruh modul blog dan produk terkait).
- Jika jumlah pesanan membesar, bisa ditambahkan index Firestore atau agregasi harian; belum diperlukan.