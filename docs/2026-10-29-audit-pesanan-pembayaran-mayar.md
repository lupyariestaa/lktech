# Audit Menyeluruh — Pesanan, Pembayaran Mayar, Alur, Harga

- **Tanggal audit:** 29 Oktober 2026
- **Lingkup:** checkout → invoice Mayar → webhook → status pesanan → fulfillment → kedaluwarsa → tampilan pembeli/admin
- **Metode:** pembacaan kode baris-per-baris, penelusuran bukti runtime (Vercel Runtime Logs + Riwayat Webhook Mayar), reproduksi skema dengan Node, dan penelusuran riwayat git untuk menentukan kapan regresi masuk.
- **Sifat dokumen:** temuan + rencana perbaikan. **Tidak ada perubahan kode pada commit audit ini.**
- **Catatan keamanan:** tidak ada API key/webhook token yang ditulis di dokumen ini. Token yang pernah tampil di tangkapan layar tetap disarankan dirotasi.

---

## 1. Ringkasan Eksekutif

Ada **tiga kegagalan berlapis** yang saling menutupi, sehingga setiap kali satu diperbaiki, gejala yang tersisa terlihat seperti "masalah baru".

| # | Lapisan | Status | Dampak |
|---|---|---|---|
| L1 | Skema checkout menolak keranjang produk percetakan (`printOptions.strict()` + kunci `finishing`) | ✅ sudah diperbaiki (`6eb9f45`) | checkout banner/percetakan gagal 400 |
| L2 | **`markOrderPaid` menulis nilai `undefined` ke Firestore → transaksi selalu gagal** | ❌ **belum diperbaiki** | pesanan **tidak pernah** bisa menjadi `dibayar` dari webhook maupun dari tombol admin |
| L3 | **`markOrderExpired` menulis nilai `undefined` ke Firestore → transaksi selalu gagal** | ❌ **belum diperbaiki** | pesanan **tidak pernah** bisa menjadi `kedaluwarsa` secara otomatis |

Kesimpulan kunci:

> **Webhook Mayar saat ini sudah BERHASIL diterima (HTTP 200, token cocok), tetapi penerapan statusnya selalu gagal di dalam aplikasi.** Status `SUCCESS` pada Riwayat Webhook hanya berarti "endpoint kita membalas 2xx", **bukan** "pesanan sudah lunas". Inilah sebabnya pesanan yang sudah dibayar tetap "Menunggu Bayar", dan sekaligus sebabnya pesanan yang sudah lewat jatuh tempo tetap "Menunggu Bayar".

Bukti paling kuat (29 Okt 2026, pesanan `IGzkhRpDAX22VFXKjxyL`, Rp180.000):

```
[webhook/mayar] 22:31:12  gagal memproses:
  Can't use "undefined" as a Firestore value (found in field "payment.manual")
[orders] markOrderPaid gagal: IGzkhRpDAX22VFXKjxyL (error yang sama)
Riwayat Webhook: payment.received  29 Okt 22:31  SUCCESS  (balasan kita: kosong)
Status pesanan di aplikasi: Menunggu Bayar
```

Transport ✅ · Autentikasi ✅ · Validasi nominal ✅ · **Penulisan status ❌**.

---

## 2. Bukti Lapangan

### 2.1 Riwayat Webhook Mayar (admin)

| Waktu | Event | Status kirim | Order | Nominal | Catatan |
|---|---|---|---|---|---|
| 29 Okt 22:31 | `payment.received` | **SUCCESS** | `IGzkhRpDAX22VFXKjxyL` | Rp180.000 | token cocok; aplikasi gagal menyimpan |
| 28 Okt 22:32 | `payment.received` | FAILED | `5dJMpUZLRivRkxRVKITv` | Rp149.000 | token tidak cocok saat itu |
| 28 Okt 22:17 | `payment.received` | FAILED | `5dJMpUZLRivRkxRVKITv` | Rp149.000 | idem |
| 27 Okt | `payment.received` | SUCCESS | — | — | periode sebelum token berubah |

### 2.2 Log Vercel (Runtime Logs, 29 Okt 22:31)

