# Perbaikan Menu "Kelola Pesanan" (`/admin/orders`) — Audit & Remediasi Gap

> **Status: ✅ SELESAI (kode).** Audit mandiri atas upgrade O0–O8; seluruh temuan
> G1–G23 diperbaiki. Fokus: temukan & perbaiki **fitur yang tidak jalan / tidak
> sesuai** di menu pesanan. Disusun & dieksekusi: 2026-10-11.

---

## 0. Ringkasan

Audit menyeluruh atas `/admin/orders` menemukan sejumlah gap: satu **bug kritis**
yang membuat filter keamanan operasional tak pernah berfungsi, satu **fitur hilang**
(hapus pesanan tunggal), serta beberapa **inkonsistensi fungsional** (bulk vs single,
ekspor, refresh, riwayat email).

## 1. Daftar Temuan (terverifikasi dari kode)

### P0 — Kritis / fungsional rusak
- **G1 — Filter "Hanya yang butuh perhatian" rusak total.** `ordersFilterToParams`
  (`src/lib/orders-filter-pure.ts:155`) menulis `attention=1`; API GET
  (`src/app/api/admin/orders/route.ts:110`) memakai `?attention=1` sebagai **mode
  ringkasan** dan `return` lebih dulu → klien menerima objek `{attention}` bukan
  daftar. Akibat: filter, tombol "Lihat semua", dan semua chip panel attention
  tidak pernah menampilkan daftar.
- **G2 — Aksi Hapus pesanan tunggal hilang dari UI.** Endpoint `DELETE` & klien
  `deleteOrderAdmin` ada, tetapi `OrderActionsBar` (`order-detail-dialog.tsx`)
  tak punya tombol Hapus; `delete-one` (`orders-manager.tsx:86`) = dead code.

### P1 — Perilaku tidak sesuai
- **G3 — Bulk ubah status tidak kirim email & tidak catat timeline** (single PATCH
  melakukannya). `route.ts:364-396`.
- **G4 — Ekspor CSV hanya halaman aktif** meski tombol berlabel "Ekspor hasil filter".
  `orders-manager.tsx:189-197`.
- **G5 — Dialog detail tidak refresh** setelah aksi (data basi). `orders-manager.tsx:81`.
- **G6 — Timeline tidak refresh** setelah aksi. `order-timeline.tsx:40-49`.
- **G7 — `listOrderEmails` tanpa `orderBy`** → riwayat email bisa salah/kehilangan
  entri terbaru. `email-status.ts:154-159`.

### P2 — Bug logika & UX
- **G8 — Bulk resend loop klien** (non-atomik, error ditelan, tanpa audit).
  `orders-manager.tsx:220-232`.
- **G9 — Bulk delete non-atomik** (restore kupon lalu delete terpisah; tanpa guard
  rollback seperti DELETE single). `route.ts:403-410`.
- **G10 — Pencarian dikirim tiap keystroke** (tanpa debounce). `orders-toolbar.tsx:69`.
- **G11 — Chip attention di panel semua memanggil filter generik yang sama.**
  `orders-manager.tsx:267`.
- **G12 — Dropdown bulk menampilkan semua status** (bukan hanya transisi valid).
  `orders-bulk-bar.tsx:64`.
- **G13 — Ubah status ke final tanpa konfirmasi.** `order-detail-dialog.tsx:355`.
- **G14 — `resetFilter` mempertahankan `q`** padahal berlabel "Reset filter".
  `orders-toolbar.tsx:299`.
- **G15 — Gagal fetch email/aktivitas tampil sebagai "kosong"** (menyesatkan).
  `order-detail-dialog.tsx:138`; `order-timeline.tsx:43`.
- **G16 — `attempt` resend salah** (filter `e.kind === kind` padahal log `kind:"resend"`).
  `route.ts:544-546`.

### P3 — Konsistensi & a11y
- **G17 — Label status beda**: kartu ringkasan "Perlu Konfirmasi" vs badge
  "Menunggu Konfirmasi" (`orders-manager.tsx:50`).
- **G18 — Warna status kembar**: `menunggu_bayar` & `diproses` (amber);
  `dibayar` & `selesai` (emerald). `order-types.ts:42-46`.
- **G19 — A11y**: baris tabel klik tanpa keyboard (`orders-table.tsx:97`);
  dialog tanpa focus-trap (`order-detail-dialog.tsx:65`); dropdown bulk tanpa
  `aria-haspopup/expanded` (`orders-bulk-bar.tsx:51`).
- **G20 — `AttentionChips` menampilkan label panjang sbg teks chip** → baris tabel
  melar. `order-status-badge.tsx:89`.
- **G21 — `FulfillmentChip`**: variabel `Instan` berisi ikon Truck; order lama
  tanpa `fulfillment` default "Instan". `order-status-badge.tsx:61`.
- **G22 — `OrderStatusBadge` tanpa fallback** (beda dgn `PaymentStatusBadge`).
- **G23 — Kartu: tombol "Detail" & "Buka" ke URL sama.** `order-card.tsx:92,108`.

---

## 2. Rencana Perbaikan

### Fase F1 — P0 (kritis)
- [x] G1: pisahkan param filter attention dari mode ringkasan (klien mengirim
  `attentionFilter=1` untuk daftar; `?attention=1` tetap untuk ringkasan).
