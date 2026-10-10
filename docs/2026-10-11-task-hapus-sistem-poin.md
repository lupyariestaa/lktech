# Task — Hapus Total Sistem Poin / Loyalitas (cukup sisakan Kupon / Voucher)

> Status: **✅ SELESAI DIEKSEKUSI (kode, 2026-10-11).** Fase D0–D6 tuntas; gate penuh hijau.
> Hasil lengkap: lihat **§8 Hasil Eksekusi**.
>
> Keputusan pemilik: **hapus seluruh sistem poin/loyalitas** dari LKTech. Yang
> cukup dipertahankan hanyalah **sistem kupon/voucher** (`docs/2026-10-05-kupon-diskon.md`)
> yang sudah mandiri dan tidak bergantung pada poin.
>
> Tanggal: 2026-10-11. Turunan dari keputusan pemilik (sederhanakan sistem: cukup kupon).

---

## 0. Ringkasan Hasil Audit

Sistem poin di LKTech dibangun sebagai bagian **Tema 2 — Retensi & Engagement**
(FASE R1, `docs/2026-10-05-retensi-tema2.md`). Sistem ini mencakup:

- **Ledger poin** di subkoleksi Firestore `users/{uid}/points/{entryId}` (sumber kebenaran).
- **Saldo & lifetime** yang didenormalisasi ke dokumen `users/{uid}` (field `points`, `pointsLifetime`).
- **Tier** (Bronze/Silver/Gold) dihitung dari `pointsLifetime`.
- **Perolehan poin** otomatis: saat **order lunas** (via webhook Mayar) & saat **ulasan disetujui** (via admin reviews).
- **Tukar poin → kupon** (kode unik `POIN-XXXXXX`) lewat API `POST /api/user/points`.
- **UI tab "Poin"** di portal `/akun` (`AccountPoints`).

**Temuan penting:** sistem poin **bergantung pada** modul kupon (untuk tukar poin),
tetapi **modul kupon TIDAK bergantung** pada sistem poin. Karena itu penghapusan
poin **tidak mengganggu** kupon, checkout, order, pembayaran, ulasan, atau
analitik. Yang perlu dilakukan adalah **memutus titik temu** di webhook, admin
reviews, portal akun, dan profil user.

**Tidak ada dependensi paket & env variabel khusus poin** (`package.json` hanya
punya script `test:loyalty`; `.env.example` tidak memuat env poin). Jadi tidak ada
uninstall paket yang dibutuhkan.

---

## 1. Inventaris Lengkap (yang akan dihapus)

### 1.1 File khusus sistem poin (boleh DILEPAS utuh)

| # | File | Peran |
| --- | --- | --- |
| F1 | `src/lib/loyalty-pure.ts` | Aturan poin & tier (murni, teruji): `tierFor`, `pointsForSpend`, `checkRedeem`, `tierProgress`, `normalizePoints`, `REDEEM_PACKAGES`, `TIER_*`. |
| F2 | `src/lib/loyalty.ts` | Data layer: ledger `users/{uid}/points`, saldo, `awardOrderPoints`, `awardReviewPoints`, `redeemPoints`. |
| F3 | `src/lib/loyalty-api.ts` | Klien: `fetchPoints`, `redeemPointsRequest`, tipe `PointsData`. |
| F4 | `src/components/auth/account-points.tsx` | Tab "Poin" di `/akun` (`AccountPoints`). |
| F5 | `src/app/api/user/points/route.ts` | `GET` saldo/riwayat, `POST` tukar poin. |
| F6 | `scripts/loyalty.test.ts` | Unit test aturan poin/tier (10 test). |

> **Catatan:** `F1` (pure) diimpor oleh `F2` & `F6`. `F2` diimpor (via dynamic
> `import()`) oleh webhook Mayar & admin reviews. `F3` & `F4` diimpor oleh
> `user-account.tsx`. `F5` adalah endpoint yang dipanggil oleh `F3`. Tidak ada
> konsumen lain di luar ini (lihat §2 untuk verifikasi).

