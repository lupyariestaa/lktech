# Task Implementasi — Testimoni "Taman Pixel"

> Turunan dari `docs/2026-10-10-planning-testimoni-taman-pixel.md`.
> Status: **EKSEKUSI DIMULAI** — T0 selesai. Keputusan pemilik: testimoni contoh hanya di lokal & pratinjau admin (D2 dipertahankan). Urutan fase wajib diikuti.
> Aturan per fase: satu commit konvensional, lalu `npx tsc --noEmit`, `npx eslint .`, `npm run test:taman`, dan `npm run build` hijau sebelum lanjut.

---

## 0. Keputusan final (dari jawaban pemilik)

| # | Topik | Keputusan | Catatan |
| --- | --- | --- | --- |
| Q2 | Gaya pixel | Retro 8-bit (warna terbatas) + modern-pixel untuk latar | Sprite SVG grid, `shape-rendering: crispEdges` |
| Q3 | Isi kartu | Nama singkat, peran/usaha, quote, rating, tanggal, tautan proyek/produk (opsional) | Email **tidak** pernah tampil publik |
| Q4 | Nama publik | Nama depan + inisial ("Budi S.") | Bisa pakai nama samaran (`displayName`) |
| Q5 | Hewan per frame | Maks/min mengikuti device (lihat §3.2) | Angka dihitung dari breakpoint |
| Q5b | Pool > slot | **Gacha**: tombol "Acak" memilih subset baru dari pool | Lihat §3.3 |
| Q6 | Minimum tampil | Frame tampil bila ≥ 3 testimoni **nyata** published | Sample tidak dihitung |
| Q7 | Kirim testimoni publik | **Ya**, wajib login Google + persetujuan + moderasi admin | Tidak langsung tampil |
| Q8 | Kartu | *Default saya:* popover di desktop (≥768px), bottom sheet di mobile | Lihat §4.3 |
| Q9 | Navigasi antar kartu | Ya (sebelumnya/berikutnya) | Keyboard panah |
| Q10 | Animasi | Idle bergerak pelan, hover melompat, shuffle saat acak; mati bila reduced-motion | CSS `steps()` |
| Q11 | Hewan | kucing, kelinci, burung, rubah, beruang, kura-kura, kupu-kupu, ikan | 8 sprite SVG |
| Q12 | Angkat dari ulasan | Ya, manual oleh admin, tetap butuh persetujuan | Tidak otomatis |
| Q13 | Lokasi admin | Halaman sendiri `/admin/taman` | Lebih cocok dengan pool besar & moderasi |
| Q14 | Urutan | *Default saya:* angka `order` + tombol naik/turun (keyboard) + pratinjau frame live. Drag sebagai peningkatan opsional | Accessible & sederhana |
| Q15 | Analitik | Ya, event tanpa PII | §10 |
| Q16 | Seksi lama | Diganti total setelah v1 stabil | Testimoni lama diimpor (T13) |
| Q18 | Email pemberi | **Disimpan** untuk verifikasi, koleksi privat, tidak diekspos | Perubahan kecil dari default (lihat D1) |
| Q19 | Persetujuan | **Wajib** tercatat sebelum publish (checkbox + catatan bukti) | Gate di API, bukan hanya UI |
| Q20 | Hapus | **Bisa**: pemberi hapus dari `/akun`, admin hapus, email ikut terhapus | §9 |
| Q21 | Nama hewan | Tidak ditampilkan, hanya ikon | — |
| Q22 | Konten awal | **Permintaan pemilik: testimoni contoh bisa dibuat untuk melihat hasil.** Lihat D2 — dibatasi | Wajib ditandai "CONTOH" |
| Q1 (jawaban final) | Sample publik | Pemilik sempat meminta sample tampil publik; setelah dijelaskan dampaknya, keputusan final: **sample hanya di lokal & pratinjau admin** (D2) | Tidak ada sample di deploy publik |
| Q23 | Bahasa | Indonesia | — |
| Q24 | Tautan | Opsional ke proyek/produk yang valid | — |
| Q25 | Aset | SVG dibuat dari kode (generator script) | §3 |
| Q26 | Budget aset | ≤ 60 KB total frame | Diukur di T3 |
| Q27 | Animasi lib | CSS saja | Tidak pakai Framer untuk frame |
| Q28 | Browser | Modern | — |
| Q29 | Ruang lingkup v1 | Frame, kartu, submit publik, admin (moderasi, hewan, urutan, hapus), privasi | Angkat ulasan ikut v1 (karena diminta) |

