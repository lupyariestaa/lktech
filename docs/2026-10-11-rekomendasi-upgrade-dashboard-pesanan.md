# Rekomendasi Pengembangan — Dashboard "Kelola Pesanan" (`/admin/orders`)

> **Status:** 📝 **REKOMENDASI (belum dieksekusi).** Disusun 2026-10-11 sebagai
> usulan upgrade agar menu kelola pesanan **lebih proper** — bukan daftar polos,
> tetapi pusat operasi pesanan yang efisien untuk admin.
>
> **Konteks:** pasca-audit sistem pesanan (`docs/2026-10-11-audit-sistem-pesanan.md`,
> Batch 1–4 selesai). Fondasi data/API sudah kuat; fokus kini **UX & alur kerja dashboard**.

---

## 1. Kondisi Saat Ini (baseline)

**Berkas:** `src/components/admin/orders-manager.tsx` (1053 baris — 1 berkas besar),
`src/lib/admin-orders-api.ts`, `src/app/api/admin/orders/route.ts`, halaman
`src/app/admin/(dashboard)/orders/page.tsx`.

**Yang SUDAH ada:**
- Kartu ringkasan (total + per-status + omzet) — sejak Batch 4 lengkap semua status.
- Toolbar: **pencarian** (nama/email/kode, hanya memori), **filter status** (dropdown), **ekspor CSV** (hasil tampil), **muat ulang**.
- Daftar **berbentuk kartu** (bukan tabel), paginasi **"Muat lagi"** (cursor).
- Dialog detail: pembeli, status pembayaran, item, diskon, **riwayat email**, status email, pesan WA.
- Aksi per-pesanan: ubah status (dropdown, kini mengikuti matriks transisi), **buat invoice manual**, **buat/kirim ulang unduhan**, **kirim ulang email**, **salin pesan WA**, **hapus** (status tertentu).
- API: `GET` (list + `summary` + `emails` + `date`), `PATCH` (status), `POST` (invoice/fulfill/resend), `DELETE`.

**Keterbatasan yang terasa (gap UX operasional):**
1. **Bukan tabel** → admin tidak bisa memindai banyak pesanan cepat; tidak ada kolom sejajar (tanggal/total/status/pembeli) untuk sortir & banding.
2. **Tidak ada sortir** (tanggal/nilai/status) — hanya urut default terbaru.
3. **Filter terbatas**: hanya status. Tidak ada **rentang tanggal**, **jalur fulfillment** (instan/jasa), **metode pembayaran**, **ada kupon/belum**, **nominal min/max**.
4. **Pencarian hanya di memori** halaman terpilih (bukan server) → tak menemukan pesanan di luar halaman termuat.
5. **Tidak ada aksi massal (bulk)** — mis. pilih banyak → ubah status / ekspor terpilih / tandai diproses. Harus satu per satu.
6. **Paginasi "Muat lagi"** (bukan nomor halaman) → tak tahu posisi/total halaman; rawan lupa posisi.
7. **Tidak ada halaman detail khusus** (`/admin/orders/[id]`) — detail hanya di dialog modal; tidak bisa dibagikan/di-bookmark, sulit untuk pesanan kompleks (JASA panjang).
8. **Tidak ada indikator "butuh perhatian"** — mis. pesanan JASA menunggu konfirmasi lama, pembayaran mendekati kedaluwarsa, mismatch/underpay.
9. **Ringkasan pasif** — kartu tidak bisa diklik untuk memfilter cepat.
10. **Tidak ada ekspor ber-filter/berperiode** lengkap, **tidak ada cetak/invoice PDF**.
11. **Tidak ada pencatatan catatan internal / timeline pesanan** (berbeda dengan `lead-timeline` yang sudah ada).
12. **Persepsi "1 berkas 1053 baris"** — sulit dirawat.

---

## 2. Prinsip Rekomendasi