```
22:31:12.330  [orders] markOrderPaid gagal: IGzkhRpDAX22VFXKjxyL
              Error: Value for argument "dataOrField" is not a valid Firestore value.
              Cannot use "undefined" as a Firestore value (found in field "payment.manual").
              If you want to ignore undefined values, enable `ignoreUndefinedProperties`.
22:31:12.331  [webhook/mayar] gagal memproses: (error yang sama)
22:30:30.988  [email-order] Resend gagal (attempt 1/3): 403 — domain belum terverifikasi
22:31:28.920  [orders] index uid+createdAtISO belum tersedia — fallback
```

### 2.3 Riwayat git (kapan regresi masuk)

| Commit | Tanggal | Isi |
|---|---|---|
| `da6af54` | 4 Okt | `normalizeOrderPayment()` diperkenalkan (mengembalikan **semua** kunci, termasuk yang bernilai `undefined`) |
| `f8f6a2c` | 5 Okt | FASE P2 — menambah `manual: d.manual === true ? true : undefined` dan alur kedaluwarsa otomatis |
| `4052ec7` | 25 Okt | audit order/checkout (memperketat skema) |
| `4ddce2a` | 25 Okt | fitur harga cetak — menyimpan `finishing` di dalam `printOptions` |

Artinya L2/L3 sudah ada sejak awal Oktober, dan **tidak pernah** tertangkap karena webhook tetap membalas 200.

---

## 3. Peta Alur End-to-End (titik gagal ditandai)

```
[Keranjang] ──toCheckoutItems()──► POST /api/orders
                                        │
                                   checkoutSchema           ✅ (diperbaiki 6eb9f45)
                                        │
                                   performCheckout()
                                        ├─ harga dihitung ulang dari Firestore     ✅
                                        ├─ kupon divalidasi + kuota direservasi    ✅
                                        ├─ createOrder() → status menunggu_bayar   ✅
                                        └─ createInvoice() Mayar                   ✅ (mode sandbox)
                                              │
                                              ▼
                                   pembeli bayar di ltktech.myr.id                 ✅
                                              │
                                              ▼
                            POST /api/webhooks/mayar
                                        ├─ rate limit                               ⚠ F-10
                                        ├─ verifikasi token                         ✅
                                        ├─ extractMayarPaymentEvent()              ✅
                                        ├─ validateMayarPayment() (nominal exact)  ⚠ F-06
                                        ├─ markOrderPaid()                         ❌ F-01
                                        │     └─ tx.update({ payment, servicePayment })
                                        │        → "undefined is not a valid Firestore value"
                                        └─ balas 200 walau gagal                   ❌ F-03
                                              │
                                              ▼
                                   status tetap "menunggu_bayar"  ← GEJALA UTAMA
                                              │
                    ┌─────────────────────────┴──────────────────────────┐
                    ▼                                                    ▼
        cron expire-orders (tiap jam)                        tampilan pembeli/admin
        └─ markOrderExpired() ❌ F-02                        └─ "Menunggu Bayar" + Bayar sekarang
           (undefined poisoning)                                 (tanpa cek waktu) ❌ F-05
```

---

## 4. Temuan P0 — Blocker Uang

### F-01 · `markOrderPaid` selalu gagal: nilai `undefined` ditulis ke Firestore

**Lokasi**
- `src/lib/order-types.ts:172–196` — `normalizeOrderPayment()`
- `src/lib/orders.ts:860–885` — `markOrderPaid()`

**Akar masalah (dua sumber sekaligus)**

1. `normalizeOrderPayment()` mengembalikan objek dengan **semua kunci**, termasuk yang tidak ada di dokumen:

```ts
// src/lib/order-types.ts:180-195
return {
  provider,
  status,
  invoiceId: str(d.invoiceId) || undefined,
  transactionId: str(d.transactionId) || undefined,
  payUrl: str(d.payUrl) || undefined,
  expiresAt: str(d.expiresAt) || undefined,
  amount: ... : undefined,
  method: str(d.method) || undefined,
  paidAt: str(d.paidAt) || undefined,
  manual: d.manual === true ? true : undefined,   // ← pemicu pada log
  component: ... : undefined,
  baseAmount: ... : undefined,
  discountAmount: ... : undefined,
  amountExpected: ... : undefined,
};
```

2. `markOrderPaid()` menyebar objek hasil normalisasi itu kembali ke `tx.update()`:

```ts
// src/lib/orders.ts:860-869
const payment = {
  ...payRef,                                   // ← membawa semua kunci `undefined`
  provider: payRef.provider ?? "mayar",
  status: "dibayar" as const,
  transactionId: info.transactionId ?? payRef.transactionId,
  method: info.method ?? payRef.method,
  amount: typeof info.amount === "number" ? info.amount : payRef.amount,
  paidAt: at,
  ...(current.payment?.manual ? { manual: true } : {}),
};

// src/lib/orders.ts:875-877
const nextPayment = payRef.component === "service"
  ? { payment: current.payment, servicePayment: payment }
  : { payment, servicePayment: current.servicePayment };  // ← undefined bila tak ada jasa
```

Admin SDK Firestore **menolak** `undefined` di dalam nilai field. Jadi ada **dua** pemicu independen pada jalur ini:

- `payment.manual` (dan `method`, `paidAt`, dll.) bernilai `undefined`;
- `servicePayment: undefined` pada order non-campuran.

**Dampak**
- Tidak ada satu pun pesanan ber-invoice Mayar yang bisa menjadi `dibayar` lewat webhook.
- Tombol admin **"Periksa pembayaran"** (`invoice-verify`) juga memanggil `markOrderPaid()` → ikut gagal (`409 Gagal memverifikasi invoice`).
- Fulfillment (link unduhan + email "pembayaran diterima") **tidak pernah** berjalan.
- Webhook membalas 200 → Mayar menganggap terkirim → **tidak ada percobaan ulang**.

**Reproduksi (tanpa mengubah data)**
1. Ambil dokumen order dengan `payment.status = "menunggu"` yang tidak punya `payment.manual`.
2. Panggil `markOrderPaid(id, { amount, invoiceId })`.
3. Error: `Cannot use "undefined" as a Firestore value (found in field "payment.manual")`.

**Perbaikan yang disarankan**

a. **Buang `undefined` di batas tulis Firestore** (satu helper, dipakai semua jalur tulis):

```ts
// src/lib/firestore-sanitize-pure.ts (baru, murni + teruji)
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)).filter((v) => v !== undefined) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}
```

b. Jangan menyebar objek hasil normalisasi; **susun ulang** objek tulis dari field yang pasti ada (pola *whitelist*), sama seperti `checkout.ts` yang sudah benar.

c. Ganti `servicePayment: current.servicePayment` menjadi spread kondisional:

```ts
const nextPayment = payRef.component === "service"
  ? { payment: current.payment, servicePayment: payment }
  : { payment, ...(current.servicePayment ? { servicePayment: current.servicePayment } : {}) };
```

d. **Pertahanan berlapis:** aktifkan `ignoreUndefinedProperties` pada instance Firestore, supaya satu kelalaian di masa depan tidak lagi mematikan seluruh alur uang:

```ts
// src/lib/firebase-admin.ts
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });
return db;
```

> Catatan: (d) **bukan** pengganti (a–c). Tanpanya, bug seperti ini akan berulang. Dengannya, bug yang sama menjadi tidak fatal.

e. Uji regresi wajib: `markOrderPaid` pada order **tanpa** `servicePayment`, **tanpa** `manual`, dan **campuran** harus berhasil (`applied: true`).

---

### F-02 · `markOrderExpired` selalu gagal: akar masalah sama

**Lokasi:** `src/lib/orders.ts:1126–1135`

```ts
const payment = current.payment
  ? { ...current.payment, status: "kedaluwarsa" as const }   // ← membawa undefined
  : undefined;

tx.update(ref, {
  status: "kedaluwarsa",
  ...(payment ? { payment } : {}),
  updatedAtISO: atISO,
  updatedBy: "system:expire",
});
```

**Dampak**
- **Semua** pesanan Mayar yang lewat jatuh tempo **tetap** `menunggu_bayar` selamanya. Ini persis gejala yang dilaporkan: *"invoice yang sudah kedaluwarsa masih status menunggu bayar"*.
- Kuota kupon **tidak** dikembalikan (`restoreCouponUsage` hanya berjalan setelah transisi sukses).
- Email "kedaluwarsa" tidak pernah terkirim.

**Kenapa tidak terlihat di dashboard cron**
`src/lib/order-expiry.ts:93–95` menangkap error **per order** dan hanya `console.error`. Endpoint membalas:

```json
{ "ok": true, "scanned": 5, "expired": 0 }
```

Jadi pemantauan melihat "cron sukses" padahal **tidak ada satu pun** order diproses. Tidak ada alarm ketika `scanned > 0 && expired === 0`.

