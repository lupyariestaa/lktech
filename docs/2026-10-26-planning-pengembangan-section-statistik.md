# Planning Pengembangan — Section Statistik Angka (`#statistik`)

> **Status:** **Disetujui & diimplementasikan (S1–S3 inti)** — S4 (angka turunan) belum dikerjakan. Lihat §13.
> **Disusun:** 26 Oktober 2026
> **Cakupan:** section "30+ Proyek Dikerjakan · 20+ Klien Puas · 3 Layanan Inti · 100% Komitmen" pada halaman beranda (`/`) dan "Tentang Kami" (`/tentang`).
> **Dokumen terkait:** `docs/2026-10-15-blueprint-upgrade-homepage-uiux.md` (prinsip UI/UX beranda), `docs/2026-10-25-planning-pengembangan-seo-dashboard.md` (gaya perencanaan & prinsip kejujuran data).
> **Sifat dokumen:** audit kondisi nyata + rencana bertahap. Bukan klaim bahwa seluruh usulan sudah dikerjakan.

---

## 1. Ringkasan eksekutif

Section statistik adalah blok sosial-proof kecil di beranda: empat angka besar (`30+ Proyek`, `20+ Klien`, `3 Layanan`, `100% Komitmen`) dengan animasi hitung naik saat masuk viewport. Section ini sudah dirancang dengan **prinsip kejujuran yang baik**: ia menyembunyikan diri selama angkanya masih berupa contoh bawaan, dan menampilkan caption "Angka kumulatif sejak berdiri, diperbarui berkala."

Namun mekanisme perlindungan itu **rapuh dan mudah dilewati**: begitu admin mengubah satu angka saja, seluruh section dianggap "nyata" dan langsung tayang — termasuk angka yang masih contoh. Selain itu, kopling ke trust bar hero bergantung pada pencocokan teks label (regex `/klien/i`), validasi nilai terlalu longgar (menerima angka negatif/desimal), dan tidak ada penanda sumber/periode tiap angka.

Rekomendasi utama: perkuat **integritas data** lebih dulu (penanda "terverifikasi" yang eksplisit + panduan periode/sumber), lalu rapikan **validasi & editor**, lalu **presentasi & aksesibilitas**. Semua bersifat penambahan opsional yang *backward-compatible* — tidak ada perubahan tema, tidak ada skor/klaim baru.

### Urutan prioritas yang disarankan

1. **S1 — Integritas & kejujuran data (P0):** ganti deteksi "contoh" dari kesamaan-persis menjadi penanda `verified` eksplisit; guard nilai wajar; lepaskan kopling regex hero.
2. **S2 — Validasi & editor (P1):** batas nilai, pratinjau, urutan, soft-limit jumlah, panduan panjang label.
3. **S3 — Presentasi & aksesibilitas (P2):** format angka (pemisah ribuan/`Intl`), ikon & deskripsi opsional, grid adaptif, atribut a11y.
4. **S4 — Angka turunan (P3, opsional):** hanya untuk angka yang **objektif** (jumlah proyek/layanan/kota) dari sumber yang sudah ada; tidak ada penjadwalan otomatis.

---

## 2. Tujuan & ruang lingkup

### In-scope

- Integritas makna angka (mencegah tayangnya klaim tak terverifikasi).
- Validasi input & pengalaman editor di `/admin/content` (tab **Statistik**).
- Presentasi visual & aksesibilitas section di `/` dan `/tentang`.
- (Opsional) penurunan angka objektif dari sumber data yang sudah ada.

### Out-of-scope (tidak dikerjakan di fase ini)

- Mengubah palet/tema atau memindahkan section dari posisinya.
- Membuat skor, peringkat, atau klaim kausalitas apa pun.
- Otomatisasi yang menayangkan klaim tanpa persetujuan manusia.
- Menambah penyimpanan/koleksi baru (tetap memakai dokumen `content` yang ada).
- Angka subjektif seperti "Klien Puas" **tidak** akan diturunkan otomatis.

