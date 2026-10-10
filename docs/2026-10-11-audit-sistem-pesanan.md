# Audit & QA — Sistem Pesanan (Order) LKTech

> **Status:** 📝 **DOKUMEN TEMUAN (audit/QA).** Sebagian temuan sudah dieksekusi —
> lihat **§12 Status Eksekusi** di bawah. Fokus: **merapikan gap**, bukan menambah
> fitur baru di luar sistem pesanan yang ada.
>
> **Disusun:** 2026-10-11. **Metode:** pembacaan menyeluruh alur order end-to-end —
> model data, API (publik/user/admin), data layer, pembayaran (Mayar), fulfillment
> (unduhan), kupon, kedaluwarsa, keranjang, email, portal akun, dashboard admin,
> cron, dan UI.
>
> **Legenda severity:** 🔴 Kritis · 🟠 Menengah · 🔵 Rendah/polesan.
> **Legenda jenis:** 🐞 Bug/logika · 🛡️ Keamanan/keandalan · ⚡ Performa/skala ·
> 🎨 UX/konsistensi · 🧹 Kualitas kode/maintainability.

---

## 1. Ringkasan Sistem Pesanan Saat Ini

### 1.1 Model data

- **Order** (`orders/{id}`): `uid`, `buyerName`, `buyerEmail`, `items[]` (harga
  terverifikasi server), `subtotal`, `coupon?`, `total`, `status`, `payment?`,
  `fulfillment?`, `downloadTokenId?`, `whatsapp`, `message`, `createdAtISO`,
  + observability email. Normalisasi: `src/lib/order-types.ts`.
- **Status** (8): `baru`, `menunggu_bayar`, `dibayar`, `menunggu_konfirmasi`,
  `diproses`, `selesai`, `dibatalkan`, `kedaluwarsa`. Predikat transisi:
  `src/lib/order-status-pure.ts`.
- **Fulfillment** 2 jalur: `instan` (digital → invoice otomatis → unduhan) &
  `jasa` (konsultasi → `menunggu_konfirmasi`, tanpa invoice otomatis).
- **Kupon** (`coupons/{id}` + subkoleksi `redemptions/{uid}` + penanda
  `couponCodes/{code}`): validasi & hitung diskon **server-side**.
- **Unduhan** (`downloads/{tokenId}`): token HMAC `{tokenId}.{sig}`.
- **Draft keranjang** (`carts/{uid}`): untuk email pengingat abandoned checkout.

### 1.2 Alur end-to-end

```
/produk → keranjang (localStorage per-uid) → checkout (POST /api/orders)
  ├─ INSTAN: status menunggu_bayar + invoice Mayar (payUrl) → redirect bayar
  │     → webhook payment.received → markOrderPaid (dibayar)
  │     → fulfillOrder (token unduhan + email "pembayaran diterima")
  │     → /akun tab Pesanan → tombol "Unduh produk" → /unduhan/[token]
  ├─ JASA: status menunggu_konfirmasi → email pembeli + admin → admin ubah status manual
  └─ Fallback: gateway nonaktif/gagal → pesan WhatsApp (order tetap dibuat)
Admin: /admin/orders → filter/paginasi, ubah status, invoice manual, fulfill ulang,
       kirim ulang email, hapus (status tertentu), ekspor CSV.
Cron (eksternal): /api/cron/expire-orders (menunggu_bayar → kedaluwarsa),
       /api/cron/cart-reminders (email pengingat H+1).
```

### 1.3 Inventaris berkas (cakupan audit)

| Lapisan | Berkas |
| --- | --- |
| Model/tipe | `order-types.ts`, `payment-types.ts`, `order-status-pure.ts`, `order-expiry-pure.ts`, `order-fulfillment.ts`, `order-schema.ts` |
| Data layer | `orders.ts`, `coupons.ts`, `downloads.ts`, `download-token.ts`, `cart-draft.ts`, `cart-draft-pure.ts`, `user-profile.ts` |
| Orkestrasi | `order-payment.ts`, `order-expiry.ts`, `cart-reminder.ts`, `email-order.ts`, `email-status.ts`, `email.ts`, `mayar.ts`, `observability.ts` |
| API | `api/orders`, `api/admin/orders`, `api/coupons/validate`, `api/downloads/[token]/[index]`, `api/cart/draft`, `api/cart/unsubscribe`, `api/cron/expire-orders`, `api/cron/cart-reminders`, `api/webhooks/mayar` |
| Klien API | `order-api.ts`, `admin-orders-api.ts`, `coupon-api.ts` |
| UI | `cart-provider.tsx`, `cart-view.tsx`, `cart-coupon.tsx`, `cart-draft-sync.tsx`, `cart-cross-sell.tsx`, `auth/account-orders.tsx`, `admin/orders-manager.tsx`, `app/unduhan/[token]/page.tsx`, `app/keranjang/page.tsx`, `app/akun/page.tsx` |
| Halaman admin | `app/admin/(dashboard)/orders/page.tsx` |

---

## 2. Temuan — 🛡️ Keamanan & Keandalan (prioritas tertinggi)

### [OR-A1] 🛡️🔴 `markOrderPaid` TIDAK atomik (baca→tulis) — risiko balapan dengan kedaluwarsa
- **Lokasi:** `src/lib/orders.ts:280-319`.
- **Temuan:** `markOrderPaid` melakukan `ref.get()` lalu `ref.update()` — **bukan**
  transaksi. Bandingkan `markOrderExpired` (`orders.ts:451`) yang **sudah**
  transaksional dengan re-check (fix GAP-1 sebelumnya).
- **Skenario bahaya:** webhook pembayaran masuk **bersamaan** dengan cron
  `expirePendingOrders`. Cron membaca order sebagai `menunggu_bayar`, lalu (dalam
  jeda) webhook menandai `dibayar`, lalu cron `markOrderExpired` **re-check** di
  transaksi → aman (cron menang/gagal dengan benar). Namun bila **webhook** yang
  kalah balapan (cron sudah men-commit `kedaluwarsa` lebih dulu), `markOrderPaid`
  **tidak re-check** status → bisa menimpa order `kedaluwarsa` menjadi `dibayar`
  padahal kuota kupon sudah dikembalikan + email "kedaluwarsa" sudah terkirim.
- **Dampak:** status tidak konsisten (uang masuk tapi kupon sudah di-restore →
  potensi **kupon bocor/ganda**), email kedaluwarsa + email dibayar terkirim.
