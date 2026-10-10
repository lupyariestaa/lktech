# Task — Hapus Total Sistem Testimoni (Taman v1/v2 + Testimoni Lama)

> Status: **✅ SELESAI DIEKSEKUSI (kode).** Fase D0–D7 tuntas; gate penuh hijau.
> Cabang cadangan: `backup/pre-hapus-testimoni`.
>
> Keputusan pemilik: **hapus KETIGANYA** — (A) Taman Testimoni (pixel/Phaser, v1 & v2),
> (B) sistem "Testimoni" lama yang generik (avatar Hero + tab admin konten), dan
> (C) `ProjectTestimonial` (kutipan di halaman proyek portofolio).
> Hasil akhir: **LKTech tidak punya testimoni apa pun.**
>
> Tanggal: 2026-10-10. Turunan dari keputusan pemilik setelah meninjau Taman v2.

---

## 0. Ringkasan

Saat ini ada **dua sistem testimoni yang independen**:

| # | Sistem | Inti | Dipakai di |
| --- | --- | --- | --- |
| **A** | **Taman Testimoni** (pixel → Phaser) | Koleksi Firestore `taman_testimonials` + `taman_private`, API publik/admin, form `/taman/tulis`, kanvas Phaser di beranda, dashboard admin | Beranda (seksi full-bleed), `/taman/*`, `/admin/taman`, `/akun` tab "Testimoni saya", beranda JSON-LD |
| **B** | **Testimoni lama** (generik site-content) | Field `testimonials: ManagedTestimonial[]` di dokumen konten situs (Firestore `content/*`), placeholder bawaan | Avatar di `Hero`, tab "Testimoni" di admin `content-extra-manager` |

Keduanya **tidak saling bergantung**, tetapi **keduanya berkaitan dengan sistem lain**
yang lebih sensitif. Dokumen ini memetakan persis apa yang harus disentuh agar
penghapusan tidak merusak: **beranda, portal akun, dashboard admin, SEO/JSON-LD,
audit log, analytics, build (tsconfig/package.json), aset publik, dan dokumentasi.**

---

## 1. Inventaris lengkap (yang akan dihapus)

### 1.1 Sistem A — Taman Testimoni (file khas "taman")

**Halaman (routes):**
- `src/app/taman/tulis/page.tsx`
- `src/app/taman/aset/page.tsx`
- `src/app/admin/(dashboard)/taman/page.tsx`
- `src/app/admin/(dashboard)/taman/pratinjau/page.tsx`

**API (routes):**
- `src/app/api/taman/route.ts` (GET publik)
- `src/app/api/taman/submit/route.ts` (POST kirim)
- `src/app/api/taman/mine/route.ts` (GET milik sendiri)
- `src/app/api/taman/mine/[id]/route.ts` (DELETE milik sendiri)
- `src/app/api/admin/taman/route.ts` (GET admin)
- `src/app/api/admin/taman/[id]/route.ts` (PATCH/DELETE)
- `src/app/api/admin/taman/bulk/route.ts`
- `src/app/api/admin/taman/import-review/route.ts`
- `src/app/api/admin/taman/import-legacy/route.ts`
- `src/app/api/admin/taman/rapikan/route.ts`
- `src/app/api/admin/taman/samples/route.ts`

**Komponen Taman (folder `src/components/taman/`):**
- `taman-section.tsx`, `taman-client.tsx`, `taman-card.tsx`, `taman-schema.tsx`,
  `taman-animal-picker.tsx`, `taman-font.ts`, `taman-phaser.tsx`, `taman-scene.ts`,
  `taman-tulis-form.tsx`, `aset-preview.tsx`

**Komponen admin/auth terkait:**
- `src/components/admin/taman-manager.tsx`
- `src/components/admin/taman-detail-panel.tsx`
- `src/components/admin/taman-preview.tsx`
- `src/components/auth/account-taman.tsx`

**Lib inti:**
- `src/lib/taman-types.ts`
- `src/lib/taman-logic.ts`
- `src/lib/taman-store.ts`
- `src/lib/taman-world.ts`
- `src/lib/taman-consent.ts`

**Aset publik:**
- `public/taman/` (seluruhnya: `animals/*.svg`, `v2/`, `bg-langit.svg`, `bg-tanah.svg`, `pagar.svg`, `pohon.svg`)

