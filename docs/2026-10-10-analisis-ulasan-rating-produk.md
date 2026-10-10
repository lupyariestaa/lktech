# Analisis — Sistem Ulasan & Rating Produk (temuan & gap)

> Status: **✅ DIPERBAIKI (G1–G5, G8, G10).** Dokumen ini mencatat kondisi sistem
> ulasan/rating produk, akar masalah "Gagal memoderasi ulasan.", dan status
> perbaikan tiap gap. Sisa gap (G6, G7, G9) dicatat sebagai backlog.
>
> Pemicu: pemilik mencoba approve ulasan dari akun lain di dashboard `/admin/reviews`
> dan **selalu gagal** dengan pesan "Gagal memoderasi ulasan."
>
> Tanggal: 2026-10-10.

---

## 0. Ringkasan eksekutif

- **Sistem ulasan secara umum aktif dan benar strukturnya** (submit → pending →
  moderasi → agregat → tampil publik + JSON-LD). Alur verifikasi pembeli & rate
  limit ada.
- **BUG KRITIS ditemukan (akar masalah):** `moderateReview()` menulis field
  `rejectionReason: undefined` ke Firestore saat **approve**. Firebase Admin SDK
  **melempar error** untuk nilai `undefined` → route menangkapnya → respons 500
  "Gagal memoderasi ulasan." **Akibatnya moderasi (approve/reject) selalu gagal.**
- Ada **beberapa gap** lain (verifikasi status order, gate `reviewsEnabled` di
  server, idempotensi race, poin untuk uid kosong) yang dicatat di §4.

---

## 1. Peta sistem (alur menyeluruh)

```
FOrm klien (produk/[slug] → ReviewForm)
  └─ POST /api/products/[slug]/reviews
        ├─ requireUser (login wajib)
        ├─ rate limit (5 / 10 menit per uid)
        ├─ produk aktif? (getProductsBySlugs)
        ├─ verified buyer? (findCompletedOrderForProduct: order status "selesai" memuat slug)
        └─ createReview() → reviews/{id} { status: "pending" }   ← OK (terbukti jalan)

Dashboard admin (admin/reviews → ReviewsManager)
  └─ PATCH /api/admin/reviews { id, status }
        ├─ requireAdmin
        ├─ reviewModerateSchema
        ├─ moderateReview()  ← ❌ BUG: set({ rejectionReason: undefined }) → throw
        ├─ revalidatePath produk & list
        ├─ recordAdminAudit (best-effort)
        └─ awardReviewPoints (best-effort, hanya saat approve)

Agregat: products/{slug}.ratingSummary ← recomputeProductRating() (dari reviews approved)

Tampilan publik: product-reviews.tsx + JSON-LD AggregateRating (bila count>0)
```

---

## 2. AKAR MASALAH — "Gagal memoderasi ulasan."

### 2.1 Bukti jejak
- Pesan di dashboard persis `"Gagal memoderasi ulasan."` — hanya ada **satu**
  sumber: `src/app/api/admin/reviews/route.ts` baris 103 (blok `catch` PATCH).
- `recordAdminAudit` (§ admin-audit.ts) **menelan error** sendiri (best-effort) →
  bukan sumber.
- `awardReviewPoints` (§ route baris 92-99) **dibungkus try/catch** → bukan sumber.
- `recomputeProductRating` (§ reviews.ts 238-251) **menelan error** tulisnya →
  bukan sumber.
- Yang tersisa di dalam try **sebelum** dua blok aman itu adalah `moderateReview()`.

### 2.2 Kode bermasalah (`src/lib/reviews.ts` baris ~193-202)
```ts
await ref.set(
  {
    status,
    moderatedBy,
    moderatedAtISO: new Date().toISOString(),
    updatedAtISO: new Date().toISOString(),
    rejectionReason: status === "rejected" ? (rejectionReason ?? "") || undefined : undefined,
  },
  { merge: true },
);
```

