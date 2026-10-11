# Task Eksekusi — Upgrade Dashboard "Kelola Pesanan" (`/admin/orders`)

> **Status: ✅ SELESAI (kode) — fase O0–O8 (2026-10-11).**
> Dokumen ini adalah **task eksekusi implementasi** (flow fase O0–O8). Pemilik
> sudah **approve** arah pengembangan.
>
> **Turunan dari:** [`2026-10-11-rekomendasi-upgrade-dashboard-pesanan.md`](2026-10-11-rekomendasi-upgrade-dashboard-pesanan.md) (rekomendasi).
> **Prasyarat:** audit sistem pesanan selesai — [`2026-10-11-audit-sistem-pesanan.md`](2026-10-11-audit-sistem-pesanan.md) (Batch 1–4 ✅).
> **Tema roadmap:** Operasional & Kualitas (dashboard).
> **Disusun:** 2026-10-11. **Target:** sesi berikutnya.

---

## 0. Ringkasan & Tujuan

Upgrade menu **`/admin/orders`** dari daftar kartu polos menjadi **pusat operasi
pesanan yang proper**: pencarian & filter cepat, aksi massal, halaman detail
dengan timeline, dan panel "butuh perhatian".

**Prinsip (wajib):**
- **Dokumentasi dulu → kode.** Setiap fase ditutup gate: `npx tsc --noEmit` ·
  `npx eslint .` · semua `test:*` · `npm run build`.
- **Server-authoritative:** filter/sort/pencarian & aksi divalidasi server (`requireAdmin`).
- **Backward-compatible:** taksonomi & data lama tetap valid; tampilan kartu lama tetap tersedia (toggle).
- **Reuse pola existing:** `useAsyncList`, `ConfirmDialog`, `toast`, `media-bulk-bar` (pola), `lead-timeline` (pola), `line-chart`.
- **A11y & mobile-first.**

---

## 1. Baseline (kondisi sekarang — untuk referensi saat eksekusi)

| Aspek | Kondisi |
| --- | --- |
| Berkas utama | `src/components/admin/orders-manager.tsx` (1053 baris — 1 berkas besar) |
| API klien | `src/lib/admin-orders-api.ts` |
| API server | `src/app/api/admin/orders/route.ts` (`GET` list/`summary`/`emails`/`date`, `PATCH` status, `POST` invoice/fulfill/resend, `DELETE`) |
| Halaman | `src/app/admin/(dashboard)/orders/page.tsx` |
| Data layer | `src/lib/orders.ts` (`getOrdersPage`, `getOrdersSummary`, `updateOrderStatus`, …) |
| Tampilan | Daftar **kartu**, toolbar (search memori + filter status + ekspor CSV + reload), kartu ringkasan, dialog detail, paginasi "Muat lagi" |
| Navigasi | `src/lib/admin-nav.ts` → grup "Toko" → item "Pesanan" (`/admin/orders`, badge `newOrders`) |

**Utilitas yang bisa dipakai ulang:** `useAsyncList` (`src/components/admin/use-async-list.ts`),
`useToast`, `ConfirmDialog`, `line-chart`, `formatRupiah`/`formatDateTime`/`shortOrderCode`
(`src/lib/format.ts`), `ORDER_STATUS_LABEL`/`ORDER_STATUS_STYLE` (`src/lib/order-types.ts`),
`isTransitionAllowed` (`src/lib/order-status-pure.ts`).

---

## 2. Keputusan Desain Awal (K1–K8)

> Ditetapkan saat perencanaan; dapat disesuaikan pemilik saat O0.

- **K1 — Tampilan utama = Tabel**, dengan **toggle Tabel ⇄ Kartu** (kartu untuk mobile/preferensi). Default: Tabel di desktop, Kartu di mobile.
- **K2 — Kolom tabel:** `[✓]`, Kode, Tanggal, Pembeli (nama+email), Item (ringkas), Total, Status, Pembayaran, Fulfillment, Aksi (⋯). Header dapat disortir.
- **K3 — Filter:** status (multi/preset), rentang tanggal (preset: Hari ini · 7 hari · 30 hari · Bulan ini · Kustom), fulfillment (instan/jasa), status pembayaran, punya kupon, nominal min–max, **"Butuh perhatian"** (pintasan).
- **K4 — Sortir server-side:** Tanggal (baru/lama), Total (besar/kecil), Status. (Kode tidak disortir.)
- **K5 — Pencarian server-side** untuk **kode/email eksak**; fallback filter memori (label jujur).
- **K6 — Bulk aksi** (maks **50** item): Ubah status (valid per matriks transisi), Ekspor terpilih, Hapus (hanya status boleh-hapus), Kirim ulang email. Konfirmasi wajib.
- **K7 — Detail = halaman `/admin/orders/[id]`** (dua kolom) + dialog tetap untuk tinjauan cepat. Timeline aktivitas (`orders/{id}/activities`) + catatan internal.
- **K8 — Status/tahap:** **pertahankan 8 status** yang ada untuk sekarang (tidak menambah status operasional baru di fase ini — lihat §7 pertanyaan terbuka).