**Perbaikan:** sama seperti F-01 (strip undefined / susun ulang objek), **plus**:
- `expirePendingOrders` mengembalikan `failed: number` + `failedIds`, dan endpoint membalas status non-2xx bila `failed > 0` (agar GitHub Actions menandai run merah).
- Log memakai level `error` dengan tepat satu baris ringkasan.

---

### F-03 · Webhook membalas HTTP 200 saat pemrosesan gagal (kegagalan senyap)

**Lokasi:** `src/app/api/webhooks/mayar/route.ts:182–186`

```ts
} catch (err) {
  console.error("[webhook/mayar] gagal memproses:", err);
  // 200 agar Mayar tidak menumpuk retry pada error tak terduga.
  return NextResponse.json({ ok: true, error: "processing_failed" });
}
```

**Dampak**
- Kegagalan **persisten** (seperti F-01) tidak pernah dicoba ulang selamanya.
- Riwayat webhook menampilkan `SUCCESS` sehingga diagnosis menyesatkan (sudah menelan banyak waktu debugging).
- Uang sudah diterima Mayar, pesanan tidak pernah lunas.

**Perbaikan yang disarankan** — bedakan kelas error:

| Kelas | Contoh | Respons |
|---|---|---|
| Permanen / tak relevan | `order_not_found`, `unhandled_event` | `200` (jangan diulang) |
| Bukti tidak cocok | `amount_mismatch`, `invoice_mismatch` | `200` + catat `paymentIssue` (jangan diulang) |
| **Gagal sementara/infra** | Firestore error, timeout, exception tak terduga | **`500`** → Mayar mengulang |

Tambahkan idempotensi (sudah ada di `markOrderPaid`) agar retry aman. Ini akan otomatis menyembuhkan diri untuk gangguan sesaat.

---

## 5. Temuan P1 — Kebenaran Status & Uang

### F-04 · Tidak ada penanda "lewat jatuh tempo" pada panel perhatian admin

**Lokasi:** `src/lib/orders-filter-pure.ts:252–258`

```ts
if (order.status === "menunggu_bayar" && order.payment?.expiresAt) {
  const left = t - nowMs;
  if (left > 0 && left < 6 * 60 * 60 * 1000) reasons.push("bayar_segera");
}
```

Hanya menangani **hampir** kedaluwarsa (`left > 0`). Bila `left <= 0` (sudah lewat) **tidak ada alasan apa pun** yang muncul. Padahal justru kondisi inilah yang paling berbahaya.

**Perbaikan:** tambah alasan `terlambat_bayar` / `expired_not_applied` saat `left <= 0` dan status masih `menunggu_bayar`, dengan label *"Lewat jatuh tempo, belum ditandai kedaluwarsa"*. Ini juga berfungsi sebagai deteksi dini bila cron mati lagi.

### F-05 · UI tetap menawarkan "Bayar sekarang" pada invoice yang sudah kedaluwarsa

**Lokasi:** `src/lib/order-status-pure.ts:194–202` (`isAwaitingPayment`), dipakai `src/components/auth/account-orders.tsx:60`

```ts
export function isAwaitingPayment(order: { status: string; payment?: {...} }): boolean {
  const payUrl = order.payment?.payUrl;
  if (!payUrl) return false;
  if (order.payment?.status === "dibayar") return false;
  return AWAITING_PAYMENT_STATUSES.includes(order.status);
}
```

Fungsi ini **tidak memeriksa `expiresAt`**. Selama status masih `menunggu_bayar` (yang, karena F-02, selalu begitu), tombol bayar terus muncul dan tautan membuka halaman invoice yang sudah mati.

**Perbaikan:** tambahkan `now`/`expiresAt` sebagai parameter (tetap fungsi murni & teruji) dan sembunyikan tombol + tampilkan label *"Kedaluwarsa"* bila `expiresAt < now`. Lakukan juga **fallback tampilan** di klien: bila `expiresAt` sudah lewat tetapi status masih `menunggu_bayar`, tampilkan "Menunggu konfirmasi sistem" — jangan menyesatkan pembeli.

### F-06 · Korelasi invoice komponen jasa pada order campuran (barang + jasa)

**Lokasi:** `src/app/api/webhooks/mayar/route.ts:95–105`

