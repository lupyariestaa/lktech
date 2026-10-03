# DASHBOARD ANALITIK PENJUALAN — Grafik Omzet, Tren Pesanan & Produk Terlaris

> **Status dokumen:** ✅ **Dieksekusi** (FASE A0–A7 selesai)
> **Disusun:** 2026-10-05 · **Dieksekusi:** 2026-10-05
> **Cakupan:** Halaman analitik penjualan di dashboard admin — **grafik omzet & jumlah pesanan harian** (7/30/90 hari), **ringkasan periode** (omzet, jumlah order, rata-rata nilai order, tingkat penyelesaian), **produk terlaris** (per unit & per omzet), dan **metrik status**. Menyajikan data dari koleksi `orders` (+ `products`/`users` untuk konteks).
> **Tujuan:** Memberi pemilik **visibilitas tren bisnis** untuk keputusan berbasis data (kapan ramai, produk apa yang laku, pertumbuhan omzet) — melengkapi metrik ringkas yang sudah ada di Ringkasan.
> **Prasyarat baca:** `docs/2026-10-02-orders-admin-module.md` (model & modul order), `docs/2026-10-05-kupon-diskon.md` (diskon di order), `docs/2026-10-02-sidebar-dashboard-upgrade.md` (nav & shell), `docs/README.md`.
> **Verifikasi:** `npx tsc --noEmit` ✅ · `npx eslint .` ✅ · `npm run build` ✅ (68 halaman).

> **Status Eksekusi (A0–A7):** Seluruh fase **selesai**.
> File baru: `src/lib/sales-analytics-types.ts` (tipe/konstanta, aman-klien), `src/lib/sales-analytics.ts` (agregasi server-only), `src/lib/admin-analytics-api.ts`, `src/app/api/admin/analytics/route.ts`, `src/app/admin/(dashboard)/analytics/page.tsx`, `src/components/admin/analytics-dashboard.tsx`, `src/components/admin/sales-chart.tsx`.
> Diubah: `src/lib/admin-nav.ts` (menu "Analitik"), `src/components/admin/dashboard-overview.tsx` (tautan "Lihat analitik"), `src/lib/format.ts` (`formatCompactRupiah`).
> Temuan teratasi: AN-01..AN-08.
> **Catatan teknis:** tipe analitik dipisah ke `sales-analytics-types.ts` (tanpa `server-only`) karena dikonsumsi komponen klien — logika agregasi tetap server-only di `sales-analytics.ts`. Modul ini **berbeda** dari `@/lib/analytics` (pelacakan event Vercel Analytics).

