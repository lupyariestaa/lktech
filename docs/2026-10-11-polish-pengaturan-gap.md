# Catatan Gap — Polish Sistem Pengaturan (Audit)

> **Status: 📝 CATATAN GAP (belum diperbaiki).** Hasil audit menyeluruh (UI + backend)
> atas sistem Pengaturan yang baru dibangun (S0–S9). Temuan **terverifikasi** dengan
> pembacaan kode & grep. Disusun: 2026-10-11. **Target perbaikan: sesi berikutnya.**

---

## 0. Ringkasan

Sistem Pengaturan sudah berfungsi & terintegrasi, tetapi audit menemukan **beberapa
gap yang membuat fitur "terlihat jalan padahal tidak"**, satu **jalur keamanan
berbahaya** (restore backup bisa menonaktifkan admin), dan sejumlah inkonsistensi UX.
Total **~30 temuan** (7 kritis, 12 sedang, 11 rendah).

**Prinsip perbaikan:** setiap kontrol harus **benar-benar berdampak**; keamanan
berlapis; konsistensi; a11y.

---

## 1. 🔴 KRITIS — fitur tampil tapi tidak berfungsi / berbahaya

- **G1 — Pengaturan SEO disimpan tetapi TIDAK berpengaruh.** (`settings-seo.tsx` ↔
  `src/app/layout.tsx`) `settings.seo.{title,description,ogImage,searchConsoleId}`
  hanya ada di form/tipe/schema; **tidak ada konsumen** di metadata/`layout.tsx`/
  `structured-data.tsx`. Admin isi → "Tersimpan" → situs tak berubah. Klaim
  "Ditempel ke `<meta google-site-verification>`" **tidak benar** (tak ada render).
- **G2 — Restore backup `admins` bisa menonaktifkan/mengubah admin & lockout.**
  (`src/lib/backup.ts:102-113`) Impor menulis dokumen `admins/*` apa adanya (tanpa
  lewati OWNER, tanpa paksa `active:true`) → file backup yang dimodifikasi bisa
  `active:false` admin sah. Jalur "backdoor" melewati guard owner.
- **G3 — Restore `settings` pakai `_id` bebas (bukan `SETTINGS_DOC_ID`).**
  (`src/lib/backup.ts:109-110`) bisa menyuntik/menimpa dokumen settings lain.
- **G4 — Restore = overwrite destruktif tanpa snapshot/undo & tanpa batas.**
  (`backup.ts` + `backup/route.ts`) Tidak ada snapshot pra-restore, tidak ada batas
  baris/byte, `EXPORT_CAP=5000` memotong **diam-diam** tanpa penanda `truncated`.
- **G5 — Verifikasi email admin tidak dicek (`email_verified`).**
  (`admin-guard.ts:38-39`) `verifyIdToken` mengembalikan `email_verified` tetapi tidak
  diperiksa → potensi email belum terverifikasi lolos sebagai admin.
- **G6 — Gate admin di proxy hanya cek keberadaan cookie.** (`proxy.ts:27-37`)
  Cookie bernama `__session` apa pun meloloskan shell `/admin` (defense-in-depth
  memang, tetapi halaman server yang baca data via Admin SDK tak diverifikasi token).
- **G7 — Maintenance bisa "telat" (basi).** (`settings/route.ts` revalidate &
  `api/maintenance-status` cache `s-maxage=30`) Setelah simpan toggle, `/api/
  maintenance-status` tak direvalidasi → proxy bisa masih menganggap OFF/ON hingga
  ~30–90s. Admin aktifkan maintenance lalu tes → masih normal (membingungkan).

---

## 2. 🟠 SEDANG — bug UX, data, keamanan sekunder

- **G8 — 4 halaman menelan error load → bisa menimpa data dengan default.**
  (`settings-notifikasi.tsx:38`, `settings-seo.tsx:29`, `settings-lanjutan.tsx:38`,
  `settings-overview.tsx:41`) Bila API gagal, form tampil `DEFAULT_SETTINGS` &
  Simpan tetap aktif → menimpa server dgn default. (Kontak sudah benar: banner +
  disable.)