### 1.2 Konfigurasi (bagian yang dihapus)

| # | Lokasi | Yang dihapus |
| --- | --- | --- |
| C1 | `package.json` → `scripts` | Baris `"test:loyalty": "node --experimental-strip-types --test scripts/loyalty.test.ts"`. |
| C2 | `firestore.rules` → komentar | Baris komentar `// Subkoleksi: users/{uid}/points (ledger poin loyalitas).` (dan penyebutan "points" di daftar koleksi). |

> **Penting:** `firestore.rules` memakai **catch-all** `match /{document=**} { allow read, write: if false; }`.
> Tidak ada rule spesifik untuk subkoleksi `points`, jadi **tidak ada perubahan
> rule fungsional** yang diperlukan — cukup bersihkan komentar. Menghapus
> subkoleksi `points` dari Firestore **tidak wajib** untuk rilis kode (lihat §6).

### 1.3 Field & tipe pada file bersama (hanya DILEPAS sebagian)

| # | File | Yang dilepas |
| --- | --- | --- |
| S1 | `src/lib/user-types.ts` | Blok komentar `/* ===== Program loyalitas/poin (Tema 2.1) ... ===== */` + field `points?: number` + `pointsLifetime?: number` pada `UserProfile`. |
| S2 | `src/lib/user-profile.ts` | Di `normalizeProfile`: baris `points:` & `pointsLifetime:`. Di `upsertUserProfile` (cabang "existing"): `points: prev.points ?? 0,` & `pointsLifetime: prev.pointsLifetime ?? 0,`. |

---

## 2. Titik Integrasi ke Sistem Lain (WAJIB diubah, bukan dihapus)

Ini bagian terpenting: file-file ini **dipakai bersama** sistem lain, jadi cukup
**lepaskan bagian poin-nya** — jangan hapus file-nya.

| # | File | Referensi poin | Tindakan yang benar |
| --- | --- | --- | --- |
| **I1** | `src/app/api/webhooks/mayar/route.ts` | Blok try/catch (baris ~120–126): `const { awardOrderPoints } = await import("@/lib/loyalty"); await awardOrderPoints(order.uid, orderId, order.total);` | **Hapus blok + komentar "Poin loyalitas".** Ini satu-satunya hook pemberian poin dari order. Fulfillment (`fulfillOrder`) & `obs.paymentReceived` tetap. |
| **I2** | `src/app/api/admin/reviews/route.ts` | Blok (baris ~91–100): komentar + `if (parsed.data.status === "approved" && review.uid) { const { awardReviewPoints } = await import("@/lib/loyalty"); await awardReviewPoints(review.uid, review.id); }` | **Hapus blok if + import dinamis.** Moderasi ulasan (`moderateReview`, `recordAdminAudit`, `revalidatePath`) tetap utuh. |
| **I3** | `src/components/auth/user-account.tsx` | `import { AccountPoints } from "@/components/auth/account-points";` + panel `{tab === "poin" && (<div ...><AccountPoints /></div>)}` (baris ~341–345) | **Hapus import + blok panel.** `VALID_TABS` di file ini **tidak** memuat `"poin"` (sudah tidak ada) — cek ulang saat eksekusi. |
| **I4** | `src/components/auth/account-tabs.tsx` | `ACCOUNT_TABS` memuat `"poin"` (baris 9) + `ACCOUNT_TAB_LABEL.poin: "Poin"` (baris 19) | **Hapus `"poin"` dari array + label.** Tipe `AccountTab` otomatis menyesuaikan. |
| **I5** | `src/components/auth/login-steps-carousel.tsx` | Step ke-3 (baris ~22–25): `title: "Poin & kupon"`, `desc: "Kumpulkan poin tiap pembelian, tukar jadi kupon."` | **Ganti menjadi murni tentang kupon**, mis. `title: "Kupon & promo"`, `desc: "Dapatkan kupon diskon untuk hemat tiap checkout."` (Teks bebas; jangan menyebut poin lagi.) |

---