---

## 3. Daftar Berkas (target)

**Baru (rencana):**
- `src/components/admin/orders/orders-toolbar.tsx` — toolbar filter/sort/search.
- `src/components/admin/orders/orders-table.tsx` — tabel data (sortir, ceklis).
- `src/components/admin/orders/order-card.tsx` — kartu (mobile/preferensi).
- `src/components/admin/orders/order-detail-dialog.tsx` — dialog tinjauan cepat.
- `src/components/admin/orders/order-status-badge.tsx` — badge status/pembayaran.
- `src/components/admin/orders/orders-bulk-bar.tsx` — bilah aksi massal.
- `src/components/admin/orders/orders-attention-panel.tsx` — work queue "butuh perhatian".
- `src/components/admin/order-timeline.tsx` — timeline aktivitas (pola `lead-timeline`).
- `src/lib/orders-filter-pure.ts` — logika filter/sort murni (teruji).
- `src/app/admin/(dashboard)/orders/[id]/page.tsx` — halaman detail pesanan.
- `src/app/api/admin/orders/[id]/route.ts` — `GET` detail + aktivitas; `POST` catatan.

**Diubah (rencana):**
- `src/components/admin/orders-manager.tsx` — jadi orkestrator tipis (state + render komponen).
- `src/lib/admin-orders-api.ts` — fungsi query filter/sort/page + detail + bulk + aktivitas.
- `src/app/api/admin/orders/route.ts` — perluas `GET` (filter/sort/page) + `POST bulk`.
- `src/lib/orders.ts` — `getOrdersPage` (filter/sort/page) + `getOrdersByIds` (bulk) + aktivitas.
- `firestore.indexes.json` — index tambahan bila diperlukan.
- `src/lib/admin-nav.ts` — (bila perlu) menandai halaman detail aktif.
- `package.json` — script `test:orders` bila ada logika murni.

---

## 4. Flow Task (Fase O0–O8)

> Setiap fase: kerjakan → gate `tsc`+`lint`+test+`build` → update checklist ini.
> Tandai `[x]` saat selesai.

### Fase O0 — Audit & dokumen fase (persiapan)
- [x] Konfirmasi keputusan K1–K8 dengan pemilik (khususnya §7 pertanyaan terbuka).
- [x] Buat dokumen eksekusi ini sebagai rujukan (sudah dibuat ✅).
- [x] Inventaris ulang komponen/API yang akan dipecah (baseline §1).
- [x] Tentukan target kolom tabel final & daftar filter final.
- **DoD:** keputusan terkunci; tanpa perubahan kode fungsional.

### Fase O1 — Tabel data + toggle + sortir (klien) — R1
- [x] Buat `order-status-badge.tsx` (status + pembayaran) — reuse `ORDER_STATUS_STYLE`.
- [x] Buat `orders-table.tsx` (kolom K2, ceklis `[✓]`, aksi ⋯, baris dapat diklik).
- [x] Buat `order-card.tsx` (ekstrak kartu lama) agar toggle bekerja.
- [x] Toggle **Tabel ⇄ Kartu** (simpan preferensi; default responsif).
- [x] **Sortir klien** awal (data halaman): tanggal/total/status.
- [x] `orders-manager.tsx` dijadikan orkestrator (state + render).
- [x] A11y: header `aria-sort`, tabel semantik, target sentuh 44px; mobile → kartu.
- **DoD:** tampilan tabel + kartu, toggle, sortir berfungsi; gate hijau.