### 2.3 Sebab
Firebase **Admin SDK menolak nilai `undefined`** sebagai nilai field Firestore
(berbeda dari Web SDK yang bisa di-toggle `ignoreUndefinedProperties`).
- Saat **approve** (`status === "approved"`): `rejectionReason` = `undefined`
  → `set()` **throw** `Cannot use "undefined" as a Firestore value`.
- Saat **reject** tanpa alasan (`reason` kosong): juga `undefined` → throw.

**Karena moderasi hampir selalu approve, ini membuat tombol approve SELALU gagal.**

### 2.4 Bukti pola yang benar di codebase
Module lain **sudah berhati-hati** menghapus field `undefined` sebelum menulis:
- `src/lib/products.ts` baris 395, 400, 406-418:
  `if (payload[key] === undefined) delete payload[key];`
- `src/lib/orders.ts`, `src/lib/articles.ts`, dsb. memakai pola serupa.

`reviews.ts` **tidak** mengikuti pola ini → satu-satunya tempat yang bocor.

### 2.5 Perbaikan yang diusulkan
Bangun objek patch tanpa field `undefined`, lalu `set(patch, { merge: true })`:
```ts
const patch: Record<string, unknown> = {
  status,
  moderatedBy,
  moderatedAtISO: nowISO,
  updatedAtISO: nowISO,
};
if (status === "rejected" && rejectionReason && rejectionReason.trim()) {
  patch.rejectionReason = rejectionReason.trim();
}
await ref.set(patch, { merge: true });
```
(Alternatif: `rejectionReason: FieldValue.delete()` saat approve, untuk membersihkan
alasan lama bila ulasan yang tadinya ditolak lalu disetujui.)

**Dampak perbaikan:** tombol approve/reject langsung berfungsi; agregat rating
produk ter-update; ulasan muncul di halaman produk + JSON-LD.

---

## 3. Kondisi sistem saat ini (yang sudah benar)

| Aspek | Status | Catatan |
| --- | --- | --- |
| Submit ulasan (create) | ✅ Jalan | Terbukti: ulasan pemilik masuk (pending). |
| Verifikasi pembeli | ✅ Ada | Hanya order `selesai` yang memuat produk. |
| Rate limit submit | ✅ Ada | 5 / 10 menit per uid. |
| Status awal | ✅ `pending` | Moderasi wajib. |
| Idempotensi create | ⚠️ Parsial | Cek `orderId`+`productSlug` (lihat G4). |
| Agregat `ratingSummary` | ✅ Logika benar | `computeRatingSummary` akurat & ada test. |
| JSON-LD AggregateRating | ✅ Ada | Hanya bila `count > 0` & `reviewsEnabled !== false`. |
| Masking nama publik | ✅ Ada | "Budi Santoso" → "Budi S.". |
| Firestore rules | ✅ Aman | Semua akses klien ditolak (Admin SDK bypass). |
| Audit log | ✅ Ada | `review.moderate` / `review.delete` (best-effort). |
| Poin bonus approve | ✅ Ada | +50 poin, idempoten per review (best-effort). |

---

## 4. GAP / temuan lain (untuk diperbaiki nanti)

### G1 (KRITIS) — Moderasi gagal karena `undefined` — **§2**.
Perbaiki `moderateReview` di `reviews.ts`. **Ini yang memblokir pemilik.**

### G2 (TINGGI) — Ambang verifikasi "pembeli" bergantung status order `selesai`
`findCompletedOrderForProduct` mensyaratkan `status === "selesai"`. Bila order
sudah `dibayar`/`menunggu_konfirmasi` (JASA) dan belum ditandai `selesai`, pembeli
**tak bisa** mengulas walau sudah bayar. Perlu keputusan: apakah pembeli produk
INSTAN boleh mengulas begitu `dibayar`? (produk digital tak butuh "selesai".)
- File: `src/lib/orders.ts` (`findCompletedOrderForProduct`).