### Deviasi dari planning (dicatat, bukan diam-diam)

- **D1 — Q1 direvisi: koleksi terpisah, bukan memperluas `ManagedTestimonial`.**
  Alasan: `ContentProvider` mengirim seluruh konten situs ke browser. Email, `ownerUid`, dan catatan persetujuan **tidak boleh** berada di dokumen itu. Maka:
  - `taman_testimonials/{id}`: data publik-aman (nama singkat, quote, rating, hewan, status, urutan, `kind`, `ownerUid` internal, `consent` ringkas, `source`).
  - `taman_private/{id}`: `email`, `contactName`, catatan bukti persetujuan. Akses hanya Admin SDK.
  - API publik hanya mengembalikan field whitelist (lihat T4).
  - Testimoni lama di `content.testimonials` tetap dibaca; diimpor lewat T13.
- **D2 — Testimoni contoh (fiktif): dibolehkan hanya sebagai `kind: "sample"`, tidak pernah tampil publik.**
  Alasan: aturan proyek (H2, P4) melarang testimoni karangan di situs publik, dan pemilik ingin melihat hasil. Maka:
  - Sample ditandai `kind: "sample"`, nama diawali "Contoh ·", label "CONTOH (fiktif)" di admin.
  - Sample hanya tampil di **pratinjau admin** (`/admin/taman/pratinjau`) dan di **lokal dev** (`NODE_ENV=development`). Tidak pernah di deploy Vercel (termasuk preview).
  - Sample tidak dihitung untuk minimum tampil, JSON-LD, maupun counter.
  - Tombol "Hapus semua contoh" di admin.
  - Pemilik tetap bisa memilih nol sample (tanpa seed).

---

## 1. Ringkasan teknis

```
Publik:  /api/taman (GET, whitelist) ──► TamanSection (server) ──► TamanClient (klien: frame, gacha, kartu)
         /taman/kirim (form, login Google) ──► /api/taman/submit (POST, verifikasi token, rate limit)
         /akun ▸ tab "Testimoni saya" ──► /api/taman/mine (GET) & /api/taman/mine/[id] (DELETE)
Admin:   /admin/taman (daftar, moderasi, hewan, urutan, pratinjau) ──► /api/admin/taman/*
         /admin/reviews ▸ "Angkat jadi testimoni" ──► /api/admin/taman/import-review
Data:    taman_testimonials (publik-aman) + taman_private (email, bukti) + audit (tanpa PII)
```

## 2. Model data

### 2.1 `taman_testimonials/{id}` (dibaca publik via whitelist)
```ts
type TamanStatus = "pending" | "published" | "hidden" | "rejected";
type TamanKind = "real" | "sample";
type TamanSource = "submitted" | "admin" | "review" | "legacy" | "sample";

type TamanTestimonial = {
  id: string;
  kind: TamanKind;               // "sample" tidak pernah keluar ke publik
  status: TamanStatus;
  displayName: string;           // sudah disingkat: "Budi S." (publik)
  fullName?: string;             // admin only (dari login/ulasan)
  role: string;                  // ≤ 120
  quote: string;                 // ≤ 400
  rating: number;                // 1–5
  dateISO: string;               // tanggal testimoni
  animal: AnimalKey;             // ditetapkan admin saat approve (default acak)
  order: number;                 // urutan tampil (admin)
  projectSlug?: string;          // tervalidasi ke proyek ada
  productSlug?: string;          // tervalidasi ke produk ada
  source: TamanSource;
  sourceRefId?: string;          // id ulasan asal (internal)
  ownerUid?: string;             // internal: pemilik akun (hak hapus)
  consent: {                     // ringkas, bukti lengkap di taman_private
    given: boolean;
    givenAtISO?: string;
  };
  createdAtISO: string;
  updatedAtISO: string;
  approvedAtISO?: string;
  approvedBy?: string;           // email admin
};
```