**Script/generator:**
- `scripts/taman.test.ts`
- `scripts/gen-taman-sprites.mjs`
- `scripts/gen-taman-v2.mjs`
- `scripts/gen-taman-animals.mjs`
- `scripts/taman-animal-art.mjs`

**Dokumen:**
- `docs/2026-10-10-planning-testimoni-taman-pixel.md`
- `docs/2026-10-10-task-testimoni-taman-pixel.md`
- `docs/2026-10-10-taman-pixel.md`
- `docs/2026-10-10-prosedur-hapus-testimoni.md`
- `docs/2026-10-10-planning-taman-v2.md`
- `docs/2026-10-10-task-taman-v2.md`

**Dependensi:**
- `phaser` di `package.json` (hanya dipakai kanvas Taman → bisa dicopot).

### 1.2 Sistem B — Testimoni lama (site content)

Bukan file terpisah, tapi **bagian** dari beberapa file bersama:

- `src/lib/content-types.ts`
  - `type ManagedTestimonial`
  - `testimonials: ManagedTestimonial[]` (di tipe konten)
  - `defaults.testimonials` (`structuredClone(DEFAULT_TESTIMONIALS)`)
  - `isDefaultTestimonials()`
  - import `TESTIMONIALS as DEFAULT_TESTIMONIALS` dari `@/lib/content`
- `src/lib/content.ts`
  - konstanta `TESTIMONIALS` (data contoh bawaan)
- `src/lib/site-content.ts`
  - `normalizeTestimonial()`, pemetaan `testimonials:` di `normalizeContent`,
    dan `testimonials:` di fungsi serialisasi.
- `src/components/sections/hero.tsx`
  - `isDefaultTestimonials` + `honestTestimonials` + `avatars` (avatar bukti sosial).
- `src/components/admin/content-extra-manager.tsx`
  - tab `"testimonials"`, kartu peringatan placeholder, `saveList("testimonials", ...)`,
    `isDefaultTestimonials`.

> Catatan: `ManagedTestimonial` **tidak** dipakai di beranda melalui komponen
> `testimonials.tsx` (komponen itu sudah dihapus pada H2). Sisa pemakaian hanya
> **Hero (avatar)** dan **admin konten (tab Testimoni)**.

---

## 2. Titik integrasi ke sistem lain (yang harus diubah, bukan sekadar dihapus)

Ini bagian paling penting: **jangan hapus mentah-mentah**, karena beberapa file
diimpor/dipakai sistem lain.