Mengikuti konvensi proyek (`TASK-SELANJUTNYA.md`): **server-authoritative**,
**backward-compatible**, **a11y**, **mobile-first**, **dokumentasi dulu**, dan
**reuse pola yang sudah ada** (mis. `lead-pipeline-board`, `lead-timeline`,
`media-toolbar`, `use-async-list`, `ConfirmDialog`, `DataTable` bila dibuat).

Upgrade diarahkan ke tiga pilar:
- **A. Mencari & menyaring cepat** (temukan pesanan yang tepat secepat mungkin).
- **B. Bertindak cepat** (ubah status/fulfill/komunikasi tanpa banyak klik).
- **C. Melihat gambaran** (KPI, butuh perhatian, tren) + integritas (detail, timeline, cetak).

---

## 3. Rekomendasi (berperingkat, dengan dampak & usaha)

### 🔴 Prioritas Tinggi (dampak besar, pondasi)

#### R1 — Ubah daftar kartu → **Tabel data proper** (dengan pilihan Kartu/Tabel)
- **Kenapa:** memindai sesuai standar dashboard; kolom sejajar (Kode, Tanggal, Pembeli, Item, Total, Status, Bayar, Fulfillment).
- **Detail:**
  - Kolom: `Kode` (shortOrderCode), `Tanggal`, `Pembeli` (nama + email), `Item` (ringkas "N item"), `Total`, `Status` (badge), `Pembayaran` (badge), `Fulfillment` (instan/jasa), `Aksi` (menu ⋯).
  - **Baris dapat diklik** → detail (R5). Ceklis bulk (R4) di kolom paling kiri.
  - **Toggle Tabel ⇄ Kartu** (kartu tetap ada untuk mobile / preferensi) — pola seperti `leads-manager` (List ⇄ Pipeline).
  - Header kolom **dapat disortir** (kecuali kode) dengan indikator ↑↓.
  - Mobile: tabel → kartu otomatis (responsif), tetap aksesibel.
- **Usaha:** sedang. **Dampak:** tinggi.

#### R2 — **Sortir server-side** + **Filter lanjutan** (tanggal, fulfillment, pembayaran, kupon, nominal)
- **Kenapa:** temukan pesanan spesifik tanpa scroll.
- **Detail filter:**
  - **Rentang tanggal** (preset: Hari ini · 7 hari · 30 hari · Bulan ini · Kustom) — kolom `createdAtISO`.
  - **Fulfillment**: Instan / Jasa.
  - **Status pembayaran**: belum bayar / menunggu / dibayar / gagal / kedaluwarsa.
  - **Punya kupon** (ya/tidak), **nominal** (min–max).
  - **"Butuh perhatian"** (R6) sebagai filter pintasan.
- **Sortir**: Tanggal (baru/lama), Total (besar/kecil), Status.
- **API:** perluas `GET /api/admin/orders` dengan `from`/`to`, `fulfillment`, `paymentStatus`, `hasCoupon`, `minTotal`/`maxTotal`, `sort`, `dir`. Tambah composite index bila perlu (mis. `status`+`createdAtISO` sudah ada; mungkin `createdAtISO`+`total` untuk sort nominal + filter tanggal → **catat di `firestore.indexes.json`**).
- **Usaha:** sedang–besar. **Dampak:** tinggi.

#### R3 — **Pencarian server-side** (bukan hanya halaman termuat)
- **Kenapa:** saat ini search hanya menyaring halaman yang dimuat → pesanan "hilang".
- **Detail:** cari via **kode (short id)**, email, nama. Karena Firestore tanpa substring, strategi:
  - Cari **eksak** kode/email dulu (indeks `buyerEmail`); **fallback** filter memori pada halaman.
  - Tampilkan label jujur: "hasil untuk halaman dimuat" bila fallback.
  - (Opsional lanjut) field `searchPrefix` lowercase untuk prefix search.
- **Usaha:** sedang. **Dampak:** tinggi.

### 🟠 Prioritas Menengah (efisiensi operasional)