- **G9 — Tombol Simpan selalu aktif (tak disable saat tak ada perubahan).**
  Memicu PUT + revalidate + audit walau tanpa perubahan (noise audit). Semua form.
- **G10 — `datetime-local` maintenance salah konversi zona waktu.**
  (`settings-lanjutan.tsx:129-136`) `etaISO.slice(0,16)` menampilkan UTC sebagai
  waktu lokal → geser 5 jam (WIB). Round-trip edit bergeser.
- **G11 — Pesan error server generik.** Validasi PUT hanya "Data pengaturan tidak
  valid." (`settings/route.ts`) → user tak tahu field mana. Validasi klien minim
  (email/WA/URL/datetime hampir tanpa validasi).
- **G12 — Sosial `label` tersembunyi & bisa kosong.** (`settings-kontak.tsx:183`)
  `label` wajib `min(1)` di server; link dgn href kosong → simpan gagal tanpa UI
  label untuk diperbaiki. `key={i}` rawan salah rekonsiliasi.
- **G13 — Dua sumber status "email configured" bisa kontradiktif.**
  (`settings-overview.tsx` via `/api/admin/integrations` vs halaman Notifikasi via
  `/api/admin/settings`) → Ringkasan bisa beda dgn Notifikasi.
- **G14 — Target sentuh < 44px.** (`settings-keamanan.tsx:149` hapus admin `h-9`,
  `settings-pembayaran.tsx:102` & `settings-integrasi.tsx:88` refresh `h-9`).
- **G15 — Metrik pembayaran: `paid`/`paidAmount` dari `payment.status` tanpa cek
  `orders.status`; konversi pakai definisi lain (breakdown `orders.status`).**
  (`payment-metrics-pure.ts:55-59` vs `:10-15`) → dua definisi "dibayar" dalam satu
  objek; overcount order yang dibatalkan setelah bayar.
- **G16 — `days` tak divalidasi di route metrik.** (`payments/metrics/route.ts:16`)
  respons bisa mengembalikan `days` mentah (negatif/huge) walau hitungan di-clamp.
- **G17 — `isDbAdmin` default-open.** (`admins.ts:77`) dokumen tanpa field `active`
  dianggap aktif (`!== false`). Sebaiknya default-closed (`=== true`).
- **G18 — Rate-limit ekspor backup tidak ada; audit ekspor bisa flood.**
  (`backup/route.ts` GET) POST ada rate-limit, GET tidak.
- **G19 — Ping Upstash/Mayar kirim Authorization ke URL dari env tanpa validasi
  domain.** (`rate-limit.ts`, `mayar.ts`) URL salah → token terkirim ke host lain.

---

## 3. 🟡 RENDAH — konsistensi, a11y, duplikasi

- **G20 — 3 sumber daftar sub-menu** (`admin-nav.ts` children, `settings-nav.ts`,
  `settings-overview.tsx` item) → drift manual.
- **G21 — Deskripsi nav Keamanan menyebut "sesi, rate-limit, maintenance"** yang
  tak dikelola di halaman itu (`settings-nav.ts`).
- **G22 — Label kartu Ringkasan ≠ judul halaman** ("Pembayaran (Mayar)" vs
  "Pembayaran & Mayar"; "Sistem" vs "Lanjutan & Sistem").
- **G23 — Duplikasi pola form** (`field` string, hook fetch+save, tombol
  Simpan/Tersimpan) di 4 komponen; `<Metric>` & banner kesehatan berulang.
- **G24 — Error state overview tak nyata** (hardcoded `ok:true` untuk Keamanan/
  Sistem; gagal fetch tampak seperti "belum diisi"; tanpa skeleton/refresh).
- **G25 — "Informasi Sistem" (lanjutan) isinya data Kontak**, bukan info sistem
  (versi/uptime/enabled maintenance).
- **G26 — `settings-shell` fallback slug tak dikenal** menampilkan judul Ringkasan
  (menyesatkan) alih-alih 404.