- **Rekomendasi:** jadikan `markOrderPaid` **transaksional** dengan re-check status
  di dalam transaksi (tolak bila order sudah `dibatalkan`/`kedaluwarsa`, atau
  tangani sebagai "late payment" dengan jalur khusus). Selaraskan pola dengan
  `markOrderExpired`.

### [OR-A2] 🛡️🟠 Webhook tidak memverifikasi status order sebelum menandai lunas
- **Lokasi:** `src/app/api/webhooks/mayar/route.ts:101-112` + `orders.ts:292`.
- **Temuan:** idempotensi hanya memeriksa `payment.status === "dibayar"`
  (`orders.ts:292`). Order yang sudah `dibatalkan`/`kedaluwarsa`/`selesai` dengan
  `payment.status` belum `dibayar` **masih bisa** ditandai `dibayar`.
- **Dampak:** order yang sudah dibatalkan bisa "hidup kembali" lewat webhook
  (mis. pembayaran yang sangat telat), tanpa penanganan khusus.
- **Rekomendasi:** tambahkan guard status terminal di `markOrderPaid` / webhook
  (lihat OR-A1) — mis. bila order terminal, catat sebagai anomali & jangan ubah
  status (atau proses refund manual).

### [OR-A3] 🛡️🟠 `updateOrderStatus` TIDAK atomik + tidak memvalidasi transisi status
- **Lokasi:** `src/lib/orders.ts:220-238`, `api/admin/orders/route.ts:137-242`.
- **Temuan:** `updateOrderStatus` baca status lama (`get`) lalu `update` — bukan
  transaksi. Tidak ada **matriks transisi valid** — admin bisa mengubah status ke
  **nilai apa pun** (mis. `selesai` → `baru`, `dibatalkan` → `dibayar`), termasuk
  melompati alur. Dua admin mengubah bersamaan bisa saling menimpa.
- **Dampak:** status tidak konsisten (mis. order `selesai` bisa direset), efek
  samping kupon (`shouldRestoreCoupon` hanya melihat `previous`), email ganda/aneh.
- **Rekomendasi:** (a) transaksi + re-check; (b) definisikan **matriks transisi**
  yang diizinkan dan tolak transisi tak valid dengan pesan jelas; (c) audit log
  sudah ada (`order.status`) — pertahankan.

### [OR-A4] 🛡️🔴 Webhook: verifikasi token bersifat "lunak" (tidak memblok) — perlu keputusan eksplisit
- **Lokasi:** `src/app/api/webhooks/mayar/route.ts:44,158-184`.
- **Temuan:** `MAYAR_WEBHOOK_TOKEN` yang **tidak cocok** hanya dicatat sebagai
  peringatan; webhook tetap diproses (mengandalkan korelasi `orderId` + nominal).
  Ini **keputusan sadar** yang terdokumentasi (§3.4), tetapi berisiko: siapa pun
  yang tahu/tebak `orderId` + nominal dapat memalsukan `payment.received`.
- **Dampak:** potensi penipuan (order ditandai lunas tanpa bayar) bila `orderId`
  bocor (mis. dikirim di URL invoice/email) & `MAYAR_WEBHOOK_TOKEN` kosong/di-bypass.
- **Rekomendasi:** pertimbangkan verifikasi **kuat** (blok bila token diisi tapi
  tidak cocok) + verifikasi ulang ke Mayar (`getInvoice(invoiceId)` memastikan
  `status === "paid"` & nominal cocok) sebelum menandai lunas. Minimal: pastikan
  `MAYAR_WEBHOOK_TOKEN` **wajib** di produksi (fail-closed bila kosong saat mode
  production).

### [OR-A5] 🛡️🟠 `restoreCouponUsage` dipanggil setelah `deleteOrder` — urutan rawan bocor
- **Lokasi:** `api/admin/orders/route.ts:455-460`.
- **Temuan:** pada DELETE, `deleteOrder(id)` dijalankan **lebih dulu**, baru
  `restoreCouponUsage`. Bila `restoreCouponUsage` gagal (best-effort, hanya log),
  kuota kupon **bocor** dan order sudah terhapus (tak bisa dicoba ulang).
- **Dampak:** kuota kupon habis tanpa pemakaian (promo "diam-diam" berkurang).
- **Rekomendasi:** balik urutan (restore **dulu**, lalu delete) atau jadikan
  idempoten dengan penanda; pertimbangkan audit bila restore gagal.

### [OR-A6] 🛡️🔵 Webhook `payment_mismatch` menandai `payment.status = "gagal"` padahal bukan gagal final
- **Lokasi:** `api/webhooks/mayar/route.ts:79-99`.
- **Temuan:** bila nominal kurang, order diberi `payment.status: "gagal"` + catatan
  `paymentMismatch`. Status `gagal` mungkin menyesatkan (uang sebagian bisa saja
  masuk; pembeli bisa bayar lagi).
- **Dampak:** kebingungan admin/pembeli; order tetap `menunggu_bayar` (status order
  tidak berubah) tapi status pembayaran "gagal".
- **Rekomendasi:** klarifikasi semantik (`gagal` vs `kurang_bayar`), atau biarkan
  `menunggu` + tandai mismatch secara eksplisit; beri notifikasi admin.

### [OR-A7] 🛡️🔵 Endpoint unduhan `GET /api/downloads/[token]/[index]` tidak ada rate-limit
- **Lokasi:** `src/app/api/downloads/[token]/[index]/route.ts`.
- **Temuan:** token HMAC aman, tetapi tidak ada rate-limit pada endpoint ini
  (halaman `/unduhan/[token]` juga tanpa rate-limit). `recordDownloadHit` menambah
  `hits` per klik — aman terhadap brute force token (24-byte acak), tetapi
  pencatatan `hits` bisa cepat habis oleh refresh berulang (mengurangi kuota
  unduhan sendiri) & membebani Firestore.
- **Rekomendasi:** rate-limit ringan + (opsional) hitung `hits` per-berkas, bukan
  per-tampilan.

---

## 3. Temuan — 🐞 Bug & Logika

### [OR-B1] 🐞🟠 Fallback `createdAt` non-ISO merusak urutan & cursor paginasi
- **Lokasi:** `order-types.ts:227` (`createdAt: str(data.createdAtISO) || str(data.createdAt)`),
  `orders.ts:181,196,209` (orderBy/`createdAtISO`), sort di memori pakai `createdAt`.
- **Temuan:** query admin memakai `orderBy("createdAtISO","desc")` & cursor =
  `createdAtISO`. Namun normalizer punya fallback ke `createdAt` (non-ISO) untuk
  order **lama**. Bila ada dokumen tanpa `createdAtISO`, urutan/cursor bisa tidak
  konsisten (dokumen "lama" tak ikut ter-`orderBy`).