```ts
const matchedPayment = invoiceId && order.servicePayment?.invoiceId === invoiceId
  ? order.servicePayment
  : order.payment;
```

Bila Mayar **tidak** mengirim `invoiceId` (didokumentasikan sering tidak ada), maka:
- pembayaran invoice **jasa** akan dicocokkan ke `order.payment` (komponen **barang**) → nominal tidak sama → `amount_mismatch` + `paymentIssue`;
- atau bila kebetulan nominalnya sama, `markOrderPaid` menemukan `payment.status === "dibayar"` → membalas `already_paid` → **pembayaran jasa hilang**.

Selain itu, `markOrderPaid` mensyaratkan `servicePayment.status === "dibayar"` agar status order menjadi `dibayar` (`src/lib/orders.ts:871–874`). Untuk order campuran, invoice jasa baru dibuat **manual oleh admin**, sehingga order bisa menggantung di `menunggu_konfirmasi` tanpa batas.

**Perbaikan:**
- Simpan `transactionId` **per komponen** dan cocokkan lewat `transactionId` **atau** `invoiceId` **atau** `extraData.orderId + component`.
- Tambahkan `extraData: { orderId, component }` pada **setiap** invoice (checkout & manual) agar webhook selalu dapat menentukan komponen tanpa menebak.
- Definisikan eksplisit kapan order campuran dianggap selesai (mis. `barang` lunas + admin menandai jasa selesai), lalu dokumentasikan di matriks status.

### F-07 · `invoice-verify` membandingkan tipe data mentah

**Lokasi:** `src/app/api/admin/orders/route.ts:654–670`

```ts
if (detail.amount !== expected) { ... amount_mismatch ... }
```

`getInvoice()` mendeklarasikan `amount: number`, tetapi API eksternal bisa mengirim string (`"180000"`). Perbandingan `!==` pada string vs number **selalu** benar → rekonsiliasi sah akan ditolak sebagai mismatch.

**Perbaikan:** normalisasi di `getInvoice()` (`Number(...)` + `Number.isSafeInteger`) sebelum dipakai, dan bandingkan pada nilai ter-normalisasi.

### F-08 · Pembayaran terlambat: uang masuk, pesanan dibatalkan, tanpa jalur refund

Bila invoice dibayar **setelah** order menjadi `kedaluwarsa`/`dibatalkan`, webhook mencatat `late_payment` dan membalas `200` (`route.ts:144–157`) tanpa tindakan lanjut. Uang sudah diterima, tetapi:
- tidak ada notifikasi ke admin selain baris log;
- tidak ada antrean "perlu refund / perlu tindakan";
- pembeli tidak menerima apa pun.

**Perbaikan:** simpan `paymentLate` sebagai field pada order, tampilkan di panel perhatian admin, dan sertakan pada laporan harian.

### F-09 · Tidak ada rekonsiliasi otomatis setelah webhook gagal

Saat ini satu-satunya jalan pemulihan adalah admin menekan **"Periksa pembayaran"** per pesanan (dan itu pun ikut gagal karena F-01). Tidak ada sapu bersih berkala.

**Perbaikan:** cron `reconcile-payments` (mis. tiap 15 menit) yang:
1. mengambil order `menunggu_bayar` dengan `payment.status = "menunggu"` dan `expiresAt` belum lewat,
2. memanggil `getInvoice()` ke Mayar,
3. bila `paid` + nominal sama → `markOrderPaid()`.

Ini menjadikan webhook sebagai *fast path*, bukan *single point of failure*.

---

## 6. Temuan P2 — Ketahanan & Operasional