| # | File | Referensi testimoni | Tindakan yang benar |
| --- | --- | --- | --- |
| I1 | `src/app/page.tsx` | `import { TamanSection }`, `import { TamanSchema }`, render `<TamanSection/>` & `<TamanSchema/>` | **Hapus import + 2 baris render.** Cek urutan section tetap rapi. |
| I2 | `src/lib/admin-nav.ts` | menuitem `label/title/href: "/admin/taman"` di grup `id: "konten"` + ikon `Sparkles` (hanya dipakai di sini) | **Hapus 1 entri menu + import `Sparkles`.** Pastikan `href` unik & grup tetap valid. |
| I3 | `src/lib/analytics.ts` | fungsi `trackTamanOpen/Refresh/Submit` + komentar blok Taman | **Hapus 3 fungsi + komentar.** `trackEvent(name: string,…)` bebas string → aman. Cek tak ada importer lain. |
| I4 | `src/lib/admin-audit-types.ts` | aksi `taman.save/publish/hide/reject/delete/reorder/import_review/bulk` (union) + label `AUDIT_ACTION_LABEL` | **Hapus dari union & label.** Audit lama di Firestore yang memakai aksi ini tetap tampil sebagai aksi tak berlabel → lihat risiko R3. |
| I5 | `src/lib/admin-api.ts` | blok `TamanAdminItem`, `fetchTaman`, `patchTaman`, `deleteTaman`, `bulkTaman`, `importTamanFromReview`, `seedTamanSamples`, `deleteTamanSamples`, `importLegacyTaman`, `rapikanTaman` | **Hapus blok.** `importTamanFromReview` dipakai `reviews-manager` → lihat I6. |
| I6 | `src/components/admin/reviews-manager.tsx` | `import { importTamanFromReview }`, `onImportTaman`, tombol "Angkat jadi testimoni" | **Hapus import, handler, dan tombol.** Modul ulasan produk tetap utuh. |
| I7 | `src/components/auth/user-account.tsx` | `import { AccountTaman }`, `VALID_TABS` memuat `"testimoni"`, panel `tab === "testimoni"` | **Hapus import, `"testimoni"`, dan blok panel.** Perhatikan `?tab=testimoni` lama → fallback ke `"ringkasan"`. |
| I8 | `src/components/auth/account-tabs.tsx` | `ACCOUNT_TABS` memuat `"testimoni"`, `ACCOUNT_TAB_LABEL.testimoni` | **Hapus `"testimoni"` dari array + label.** Tipe `AccountTab` ikut menyesuaikan. |
| I9 | `next.config.ts` | `redirects()` → `/taman/kirim` ⇒ `/taman/tulis` | **Hapus entri redirect** (atau arahkan ke `/`). Jika tidak, redirect menunjuk halaman yang tidak ada → 404 berantai. |
| I10 | `tsconfig.json` | `"scripts/taman.test.ts"` (di `include`/exclude?) | **Hapus referensi** bila ada agar tak menunjuk file hilang. |
| I11 | `package.json` | script `gen:taman`, `gen:taman-v2`, `gen:taman-animals`, `test:taman`; dependensi `phaser` | **Hapus 4 script + dependensi `phaser`**; hapus `scripts/taman.test.ts` dari `test:blog`. |
| I12 | `scripts/taman.test.ts` dipakai di `test:blog` | argumen daftar file | **Hapus argumen** `scripts/taman.test.ts` dari `test:blog`. |
| I13 | `src/components/sections/hero.tsx` (B) | `isDefaultTestimonials`, `honestTestimonials`, `avatars` | **Hapus logika testimoni**; pastikan bukti sosial tetap dari sumber **nyata** (`getSocialProof`) atau fallback jujur. |
| I14 | `src/components/admin/content-extra-manager.tsx` (B) | tab `"testimonials"`, warning, `saveList` | **Hapus tab + blok terkait.** Pastikan `TabKey` & daftar tab tetap konsisten. |
| I15 | `src/lib/content-types.ts` / `content.ts` / `site-content.ts` (B) | `ManagedTestimonial`, `TESTIMONIALS`, normalizer | **Hapus tipe, konstanta, normalizer, & field `testimonials`.** Data lama di Firestore `content` yang masih punya `testimonials` → normalizer dihapus berarti field diabaikan (lihat R4). |
| I16 | `src/lib/admin-nav.ts` (B?) | mungkin tidak ada entri; verifikasi | — |
| I17 | `TASK-SELANJUTNYA.md`, `docs/README.md` | entri Taman v1/v2 | **Perbarui** agar mencatat penghapusan. |

---

## 3. Titik risiko (mudah merusak sistem lain — wajib hati-hati)