### 2.2 `taman_private/{id}` (Admin SDK only, tidak pernah diekspos)
```ts
type TamanPrivate = {
  testimonialId: string;
  email: string;                 // dari token Google terverifikasi (email_verified)
  uid: string;
  consentText: string;           // teks persetujuan yang disetujui pengirim
  consentAtISO: string;
  evidenceNote?: string;         // catatan admin: bukti persetujuan (mis. tautan email)
  evidenceBy?: string;           // admin yang mencatat
};
```

### 2.3 Firestore rules
- Kedua koleksi: `allow read, write: if false;` (akses hanya Admin SDK), konsisten dengan koleksi lain.
- Verifikasi di T1 (review file rules) dan catatan publish ulang rules di dokumen operasional.

### 2.4 Indeks
- `taman_testimonials`: `status` + `order` (daftar publik). Ditambahkan ke `firestore.indexes.json` **hanya jika** query gabungan dipakai; default: filter in-memory (volume kecil), dicatat sebagai keputusan.

### 2.5 Aturan validasi (`api-schemas.ts`)
- `displayName` ≤ 40, `role` ≤ 120, `quote` 20–400, `rating` int 1–5, `dateISO` valid & ≤ hari ini.
- `consent` harus `true` saat submit (tidak bisa dikirim tanpa centang).
- `projectSlug`/`productSlug` harus ada di koleksi terkait (cek di server).

---

## 3. Aset & visual

### 3.1 Generator SVG (`scripts/gen-taman-sprites.mjs`)
- Sprite ditulis sebagai grid karakter (mis. 16×16) per hewan dan latar; script mengubahnya jadi SVG `<rect>` per piksel dengan palet terbatas (≤ 8 warna per sprite).
- Keluaran: `public/taman/animals/{kucing,kelinci,burung,rubah,beruang,kura-kura,kupu-kupu,ikan}.svg`, `public/taman/bg-langit.svg`, `public/taman/bg-tanah.svg`, `public/taman/pagar.svg`, `public/taman/pohon.svg`.
- Script dijalankan manual (`npm run gen:taman`); hasil SVG di-commit (bukan dibuat saat build).
- Anggaran: total ≤ 60 KB (diukur di T3, ditampilkan di output script).

### 3.2 Layout frame
- Frame rasio ±16:9 (desktop) dan ±4:5 (mobile), latar langit + pohon + pagar + tanah.
- **Slot** tetap (8 posisi, koordinat % dalam frame). Jumlah slot aktif mengikuti device:
  | Device | Maks slot | Min slot tampil |
  | --- | --- | --- |
  | Mobile (<640px) | 4 | 3 |
  | Tablet (640–1023px) | 6 | 3 |
  | Desktop (≥1024px) | 8 | 3 |
- Server merender 8 slot (urutan default), klien menyesuaikan jumlah setelah mount lewat `matchMedia` → tanpa hydration mismatch (slot ekstra disembunyikan CSS sebelum mount).

### 3.3 Gacha (acak)
- Pool = testimoni publik (`real` + `published`) (+ `sample` hanya di pratinjau/lokal).
- Bila pool ≤ jumlah slot → tampilkan semua, tanpa tombol.
- Bila pool > slot → tampilkan tombol **"Acak lagi"**. Pemilihan memakai **bobot**: testimoni yang baru-baru ini tampil di sesi (`sessionStorage`) diberi bobot lebih kecil, dan tidak boleh sama dengan set sebelumnya.
- Pemilihan acak hanya di klien (`Math.random`); SSR memakai urutan `order`.
- Animasi acak: shuffle pixel (sprite berkedip cepat ±500 ms) lalu muncul set baru. Reduced-motion: langsung ganti tanpa animasi.
- Logika murni `pickSlots(pool, slotCount, recentIds, rng)` dites dengan rng deterministik.

---

## 4. UI publik

### 4.1 Seksi `#testimoni`
- Judul + sub-judul jujur (menyebut jumlah testimoni **nyata**, bukan angka karangan).
- Frame taman (server render struktur + klien interaktif).
- Teks alternatif lengkap tersedia di daftar `sr-only` (quote + nama + peran) agar tercrawl dan dapat dibaca screen reader.
- Tombol **"Tulis testimoni"** → `/taman/kirim`.
- Seksi disembunyikan bila real published < 3 (Q6), kecuali di pratinjau admin.