- **Dampak:** order lama bisa tidak muncul/terlewat di daftar admin atau muncul
  urutan salah.
- **Rekomendasi:** migrasi data lama (backfill `createdAtISO`), atau buat query
  toleran; dokumentasikan.

### [OR-B2] 🐞🟠 Tombol "Bayar sekarang" di `/akun` muncul untuk status yang salah
- **Lokasi:** `auth/account-orders.tsx:82-87`.
- **Temuan:** `pendingPayment = Boolean(payment.payUrl) && payment.status !== "dibayar"
  && status !== dibatalkan/kedaluwarsa/selesai`. Untuk order **JASA** dengan
  invoice manual, atau order `dibatalkan` yang masih menyimpan `payUrl` lama,
  kondisi bergantung pada pengecualian status — rawan menunjukkan tombol bayar
  pada order yang tak seharusnya.
- **Dampak:** pembeli bisa diarahkan membayar order yang sudah tidak valid.
- **Rekomendasi:** gunakan predikat tunggal (mis. `payment.status === "menunggu"`
  & status order ∈ {`menunggu_bayar`,`menunggu_konfirmasi`}) yang dipakai bersama
  server & klien.

### [OR-B3] 🐞🔵 "Pesan lagi" tidak memvalidasi ulang produk (bisa menambah item basi)
- **Lokasi:** `auth/user-account.tsx:142-168` (`onReorder`).
- **Temuan:** "Pesan lagi" memasukkan item lama ke keranjang dari data order
  (harga/varian lama). Harga & stok diverifikasi ulang saat checkout (aman), tetapi
  keranjang bisa menampilkan harga lama sampai checkout — membingungkan bila harga
  produk berubah/dihentikan.
- **Rekomendasi:** saat "Pesan lagi", hidrasi harga terbaru dari API produk
  (server) & tandai item yang tidak dijual lagi.

### [OR-B4] 🐞🟠 Produk multi-varian: `variant.available` tidak dicek, hanya `soldOut`/stock
- **Lokasi:** `api/orders/route.ts:117-198`.
- **Temuan:** validasi varian memakai `soldOut`, `isStockOut`, `price <= 0`. Bila
  ada field kelayakan varian lain (mis. `active`/`available` per-varian) yang tidak
  dicek, bisa lolos.
- **Dampak:** potensi menjual varian yang tak semestinya.
- **Rekomendasi:** pastikan kelayakan varian = sumber tunggal (seragam dengan UI
  kartu varian). Verifikasi field yang dipakai.

### [OR-B5] 🐞🟠 Subtotal varian & produk tunggal: cek `product.soldOut` untuk multi-varian mendua
- **Lokasi:** `api/orders/route.ts:141` (`if (variant.soldOut || product.soldOut)`).
- **Temuan:** produk multi-varian dengan `product.soldOut = true` menolak **semua**
  varian; tetapi badge/kartu mungkin memperlakukan berbeda. Perlu dipastikan
  konsisten dengan `isStockOut` & UI.
- **Rekomendasi:** satukan aturan kelayakan beli (satu helper) agar UI & server
  identik.

### [OR-B6] 🐞🔵 `normalizeOrder` menghitung `subtotal = num(data.subtotal) || total`
- **Lokasi:** `order-types.ts:190`.
- **Temuan:** bila `subtotal` = 0 (mis. diskon 100% / gratis) tetapi `total` juga 0,
  `|| total` tetap 0 — OK. Namun `num()` mengembalikan 0 untuk string kosong; logika
  `||` bisa menutupi kasus `subtotal=0` yang valid dengan `total` > 0 (tak terjadi
  normal). Risiko rendah.
- **Rekomendasi:** pakai pengecekan eksplisit `typeof === "number"`.

### [OR-B7] 🐞🟠 `fulfillment` bisa `undefined` pada order lama → tombol admin tidak muncul
- **Lokasi:** `order-types.ts:193-196`, `admin/orders-manager.tsx:514-518`.
- **Temuan:** `canReleaseDownload` mensyaratkan `fulfillment === "instan"`. Order
  lama (sebelum fitur fulfillment) `undefined` → tombol "Buat/kirim ulang unduhan"
  **tidak muncul** meski produknya digital.
- **Dampak:** admin tak bisa memenuhi order digital lama dari dashboard.
- **Rekomendasi:** turunkan `fulfillment` saat baca (infer dari kategori item) atau
  fallback `undefined → instan` untuk order berisi produk digital.

### [OR-B8] 🐞🔵 Emoji/karakter pada kode order & sanitasi
- **Lokasi:** `cart.ts:88-93` (`sanitizeMessageText`), `format.ts:25`.
- **Temuan:** sanitasi teks pesan WhatsApp sudah baik (buang newline/kontrol).
  `shortOrderCode` hanya `id.slice(0,8)` — cukup, tapi tak ada validasi collision
  (8 hex char = ~4 milyar, kecil tapi mungkin untuk dataset besar).
- **Rekomendasi:** menerima risiko; dokumentasikan bila perlu.

---

## 4. Temuan — ⚡ Performa & Skala

### [OR-C1] ⚡🟠 Filter status & pencarian dilakukan di MEMORI (tanpa index)
- **Lokasi:** `orders.ts:158-213` (`getOrdersPage` filter status di memori),
  `orders.ts:52-67` (`getOrdersByUser` tanpa `orderBy`),
  `orders.ts:348-364` (`findCompletedOrderForProduct` ambil semua order user),
  `orders.ts:420-439` (`getExpiredPendingOrders` filter di memori),
  `admin/orders-manager.tsx:133-145` (search di memori).
- **Temuan:** banyak query sengaja menghindari composite index (dengan alasan
  valid: index belum ada → query gagal → daftar kosong). Tetapi ini **tidak
  scalable**: `getOrdersPage` mengambil `limit*4` (maks 200) dokumen lalu menyaring;
  bila filter status jarang cocok, halaman bisa tampak kosong padahal ada data.
- **Dampak:** saat volume order besar, paginasi/filter bisa kehilangan hasil
  (false "kosong") + biaya baca tinggi.
- **Rekomendasi:** buat composite index di `firestore.indexes.json`
  (`status`+`createdAtISO`, `uid`+`createdAtISO`) lalu pakai query native;
  sediakan fallback memori bila index belum ada. Tambahkan index untuk
  `findCompletedOrderForProduct` (`uid`+`status`).

