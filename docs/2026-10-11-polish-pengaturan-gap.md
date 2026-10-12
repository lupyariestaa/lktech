# Catatan Gap — Polish Sistem Pengaturan (Audit)

> **Status: 🚧 HAMPIR SELESAI — FASE P0 ✅, P1 ✅, P2 ✅ & P3 ✅ SELESAI (2026-10-11).**
> Hasil audit menyeluruh (UI + backend) atas sistem Pengaturan yang baru dibangun
> (S0–S9). Temuan **terverifikasi** dengan pembacaan kode & grep. Disusun: 2026-10-11.
> **Fase P0 (G1–G5, G7), P1 (G6, G15–G19), P2 (G8–G14) & P3 (G20–G24, G26–G30)
> sudah dieksekusi — lihat §6, §7, §8 & §9.** Fase P4 (QA & rilis) belum.

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

### Fase P0 — Fungsional & keamanan kritis (wajib duluan) ✅ SELESAI
- [x] **G1** — Sambungkan `settings.seo` ke metadata (root layout/`generateMetadata`):
  title/description/OG default + render `google-site-verification`; hapus klaim palsu
  bila tak disambungkan.
- [x] **G2/G3** — Perbaiki impor backup: lewati OWNER, paksa `active:true` utk admin,
  paksa `settings` → `SETTINGS_DOC_ID`; validasi bentuk per-dokumen.
- [x] **G4** — Batas baris/byte + penanda `truncated` + snapshot pra-restore + dry-run.
- [x] **G5** — Tolak admin bila `email_verified !== true`.
- [x] **G7** — Revalidate `/api/maintenance-status` saat simpan/toggle maintenance
  (atau turunkan cache/hapus cache).

### Fase P1 — Keamanan sekunder & data ✅ SELESAI
- [x] **G6** — Verifikasi session/token di layout `/admin` (bukan hanya proxy).
- [x] **G15/G16** — Satukan definisi "dibayar" (pakai `orders.status`), clamp & kembalikan `days` aman.
- [x] **G17** — `isDbAdmin` default-closed.
- [x] **G18/G19** — Rate-limit ekspor; validasi domain URL Upstash/Mayar.

### Fase P2 — UX form & konsistensi ✅ SELESAI
- [x] **G8** — Banner error + disable Simpan di semua form (pola Kontak).
- [x] **G9** — Disable Simpan saat `!dirty`.
- [x] **G10** — Perbaiki konversi `datetime-local` (ISO↔lokal konsisten) + label zona.
- [x] **G11/G12** — Validasi klien (email/WA/URL/datetime) + pesan error per-field; perbaiki `label` sosial.
- [x] **G13** — Satu sumber status email.
- [x] **G14** — Naikkan target sentuh ke ≥44px.

