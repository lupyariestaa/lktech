# Task Eksekusi — Upgrade UI/UX Form Kupon (Halaman Khusus)

> **Status: ✅ SELESAI (kode).** Melanjutkan inisiatif kupon (C0–C9) — **polem UI/UX
> form buat/edit kupon** + menutup gap fungsional (field C1 belum bisa diisi dari UI).
> **Revisi keputusan pemilik:** form buat/edit kupon = **HALAMAN KHUSUS** (route
> sendiri), **bukan popup** — pola seperti halaman form portfolio.
> Disusun & dieksekusi: 2026-10-11.

> **Perubahan arah (2026-10-11):** awalnya diimplementasikan sebagai popup/dialog;
> atas permintaan pemilik, dipindah menjadi **halaman khusus**:
> - `/admin/coupons/new` — halaman **buat** kupon.
> - `/admin/coupons/[id]/edit` — halaman **edit** kupon.
> Komponen `coupon-form.tsx` (halaman penuh, bukan dialog). Dialog batch (generate
> massal) tetap popup (aksi massal).

---

## 0. Ringkasan & Tujuan

Dialog buat/edit kupon saat ini **fungsional tapi belum proper**: form 1 kolom
sempit, tanpa pengelompokan, tanpa pratinjau, **dan tidak bisa mengisi field
lanjutan C1** (karena schema server belum menerimanya). Upgrade ini membuat dialog
menjadi **pusat pembuatan kupon yang jelas, terkelompok, dan lengkap**.

**Prinsip:** dokumentasi → kode; server-authoritative; backward-compatible; a11y
(fieldset/legend, aria, focus-trap, `role="alert"`); mobile-first.

---

## 1. Temuan (gap UI/UX & fungsional)

- **F1 (fungsional, kritis):** Form **tidak bisa** mengisi field C1: `type=tiered`,
  `campaign`, `audience`, `singleUse`, `assignedEmail`, `perDayLimit`, `tiers`.
  Schema server (`api-schemas.ts`) & `toInput` juga **belum menerima** field ini →
  sekalipun dikirim, zod membuangnya.
- **F2:** `Jenis` hanya `percent`/`amount` (tanpa `tiered`).
- **F3:** Layout 1 kolom sempit (`max-w-lg`), tanpa section/heading → sulit dipindai.
- **F4:** Tanpa **pratinjau** kupon (admin tak tahu hasil).
- **F5:** Tombol tutup teks "Tutup"; header polos tanpa ikon/konteks.
- **F6:** Field lanjutan (targeting/kuota) tidak dikelompokkan/tidak kolaps.
- **F7:** Footer tidak menampilkan ringkasan nilai kupon.

---

## 2. Keputusan Desain (U1–U8)

- **U1** — Dialog **lebih lebar** (`max-w-3xl`) dengan tata letak **2 kolom** di
  desktop: **form** (kiri) + **pratinjau sticky** (kanan). Mobile: 1 kolom.
- **U2** — **Header proper**: ikon (Ticket/BadgePercent) + judul (Buat/Edit Kupon) +
  subjudul + tombol tutup ikon (X) ber-`aria-label`.
- **U3** — **Section bergrup** via `<fieldset><legend>` + ikon:
  **Dasar** · **Diskon & Syarat** · **Batas & Kuota** · **Jadwal & Kampanye** ·
  **Penargetan (lanjutan)**.
- **U4** — Dukung **semua tipe**: `percent`/`amount`/`tiered` (+ editor tier dinamis
  untuk `tiered`: baris min-spend + nilai + hapus/tambah).
- **U5** — Field lanjutan (audience, single-use, assigned email, kuota harian,
  stackable) tersedia — **disembunyikan di balik tombol "Opsi lanjutan"** (default ringkas).
- **U6** — **Pratinjau kupon** live: kartu meniru tampilan `/promo` (kode, badge
  hemat, syarat, masa berlaku) — memperbarui saat form berubah.
- **U7** — **Footer sticky**: ringkasan singkat (mis. "Diskon 10% · min Rp0") +
  tombol Batal/Simpan; status "aktif" ditampilkan.
