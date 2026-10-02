# HALAMAN ADMIN ORDERS (PESANAN) — Audit, Rencana & Task Implementation Flow

> **Status dokumen:** ✅ **Dieksekusi** (FASE 0–7 selesai — sisa: uji manual browser & deploy)
> **Disusun:** 2026-10-02 · **Dieksekusi:** 2026-10-02
> **Cakupan:** Membangun modul **Pesanan (Orders) admin** dari nol — halaman, API, notifikasi, dashboard metrik. Ini **fitur besar #1** prioritas berikutnya.
> **Tujuan:** Admin dapat **melihat, memfilter, mengubah status, dan mengekspor** pesanan yang masuk dari checkout produk — yang saat ini **sama sekali tidak bisa diakses admin** (hanya terlihat oleh pembeli di `/akun`).
> **Prasyarat baca:** `docs/2026-10-02-sidebar-dashboard-upgrade.md` (pola shell/sidebar terbaru), `AUDIT-DAN-RENCANA-UPGRADE-DASHBOARD.md`, `docs/README.md`.
> **Hasil eksekusi & verifikasi:** lihat [§14 Status Eksekusi](#14-status-eksekusi).

---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Latar Belakang & Kondisi Saat Ini](#2-latar-belakang--kondisi-saat-ini)
3. [Audit Orders — Temuan](#3-audit-orders--temuan)
4. [Keputusan Desain & Scope](#4-keputusan-desain--scope)
5. [Spesifikasi Teknis (API, Data, UI)](#5-spesifikasi-teknis-api-data-ui)
6. [Arsitektur Implementasi](#6-arsitektur-implementasi)
7. [TASK IMPLEMENTATION FLOW (FASE 0–7)](#7-task-implementation-flow-fase-07)
8. [Definition of Done & Checklist QA](#8-definition-of-done--checklist-qa)
9. [Risiko & Mitigasi](#9-risiko--mitigasi)
10. [Out of Scope](#10-out-of-scope)
11. [Estimasi & Urutan Pengerjaan](#11-estimasi--urutan-pengerjaan)
12. [Roadmap Sesi Berikutnya (Gambaran Besar)](#12-roadmap-sesi-berikutnya-gambaran-besar)
13. [Lampiran — Referensi Pola Existing](#13-lampiran--referensi-pola-existing)
14. [Status Eksekusi](#14-status-eksekusi)

---

## 1. Ringkasan Eksekutif

Website LKTech punya **toko produk** (`/produk`, `/keranjang`) dengan alur checkout yang **sudah lengkap dan aman**: server memverifikasi login, menghitung ulang harga dari Firestore, menyimpan pesanan ke koleksi `orders`, dan mengembalikan pesan WhatsApp kanonik untuk dikirim ke admin (`src/app/api/orders/route.ts`, `src/lib/orders.ts`).

**Masalahnya:** sisi admin **tidak punya cara apa pun** untuk melihat pesanan itu. Tidak ada halaman `/admin/orders`, tidak ada `src/app/api/admin/orders/**`, tidak ada notifikasi. Admin hanya tahu ada pesanan jika **pembeli mengirim WhatsApp** — dan sepenuhnya bergantung pada itu. Riwayat pesanan hanya terlihat oleh pembeli di `/akun`.

Artinya: **fitur sudah 80% jadi di backend, tapi 0% di sisi admin.** Dokumen ini merancang 20%-nya yang hilang dengan kualitas yang sama tingginya dengan modul Media (yang paling matang di dashboard).

**Hasil yang diharapkan:**
1. Halaman `/admin/orders` — daftar pesanan + filter status + pencarian + detail item + ubah status + ekspor CSV.
2. API admin `GET/PATCH /api/admin/orders` dengan guard `requireAdmin`.
3. **Badge "pesanan baru"** di sidebar (menyusul pola badge lead) + notifikasi **email** saat order masuk.
4. Metrik pesanan di **dashboard overview** (order baru, total omzet, dll).
5. Rantai `store → dashboard → notifikasi` lengkap dan konsisten dengan modul lain.

---

## 2. Latar Belakang & Kondisi Saat Ini

### 2.1 Yang SUDAH ada (backend lengkap)

| Aset | Lokasi | Status |
|---|---|---|
| Tipe & normalizer order | `src/lib/order-types.ts` (`ORDER_STATUSES`, `Order`, `normalizeOrder`) | ✅ Lengkap |
| Data layer server | `src/lib/orders.ts` (`createOrder`, `getOrdersByUser`) | ✅ (kurang `getAllOrders`) |
| Schema validasi | `src/lib/order-schema.ts` | ✅ |
| Endpoint checkout | `src/app/api/orders/route.ts` — `POST` (buat) + `GET` (milik user) | ✅ |
| Klien checkout | `src/lib/order-api.ts` (`createOrderRequest`, `fetchMyOrders`) | ✅ |
| Riwayat pembeli | `src/app/akun/page.tsx` → `user-account.tsx` | ✅ |
| Firestore rules | `firestore.rules` — `orders` sudah di daftar koleksi | ✅ (rules tolak semua akses klien; Admin SDK lolos) |

### 2.2 Yang BELUM ada (celah)

| Celah | Bukti |
|---|---|
| Halaman `/admin/orders` | Tidak ada di `src/app/admin/(dashboard)/**` |
| API admin orders | Tidak ada `src/app/api/admin/orders/**` |
| `getAllOrders()` | `src/lib/orders.ts` hanya `getOrdersByUser` |
| Badge/notifikasi order | Hanya lead yang punya (`use-lead-badge.ts`, email Resend lead) |
| Metrik order di dashboard | `dashboard-overview.tsx` hanya lead |
| Ubah status order | Status dikelola **manual via WhatsApp** saja (`order-types.ts:1`) |
| Item nav "Pesanan" | `src/lib/admin-nav.ts` belum ada |

### 2.3 Model data Order (referensi)

```ts
type Order = {
  id: string;
  uid: string;              // uid Firebase pembeli
  buyerName: string;
  buyerEmail: string;       // dari token terverifikasi (anti-palsu)
  items: OrderItem[];       // slug, name, price, qty, subtotal, variant?
  total: number;            // Rupiah, dihitung server
  status: "baru" | "diproses" | "selesai" | "dibatalkan";
  whatsapp: string;         // nomor tujuan checkout
  message: string;          // pesan WA kanonik (audit / ulang kirim)
  createdAt: string;        // ISO
};
```

---

## 3. Audit Orders — Temuan

Format: **[ID] Judul** — *Severity* — Lokasi — Dampak — Rekomendasi.
Severity: 🔴 Tinggi · 🟠 Menengah · 🔵 Rendah.

---

**[OR-01] Admin tidak bisa melihat pesanan sama sekali** — 🔴 Tinggi
- **Lokasi:** ketiadaan `src/app/admin/(dashboard)/orders/**`; `src/lib/orders.ts` tanpa `getAllOrders`.
- **Dampak:** Pesanan yang sudah dibayar/disepakati hanya diketahui lewat WhatsApp pembeli. Tidak ada satu pun daftar, tidak ada verifikasi pesanan masuk. Risiko pesanan terlewat tinggi.
- **Rekomendasi:** Bangun halaman `/admin/orders` + `GET /api/admin/orders` (guard `requireAdmin`) + `getAllOrders()`.

---

**[OR-02] Status pesanan tidak bisa diubah dari dashboard** — 🔴 Tinggi
- **Lokasi:** `order-types.ts:1` (komentar "dikelola manual via WhatsApp"); tidak ada endpoint PATCH.
- **Dampak:** Tracking status (baru → diproses → selesai) bergantung ingatan/chat. Tidak ada sumber kebenaran status.
- **Rekomendasi:** `PATCH /api/admin/orders` (ubah `status`) + UI kontrol status (meniru pola `updateLeadStatus` di `leads-manager`).

---

**[OR-03] Tidak ada notifikasi pesanan baru** — 🟠 Menengah
- **Lokasi:** `orders/route.ts:200-213` (hanya `createOrder` + `incrementUserOrderCount`); email Resend hanya dipakai untuk lead (`email-notifier`, env `LEAD_NOTIFY_EMAILS`).
- **Dampak:** Admin tidak tahu ada order baru sampai pembeli menghubungi. Konversi bisa hilang.
- **Rekomendasi:** Kirim email ke admin saat `POST /api/orders` sukses (reuse infrastruktur Resend/`sendLeadNotification`-style) + badge sidebar (OR-04).

---

**[OR-04] Tidak ada badge "pesanan baru" di sidebar** — 🟠 Menengah
- **Lokasi:** `src/lib/admin-nav.ts` (badge hanya `newLeads`); `use-lead-badge.ts`.
- **Dampak:** Inkonsistensi — lead punya badge, order (yang lebih bernilai uang) tidak.
- **Rekomendasi:** Generalisasi badge: tambah `kind: "newOrders"` + hook/endpoint ringkas `GET /api/admin/orders?summary=1`.

---

**[OR-05] Dashboard overview "berat sebelah" ke lead** — 🟠 Menengah
- **Lokasi:** `dashboard-overview.tsx` (hanya fetch `leads`).
- **Dampak:** Pemilik tidak melihat metrik bisnis penting: order baru, total omzet, status proses.
- **Rekomendasi:** Tambah kartu metrik order (Total Pesanan, Baru, Diproses, Omzet) + opsional grafik tren order.

---

**[OR-06] Tidak ada ekspor / pencarian / filter pesanan** — 🟠 Menengah
- **Lokasi:** belum ada halaman.
- **Rekomendasi:** Search (nama/email/id), filter status (semua/baru/diproses/selesai/dibatalkan), sort terbaru, **ekspor CSV** (meniru `exportLeadsToCsv`).

---

**[OR-07] Tidak ada detail item pesanan yang rapi** — 🟠 Menengah
- **Lokasi:** `OrderItem[]` ada di data tapi belum ada UI admin.
- **Rekomendasi:** Panel/tabel detail item (nama, varian, harga, qty, subtotal) + total + info pembeli + tombol **kirim ulang WhatsApp** (pakai field `message`/`whatsapp` yang sudah tersimpan).

---

**[OR-08] Pagination tidak ada (koleksi order memuat semua)** — 🟠 Menengah (konsisten dgn `LO-13`)
- **Lokasi:** pola umum manager lain.
- **Rekomendasi:** Untuk order, muat dengan **limit + cursor** (mis. 25/halaman) sejak awal, karena volume order akan bertumbuh. (Bisa disederhanakan dulu: limit N terbaru + "muat lagi".)

---

**[OR-09] `updatedBy`/audit status order tidak dicatat** — 🔵 Rendah
- **Lokasi:** `PATCH` lead mencatat `updatedBy` (`leads/route.ts`), order belum ada mekanisme.
- **Rekomendasi:** Saat PATCH status order, simpan `updatedAtISO` + `updatedBy`.

---

**[OR-10] Order tidak punya nomor/identitas ramah-manusia** — 🔵 Rendah
- **Lokasi:** `Order.id` = id dokumen Firestore (panjang).
- **Dampak:** Sulit dibaca saat dikomunikasikan ("pesanan #a1b2c3...").
- **Rekomendasi:** Opsional tampilkan **kode pendek** (mis. 8 karakter pertama uppercase: `#A1B2C3D4`) sebagai label display.

### 3.1 Ringkasan temuan

| ID | Temuan | Severity | Fase |
|---|---|---|---|
| OR-01 | Admin tak bisa lihat pesanan | 🔴 | F2 |
| OR-02 | Status tak bisa diubah | 🔴 | F3 |
| OR-03 | Tanpa notifikasi order | 🟠 | F4 |
| OR-04 | Tanpa badge order baru | 🟠 | F4 |
| OR-05 | Dashboard hanya lead | 🟠 | F5 |
| OR-06 | Tanpa search/filter/ekspor | 🟠 | F3 |
| OR-07 | Tanpa detail item rapi | 🟠 | F3 |
| OR-08 | Tanpa pagination | 🟠 | F2 |
| OR-09 | Tanpa jejak `updatedBy` | 🔵 | F3 |
| OR-10 | Tanpa nomor ramah-manusia | 🔵 | F3 |

---

## 4. Keputusan Desain & Scope

### 4.1 Keputusan

| # | Keputusan | Alasan | Alternatif ditolak |
|---|---|---|---|
| D1 | **Halaman `/admin/orders`** (manager terpisah), bukan tab di halaman lain | Order adalah entitas berdiri sendiri dgn volume tumbuh; layak menu sendiri. | Tab di `/admin/products` (mencampur domain) |
| D2 | **API admin baru** `src/app/api/admin/orders/route.ts` (GET list + summary, PATCH status, DELETE opsional) | Konsisten dgn `api/admin/leads`; guard `requireAdmin` terpusat. | Reuse `api/orders` (dibatasi user pemilik — tak bisa admin) |
| D3 | **Ubah status dari dashboard** jadi sumber kebenaran | Butuh tracking; WhatsApp tetap jadi kanal komunikasi, bukan status. | Tetap manual WhatsApp |
| D4 | **Notifikasi email order** reuse infrastruktur Resend existing | Infrastruktur sudah ada (lead email); tambah template order. | Notifikasi in-app penuh (overkill tahap ini) |
| D5 | **Badge sidebar** digeneralisasi (dukung `newLeads` + `newOrders`) | Satu mekanisme, dua pemakaian; hindari duplikasi hook. | Hook terpisah per entitas (duplikasi) |
| D6 | **Pagination limit + "muat lagi"** (cursor sederhana) | Koleksi order akan tumbuh; pola Media sudah ada | Muat semua (gagal jangka panjang) |
| D7 | **Format Rupiah** via util `Intl.NumberFormat` reuse | Banyak tempat butuh format konsisten | Format manual per tempat |
| D8 | **Tanpa role/permission** (single admin) | Di luar scope; `ADMIN_EMAILS` cukup | RBAC (sesi terpisah) |

### 4.2 Scope

**In-scope (sesi ini):**
- Halaman `/admin/orders` (list, filter, search, sort, pagination, detail, ubah status, ekspor CSV).
- API `/api/admin/orders` (GET list + `?summary=1`, PATCH status).
- Data layer `getAllOrders()` / `getOrdersPage()` di `src/lib/orders.ts`.
- Item nav + badge baru di sidebar (`newOrders`).
- Notifikasi email order baru.
- Metrik order di dashboard overview.

**Out-of-scope:** lihat [§10](#10-out-of-scope).

---

## 5. Spesifikasi Teknis (API, Data, UI)

### 5.1 API — `src/app/api/admin/orders/route.ts` (BARU)

```
GET /api/admin/orders
  Auth  : requireAdmin
  Query : ?status=baru|diproses|selesai|dibatalkan|semua
          ?q=<string>            (cari nama/email/id)
          ?limit=<1..100>        (default 25)
          ?cursor=<orderId|ISO>  (untuk "muat lagi")
  Res   : 200 { orders: Order[], nextCursor: string | null }
  Header: Cache-Control: no-store

GET /api/admin/orders?summary=1
  Auth  : requireAdmin
  Res   : 200 { summary: { total, baru, diproses, selesai, dibatalkan, omzet } }
  Catatan: pakai Firestore count() aggregation per status (tanpa tarik dokumen),
           + total omzet dari `total` (sum aggregation bila tersedia, else
           hitung saat daftar dimuat & cache di server memori jangka pendek).
  Header: Cache-Control: no-store

PATCH /api/admin/orders
  Auth  : requireAdmin
  Body  : { id: string, status: OrderStatus }
  Res   : 200 { ok: true }
  Efek  : update status + updatedAtISO + updatedBy (email admin)

DELETE /api/admin/orders?id=<id>       (opsional — konfirmasi keras)
  Auth  : requireAdmin
  Res   : 200 { ok: true }
```

**Catatan implementasi:** untuk pencarian `q` pada nama/email, Firestore tidak mendukung substring search. Strategi pragmatis (sama seperti lead): **fetch berdasarkan filter status + limit, lalu filter `q` di memori** pada hasil halaman. Untuk dataset awal ini memadai; bila volume besar, catat sebagai peningkatan (prefix search via field lowercase, atau endpoint search algolia-like) — **out of scope**.

### 5.2 Data layer — `src/lib/orders.ts` (TAMBAH)

```ts
import "server-only";
// ... existing createOrder, getOrdersByUser

/** Rentang paginasi default halaman admin. */
export const ORDERS_PAGE_SIZE = 25;

export type OrdersQuery = {
  status?: OrderStatus | "semua";
  cursor?: string | null;   // createdAtISO dokumen terakhir yg sudah dimuat
  limit?: number;
};

/** Daftar semua order (admin), terbaru dulu, dengan cursor pagination. */
export async function getOrdersPage(q: OrdersQuery = {}): Promise<{
  orders: Order[];
  nextCursor: string | null;
}> { /* Firestore: orderBy createdAtISO desc, startAfter(cursor), limit+1 */ }

/** Ringkasan jumlah per status (badge/metrik) — count aggregation. */
export async function getOrdersSummary(): Promise<{
  total: number; baru: number; diproses: number; selesai: number;
  dibatalkan: number; omzet: number;
}> { /* count() per status; omzet: sum via aggregation atau loop terkendali */ }

/** Ubah status order + catat updater. */
export async function updateOrderStatus(
  id: string, status: OrderStatus, updatedBy: string,
): Promise<void> { /* update({ status, updatedAtISO, updatedBy }) */ }

export async function deleteOrder(id: string): Promise<void> { /* opsional */ }
```

### 5.3 Status & label (reuse pola lead)

Tambah ke `src/lib/order-types.ts` (atau file terpisah) agar konsisten dengan `LEAD_STATUS_LABEL`/`LEAD_STATUS_STYLE`:

```ts
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  baru: "Baru", diproses: "Diproses", selesai: "Selesai", dibatalkan: "Dibatalkan",
};
export const ORDER_STATUS_STYLE: Record<OrderStatus, string> = {
  baru: "bg-blue-50 text-blue-600 border-blue-100",
  diproses: "bg-amber-50 text-amber-600 border-amber-100",
  selesai: "bg-emerald-50 text-emerald-600 border-emerald-100",
  dibatalkan: "bg-slate-100 text-slate-500 border-slate-200",
};
```

### 5.4 UI — Halaman `/admin/orders`

```
src/app/admin/(dashboard)/orders/page.tsx
  metadata: { title: "Pesanan" }
  <h1>Pesanan</h1>
  <p>Kelola pesanan yang masuk dari checkout produk.</p>
  <OrdersManager />
```

**`OrdersManager` (komponen klien):**
- **Header aksi**: kartu ringkasan kecil (Total / Baru / Diproses / Omzet) — opsional ringkas.
- **Toolbar**: input cari (nama/email/kode), dropdown filter status, tombol **Ekspor CSV**, tombol **Muat ulang**.
- **Daftar order** (kartu responsif, mirip `leads-manager`):
  - Baris: avatar inisial pembeli, nama, email, **kode order** (`#A1B2C3D4`), waktu, badge status, total (Rp), jumlah item.
  - Aksi cepat: ubah status (dropdown inline) + tombol **detail**.
- **Detail order** (dialog/panel, reuse pola `media-detail-panel` atau `ConfirmDialog`-style):
  - Info pembeli (nama, email, uid).
  - Tabel item: nama, varian, harga, qty, subtotal.
  - Total.
  - Tombol **Kirim WhatsApp** (buka `wa.me/<whatsapp>?text=<message>` — field tersimpan) + **Salin pesan**.
  - Tombol hapus (opsional, dengan `ConfirmDialog`).
- **Empty state**: bedakan "belum ada pesanan" vs "tidak cocok filter" (pola `leads-manager`).
- **Loading**: spinner + (opsional) skeleton (menyusul fase konsistensi UX).
- **Pagination**: tombol "Muat lagi" di bawah (cursor), atau infinite scroll ala Media.
- **Toast + ConfirmDialog + guard** sesuai standar.

**Badge sidebar:** `admin-nav.ts` → item "Pesanan" dengan `badge: "newOrders"`. `sidebar-item.tsx` sudah generik (`LeadBadgeKind`) — cukup **rename tipe** `LeadBadgeKind` → `NavBadgeKind` dan tambah `"newOrders"` + aria text (`BADGE_ARIA`).

### 5.5 Notifikasi email order

- Buat util di `src/lib/email.ts` (atau di file notifier existing) `sendOrderNotification(order)`.
- Panggil best-effort di `POST /api/orders` setelah `createOrder` sukses (`.catch(log)`), **tanpa** menggagalkan order.
- Env: reuse `RESEND_API_KEY`, `EMAIL_FROM`, `LEAD_NOTIFY_EMAILS` (atau tambah `ORDER_NOTIFY_EMAILS` bila ingin pemisahan; fallback ke `LEAD_NOTIFY_EMAILS`).

### 5.6 Format util

Tambah `src/lib/format.ts` (atau gunakan yang ada bila sudah ada):
```ts
export function formatRupiah(n: number): string { return "Rp" + n.toLocaleString("id-ID"); }
export function shortOrderCode(id: string): string { return "#" + id.slice(0, 8).toUpperCase(); }
```
> Cek dulu apakah sudah ada util serupa di `src/lib` (mis. `whatsapp.ts`, produk) agar tidak duplikat.

---

## 6. Arsitektur Implementasi

### 6.1 Struktur file

```
src/
├─ lib/
│  ├─ orders.ts                    ✎ TAMBAH getAll/getPage/summary/updateStatus/delete
│  ├─ order-types.ts               ✎ TAMBAH ORDER_STATUS_LABEL/STYLE
│  ├─ order-api.ts                 ✎ (opsional) TAMBAH fetchOrdersAdmin/updateOrderStatusAdmin
│  ├─ admin-orders-api.ts          ★ BARU (klien API admin: list, summary, patch, export)
│  ├─ email.ts / order-notify.ts   ★ BARU (sendOrderNotification) — atau perluas email existing
│  └─ format.ts                    ★ BARU bila belum ada (formatRupiah, shortOrderCode)
├─ app/api/admin/orders/route.ts   ★ BARU (GET list+summary, PATCH, DELETE)
├─ app/api/orders/route.ts         ✎ panggil sendOrderNotification (best-effort)
├─ app/admin/(dashboard)/orders/
│  └─ page.tsx                     ★ BARU (metadata + <OrdersManager/>)
├─ components/admin/
│  └─ orders-manager.tsx           ★ BARU (list/filter/search/detail/status/export)
└─ lib/admin-nav.ts                ✎ tambah grup "Toko"/item "Pesanan" + badge newOrders
```

### 6.2 Badge generik (refactor kecil)

- `sidebar-item.tsx`: `type LeadBadgeKind` → `NavBadgeKind = "newLeads" | "newOrders"`; `BADGE_ARIA` tambah `newOrders: (n) => \`${n} pesanan baru\``.
- `admin-nav.ts`: `badge?: NavBadgeKind`.
- `use-lead-badge.ts` → generalisasi jadi `use-nav-badges.ts` yang mengambil summary lead **dan** order (2 request paralel, polling 60s). ATAU buat `use-order-badge.ts` terpisah yang tipis.
  - **Rekomendasi:** satu hook `useAdminBadges()` mengembalikan `{ newLeads, newOrders }` — memanggil `/api/admin/leads?summary=1` & `/api/admin/orders?summary=1` paralel.
- `admin-shell.tsx`: `badges={{ newLeads, newOrders }}`.

### 6.3 Navigasi

`ADMIN_NAV` — tambah grup/item. Opsi:
- **Opsi A (dipilih):** grup baru **"Toko"** berisi `Produk` + `Pesanan`. (Produk dipindah dari grup "Konten Website").
- Opsi B: tambahkan "Pesanan" ke grup yang ada.
> Memindahkan "Produk" ke grup "Toko" lebih logis (katalog + order). Dampak kecil: urutan menu sedikit berubah.

### 6.4 Diagram alur

```
Pembeli checkout (/keranjang)
   │ POST /api/orders  (verifikasi harga server)
   ▼
createOrder() ──► Firestore orders/{id}
   │                    │
   ├─ sendOrderNotification()  (best-effort email admin)   ← F4
   └─ (WhatsApp kanonik ke pembeli, existing)

Admin:
   /admin/orders ──► GET /api/admin/orders ──► getOrdersPage()   ← F2/F3
        │  PATCH status ──► updateOrderStatus()                    ← F3
        │  ?summary=1 ──► getOrdersSummary() ──► badge sidebar     ← F4
        └─ metrik di /admin (overview)                              ← F5
```

---

## 7. TASK IMPLEMENTATION FLOW (FASE 0–7)

> Tiap fase berdiri sendiri, bisa dites, commit terpisah (gaya repo `feat(orders): ...`).

### FASE 0 — Persiapan & baseline (±15 menit)
- [ ] Baca dokumen ini + `docs/2026-10-02-sidebar-dashboard-upgrade.md`.
- [ ] `npx tsc --noEmit` bersih, `npm run lint` bersih, `npm run build` sukses (baseline).
- [ ] Pastikan minimal 1 order uji ada di Firestore (buat via checkout `/keranjang` saat login user) — untuk uji manual. (Tidak wajib untuk coding.)

### FASE 1 — Data layer & tipe (±1 jam)
- [ ] `order-types.ts`: tambah `ORDER_STATUS_LABEL` + `ORDER_STATUS_STYLE`.
- [ ] `orders.ts`: tambah `getOrdersPage()`, `getOrdersSummary()`, `updateOrderStatus()`, `deleteOrder()`.
- [ ] `format.ts`: `formatRupiah()` + `shortOrderCode()` (cek dulu util existing).
- [ ] Verifikasi `count()` aggregation untuk status (pola sama seperti `api/admin/leads?summary=1`).
- **DoD:** `tsc` bersih; fungsi bisa dipanggil dari script uji cepat (opsional).

### FASE 2 — API admin orders (±1.5 jam)
- [ ] `src/app/api/admin/orders/route.ts`: `GET` (list + filter + limit/cursor), `GET?summary=1`, `PATCH`, `DELETE`.
  - `runtime = "nodejs"`, `dynamic = "force-dynamic"`.
  - Guard `requireAdmin` di semua method.
  - `Cache-Control: no-store` untuk respons data.
- [ ] `admin-orders-api.ts`: `fetchOrdersAdmin(query)`, `fetchOrdersSummary()`, `updateOrderStatusAdmin(id, status)`, `deleteOrderAdmin(id)`, `exportOrdersToCsv(orders)` (meniru `admin-api.ts`).
- **DoD:** endpoint bisa dites via fetch ber-token (401 tanpa auth; 200 dengan admin).

### FASE 3 — Halaman & manager (±3–4 jam) — *inti*
- [ ] `(dashboard)/orders/page.tsx` + metadata `{ title: "Pesanan" }`.
- [ ] `orders-manager.tsx`:
  - List kartu + toolbar (search, filter status, ekspor CSV, muat ulang).
  - Ubah status inline (optimistic + rollback, meniru `leads-manager`).
  - Detail order (dialog/panel): info pembeli, tabel item, total, tombol WhatsApp + salin pesan.
  - Kode order pendek `#XXXXXXXX`.
  - Empty state (belum ada vs tidak cocok), loading spinner, pagination "muat lagi".
  - `useToast` + `ConfirmDialog` (untuk hapus).
  - Catat `updatedBy` saat PATCH.
- [ ] `admin-nav.ts`: tambah grup **"Toko"** (Produk + Pesanan).
- **DoD:** bisa melihat, filter, cari, ubah status, ekspor, buka detail — semua dari UI.

### FASE 4 — Badge & notifikasi (±1.5 jam)
- [ ] Refactor badge generik (`NavBadgeKind`, `BadgePill`/`BADGE_ARIA`, `use-admin-badges.ts`).
- [ ] `orders?summary=1` → badge "newOrders" di sidebar.
- [ ] `sendOrderNotification()` + panggil di `POST /api/orders` (best-effort).
- [ ] (Opsional) `EmailNotifier` di `/admin/settings`: tombol uji email order.
- **DoD:** submit order baru → email admin terkirim + badge bertambah ≤60s.

### FASE 5 — Metrik dashboard overview (±1.5 jam)
- [ ] `dashboard-overview.tsx`: tambah kartu order (Total, Baru, Diproses, Omzet).
- [ ] (Opsional) grafik tren order (meniru `LeadTrendChart`).
- **DoD:** dashboard menampilkan metrik order akurat.

### FASE 6 — (Opsional) Peningkatan lanjutan
- [ ] Bulk ubah status (pilih banyak → set status) — pola Media bulk.
- [ ] Filter rentang tanggal + ekspor berdasarkan rentang.
- [ ] Tautan cepat: dari detail order ke `/admin/products` (produk terkait).
- [ ] Ikat order ke data user/pelanggan (lihat riwayat per uid).
> Semua opsional; jangan menghambat FASE 7.

### FASE 7 — QA, dokumentasi & deploy
- [ ] `npx tsc --noEmit` · `npm run lint` · `npm run build` semua bersih.
- [ ] Checklist QA §8.
- [ ] Update dokumen (status ✅), `docs/README.md`, `TASK-SELANJUTNYA.md`.
- [ ] Commit per fase → `git push` → uji produksi (buat order uji, cek muncul di dashboard).

---

## 8. Definition of Done & Checklist QA

### 8.1 DoD global
1. `tsc` bersih, `build` sukses, `lint` bersih (0 error/warning baru).
2. Semua checklist QA lolos.
3. Tidak ada regresi: checkout pembeli, `/akun` riwayat, WhatsApp, guard admin, sidebar.
4. Tidak ada perubahan pada `firestore.rules` yang diperlukan (orders sudah diizinkan via Admin SDK).

### 8.2 Fungsional
- [ ] Order baru dari checkout muncul di `/admin/orders` (terbaru di atas).
- [ ] Filter status benar; pencarian nama/email/kode benar.
- [ ] Ubah status → tersimpan (refresh tetap); badge/metrik ikut berubah.
- [ ] Ekspor CSV memuat kolom relevan (kode, nama, email, item ringkas, total, status, tanggal).
- [ ] Detail order menampilkan semua item + total akurat (cocok dengan yang dilihat pembeli di `/akun`).
- [ ] Tombol WhatsApp membuka `wa.me` dengan pesan kanonik (`message`).
- [ ] Email notifikasi terkirim saat order baru (best-effort tak menggagalkan order).
- [ ] Badge sidebar "Pesanan" bertambah ≤60s; hilang saat status diproses/selesai.

### 8.3 Edge cases
- [ ] Order tanpa item / data rusak → tidak crash (normalizer sudah menangani).
- [ ] Pencarian tanpa hasil → empty state jelas.
- [ ] Pagination "muat lagi" berhenti saat `nextCursor === null`.
- [ ] PATCH tanpa `id`/status invalid → 400.
- [ ] Non-admin (user biasa) tak bisa mengakses API → 401/403.

### 8.4 Regresi
- [ ] Checkout `/keranjang` masih berfungsi.
- [ ] `/akun` riwayat pesanan pembeli masih tampil.
- [ ] Sidebar (rail/drawer/badge lead) masih normal.
- [ ] `.env` tanpa `ORDER_NOTIFY_EMAILS` → fallback tidak error.

---

## 9. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Firestore tanpa substring search → filter `q` lemah | Sedang | Filter di memori pada hasil halaman; catat peningkatan (prefix field lowercase) sebagai roadmap |
| R2 | `omzet` via sum aggregation bisa tak tersedia di versi SDK | Rendah | Cek `aggregate`/`sum`; fallback: hitung dari halaman + cache memori singkat |
| R3 | Email order masuk spam / kuota Resend | Rendah | Reuse pola existing; best-effort; admin tetap punya dashboard |
| R4 | Volume order besar → pagination perlu tuning | Sedang | Limit + cursor sejak awal; jangan muat semua |
| R5 | Refactor badge (rename tipe) menyentuh sidebar yang baru distabilkan | Sedang | Perubahan kecil & teruji; jalankan QA sidebar lagi |
| R6 | Perubahan `POST /api/orders` (tambah notifikasi) mengganggu checkout | Tinggi | Panggil notifikasi **setelah** order tersimpan & `.catch()` — order tidak boleh gagal |
| R7 | Data lama tanpa `updatedAtISO` | Rendah | Tampilkan "-" bila kosong (normalizer toleran) |
| R8 | Timezone pada tanggal | Rendah | Format `id-ID`; simpan ISO (sudah) |

---

## 10. Out of Scope

- **Sistem pembayaran online** (order saat ini = kesepakatan via WhatsApp).
- **Stok/inventaris** otomatis per produk.
- **Refund / pembatalan otomatis** dengan notifikasi pembeli.
- **Notifikasi in-app pusat** (bell) — cukup badge + email untuk sekarang.
- **Role/permission & multi-admin**.
- **Role-based menu** & approval workflow.
- **Search lintas-konten global** di command palette (sesi terpisah — lihat §12).
- **Scheduled publish / versioning** konten.
- Menyatukan pagination/search untuk **semua** manager lain (sesi terpisah — §12).

> Catatan: dua item terakhir adalah rekomendasi sesi berikutnya, **bukan** bagian Orders.

---

## 11. Estimasi & Urutan Pengerjaan

| Fase | Isi | Estimasi * | Nilai |
|---|---|---|---|
| F0 | Persiapan | 15 mnt | — |
| F1 | Data layer & tipe | 1 jam | Fondasi |
| F2 | API admin orders | 1.5 jam | 🔴 Inti |
| F3 | Halaman + manager | 3–4 jam | 🔴 Inti (paling terasa) |
| F4 | Badge & notifikasi | 1.5 jam | 🟠 |
| F5 | Metrik dashboard | 1.5 jam | 🟠 |
| F6 | Peningkatan (opsional) | ±2 jam | ✨ |
| F7 | QA & deploy | 1–2 jam | Wajib |

**Total inti (F0–F5, F7):** ± 10–12 jam kerja terfokus.
**Bila waktu hanya 1 sesi:** F0–F3 sudah memberi nilai terbesar (admin akhirnya bisa **melihat & mengelola** pesanan). F4–F5 menyusul.

---

## 12. Roadmap Sesi Berikutnya (Gambaran Besar)

Hasil audit menunjukkan urutan prioritas berikut (setelah Orders). **Disarankan satu fitur besar per sesi** agar tuntas & berkualitas.

| Prioritas | Fitur | Ringkas | Nilai |
|---|---|---|---|
| **1 (ini)** | **Halaman Orders admin** | Lihat/kelola pesanan | 🔴 Bisnis |
| **2** | **UX tabel koleksi seragam** | Pagination + search + filter + sort + bulk di Produk/Artikel/Portofolio/Layanan (generalisasi pola Media) | 🟠 Skalabilitas |
| **3** | **Search lintas-konten di command palette** | `Cmd+K` mencari lead/produk/artikel/media/order, bukan hanya menu | 🟠 Produktivitas |
| **4** | **Konsistensi UX lintas manager** | Seragamkan ConfirmDialog (hapus `window.confirm` di Hero & Media koleksi), skeleton loading, validasi (Artikel & Settings lemah), `key={i}` → id stabil | 🔵 Kualitas |
| **5** | **Dashboard overview kaya metrik** | Metrik produk, media (storage/orphan), artikel (draft/publish) di luar lead & order | 🔵 Insight |
| **6** | **Audit log global + role dasar** | Jejak aktivitas admin lintas entitas; mulai siapkan role | 🔵 Governance |
| **7** | **Bersihkan utang teknis** | 4 error `react-hooks/set-state-in-effect`; `LO-12` CSV guard; dll | 🔵 Higienitas |

> **Alasan memilih Orders sebagai #1:** nilai bisnis tertinggi (uang), data sudah siap (80%), dan celahnya paling menyolok (admin benar-benar buta). "UX tabel koleksi" (#2) adalah pekerjaan besar tersendiri yang menyentuh banyak file — lebih aman dipisah agar masing-masing tuntas.

---

## 13. Lampiran — Referensi Pola Existing

| Kebutuhan | Referensi existing |
|---|---|
| Struktur manager list + filter + search + optimistic status | `leads-manager.tsx` |
| API admin + guard + `?summary=1` count | `src/app/api/admin/leads/route.ts` |
| Klien API admin (auth header, handle, CSV) | `src/lib/admin-api.ts` (`authHeaders`, `handle`, `exportLeadsToCsv`) |
| Badge sidebar | `src/lib/admin-nav.ts`, `sidebar-item.tsx`, `use-lead-badge.ts` |
| Detail panel / dialog | `media-detail-panel.tsx`, `confirm-dialog.tsx` |
| Pagination cursor | `media-manager.tsx` (`PAGE_LIMIT`, cursor, IntersectionObserver) |
| Bulk actions | `media-bulk-bar.tsx`, `applyBulkMedia` (`admin-api.ts`) |
| Status label/style | `LEAD_STATUS_LABEL`/`LEAD_STATUS_STYLE` (`lead-types.ts`) |
| Normalizer data | `normalizeOrder` (`order-types.ts`), `normalize*` lain |
| Email notifikasi | pola Resend untuk lead (`email-notifier.tsx`, env `LEAD_NOTIFY_EMAILS`) |
| Format Rupiah | cek util existing di `src/lib` & pemakaian di `product-variant-picker.tsx` / `keranjang` |
| Nav config & judul | `src/lib/admin-nav.ts` (`ADMIN_NAV`, `matchAdminItem`) |

---

## CATATAN PENUTUP

Fitur Orders adalah **quick win berdampak tinggi**: backend sudah ada, yang dibutuhkan adalah menyambungkannya ke dashboard dengan kualitas setara modul Media. Setelah selesai, alur bisnis LKTech (produk → keranjang → checkout → pesanan → kelola admin) menjadi **tertutup rapat** tanpa bergantung pada ingatan WhatsApp.

> Setelah dieksekusi, update status di header + tambah bagian "Status Eksekusi" seperti pada `2026-10-02-sidebar-dashboard-upgrade.md`.

---

## 14. STATUS EKSEKUSI

> **Dieksekusi:** 2026-10-02 · **Verifikasi:** `npx tsc --noEmit` bersih ✅ · `npx eslint .` bersih (0 error/warning) ✅ · `npm run build` sukses ✅ (route `/admin/orders` & `/api/admin/orders` terdaftar)

### 14.1 Ringkasan per fase

| Fase | Isi | Status | Catatan |
|---|---|---|---|
| **F0** | Persiapan & baseline | ✅ | Baseline tsc/lint bersih. |
| **F1** | Data layer | ✅ | `order-types.ts` (+ label/style), `orders.ts` (`getOrdersPage`, `getOrdersSummary`, `updateOrderStatus`, `deleteOrder`), `format.ts` baru (`formatRupiah`, `shortOrderCode`, `formatDateTime`). |
| **F2** | API admin + klien | ✅ | `api/admin/orders/route.ts` (GET list+`?summary=1`, PATCH, DELETE) + `admin-orders-api.ts` (fetch/update/delete/export). |
| **F3** | Halaman & manager | ✅ | `(dashboard)/orders/page.tsx` + `orders-manager.tsx` (kartu metrik, toolbar, list, detail dialog, ubah status, ekspor, pagination "muat lagi"); nav grup **"Toko"** (Produk + Pesanan). |
| **F4** | Badge & notifikasi | ✅ | Badge generik `NavBadgeKind` (`newLeads`+`newOrders`), hook `use-admin-badges.ts` (lead+order paralel), `sendOrderNotification()` di `email.ts`, dipanggil best-effort di `POST /api/orders`. |
| **F5** | Metrik dashboard | ✅ | `OrderSnapshot` di `dashboard-overview.tsx` (Total/Baru/Diproses/Omzet + tautan kelola). |
| **F6** | Peningkatan (opsional) | ⏳ | Dilewati (bulk status, filter tanggal, dsb) — bisa jadi sesi lanjutan. |
| **F7** | QA, dokumentasi | ✅ | tsc/lint/build bersih + dokumentasi diperbarui. Smoke test dev server **dilewati** oleh pemilik (cold compile lambat); uji manual browser = pemilik. |

### 14.2 Temuan audit → status penyelesaian

| ID | Temuan | Status |
|---|---|---|
| OR-01 | Admin tak bisa lihat pesanan | ✅ Halaman `/admin/orders` + API list. |
| OR-02 | Status tak bisa diubah | ✅ PATCH + dropdown inline (optimistic + rollback). |
| OR-03 | Tanpa notifikasi order | ✅ `sendOrderNotification` (email Resend, best-effort). |
| OR-04 | Tanpa badge order baru | ✅ Badge `newOrders` di sidebar. |
| OR-05 | Dashboard hanya lead | ✅ Seksi `OrderSnapshot` (Total/Baru/Diproses/Omzet). |
| OR-06 | Tanpa search/filter/ekspor | ✅ Cari (nama/email/kode), filter status, ekspor CSV. |
| OR-07 | Tanpa detail item rapi | ✅ Dialog detail: pembeli, item, total, pesan WA + salin. |
| OR-08 | Tanpa pagination | ✅ Cursor + limit 25 + tombol "Muat lagi". |
| OR-09 | Tanpa jejak `updatedBy` | ✅ `updateOrderStatus` menulis `updatedAtISO`+`updatedBy`. |
| OR-10 | Tanpa nomor ramah-manusia | ✅ `shortOrderCode()` (`#XXXXXXXX`). |

### 14.3 File baru & diubah

**Baru:**
- `src/lib/format.ts` — `formatRupiah`, `shortOrderCode`, `formatDateTime`.
- `src/lib/admin-orders-api.ts` — klien API admin orders + ekspor CSV.
- `src/app/api/admin/orders/route.ts` — GET (list + summary), PATCH, DELETE.
- `src/app/admin/(dashboard)/orders/page.tsx` — halaman + metadata.
- `src/components/admin/orders-manager.tsx` — manager lengkap (list/filter/detail/status/export).
- `src/components/admin/use-admin-badges.ts` — badge lead + order (paralel).

**Diubah:**
- `src/lib/order-types.ts` — `ORDER_STATUS_LABEL` + `ORDER_STATUS_STYLE`.
- `src/lib/orders.ts` — `getOrdersPage`, `getOrdersSummary`, `updateOrderStatus`, `deleteOrder`, `ORDERS_PAGE_SIZE`.
- `src/lib/email.ts` — `sendOrderNotification` + build text/html.
- `src/app/api/orders/route.ts` — panggil notifikasi order (best-effort).
- `src/lib/admin-nav.ts` — `NavBadgeKind`, grup **"Toko"** (Produk + Pesanan).
- `src/components/admin/sidebar/sidebar-item.tsx` — badge `newOrders` + aria.
- `src/components/admin/admin-shell.tsx` — pakai `useAdminBadges` (`newLeads`+`newOrders`).
- `src/components/admin/dashboard-overview.tsx` — seksi `OrderSnapshot`.
- `src/components/admin/use-lead-badge.ts` → **dihapus** (digantikan `use-admin-badges.ts`).

### 14.4 Keputusan teknis (deviasi kecil)

1. **Badge digeneralisasi** jadi `useAdminBadges()` (lead + order, satu polling) — menggantikan `useLeadBadge()`. Lebih hemat request & satu mekanisme.
2. **`omzet`** dihitung dari jumlah field `total` pesanan berstatus "selesai" (proyeksi field saja, bukan unduh dokumen penuh).
3. **Search** order difilter di memori pada hasil halaman (keterbatasan substring Firestore) — sama seperti lead; peningkatan prefix-search dicatat sebagai roadmap.
4. **Notifikasi order** memakai env `LEAD_NOTIFY_EMAILS` (reuse) — belum dipisah ke `ORDER_NOTIFY_EMAILS` (bisa ditambah bila perlu).
5. **Nav grup "Toko"**: Produk dipindah dari "Konten Website" ke grup "Toko" bersama Pesanan (lebih logis: katalog + order).

### 14.5 Verifikasi (QA statis)

```
npx tsc --noEmit   → bersih (0 error)
npx eslint .       → bersih (0 error, 0 warning)
npm run build      → ✓ Compiled successfully
                     route: ○ /admin/orders · ƒ /api/admin/orders
```

### 14.6 Sisa manual (untuk pemilik)

- [ ] Uji di browser: buat order uji via `/keranjang` (login user) → cek muncul di `/admin/orders`.
- [ ] Uji: filter status, pencarian, buka detail, ubah status, ekspor CSV, "muat lagi".
- [ ] Uji: badge "Pesanan" bertambah ≤60s; email notifikasi order terkirim (jika Resend aktif).
- [ ] Uji: dashboard overview menampilkan kartu pesanan.
- [ ] **Deploy**: `git push` → Vercel → uji produksi.
- [ ] (Opsional) FASE 6: bulk ubah status, filter rentang tanggal.

### 14.7 Catatan operasional

- Tidak ada koleksi Firestore baru (`orders` sudah ada) → **tidak perlu** publish ulang `firestore.rules`.
- Query `count()`/`select()` pada `orders` memakai index otomatis (single-field equality) — tanpa composite index.
- Notifikasi order **best-effort**: kegagalan email tidak menggagalkan checkout.
- Env tambahan (opsional): `ORDER_NOTIFY_EMAILS` (fallback ke `LEAD_NOTIFY_EMAILS` bila diimplementasikan sesi berikutnya).

> Dibuat oleh sesi eksekusi 2026-10-02. Jika ada temuan baru, catat sebagai `OR-11+` di bagian audit (§3).
