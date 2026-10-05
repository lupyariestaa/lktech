# FASE DETAIL — Ulasan & Rating Produk

> **Status:** ✅ **Selesai (kode) — R0–R6** (R7 opsional ditunda).
> **Disusun:** sesi pasca-FASE Konversi & Closing (P0–P6, `docs/2026-10-06-fase-konversi-closing.md`).
> **Tema roadmap:** **Tema 3 — Kepercayaan & Skala → 3.1 [P0] Ulasan & Rating** (`docs/2026-10-06-roadmap-pengembangan.md`).
> **Prasyarat baca:** `docs/2026-10-06-roadmap-pengembangan.md`, `docs/2026-10-05-portal-akun-pengguna.md`, `docs/2026-10-02-orders-admin-module.md`, `TASK-SELANJUTNYA.md`.
> **Prinsip:** ikuti pola sehat proyek — **server-authoritative**, observability, a11y, mobile-first, **backward-compatible**, dokumentasi fase.

---

## 1. Ringkasan & Tujuan

Menambahkan **ulasan + rating bintang** pada produk, dari **pembeli terverifikasi**
(hanya order berstatus `selesai`), dengan **moderasi admin** sebelum tampil, dan
**structured data SEO** (`AggregateRating` → bintang di Google).

**Hasil yang diharapkan:**
1. Pembeli bisa memberi rating (1–5) + ulasan (opsional foto → **ditunda**, lihat §7) untuk produk yang benar-benar dibeli.
2. Ulasan tayang di halaman produk setelah **disetujui admin** (anti-spam/abuse).
3. Agregat rating tampil di kartu produk & halaman detail, plus **JSON-LD** (SEO).
4. Admin bisa memoderasi (approve/reject/hapus) dari `/admin/reviews`.

---

## 2. Keputusan Desain Kunci

### 2.1 Model data (`reviews/{id}`)
```ts
type Review = {
  id: string;
  productSlug: string;
  productName: string;   // snapshot (untuk admin)
  uid: string;
  buyerName: string;     // snapshot tampilan (boleh disamarkan)
  rating: number;        // 1..5
  title?: string;
  body?: string;
  status: "pending" | "approved" | "rejected";
  /** ID order sumber (verified purchase) — untuk idempotensi 1 ulasan/order. */
  orderId: string;
  createdAtISO: string;
  updatedAtISO?: string;
  moderatedBy?: string;
  moderatedAtISO?: string;
  /** Balasan admin (opsional, ditunda) */
  reply?: string;
};
```

**Aturan:**
- **Satu ulasan per (orderId, productSlug)** → idempoten; mencegah spam.
- Hanya pemilik order (`uid`) & order berstatus `selesai` yang boleh mengulas.
- Default status `pending` (moderasi wajib); configurable auto-approve ditunda.

### 2.2 Agregat rating
- Disimpan **denormalisasi** pada dokumen produk (`products/{slug}`):
  `ratingSummary: { avg: number; count: number; distribution: Record<1..5, number> }`.
- Diperbarui saat review **approve/reject/hapus** (hitung ulang dari `reviews` yang `approved` untuk produk tsb). Backward-compatible (produk lama tanpa field tetap valid).

### 2.3 Alur
```
Pembeli (order selesai) → /produk/[slug] → form ulasan (login)
   → POST /api/products/[slug]/reviews  (verifikasi: uid punya order selesai utk produk ini)
   → simpan status "pending" → tampil pesan "menunggu moderasi"
Admin → /admin/reviews → approve/reject
   → (approve) recompute ratingSummary produk → ulasan tampil di halaman produk
   → JSON-LD AggregateRating di halaman produk ikut terisi
```

### 2.4 Anti-abuse (tanpa infra tambahan)
- Hanya verified purchase.
- 1 ulasan per (order, produk).
- **Rate-limit** in-memory (pola `rate-limit.ts`) per uid pada POST.
- Sanitasi teks + batas panjang.

---

## 3. Arsitektur Teknis

### 3.1 File/modul baru (rencana)
| File | Peran |
| --- | --- |
| `src/lib/review-types.ts` | Tipe aman-klien + konstanta (status, batas) + helper murni (agregat). |
| `src/lib/reviews.ts` | Data layer (server-only): list/create/moderate/recompute summary. |
| `src/lib/review-api.ts` | Klien: kirim ulasan, ambil ulasan produk. |
| `src/lib/admin-reviews-api.ts` | Klien admin: list/filter/moderasi. |
| `src/app/api/products/[slug]/reviews/route.ts` | `GET` (publik, approved) & `POST` (verified purchase). |
| `src/app/api/admin/reviews/route.ts` | `GET` list/summary, `PATCH` moderasi. |
| `src/app/admin/(dashboard)/reviews/page.tsx` | Halaman moderasi. |
| `src/components/admin/reviews-manager.tsx` | UI moderasi. |
| `src/components/product-reviews.tsx` | Daftar + agregat + form (halaman produk). |
| `src/components/review-form.tsx` | Form tulis ulasan (login). |
| `src/components/rating-stars.tsx` | Bintang (display + input), a11y. |