| ID | Temuan | Lokasi | Dampak | Saran |
|---|---|---|---|---|
| F-10 | Rate limit webhook memakai kunci **global** (`webhook:mayar`, 60/menit) dan membalas **200** saat kena limit | `route.ts:38–43` | saat retry menumpuk, event **hilang permanen** | kunci per-IP + balas `429` agar Mayar mengulang |
| F-11 | `new Date(invoice.expiredAt).toISOString()` tanpa validasi | `checkout.ts:337` | bila Mayar mengirim detik/string, `Invalid Date` → checkout gagal padahal invoice sudah dibuat | validasi `Number.isFinite` + konversi satuan, fallback TTL |
| F-12 | `isInvoicePaid()` hanya menerima `"paid"` | `mayar.ts:229–231` | status ekuivalen (mis. `settled`/`success`) dianggap belum lunas | tabel pemetaan status eksplisit + uji |
| F-13 | Tidak ada alarm "webhook SUCCESS tapi order tidak berubah" | — | kegagalan senyap berlangsung berhari-hari | metrik `webhook_applied_total` vs `webhook_received_total`, alert bila selisih |
| F-14 | Email ke pembeli 403 (domain Resend belum terverifikasi) | `src/lib/email-order.ts` | pembeli tidak menerima konfirmasi/link unduhan | verifikasi domain; sementara tampilkan status "email tidak terkirim" di admin (sudah ada `email_gagal`) |
| F-15 | `/api/cart/draft` menulis `variantSlug: undefined` → **seluruh** draft gagal disimpan | `src/lib/cart-draft-pure.ts` | pengingat keranjang terbengkalai tidak pernah jalan | ✅ sudah diperbaiki (`6eb9f45`) |
| F-16 | `printOptions.strict()` menolak keranjang lama | `src/lib/order-schema.ts` | checkout percetakan gagal 400 | ✅ sudah diperbaiki (`6eb9f45`) |
| F-17 | Kesalahan validasi checkout tidak menyebut field | `src/app/api/orders/route.ts` | debugging lambat | ✅ sudah diperbaiki (`6eb9f45`) |
| F-18 | `clearFailedInvoiceRecovery` menulis `invoiceRecovery: null` (bukan `FieldValue.delete()`) | `orders.ts:733` | dokumen menyimpan `null`, pembacaan harus toleran `null` | gunakan `FieldValue.delete()` atau sepakati `null` secara konsisten |
| F-19 | Observability pembayaran hanya log, tanpa metrik kegagalan | `src/lib/observability.ts` | tidak ada deteksi dini | tambah counter `payment_apply_failed` |

---

## 7. Audit Harga & Diskon

| Aspek | Hasil | Catatan |
|---|---|---|
| Harga tidak dipercaya dari klien | ✅ | `performCheckout` menghitung ulang dari Firestore |
| Harga cetak (area) | ✅ | `calculatePrintUnitPrice` memvalidasi batas ukuran, presisi 2 desimal, `minPricePerUnit`, `Number.isSafeInteger` |
| Harga cetak (lembar) | ✅ | divalidasi di `evaluatePurchase` |
| Diskon proporsional | ✅ | `allocateDiscountByItem` memakai *largest remainder*, jumlah **tepat** sama dengan diskon |
| Diskon > subtotal | ✅ ditolak | `discount > total` → throw, ditangani sebagai kegagalan checkout |
| Invoice memakai dua baris (subtotal, −diskon) | ✅ | total invoice = total order |
| Order campuran (barang+jasa) | ⚠ F-06 | invoice hanya menagih komponen barang; komponen jasa manual |
| Pembulatan `Math.round` pada tampilan | ✅ | hanya tampilan; nilai tersimpan integer |

**Kesimpulan harga:** tidak ditemukan celah manipulasi harga. Satu-satunya risiko nominal ada pada **korelasi invoice** (F-06) dan **parsing tipe angka** (F-07).

---

## 8. Audit Keamanan

| Kontrol | Hasil |
|---|---|
| Token webhook fail-closed di production | ✅ (503 bila belum diisi) |
| Perbandingan token constant-time | ✅ `timingSafeEqual` |
| Toleransi encoding `+`/spasi | ✅ `canonicalizeToken` (`363918c`) |
| Token tidak bocor ke klien | ✅ URL disamarkan (`token=***`) |
| Nominal wajib ada & sama persis | ✅ `validateMayarPayment` |
| `data.id` tidak diperlakukan sebagai `invoiceId` | ✅ |
| Rate limit endpoint mutasi admin | ✅ `guardAdminMutation` |
| Audit log aksi sensitif | ✅ termasuk `order.invoice.verify`, `payment.webhook.sync` |
| **Rahasia yang pernah tampil di tangkapan layar** | ⚠ **rotasi `MAYAR_WEBHOOK_TOKEN`** |
| **Endpoint cron memakai `?token=`** | ⚠ diterima; GitHub Actions sudah memakai header `Authorization` — pertimbangkan menonaktifkan fallback query agar tidak bocor di log proxy |

---

## 9. Audit Alur & Copy (pesan/prompt ke pembeli & admin)