---

## 3. Audit kondisi saat ini

### 3.1 Fakta teknis (bukti kode)

| Aspek | Lokasi & perilaku |
|---|---|
| Komponen | `src/components/sections/stats.tsx:49` — client component. `Counter` (`:10-47`) memakai `useInView({ once: true })` + `requestAnimationFrame`, menghormati `prefers-reduced-motion` (`useReducedMotionPreference`). |
| Gating "contoh" | `src/components/sections/stats.tsx:56` — `if (stats.length === 0 \|\| isDefaultStats(stats)) return null;` |
| Definisi "masih contoh" | `src/lib/content-types.ts:172-174` — `isDefaultStats` = **kesamaan persis JSON** dengan `STATS` bawaan. |
| Data bawaan | `src/lib/content.ts:419-424` — `STATS = [{20,"+","Proyek Dikerjakan"},{15,"+","Klien Puas"},{3,"","Layanan Inti"},{100,"%","Komitmen"}]`. |
| Tipe item | `src/lib/content-types.ts:84-88` — `ManagedStat { value: number; suffix: string; label: string }`. |
| Skema server | `src/lib/site-content-schema.ts:99-103` — `statSchema { value: z.number().finite(); suffix: max 40; label: trim/min1/max MAX_SHORT }`; array dibatasi `MAX_ITEMS = 100` (`:19,133`). |
| Normalisasi & simpan | `src/lib/site-content.ts:243` (`normalizeList(raw.stats, normalizeStat, …)`) dan `:296-313` (`saveSiteContent` → dokumen `content`, `merge: true`). |
| Distribusi ke klien | `src/components/content-provider.tsx:32-35,62-64` — `useContent()` dari `initial` server (root layout). |
| Konsumen | `src/app/page.tsx:12`, `src/app/tentang/page.tsx:8,231`; serta trust bar hero `src/components/sections/hero.tsx:549`. |
| Kopling hero | `src/components/sections/hero.tsx:646-647` — `honestStats = isDefaultStats(stats) ? [] : stats;` lalu `find((s) => /klien/i.test(s.label))`; dipakai di `:722-734`. |
| Caption kejujuran | `src/components/sections/stats.tsx:94-96` — "Angka kumulatif sejak berdiri, diperbarui berkala." |
| Editor admin | `src/components/admin/content-extra-manager.tsx:216-264` (tab `stats`), peringatan "masih contoh" di `:118-126`, definisi tab di `:25,30`. |

### 3.2 Alur data

```
content.ts STATS (bawaan)  ──┐
                             ├─► content-types.defaultSiteContent()
                             │        │
Firestore dokumen "content" ─┘        ▼
                    normalizeSiteContent() ─► ContentProvider (initial) ─► useContent()
                                                                              │
                        ┌─────────────────────────────────────────────────────┤
                        ▼                              ▼                        ▼
             <Stats/> (beranda & tentang)      <Hero/> trust bar         /admin/content (editor)
```

### 3.3 Kekuatan (pertahankan)

- **Prinsip kejujuran**: section tidak tayang saat angka masih contoh (`stats.tsx:56`) + caption kumulatif (`:94-96`).
- **Aksesibilitas dasar**: hormati `prefers-reduced-motion` (nilai langsung penuh, tanpa animasi) — `stats.tsx:23,82`.
- **Performa kecil**: animasi via rAF dengan pembersihan (`:38`); `once: true` mencegah animasi ulang.
- **Desain konsisten**: memakai `SectionSeam`, grid-lines, aurora, token warna (`:59-96`).
- **Satu sumber kebenaran**: data dari dokumen `content` yang sama dengan section lain; normalisasi aman (`normalizeList`).

### 3.4 Temuan / peluang (severity)