### 4.2 Hewan (`TamanAnimal`)
- `button` dengan `aria-label`: "Testimoni dari Budi S., Pemilik Toko Kopi, bintang 5".
- Keadaan: idle (bob pelan steps), hover/fokus (lompat), aktif (kartu terbuka, outline pixel).
- Hanya satu kartu terbuka dalam satu waktu.

### 4.3 Kartu (`TamanCard`)
- **Desktop (≥768px): popover** dipasang absolut di dekat hewan, posisi dihitung dari `getBoundingClientRect` lalu di-clamp agar tetap di dalam frame; panah pixel menunjuk hewan.
- **Mobile (<768px): bottom sheet** (fixed, lebar penuh, maks 70vh, tombol tutup ≥ 44px, geser ke bawah untuk menutup opsional).
- Isi: avatar (inisial bila tanpa foto), nama singkat, peran, rating bintang, tanggal ("Oktober 2026"), quote, tautan proyek/produk (opsional).
- Navigasi: tombol sebelumnya/berikutnya (Q9), panah kiri/kanan saat fokus di kartu.
- Dialog: `role="dialog"`, `aria-modal` pada bottom sheet, focus trap sederhana, Esc menutup, fokus kembali ke hewan.
- Klik di luar menutup.

### 4.4 Interaksi keyboard
- Tab masuk ke frame → hewan berurutan; Enter/Space membuka kartu; panah berpindah antar hewan; Esc menutup.

### 4.5 Reduced motion
- Semua animasi dimatikan via `motion-reduce:` dan media query; kartu & acak tetap berfungsi.

---

## 5. Kirim testimoni (publik, login wajib)

### 5.1 Halaman `/taman/kirim`
- Tanpa login → tombol "Masuk dengan Google" (pakai auth yang sudah ada), kembali ke halaman ini setelah login.
- Login tapi email belum terverifikasi (`email_verified` false) → ditolak dengan pesan jelas.
- Form: nama tampil (≤ 40, default = nama Google disingkat), peran/usaha, quote, rating, tanggal (default hari ini), tautan proyek/produk (opsional, pilih dari daftar yang valid), **checkbox persetujuan** (teks eksplisit: "Saya setuju testimoni ini ditampilkan publik di situs LKTech dengan nama singkat. Saya paham bisa meminta penghapusan kapan saja.").
- Hewan **tidak** dipilih pengirim (Q-default: admin menetapkan saat approve; sesuai nuansa gacha).
- Pesan sukses: "Terima kasih. Testimoni akan ditampilkan setelah kami tinjau."

### 5.2 `POST /api/taman/submit`
- `requireUser` (token Google) → `uid`, `email`, `email_verified` dari token (bukan dari body).
- Validasi zod (§2.5), `consent.given` harus `true`.
- Rate limit: maks 1 pending aktif per uid, dan maks 3 pengiriman per 24 jam (pakai helper rate-limit yang sudah ada; bila tidak cocok, in-memory cukup untuk v1 dan dicatat).
- Tulis `taman_testimonials` (`status: pending`, `kind: real`, `source: submitted`, `ownerUid`) dan `taman_private` (email, consentText, consentAtISO) dalam satu batch.
- Respons tidak mengembalikan email atau data privat.

### 5.3 Akun: tab "Testimoni saya" (`/akun`)
- Daftar testimoni milik uid: status (pending/published/hidden/rejected), tanggal kirim.
- Tombol **Hapus** (Q20) → `DELETE /api/taman/mine/[id]` (cek `ownerUid`), menghapus testimoni dan `taman_private` terkait, serta audit tanpa PII.

---

## 6. Admin

### 6.1 Halaman `/admin/taman`
- Ringkasan: jumlah real per status, jumlah sample (dengan label), tombol "Pratinjau frame".
- Filter: status, kind, source, pencarian nama/quote, urutkan (order, terbaru).
- Daftar baris: avatar/inisial, nama singkat (admin juga melihat nama lengkap & email di detail), hewan, rating, status, urutan (▲▼), aksi.
- **Detail/edit panel**:
  - Nama singkat, peran, quote, rating, tanggal, tautan (validasi).
  - Pemilih hewan (grid 8 ikon, pratinjau sprite).
  - **Persetujuan**: checkbox "Persetujuan pemberi sudah diterima" + catatan bukti (wajib untuk publish real). Tanpa ini tombol "Terbitkan" nonaktif, dan API menolak (gate server).
  - Email & `fullName` hanya terlihat admin (dari `taman_private`).
  - Aksi: Terbitkan, Sembunyikan, Tolak (dengan alasan internal), Hapus.