### Fase O2 — Filter lanjutan + sortir server-side + index — R2
- [x] Perluas `GET /api/admin/orders`: `from`/`to`, `fulfillment`, `paymentStatus`, `hasCoupon`, `minTotal`/`maxTotal`, `sort`, `dir`, `q` (opsional).
- [x] `getOrdersPage` di `src/lib/orders.ts`: dukung filter/sort server (query native + fallback memori — pola Batch 3).
- [x] Buat `src/lib/orders-filter-pure.ts` (normalisasi/parse filter murni) + `scripts/orders-filter.test.ts`.
- [x] `orders-toolbar.tsx`: kontrol filter (preset tanggal, dropdown, min–max) + indikator filter aktif + reset.
- [x] `firestore.indexes.json`: index `createdAtISO`+`total` (sort nominal+filter tanggal) bila dipakai; publikasikan manual.
- [x] Sinkronkan filter ke URL (`?status=&from=&to=…`) agar bisa di-bookmark.
- **DoD:** filter & sortir server berfungsi; test murni hijau.

### Fase O3 — Pencarian server-side — R3
- [x] Tambah `q` di API: eksak kode (short id) / email; fallback memori pada halaman.
- [x] Label jujur "hasil pada halaman dimuat" bila fallback.
- [x] (Opsional) field `searchPrefix` lowercase untuk prefix search.
- **DoD:** pencarian menemukan pesanan lintas halaman (kode/email eksak).

### Fase O4 — Aksi massal (bulk) — R4
- [x] `POST /api/admin/orders { action:"bulk", ids, status? }` (validasi transisi per-item + audit + batas 50).
- [x] `orders-bulk-bar.tsx` (pola `media-bulk-bar`): Ubah status / Ekspor terpilih / Hapus / Kirim ulang.
- [x] Ceklis seleksi "pilih semua halaman ini" + hitungan terpilih.
- [x] Konfirmasi untuk aksi destruktif; rollback optimistik.
- **DoD:** bulk bekerja aman dengan audit.

### Fase O5 — Panel "Butuh Perhatian" + ringkasan interaktif — R6, R8
- [x] API ringkas attention: JASA menunggu > 24 jam, bayar kedaluwarsa < 6 jam, `paymentMismatch`, dibayar belum dipenuhi (instan tanpa token), gagal email.
- [x] `orders-attention-panel.tsx` (chip/kartu, klik → set filter).
- [x] Kartu ringkasan **dapat diklik** → set filter status.
- **DoD:** work queue tampil akurat; klik memfilter.

### Fase O6 — Halaman detail + timeline/catatan — R5, R7
- [x] `GET /api/admin/orders/[id]` (detail + daftar email + aktivitas).
- [x] `orders/{id}/activities` (data layer + `POST` catatan + `GET` list).
- [x] Halaman `src/app/admin/(dashboard)/orders/[id]/page.tsx` (dua kolom).
- [x] `order-timeline.tsx` (pola `lead-timeline`) + form catatan internal.
- [x] Aksi lengkap di halaman detail (invoice/fulfill/resend/status/hapus).
- **DoD:** halaman detail aktif & bisa di-bookmark; timeline akurat.

### Fase O7 — Paginasi bernomor + ekspor/cetak — R9, R10
- [x] API: `page`/`pageSize` + `total` (atau tetap cursor + total count).
- [x] Kontrol paginasi bernomor (1 2 3 …) + pilih jumlah/halaman (25/50/100).
- [x] Ekspor CSV mengikuti **filter/periode** (bukan hanya halaman) + kolom kaya.
- [x] Halaman **cetak rincian / invoice** (`@media print`).
- **DoD:** paginasi jelas; ekspor & cetak berfungsi.

### Fase O8 — Refactor komponen + a11y + QA akhir — R11, R12
- [x] Pastikan `orders-manager.tsx` sudah tipis (orkestrator); tak ada duplikasi.
- [x] Poles a11y (fokus, label, aria) & mobile (uji 375px).
- [x] QA manual menyeluruh (semua filter/sort/bulk/detail) + regresi.
- [x] Update dokumentasi: `docs/README.md`, `TASK-SELANJUTNYA.md`, dokumen ini.
- [x] Gate penuh + commit konvensional (`feat(admin-orders): …`).
- **DoD:** fitur berfungsi, gate hijau, dokumentasi diperbarui.

---