| # | Risiko | Dampak bila salah | Mitigasi |
| --- | --- | --- | --- |
| **R1** | `AccountTabs`/`user-account` masih memuat `"testimoni"` di `VALID_TABS`, tapi komponen/panel sudah dihapus | Error runtime "type 'testimoni' tidak ada" atau panel kosong | Ubah **bersamaan** di I7 & I8; jalankan `tsc` (union `AccountTab` akan menolak key tak dikenal). |
| **R2** | `reviews-manager` masih `import` `importTamanFromReview` dari `admin-api` | Build gagal (named export hilang) | Hapus import+handler+tombol (I6) **sebelum** hapus blok di `admin-api` (I5), lalu `tsc`. |
| **R3** | `admin-audit-types` union dihapus, tapi Firestore masih berisi dokumen audit lama beraksi `taman.*` | Halaman `/admin/audit` menampilkan aksi tanpa label | **Sudah aman:** `audit-log-manager.tsx` memakai fallback `ADMIN_AUDIT_ACTION_LABEL[a] ?? a` (baris 105 & 160). Aksi lama tampil sebagai string mentah. Cukup hapus dari union & label. |
| **R4** | Field `testimonials` dihapus dari tipe konten, tapi Firestore `content/*` masih menyimpannya | Tidak error (field ekstra diabaikan), **asalkan** normalizer tidak `throw` pada field tak dikenal | Pastikan `normalizeContent` mengabaikan field ekstra dengan aman; jangan pakai schema strict. Simpan backup data sebelum migrasi. |
| **R5** | `next.config` redirect `/taman/kirim` menunjuk `/taman/tulis` yang dihapus | 404 berantai (redirect → halaman hilang) | Hapus entri redirect (I9) bersamaan dengan penghapusan halaman. |
| **R6** | `phaser` dicopot saat masih ada importer | Build gagal | Pastikan **semua** importer Phaser terhapus dulu (`taman-scene.ts`, `taman-phaser.tsx`, `taman-preview.tsx`). Baru `npm uninstall phaser`. |
| **R7** | `tsconfig.json` masih meng-`include` `scripts/taman.test.ts` | `tsc` error file tidak ada | Hapus referensi (I10). |
| **R8** | `test:blog` masih menyebut `scripts/taman.test.ts` | `test:blog` gagal (file hilang) | Hapus argumen (I12). |
| **R9** | Beranda: `page.tsx` masih mengimpor komponen yang dihapus | Build gagal | Bagian I1 dikerjakan bersamaan dengan penghapusan komponen. |
| **R10** | Sisa tautan/CTA lain ke `/taman/*` (mis. dari beranda, footer, promo) | Tautan 404 | Telusuri ulang `grep "taman"` **setelah** penghapusan; jadikan 0 hasil di `src`. |
| **R11** | Cache/CDN masih menyajikan HTML/JS lama yang memuat kanvas | Sementara waktu, pengunjung lama bisa error saat JS memanggil API yang hilang | API Taman dihapus → respons 404; aman (tidak merusak). Setelah deploy, Vercel membangun ulang. Tidak perlu aksi khusus. |
| **R12** | Data Firestore `taman_testimonials`/`taman_private` tertinggal | Tidak error (tidak ada yang membaca), tapi "sampah" | Opsional: hapus koleksi lewat konsol/script. **Tidak wajib** untuk rilis kode. Lihat §6. |

---

## 4. Urutan eksekusi yang aman (fase)

> Prinsip: **putuskan konsumen dulu, baru hapus sumbernya.** Setiap fase ditutup
> dengan gate `tsc` + `lint` + test + `build`.

### Fase D0 — Persiapan & backup
- [ ] Commit/push pekerjaan yang sedang berjalan (jika ada) agar titik balik jelas.
- [ ] Catat commit sebelum penghapusan (tag/branch cadangan, mis. `backup/pre-hapus-testimoni`).
- [ ] Backup data Firestore: koleksi `taman_testimonials`, `taman_private`, dan field `testimonials` di dokumen `content/*` (export JSON) — **untuk jaga-jaga**, karena permintaan = hapus total.

### Fase D1 — Putuskan konsumen di UI bersama (B & A yang menyentuh file bersama)
- [ ] **I1** `src/app/page.tsx`: hapus `TamanSection` & `TamanSchema`.
- [ ] **I7 + I8** `user-account.tsx` & `account-tabs.tsx`: hapus tab "testimoni".
- [ ] **I6** `reviews-manager.tsx`: hapus "Angkat jadi testimoni".
- [ ] **I2** `admin-nav.ts`: hapus menu "Taman Testimoni".
- [ ] **I13** `hero.tsx`: hapus avatar testimoni.
- [ ] **I14** `content-extra-manager.tsx`: hapus tab "Testimoni".
- [ ] Gate: `tsc` (harus menangkap semua importer yang belum dibereskan).

### Fase D2 — Hapus lib & komponen A (Taman)
- [ ] Hapus semua file di §1.1 **kecuali** aset & script & docs (di fase berikutnya).
- [ ] Hapus blok **I5** di `admin-api.ts`.
- [ ] Hapus **I3** di `analytics.ts`.
- [ ] Gate: `tsc` + `lint`.

### Fase D3 — Hapus sistem B (konten lama)
- [ ] **I15**: hapus `ManagedTestimonial`, `TESTIMONIALS`, `normalizeTestimonial`,
      field `testimonials` di `content-types.ts`, `content.ts`, `site-content.ts`.
- [ ] Pastikan `normalizeContent` tetap aman terhadap field `testimonials` lama di data.
- [ ] Gate: `tsc` + `lint` + `build`.