**STA-01 — Gating "contoh" mudah dilewati (Sedang).**
`isDefaultStats` (`content-types.ts:172-174`) hanya `true` bila daftar **identik persis** dengan default. Begitu admin mengubah **satu** angka (mis. `15→16`) atau bahkan menambah spasi, seluruh section dianggap "nyata" dan tayang — walau tiga angka lain masih contoh. Tidak ada penanda per-angka maupun konfirmasi. Dampak: klaim tak terverifikasi bisa tayang tanpa disadari.

**STA-02 — Kopling rapuh hero ↔ stats (Sedang).**
Trust bar hero memilih angka klien lewat regex label (`hero.tsx:647` `/klien/i`). Mengganti label menjadi "Mitra Aktif" membuat baris sosial **hilang diam-diam**; menambah stat berlabel "Klien Churn" akan salah pilih. Tidak ada flag eksplisit.

**STA-03 — Validasi nilai terlalu longgar (Sedang).**
`value: z.number().finite()` (`site-content-schema.ts:100`) menerima negatif, desimal, dan angka sangat besar. Editor `<input type="number">` (`content-extra-manager.tsx:231-235`) tanpa `min`/`step`. `Counter` membulatkan (`stats.tsx:34`), sehingga `3.7 → "4"`, dan `-5+"`/`100000%` mungkin tampil. Tidak ada pemisah ribuan (`1000` ditampilkan tanpa titik).

**STA-04 — Tidak ada batas jumlah tampil (Rendah).**
Skema mengizinkan sampai `MAX_ITEMS = 100` item (`site-content-schema.ts:133`), sedangkan grid hanya 2 kolom (mobile) / 4 kolom (≥lg) (`stats.tsx:71`). 5–7 item menghasilkan baris kedua yang tidak seimbang tanpa penanganan khusus.

**STA-05 — Editorial tanpa panduan batas (Rendah).**
`label` dibatasi `MAX_SHORT` (`site-content-schema.ts:102`) tetapi UI tidak menampilkan sisa/batas; label panjang melipat di kartu sempit dan merusak ritme.

**STA-06 — Aksesibilitas counter & section (Rendah).**
Angka berubah cepat selama animasi; tidak ada `aria-hidden` + teks final untuk screen reader, dan section belum memakai `aria-labelledby` (hanya `id="statistik"`). Pembaca layar berpotensi membaca nilai antara.

**STA-07 — Periode/sumber angka tidak eksplisit (Rendah).**
Caption "diperbarui berkala" (`stats.tsx:95`) tidak menyertakan tanggal data nyata. Tidak ada field `asOf`/sumber, sehingga sulit diverifikasi dan berisiko basi tanpa terlihat.

**STA-08 — Editor minim (Rendah).**
Belum ada pratinjau langsung, urutan (naik/turun), ikon, atau deskripsi opsional per stat; entri baru default `{0, "+", ""}` (`content-extra-manager.tsx:219`).

**STA-09 — Minim tes spesifik (Info).**
Hanya ada tes skema menolak `NaN` (`scripts/site-content-schema.test.ts:31-35`). Belum ada tes untuk `isDefaultStats`, `normalizeStat`, atau perilaku gating.

---

## 4. Prinsip desain & implementasi

1. **Kejujuran lebih dulu.** Angka tayang hanya bila admin menandainya terverifikasi; jangan memakai "beda dari default" sebagai proxy verifikasi.
2. **Tanpa klaim berlebihan.** Tidak ada skor, peringkat, atau klaim kausalitas. "Klien Puas" tetap diketik manual oleh admin.
3. **Backward-compatible.** Semua field baru bersifat opsional; konten lama tetap valid dan tidak hilang.
4. **Minim permukaan.** Tetap di dokumen `content`; tanpa koleksi/store baru.
5. **Aksesibilitas.** Hormati reduced-motion (sudah ada), tambahkan teks setara & label section.
6. **Perubahan bertahap.** Setiap fase dapat dirilis & diuji mandiri.

---

## 5. Keputusan yang perlu disetujui

> Mohon jawab pada bagian ini sebelum implementasi dimulai.