- **U8** — a11y: `aria-labelledby` ke heading, error per-field `role="alert"`,
  focus-trap (`useDrawerFocus`), Escape, target sentuh ≥44px.

---

## 3. Daftar Berkas

**Diubah:**
- `src/lib/api-schemas.ts` — `couponBaseFields` + `couponCreate/UpdateSchema`:
  tambah `tiers`, `campaign`, `audience`, `singleUse`, `assignedEmail`,
  `perDayLimit`, `stackable`; `type` + `"tiered"`.
- `src/app/api/admin/coupons/route.ts` — `toInput` memetakan field baru.
- `src/lib/admin-coupons-api.ts` — `CouponFormInput` sudah diperluas (C4); pastikan lengkap.
- `src/components/admin/coupons/coupon-form-dialog.tsx` — **rombak UI** (2 kolom,
  section, pratinjau, editor tier, opsi lanjutan).
- `src/lib/coupon-pure.ts` — `validateCouponForm` sudah mendukung `tiers`/`perDayLimit`.

---

## 4. Flow Task (Fase U0–U5)

### Fase U0 — Dokumen — ✅
- [x] Tulis dokumen ini.

### Fase U1 — Backend: terima field C1 (F1, F2) — ✅
- [x] `api-schemas.ts`: `type` + `"tiered"`; tambah `tiers`, `campaign`, `audience`,
      `singleUse`, `assignedEmail`, `assignedUid`, `perDayLimit`, `stackable`
      (create & update).
- [x] `toInput` (route admin) memetakan & menormalkan field baru (tier diurut, dst);
      `limitPerUser` 0 dipertahankan.
- [x] Test `test:coupon-schema` (**7**) — field tak dibuang zod.

### Fase U2 — Rombak dialog: layout & section (F3, F5) — ✅
- [x] Header ikon + judul + subjudul + tombol tutup ikon (X).
- [x] Tata letak **2 kolom** (form + pratinjau sticky) responsif.
- [x] Section bergrup `<fieldset>/<legend>` + ikon (Dasar · Diskon & Syarat ·
      Batas & Kuota · Jadwal · Penargetan/Bundel lanjutan).

### Fase U3 — Tipe & field lanjutan (F2, F6) — ✅
- [x] `Jenis` + `tiered`; **editor tier dinamis** (tambah/hapus, jenis %/Rp).
- [x] **Opsi lanjutan** kolaps: audience, single-use, email khusus, kuota harian,
      kampanye (dasar), stackable, kupon bundel.

### Fase U4 — Pratinjau & footer (F4, F7) — ✅
- [x] Kartu **pratinjau live** (kode, badge hemat, syarat, status).
- [x] **Footer** dgn ringkasan nilai + status.

### Fase U5 — QA, a11y & rilis — ✅
- [x] Gate penuh; dokumentasi; commit.

---

## 6. Hasil Eksekusi

**Status: ✅ SELESAI (kode).**
- `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ (**475** test; `test:coupon-schema` baru = 7) · `build` ✅.
- Form kupon = **halaman khusus**: `/admin/coupons/new` & `/admin/coupons/[id]/edit`
  (komponen `coupon-form.tsx`), 2 kolom + **pratinjau live**, header berikon, section
  bergrup, editor tier, opsi lanjutan, footer ringkasan.
- Daftar kupon: tombol "Buat Kupon" → `/admin/coupons/new`; tombol **Edit** kartu &
  detail → `/admin/coupons/[id]/edit`.
- **Backend:** schema & `toInput` menerima field C1 (sebelumnya dibuang zod).
- Sisa manual: uji browser halaman form (semua tipe & opsi lanjutan).

---

## 5. Definition of Done
1. Dialog **lengkap**: semua tipe (percent/amount/tiered) & semua field C1 bisa diisi.
2. Tampilan **proper**: header berikon, section bergrup, pratinjau live, footer ringkas.
3. a11y & mobile OK; focus-trap & aria terjaga.
4. `tsc`/`lint`/semua `test:*`/`build` hijau; backward-compatible.