- [x] G2: tambah tombol **Hapus** di `OrderActionsBar` + konfirmasi; wire `delete-one`.

### Fase F2 — P1
- [x] G3: bulk status → kirim email + `addOrderActivity` (samakan dgn single).
- [x] G4: ekspor CSV mengambil **seluruh hasil filter** dari server + kolom kaya.
- [x] G5: dialog refresh `order` setelah aksi.
- [x] G6: timeline refresh via `refreshKey`.
- [x] G7: `listOrderEmails` pakai `orderBy("atISO","desc")`.

### Fase F3 — P2
- [x] G8: bulk resend → server (`op:"resend"`, atomik + audit + skipped).
- [x] G9: bulk delete → guard rollback (hapus dulu, baru restore kuota).
- [x] G10: debounce `q` (300ms).
- [x] G11: chip attention memfilter per-alasan (`attentionReason`).
- [x] G12: dropdown bulk hanya transisi valid (irisan order terpilih).
- [x] G13: konfirmasi untuk transisi final.
- [x] G14: `resetFilter` bersihkan `q`.
- [x] G15: bedakan "gagal memuat" vs "kosong".
- [x] G16: `attempt` dihitung dari resend sebelumnya.

### Fase F4 — P3
- [x] G17/G18: samakan label & bedakan warna status.
- [x] G19: focus-trap dialog, keyboard baris tabel, aria dropdown.
- [x] G20/G21/G22/G23: chip ringkas, nama variabel, fallback badge, dedup kartu.

### Fase F5 — QA & dokumentasi
- [x] Tambah test murni untuk regresi (attention round-trip, `attentionFilter`).
- [x] Gate: `tsc`/`eslint`/semua `test:*`/`build`.
- [x] Update `TASK-SELANJUTNYA.md` & `docs/README.md`.

---

## 3. Hasil

**Status: ✅ SELESAI (kode).** Seluruh temuan G1–G23 diperbaiki.

### Gate
- `npx tsc --noEmit` bersih ✅
- `npx eslint .` bersih ✅
- Semua `test:*` hijau ✅ (`test:orders` **24** — 2 test baru untuk F-G1)
- `npm run build` sukses ✅ (72 halaman)

### Perubahan kunci
- **F-G1** — filter "butuh perhatian" memakai param `attentionFilter=1`
  (`orders-filter-pure.ts`); `?attention=1` tetap untuk mode ringkasan API.
  Filter **kini benar-benar berfungsi** (sebelumnya selalu mengembalikan objek
  ringkasan, bukan daftar).
- **F-G2** — tombol **Hapus** ditambahkan di `OrderActionsBar` (dialog & halaman
  detail) dengan `ConfirmDialog`; hapus single tinggal menavigasi ke daftar
  (halaman) / menutup dialog. `delete-one` dead code dibuang.
- **F-G3** — helper bersama `applyStatusChangeEffects()` +
  `queueBuyerStatusNotifications()` dipakai aksi tunggal **dan** massal →
  timeline + email + WhatsApp konsisten.
- **F-G4** — `GET /api/admin/orders?export=1` mengembalikan seluruh hasil filter;
  tombol Ekspor (tanpa seleksi) memakai ini. Dengan seleksi → hanya yang terpilih.
- **F-G5/G6** — dialog & halaman detail menyegarkan order + timeline setelah aksi.
- **F-G7** — `listOrderEmails` memakai `orderBy("atISO","desc")` (fallback aman).
- **F-G8** — bulk resend via server `op:"resend"` (atomik per-order, audit,
  `skipped`, catat aktivitas `email`).
- **F-G9** — bulk delete: hapus dulu lalu restore kuota (cegah kebocoran kuota).
- **F-G10** — pencarian di-debounce 300ms.
- **F-G11** — chip panel attention memfilter alasan spesifik (`attentionReason`).
- **F-G12** — dropdown status bulk hanya menampilkan transisi valid (irisan).
- **F-G13** — transisi ke status final minta konfirmasi.
- **F-G14** — "Reset filter" mengosongkan pencarian juga.
- **F-G15** — gagal memuat email/aktivitas ditampilkan beda dari kosong.
- **F-G16** — `attempt` resend dihitung dari entri `kind:"resend"` sebelumnya (+1).
- **F-G17/G18** — label "Menunggu Konfirmasi" seragam; warna `diproses` (indigo)
  & `selesai` (teal) dibedakan dari `menunggu_bayar`/`dibayar`.
- **F-G19** — focus-trap dialog (`useDrawerFocus`), baris tabel dpt fokus +
  Enter/Space, dropdown bulk `aria-haspopup/expanded` + tutup klik-luar/Escape.
- **F-G20/G21/G22/G23** — chip attention ringkas + tooltip; `FulfillmentChip`
  variabel ikon benar; `OrderStatusBadge` fallback; kartu: "Detail cepat" (dialog)
  vs "Buka halaman" (URL) — tak lagi duplikat.

### Sisa manual
- Uji browser desktop/mobile (filter attention, hapus single, bulk status/resend,
  ekspor seluruh filter, dialog refresh, konfirmasi status final).