| # | Pertanyaan | Opsi |
|---|---|---|
| K1 | Cara menandai angka "nyata"? | (a) **Flag dokumen** `statsVerified` (satu kali centang) — sederhana; (b) **Flag per item** lebih presisi; (c) kombinasi. *Rekomendasi: (b) per item + (a) sebagai default tampilan.* |
| K2 | Batas jumlah item yang wajar? | **3–8 item** dengan soft-limit & penanganan grid. *Rekomendasi: soft-limit 8.* |
| K3 | Field opsional baru per stat? | `note` (sumber/periode), `icon`, `featured`. Setujui semuanya / sebagian. |
| K4 | Sumber periode? | Dokumen-level `statsAsOf` (tanggal) ditampilkan pada caption. Setuju/tidak. |
| K5 | Angka turunan otomatis (S4)? | **(a)** Tidak dikerjakan; **(b)** hanya angka objektif (proyek/layanan/kota) tanpa "klien puas"; **(c)** tunda. *Rekomendasi: tunda (c), putuskan setelah S1–S3.* |
| K6 | Batas nilai angka? | Integer, `0 ≤ value ≤ 1.000.000`, suffix ≤ 8 char. Setuju/tidak. |

---

## 6. Rencana fase

Effort: **S** ≈ kecil, **M** ≈ sedang, **L** ≈ besar.

### Fase S0 — Keputusan & definisi (prasyarat) — effort S

- Finalkan jawaban §5.
- Tetapkan format tampilan angka (pemisah ribuan, locale `id-ID`).
- Tetapkan daftar label/ikon yang didukung (bila K3 disetujui).

**Selesai bila:** keputusan §5 terdokumentasi di dokumen ini.

### Fase S1 — Integritas & kejujuran data (P0) — effort M

- **Penanda verifikasi eksplisit.** Tambah `verified?: boolean` pada `ManagedStat` (default `false`) — menggantikan logika "sama dengan default" sebagai penentu tayang.
  - `Stats` tayang bila ada **minimal satu** item `verified` (atau sesuai K1); item yang belum terverifikasi ditandai halus di editor, bukan di publik.
  - Pertahankan perilaku lama sebagai *fallback* ketika field belum ada (backward-compatible), namun editor menyarankan migrasi.
- **Guard nilai.** Validasi/klamp: integer, rentang wajar (K6); tolak `NaN`/negatif/desimal.
- **Lepaskan kopling hero.** Ganti regex `/klien/i` (`hero.tsx:647`) dengan `featured?: boolean` pada stat (pilih satu item bertanda). Trust bar tetap hanya muncul untuk data "nyata".
- **Periode nyata.** Tambah `statsAsOf` (dokumen-level) dan tampilkan di caption (menggantikan teks generik) bila diisi.

**Selesai bila:** tidak mungkin lagi "setengah contoh" tayang; hero tidak rapuh terhadap perubahan label; ada tes unit untuk gating & guard.

### Fase S2 — Validasi & pengalaman editor (P1) — effort M

- Input editor: `min`, `max`, `step=1`, `inputMode="numeric"` (`content-extra-manager.tsx:231-235`).
- Pratinjau langsung kartu stat (reuse komponen `Counter`, mode instan).
- Urut naik/turun & tombol duplikat; soft-limit jumlah (K2) dengan pesan jelas.
- Indikator batas panjang label; preset suffix (`+`, `%`, `k+`, kosong).
- Perbaiki entri baru agar tidak tayang otomatis (`verified` default `false`).

**Selesai bila:** input tidak bisa menyimpan nilai tak wajar; admin melihat pratinjau sebelum simpan.

### Fase S3 — Presentasi & aksesibilitas (P2) — effort M

