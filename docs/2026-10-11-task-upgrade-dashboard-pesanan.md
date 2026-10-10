# Task Eksekusi — Upgrade Dashboard "Kelola Pesanan" (`/admin/orders`)

> **Status: ⏳ BELUM DIKERJAKAN (TODO — dikerjakan sesi berikutnya).**
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
- [ ] Konfirmasi keputusan K1–K8 dengan pemilik (khususnya §7 pertanyaan terbuka).
- [ ] Buat dokumen eksekusi ini sebagai rujukan (sudah dibuat ✅).
- [ ] Inventaris ulang komponen/API yang akan dipecah (baseline §1).
- [ ] Tentukan target kolom tabel final & daftar filter final.
- **DoD:** keputusan terkunci; tanpa perubahan kode fungsional.

### Fase O1 — Tabel data + toggle + sortir (klien) — R1
- [ ] Buat `order-status-badge.tsx` (status + pembayaran) — reuse `ORDER_STATUS_STYLE`.
- [ ] Buat `orders-table.tsx` (kolom K2, ceklis `[✓]`, aksi ⋯, baris dapat diklik).
- [ ] Buat `order-card.tsx` (ekstrak kartu lama) agar toggle bekerja.
- [ ] Toggle **Tabel ⇄ Kartu** (simpan preferensi; default responsif).
- [ ] **Sortir klien** awal (data halaman): tanggal/total/status.
- [ ] `orders-manager.tsx` dijadikan orkestrator (state + render).
- [ ] A11y: header `aria-sort`, tabel semantik, target sentuh 44px; mobile → kartu.
- **DoD:** tampilan tabel + kartu, toggle, sortir berfungsi; gate hijau.

### Fase O2 — Filter lanjutan + sortir server-side + index — R2
- [ ] Perluas `GET /api/admin/orders`: `from`/`to`, `fulfillment`, `paymentStatus`, `hasCoupon`, `minTotal`/`maxTotal`, `sort`, `dir`, `q` (opsional).
- [ ] `getOrdersPage` di `src/lib/orders.ts`: dukung filter/sort server (query native + fallback memori — pola Batch 3).
- [ ] Buat `src/lib/orders-filter-pure.ts` (normalisasi/parse filter murni) + `scripts/orders-filter.test.ts`.
- [ ] `orders-toolbar.tsx`: kontrol filter (preset tanggal, dropdown, min–max) + indikator filter aktif + reset.
- [ ] `firestore.indexes.json`: index `createdAtISO`+`total` (sort nominal+filter tanggal) bila dipakai; publikasikan manual.
- [ ] Sinkronkan filter ke URL (`?status=&from=&to=…`) agar bisa di-bookmark.
- **DoD:** filter & sortir server berfungsi; test murni hijau.

### Fase O3 — Pencarian server-side — R3
- [ ] Tambah `q` di API: eksak kode (short id) / email; fallback memori pada halaman.
- [ ] Label jujur "hasil pada halaman dimuat" bila fallback.
- [ ] (Opsional) field `searchPrefix` lowercase untuk prefix search.
- **DoD:** pencarian menemukan pesanan lintas halaman (kode/email eksak).

### Fase O4 — Aksi massal (bulk) — R4
- [ ] `POST /api/admin/orders { action:"bulk", ids, status? }` (validasi transisi per-item + audit + batas 50).
- [ ] `orders-bulk-bar.tsx` (pola `media-bulk-bar`): Ubah status / Ekspor terpilih / Hapus / Kirim ulang.
- [ ] Ceklis seleksi "pilih semua halaman ini" + hitungan terpilih.
- [ ] Konfirmasi untuk aksi destruktif; rollback optimistik.
- **DoD:** bulk bekerja aman dengan audit.

### Fase O5 — Panel "Butuh Perhatian" + ringkasan interaktif — R6, R8
- [ ] API ringkas attention: JASA menunggu > 24 jam, bayar kedaluwarsa < 6 jam, `paymentMismatch`, dibayar belum dipenuhi (instan tanpa token), gagal email.
- [ ] `orders-attention-panel.tsx` (chip/kartu, klik → set filter).
- [ ] Kartu ringkasan **dapat diklik** → set filter status.
- **DoD:** work queue tampil akurat; klik memfilter.

### Fase O6 — Halaman detail + timeline/catatan — R5, R7
- [ ] `GET /api/admin/orders/[id]` (detail + daftar email + aktivitas).
- [ ] `orders/{id}/activities` (data layer + `POST` catatan + `GET` list).
- [ ] Halaman `src/app/admin/(dashboard)/orders/[id]/page.tsx` (dua kolom).
- [ ] `order-timeline.tsx` (pola `lead-timeline`) + form catatan internal.
- [ ] Aksi lengkap di halaman detail (invoice/fulfill/resend/status/hapus).
- **DoD:** halaman detail aktif & bisa di-bookmark; timeline akurat.

### Fase O7 — Paginasi bernomor + ekspor/cetak — R9, R10
- [ ] API: `page`/`pageSize` + `total` (atau tetap cursor + total count).
- [ ] Kontrol paginasi bernomor (1 2 3 …) + pilih jumlah/halaman (25/50/100).
- [ ] Ekspor CSV mengikuti **filter/periode** (bukan hanya halaman) + kolom kaya.
- [ ] Halaman **cetak rincian / invoice** (`@media print`).
- **DoD:** paginasi jelas; ekspor & cetak berfungsi.

### Fase O8 — Refactor komponen + a11y + QA akhir — R11, R12
- [ ] Pastikan `orders-manager.tsx` sudah tipis (orkestrator); tak ada duplikasi.
- [ ] Poles a11y (fokus, label, aria) & mobile (uji 375px).
- [ ] QA manual menyeluruh (semua filter/sort/bulk/detail) + regresi.
- [ ] Update dokumentasi: `docs/README.md`, `TASK-SELANJUTNYA.md`, dokumen ini.
- [ ] Gate penuh + commit konvensional (`feat(admin-orders): …`).
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

- Status: **⏳ BELUM DIKERJAKAN**.
- Fase selesai: —
- Gate: —
- Catatan: —