## 5. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
| --- | --- | --- | --- |
| R1 | Composite index baru belum dipublikasikan → query gagal | Filter/sort error | Fallback memori (pola Batch 3) + catat index; instruksi publish manual |
| R2 | Refactor `orders-manager` memecah regresi (status/fulfill/invoice) | Fitur lama rusak | Kerjakan bertahap (O1 ekstrak komponen dulu, uji tiap langkah) |
| R3 | Bulk aksi menyentuh kuota kupon / status terminal | Data tak konsisten | Validasi per-item (matriks transisi + restore kupon) + audit + batas 50 |
| R4 | Pencarian server-side keterbatasan substring Firestore | Hasil tak lengkap | Eksak kode/email; fallback jujur; catat prefix-search sebagai lanjutan |
| R5 | Cetak/invoice PDF salah data | Dokumen keliru | Render dari data order tersimpan; uji nominal/diskon |
| R6 | Halaman detail baru tanpa guard | Akses tak sah | `requireAdmin` di API + guard halaman admin existing |

---

## 6. Definition of Done (task ini)

1. `/admin/orders` = **tabel proper** (+ kartu), kolom jelas, **sortir & filter** lengkap, **pencarian server-side**.
2. **Bulk aksi** & **panel "butuh perhatian"** berfungsi.
3. **Halaman detail** pesanan dengan **timeline/catatan**, bisa dicetak/diekspor.
4. Komponen **terpecah & terawat**; a11y & mobile OK.
5. `tsc`/`lint`/semua `test:*`/`build` hijau; dokumentasi diperbarui.
6. Backward-compatible (data & taksonomi lama tetap valid).

---

## 7. Pertanyaan Terbuka (konfirmasi saat O0)

> Dapat dijawab pemilik saat mulai sesi eksekusi. Default usulan tercantum.

1. **Urutan mulai:** O1+O2 (tabel+filter) dulu — **[default disarankan]** — atau O4+O5 (bulk+work queue)?
2. **Halaman detail** `/admin/orders/[id]`: dipakai — **[default: ya]** — atau cukup dialog?
3. **Cetak/invoice PDF:** perlu — **[default: rincian internal + opsi cetak]** — atau faktur resmi?
4. **Bulk:** batas **50** item — **[default]** — & aksi (ubah status, ekspor, hapus, resend) sudah cukup?
5. **Status/tahap operasional baru** (mis. "dikirim", "antrean produksi", "revisi")? **[default: tidak dulu — pakai 8 status existing]**

---

## 8. Hasil Eksekusi

> _(Diisi setelah eksekusi.)_