### G3 (SEDANG) — Gate `reviewsEnabled` tidak dijaga di server
- UI menyembunyikan ulasan bila `product.reviewsEnabled === false`, tapi
  `POST /api/products/[slug]/reviews` **tetap menerima** ulasan untuk produk itu.
- Perbaikan: tolak di route bila `product.reviewsEnabled === false`.

### G4 (SEDANG) — Idempotensi create ada race (TOCTOU)
`createReview` cek `existing` lalu `add()` **non-atomik**. Dua klik cepat bisa
meloloskan 2 ulasan untuk (order, produk) yang sama.
- Perbaikan: pakai **ID dokumen deterministik** `reviews/{orderId}_{productSlug}`
  atau transaksi Firestore.

### G5 (SEDANG) — Poin untuk `uid` kosong bisa error
`awardReviewPoints(review.uid, …)` dengan `uid` kosong (data legacy/seed) akan
menulis ke `users/` (id kosong) → throw. Sudah di-guard try/catch di route,
tetapi tetap menulis log error. Perbaikan: skip bila `uid` kosong.

### G6 (RENDAH) — `listAllReviews` & `listAdminAudit` fetch lebar lalu saring di memori
`limit(500)` / `limit(1000)` lalu filter/sort di memori. Untuk skala kecil OK,
tapi bisa menyesatkan (ulasan ke-501 tak muncul). Perbaikan: paginasi/kueri
ber-index saat data bertambah.

### G7 (RENDAH) — Indeks Firestore
Query `reviews` yang dipakai:
- `where productSlug ==` + `where status == approved` (+limit) → biasanya butuh
  index komposit.
- `where orderId ==` + `where productSlug ==` → mungkin butuh index komposit.
`firestore.indexes.json` **belum** memuat index `reviews`. Bila Firestore menolak
query karena index hilang, submit/list bisa gagal (error akan muncul di log).
Perbaikan: tambahkan index komposit `reviews` bila log menunjukkan kebutuhan.

### G8 (RENDAH) — `revalidatePath` produk pakai slug, tapi tak ada revalidate `/produk/[slug]` dihapus
Route DELETE hanya `revalidatePath("/produk")` tanpa `revalidatePath('/produk/[slug]')`.
Akibat: halaman produk bisa sedikit basi setelah hapus. (Moderate sudah benar
memanggil `/produk/${slug}`.)

### G9 (RENDAH) — Toast error moderasi generik
UI hanya menampilkan pesan server. Setelah §2 diperbaiki ini tak masalah, tetapi
disarankan menampilkan `status` (mis. "Gagal menyetujui ulasan") agar lebih jelas.

### G10 (CATATAN) — Tidak ada test jalur tulis
`test:reviews` hanya menguji logika murni (`computeRatingSummary` dll). Tak ada
test untuk jalur tulis `moderateReview`/`createReview` → bug §2 lolos. Disarankan
setidaknya menambah test "bangun patch tanpa undefined" (fungsi murni helper).

---

## 5. Rekomendasi urutan perbaikan

1. **G1 (kritis):** perbaiki `moderateReview` → tombol approve/reject jalan. *(wajib segera)*
2. **G2:** putuskan ambang verifikasi (instan boleh `dibayar`?).
3. **G3:** tolak ulasan produk `reviewsEnabled === false` di server.
4. **G4:** idempotensi deterministik (doc id / transaksi).
5. **G5, G6, G7, G8, G9, G10:** perbaikan & penguatan.

---

## 7. STATUS PERBAIKAN (2026-10-10)

Gate: `tsc` ✅ · `eslint` ✅ · `test:reviews` **12** ✅ · semua `test:*` (**294** test) ✅ · `build` ✅.