## 3. Titik Risiko (mudah merusak sistem lain — wajib hati-hati)

| # | Risiko | Dampak bila salah | Mitigasi |
| --- | --- | --- | --- |
| **R1** | `account-points.tsx` dihapus, tapi `account-tabs.tsx` masih memuat `"poin"` di `ACCOUNT_TABS` → ada tab yang menunjuk panel tak ada | Tab "Poin" tampil tapi panel kosong / error tipe | Kerjakan **I3 & I4 bersamaan**; karena `AccountTab` adalah union yang diturunkan dari `ACCOUNT_TABS`, `tsc` akan menangkap `tab === "poin"` yang menggantung di `user-account.tsx`. |
| **R2** | `?tab=poin` lama di URL pengunjung | Panel tidak ada | Di `user-account.tsx`, `initialTab()` sudah memvalidasi terhadap `VALID_TABS` → `?tab=poin` otomatis fallback ke `"ringkasan"`. **Aman**, tapi verifikasi. |
| **R3** | Webhook Mayar (`I1`) diubah keliru → merusak fulfillment pembayaran | Order tidak lunas / fulfillment gagal (KRITIS) | **Hapus HANYA blok try/catch poin.** Jangan sentuh `markOrderPaid`, cek nominal, `obs.paymentReceived`, dan `fulfillOrder`. Uji dengan `tsc` + review manual diff. |
| **R4** | Semua blok `import("@/lib/loyalty")` di webhook & admin reviews harus dihapus **sebelum** file `loyalty.ts` dihapus | Bila file dihapus dulu, dynamic import akan gagal saat runtime (tidak tertangkap `tsc` untuk dynamic import string literal — sebenarnya tertangkap, tapi tetap hati-hati) | Urutkan: putus konsumen (I1, I2, I3, I4) → baru hapus `F1`–`F6`. |
| **R5** | Field `points`/`pointsLifetime` dihapus dari tipe, tapi Firestore masih menyimpannya di dokumen `users/*` | Tidak error (field ekstra diabaikan), **asalkan** `normalizeProfile` tidak `throw` pada field tak dikenal | `normalizeProfile` sudah membangun objek secara eksplisit (whitelist), **tidak** memakai schema strict → field lama otomatis diabaikan. Aman. |
| **R6** | `package.json` `test:loyalty` masih ada setelah `scripts/loyalty.test.ts` dihapus | `npm run test:loyalty` gagal (file hilang); CI hijau (`test:loyalty` **tidak** termasuk daftar CI wajib) | Hapus baris script (C1) **bersamaan** dengan hapus file F6. |
| **R7** | `firestore.rules` komentar menyebut subkoleksi `points` | Kosmetik saja (rules fungsional tak berubah) | Bersihkan komentar (C2); **tidak perlu** publish ulang rules karena tidak ada perubahan fungsional. |
| **R8** | Data subkoleksi `users/{uid}/points/*` tertinggal di Firestore | Tidak error (tidak ada yang membaca), tapi "sampah" | Opsional: hapus via konsol/script. **Tidak wajib** untuk rilis kode. Lihat §6. |
| **R9** | Ada referensi lain ke `/api/user/points` (mis. doc, test, komponen lain) | Endpoint hilang → 404 / build gagal | Telusuri ulang dengan `grep` **setelah** penghapusan (§4 Fase D4). |
| **R10** | `loyalty-pure.ts` ternyata diimpor modul lain (mis. skrip seed/admin) | Build gagal | Sudah diverifikasi §1.1: hanya `loyalty.ts` & `loyalty.test.ts`. Cek ulang saat eksekusi. |

---

## 4. Urutan Eksekusi yang Aman (fase)

> Prinsip: **putuskan konsumen dulu, baru hapus sumbernya.** Setiap fase ditutup
> dengan gate `tsc` + `lint` + `build` (dan test yang relevan).