### Fase D4 — Bersihkan konfigurasi & tipe lintas-sistem
- [ ] **I3 (audit)** `admin-audit-types.ts`: hapus aksi `taman.*` (dengan mitigasi R3).
- [ ] **I9** `next.config.ts`: hapus redirect `/taman/kirim`.
- [ ] **I10** `tsconfig.json`: hapus referensi `scripts/taman.test.ts`.
- [ ] **I11 + I12** `package.json`: hapus 4 script, `phaser`, dan argumen `test:blog`.
- [ ] Gate: `tsc` + `lint` + **semua** `test:*` + `build`.

### Fase D5 — Hapus aset, script, docs
- [ ] Hapus `public/taman/`.
- [ ] Hapus `scripts/taman*.mjs` & `scripts/gen-taman-*.mjs`.
- [ ] Hapus dokumen Taman di `docs/` (§1.1).
- [ ] Perbarui `docs/README.md` & `TASK-SELANJUTNYA.md` (catat penghapusan).
- [ ] Gate: `build` (pastikan tak ada referensi aset hilang).

### Fase D6 — QA akhir & rilis
- [ ] `grep -rn "taman" src scripts public next.config.ts tsconfig.json package.json`
      → **harus 0** (kecuali penjelasan historis yang disengaja).
- [ ] Uji regresi manual:
  - [ ] Beranda tampil normal **tanpa** seksi Taman; Hero tanpa avatar testimoni.
  - [ ] `/akun` tanpa tab "Testimoni saya"; `?tab=testimoni` → fallback "ringkasan".
  - [ ] `/admin/audit` tetap tampil (aksi lama `taman.*` tidak error).
  - [ ] `/admin/reviews` tetap berfungsi (tanpa tombol angkat testimoni).
  - [ ] `/admin/content` (content-extra) tanpa tab Testimoni; tab lain utuh.
  - [ ] Semua tautan lama `/taman/*` → 404 wajar (bukan error server).
- [ ] Gate penuh: `tsc`, `lint`, semua `test:*`, `build`.
- [ ] Commit konvensional (mis. `refactor: hapus total sistem testimoni (taman + konten lama)`).
- [ ] Push hanya setelah pemilik minta.

### Fase D7 (opsional) — Pembersihan data Firestore
- [ ] Hapus koleksi `taman_testimonials` & `taman_private`.
- [ ] Hapus field `testimonials` dari dokumen `content/*`.
- [ ] Hapus dokumen audit lama beraksi `taman.*` (opsional).
- [ ] **Tidak wajib** untuk rilis kode; kode tetap aman tanpanya.

---

## 5. Dampak yang perlu diketahui pemilik

1. **Beranda kehilangan bukti sosial testimoni.** Tidak ada lagi testimoni tampil
   di beranda (Taman maupun avatar Hero). Pertimbangkan pengganti bukti sosial
   (mis. `SocialProof` dari data pesanan nyata yang sudah ada) — **di luar scope**
   dokumen ini, sebutkan dulu bila diinginkan.
2. **Portal akun kehilangan tab "Testimoni saya".** Riwayat testimoni user hilang.
3. **Dashboard kehilangan menu Taman & (untuk B) tab Testimoni di konten.**
4. **Ulasan produk (reviews) TETAP ADA** — hanya tombol "Angkat jadi testimoni"
   yang hilang. Ulasan & rating produk tidak terganggu.
5. **SEO:** JSON-LD `Review` dari testimoni hilang (tidak lagi dirender). JSON-LD
   produk (`AggregateRating` ulasan) tetap.
6. **Paket `phaser` (±1 MB) dicopot** → bundel lebih ringan; tidak ada fitur lain
   yang memakainya.
7. **Keamanan/privasi:** dengan hilangnya sistem, tidak ada lagi data pribadi
   (email/uid) tambahan yang disimpan untuk testimoni.

---

## 6. Definition of Done (penghapusan)

1. Tidak ada satu pun referensi `taman`/`testimoni` (sistem) di `src`, `scripts`,
   `public`, `package.json`, `tsconfig.json`, `next.config.ts`.
2. Beranda, portal akun, dashboard admin, ulasan produk, audit log, dan build
   **berfungsi normal** tanpa sistem testimoni.