#### R4 — **Aksi massal (bulk)**
- **Kenapa:** memproses banyak pesanan (mis. tandai diproses, ekspor terpilih, hapus beberapa) jauh lebih cepat.
- **Detail:** ceklis baris → bilah aksi melayang (pola `media-bulk-bar`): **Ubah status (valid per transisi)**, **Ekspor terpilih ke CSV**, **Hapus** (hanya status yang boleh dihapus), **Kirim ulang email**. Batas aman (mis. maks 50) + konfirmasi.
- **API:** `POST /api/admin/orders { action:"bulk", ids, status }` (dengan validasi transisi per-item & audit).
- **Usaha:** sedang. **Dampak:** sedang–tinggi.

#### R5 — **Halaman detail pesanan** `/admin/orders/[id]`
- **Kenapa:** pesanan kompleks (JASA, banyak email, diskusi) butuh ruang & bisa dibagikan/di-bookmark.
- **Detail:** layout dua kolom — kiri (item, total, kupon, pembayaran, fulfillment, unduhan) & kanan (**timeline aktivitas** + catatan internal + aksi). Dialog tetap dipakai untuk tinjauan cepat.
- **API:** `GET /api/admin/orders/[id]` (detail + email + aktivitas).
- **Usaha:** sedang–besar. **Dampak:** tinggi (untuk JASA/CS).

#### R6 — **Panel "Butuh Perhatian"** (work queue)
- **Kenapa:** admin ingin tahu apa yang harus ditindak, bukan hanya daftar.
- **Detail:** kartu/chip pintasan di atas: **JASA menunggu konfirmasi > 24 jam**, **pembayaran mendekati kedaluwarsa (<6 jam)**, **underpay/mismatch** (dari `paymentMismatch`), **dibayar tapi belum dipenuhi** (instan tanpa token unduhan), **gagal kirim email**. Klik → filter.
- **Usaha:** sedang. **Dampak:** tinggi (operasional).

#### R7 — **Timeline & catatan internal pesanan**
- **Kenapa:** jejak alur (dibuat → invoice → dibayar → email → status → fulfilled) + catatan admin (mis. "sudah dihubungi via WA").
- **Detail:** model subkoleksi `orders/{id}/activities` (pola `lead-timeline`) + `POST` catatan. Timeline otomatis dari aksi yang sudah tercatat (audit/email/status).
- **Usaha:** sedang. **Dampak:** sedang.

### 🔵 Prioritas Rendah (polesan & pelengkap)

#### R8 — **Ringkasan interaktif** (kartu diklik = filter cepat) & **KPI periode**
- Kartu status diklik → set filter; tambah periode (mis. "hari ini", "7 hari") + delta.
- **Usaha:** kecil. **Dampak:** sedang.

#### R9 — **Paginasi bernomor** (Muat lagi → 1 2 3 …) & opsi **jumlah per halaman** (25/50/100)
- **Usaha:** sedang (butuh `total`/`page` di API). **Dampak:** sedang.

#### R10 — **Ekspor & Cetak lanjutan**
- Ekspor CSV sesuai **filter/periode** (bukan hanya halaman), kolom kaya (status bayar, fulfillment, kupon, diskon, metode).
- **Cetak rincian / invoice PDF** (untuk JASA/manual) — halaman `cetak` dengan `@media print`.
- **Usaha:** sedang. **Dampak:** sedang.

#### R11 — **Pemisahan komponen (maintainability)**
- Pecah `orders-manager.tsx` (1053 baris) → `orders-toolbar.tsx`, `orders-table.tsx`, `order-card.tsx`, `order-detail-dialog.tsx`, `order-status-badge.tsx`, `orders-bulk-bar.tsx`, `order-timeline.tsx`.
- Adopsi `useAsyncList`/hook query baru agar konsisten dengan modul lain.
- **Usaha:** sedang. **Dampak:** sedang (kualitas).

#### R12 — **Penyempurnaan detail & aksesibilitas**
- Copy tombol status dengan penjelasan; fokus terjaga; tandai pesanan baru (highlight); notifikasi realtime ringan (polling badge sudah ada).
- **Usaha:** kecil. **Dampak:** kecil–sedang.