### Fase D0 — Persiapan & backup
- [ ] Commit/push pekerjaan berjalan (jika ada) agar titik balik jelas.
- [ ] Catat commit sebelum penghapusan (opsional: branch/tag cadangan, mis. `backup/pre-hapus-poin`).
- [ ] (Jaga-jaga) Backup data subkoleksi `users/{uid}/points/*` + field `points`/`pointsLifetime` di dokumen `users/*` (export JSON) — **hanya bila ingin arsip**, karena permintaan = hapus total.
- [x] Disetujui pemilik → **eksekusi dijalankan (2026-10-11)**.

### Fase D1 — Putuskan konsumen di UI bersama
- [ ] **I3** `user-account.tsx`: hapus import `AccountPoints` + blok panel `tab === "poin"`.
- [ ] **I4** `account-tabs.tsx`: hapus `"poin"` dari `ACCOUNT_TABS` + label `poin`.
- [ ] **I5** `login-steps-carousel.tsx`: ganti step "Poin & kupon" → tema kupon saja.
- [ ] Gate: `npx tsc --noEmit` (menangkap `tab === "poin"` yang menggantung, importer hilang).

### Fase D2 — Putuskan konsumen server (kritis)
- [ ] **I1** `api/webhooks/mayar/route.ts`: hapus blok pemberian poin (HANYA blok poin).
- [ ] **I2** `api/admin/reviews/route.ts`: hapus blok pemberian poin ulasan.
- [ ] Gate: `npx tsc --noEmit` + review diff manual (pastikan fulfillment & moderasi tak tersentuh).

### Fase D3 — Hapus file khusus poin
- [ ] Hapus **F3** `src/lib/loyalty-api.ts`.
- [ ] Hapus **F4** `src/components/auth/account-points.tsx`.
- [ ] Hapus **F5** `src/app/api/user/points/route.ts` (hapus folder `points/` bila kosong).
- [ ] Hapus **F2** `src/lib/loyalty.ts`.
- [ ] Hapus **F1** `src/lib/loyalty-pure.ts`.
- [ ] Hapus **F6** `scripts/loyalty.test.ts`.
- [ ] Gate: `tsc` + `lint`.

### Fase D4 — Bersihkan tipe, field, konfigurasi & verifikasi
- [ ] **S1** `user-types.ts`: hapus field `points` & `pointsLifetime` + komentar blok.
- [ ] **S2** `user-profile.ts`: hapus normalisasi & pengembalian field poin.
- [ ] **C1** `package.json`: hapus script `test:loyalty`.
- [ ] **C2** `firestore.rules`: bersihkan komentar subkoleksi `points`.
- [ ] Verifikasi grep: pastikan **tidak ada** sisa referensi:
      - `grep -rn "loyalty\|Loyalty\|LOYALTY" src scripts package.json` → 0
      - `grep -rn "awardOrderPoints\|awardReviewPoints\|getPointsSummary\|listPointsHistory\|redeemPoints\|addPoints\|fetchPoints\|redeemPointsRequest" src` → 0
      - `grep -rn "user/points\|account-points\|AccountPoints\|pointsLifetime" src` → 0
      - `grep -rn "points:" src/lib/user-types.ts src/lib/user-profile.ts` → 0
      - Perhatikan **false positive yang HARUS diabaikan**: `points:` di `services.ts`/`content.ts`/`product-types.ts` (poin keunggulan paket layanan/produk — bukan sistem poin), `points` di `line-chart.tsx`/`analytics-dashboard.tsx` (titik grafik), `tier` di `lead-scoring-pure.ts`/`lead-score-badge.tsx` (tier skor lead — fitur lain).
- [ ] Gate: `tsc` + `lint` + `build`.

### Fase D5 — Dokumentasi
- [ ] Perbarui `docs/2026-10-06-roadmap-pengembangan.md` (tandai P1 "Program loyalitas/poin" = **dihapus atas keputusan pemilik**; arah retensi = kupon saja).
- [ ] Perbarui `docs/2026-10-05-retensi-tema2.md` (bagian R1 loyalitas/poin ditandai dihapus; R2–R5 tetap).
- [ ] Perbarui `docs/2026-10-05-kupon-diskon.md` (catatan "Program loyalitas/poin → sesi terpisah" → tandai dibatalkan/dihapus).
- [ ] Perbarui `docs/README.md` (indeks) + `TASK-SELANJUTNYA.md` (catat sesi penghapusan).
- [ ] Isi bagian **§8 Hasil Eksekusi** di dokumen ini setelah selesai.