- **Urutan**: tombol ▲▼ (keyboard-friendly) + pratinjau frame live di samping; drag sebagai peningkatan opsional (bukan v1 wajib).
- **Pratinjau**: `/admin/taman/pratinjau` menampilkan frame dengan pool termasuk sample (ditandai), untuk melihat hasil dan gacha.
- Bulk aksi: terbitkan/sembunyikan banyak item (batas 50), dengan konfirmasi; **Hapus semua contoh** (konfirmasi ketik "HAPUS CONTOH").

### 6.2 API admin (`/api/admin/taman/*`)
- `GET` list (dengan field privat untuk admin).
- `PATCH /:id` (nama, peran, quote, rating, tanggal, tautan, hewan, order, status). Publish real memerlukan `consent.given` & `taman_private.evidenceNote`.
- `DELETE /:id` (hapus testimoni + privat).
- `POST /bulk` (action: publish|hide|delete, slugs/ids ≤ 50).
- `POST /import-review` (dari `reviewId`): membuat draft `source: review`, `fullName` dari ulasan, `displayName` disingkat, `sourceRefId` = id ulasan; tidak otomatis published.
- `POST /seed-samples` (hanya lokal dev atau dengan env `TAMAN_ALLOW_SAMPLE_SEED=1`, dan selalu `kind: sample`) dan `DELETE /samples` (hapus semua sample).
- Semua route `requireAdmin`; validasi zod; audit `taman.*`.

### 6.3 Audit
- Tambah aksi di `admin-audit-types.ts`: `taman.save`, `taman.publish`, `taman.hide`, `taman.reject`, `taman.delete`, `taman.reorder`, `taman.import_review`, `taman.seed_samples`, `taman.delete_samples`, `taman.bulk`.
- Target = id testimoni; meta tanpa email/nama lengkap.

### 6.4 Pengangkatan dari ulasan
- Tombol "Angkat jadi testimoni" di `/admin/reviews` untuk ulasan dengan rating ≥ 4 (tampil hanya bila belum pernah diangkat — cek `sourceRefId`).
- Hasilnya draft; admin wajib mengisi persetujuan sebelum publish.

---

## 7. Keamanan & privasi

- Email, `uid`, `fullName`, dan `consentText` **tidak pernah** ada di respons publik atau di dokumen `content` (D1).
- Whitelist field di `GET /api/taman` (test: respons tidak mengandung `email`/`ownerUid`/`fullName`).
- JSON-LD `Review` hanya dari `real` + `published` + `consent.given`.
- Sample tidak pernah keluar dari lingkungan non-dev (test env: `NODE_ENV=production` → sample ditolak di API & filter).
- Sanitasi quote: teks biasa (React escaping), tanpa HTML.
- Rate limit submit; tolak pengiriman dari akun tanpa email terverifikasi.
- Tautan proyek/produk divalidasi keberadaannya di server.

---

## 8. Aksesibilitas & performa

- Seperti §4.2–4.5. Kontras teks kartu ≥ 4.5:1. Target sentuh ≥ 44px.
- Gambar frame `alt=""` (dekoratif); avatar `alt` = nama singkat.
- Sprite hewan inline/ter-cache, lazy untuk yang di luar layar; aset total ≤ 60 KB.
- Klien hanya untuk komponen interaktif; data dirender server.

---

## 9. Hak penghapusan & retensi

- Pemberi: hapus dari `/akun` (§5.3). Hapus = hapus `taman_testimonials` + `taman_private` (email hilang). Audit hanya menyimpan id & waktu.
- Admin: hapus dari `/admin/taman` atau bulk.
- Testimoni yang di-`hidden`/`rejected` tetap disimpan privat untuk bukti, dan dapat dihapus atas permintaan.
- Dokumen operasional: prosedur permintaan hapus via WhatsApp/email → admin hapus manual (D-operasional).

---

## 10. Analitik

- `taman_open` (hewan, indeks slot, sumber: klik/keyboard).
- `taman_refresh` (gacha; jumlah pool).
- `taman_submit` (tanpa PII; hanya "berhasil"/"gagal").
- Tanpa isi testimoni di event (Q15).

---