3. `tsc`, `lint`, **semua** `test:*`, dan `build` hijau.
4. `phaser` tidak lagi menjadi dependensi.
5. Dokumen Taman lama dihapus/ditandai; `docs/README.md` & `TASK-SELANJUTNYA.md`
   diperbarui.
6. (Opsional) Data Firestore `taman_*` & field `testimonials` dibersihkan.

---

## 7. File yang TIDAK boleh disentuh salah (ringkas)

File-file ini **dipakai bersama** sistem lain — cukup **hapus bagian testimoni-nya**,
jangan hapus file-nya:

- `src/app/page.tsx` (beranda utama)
- `src/lib/admin-nav.ts` (navigasi dashboard)
- `src/lib/analytics.ts` (analitik umum)
- `src/lib/admin-audit-types.ts` (tipe audit umum)
- `src/lib/admin-api.ts` (API klien admin umum)
- `src/lib/content-types.ts`, `content.ts`, `site-content.ts` (sistem konten)
- `src/components/auth/user-account.tsx`, `account-tabs.tsx` (portal akun)
- `src/components/sections/hero.tsx` (beranda)
- `src/components/admin/reviews-manager.tsx`, `content-extra-manager.tsx` (admin)
- `package.json`, `tsconfig.json`, `next.config.ts`, `firestore.rules` (konfigurasi)

---

## 8. HASIL EKSEKUSI (2026-10-10)

Fase **D0–D6 selesai**. Gate penuh hijau: `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅
(15 suite, tanpa `test:taman`) · `build` ✅.

Ringkas yang dikerjakan:
- **Dihapus total:** route `/taman/*`, `/api/taman/*`, `/api/admin/taman/*`,
  `/admin/(dashboard)/taman/*`; folder `src/components/taman/`; `admin/taman-*.tsx`;
  `auth/account-taman.tsx`; lib `taman-*.ts`; aset `public/taman/`; script
  `gen-taman-*.mjs` & `taman*.mjs` & `taman.test.ts`; 6 dokumen Taman;
  dependensi **phaser** (dicopot via `npm uninstall`).
- **File bersama (bagian testimoni dilepas):** `page.tsx`, `account-tabs.tsx`,
  `user-account.tsx`, `reviews-manager.tsx`, `admin-nav.ts` (+ import `Sparkles`),
  `hero.tsx`, `content-extra-manager.tsx`, `content-types.ts`, `content.ts`,
  `site-content.ts`, `admin-api.ts`, `analytics.ts`, `admin-audit-types.ts`,
  `next.config.ts`, `tsconfig.json`, `package.json`, `globals.css`
  (keyframes `taman-*`).
- **grep verifikasi:** `taman` = 0 di kode (hanya false positive "o**tama**si"
  di `scripts/seed-project-duitin.mjs`); `testimoni` = 0 di `src` kecuali
  `ProjectTestimonial` (lihat §9).

### 9. `ProjectTestimonial` — IKUT DIHAPUS (fase D7)

`ProjectTestimonial` (kutipan klien per proyek portofolio) awalnya dipertahankan,
namun atas keputusan pemilik **ikut dihapus** (fase tambahan D7). Yang dibersihkan:

- `src/lib/project-types.ts`: tipe `ProjectTestimonial` + field `Project.testimonial`.
- `src/lib/projects.ts`: normalisasi + serialize field `testimonial`.
- `src/lib/api-schemas.ts`: `testimonial` dari schema proyek.
- `src/app/api/admin/projects/route.ts`: pemetaan `testimonial`.
- `src/components/admin/projects-manager.tsx`: blok UI "Testimoni (opsional)".
- `src/app/portofolio/[slug]/page.tsx`: render kutipan + JSON-LD `Review` proyek
  (+ import ikon `Quote`).
- `src/lib/content.ts`: 3 entri `testimonial` di `PROJECTS`.
- `scripts/seed-project-*.mjs` (4 file): blok `testimonial` + komentar yang
  menyebut testimoni.

**Hasil:** `testimonial`/`testimoni` = 0 di `src` & `scripts` (kecuali deskripsi
produk template "Section testimoni & FAQ" di `seed-product-landing-page.mjs`,
yang merujuk fitur produk, bukan sistem testimoni LKTech).

**Gate D7:** `tsc` ✅ · `eslint` ✅ · 15 suite test (291 test) ✅ · `build` ✅.