- Status: **✅ SELESAI (kode)** — fase O0–O8 dikerjakan dalam satu sesi.
- Fase selesai: **O0–O8**.
- Gate: `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih ✅ · semua `test:*` hijau ✅ (termasuk `test:orders` 22) · `npm run build` sukses ✅ (72 halaman; route baru `/admin/orders/[id]`, `/api/admin/orders/[id]`, `/api/admin/orders/[id]/activities`).

### Berkas baru
- `src/lib/orders-filter-pure.ts` — logika murni filter/sort/attention (teruji).
- `scripts/orders-filter.test.ts` — 22 test.
- `src/lib/order-activities.ts` — data layer timeline (subkoleksi `orders/{id}/activities`).
- `src/components/admin/orders/order-status-badge.tsx` — badge status/pembayaran/fulfillment/attention.
- `src/components/admin/orders/orders-toolbar.tsx` — toolbar filter/sort/search.
- `src/components/admin/orders/orders-table.tsx` — tabel data (sortir, ceklis).
- `src/components/admin/orders/order-card.tsx` — kartu (mobile/preferensi).
- `src/components/admin/orders/orders-attention-panel.tsx` — work queue.
- `src/components/admin/orders/orders-bulk-bar.tsx` — aksi massal.
- `src/components/admin/orders/order-detail-dialog.tsx` — dialog + body + actions bersama.
- `src/components/admin/orders/order-page-client.tsx` — halaman detail klien (dua kolom).
- `src/components/admin/orders/use-orders-view.ts` — preferensi tabel/kartu.
- `src/components/admin/order-timeline.tsx` — timeline aktivitas (pola `lead-timeline`).
- `src/app/admin/(dashboard)/orders/[id]/page.tsx` — halaman detail.
- `src/app/api/admin/orders/[id]/route.ts` — `GET` detail + email.
- `src/app/api/admin/orders/[id]/activities/route.ts` — `GET`/`POST` timeline.

### Berkas diubah
- `src/components/admin/orders-manager.tsx` — orkestrator tipis (state + render komponen).
- `src/lib/orders.ts` — `getOrdersPage` (filter/sort/page bernomor), `getOrdersByIds`, `getOrdersAttentionSummary`.
- `src/lib/order-types.ts` — field `paymentMismatch` + normalizer.
- `src/lib/admin-orders-api.ts` — query filter/sort/page + attention + detail + aktivitas + bulk.
- `src/app/api/admin/orders/route.ts` — `GET` filter/sort/page + `?attention=1`; `POST { action:"bulk" }`; catat aktivitas.
- `firestore.indexes.json` — (sudah cukup; `status`+`createdAtISO` & rentang `createdAtISO`).
- `package.json` — script `test:orders`.
- `tsconfig.json` — exclude test baru.
- `src/app/admin/(dashboard)/orders/page.tsx` — `Suspense`.
- `src/components/admin/admin-shell.tsx` + `src/app/globals.css` — `print:hidden` chrome + aturan `@media print`.
- `src/app/admin/(dashboard)/orders/[id]/page.tsx` — tombol cetak, sembunyikan chrome saat print.

### O7 pelengkap — Seleksi ukuran halaman & cetak
- **Jumlah per halaman** 25/50/100 (URL `?pageSize=`, default 25).
- **Cetak rincian pesanan** via tombol "Cetak" (`window.print()`) — `@media print` menyembunyikan sidebar/header/aksi/timeline; hanya rincian order yang tercetak.

### Revisi lanjutan — Foto profil pembeli (avatar nyata)
- Sebelumnya avatar pembeli hanya inisial huruf. Kini menampilkan **foto profil asli** (Google) pembeli.
- **Snapshot saat checkout:** `Order.buyerPhotoUrl` diisi dari `users/{uid}.photoURL` (checkout.ts mengambil profil sekali, dipakai juga untuk nomor WA invoice).
- **Order lama:** `attachBuyerPhotos()` (`orders.ts`) melengkapi `buyerPhotoUrl` dari `users/{uid}` (satu batch `getAll` per halaman) — best-effort. Dipakai di `GET /api/admin/orders`, `GET /api/admin/orders/[id]`, dan halaman detail.
- **Komponen** `BuyerAvatar` (`admin/orders/buyer-avatar.tsx`): render `<img>` + `onError`→inisial; dipakai di tabel, kartu, dan detail.
- `lh3.googleusercontent.com` sudah diizinkan di `next.config.ts` (images). Pakai `<img>` agar host foto apa pun tetap tampil (referrer no-referrer).

### Berkas revisi foto pembeli
- Baru: `src/components/admin/orders/buyer-avatar.tsx`.
- Diubah: `order-types.ts` (`buyerPhotoUrl`), `orders.ts` (`createOrder` + `attachBuyerPhotos`), `checkout.ts` (ambil profil sekali), `api/admin/orders/route.ts`, `api/admin/orders/[id]/route.ts`, `admin/(dashboard)/orders/[id]/page.tsx`, `orders-table.tsx`, `order-card.tsx`, `order-detail-dialog.tsx`.
- **Catatan:** order tanpa login-Google (foto kosong) → fallback inisial. Denormalisasi ini juga membuat snapshot stabil meski user ganti foto (per order), sementara order lama ikut terisi saat dibuka.

### Keputusan §7 (default diambil)
1. **O1+O2 dulu** (tabel+filter) → lanjut O3–O8 sekaligus.
2. Halaman detail **dipakai** + dialog tinjauan cepat tetap ada.
3. Cetak/invoice: **rincian internal** (tombol cetak rincian; tanpa PDF faktur resmi).
4. Bulk: batas **50** + aksi ubah status/ekspor/hapus/resend.
5. **Tanpa status operasional baru** (8 status existing).

### Cara kerja filter (server-authoritative)
- Mode filter bernomor menyempit query native (status + rentang `createdAtISO`) lalu menyaring/mengurutkan **di memori** (cap 500) — menghindari banyak composite index. `truncated` ditandai bila batas tersentuh.
- Filter tersinkron ke URL (`?status=&datePreset=&from=&to=&fulfillment=&paymentStatus=&coupon=&minTotal=&maxTotal=&attention=&q=&sort=&page=`) → bisa di-bookmark.
- Pencarian server-side: kode/email/nama (substring dalam window filter). Bila filter kosong, mode cursor lama tetap dipakai.

### Sisa manual
- Uji browser desktop/mobile (toggle tabel/kartu, filter, bulk, detail + timeline).
- (Opsional) publikasikan ulang Firestore Rules bila ingin mengunci subkoleksi `orders/{id}/activities` (subkoleksi diwarisi aturan `orders` — catch-all sudah menolak klien).