| Titik | Temuan | Saran |
|---|---|---|
| Halaman keranjang | pesan error generik "Data keranjang tidak valid" sebelumnya tanpa lokasi | ✅ diperbaiki (kini menyebut `items.0.printOptions`) |
| Setelah checkout invoice gagal | sudah ada peringatan "Jangan bayar dulu" | ✅ baik — pertahankan |
| Kartu pesanan pembeli | "Pesanan menunggu pembayaran. Selesaikan sebelum …" tetap tampil walau waktu sudah lewat | tambahkan status "Kedaluwarsa" berbasis waktu (F-05) |
| Email "pembayaran diterima" | bergantung Resend (403) | verifikasi domain; tampilkan status kirim di admin |
| Panel admin | tidak ada penanda "lewat jatuh tempo" | tambah alasan perhatian (F-04) |
| Riwayat webhook | `SUCCESS` mudah disalahartikan sebagai "pesanan lunas" | ubah label menjadi "Terkirim (2xx)" + kolom **"Diterapkan ke pesanan: ya/tidak"** |

**Rekomendasi copy penting:** ganti `SUCCESS` pada tabel riwayat menjadi **`TERKIRIM`** dan tambahkan kolom **`Diterapkan`**, agar operator tidak lagi menyimpulkan status pesanan dari status transport.

---

## 10. Matriks Status vs Realita

| Status | Seharusnya tercapai lewat | Realita hari ini |
|---|---|---|
| `menunggu_bayar` | checkout ber-invoice | ✅ |
| `dibayar` | webhook `payment.received` | ❌ **tidak pernah** (F-01) |
| `dibayar` | admin "Periksa pembayaran" | ❌ **tidak pernah** (F-01) |
| `dibayar` | admin ubah status manual | ✅ (menulis hanya `status`) |
| `kedaluwarsa` | cron `expire-orders` | ❌ **tidak pernah** (F-02) |
| `kedaluwarsa` | admin ubah status manual | ✅ |
| `diproses` / `selesai` | admin | ✅ |

> Pola ini menjelaskan mengapa "kadang berhasil": satu-satunya jalur yang berfungsi adalah **perubahan status manual oleh admin**, karena jalur itu tidak menulis objek `payment` hasil normalisasi.

---

## 11. Rencana Perbaikan

### Tahap 1 — Hotfix P0 (wajib, sebelum uji pembayaran berikutnya)

1. **Helper `stripUndefined()`** (file murni + unit test).
2. **`markOrderPaid`**: susun objek tulis secara eksplisit, spread kondisional untuk `servicePayment`, bungkus dengan `stripUndefined`.
3. **`markOrderExpired`**: sama.
4. **`getAdminDb()`**: `db.settings({ ignoreUndefinedProperties: true })` sebagai jaring pengaman.
5. **Webhook**: balas `500` untuk error non-permanen (agar retry).
6. **`expire-orders`**: laporkan `failed`, dan jadikan run gagal bila `failed > 0`.

**Kriteria selesai Tahap 1**

- Unit test: `markOrderPaid` sukses pada order tanpa `servicePayment`/`manual`.
- Uji sandbox: bayar 1 invoice baru → webhook `SUCCESS` **dan** pesanan berubah `dibayar` **dan** link unduhan/email terpicu.
- Uji sandbox: buat order, tunggu lewat jatuh tempo (atau set `MAYAR_INVOICE_TTL_MINUTES=1`) → cron menandai `kedaluwarsa`.

### Tahap 2 — P1

7. `isAwaitingPayment` + tampilan berbasis `expiresAt` (F-05).
8. Alasan perhatian "lewat jatuh tempo" (F-04).
9. Normalisasi `getInvoice().amount` (F-07).
10. `extraData.component` pada semua invoice + korelasi per komponen (F-06).
11. Cron `reconcile-payments` (F-09).
12. Panel "pembayaran terlambat / perlu refund" (F-08).

### Tahap 3 — P2

13. Rate limit per-IP + `429` (F-10).
14. Validasi `expiredAt` (F-11), pemetaan status invoice (F-12).
15. Metrik & alarm selisih webhook (F-13, F-19).
16. Verifikasi domain Resend (F-14).
17. Konsistensi `null` vs `delete` (F-18).

### Rekonsiliasi data lama (setelah kode diperbaiki)