---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Baseline — Data & Visual Saat Ini](#2-baseline--data--visual-saat-ini)
3. [Keputusan Desain](#3-keputusan-desain)
4. [Audit — Temuan & Celah](#4-audit--temuan--celah)
5. [Spesifikasi Target](#5-spesifikasi-target)
6. [Arsitektur & Implementasi](#6-arsitektur--implementasi)
7. [TASK IMPLEMENTATION FLOW (FASE A0–A7)](#7-task-implementation-flow-fase-a0a7)
8. [Definition of Done & Checklist QA](#8-definition-of-done--checklist-qa)
9. [Risiko & Mitigasi](#9-risiko--mitigasi)
10. [Out of Scope](#10-out-of-scope)
11. [Estimasi & Urutan Pengerjaan](#11-estimasi--urutan-pengerjaan)
12. [Lampiran — Referensi Pola Existing](#12-lampiran--referensi-pola-existing)

---

## 1. Ringkasan Eksekutif

Dashboard admin saat ini punya **metrik ringkas** (total pesanan, baru, diproses, omzet total; jumlah lead & user) dan **grafik tren lead 14 hari** (bar CSS murni). Namun **belum ada analitik penjualan**: tidak ada grafik omzet dari waktu ke waktu, tidak ada produk terlaris, tidak ada perbandingan periode.

**Rencana:** Membangun **halaman analitik penjualan** (`/admin/analytics` — atau tab/section di Ringkasan) yang menyajikan:
1. **Grafik omzet & jumlah pesanan harian** — periode **7 / 30 / 90 hari** (toggle), memakai bar/area chart CSS murni (tanpa dependensi baru, mengikuti pola `LeadTrendChart`).
2. **Kartu ringkasan periode** — omzet, jumlah order, rata-rata nilai order (AOV), tingkat penyelesaian (selesai/total).
3. **Produk terlaris** — top N berdasarkan unit terjual & omzet (nama produk, qty, omzet).
4. **Distribusi status pesanan** — jumlah & persentase per status.
5. (Opsional) **Produk/kupon paling berdampak** & ringkasan diskon yang diberikan.

**Prinsip:** **Reuse** pola grafik CSS murni (tanpa library chart), agregasi **server-authoritative** (data orders diambil & diagregasi di server, klien hanya menerima rangkaian terhitung), dan **aman** (semua via `requireAdmin`). **Tanpa dependensi baru.**

---

## 2. Baseline — Data & Visual Saat Ini

### 2.1 Data
- **`orders`** (`Order`): `id, uid, buyerName, buyerEmail, items[{slug,name,price,qty,subtotal,variantSlug?,variantName?}], subtotal, coupon?, total, status, whatsapp, message, createdAt`.
  - Status: `baru | diproses | selesai | dibatalkan`.
  - `total` = nilai akhir (setelah diskon); `subtotal` = sebelum diskon.
- **`products`** (`Product`): untuk memetakan slug → nama/kategori (kini nama sudah tersimpan di item order, jadi opsional).
- **`users`**: jumlah & pertumbuhan (sudah ada `UserSnapshot`).

### 2.2 Visual/komponen yang ada
- **`OrdersSummary`** (`getOrdersSummary`): total, baru, diproses, selesai, dibatalkan, omzet (`Σ total` status "selesai").
- **`UserSnapshot`** di Ringkasan: total/baru/sudah-belum pesan.
- **`LeadTrendChart`** (`dashboard-overview.tsx`): grafik bar CSS murni untuk tren lead 14 hari — **pola acuan**.
- **`OrderSnapshot`**: kartu metrik pesanan.
- Ringkasan (`/admin`) menyatukan semua ini.

### 2.3 Yang BELUM ada
- Grafik omzet/tren pesanan.
- Pilihan rentang periode.
- Produk terlaris.
- Rata-rata nilai order (AOV) & tingkat penyelesaian.
- Halaman/section analitik khusus.

---

## 3. Keputusan Desain

| # | Keputusan | Alasan |
|---|---|---|
| A1 | **Grafik CSS murni** (bar/area via `div`), **tanpa** library chart | Konsisten dgn `LeadTrendChart`; tanpa dependensi baru |
| A2 | **Rentang periode** 7 / 30 / 90 hari (toggle) | Umum & cukup |
| A3 | **Agregasi di server** (`getSalesAnalytics(days)`), klien terima rangkaian siap-tampil | Berat & keamanan; hindari kirim seluruh order ke klien |
| A4 | **Omzet = Σ `total`** pesanan **berstatus "selesai"** (default) — **plus** opsi "semua status" | Konsisten dgn omzet existing; fleksibel |
| A5 | Ketepatan hari: **berbasis waktu lokal** (seperti tren lead) | Konsistensi dgn pola existing |
| A6 | **Produk terlaris** dari `items` (agregasi slug/varian), Top 5–10 | Insight jualan utama |
| A7 | **Tidak** menghitung omzet dari order `dibatalkan` (dikecualikan dari total, tetap dihitung di distribusi) | Kewajaran angka |
| A8 | **Satu endpoint** `/api/admin/analytics?days=30&include=all|completed` | Sederhana & cache-friendly (no-store) |
| A9 | Penempatan: **halaman sendiri `/admin/analytics`** + tautan dari Ringkasan | Ruang cukup; navigasi jelas |
| A10 | **Tanpa** ekspor (v1) — bisa menyusul | Menjaga fokus |

> **Catatan A4:** default omzet memakai status "selesai" (mengikuti `getOrdersSummary`). Sediakan toggle "Semua status" agar admin bisa melihat order masuk walau belum selesai.

---

## 4. Audit — Temuan & Celah

Format: **[AN-xx] Judul** — *Severity* — Lokasi — Dampak — Rekomendasi.

**[AN-01] Tidak ada grafik omzet/tren pesanan** — 🔴 Tinggi — Ringkasan hanya angka ringkas. — Sulit melihat pertumbuhan. — **Rekomendasi:** grafik omzet & order harian.

**[AN-02] Tidak ada pilihan periode** — 🟠 Menengah. — Analisis terbatas. — **Rekomendasi:** toggle 7/30/90 hari.

**[AN-03] Tidak ada produk terlaris** — 🟠 Menengah — data item order tak diringkas. — Tak tahu produk laku. — **Rekomendasi:** agregasi Top N.

**[AN-04] Tidak ada AOV & tingkat penyelesaian** — 🟠 Menengah. — Metrik bisnis penting hilang. — **Rekomendasi:** tambahkan ke ringkasan.

**[AN-05] Distribusi status tak divisualkan** — 🔵 Rendah — hanya angka di `OrderSnapshot`. — **Rekomendasi:** bar/komposisi status.

**[AN-06] Belum ada halaman/section analitik khusus** — 🟠 Menengah — Ringkasan tercampur (lead/user/order). — **Rekomendasi:** halaman `/admin/analytics`.

**[AN-07] Agregasi berpotensi berat bila order banyak** — 🟠 Menengah. — Payload/latensi. — **Rekomendasi:** agregasi server + batas jendela; pertimbangkan `select()` field minimal.

**[AN-08] Zona waktu konsistensi** — 🔵 Rendah — bisa beda hari. — **Rekomendasi:** pakai waktu lokal server (konsisten pola existing) + dokumentasi.

### 4.4 Ringkasan temuan

| ID | Temuan | Severity | Fase |
|---|---|---|---|
| AN-01 | Tak ada grafik omzet/tren | 🔴 | A3 |
| AN-03 | Tak ada produk terlaris | 🟠 | A4 |
| AN-06 | Tak ada halaman analitik | 🟠 | A2 |
| AN-02 | Tak ada periode | 🟠 | A3 |
| AN-04 | Tak ada AOV/penyelesaian | 🟠 | A3 |
| AN-07 | Agregasi berat | 🟠 | A1 |
| AN-05/08 | Minor | 🔵 | A4 |

---

## 5. Spesifikasi Target

### 5.1 Halaman `/admin/analytics`

```
┌───────────────────────────────────────────────────────────┐
│ H1: Analitik Penjualan            [7 hari | 30 hari | 90 hari] │
├───────────────────────────────────────────────────────────┤
│ [Omzet Periode] [Jumlah Pesanan] [Rata-rata Order] [Selesai] │  ← kartu ringkasan
├───────────────────────────────────────────────────────────┤
│ GRAFIK OMZET HARIAN (bar/area, sumbu label, tooltip)       │
├───────────────────────────────────────────────────────────┤
│ GRAFIK JUMLAH PESANAN HARIAN                               │
├───────────────────────────────────────────────────────────┤
│ PRODUK TERLARIS (tabel: produk | unit | omzet)             │
│ DISTRIBUSI STATUS (bar komposisi)                          │
└───────────────────────────────────────────────────────────┘
```

### 5.2 Data yang dihitung (server) untuk `days`
- `series`: array harian `{ dateISO, omzet, orders }` (panjang = `days`).
- `totals`: `{ omzet, orders, aov, completed, cancelled, completionRate }`.
- `topProducts`: `[{ name, slug, units, omzet }]` (Top 5–10).
- `statusBreakdown`: `{ baru, diproses, selesai, dibatalkan }` (+ persen).

### 5.3 Toggle & opsi
- Periode: **7 / 30 / 90** hari.
- Sumber omzet: **Selesai** (default) / **Semua status** (toggle kecil).

### 5.4 Navigasi
- Item sidebar baru **"Analitik"** (grup "Toko" atau grup baru "Laporan").
- Tautan "Lihat analitik lengkap" dari `OrderSnapshot`/Ringkasan.

---

## 6. Arsitektur & Implementasi

### 6.1 Data layer `src/lib/analytics.ts` (server-only)
```ts
export type SalesPoint = { dateISO: string; label: string; full: string; omzet: number; orders: number };
export type SalesAnalytics = {
  days: number;
  mode: "completed" | "all";
  series: SalesPoint[];
  totals: {
    omzet: number; orders: number; aov: number;
    completed: number; cancelled: number; completionRate: number; // 0..1
  };
  statusBreakdown: Record<OrderStatus, number>;
  topProducts: { slug: string; name: string; units: number; omzet: number }[];
};

export async function getSalesAnalytics(opts?: {
  days?: number;
  mode?: "completed" | "all";
}): Promise<SalesAnalytics>;
```
- Ambil order dalam jendela (`createdAtISO >= cutoff`) — **tanpa** composite index (filter di memori bila perlu; atau `where("createdAtISO", ">=", cutoff)` single-field).
- Bangun seri harian (pola `buildTrend`), agregasi produk dari `items`, distribusi status.
- `omzet` default hanya status `selesai`; `mode: all` menghitung semua kecuali `dibatalkan` (dapat dinyatakan sebagai keputusan; lihat A7).

### 6.2 API `src/app/api/admin/analytics/route.ts`
- `GET ?days=30&mode=completed|all` → `{ analytics }` (`requireAdmin`, `no-store`).
- Validasi `days ∈ {7,30,90}` (clamp).

### 6.3 UI
- `src/app/admin/(dashboard)/analytics/page.tsx` — halaman + metadata.
- `src/components/admin/analytics-dashboard.tsx` — komponen utama (toggle periode, kartu, grafik, produk, status).
- `src/components/admin/sales-chart.tsx` — grafik CSS murni (bar/area) reusable (omzet & order), terinspirasi `LeadTrendChart`.
- `src/lib/admin-analytics-api.ts` — klien `adminFetch` (`fetchSalesAnalytics`).

### 6.4 File BARU/DIUBAH

**Baru:**
| File | Peran |
|---|---|
| `src/lib/analytics.ts` | Agregasi penjualan (server-only) |
| `src/lib/admin-analytics-api.ts` | Klien fetch analitik |
| `src/app/api/admin/analytics/route.ts` | Endpoint analitik |
| `src/app/admin/(dashboard)/analytics/page.tsx` | Halaman analitik |
| `src/components/admin/analytics-dashboard.tsx` | Komponen utama |
| `src/components/admin/sales-chart.tsx` | Grafik CSS murni (omzet/order) |

**Diubah:**
| File | Perubahan |
|---|---|
| `src/lib/admin-nav.ts` | Item menu "Analitik" |
| `src/components/admin/dashboard-overview.tsx` | Tautan "Lihat analitik lengkap" dari `OrderSnapshot` |
| `src/lib/format.ts` | (Opsional) helper `formatCompactRupiah` (mis. "Rp1,2 jt") untuk label grafik |
| `docs/README.md`, `TASK-SELANJUTNYA.md` | Dokumentasi |

---

## 7. TASK IMPLEMENTATION FLOW (FASE A0–A7)

### FASE A0 — Persiapan & baseline (±20 menit)
- [ ] Baca dokumen ini + `orders-admin-module.md` + pola `LeadTrendChart`.
- [ ] Baseline: `tsc`/`lint`/`build` bersih.

### FASE A1 — Data layer agregasi (±2.5 jam)
- [ ] `src/lib/analytics.ts`: `getSalesAnalytics({days, mode})` — seri harian, totals, AOV, completion, status, top produk.
- [ ] Uji kasus: order di luar jendela tak dihitung; status dibatalkan dikecualikan dari omzet; AOV = omzet/orders (hindari ÷0).
- **DoD:** fungsi mengembalikan angka akurat.

### FASE A2 — API + klien (±1 jam)
- [ ] `api/admin/analytics/route.ts` (validasi days/mode, `requireAdmin`).
- [ ] `admin-analytics-api.ts` (`fetchSalesAnalytics`).
- **DoD:** endpoint & klien berfungsi.

### FASE A3 — Halaman + kartu ringkasan (±2 jam)
- [ ] `analytics/page.tsx` + `analytics-dashboard.tsx`: toggle periode (7/30/90), kartu (omzet, order, AOV, tingkat selesai).
- **DoD:** data tampil; toggle memuat ulang.

### FASE A4 — Grafik omzet & pesanan (±2 jam)
- [ ] `sales-chart.tsx` — grafik bar/area CSS murni + label sumbu + tooltip + a11y (`role="img"`, `aria-label`).
- [ ] Pasang grafik omzet & grafik jumlah order.
- **DoD:** grafik rapi, responsif, terbaca; empty state jelas.

### FASE A5 — Produk terlaris & distribusi status (±1.5 jam)
- [ ] Tabel/list produk terlaris (unit & omzet).
- [ ] Bar komposisi status.
- **DoD:** insight tampil benar.

### FASE A6 — Navigasi & polish (±1 jam)
- [ ] Menu "Analitik" di nav; tautan dari Ringkasan.
- [ ] a11y, empty/loading/error state konsisten, responsif mobile.
- **DoD:** navigasi mulus.

### FASE A7 — QA, dokumentasi, deploy
- [ ] `tsc`/`lint`/`build` bersih.
- [ ] Checklist QA §8.
- [ ] Dokumentasi: status → ✅ + update `docs/README.md` & `TASK-SELANJUTNYA.md`.
- [ ] Commit per fase → push → uji produksi.

---

## 8. Definition of Done & Checklist QA

### 8.1 DoD global
1. `tsc` bersih, `build` sukses, `lint` bersih.
2. Tidak ada regresi: Ringkasan, orders, kupon, email, produk.
3. Agregasi di server; klien tidak menerima seluruh order.

### 8.2 Halaman analitik
- [ ] Menu "Analitik" & halaman `/admin/analytics` berfungsi.
- [ ] Toggle periode 7/30/90 memuat ulang data.
- [ ] Kartu ringkasan: omzet, jumlah order, AOV, tingkat selesai.
- [ ] Grafik omzet harian & grafik jumlah pesanan (tooltip + label).
- [ ] Produk terlaris (unit & omzet).
- [ ] Distribusi status.
- [ ] Responsif mobile; a11y grafik (`role="img"` + `aria-label`); empty state.

### 8.3 Kebenaran data
- [ ] Order di luar jendela tidak dihitung.
- [ ] Order `dibatalkan` dikecualikan dari omzet.
- [ ] AOV & completion dihitung benar (tanpa ÷0).
- [ ] Total omzet konsisten dengan `getOrdersSummary` untuk mode default.

### 8.4 Regresi
- [ ] Ringkasan (`/admin`) tetap normal (lead/user/order).
- [ ] Tidak ada perubahan pada alur order/kupon.
- [ ] Navigasi admin & command palette memuat menu baru.

---

## 9. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Agregasi berat saat order banyak | Sedang | Agregasi server + jendela terbatas + `select()` field minimal; cache singkat |
| R2 | Composite index Firestore | Sedang | `where(createdAtISO >= cutoff)` (single-field, otomatis terindeks); hindari kombinasi orderBy |
| R3 | Zona waktu beda hari | Rendah | Waktu lokal server (pola existing) + dokumentasi |
| R4 | Angka omzet berbeda dgn ekspektasi (status) | Sedang | Jelaskan default "selesai" + toggle "semua status" |
| R5 | Grafik tak terbaca di mobile | Sedang | Bar responsif; label dipendekkan; scroll-x bila perlu |
| R6 | Order tanpa `createdAtISO` (data lama) | Rendah | Lewati/fallback di agregasi |
| R7 | Payload besar (top produk) | Rendah | Batasi Top 10 |

---

## 10. Out of Scope

- **Ekspor laporan** (CSV/PDF) — kandidat lanjutan.
- **Perbandingan periode** (mis. bulan ini vs lalu) — kandidat lanjutan.
- **Analitik kanal/traffic** (butuh sumber eksternal, mis. Vercel Analytics) — terpisah.
- **Analitik kupon mendalam** (meski data tersedia) — sesi lanjutan.
- **Grafik realtime/live**.
- **Prediktif/forecast**.
- **Multi-user role** (laporan per-admin).

---

## 11. Estimasi & Urutan Pengerjaan

| Fase | Isi | Estimasi* | Nilai |
|---|---|---|---|
| A0 | Persiapan | 20 mnt | — |
| A1 | Data layer agregasi | 2.5 jam | 🔴 Fondasi |
| A2 | API + klien | 1 jam | Fondasi |
| A3 | Halaman + kartu | 2 jam | 🔴 |
| A4 | Grafik omzet & pesanan | 2 jam | 🔴 Inti |
| A5 | Produk terlaris & status | 1.5 jam | 🟠 |
| A6 | Navigasi & polish | 1 jam | 🟠 |
| A7 | QA & deploy | 1 jam | Wajib |

**Total inti (A0–A7):** ± 11–12 jam terfokus (± 1–1.5 sesi).

**Urutan:** A1 (data) → A2 (API) → A3 (halaman) → A4 (grafik) → A5 (produk/status) → A6 → A7.

> **Bila 1 sesi:** A1–A4 (agregasi + halaman + grafik omzet/tren) sudah memberi nilai inti. A5 menyusul.

---

## 12. Lampiran — Referensi Pola Existing

| Kebutuhan | Referensi existing |
|---|---|
| Grafik bar CSS murni + a11y | `LeadTrendChart` (`src/components/admin/dashboard-overview.tsx`) |
| Agregasi & ringkasan order | `src/lib/orders.ts` (`getOrdersSummary`, `normalizeOrder`) |
| Model order & item | `src/lib/order-types.ts` |
| Klien & API admin | `src/lib/admin-orders-api.ts`, `src/app/api/admin/orders/route.ts` |
| Guard & klien fetch | `src/lib/admin-guard.ts` (`requireAdmin`), `src/lib/admin-fetch.ts` |
| Nav admin | `src/lib/admin-nav.ts` |
| Format Rupiah/tanggal | `src/lib/format.ts` (`formatRupiah`, `formatDateTime`) |
| Kartu metrik (pola) | `OrderSnapshot`, `UserSnapshot` (`dashboard-overview.tsx`) |
| Hook async list | `src/components/admin/use-async-list.ts` |
| Halaman admin (pola) | `src/app/admin/(dashboard)/orders/page.tsx`, `users/page.tsx` |

---

## CATATAN PENUTUP

Inti pengembangan ini: memberi **pandangan analitik penjualan** yang jelas — grafik omzet & tren pesanan (7/30/90 hari), produk terlaris, distribusi status, dan metrik periode — dengan **grafik CSS murni** (tanpa dependensi) dan **agregasi server-authoritative**.

**Prioritas eksekusi:** A1 (data) → A2 (API) → A3 (halaman) → A4 (grafik) → A5 (produk/status) → A6 → A7.

> Setelah dieksekusi: ubah status di header + tambah bagian "Status Eksekusi", dan catat temuan baru sebagai `AN-09+` bila ada.