---

## 4. Usulan Urutan Eksekusi (fase)

> Prinsip: **dokumentasi dulu → kode**, gate `tsc`+`lint`+test+`build` tiap fase,
> backward-compatible.

| Fase | Isi | Detail |
| --- | --- | --- |
| **O0** | Audit & dokumen fase | Dokumen ini → dokumen eksekusi `docs/YYYY-MM-DD-upgrade-orders-dashboard.md` (baseline + keputusan + checklist). |
| **O1** | **Tabel + toggle + sortir** (R1) | Komponen tabel responsif + sortir klien dulu (data halaman). |
| **O2** | **Filter lanjutan + sortir server** (R2) + index | Perluas API `GET`; preset tanggal; index Firestore. |
| **O3** | **Pencarian server-side** (R3) | Eksak kode/email + fallback jujur. |
| **O4** | **Bulk aksi** (R4) | Bilah aksi massal + `POST bulk`. |
| **O5** | **Panel "Butuh Perhatian"** (R6) + ringkasan interaktif (R8) | Work queue + kartu klik-filter. |
| **O6** | **Halaman detail + timeline/catatan** (R5, R7) | `/admin/orders/[id]` + `activities`. |
| **O7** | **Paginasi bernomor + ekspor/cetak** (R9, R10) | Total & page di API; cetak PDF. |
| **O8** | **Refactor komponen + a11y** (R11, R12) | Pecah berkas, polesan akhir, QA. |

**Rekomendasi mulai dari:** **O1 + O2** (tabel + filter/sortir) — memberi lompatan
UX terbesar dengan risiko terkendali; lalu O4/O5 (bulk & work queue) untuk efisiensi
operasional.

---

## 5. Dampak & Pertimbangan Teknis

- **API baru/perluasan:** `GET /api/admin/orders` (filter/sort/page), `GET /api/admin/orders/[id]`, `POST` bulk & catatan aktivitas. Semua di balik `requireAdmin` + audit.
- **Index Firestore:** kemungkinan perlu composite index tambahan (sort nominal + filter tanggal; fulfillment+createdAt). Catat di `firestore.indexes.json` & **publikasikan** manual.
- **Backward-compatible:** field/taksonomi lama tetap; UI kartu lama tetap tersedia (toggle).
- **Performa:** filter/sort server-side mengurangi muat besar; perhatikan limit (mis. 100) & cursor.
- **Test:** tambah unit test untuk logika filter/sort/bulk murni (mis. `orders-filter-pure.ts`) → mengikuti pola `*-pure.ts` + `test:*`.
- **A11y & mobile:** tabel harus geser horizontal / berubah jadi kartu; target sentuh 44px; label jelas.

---

## 6. Definition of Done (visi akhir)

1. Menu `/admin/orders` berupa **tabel proper** (+ opsi kartu), kolom jelas, sortir & filter lengkap, pencarian server-side.
2. Admin dapat **bertindak massal** & melihat **work queue "butuh perhatian"**.
3. Ada **halaman detail** pesanan dengan **timeline/catatan**, bisa dicetak/diekspor.
4. Komponen **terpecah & terrawat**; a11y & mobile OK.
5. `tsc`/`lint`/test/`build` hijau; dokumentasi fase diperbarui.

---

## 7. Pertanyaan untuk Pemilik (sebelum eksekusi)

1. **Utamakan mana dulu:** tabel+filter (O1–O3) **atau** work-queue+bulk (O4–O6)?
2. **Halaman detail terpisah** (`/admin/orders/[id]`) diperlukan, atau cukup dialog?
3. **Cetak/invoice PDF** termasuk kebutuhan? (Faktur resmi vs rincian internal.)
4. **Bulk** sampai berapa item (mis. 50) & aksi apa saja yang diizinkan massal?
5. Adakah **status/tahap operasional baru** yang diinginkan (mis. "dikirim", "dalam antrean produksi", "revisi") di luar matriks 8 status sekarang?