### [OR-C2] ⚡🟠 `getOrdersSummary` menjalankan banyak count() + query omzet penuh
- **Lokasi:** `orders.ts:96-149`.
- **Temuan:** 1 count total + 8 count per-status (**9 query**) setiap kali ringkasan
  diminta (badge sidebar + dashboard + setiap perubahan status memanggil ulang di
  klien `orders-manager.tsx:156`). Omzet `select("total")` atas **semua** order
  `selesai` (bisa besar).
- **Dampak:** biaya & latensi naik seiring data; ringkasan dipanggil sering.
- **Rekomendasi:** cache ringan / agregasi terjadwal (`AN-P3` sudah pernah dicatat
  sebagai backlog); minimal satukan count via satu agregasi bila SDK mendukung.

### [OR-C3] ⚡🟠 `getCouponStats` & `getOrdersSummary.omzet` memuat seluruh koleksi
- **Lokasi:** `coupons.ts:574-612` (`getCouponStats` `select` semua order),
  `orders.ts:128` (semua order selesai).
- **Temuan:** agregasi di memori atas seluruh koleksi `orders`.
- **Rekomendasi:** agregasi terjadwal / counter tersimpan.

### [OR-C4] ⚡🔵 `where(orderId)` pada `downloads` tanpa limit index
- **Lokasi:** `downloads.ts:188,231` (`where("orderId","==").limit(1)`).
- **Temuan:** query tunggal-field OK, tapi bisa ada duplikat token per order bila
  race (dua fulfillment bersamaan). Sudah ada `refreshExisting:true` yang idempoten.
- **Rekomendasi:** terima; tambahkan index `orderId` bila perlu.

---

## 5. Temuan — 🎨 UX & Konsistensi

### [OR-D1] 🎨🟠 Istilah status & alur bercampur (JASA vs INSTAN) membingungkan pembeli
- **Lokasi:** `cart-view.tsx:216-261`, `account-orders.tsx`, `email-order.ts`.
- **Temuan:** Pesan hasil checkout & status berbeda antar jalur. Copy "menunggu
  konfirmasi" untuk JASA, "menunggu bayar" untuk INSTAN. Beberapa copy masih
  menyebut "checkout via WhatsApp" (mis. meta `keranjang/page.tsx:8` deskripsi
  "checkout via WhatsApp") meski kini ada pembayaran online.
- **Dampak:** kebingungan; meta description tidak akurat.
- **Rekomendasi:** audit copy lintas halaman; sesuaikan dengan realitas (pembayaran
  online utama + WhatsApp fallback).

### [OR-D2] 🎨🟠 Dua sumber warna/label status order (duplikasi)
- **Lokasi:** `order-types.ts:46-55` (`ORDER_STATUS_STYLE`) vs
  `auth/account-orders.tsx:14-23` (`ORDER_STATUS_CLASS`).
- **Temuan:** definisi warna badge status order **duplikat** di dua tempat dengan
  nama berbeda & warna yang tak identik (`dibatalkan` = slate di satu, rose di lain).
- **Dampak:** inkonsistensi visual; perawatan ganda.
- **Rekomendasi:** satu sumber (`ORDER_STATUS_STYLE`), hapus duplikat.

### [OR-D3] 🎨🔵 Kartu ringkasan admin tidak lengkap (beberapa status tak tampil)
- **Lokasi:** `admin/orders-manager.tsx:54-61` (`SUMMARY_CARDS`).
- **Temuan:** kartu metrik menampilkan total/baru/menunggu_bayar/menunggu_konfirmasi/
  diproses/omzet — **tidak** ada `dibayar`, `selesai`, `dibatalkan`, `kedaluwarsa`
  (padahal `OrdersSummary` punya semuanya, dan badge sidebar juga pakai).
- **Dampak:** admin tak melihat ringkasan status penting (dibayar/selesai) di kartu.
- **Rekomendasi:** lengkapi kartu atau sediakan baris status ringkas.

### [OR-D4] 🎨🔵 Search admin hanya menyaring halaman yang termuat (bukan seluruh data)
- **Lokasi:** `admin/orders-manager.tsx:133-145,297-300`.
- **Temuan:** pencarian nama/email/kode hanya di `orders` yang sudah di-fetch
  (halaman saat ini). Teks "Menampilkan N pesanan" bisa menyesatkan (seolah total).
- **Rekomendasi:** beri hint "menyaring halaman ini" atau lakukan pencarian
  server-side (dengan sadar keterbatasan substring Firestore).

### [OR-D5] 🎨🔵 Filter status + paginasi: "Muat lagi" bisa tak menambah item
- **Lokasi:** `admin/orders-manager.tsx:109-125` + `orders.ts:177-210`.
- **Temuan:** saat filter status aktif, `fetchLimit = limit*4` lalu disaring; cursor
  maju berdasarkan dokumen terakhir yang di-fetch. Bila dalam satu window tak ada
  yang cocok, "Muat lagi" bisa tampak tak menambah (walau `nextCursor` ada).
- **Rekomendasi:** perbaiki logika cursor/fetchLimit pasca-index (lihat OR-C1).

### [OR-D6] 🎨🔵 Halaman `/unduhan/[token]` tanpa navbar-aware & tanpa indikator per-berkas
- **Lokasi:** `app/unduhan/[token]/page.tsx`.
- **Temuan:** menampilkan "Dipakai N/M unduhan" global (bukan per berkas). Bila ada
  3 berkas & maxHits=5, mengunduh semua berkas 2× bisa menghabiskan kuota tanpa
  disadari.
- **Rekomendasi:** pertimbangkan hit per-berkas atau jelaskan perilaku kuota.

### [OR-D7] 🎨🔵 `formatDateTime` di `account-orders.tsx` duplikat `format.ts`
- **Lokasi:** `auth/account-orders.tsx:25-37` vs `lib/format.ts:30`.
- **Temuan:** implementasi tanggal duplikat (format beda: `account-orders` pakai
  "hour:2-digit", `format.ts` pakai `toLocaleString`). Konsistensi format tanggal
  antar halaman bisa berbeda.
- **Rekomendasi:** pakai satu util bersama.

---

## 6. Temuan — 🧹 Kualitas Kode & Maintainability

### [OR-E1] 🧹🟠 `api/orders/route.ts` terlalu besar & bercabang (498 baris)
- **Lokasi:** `src/app/api/orders/route.ts`.
- **Temuan:** satu handler POST menangani: parsing, verifikasi produk/varian/stok,
  kupon, reservasi kupon, createOrder, invoice Mayar, email (INSTAN vs JASA),
  fulfillment-type. Sulit diuji & dirawat.