### 3.2 Perubahan file
- `src/lib/product-types.ts` — `Product.ratingSummary?`.
- `src/lib/products.ts` — normalisasi `ratingSummary` + helper `saveProductRatingSummary`.
- `src/app/produk/[slug]/page.tsx` — section ulasan + JSON-LD `AggregateRating`.
- `src/components/product-card.tsx` — bintang ringkas bila ada.
- `src/lib/admin-nav.ts` — menu **"Ulasan"** (grup Toko).
- `firestore.rules` — catat koleksi `reviews` (catch-all sudah menolak klien).

### 3.3 Keamanan
- Verifikasi kepemilikan order dilakukan **server** (bukan dari body).
- `uid`/`buyerName` dari token + order (bukan input bebas).
- Moderasi hanya admin (`requireAdmin`).

---

## 4. SEO (JSON-LD)
Pada halaman produk, bila `ratingSummary.count > 0`, tambahkan:
```json
{
  "@type": "Product",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 4.8,
    "reviewCount": 12,
    "bestRating": 5,
    "worstRating": 1
  }
}
```
(Opsional) sisipkan beberapa `review` teratas (terpotong) — **ditunda** bila mengganggu payload.

---

## 5. A11y & UX
- `RatingStars` **display**: `role="img"` + `aria-label="4 dari 5 bintang"`; input: radio group tersembunyi + tombol bintang (keyboard-operable, `aria-checked`).
- Form: label jelas, validasi inline, pesan sukses "menunggu moderasi".
- Mobile-first: daftar ulasan + form responsif.

---

## 6. Fase Eksekusi

### FASE R0 — Dokumentasi & data model — ✅ (dokumen ini)
- Rancangan + keputusan desain.

### FASE R1 — Tipe & data layer
- `review-types.ts` (tipe + helper agregat murni + teruji).
- `reviews.ts` (I/O): `listReviews`, `listProductReviews`, `createReview`, `moderateReview`, `getProductRatingSummary`.
- `Product.ratingSummary` + normalisasi + simpan.

### FASE R2 — API publik
- `GET /api/products/[slug]/reviews` (approved, paginasi ringan).
- `POST /api/products/[slug]/reviews` (verified purchase, rate-limit, idempoten).

### FASE R3 — Halaman produk + kartu
- Section ulasan (`product-reviews`) + form (`review-form`) + `rating-stars`.
- Bintang ringkas di kartu produk.

### FASE R4 — Admin moderasi
- `GET/PATCH /api/admin/reviews`, halaman `/admin/reviews` + manager, menu nav.

### FASE R5 — SEO
- JSON-LD `AggregateRating`.

### FASE R6 — QA & dokumentasi
- `tsc`/`lint`/`build` bersih; unit test agregat rating.
- Update `TASK-SELANJUTNYA.md`, `docs/README.md`, roadmap.

> **Status R6:** ✅ `tsc`/`eslint`/`build` bersih (70 halaman); `npm run test:reviews` (9) lolos. Dokumentasi diperbarui.

### FASE R7 — (Opsional, ditunda)
- Foto ulasan, balasan admin, auto-approve, seed ulasan contoh, `Review` item JSON-LD.

---

## 9. Catatan Implementasi (R1–R5)
- **Data model:** `reviews/{id}` (`review-types.ts` tipe murni + `reviews.ts` data layer server-only). Idempoten per (orderId, productSlug); selalu `pending` (moderasi wajib).
- **Agregat:** `products/{slug}.ratingSummary` direcompute dari ulasan `approved` (`recomputeProductRating`) — sumber kebenaran = `reviews`.
- **API publik:** `GET /api/products/[slug]/reviews` (approved, nama disamarkan), `POST` (verified purchase via `findCompletedOrderForProduct` + rate-limit + idempoten).
- **Halaman produk:** section ulasan (`product-reviews` + `review-form` + `rating-stars` a11y); bintang ringkas di kartu produk.
- **Admin:** `/admin/reviews` (`reviews-manager`) + `GET/PATCH/DELETE /api/admin/reviews` + menu "Ulasan" (grup Toko).
- **SEO:** JSON-LD `AggregateRating` di halaman produk (hanya bila ada ulasan disetujui — tanpa angka palsu).

---

## 7. Risiko & Mitigasi
| Risiko | Mitigasi |
| --- | --- |
| Spam/abuse | Verified purchase + 1 ulasan/order + moderasi wajib + rate-limit |
| Reset agregat tak akurat | Recompute dari sumber (`reviews approved`) tiap moderasi (sumber kebenaran) |
| Data lama | `ratingSummary` opsional; produk lama tetap valid |
| SEO rating palsu | Hanya dari ulasan `approved` nyata (tidak ada angka karangan) |
| Foto (abuse) | Ditunda (R7) — perlu moderasi media lebih ketat |

---

## 8. Definition of Done
1. `tsc`/`lint`/`build` bersih; unit test agregat rating.
2. Hanya pembeli **terverifikasi** (order `selesai`) yang bisa mengulas; validasi server.
3. Ulasan tampil hanya setelah **approved**; admin bisa moderasi.
4. `AggregateRating` JSON-LD valid; **tanpa** angka palsu.
5. A11y (bintang radio keyboard) & mobile-first.
6. Backward-compatible; dokumentasi diperbarui.