| # | Gap | Status | Perubahan |
| --- | --- | --- | --- |
| **G1** | Moderasi gagal (`undefined`) | ✅ **Diperbaiki** | Helper murni `buildModerationPatch` (`review-types.ts`) + sentinel `MODERATION_DELETE`; `reviews.ts` menerjemahkan ke `FieldValue.delete()`. Tidak ada lagi `undefined` saat `set()`. |
| **G2** | Verifikasi hanya `selesai` | ✅ **Diperbaiki** | `REVIEW_ELIGIBLE_STATUSES = [dibayar, diproses, selesai]`; `findCompletedOrderForProduct` menerima order yang sudah dibayar. Pesan error diperbarui. |
| **G3** | Gate `reviewsEnabled` tak di server | ✅ **Diperbaiki** | POST `/api/products/[slug]/reviews` menolak (403) bila `product.reviewsEnabled === false`. |
| **G4** | Idempotensi race (TOCTOU) | ✅ **Diperbaiki** | `createReview` pakai **doc id deterministik** `{orderId}_{productSlug}` + `.create()` (atomik); kegagalan non-duplikat dibedakan (`unavailable`). |
| **G5** | Poin untuk uid kosong | ✅ **Diperbaiki** | Route hanya memberi poin bila `review.uid` ada. |
| **G6** | Fetch lebar lalu filter memori | ⏸️ **Backlog** | Aman untuk skala sekarang; catat untuk paginasi/kueri ber-index. |
| **G7** | Index komposit `reviews` | ⏸️ **Backlog** | Query `orderId`+`productSlug` **dihapus** oleh G4 (kini pakai doc id) → butuh index berkurang; query `productSlug`+`status` masih bisa perlu index saat data besar. |
| **G8** | DELETE tak revalidate `/produk/[slug]` | ✅ **Diperbaiki** | `deleteReview` mengembalikan slug; route revalidate `/produk/[slug]`. |
| **G9** | Toast moderasi generik | ⏸️ **Backlog** | Kosmetik. |
| **G10** | Tak ada test jalur tulis | ✅ **Diperbaiki** | +3 test `buildModerationPatch` (anti-`undefined`, approve/reject). |

**Dampak G4:** query komposit `orderId`+`productSlug` tidak lagi dipakai → kebutuhan
index berkurang. Query yang MASIH dipakai: `productSlug ==` + `status == approved`
(list & recompute) — pantau log; tambahkan index bila perlu (Firestore tetap
melayani kueri tunggal tanpa index).

**Catatan penting (G2):** kebijakan "layak diulas" kini = order **sudah dibayar**
(`dibayar`/`diproses`/`selesai`). Bila pemilik ingin lebih ketat (khusus `selesai`),
ubah konstanta `REVIEW_ELIGIBLE_STATUSES` di `src/lib/orders.ts`.

**Belum diverifikasi manual:** approve/reject nyata di dashboard produksi + munculnya
rating di halaman produk. Ini perlu pemilik uji di browser.


---

## 6. Berkas terkait (rujukan)

- API: `src/app/api/products/[slug]/reviews/route.ts`, `src/app/api/admin/reviews/route.ts`
- Data layer: `src/lib/reviews.ts`, `src/lib/review-types.ts`, `src/lib/orders.ts`
  (`findCompletedOrderForProduct`)
- API klien: `src/lib/review-api.ts`, `src/lib/admin-reviews-api.ts`, `src/lib/admin-fetch.ts`
- UI: `src/components/review-form.tsx`, `src/components/product-reviews.tsx`,
  `src/components/admin/reviews-manager.tsx`
- Skema: `src/lib/api-schemas.ts` (`reviewSubmitSchema`, `reviewModerateSchema`)
- Agregat/SEO: `src/app/produk/[slug]/page.tsx` (JSON-LD AggregateRating)
- Poin: `src/lib/loyalty.ts` (`awardReviewPoints` → `addPoints`)
- Audit: `src/lib/admin-audit.ts`
- Rules/index: `firestore.rules`, `firestore.indexes.json`
- Test: `scripts/review-rating.test.ts`