- Format angka dengan `Intl.NumberFormat("id-ID")` (pemisah ribuan) tanpa mengubah tipe data.
- `icon` opsional + `note` opsional per stat (dari K3).
- Grid adaptif: 1–2 kolom mobile, 2–4 kolom ≥sm, menangani 3/5/6 item dengan rapi (mis. `auto-fit` / `sm:grid-cols-3`).
- A11y:
  - `aria-label`/`aria-labelledby` pada `<section>`.
  - Saat animasi berjalan: sembunyikan angka transisi dari AT (`aria-hidden`) dan sediakan teks final yang terbaca; atau hentikan animasi angka untuk reduced-motion (sudah) & AT.
  - Pastikan kontras ≥ AA (caption `white/60` di latar gelap — verifikasi).

**Selesai bila:** lolos checklist a11y manual + tampilan rapi untuk 3–8 item.

### Fase S4 — Angka turunan (P3, opsional) — effort L

> Hanya bila K5 = (b). Bergantung pada keputusan.

- Turunkan **angka objektif** dari sumber yang sudah ada: jumlah proyek (`getProjects()`), jumlah layanan (`SERVICES`), jumlah kota terkurasi (`getLocationSlugs()`).
- Tampilkan penanda "dihitung otomatis" + tombol **sinkronkan manual** (tanpa penjadwalan otomatis).
- "Klien Puas" dan sejenisnya **tetap manual**.

**Selesai bila:** angka turunan tidak dapat tayang tanpa penanda sumbernya.

---

## 7. Daftar berkas (rencana)

### Diubah (usulan)

- `src/components/sections/stats.tsx` — gating `verified`, format angka, a11y, grid adaptif.
- `src/lib/content-types.ts` — `ManagedStat` + field opsional; helper gating baru (mis. `hasVerifiedStats`).
- `src/lib/content.ts` — default diberi `verified: false` (atau biarkan; migrasi via normalisasi).
- `src/lib/site-content-schema.ts` — `statSchema` (rentang/`verified`/`note`/`icon`/`featured`), `statsAsOf`.
- `src/lib/site-content.ts` — `normalizeStat`/`normalizeSiteContent` untuk field baru.
- `src/components/admin/content-extra-manager.tsx` — validasi, pratinjau, urut, soft-limit, indikator verifikasi.
- `src/components/sections/hero.tsx` — trust bar memakai `featured` (bukan regex).
- `scripts/site-content-schema.test.ts` — perluas tes skema.

### Baru (usulan, opsional)

- `src/lib/stats-pure.ts` — helper murni (guard nilai, format, gating) agar dapat diuji Node.
- `scripts/stats.test.ts` — tes unit (gating, guard, format).

---

## 8. Model data usulan

Perluasan `ManagedStat` (semua opsional, backward-compatible):

```ts
type ManagedStat = {
  value: number;         // integer, 0..1_000_000
  suffix: string;        // pendek, mis. "", "+", "%", "k+"
  label: string;
  verified?: boolean;    // tampil hanya bila true (K1)
  featured?: boolean;    // dipakai trust bar hero (menggantikan regex) (K3)
  note?: string;         // sumber/periode, opsional (K3)
  icon?: string;         // nama ikon dari set yang ada (K3)
};
```

Dokumen-level (opsional):

```ts
type StatsMeta = {
  statsAsOf?: string;    // ISO date; bila diisi → tampil di caption (K4)
};
```

Semua tetap tersimpan di dokumen `content` yang sama (`site-content.ts:296-313`).

---

## 9. Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Field baru memperumit normalisasi | Data lama tak terbaca | Semua field opsional; `normalizeList` tetap fallback ke default; tes regresi. |
| `verified` lupa diisi → section hilang | Section tak tayang | Editor memberi indikator jelas + panduan; migrasi otomatis menandai item yang berbeda dari default sebagai *saran* (bukan otomatis `true`). |
| Perubahan grid merusak tata letak existing (4 item) | Regresi visual | Uji 3/4/5/6/8 item; pertahankan varian 4-kolom sebagai default. |
| Format `Intl` mengubah ekspektasi admin | Kebingungan | Nilai mentah tetap angka; format hanya di tampilan. |
| S4 menayangkan angka tanpa dasar | Klaim palsu | Hanya angka objektif + penanda sumber + tombol sinkron manual. |