### Fase P3 — Konsistensi, a11y, dedup ✅ SELESAI
- [x] **G20/G21/G22** — Satukan daftar sub-menu (satu sumber) & label.
- [x] **G23** — Ekstrak `field`, hook form, `SaveButton`/`SavedBadge`, `Metric`, banner.
- [x] **G24/G25/G30** — Error/skeleton & info sistem nyata; metadata maintenance dinamis.
- [x] **G26** — Fallback slug tak dikenal → notFound.
- [x] **G27/G28/G29** — Poles a11y (sr-only, aria-label service, aria-live, focus-trap
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

---

## 6. ✅ Hasil Eksekusi FASE P0 (2026-10-11)

**Status: ✅ SELESAI (kode).** Gate: `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ (termasuk
`test:backup` 8→16 & `test:seo` baru 4) · `build` ✅ (81 halaman).

| Gap | Solusi |
| --- | --- |
| **G1** | Root layout kini `generateMetadata()` (async) — baca `getSiteSettings()` & terapkan `settings.seo` (title/description/ogImage) via helper murni baru **`src/lib/seo-pure.ts`** (`resolveSeo`/`hasSeo`). `searchConsoleId` → `metadata.verification.google` → `<meta name="google-site-verification">` benar-benar ter-render. `StructuredData` (JSON-LD) memakai deskripsi SEO juga. `getSiteSettings` dibungkus React `cache()` agar di-query sekali per request (dipanggil 2×: metadata + layout). |
| **G2/G3** | Impor backup kini lewat rencana murni **`planImport`** + **`sanitizeBackupRow`** (`backup-pure.ts`): sumber `admins` → id wajib email (lowercase), **OWNER (env `ADMIN_EMAILS`) DILINDUNGI** (baris dilewati), admin lain **dipaksa `active:true`**; sumber `settings` → id **dipaksa `SETTINGS_DOC_ID`** (`site`) — tak bisa menyuntik dokumen lain. |
| **G4** | Ekspor: `truncated` + `truncatedSources` di `meta` (deteksi via `limit(EXPORT_CAP+1)`). Impor: batas total **`IMPORT_CAP=5000`** dengan penanda `truncated` & hitungan `skipped`. **Snapshot pra-restore** otomatis ke koleksi `_backup_snapshots/{stamp}` (best-effort). Endpoint `POST /api/admin/backup?dryRun=1` menghitung dampak **tanpa menulis**. UI `settings-backup` memanggil dry-run & menampilkan akan-menulis/dilewati/truncated sebelum konfirmasi. |
| **G5** | `verifyToken` mengekstrak klaim `email_verified`; `requireAdmin` **menolak (403)** bila email belum terverifikasi. |
| **G7** | `/api/maintenance-status` tak lagi di-cache CDN (`Cache-Control: no-store`) — toggle maintenance langsung berlaku di proxy (hilangkan basi ~30–90s). PUT settings juga `revalidatePath("/maintenance")`. |

**Berkas baru:** `src/lib/seo-pure.ts`, `scripts/seo-pure.test.ts` (+ `test:seo`).
**Berkas diubah:** `src/app/layout.tsx`, `src/components/structured-data.tsx`,
`src/lib/settings.ts` (cache), `src/lib/backup.ts`, `src/lib/backup-pure.ts`,
`src/lib/admin-guard.ts`, `src/app/api/admin/backup/route.ts`,
`src/app/api/maintenance-status/route.ts`, `src/app/api/admin/settings/route.ts`,
`src/components/admin/settings/settings-backup.tsx`, `scripts/backup-pure.test.ts`,
`tsconfig.json`, `package.json`.

**Sisa (belum):** Fase **P1–P4** (G6, G8–G30). Langkah manual: uji browser (ubah SEO →
cek `<meta>`; restore backup yg menonaktifkan admin → harus tetap aktif; toggle
maintenance → langsung berlaku).

**Catatan:** `SETTINGS_DOC_ID` didefinisikan ulang di `backup-pure.ts` (agar modul tetap
murni/tanpa impor runtime); nilai harus sama dengan `src/lib/settings.ts` (`"site"`).

---

## 7. ✅ Hasil Eksekusi FASE P1 (2026-10-11)

**Status: ✅ SELESAI (kode).** Gate: `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ (termasuk
`test:payment` 5→8 & `test:trusted-url` baru 6) · `build` ✅ (81 halaman).

| Gap | Solusi |
| --- | --- |
| **G6** | Gerbang admin **server-side** baru **`src/components/admin/admin-server-guard.tsx`** dipasang di `app/admin/(dashboard)/layout.tsx`: verifikasi **kriptografis** session cookie (`verifyAdminSessionCookie` → `auth.verifySessionCookie`) + cek keanggotaan (`isAdminEmail`) SEBELUM render. Cookie palsu tak lagi membuka shell dashboard. (Route `/admin*` kini `ƒ` dynamic karena membaca cookie.) |
| **G15** | **Sumber tunggal "dibayar"** = `orders.status` (`dibayar`/`diproses`/`selesai`). Sebelumnya `paid`/`paidAmount` dari `payment.status` sedangkan konversi dari `orders.status` → dua definisi + overcount order dibatalkan-setelah-bayar. Kini `paid`, `paidAmount`, `pending`, `expired`, `conversionRate` semuanya dari `orders.status`. |
| **G16** | Helper murni **`clampDays`** (`MIN/MAX/DEFAULT_METRIC_DAYS`) dipakai di route & `getPaymentMetrics`; respons `/api/admin/payments/metrics` mengembalikan `days` yang **sudah di-clamp** (bukan mentah). |
| **G17** | `isDbAdmin` **default-closed**: `active === true` (sebelumnya `!== false` → dokumen tanpa field dianggap aktif). |
| **G18** | Ekspor backup `GET /api/admin/backup` kini **rate-limited** (10 / 10 menit per admin) — cegah flood I/O + audit. |
| **G19** | Helper murni baru **`src/lib/trusted-url.ts`** (`checkTrustedUrl`): sebelum kirim `Authorization`, host URL harus domain resmi (allowlist) & HTTPS & tanpa userinfo. Dipakai **Upstash** (`*.upstash.io`) & **Mayar** (`*.mayar.id/.io`; override tak aman → fallback preset mode). |

**Berkas baru:** `src/components/admin/admin-server-guard.tsx`, `src/lib/trusted-url.ts`,
`scripts/trusted-url.test.ts` (+ `test:trusted-url`).
**Berkas diubah:** `src/lib/session.ts` (`verifyAdminSessionCookie`), `src/lib/admins.ts`
(`isAdminEmail`, `isDbAdmin` default-closed), `src/lib/admin-guard.ts` (pakai
`isAdminEmail`), `app/admin/(dashboard)/layout.tsx`, `src/lib/payment-metrics-pure.ts`,
`src/lib/payment-analytics.ts`, `app/api/admin/payments/metrics/route.ts`,
`app/api/admin/backup/route.ts` (rate-limit GET), `src/lib/rate-limit.ts`,
`src/lib/mayar.ts`, `scripts/payment-metrics.test.ts`, `tsconfig.json`, `package.json`.

**Sisa (belum):** Fase **P2–P4** (G8–G14, G20–G30).
**Langkah manual:** uji browser — (1) set cookie `__session` ngawur → `/admin` harus
redirect login; (2) metrik pembayaran cocok dgn daftar order "dibayar"; (3) ekspor
backup berulang cepat → 429.

---

## 8. ✅ Hasil Eksekusi FASE P2 (2026-10-11)

**Status: ✅ SELESAI (kode).** Gate: `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ (termasuk
`test:settings-form` baru 10) · `build` ✅ (81 halaman).

Helper murni baru **`src/lib/settings-form-pure.ts`** (`isoToLocalInput`,
`localInputToIso`, `validate*`, `validateSettingsForm`).

| Gap | Solusi |
| --- | --- |
| **G8** | `settings-notifikasi` & `settings-seo` & `settings-lanjutan` kini menangkap error load → **banner merah** + `loadFailed` (pola Kontak). Simpan **didisable** saat load gagal (cegah menimpa data dgn `DEFAULT_SETTINGS`). |
| **G9** | Tombol **Simpan** di Kontak/SEO/Notifikasi/Lanjutan kini `disabled` bila `!dirty` (+ `!valid`) — tak lagi memicu PUT/revalidate/audit tanpa perubahan. |
| **G10** | Konversi `datetime-local` diperbaiki via `isoToLocalInput`/`localInputToIso` (waktu LOKAL dua arah, round-trip tak bergeser 5 jam) + label "Waktu lokal (zona perangkat Anda)". |
| **G11** | **Validasi klien per-field** (email, WhatsApp lokal/internasional, URL, datetime) dengan `aria-invalid`/`aria-describedby`/`role="alert"` di Kontak/SEO/Lanjutan. Pesan error server kini **menyebut field** (`Field "x": …` + `issues`). |
| **G12** | Media sosial: input **Label** eksplisit (bukan tersembunyi), error per-baris, `aria-label` → bisa diperbaiki dari UI. |
| **G13** | Ringkasan memakai status email dari **sumber yang sama** dengan halaman Notifikasi (`emailHealth`), bukan `integrations.email` → tak kontradiktif. |
| **G14** | Target sentuh naik ke **≥44px**: hapus admin (`h-9→h-11`), refresh Pembayaran & Integrasi (`h-9→h-11`). |
| **G25** (bonus) | "Informasi Sistem" (Lanjutan) kini berisi info NYATA: status maintenance, ETA (lokal), lingkungan, brand — bukan data kontak. |

**Berkas baru:** `src/lib/settings-form-pure.ts`, `scripts/settings-form-pure.test.ts`
(+ `test:settings-form`).
**Berkas diubah:** 8 komponen `src/components/admin/settings/*` (kontak, seo,
notifikasi, lanjutan, overview, keamanan, pembayaran, integrasi),
`src/app/api/admin/settings/route.ts`, `tsconfig.json`, `package.json`.

**Sisa (belum):** Fase **P3–P4** (G20–G24, G26–G30).
**Langkah manual:** uji browser — (1) isi email/URL salah → tanda merah + Simpan mati;
(2) set ETA maintenance lalu muat ulang → jam tak bergeser; (3) buka halaman dgn
network dimatikan → banner error + Simpan mati.

---

## 9. ✅ Hasil Eksekusi FASE P3 (2026-10-11)

**Status: ✅ SELESAI (kode).** Gate: `tsc` ✅ · `eslint` ✅ · semua `test:*` ✅ · `build` ✅ (81 halaman).

| Gap | Solusi |
| --- | --- |
| **G20** | **Satu sumber sub-menu**: `SETTINGS_NAV` (`settings-nav.ts`) kini sumber tunggal. `admin-nav.ts` **membangun `children`** Pengaturan darinya (hapus duplikat 9 entri). `settings-overview` juga menurunkan kartu dari `SETTINGS_NAV`. |
| **G21** | Deskripsi nav "Keamanan & Akses" diluruskan → hanya "Kelola daftar admin…" (hapus klaim sesi/rate-limit/maintenance yang tak ada di halaman itu). |
| **G22** | Label kartu Ringkasan = **judul halaman** (`entry.title`): "Pembayaran & Mayar", "Lanjutan & Sistem" (bukan lagi "Pembayaran (Mayar)"/"Sistem"). |
| **G23** | Komponen UI bersama baru **`settings-form-ui.tsx`**: `fieldClass`/`fieldErrorClass`, `FormErrorBanner`, `SaveRow` (Simpan + badge "Tersimpan" `aria-live`), `FormSection`, `Field`. Dipakai di kontak/seo/notifikasi/lanjutan (hapus duplikasi banner + tombol + kelas field). |
| **G24** | Overview: state **error nyata** + tombol **"Coba lagi"** (bukan `ok:true` hardcoded / "memuat…" palsu). |
| **G26** | `SettingsShell` slug tak dikenal → **`notFound()`** (bukan fallback diam-diam ke "Ringkasan"). |
| **G27** | a11y: ikon status overview ber-`sr-only` ("Siap"/"Perlu perhatian"); tombol uji ber-`aria-label` per layanan; badge "Tersimpan" `aria-live`; **`ConfirmDialog` focus-trap** (Tab/Shift+Tab siklus, sebelumnya bocor). |
| **G28** | Integrasi: tombol "Uji koneksi" **disabled bila layanan belum terkonfigurasi** (dengan tooltip) & hanya tombol yang diuji menampilkan spinner (`testing !== null` → `busy`); **cron/download/webhook** jadi **baris status visual** (bukan hanya teks catatan). |
| **G29** | Backup: alur **dua tahap** — panel pratinjau (non-modal) → tombol "Pulihkan sekarang" → **dialog konfirmasi**. Dialog & pratinjau tak lagi tampil bersamaan; `pending`/`dryRun`/`confirmOpen` dibersihkan bersama (`closePending`). |
| **G30** | `/maintenance`: `generateMetadata()` **dinamis** (judul ikut `maintenance.title`); `<img>` ber-**dimensi eksplisit** (anti-CLS); ETA diberi label **"WIB"**. |

**Berkas baru:** `src/components/admin/settings/settings-form-ui.tsx`.
**Berkas diubah:** `src/lib/settings-nav.ts` (sumber tunggal + `findSettingsNav`),
`src/lib/admin-nav.ts` (children dari SETTINGS_NAV), `settings-shell.tsx` (`notFound`),
`settings-overview.tsx` (kartu dari SETTINGS_NAV + error state), `settings-form-ui.tsx`
(dipakai), `settings-kontak.tsx`, `settings-seo.tsx`, `settings-notifikasi.tsx`,
`settings-lanjutan.tsx`, `settings-integrasi.tsx`, `settings-backup.tsx`,
`confirm-dialog.tsx`, `src/app/maintenance/page.tsx`.

**Sisa:** Fase **P4** (QA & rilis): gate penuh + uji browser + dokumentasi + commit.
**Langkah manual:** uji browser — sub-menu sidebar konsisten, kartu ringkasan label
benar, dialog backup tak dobel, uji koneksi tereksekusi/disabled sesuai status, Tab
terperangkap di dialog, halaman maintenance judul dinamis + ETA "WIB".