## 11. Migrasi (T13)
- Testimoni lama (`content.testimonials` yang bukan placeholder) diimpor ke `taman_testimonials` sebagai `source: legacy`, `status: pending` (tidak otomatis tampil), dengan tombol impor di admin. Tidak ada email (tidak tersedia), jadi `taman_private` kosong; admin wajib isi bukti persetujuan.
- Seksi lama tetap berfungsi sampai switch (Q16).

---

## 12. Fase & task (checklist)

### T0 — Persiapan
- [x] Baca ulang `ContentProvider` & `site-content.ts` untuk konfirmasi D1. Hasil: `ContentProvider` menerima seluruh `SiteContent` dari server (`initial`) ke context browser → email & data privat WAJIB di koleksi terpisah (D1 dikonfirmasi).
- [x] Verifikasi `firestore.rules`: `match /{document=**} allow read, write: if false` — koleksi baru (taman_*) otomatis tertutup dari klien; akses hanya Admin SDK. Tidak perlu perubahan rules.
- [x] Status dokumen diperbarui (eksekusi dimulai).

### T1 — Data & privasi
- [x] Tipe `taman-types.ts` (§2.1, §2.2) + konstanta status/kind/source.
- [x] Modul data `taman-store.ts` (server-only): CRUD dua koleksi, batch tulis atomik, normalisasi, hapus testimoni + privat.
- [x] Rules: tetap deny client (tidak ada perubahan ke izin publik).

### T2 — Logika murni & test
- [x] `taman-logic.ts`: `shortName`, `isPubliclyVisible(kind, status)`, `publicView(t)` (whitelist), `pickSlots(pool, n, recent, rng)`, `slotCountFor(width)`, `canPublish(t, private)`, `sanitizeRating`, `validateProjectLink`.
- [x] `scripts/taman.test.ts` (30 test): shortName (nama tunggal, ganda, nama samaran), whitelist (tidak ada field privat), sample tidak publik di production, pickSlots (tanpa duplikat, bobot recent, deterministik dengan rng), canPublish (tanpa persetujuan → false), slot count.
- [x] Tambah `test:taman` ke `package.json`, `.github/workflows/ci.yml`, dan exclude `tsconfig.json`.

### T3 — Aset SVG
- [x] `scripts/gen-taman-sprites.mjs` + grid 8 hewan, latar, pagar, pohon.
- [x] Hasil SVG di `public/taman/`; cetak total ukuran; ≤ 60 KB (6,5 KB).
- [x] `npm run gen:taman` di `package.json`.

### T4 — API publik & kirim
- [x] `GET /api/taman` (whitelist, `s-maxage=60`, hanya real+published; sample hanya bila lokal dev).
- [x] `POST /api/taman/submit` (token diverifikasi, email_verified, email_verified, zod, consent, rate limit, batch tulis).
- [x] `GET /api/taman/mine`, `DELETE /api/taman/mine/[id]` (pemilik dicek dari token).
- [x] Test validasi input (`validateSubmit` di `taman-logic.ts`, 11 test baru).

### T5 — API admin & audit
- [ ] `GET/PATCH/DELETE /api/admin/taman/*`, `POST /bulk`, `POST /import-review`, `POST /seed-samples`, `DELETE /samples`.
- [ ] Gate publish (consent + evidence) di server.
- [ ] Audit `taman.*` (tambah ke `admin-audit-types.ts` + label; test audit tetap lolos).

### T6 — Admin UI
- [x] `/admin/taman` (daftar, filter, status, urutan ▲▼, detail panel, pemilih hewan, persetujuan, aksi, bulk, hapus sample).
- [x] `/admin/taman/pratinjau` (pool + gacha + label contoh; frame publik interaktif di T7).
- [x] Tombol "Angkat jadi testimoni" di `/admin/reviews` (ulasan approved, rating ≥ 4).
- [x] Tambah menu sidebar "Taman Testimoni" (`admin-nav.ts`).

### T7 — Frame publik
- [x] `taman-animal.tsx`, `taman-card.tsx` (popover/bottom sheet), `taman-section.tsx`, `taman-client.tsx` (slot, gacha, fokus). Frame digabung di `taman-client.tsx`.
- [x] Gacha dengan `pickSlots`, animasi shuffle, reduced-motion.
- [x] Keyboard (roving tabindex, panah), Esc, focus return, klik di luar.
- [x] Daftar `sr-only` testimoni.
- [x] Tampil berdampingan di beranda (Q16). Seksi tersembunyi bila testimoni < 3.