- **Rekomendasi:** ekstrak orkestrasi ke `lib/checkout.ts` (fungsi murni + I/O
  terpisah) agar bisa di-unit-test & handler tipis.

### [OR-E2] 🧹🔵 Kelayakan beli produk/varian tersebar (bukan satu helper)
- **Lokasi:** `api/orders/route.ts:105-243` + `product-format.ts` (`isStockOut`,
  `effectiveStock`) + `product-types.ts`.
- **Temuan:** aturan "boleh dibeli" tersebar antara server checkout & UI kartu.
- **Rekomendasi:** satu helper `isPurchasable(product|variant)` dipakai bersama.

### [OR-E3] 🧹🔵 Status order didefinisikan di 2 tempat
- **Lokasi:** `order-types.ts:21` (`ORDER_STATUSES`) vs `order-status-pure.ts:10`
  (`OrderStatusName` — salinan manual dengan komentar "harus konsisten").
- **Temuan:** duplikasi tipe status (disengaja agar pure bebas impor runtime).
  Rawan drift bila salah satu bertambah status.
- **Rekomendasi:** tambah unit test yang memverifikasi kedua daftar sama, atau
  generate tipe dari satu sumber.

### [OR-E4] 🧹🔵 `admin-orders-api.ts:185` `formatTotal` = pembungkus tak berguna
- **Lokasi:** `admin-orders-api.ts:184-187`.
- **Temuan:** `formatTotal(total)` hanya memanggil `formatRupiah(total)` — ekspor
  mati/pembungkus tanpa nilai.
- **Rekomendasi:** hapus atau pakai `formatRupiah` langsung.

### [OR-E5] 🧹🔵 Banyak `console.error`/`console.warn` tanpa observability terstruktur
- **Lokasi:** tersebar (`orders.ts`, `order-payment.ts`, webhook, dll).
- **Temuan:** sebagian sudah pakai `obs` (`observability.ts`), sebagian hanya
  `console.error`. Tidak konsisten.
- **Rekomendasi:** standarkan jalur observability (terutama jalur uang: webhook,
  fulfillment, restore kupon).

### [OR-E6] 🧹🔵 `email-cart.ts` / `email-order.ts` meng-hardcode endpoint Resend
- **Lokasi:** `RESEND_ENDPOINT` di beberapa file.
- **Temuan:** konstanta endpoint diduplikasi di banyak file email.
- **Rekomendasi:** sentralisasi klien email (endpoint + helper kirim) di satu modul.

---

## 7. Yang SUDAH Baik (jangan diubah tanpa alasan)

- ✅ **Server-authoritative:** harga/nama/total/kupon dihitung ulang dari Firestore
  (`api/orders/route.ts:86-293`); klien hanya kirim slug/qty/kode.
- ✅ **Reservasi kuota kupon atomik** sebelum order (transaksi `redeemCoupon`) &
  rollback bila `createOrder` gagal (`api/orders/route.ts:295-352`).
- ✅ **Token unduhan HMAC** timing-safe (`download-token.ts`) + fail-closed.
- ✅ **`markOrderExpired` transaksional** dengan re-check (fix GAP-1).
- ✅ **Idempotensi email** (`lastNotifiedStatus`), status email tersimpan + riwayat
  subkoleksi (`email-status.ts`).
- ✅ **Sanitasi teks** pesan WhatsApp (`sanitizeMessageText`).
- ✅ **Fail-safe tanpa kredensial:** gateway/DB/secret kosong → fallback aman
  (WhatsApp), tidak crash.
- ✅ **Hard-delete dibatasi** ke status belum-diproses (`DELETABLE_STATUSES`).
- ✅ **Cron fail-closed** (`CRON_SECRET`) + verifikasi `Authorization`/`token`.
- ✅ **Opt-out** pengingat keranjang ber-HMAC.

---

## 8. Ringkasan Temuan (matriks prioritas)

| # | Severity | Jenis | Ringkas | File utama |
| --- | --- | --- | --- | --- |
| OR-A1 | 🔴 | 🛡️ | `markOrderPaid` tidak atomik (balapan expiry) | `orders.ts:280` |
| OR-A2 | 🟠 | 🛡️ | Webhook tak cek status terminal sebelum lunas | `webhooks/mayar/route.ts:101` |
| OR-A3 | 🟠 | 🛡️ | `updateOrderStatus` non-atomik + tanpa matriks transisi | `orders.ts:220` |
| OR-A4 | 🔴 | 🛡️ | Verifikasi token webhook lunak (bypass risiko) | `webhooks/mayar/route.ts:158` |
| OR-A5 | 🟠 | 🛡️ | Restore kupon setelah delete (urutan rawan bocor) | `api/admin/orders/route.ts:455` |
| OR-A6 | 🔵 | 🛡️ | Semantik `payment.status="gagal"` saat mismatch | `webhooks/mayar/route.ts:94` |
| OR-A7 | 🔵 | 🛡️ | Endpoint unduhan tanpa rate-limit | `api/downloads/[token]/[index]` |
| OR-B1 | 🟠 | 🐞 | Fallback `createdAt` non-ISO merusak urutan/cursor | `order-types.ts:227` |
| OR-B2 | 🟠 | 🐞 | Tombol "Bayar sekarang" bisa muncul salah | `account-orders.tsx:82` |
| OR-B3 | 🔵 | 🐞 | "Pesan lagi" tanpa revalidasi produk | `user-account.tsx:142` |
| OR-B4 | 🟠 | 🐞 | Kelayakan varian: cek tak lengkap | `api/orders/route.ts:117` |
| OR-B5 | 🟠 | 🐞 | Aturan `soldOut` produk vs varian mendua | `api/orders/route.ts:141` |
| OR-B6 | 🔵 | 🐞 | `subtotal || total` bisa menutupi nilai | `order-types.ts:190` |
| OR-B7 | 🟠 | 🐞 | `fulfillment` undefined → tombol admin hilang | `orders-manager.tsx:514` |
| OR-B8 | 🔵 | 🐞 | Collision `shortOrderCode` (risiko kecil) | `format.ts:25` |
| OR-C1 | 🟠 | ⚡ | Filter/cari di memori (tak scalable) | `orders.ts:158` |
| OR-C2 | 🟠 | ⚡ | Summary 9 query + omzet penuh, sering dipanggil | `orders.ts:96` |
| OR-C3 | 🟠 | ⚡ | Agregasi kupon/omzet memuat seluruh koleksi | `coupons.ts:574` |
| OR-C4 | 🔵 | ⚡ | `where(orderId)` downloads (duplikat token) | `downloads.ts:188` |
| OR-D1 | 🟠 | 🎨 | Copy/meta menyebut "WhatsApp" padahal ada bayar online | `keranjang/page.tsx:8` |
| OR-D2 | 🟠 | 🎨 | Dua sumber warna/label status order | `account-orders.tsx:14` |
| OR-D3 | 🔵 | 🎨 | Kartu ringkasan admin tak lengkap | `orders-manager.tsx:54` |
| OR-D4 | 🔵 | 🎨 | Search admin hanya halaman termuat (teks menyesatkan) | `orders-manager.tsx:297` |
| OR-D5 | 🔵 | 🎨 | Cursor/paginasi + filter bisa "tak menambah" | `orders.ts:177` |
| OR-D6 | 🔵 | 🎨 | Kuota unduhan global (bukan per-berkas) | `unduhan/[token]/page.tsx:98` |
| OR-D7 | 🔵 | 🎨 | `formatDateTime` duplikat | `account-orders.tsx:25` |
| OR-E1 | 🟠 | 🧹 | `api/orders` 498 baris (perlu ekstraksi) | `api/orders/route.ts` |
| OR-E2 | 🔵 | 🧹 | Kelayakan beli tersebar | `api/orders`, `product-format` |
| OR-E3 | 🔵 | 🧹 | Status order didefinisikan 2× | `order-status-pure.ts:10` |
| OR-E4 | 🔵 | 🧹 | `formatTotal` pembungkus mati | `admin-orders-api.ts:184` |
| OR-E5 | 🔵 | 🧹 | Observability tidak konsisten | tersebar |
| OR-E6 | 🔵 | 🧹 | Endpoint Resend diduplikasi | `email-*.ts` |