---

## 10. Definition of Done (umum)

- Perubahan lulus `npm run test:unit`, `npx tsc --noEmit`, ESLint pada berkas terkait, dan `npm run build`.
- Tes baru menutup: gating `verified`, guard nilai, `normalizeStat`, format angka.
- Checklist a11y manual (kontras, reduced-motion, pembaca layar) lolos.
- Verifikasi manual: tambah/kurangi item, ubah label, hapus verifikasi → section berperilaku sesuai aturan.
- Dokumentasi (`docs/`) & pesan editor selaras.

---

## 11. Non-sasaran (ditegaskan)

- Tidak ada skor/klaim yang tidak dapat dipertanggungjawabkan.
- "Klien Puas" dan sejenisnya **tidak** dihitung otomatis.
- Tidak ada animasi/efek baru yang mengganggu keterbacaan atau aksesibilitas.
- Tidak menambah koleksi/store baru.
- Tidak mengubah tema, posisi section, atau hierarki halaman.

---

## 12. Batas audit ini

Audit kondisi saat ini dilakukan dari kode & skema di repo (`content.ts`, `content-types.ts`, `site-content*.ts`, `stats.tsx`, `hero.tsx`, `content-extra-manager.tsx`, `page.tsx`, `tentang/page.tsx`). Tidak diverifikasi di sini: nilai statistik **aktual** di dokumen Firestore produksi (mis. apakah saat ini `30+`/`20+`), perilaku runtime pembaca layar nyata, dan pengukuran performa lapangan — ketiganya perlu cek manual/staging saat implementasi.

---

## 13. Status implementasi (diperbarui)

Disetujui oleh pemilik produk dan dikerjakan sekaligus (S1–S3 inti).

| Fase | Status | Catatan |
|---|---|---|
| S1 — Integritas & kejujuran data | ✅ Selesai | `verified` per item (mode ketat aktif bila ada `verified:true`); guard nilai; hero memakai `featured` (fallback label lama); caption memakai `statsAsOf`. |
| S2 — Validasi & editor | ✅ Selesai | `min/max/step`, pratinjau tayang, preset sufiks, batas label/jumlah, tombol "Tandai semua terverifikasi", editor periode. |
| S3 — Presentasi & aksesibilitas | ✅ Selesai | `Intl` pemisah ribuan, grid adaptif (1/2/3/item banyak), `aria-labelledby` + `sr-only`, catatan per item. |
| S4 — Angka turunan | ⏸ Belum | Menunggu keputusan terpisah (K5). |

**Berkas yang berubah/baru:**
- Baru: `src/lib/stats-pure.ts` (logika murni) + `scripts/stats.test.ts` (11 tes).
- Ubah: `src/components/sections/stats.tsx`, `src/components/sections/hero.tsx`, `src/lib/content-types.ts`, `src/lib/site-content.ts`, `src/lib/site-content-schema.ts`, `src/components/admin/content-extra-manager.tsx`, `tsconfig.json`, `package.json` (`test:stats`).

**Keputusan yang diterapkan (default rekomendasi):** K1 per-item `verified`; K2 soft-limit 8; K3 `note`+`featured` (ikon ditunda); K4 `statsAsOf`; K5 tunda; K6 integer 0–1.000.000, sufiks ≤ 8.

**Kompatibilitas:** data lama tetap tayang (mode lama) sampai admin mencentang minimal satu "Terverifikasi"; setelah itu hanya angka terverifikasi yang tampil.

### Sisa / tindak lanjut
- S4 (angka turunan) menunggu keputusan K5.
- Opsi `icon` per stat belum dikerjakan (ditunda untuk menghindari ikon tak dikenal).
- Verifikasi manual di staging: tampilan 3–8 item, pembaca layar, dan nilai `statsAsOf` nyata.