Order yang sudah dibayar di Mayar tetapi masih `menunggu_bayar` **tidak** akan disembuhkan oleh retry webhook (Mayar tidak mengirim ulang untuk invoice yang sudah lunas). Jalankan rekonsiliasi terkontrol:

1. Dari panel admin, buka detail pesanan → **"Periksa pembayaran"** (setelah F-01 diperbaiki, tombol ini berfungsi).
2. Verifikasi manual di Mayar: status `paid` **dan** nominal sama persis.
3. Jangan menandai lunas tanpa bukti; jangan membuat invoice baru untuk pesanan yang sudah punya invoice lunas.

---

## 12. Checklist Verifikasi End-to-End (setelah Tahap 1)

```
[ ] 1. Buat order baru (banner 3×2 m, finishing Mata ayam) → invoice terbuka
[ ] 2. Bayar QRIS di sandbox
[ ] 3. Riwayat webhook: payment.received = SUCCESS, balasan kita berisi {"ok":true}
[ ] 4. Vercel log: TIDAK ada "markOrderPaid gagal"
[ ] 5. /akun: status berubah "Dibayar", tombol Bayar hilang
[ ] 6. Link unduhan muncul (bila produk digital)
[ ] 7. Email "pembayaran diterima" tercatat di log (boleh 403 bila domain belum verified)
[ ] 8. Admin: order menampilkan pembayaran diterima + audit log order.invoice.verify
[ ] 9. Buat order uji dengan TTL 1 menit, tunggu cron → status "Kedaluwarsa"
[ ] 10. Kuota kupon kembali (bila memakai kupon)
```

---

## 13. Lampiran — File yang Diaudit

| File | Fokus |
|---|---|
| `src/app/api/orders/route.ts` | validasi checkout, pesan error |
| `src/lib/checkout.ts` | orkestrasi checkout, invoice, kupon |
| `src/lib/order-schema.ts` | skema payload checkout |
| `src/lib/checkout-payload-pure.ts` | penyusun payload (baru) |
| `src/lib/order-types.ts` | `normalizeOrder`, `normalizeOrderPayment` |
| `src/lib/orders.ts` | `markOrderPaid`, `markOrderExpired`, `updateOrderStatus`, `updateOrderPayment`, recovery |
| `src/lib/order-expiry.ts` | orkestrasi kedaluwarsa |
| `src/lib/order-expiry-pure.ts` | predikat `isOrderExpired` |
| `src/lib/order-status-pure.ts` | matriks transisi, `isAwaitingPayment` |
| `src/lib/orders-filter-pure.ts` | `attentionReasons` |
| `src/lib/order-fulfillment.ts` | alokasi diskon, tipe fulfillment |
| `src/lib/order-payment.ts` | fulfillment, invoice manual |
| `src/lib/mayar.ts` | klien Mayar, `getInvoice`, `isInvoicePaid`, riwayat webhook |
| `src/lib/mayar-webhook-pure.ts` | ekstraksi & validasi bukti pembayaran |
| `src/app/api/webhooks/mayar/route.ts` | penerimaan webhook |
| `src/app/api/admin/orders/route.ts` | aksi admin (verify, reconcile, invoice) |
| `src/app/api/cron/expire-orders/route.ts` | cron kedaluwarsa |
| `.github/workflows/cron.yml` | penjadwalan cron |
| `src/lib/firebase-admin.ts` | inisialisasi Firestore |
| `src/lib/cart.ts`, `src/lib/cart-draft-pure.ts` | item keranjang & draft |
| `src/components/auth/account-orders.tsx` | tampilan pesanan pembeli |
| `src/components/admin/settings/settings-pembayaran.tsx` | diagnostik webhook |

---

## Penutup

Gejala "sudah bayar tapi masih Menunggu Bayar" **bukan** satu bug, melainkan tiga lapisan yang saling menutupi:

1. checkout menolak keranjang percetakan (sudah beres),
2. **penerapan status lunas selalu gagal karena `undefined`**,
3. **penerapan status kedaluwarsa selalu gagal karena sebab yang sama**.

Lapisan 2 dan 3 punya **satu akar yang sama** dan **satu perbaikan yang sama**. Selama keduanya belum diperbaiki, tidak ada perubahan di sisi Mayar (token, rotasi, sinkronisasi URL) yang akan membuat pesanan berubah status — karena transport sudah benar sejak 29 Oktober 22:31.