**Rekap:** 🔴 Kritis = 2 · 🟠 Menengah = 14 · 🔵 Rendah = 15 (total 31 temuan).

---

## 9. Rekomendasi Urutan Eksekusi (usulan, menunggu keputusan pemilik)

> Prinsip: **perbaiki yang menyentuh uang & keandalan dulu**, baru performa, lalu
> UX/kualitas. Setiap batch ditutup gate `tsc` + `lint` + test + build. **Belum ada
> kode yang diubah di sesi audit ini.**

### Batch 1 — Integritas Uang & Status (🔴🟠, dampak tinggi, risiko sedang) — ✅ SELESAI
- **OR-A1 + OR-A2:** `markOrderPaid` transaksional + guard status terminal (late payment). ✅
- **OR-A4:** verifikasi webhook KUAT (blok 401 bila token diisi & salah) + guard late payment. ✅
- **OR-A3:** matriks transisi status + `updateOrderStatus` transaksional. ✅
- **OR-A5:** urutan restore kuota kupon pada delete (restore dulu, gagal → batal). ✅

### Batch 2 — Bug & Konsistensi Data (🟠)
- **OR-B2 / OR-B7:** predikat pembayaran & fulfillment bersama (server & klien). ✅
- **OR-B1:** backfill `createdAtISO` / query toleran. ✅
- **OR-B4 / OR-B5:** satukan aturan kelayakan beli produk/varian. ✅
- **OR-D2 / OR-D7:** satu sumber style status & format tanggal. ✅

### Batch 3 — Performa & Skala (🟠)
- **OR-C1:** composite index + query native (fallback memori). ✅
- **OR-C2 / OR-C3:** agregasi ringan / cache TTL. ✅
- **OR-D4 / OR-D5:** perbaiki search/paginasi + copy jujur. ✅

### Batch 4 — Kualitas & Poles (🔵)
- **OR-E1:** ekstraksi orkestrasi checkout (`lib/checkout.ts`). ✅
- **OR-E3 / OR-E4 / OR-E6:** hilangkan duplikasi. ✅
- **OR-D1 / OR-D3 / OR-D6:** copy & ringkasan & kuota unduhan. ✅
- **OR-A6 / OR-A7 / OR-B3 / OR-B6 / OR-E2 / OR-E5:** pembersihan. ✅
- (OR-B8 collision & OR-C4 race: diterima & didokumentasikan — risiko minimal).

---

## 10. Definition of Done (audit ini)

1. Semua temuan terdokumentasi dengan lokasi presisi (file:line) & rekomendasi. ✅
2. Dikelompokkan per severity & jenis. ✅
3. Usulan urutan eksekusi (batch) tanpa mengubah kode. ✅
4. Ditunggu keputusan pemilik untuk mulai eksekusi batch.

---

## 11. Catatan Referensi (dokumen terkait)

- `docs/2026-10-02-orders-admin-module.md` — fondasi modul order admin (OR-01..OR-12 awal).
- `docs/2026-10-05-kupon-diskon.md` — modul kupon (KP-01..KP-09).
- `docs/2026-10-05-audit-email-kupon-analitik.md` — audit email/kupon/analitik (R0–R7).
- `docs/2026-10-06-fase-konversi-closing.md` — fase P0–P6 (pembayaran, bundling, urgency, abandonment) + backlog GAP yang sudah diperbaiki.
- `docs/2026-10-10-bundling-riwayat-pesanan.md` — bundling & riwayat pesanan.

---

## 12. Status Eksekusi

### Batch 1 — Integritas Uang & Status ✅ SELESAI (2026-10-11)

**Gate:** `npx tsc --noEmit` ✅ · `npx eslint .` ✅ · semua `test:*` ✅ (test:status 19 test,
total suite hijau) · `npm run build` ✅.

Perubahan yang dikerjakan:

| Temuan | Berkas | Perubahan |
| --- | --- | --- |
| **OR-A1** | `src/lib/orders.ts` | `markOrderPaid` kini **transaksional** (`runTransaction`) dengan RE-CHECK status di dalam transaksi — mencegah balapan dengan cron kedaluwarsa menimpa status final. Mengembalikan `{ applied, order, reason }`. |
| **OR-A2** | `src/lib/order-status-pure.ts`, `orders.ts`, `webhooks/mayar/route.ts` | Tambah `PAYABLE_STATUSES` + `isPayableStatus` (invariant uang). Guard: hanya `baru`/`menunggu_bayar`/`menunggu_konfirmasi` yang boleh dibayar. Pembayaran "telat" ke order terminal dicatat sebagai `payment_late` (observability) & TIDAK menimpa status. |
| **OR-A4** | `src/app/api/webhooks/mayar/route.ts` | `verifyTokenSoft` → `verifyToken` **KUAT**: bila `MAYAR_WEBHOOK_TOKEN` diisi & tidak cocok → **401 (tidak diproses)**. Bila env kosong → dinonaktifkan + peringatan. Event "Test URL" Mayar dikecualikan. |
| **OR-A3** | `src/lib/order-status-pure.ts`, `orders.ts`, `api/admin/orders/route.ts`, `admin/orders-manager.tsx` | Tambah `ALLOWED_TRANSITIONS` + `isTransitionAllowed` (matriks transisi). `updateOrderStatus` transaksional. API admin menolak transisi tak valid (409 `invalid_transition`). Dropdown status admin hanya menawarkan transisi yang diizinkan. |
| **OR-A5** | `api/admin/orders/route.ts`, `src/lib/coupons.ts` | Restore kuota kupon **sebelum** delete. `restoreCouponUsage` kini mengembalikan `boolean`; bila gagal → batalkan delete (502 `coupon_restore_failed`) agar kuota tidak bocor permanen. |
| Observability | `src/lib/observability.ts` | Tambah `obs.paymentLate`. |
| Test | `scripts/order-status.test.ts` | +8 test (`isPayableStatus`, `isTransitionAllowed`) → total 19 test. |

**Dampak yang perlu diketahui pemilik:**

1. **`MAYAR_WEBHOOK_TOKEN` kini WAJIB cocok bila diisi.** Pastikan token di URL
   webhook Mayar (`.../api/webhooks/mayar?token=<MAYAR_WEBHOOK_TOKEN>`) selaras
   dengan env di Vercel — bila tidak, webhook akan 401 & order tidak otomatis lunas.
   (Uji "Test URL" tetap hijau karena dikecualikan.)
2. **Transisi status kini dibatasi matriks.** Admin dapat melihat opsi yang valid
   saja di dropdown; status terminal (`selesai`/`dibatalkan`/`kedaluwarsa`) tidak
   bisa diubah lagi (harus lewat alur khusus bila perlu koreksi — belum ada).
3. **Pembayaran telat** (order sudah `kedaluwarsa`/`dibatalkan` lalu webhook masuk)
   kini tidak menimpa status — dicatat `payment_late` di log untuk tindak lanjut
   admin (mis. refund manual).

**Belum dikerjakan (batch berikutnya):** Batch 2 (bug & konsistensi data),
Batch 3 (performa/skala), Batch 4 (kualitas & poles).

### Batch 2 — Bug & Konsistensi Data ✅ SELESAI (2026-10-11)

**Gate:** `npx tsc --noEmit` ✅ · `npx eslint .` ✅ · semua `test:*` ✅ · `npm run build` ✅.

| Temuan | Berkas | Perubahan |
| --- | --- | --- |
| **OR-B1** | `src/lib/order-time-pure.ts` (baru), `order-types.ts` | Tambah `coerceISODate` (tangani ISO string, `Date`, Firestore `Timestamp`, epoch). `normalizeOrder` memakainya untuk `createdAt` agar urutan/cursor konsisten untuk dokumen lama. |
| **OR-B2** | `src/lib/order-status-pure.ts`, `order-types.ts`, `auth/account-orders.tsx` | Tambah `AWAITING_PAYMENT_STATUSES` + `isAwaitingPayment`. Tombol "Bayar sekarang" kini pakai predikat tunggal (tidak lagi cek `!==` setengah-setengah) → tidak muncul di order terminal. |
| **OR-B4/B5** | `src/lib/product-format.ts`, `api/orders/route.ts` | Tambah `evaluatePurchase(product, {variantSlug,qty})` — **satu sumber** aturan kelayakan beli (produk & varian seragam, kode alasan spesifik). Checkout route (498→lebih ringkas) memakainya; hapus logika inline yang tersebar. |
| **OR-B7** | `src/lib/order-fulfillment.ts`, `admin/orders-manager.tsx` | Tambah `effectiveFulfillment` (order lama tanpa field → `instan`). Tombol "Buat/kirim ulang unduhan" kini muncul untuk order digital lama. |
| **OR-D2** | `auth/account-orders.tsx` | Hapus duplikat `ORDER_STATUS_CLASS`; pakai `ORDER_STATUS_STYLE` bersama. |
| **OR-D7** | `auth/account-orders.tsx` | Hapus `formatDateTime` lokal; pakai `formatDateTime` dari `@/lib/format`. |
| Test | `scripts/order-status.test.ts`, `product-stock.test.ts`, `order-fulfillment.test.ts`, `order-expiry.test.ts` | +5 test `isAwaitingPayment`, +10 test `evaluatePurchase`, +3 test `effectiveFulfillment`, +7 test `coerceISODate`. |

**Dampak yang perlu diketahui pemilik:**

1. **Kode alasan checkout diseragamkan.** Sebelumnya kode berbeda untuk produk vs
   varian (mis. `variant_soldout` vs `product_soldout`). Kini satu set kode bersih:
   `product_inactive`, `variant_required`, `variant_not_found`, `soldout`,
   `out_of_stock`, `insufficient_stock`, `no_price`. Bila ada klien/integrasi lama
   yang membaca kode lama, perlu disesuaikan. (Keranjang hanya menampilkan `error`
   teks, bukan kode → aman untuk UI saat ini.)
2. **Tombol "Bayar sekarang"** kini hanya tampil untuk status yang benar-benar
   menunggu bayar (`baru`/`menunggu_bayar`/`menunggu_konfirmasi`) & belum lunas.
3. **Tombol unduhan admin** muncul juga untuk order digital lama yang tak punya
   field `fulfillment`.

**Belum dikerjakan (batch berikutnya):** Batch 3 (performa/skala),
Batch 4 (kualitas & poles).

### Batch 3 — Performa & Skala ✅ SELESAI (2026-10-11)

**Gate:** `npx tsc --noEmit` ✅ · `npx eslint .` ✅ · semua `test:*` ✅ · `npm run build` ✅.

> **Temuan kunci:** composite index `uid`+`createdAtISO` & `status`+`createdAtISO`
> **sudah** dideklarasikan di `firestore.indexes.json`. Komentar kode lama yang
> menghindari index sudah usang.