### T8 — Form kirim & akun
- [x] `/taman/kirim` (login gate ke `/masuk?next=`, form, checkbox persetujuan, pesan sukses).
- [x] Tab "Testimoni saya" di `/akun` (status, hapus; tab `testimoni`).

### T9 — Privasi
- [x] Hapus oleh pemberi & admin menghapus `taman_private` (batch dua dokumen).
- [x] Tes: respons publik & akun tidak mengandung email/ownerUid (46 test di `test:taman`, termasuk `PRIVATE_FIELDS`).
- [x] Dokumen prosedur permintaan hapus: `docs/2026-10-10-prosedur-hapus-testimoni.md`.

### T10 — SEO & analitik
- [ ] JSON-LD `Review`/`AggregateRating` hanya real+published+consent.
- [ ] Event `taman_open`, `taman_refresh`, `taman_submit` (tanpa PII).

### T11 — Migrasi
- [ ] Impor testimoni lama sebagai pending (tombol admin).

### T12 — QA & rilis
- [ ] `tsc`, `lint`, `test:taman`, `test:blog`, `test:audit`, `build` hijau.
- [ ] Uji manual (pemilik): desktop/mobile, keyboard, reduced-motion, kontras.
- [ ] Dokumen hasil `docs/2026-10-xx-taman-pixel.md` + update `docs/README.md` & `TASK-SELANJUTNYA.md`.
- [ ] Commit & push **hanya setelah** pemilik minta.

---

## 13. Definition of Done

1. Seksi tersembunyi bila real published < 3; tidak ada testimoni karangan di deploy publik.
2. Hanya `real` + `published` + `consent.given` yang tampil publik dan masuk JSON-LD.
3. Email, uid, nama lengkap, dan catatan persetujuan tidak pernah keluar ke klien publik.
4. Kirim testimoni wajib login Google dengan email terverifikasi; tidak tampil sebelum admin publish.
5. Pemberi dapat menghapus testimoninya; penghapusan ikut menghapus email privat.
6. Gacha bekerja saat pool > slot; slot menyesuaikan device; reduced-motion dihormati.
7. Hewan & kartu dapat dioperasikan keyboard; kartu popover (desktop) dan bottom sheet (mobile).
8. Admin dapat moderasi, menetapkan hewan & urutan, membuat sample (lokal/pratinjau), dan menghapusnya.
9. Setiap aksi admin tercatat di audit tanpa PII.
10. Gate, tes, dan build hijau.

## 14. Risiko & mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Sample terbawa ke produksi | Filter `kind` + cek lingkungan di server + test production |
| Email bocor lewat konten | D1: koleksi terpisah + whitelist + test |
| Spam submit | Login Google + email terverifikasi + rate limit + moderasi |
| Frame kosong / sepi | Seksi disembunyikan < 3 real |
| Gacha tidak adil | Bobot recent + tanpa duplikat + rng deterministik di test |
| Aset berat | Anggaran 60 KB, SVG grid kecil |
| Hydration mismatch (device) | Server render slot default, klien atur jumlah setelah mount |

## 15. Pertanyaan terbuka (perlu jawaban sebelum T1)

1. **Sample (D2):** setuju hanya di lokal dev & pratinjau admin, dan tidak pernah di deploy publik (termasuk Vercel preview)? *(Saya rekomendasikan ya.)*
2. **Nama sample:** boleh pakai nama fiktif berawalan "Contoh ·" (mis. "Contoh · Pemilik Kopi, Tasikmalaya")?
3. **Email verifikasi:** cukup `email_verified` dari Google, atau perlu verifikasi tambahan?
4. **Kirim ulang persetujuan:** bila pemberi mengedit quote setelah publish, perlu persetujuan ulang? *(Default: ya, edit oleh pemberi memindahkan status ke pending — belum diatur di v1; saya usulkan pemberi tidak bisa mengedit, hanya menghapus.)*
5. **Email notifikasi** ke pemberi saat disetujui/ditolak: ingin ada (Resend, best-effort) atau tidak?

Setelah pemilik menjawab 1–5 dan memberi go, eksekusi dimulai dari T0.