### Fase D6 — QA akhir & rilis
- [ ] Uji regresi manual:
  - [ ] `/akun` tanpa tab "Poin"; `?tab=poin` → fallback "Ringkasan" (tanpa error).
  - [ ] Halaman login (`/masuk`) tanpa teks "Poin & kupon" yang keliru.
  - [ ] Checkout produk → bayar (sandbox) → webhook tetap menandai `dibayar` & fulfillment (unduhan/email) tetap jalan **tanpa** error "gagal memberi poin" di log.
  - [ ] `/admin/reviews` setujui ulasan → tetap sukses (tanpa efek poin).
  - [ ] Modul kupon (`/admin/coupons`, validasi di keranjang, penerapan di checkout) **tetap utuh**.
  - [ ] Ringkasan `/admin` & analitik tetap normal.
- [ ] Gate penuh: `tsc`, `lint`, semua `test:*` (tanpa `test:loyalty`), `build`.
- [ ] Commit konvensional (mis. `refactor: hapus total sistem poin/loyalitas (sisakan kupon)`).
- [ ] Push hanya setelah pemilik minta.

### Fase D7 (opsional) — Pembersihan data Firestore
- [ ] Hapus subkoleksi `users/{uid}/points/*` (ledger) untuk semua user.
- [ ] Hapus field `points` & `pointsLifetime` dari dokumen `users/*`.
- [ ] **Tidak wajib** untuk rilis kode; kode tetap aman tanpanya.

---

## 5. Dampak yang Perlu Diketahui Pemilik

1. **Portal akun kehilangan tab "Poin".** Pengguna tidak lagi melihat saldo poin, tier, tukar poin, atau riwayat poin.
2. **Perolehan poin otomatis berhenti:** tidak ada lagi poin dari pembelian (webhook) maupun dari ulasan disetujui.
3. **Tukar poin → kupon dihapus.** Pengguna tidak bisa lagi menukar poin menjadi kupon. **Kupon tetap bisa diberikan/dibuat admin** lewat `/admin/coupons` seperti biasa.
4. **Ulasan produk TETAP ADA** (hanya bonus poinnya hilang).
5. **Modul kupon, checkout, order, pembayaran, unduhan, analitik, laporan TIDAK terganggu** (tidak bergantung pada poin).
6. **Halaman login kehilangan sorotan "poin"** — diganti fokus kupon.
7. **Tier pelanggan (Bronze/Silver/Gold) hilang** dari sisi pengguna (tidak pernah ada di UI admin).
8. **Data lama (field & subkoleksi) tetap aman** sampai dibersihkan opsional; kode tak lagi membacanya.

---

## 6. Definition of Done (penghapusan)

1. Tidak ada satu pun referensi sistem **poin** di `src`, `scripts`, `package.json`
   (selain false positive yang terdokumentasi di §4 Fase D4).
2. `/akun`, halaman login, webhook pembayaran, admin reviews, dan modul kupon
   **berfungsi normal** tanpa sistem poin.
3. `tsc`, `lint`, **semua** `test:*` (kecuali `test:loyalty` yang dihapus), dan
   `build` hijau.
4. `package.json` tidak lagi punya script `test:loyalty`.
5. Dokumentasi (`roadmap`, `retensi-tema2`, `kupon-diskon`, `README`, `TASK-SELANJUTNYA`)
   diperbarui + §8 dokumen ini diisi.
6. (Opsional) Data Firestore subkoleksi `points` & field `points`/`pointsLifetime`
   dibersihkan.

---

## 7. File yang TIDAK Boleh Disentuh Salah (ringkas)

File-file ini **dipakai bersama** sistem lain — cukup **hapus bagian poin-nya**,
jangan hapus file-nya:

- `src/app/api/webhooks/mayar/route.ts` (webhook pembayaran — KRITIS)
- `src/app/api/admin/reviews/route.ts` (moderasi ulasan)
- `src/components/auth/user-account.tsx`, `account-tabs.tsx` (portal akun)
- `src/components/auth/login-steps-carousel.tsx` (panel login)
- `src/lib/user-types.ts`, `user-profile.ts` (profil user umum)
- `firestore.rules`, `package.json` (konfigurasi)

**File yang BOLEH dihapus utuh:** `src/lib/loyalty*.ts`,
`src/components/auth/account-points.tsx`, `src/app/api/user/points/route.ts`,
`scripts/loyalty.test.ts`.

**False positive yang HARUS dipertahankan** (bukan sistem poin):
`points` di `services.ts`/`content.ts`/`product-types.ts` (poin keunggulan paket),
`points` di `line-chart.tsx`/`analytics-dashboard.tsx`/`dashboard-overview.tsx`
(titik grafik), `tier` di `lead-scoring-pure.ts`/`lead-score-badge.tsx` (tier skor lead).

---

## 8. Hasil Eksekusi

> **Fase D0–D6 SELESAI (2026-10-11).** Gate penuh hijau: `tsc` ✅ · `eslint` ✅ ·
> semua `test:*` ✅ (tanpa `test:loyalty`) · `build` ✅.

**Dihapus total (file):**
- `src/lib/loyalty-pure.ts`
- `src/lib/loyalty.ts`
- `src/lib/loyalty-api.ts`
- `src/components/auth/account-points.tsx`
- `src/app/api/user/points/route.ts` (folder `points/` dihapus; folder `user/` tetap untuk addresses/profile/wishlist)
- `scripts/loyalty.test.ts`

**Diubah (file bersama, hanya bagian poin dilepas):**
- `src/app/api/webhooks/mayar/route.ts` — blok `awardOrderPoints` dihapus (fulfillment & `markOrderPaid` utuh).
- `src/app/api/admin/reviews/route.ts` — blok `awardReviewPoints` dihapus (moderasi utuh).
- `src/components/auth/user-account.tsx` — import `AccountPoints` + panel `tab === "poin"` dihapus.
- `src/components/auth/account-tabs.tsx` — `"poin"` dihapus dari `ACCOUNT_TABS` + label.
- `src/components/auth/login-steps-carousel.tsx` — step "Poin & kupon" → "Kupon & promo".
- `src/lib/user-types.ts` — field `points`/`pointsLifetime` + komentar blok dihapus.
- `src/lib/user-profile.ts` — normalisasi & pengembalian field poin dihapus.
- `package.json` — script `test:loyalty` dihapus.
- `firestore.rules` — komentar subkoleksi `points` dibersihkan.
- `.github/workflows/ci.yml` — baris `npm run test:loyalty` & `npm run test:taman` (sudah usang) dihapus.

**Dokumentasi diperbarui:** `docs/2026-10-06-roadmap-pengembangan.md`,
`docs/2026-10-05-retensi-tema2.md`, `docs/2026-10-05-kupon-diskon.md`,
`docs/2026-10-06-upgrade-beranda.md`, `docs/2026-10-06-task-upgrade-beranda.md`,
`docs/README.md`, `TASK-SELANJUTNYA.md`.

**Verifikasi grep:**
- `loyalty` = **0** di `src`/`scripts`/`package.json`.
- Simbol poin (`awardOrderPoints`, `redeemPoints`, `fetchPoints`, …) = **0**
  (kecuali false positive `SCORE_TIER_LABEL` di lead scoring — bukan sistem poin).
- `user/points`, `account-points`, `AccountPoints`, `pointsLifetime` = **0**.

**Data Firestore (opsional, belum dikerjakan):** subkoleksi `users/{uid}/points/*`
& field `points`/`pointsLifetime` di dokumen `users/*` masih tertinggal; kode tak
lagi membacanya (aman). Bisa dibersihkan kapan saja bila diinginkan.