| Temuan | Berkas | Perubahan |
| --- | --- | --- |
| **OR-C1** | `src/lib/orders.ts` | `getOrdersByUser` & `getOrdersPage` memakai query NATIVE (`where` + `orderBy(createdAtISO)` + `startAfter`) yang dilayani composite index. Tambah `isMissingIndexError` + **fallback otomatis** ke penyaringan memori bila index belum dipublikasikan (deploy lama) agar daftar tak kosong. |
| **OR-C2** | `src/lib/orders.ts` | `getOrdersSummary`: omzet via **SUM aggregation** server-side (`AggregateField.sum`) dengan fallback `select("total")`; tambah **cache in-memory TTL 60s** + dedupe in-flight (`summaryInflight`). Cache di-invalidasi otomatis pada `createOrder`/`updateOrderStatus`/`markOrderPaid`/`markOrderExpired`/`deleteOrder` via `invalidateOrdersSummaryCache()`. |
| **OR-C3** | `src/lib/coupons.ts` | `getCouponStats`: **cache TTL 60s** (+ `invalidateCouponStatsCache` saat redeem), agar halaman kupon tidak memuat seluruh koleksi berulang. |
| **OR-D4** | `admin/orders-manager.tsx` | Copy jujur: “Menampilkan X dari Y pesanan termuat” + hint bahwa pencarian hanya menyaring yang termuat. |
| **OR-D5** | `src/lib/orders.ts` | Paginasi native memakai `startAfter(createdAtISO)` + `limit+1` (deteksi `hasMore` akurat), memperbaiki kasus “Muat lagi” yang tak menambah item. |

**Dampak yang perlu diketahui pemilik:**

1. **Index Firestore perlu dipublikasikan** (`firebase deploy --only firestore:indexes`)
   agar jalur native aktif. Bila belum, sistem **tetap jalan** lewat fallback memori
   (hanya lebih lambat di volume besar). Index `uid`/`status`+`createdAtISO` sudah
   ada di `firestore.indexes.json`.
2. **Ringkasan pesanan di-cache ~60 detik** (per instance serverless). Angka badge
   bisa tertunda maksimal 1 menit setelah perubahan dari instance lain — wajar & sudah
   di-invalidasi pada instance yang menulis.
3. **Statistik kupon di-cache ~60 detik**.

**Belum dikerjakan (batch berikutnya):** Batch 4 (kualitas & poles).

### Batch 4 — Kualitas & Poles ✅ SELESAI (2026-10-11)

**Gate:** `npx tsc --noEmit` ✅ · `npx eslint .` ✅ · semua `test:*` ✅ · `npm run build` ✅.

| Temuan | Berkas | Perubahan |
| --- | --- | --- |
| **OR-E1** | `src/lib/checkout.ts` (baru), `api/orders/route.ts` | Orkestrasi checkout (validasi item, kupon, reservasi, createOrder, invoice, email) dipindah dari route ke `performCheckout(input, actor)`. Route POST 388 → ~95 baris (handler tipis). |
| **OR-E3** | `order-status-pure.ts`, `order-types.ts` | `ORDER_STATUS_LIST` jadi SATU sumber kanonik; `OrderStatusName` & `ORDER_STATUSES` diturunkan dari situ. Test konsistensi menambah jaminan anti-drift. |
| **OR-E4** | `admin-orders-api.ts` | Hapus `formatTotal` (pembungkus mati) + import `formatRupiah` yang tak terpakai. |
| **OR-E6** | `email-config.ts` (baru), 6 modul email | Sentralisasi `RESEND_ENDPOINT` + `getResendApiKey/getFromEmail/getReplyTo`. Hapus duplikasi konstanta di `email.ts`, `email-order.ts`, `email-cart.ts`, `email-broadcast.ts`, `email-report.ts`, `email-wishlist.ts`. |
| **OR-B3** | `api/products/current/route.ts` (baru), `order-api.ts`, `auth/user-account.tsx` | Endpoint publik `GET /api/products/current?slugs=&variants=` (harga/kelayakan terkini). "Pesan lagi" kini menghidrasi harga aktual & melewati produk yang tak tersedia (dengan toast informatif). |
| **OR-D1** | `app/produk/page.tsx`, `app/keranjang/page.tsx` | Copy/metadata tidak lagi menyebut "checkout via WhatsApp" saja — mencerminkan pembayaran online + WhatsApp fallback. |
| **OR-D3** | `admin/orders-manager.tsx` | Kartu ringkasan melengkapi semua status (dibayar/diproses/selesai/dibatalkan/kedaluwarsa). |
| **OR-D6** | `app/unduhan/[token]/page.tsx` | Copy kuota unduhan jelas: "Dipakai N/M unduhan (total semua berkas)". |
| **OR-A6** | `api/webhooks/mayar/route.ts` | Nilai kurang-bayar TIDAK lagi menandai `payment.status="gagal"` (menyesatkan) — order dibiarkan `menunggu_bayar` + catat `paymentMismatch`. |
| **OR-A7** | `api/downloads/[token]/[index]/route.ts` | Tambah rate-limit per-IP (60/menit) pada endpoint berkas unduhan. |
| **OR-B6** | `order-types.ts` | `subtotal` pakai cek `typeof number` eksplisit (bukan `||` yang menutupi subtotal 0 valid). |
| **OR-E5** | `observability.ts`, `checkout.ts` | Tambah `obs.checkoutCompleted` (event jalur uang terstruktur). |
| Test | `scripts/order-status.test.ts` | +3 test konsistensi status (total 27). |

**Dampak yang perlu diketahui pemilik:**

1. **Endpoint publik baru** `GET /api/products/current` (harga/kelayakan produk —
   data publik; aman). Dipakai fitur "Pesan lagi".
2. **Perilaku "Pesan lagi" berubah:** kini memakai harga TERKINI & melewati produk
   yang sudah tidak tersedia/aktif (dengan pesan). Bila semua item tak tersedia,
   tidak ada yang ditambahkan.
3. **Webhook kurang-bayar** tidak lagi mengubah status pembayaran jadi "gagal";
   hanya mencatat mismatch. Admin perlu menindak manual (mis. refund/minta selisih).

### ✅ RINGKASAN AKHIR AUDIT SISTEM PESANAN

Seluruh 4 batch **selesai**. Total temuan ditangani:
- 🔴 Kritis: **2/2** (OR-A1, OR-A4).
- 🟠 Menengah: **14/14** (OR-A2, A3, A5, B1, B2, B4, B5, B7, C1, C2, C3, D1, D2, E1).
- 🔵 Rendah: **13/15** (OR-A6, A7, B3, B6, D3, D4, D5, D6, D7, E3, E4, E5, E6) — **2 diterima**
  & didokumentasikan sebagai risiko minimal (OR-B8 collision kode 8-karakter; OR-C4 race token unduhan).

**Gate akhir:** `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ · `build` ✅.