- **G27 — A11y:** ikon status overview tanpa `sr-only`; tombol "Uji koneksi" ×4
  tanpa `aria-label` service; badge "Anda/OWNER" hanya visual; "Tersimpan" tanpa
  `aria-live`; `ConfirmDialog` tanpa focus-trap & `inert` (berbeda dgn drawer).
- **G28 — `settings-integrasi`: layanan belum terkonfigurasi tetap bisa diuji**
  (tombol aktif) & `disabled={testing!==null}` memblok semua; `cron`/`download`
  hanya teks catatan (tak jadi baris status visual).
- **G29 — Backup UX:** dialog konfirmasi + kartu pratinjau tampil bersamaan;
  `pending` tak dibersihkan; sumber kosong tak muncul di pratinjau.
- **G30 — `maintenance/page.tsx`:** metadata title statis (tak ikut `m.title`);
  `<img>` tanpa dimensi (CLS); ETA selalu zona Jakarta tanpa label "WIB".

---

## 4. Usulan Fase Perbaikan (P0–P4)

### Fase P0 — Fungsional & keamanan kritis (wajib duluan)
- [ ] **G1** — Sambungkan `settings.seo` ke metadata (root layout/`generateMetadata`):
  title/description/OG default + render `google-site-verification`; hapus klaim palsu
  bila tak disambungkan.
- [ ] **G2/G3** — Perbaiki impor backup: lewati OWNER, paksa `active:true` utk admin,
  paksa `settings` → `SETTINGS_DOC_ID`; validasi bentuk per-dokumen.
- [ ] **G4** — Batas baris/byte + penanda `truncated` + snapshot pra-restore + dry-run.
- [ ] **G5** — Tolak admin bila `email_verified !== true`.
- [ ] **G7** — Revalidate `/api/maintenance-status` saat simpan/toggle maintenance
  (atau turunkan cache/hapus cache).

### Fase P1 — Keamanan sekunder & data
- [ ] **G6** — Verifikasi session/token di layout `/admin` (bukan hanya proxy).
- [ ] **G15/G16** — Satukan definisi "dibayar" (pakai `orders.status`), clamp & kembalikan `days` aman.
- [ ] **G17** — `isDbAdmin` default-closed.
- [ ] **G18/G19** — Rate-limit ekspor; validasi domain URL Upstash/Mayar.

### Fase P2 — UX form & konsistensi
- [ ] **G8** — Banner error + disable Simpan di semua form (pola Kontak).
- [ ] **G9** — Disable Simpan saat `!dirty`.
- [ ] **G10** — Perbaiki konversi `datetime-local` (ISO↔lokal konsisten) + label zona.
- [ ] **G11/G12** — Validasi klien (email/WA/URL/datetime) + pesan error per-field; perbaiki `label` sosial.
- [ ] **G13** — Satu sumber status email.
- [ ] **G14** — Naikkan target sentuh ke ≥44px.

### Fase P3 — Konsistensi, a11y, dedup
- [ ] **G20/G21/G22** — Satukan daftar sub-menu (satu sumber) & label.
- [ ] **G23** — Ekstrak `field`, hook form, `SaveButton`/`SavedBadge`, `Metric`, banner.
- [ ] **G24/G25/G30** — Error/skeleton & info sistem nyata; metadata maintenance dinamis.
- [ ] **G26** — Fallback slug tak dikenal → notFound.
- [ ] **G27/G28/G29** — Poles a11y (sr-only, aria-label service, aria-live, focus-trap
  ConfirmDialog) & UX integrasi/backup.

### Fase P4 — QA & rilis
- [ ] Gate penuh (tsc/eslint/semua test/build); tambah test murni (backup sanitize,
  seo mapping, payment metrics konsisten).
- [ ] Uji browser; docs; commit.

---

## 5. Catatan
- Fokus **P0** karena menyangkut **kepercayaan** (SEO palsu) & **keamanan** (backup admin).
- Semua temuan menyertakan lokasi berkas untuk tindak lanjut.
- Belum ada kode yang diubah pada sesi audit ini.
