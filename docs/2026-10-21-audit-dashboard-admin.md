# Audit Dashboard Admin LKTech — Otorisasi, Integritas Data, UX, Performa & Operasional

> **Status:** 📝 **DOKUMEN TEMUAN + STATUS IMPLEMENTASI.** **P0 (ADM-01 &
> ADM-02) selesai 2026-10-21 (`a36bf53`); P1A (`ADM-06` selesai,
> `ADM-05/07` sebagian) di `69d35b5`; P1B (`ADM-04` revoke logout) di
> `f8a7950`; P1C (ADM-03/04/08/12 + re-auth) selesai **kode** 2026-10-22 di
> `885831c`; P1D (ADM-09/13 selesai, ADM-05/07 sebagian) di `72bd482`;
> **ADM-12 dilanjutkan** dengan UI snapshot + job restore/checkpoint + worker
> cron di `6f8bba1`; P1E harness E2E auth Firebase Emulator di `73a8609`
> (suite kini 9/9; isolasi smoke publik `5b6af93`, 24/24 lulus).
> Verifikasi runtime ber-kredensial kini **terverifikasi di emulator**;
> staging/produksi, popup re-auth Google, dan WebKit masih tertunda.
> Lihat §9 dan §11.**
> **Tanggal:** 2026-10-21
> **Cakupan:** `/admin/**` (33 halaman), 36 route API admin, 80 komponen admin,
> alur login/sesi, guard server & klien, Firestore, audit log, backup/restore,
> broadcast, media, pengguna, pesanan, lead, ulasan, konten, proyek, pengaturan,
> error/loading, aksesibilitas, test, serta dokumentasi operasional.
>
> **Metode:** pembacaan kode menyeluruh, matriks otorisasi route, build produksi,
> lint, seluruh unit test, probe runtime lokal, dan dua harness pembuktian
> (serialisasi JSON-LD dan `planImport` backup).
>
> **Legenda severity:** 🔴 Kritis · 🟠 Tinggi · 🟡 Sedang · 🔵 Rendah.
> **Legenda status:** 🟢 **Terverifikasi** (kode/test/harness/runtime) ·
> 🟡 **Dugaan** (bukti kuat, butuh data/kredensial/volume nyata) ·
> ⚪ **Tidak diverifikasi** (di luar sesi ini).
>
> **Catatan:** bukti & nomor baris di setiap temuan menggambarkan kondisi **sebelum**
> perbaikan P0; status implementasi ada di §9.

---

## 1. Ringkasan Eksekutif

Dashboard admin **sudah kaya fitur dan memiliki fondasi otorisasi yang serius**:
API admin memakai Firebase ID token, halaman `/admin` dijaga dua lapis, dan
Firestore menolak seluruh akses langsung dari klien. Build, lint, dan 593 unit
test lulus saat audit; setelah P1D suite 624 test, P1E 630 test, dan ADM-12
(2026-10-24) menjadi **637 test**.

Namun audit menemukan **28 gap** yang perlu ditangani sebelum dashboard dianggap
aman untuk banyak admin dan data produksi:

| Severity | Jumlah | Fokus utama |
| -------- | -----: | ----------- |
| 🔴 Kritis | 2 | Restore backup melewati batas OWNER; stored XSS di JSON-LD ulasan |
| 🟠 Tinggi | 3 | Model satu role untuk semua admin; sesi tidak dapat dicabut; penskalaan daftar user |
| 🟡 Sedang | 16 | Integritas order/user, audit, backup, rate-limit, paginasi, a11y, test |
| 🔵 Rendah | 7 | Validasi konten, warisan provider publik, unsaved changes, noindex, dokumen |

**Lima risiko teratas:**

1. **ADM-01** — Setiap admin dapat memakai **restore backup** untuk menambah admin
   baru atau mengaktifkan kembali admin yang sudah dicabut. Ini membatalkan
   satu-satunya batas `requireOwner` yang ada.
2. **ADM-02** — Nama pembeli pada ulasan bisa keluar dari `<script type="application/ld+json">`
   dan mengeksekusi JavaScript di halaman produk publik. Jalur yang sama juga
   membocorkan nama lengkap pembeli yang di UI sudah disamarkan.
3. **ADM-03/ADM-04** — Semua admin adalah “super-admin”; sesi 5 hari tidak dapat
   dicabut saat logout. Dampak satu kredensial yang bocor sangat besar.
4. **ADM-08/ADM-09/ADM-10** — “Hapus user” hanya menghapus profil, sedangkan akun
   Auth bisa kembali; hapus order massal bisa meninggalkan kuota kupon bocor;
   metrik “Sudah Pesan”/“Total Belanja” menghitung order yang belum dibayar.
5. **ADM-15/ADM-16/ADM-17** — Daftar user, lead, media, ulasan, dan audit memakai
   pola *fetch-all* atau batas tersembunyi. Admin bisa mengira melihat seluruh
   data padahal hanya sebagian, dan biaya baca Firestore membengkak.

**Kesimpulan:** dashboard **layak dipakai internal saat ini**, tetapi **belum
layak untuk delegasi admin yang lebih luas atau data ribuan dokumen** tanpa
menutup P0 dan P1. P0 sudah ditutup; jangan memperluas delegasi admin
sebelum P1 selesai.

---

## 2. Baseline Verifikasi

| Pemeriksaan | Hasil | Bukti / catatan |
| ----------- | ----- | --------------- |
| Build produksi | ✅ Lulus | `npm run build`; batch emulator menghasilkan 150/150 halaman statis; seluruh rute admin dinamis; TypeScript lulus |
| Lint | ✅ Lulus | `npm run lint` (ESLint) tanpa error |
| Unit test | ✅ 630 lulus (593 saat audit) | `npm run test:unit`; 6 test wiring emulator |
| Test khusus admin | ✅ 13 baseline + suite baru | `admin-audit`, `admin-nav`, `admin-dashboard-dynamic`; P1D menambah `admin-security` 10, `admin-session` 1, `admin-p1` 9, `nav` 9; P1E menambah 6 wiring + 7 E2E auth |
| Runtime `/admin` tanpa cookie | ✅ 307 | Redirect ke `/admin/login` |
| Runtime `/api/admin/me` tanpa token | ✅ 401 | Tidak ada kebocoran data |
| E2E auth emulator | ✅ 7/7 | `npm run test:e2e:auth`; OWNER/ADMIN/user seed, 401/403, OWNER-only, cookie `/admin`, absolute/idle expiry, logout revoke |
| E2E publik | ✅ 24/24 | `npm run test:e2e`; `e2e/auth/**` dikecualikan agar smoke tidak butuh emulator (`5b6af93`) |
| Header keamanan runtime | ⚠️ Terbatas | Hanya `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; **tidak ada CSP, X-Frame-Options, frame-ancestors, HSTS** |
| Firestore rules | ✅ Kuat | `firestore.rules:33-35` menolak seluruh baca/tulis langsung klien |
| Harness JSON-LD | 🔴 Berhasil membuktikan XSS | `</script>` tetap mentah pada output JSON |
| Harness backup | 🔴 Berhasil membuktikan eskalasi | `planImport` menerima baris `admins/attacker@example.com` dan memaksa `active:true` |

> **Status header setelah P1D:** `X-Frame-Options: DENY`, CSP minimal
> (`frame-ancestors`/`base-uri`/`object-src`), dan HSTS produksi sudah
> **enforced**; CSP penuh dikirim sebagai **Report-Only**. Baris baseline di
> atas adalah kondisi saat audit, bukan kondisi sekarang. Lihat ADM-05.
>
> **Verifikasi terkini (2026-10-24, `6f8bba1`):** build bersih **161/161**
> halaman; `test:unit` **637/637**; E2E auth emulator **9/9** (termasuk gate
> snapshot + restore nyata produk); E2E publik **24/24**; `tsc` dan lint lulus.
> Snapshot per sumber tetap dibatasi 5.000 baris dan uji volume produksi belum
> dilakukan.

**Matriks otorisasi (strength):**

- Seluruh route data/mutasi admin memakai `requireAdmin` + Bearer token +
  `email_verified` + pengecekan admin di Firestore.
- Halaman `/admin` memakai proxy (cek cookie), `AdminServerGuard` (verifikasi
  kriptografis cookie), lalu `AuthGuard` (`/api/admin/me`).
- Hanya `POST/DELETE /api/admin/admins` yang memakai `requireOwner`.
- `DELETE /api/admin/session` tetap dapat dipanggil tanpa sesi untuk membersihkan
  cookie; bila Bearer/cookie valid, endpoint mencabut refresh token (ADM-04).
- `firestore.rules` menolak semua akses klien; seluruh data lewat Admin SDK.

**Yang tidak dijalankan:** E2E admin terhadap project staging/produksi nyata,
popup re-auth Google di browser, axe/Lighthouse admin, uji volume produksi, dan
eksploitasi ke Firestore produksi. E2E auth **di emulator** sudah dijalankan
(**9/9**, `73a8609` + ADM-12 `6f8bba1`, termasuk restore nyata); dampak volume
dan beberapa perilaku browser tetap ditandai 🟡/⚪ bila relevan.

---

## 3. Temuan Keamanan & Otorisasi

### ADM-01 · 🔴 Kritis · Restore backup melewati batas OWNER-only

**Status:** 🟢 Terverifikasi — kode + harness `planImport` (tidak dieksekusi ke
Firestore produksi). **✅ Diperbaiki 2026-10-21 (`a36bf53`)** — lihat §9.

**Bukti:**

- `src/app/api/admin/backup/route.ts:64-66` — `POST /api/admin/backup` hanya
  memakai `requireAdmin`.
- `src/lib/backup-pure.ts:7-19` — `admins` adalah salah satu sumber backup.
- `src/lib/backup-pure.ts:164-174` — baris `admins` hanya dilindungi jika
  emailnya OWNER; admin non-owner diterima dan `active` dipaksa `true`.
- `src/lib/backup.ts:22-32` dan `:182-189` — baris `admins` ditulis dengan
  `set(..., { merge: true })`.
- `src/app/api/admin/admins/route.ts:30-31,77-78` — jalur resmi tambah/hapus
  admin memakai `requireOwner`.
- `src/components/admin/settings/settings-backup.tsx:28` — UI memilih **semua**
  sumber, termasuk `admins`, untuk setiap admin.

Harness:

```text
planImport({ data: { admins: [{ _id: "attacker@example.com" }] } }, ["owner@lktech.id"])
→ [{ source: "admins", id: "attacker@example.com", data: { active: true, ... } }]
```

**Dampak:** admin yang ditugaskan (atau tokennya dicuri) dapat:

- menambahkan akun admin baru,
- mengaktifkan kembali admin yang sudah dihapus OWNER,
- mempertahankan akses setelah dicabut, selama masih ada satu admin lain.

Batas “hanya OWNER yang boleh mengelola admin” menjadi tidak bermakna. Ini juga
berarti file backup yang diunduh admin berisi daftar email admin.

**Rekomendasi:**

1. Jadikan `POST /api/admin/backup` **OWNER-only**, atau tolak sumber `admins`
   untuk non-OWNER dan hanya izinkan OWNER mengimpor `admins`.
2. Tambahkan test `planImport` yang memastikan non-OWNER tidak bisa menulis
   `admins`.
3. Setelah P0, terapkan capability matrix (ADM-03) agar backup/PII bukan hak
   semua admin.
4. Audit dan dokumentasikan prosedur pencabutan admin + verifikasi pasca-restore.

---

### ADM-02 · 🔴 Kritis · Stored XSS di JSON-LD ulasan (dan bocor nama lengkap)

**Status:** 🟢 Terverifikasi — pembacaan kode + harness serialisasi.
**✅ Diperbaiki 2026-10-21 (`a36bf53`)** — lihat §9.

**Bukti:**

- `src/lib/order-schema.ts:20-22` — `buyerName` hanya dibatasi 80 karakter;
  karakter `<`, `>`, dan `/` tidak dilarang.
- `src/lib/checkout.ts:223` — nama disimpan apa adanya ke order.
- `src/app/api/products/[slug]/reviews/route.ts:125-134` — nama order disalin
  mentah ke `createReview`.
- `src/lib/structured-data-pure.ts:141-149` — `author.name` memakai
  `r.buyerName` mentah (judul/body memakai `plainText`, author tidak).
- `src/components/json-ld-script.tsx:14-17` — `JSON.stringify(data)` dimasukkan
  lewat `dangerouslySetInnerHTML` tanpa escaping `<`.
- `src/app/produk/[slug]/page.tsx:130-139,204` — node ulasan dirender ke halaman
  produk publik.
- `src/app/api/products/[slug]/reviews/route.ts:13-30` — API publik menyamarkan
  nama (`Budi S.`), tetapi JSON-LD memakai nama lengkap.

Harness:

```text
buyerName: "</script><script>alert(1)</script>"
JSON.stringify(buildReviewNodes(...)) mengandung "</script>" mentah: true
```

**Dampak:** pembeli terverifikasi dapat mengirim nama berisi payload saat
checkout, lalu mengirim ulasan. Setelah admin menyetujui ulasan, payload pecah
dari script JSON-LD dan berjalan sebagai JavaScript di halaman produk publik.
Admin melihat nama itu sebagai teks biasa di UI (React meng-escape), sehingga
risiko lolos moderasi nyata. Jalur ini juga membocorkan nama lengkap pembeli ke
HTML, meskipun UI publik sudah menyamarkannya.

**Rekomendasi:**

1. Escape `<`, `>`, `&`, U+2028, dan U+2029 pada serializer JSON-LD
   (`\u003c`, `\u003e`, `\u0026`, `\u2028`, `\u2029`).
2. Sanitasi/normalisasi `buyerName` sebelum masuk review/JSON-LD; gunakan nama
   tersamar untuk JSON-LD publik.
3. Tambahkan test regresi dengan payload `</script><script>alert(1)</script>`.
4. Pasang CSP sebagai lapisan kedua (ADM-05).

---

### ADM-03 · 🟠 Tinggi · Satu role untuk semua admin (blast radius besar)

**Status:** 🟢 Terverifikasi (desain) — kode dan matriks route.
**Status implementasi (2026-10-22):** ✅ **Selesai (kode) untuk 2 tier**. OWNER
(`ADMIN_EMAILS`) memegang backup/restore, ekspor PII massal, dan kelola admin;
ADMIN (koleksi `admins`) tetap menjalankan operasional harian. Batas ini
ditegakkan di server untuk route sensitif dan di UI untuk menu/aksi. Pemisahan
route baca PII per-field belum dilakukan (lihat sisa risiko).

**Bukti sebelum perbaikan:**

- `src/lib/admins.ts:4-11` — desain eksplisit: satu role `admin`; OWNER hanya
  untuk kelola admin.
- `src/lib/admin-guard.ts:161-179` — `requireOwner` ada, tetapi hanya dipakai
  oleh route `admins`.
- Route yang tetap `requireAdmin` antara lain:
  - backup ekspor/impor (`src/app/api/admin/backup/route.ts:19-23,64-66`),
  - hapus user (`src/app/api/admin/users/route.ts:122-132`),
  - hapus order (`src/app/api/admin/orders/route.ts`),
  - broadcast email (`src/app/api/admin/broadcast/route.ts:59-61`),
  - pengaturan situs (`src/app/api/admin/settings/route.ts`).

**Dampak:** setiap admin—termasuk admin magang/support—dapat mengekspor seluruh
PII (user, order, subscriber, admin), menghapus data, mengirim email massal,
mengubah pengaturan, dan merestore backup. Tidak ada pemisahan tugas, approval
dua orang, atau pembatasan berdasarkan sensitivitas aksi. Jika satu akun admin
dikompromikan, seluruh bisnis terkena.

**Rekomendasi:** buat capability/role minimal:

- `owner` — admin management, backup/restore, secrets/integrations.
- `operations` — order, user, lead, coupon; tanpa backup/PII massal.
- `content` — artikel, produk, proyek, media, konten.
- `support` — baca terbatas, tanpa hapus/broadcast.

Terapkan capability di server (bukan hanya sidebar), dengan test otorisasi per
route.

**Implementasi P1C (2026-10-22):**

- `src/app/api/admin/me/route.ts` mengembalikan `isOwner` + `role`
  (`OWNER`/`ADMIN`); `src/components/admin/admin-access.tsx` menyediakan konteks
  fail-safe (`isOwner: false` bila belum diketahui).
- `src/lib/admin-nav.ts`, `src/lib/settings-nav.ts`, sidebar, command palette, dan
  ringkasan pengaturan menyembunyikan entri `ownerOnly` (backup).
- `GET/POST /api/admin/backup` memakai `requireFreshOwner` (OWNER + re-auth);
  halaman `/admin/settings/backup` melakukan redirect server-side untuk
  non-OWNER.
- Mutasi admin (`POST`/`DELETE /api/admin/admins`) memakai `requireFreshOwner`.
- Ekspor massal di UI (user, lead, subscriber, pemakaian kupon, order) hanya
  dirender untuk OWNER; `GET /api/admin/orders?export=1` menolak non-OWNER (403).
- Aksi destruktif order/broadcast memakai `requireFreshAdmin`/`assertFreshAuth`.

**Sisa risiko:** API daftar/detail admin lain masih `requireAdmin` dan
mengembalikan PII yang memang dibutuhkan operasional; pembatasan per-field dan
pemisahan route baca PII belum selesai. Ekspor user/lead/subscriber/pemakaian
kupon masih berupa **gating UI** (tidak ada endpoint ekspor server), sedangkan
order sudah ditegakkan di server (`export=1`). Uji runtime 403 dengan akun ADMIN
sudah lulus di Firebase Emulator (`e2e/auth/admin-rbac.spec.ts`, `73a8609`);
staging/produksi belum diuji.

---

### ADM-04 · 🟠 Tinggi · Sesi 5 hari tidak dapat dicabut; logout hanya menghapus cookie

**Status:** 🟢 Terverifikasi — kode; skenario pencurian cookie tidak disimulasikan
ke produksi.

**Status implementasi (2026-10-22):** ✅ **Selesai (kode)** untuk kebijakan sesi
12 jam absolut + idle 60 menit + re-auth 10 menit.

- `src/lib/session-constants.ts` — `ADMIN_ABSOLUTE_TIMEOUT_MS` 12 jam,
  `ADMIN_IDLE_TIMEOUT_MS` 60 menit, refresh aktif 5 menit, tick 30 detik,
  jendela re-auth 10 menit.
- `src/lib/session.ts` — cookie sesi berumur 60 menit; verifikasi menolak
  `auth_time` lebih tua dari 12 jam dan tetap memakai `checkRevoked = true`.
- `src/lib/admin-login-cookie.ts` — cookie `__admin_login` bertanda tangan HMAC
  mengikat uid ke jendela login 12 jam; `AdminServerGuard` mewajibkan cookie ini.
- `src/components/admin/use-admin-session-keepalive.ts` — idle 60 menit, refresh
  sesi tiap 5 menit saat aktif, logout paksa saat 401/403 atau idle habis.
- `src/lib/admin-guard.ts` + `src/lib/admin-reauth.ts` — `requireFreshAdmin`/
  `requireFreshOwner` menolak `auth_time` >10 menit dengan `reauth_required`;
  klien memicu popup Google lalu memaksa refresh token.
- Re-auth dipasang pada restore backup, tambah/hapus admin, hapus order
  tunggal/massal, dan broadcast massal.
- `DELETE /api/admin/session` tetap mencabut refresh token semua perangkat dan
  menghapus kedua cookie; label UI “Keluar (semua perangkat)”.

**Catatan migrasi:** sesi lama tanpa cookie `__admin_login` akan diarahkan ke
login. Ini disengaja; pengguna cukup login ulang sekali.

**Verifikasi runtime emulator (2026-10-23, `73a8609`):** absolute timeout 12 jam
(cookie login basi → redirect login), idle expiry (session cookie 1 detik →
redirect), dan logout revoke (Bearer lama → 401) lulus di Firebase Emulator.
**Belum:** popup re-auth Google di browser dan perilaku terhadap project
staging/produksi.

**Bukti:**

- `src/lib/session.ts:8-9` — masa sesi 5 hari.
- `src/lib/session.ts:36-49` — verifikasi memakai `verifySessionCookie(token, true)`.
- `src/lib/session.ts:72-82` — clear hanya mengosongkan cookie.
- `src/app/api/admin/session/route.ts:49-54` — `DELETE` tidak memanggil
  `revokeRefreshTokens`.
- `src/components/admin/admin-shell.tsx:85-89` — logout = clear cookie + Firebase
  client `signOutUser`; tidak ada pencabutan server.
- `src/components/admin/admin-server-guard.tsx:23-34` — data server `/admin`
  diotorisasi hanya oleh cookie.
- `src/components/admin/business-health.tsx:58-62` — KPI server dirender untuk
  pemegang cookie.

**Dampak:** cookie yang tersalin tetap valid sampai 5 hari (kecuali dicabut
manual lewat Firebase Console). Logout di satu perangkat tidak membatalkan sesi
di perangkat lain. Pemegang cookie masih bisa memuat data server (KPI/ringkasan);
data API lain tetap memerlukan Bearer token, tetapi risiko tetap signifikan.
Pencabutan admin di DB memang langsung memblokir `isAdminEmail`—itu baik—tetapi
tidak menggantikan pencabutan sesi.

**Rekomendasi:**

- Endpoint logout server yang memverifikasi Bearer token lalu memanggil
  `revokeRefreshTokens(uid)`; atau session ID/denylist.
- Idle timeout + absolute timeout lebih pendek untuk admin.
- Tombol “keluar dari semua perangkat”.
- Re-authentication untuk aksi destruktif (backup restore, hapus massal,
  broadcast, ubah admin).
- Test: cookie lama harus 401 setelah logout/revoke.

---

### ADM-05 · 🟡 Sedang · Tidak ada CSP, frame-ancestors, X-Frame-Options, atau HSTS di aplikasi

**Status:** 🟢 Terverifikasi — konfigurasi + probe runtime lokal.

**Status implementasi (2026-10-22):** 🟡 **Sebagian** — `X-Frame-Options: DENY`,
CSP minimal (`frame-ancestors 'none'`, `base-uri 'self'`, `object-src 'none'`),
dan HSTS produksi sudah terpasang di `next.config.ts`. **CSP penuh kini dikirim
sebagai `Content-Security-Policy-Report-Only` di produksi** (default-src,
script/style/img/connect/frame/worker, origin Firebase/GA/Sentry/Cloudinary),
dan E2E `e2e/security-headers.spec.ts` mengunci keberadaan header tersebut.
**Enforce belum aktif** karena masih perlu nonce/hash untuk inline script Next
+ JSON-LD dan verifikasi runtime semua origin (editor/media/preview).

**Status implementasi (2026-10-26):** 🟡 **Sebagian (increment aman).**
Kebijakan report-only kini menunjuk `report-uri /api/csp-report`, dan endpoint
publik baru `src/app/api/csp-report/route.ts` mengumpulkan pelanggaran nyata
(muatan dibatasi 32 KB, maks 20 entri, **hanya origin** — path/query/token
dibuang) lalu mencatatnya via `logEvent("csp_violation")`. Tujuannya: langkah
**enforce penuh menjadi berbasis bukti**, bukan tebakan. Parser murni
`src/lib/csp-report-pure.ts` + `test:csp` (6). Enforce penuh **masih** menunggu
nonce/hash + verifikasi runtime; jangan di-*enforce* tanpa bukti tersebut.

**Bukti:**

- `next.config.ts:42-55` hanya memasang `X-Content-Type-Options`,
  `Referrer-Policy`, dan `Permissions-Policy`.
- Probe `GET /admin/login` (200) tidak menemukan `Content-Security-Policy`,
  `X-Frame-Options`, maupun `Strict-Transport-Security`.
- `/admin` (307) juga tidak membawa header proteksi frame.

**Dampak:** dashboard dapat dibingkai (clickjacking), dan tidak ada mitigasi
lapisan kedua bila terjadi XSS seperti ADM-02. Ini bukan pengganti perbaikan
XSS, tetapi kontrol pertahanan yang penting.

**Rekomendasi:** CSP dengan nonce/hash (mulai report-only), `frame-ancestors
'none'`, `X-Frame-Options: DENY`, HSTS, dan test header di CI. Pastikan CSP tidak
memecahkan editor/media/preview.

---

### ADM-06 · 🟡 Sedang · CSV formula injection pada ekspor admin

**Status:** 🟢 Terverifikasi — kode; eksekusi formula di Excel tidak diuji.

**Status implementasi (2026-10-21):** ✅ **Selesai** — util bersama
`src/lib/csv.ts` menetralkan awalan `=`, `+`, `-`, `@`, tab, dan CR/LF dengan
apostrof, tetapi mempertahankan angka murni (termasuk negatif). Semua ekspor
admin (lead, media, user, order, kupon, pemakai kupon, analitik, subscriber)
memakai util ini. Regression `scripts/csv.test.ts` (3 test) masuk `test:unit`.

**Bukti:**

- `src/lib/admin-api.ts:61-65` — `csvCell` hanya mengapit tanda kutip dan
  menggandakan `"`; tidak menetralkan awalan `=`, `+`, `-`, `@`, tab, atau CR.
- Dipakai oleh ekspor lead `src/lib/admin-api.ts:71-98`; nama/pesan lead berasal
  dari formulir publik.
- Pola serupa ada di `admin-orders-api.ts:222`, `admin-users-api.ts:75`,
  `admin-coupons-api.ts:172`, `admin-analytics-api.ts:25`,
  `admin-broadcast-api.ts:81-95`, dan ekspor lain di `admin-api.ts:346`.

**Dampak:** nilai seperti `=HYPERLINK(...)` atau `=cmd|...` dapat dieksekusi
sebagai formula saat admin membuka CSV di Excel/Sheets. Lead adalah input
publik, jadi ini jalur yang realistis.

**Rekomendasi:** satu util CSV bersama; jika nilai dimulai dengan karakter
formula, prefix dengan `'` (atau tab) sebelum quoting; tambahkan test unit.
Pertimbangkan ekspor `.xlsx` dengan sel bertipe teks.

---

### ADM-07 · 🟡 Sedang · Rate-limit sangat jarang; aksi sensitif tanpa re-auth

**Status:** 🟢 Terverifikasi — kode.

**Status implementasi (2026-10-22):** 🟡 **Hampir selesai** — `POST /api/admin/broadcast`
dibatasi per uid (test 10/10 menit; kirim massal 5/10 menit), `testEmail` hanya
boleh alamat admin aktif, dan `POST /api/admin/email/test` dibatasi 5/10 menit.
**Idempotency broadcast** kini memakai reservation `broadcast_requests` sebelum
kirim (replay hasil / tolak request ganda / tandai `indeterminate` bila hasil
tidak pasti), **guard kuota email harian** opt-in (`BROADCAST_DAILY_QUOTA`)
menolak kelebihan + alarm Sentry di 80%, **rate-limit aksi destruktif** per uid
(hapus order/produk/artikel/ulasan/kupon/lead, blokir user), dan **alarm batas
backup** dikirim saat ekspor/impor terpotong atau gagal sebagian. Re-auth aksi
sensitif sudah selesai di P1C. Sisa kecil: kuota backup belum punya angka
provider (hanya alarm batas internal 5.000 baris).

**Status implementasi (2026-10-26):** 🟢 **Angka batas backup kini eksplisit &
terlihat.** Batas ekspor dijadikan satu sumber `EXPORT_CAP` (5.000/sumber) di
`backup-pure.ts`; ekspor mencatat `cap`, `perSourceCounts`, dan `nearLimitSources`
ke `bundle.meta`, memancarkan `logEvent("backup_export")` (tanpa PII), dan
route memberi alarm **peringatan dini** saat ada sumber ≥ 80% batas (belum
terpotong), bukan hanya saat terpotong. Helper murni `assessExportLimits` +
`test:backup` (28). Catatan: backup adalah ekspor Firestore (diunduh), **tidak
ada** kuota "provider" eksternal — batas mengikat adalah `EXPORT_CAP` internal
dan kuota Firestore itu sendiri.

**Bukti:**

- Hanya 4 pemanggilan `checkRateLimit` di seluruh 36 route admin:
  `admins` (`:34`), `integrations/test` (`:18`), dan backup ekspor/impor
  (`backup/route.ts:23,68`).
- `src/app/api/admin/broadcast/route.ts:59-111` — tidak ada rate-limit; aksi
  `test` boleh mengirim ke `testEmail` sembarang (fallback ke email admin).
- `src/app/api/admin/email/test/route.ts:15-37` — tidak ada rate-limit; penerima
  selalu `check.email`, jadi bukan tujuan arbitrer, tetapi tetap bisa dibanjiri.
- Tidak ada langkah re-authentication untuk hapus user/order, restore, broadcast,
  atau perubahan pengaturan.

**Dampak:** token admin yang bocor dapat dipakai untuk spam/phishing, menghabiskan
kuota email, dan membanjiri aksi destruktif. Broadcast test (alamat arbitrer) dan
pengiriman email test berulang adalah vektor reputasi domain yang paling langsung.

**Rekomendasi:** rate-limit per uid + IP + aksi; batasi `testEmail` ke email admin
terverifikasi; idempotency key untuk broadcast; re-auth/step-up untuk aksi
berisiko; alarm saat kuota email/backup mendekati batas.

---

## 4. Temuan Integritas Data & API

### ADM-08 · 🟡 Sedang · “Hapus user” hanya menghapus profil; akun Auth tetap hidup

**Status:** 🟢 Terverifikasi — kode. Perilaku login ulang tidak diuji dengan akun
nyata.
**Status implementasi (2026-10-22):** ✅ **Diputuskan & diimplementasikan —
blokir saja.** `DELETE /api/admin/users` kini mengembalikan `405
user_delete_disabled`; tidak ada penghapusan profil/Auth. UI hanya menyediakan
**Blokir**/**Buka blokir**, dan fungsi `deleteUserProfile`/`deleteUser` dihapus.
Permintaan penghapusan data permanen menunggu kebijakan retensi order
(lihat §10).

**Bukti sebelum perbaikan:**

- `src/app/api/admin/users/route.ts:118-136` — DELETE menghapus profil.
- `src/lib/user-profile.ts:273-283` — hanya `users/{uid}` yang dihapus; tidak ada
  `auth.deleteUser()`.
- `src/components/account-status-provider.tsx:51-58` — membaca profil; profil
  yang hilang tidak otomatis menandai akun diblokir.
- `src/components/auth/user-login-form.tsx:46` dan
  `src/app/api/user/profile/route.ts:35-58` — login dapat membuat/menyimpan
  profil lagi.
- `src/components/admin/users-manager.tsx:426` — copy dialog memang menyebut
  profil, tetapi tombol daftar tetap “Hapus” dan metrik user menghilang.

**Dampak:** user yang “dihapus” dapat login lagi dan membuat profil baru tanpa
flag `blocked`. Admin mengira akun sudah dicabut, padahal hanya datanya
disembunyikan. Order lama tetap menyimpan PII. Ini juga membingungkan untuk
permintaan penghapusan data.

**Rekomendasi:** putuskan semantik:

- **Blokir** — pertahankan profil + `blocked:true`, jangan sebut “hapus”.
- **Hapus akun** — `auth.deleteUser`, revoke token, hapus/anonymize profil dan
  data terkait sesuai kebijakan retensi order.
- Jika profil dihapus tetapi akun dipertahankan, cegah pembuatan ulang otomatis
  dan tampilkan status “akun dinonaktifkan”.

**Implementasi P1C:** opsi **Blokir** dipilih. Endpoint hapus dinonaktifkan
(405), tombol hapus permanen di `users-manager.tsx` dihilangkan, dan copy UI
menjelaskan bahwa blokir mencabut akses tanpa menghapus data. Ini menutup bug
“akun hidup lagi”, tetapi **bukan** pemenuhan permintaan penghapusan data.
Penghapusan akun + retensi/anonymize order tetap backlog keputusan pemilik.

---

### ADM-09 · 🟡 Sedang · Hapus order massal dapat meninggalkan kuota kupon tidak konsisten

**Status:** 🟢 Terverifikasi — kode.

**Status implementasi (2026-10-22):** ✅ **Selesai kode** — hapus order tunggal
dan massal memakai `deleteOrder(id, DELETABLE_STATUSES)` yang menjalankan
**satu transaksi Firestore**: membaca order + kupon/redemption/daily, menghapus
order, dan mengembalikan kuota dalam commit yang sama. Status diperiksa ulang di
dalam transaksi (menutup race), dan audit `order.delete` mencatat
`couponRestored`. Helper `restoreCouponUsageInTransaction` juga memperbaiki
urutan baca/tulis Firestore (semua `tx.get` sebelum `tx.set/delete`).

**Bukti sebelum perbaikan:**

- `src/app/api/admin/orders/route.ts:517-535` — bulk delete: `deleteOrder()` dulu,
  `recordAdminAudit` sukses, baru `restoreCouponUsage()`.
- Jika restore gagal, order sudah hilang; hanya `console.warn` dan `skipped`
  dikembalikan; audit tetap tercatat sebagai `order.delete` tanpa penanda gagal.
- Jalur hapus tunggal memakai urutan sebaliknya: restore dulu, baru hapus
  (`src/app/api/admin/orders/route.ts:757-771`). Ini menghindari kuota bocor bila
  delete gagal, tetapi punya risiko terbalik: restore sukses lalu delete gagal
  membuat kuota kembali untuk order yang masih ada.

**Dampak:** kedua jalur belum atomik. Bulk delete bisa membocorkan kuota permanen;
single delete bisa mengembalikan kuota ganda jika penghapusan gagal setelah restore.
Audit tidak membedakan hasil parsial, sehingga koreksi manual sulit.

**Rekomendasi:** gunakan batch/transaksi atau state machine “deleting” dengan
kompensasi yang bisa di-retry; jangan hanya menyalin urutan salah satu jalur.
Catat `coupon_restore_failed`/`delete_failed` di audit/meta dan tampilkan hasil
parsial yang jelas.

---

### ADM-10 · 🟡 Sedang · “Sudah Pesan” dan “Total Belanja” menghitung order belum bayar/batal

**Status:** ✅ Diperbaiki dan terverifikasi — regression test; belum diuji pada data production.

**Bukti:**

- `src/lib/admin-users.ts:43-56` — agregasi menjumlahkan **semua** dokumen
  `orders` berdasarkan `uid` dan `total`, tanpa filter status/payment.
- `src/components/admin/users-manager.tsx:258-259,304-307` — kolom “Pesanan” dan
  “Total Belanja”.
- `src/components/admin/user-detail-dialog.tsx:74` — total belanja juga menjumlahkan
  semua order.
- `src/components/admin/users-manager.tsx:184-187` — filter “Sudah Pesan” memakai
  `hasOrders` yang berasal dari agregasi yang sama.

**Dampak:** checkout yang ditinggalkan, order kedaluwarsa, dan order batal
terhitung sebagai pembeli/omzet. Angka ini bisa berbeda dari dashboard analitik
yang memakai definisi “completed”, sehingga keputusan support/CRM salah.

**Perbaikan:** `src/lib/admin-users-pure.ts` menyelaraskan status berbayar dengan
`metrics-spec`; daftar, CSV, ringkasan, filter dan detail user memakai
`paidOrderCount`/`paidTotal`; `orderCount` tetap seluruh order.
**Uji:** `scripts/admin-users.test.ts`.

---

### ADM-11 · 🟡 Sedang · ✅ Selesai kode · Tidak ada optimistic concurrency; dua admin saling menimpa

**Status:** 🟢 Terverifikasi — kode (2026-10-27).

**Status implementasi (2026-10-27):**

- Field `version` (token unik, `newVersionToken()` = `crypto.randomUUID`) kini
  disimpan di setiap dokumen yang dapat diedit admin: `settings`, `content`,
  produk, dan proyek.
- Klien mengirim `expectedVersion` (versi yang dimuat terakhir). Server menulis
  di dalam **transaksi Firestore** (`writeVersioned`) dan menolak bila versi
  sudah berubah → `VersionConflictError` → HTTP **409**
  `{ code: "version_conflict", currentVersion }`.
- `expectedVersion` absen/`null` = TANPA pemeriksaan → kompatibel mundur: impor
  backup, seed, dan pemanggil lama tetap boleh menulis.
- GET admin mengembalikan `version`; form/hook menyimpannya dan mengirim balik
  saat simpan; setelah sukses klien menyimpan versi BARU.
- Berkas: `src/lib/optimistic-lock-pure.ts`, `src/lib/optimistic-lock.ts`;
  `src/lib/{settings,site-content,products,projects}.ts`;
  `src/app/api/admin/{settings,content,products,projects}/route.ts`;
  `src/lib/{admin-api,admin-content-api}.ts`; form settings +
  `use-site-content.ts` + `products-manager.tsx`/`projects-manager.tsx`.
- Tes: `npm run test:optimistic-lock` (15) + pembaruan `test:admin-slug` (7);
  unit 932/932; `tsc`, ESLint, dan `next build` lulus.
- **Sisa manual owner:** uji dua-tab admin (buka dokumen yang sama di dua tab,
  simpan di tab A lalu tab B → tab B harus menerima 409 dan diminta muat ulang).

**Bukti (kondisi sebelum perbaikan):**

- `src/app/api/admin/settings/route.ts:88-101` — `.set(..., { merge: true })`
  dengan `updatedAtISO` informasional; tidak ada versi/`If-Match`.
- `src/lib/site-content.ts:288-312` — konten situs disimpan sebagai satu dokumen
  hasil normalisasi; tidak ada versi.
- `src/lib/projects.ts:129-138` dan `src/lib/products.ts:382-436` — merge write.
- Form admin memuat data sekali; tidak ada pencegahan tab lama menimpa tab baru.

**Dampak:** dua admin yang mengedit halaman berbeda bisa saling menghapus
perubahan tanpa peringatan. Konten/settings adalah data yang mahal untuk
direkonstruksi.

**Rekomendasi:** field `version`/`updatedAtISO` yang dikirim balik klien dan
dicek dalam transaksi; kembalikan 409 “data sudah berubah”; tampilkan diff/konflik;
audit before/after untuk perubahan besar.

---

### ADM-12 · 🟡 Sedang · ✅ Selesai kode · Restore backup tidak point-in-time, rawan timeout, snapshot berisiko >1 MiB

**Status:** 🟢 Terverifikasi kode + E2E emulator untuk alur snapshot→job→restore
bertahap; 🟡 Dugaan untuk skala/volume produksi (batas baca 5.000 baris/sumber
dan batas 1 MiB belum diuji dengan data produksi nyata).
**Status implementasi (2026-10-22):** 🟡 **Sebagian** — akses sudah OWNER-only,
restore **merge-only** dipertahankan, dan restore memerlukan re-auth OWNER.
**Snapshot kini dipecah per sumber menjadi chunk <700 KiB** (manifest
`_backup_snapshots/{stamp}` + dokumen chunk), sehingga tidak lagi menulis semua
koleksi ke satu dokumen yang melewati batas 1 MiB. **Impor memakai `WriteBatch`**
(≤400 operasi) dengan fallback per-dokumen bila batch gagal, dan alarm Sentry
dikirim saat batas 5.000 baris terlampaui atau hasil parsial.
**Status implementasi (2026-10-24, `6f8bba1`):** ✅ **Selesai kode** untuk UI
daftar snapshot + restore job bertahap/checkpoint, worker cron, dan resume.
**Sisa:** uji volume produksi, kapasitas snapshot 5.000 baris/sumber (sumber
yang terpotong ditandai `truncated`), belum ada point-in-time/overwrite, retensi
dokumen job belum TTL, dan worker cron bergantung pada `CRON_SECRET` + workflow
yang aktif. Tidak ada klaim point-in-time restore.

**Bukti sebelum perbaikan:**

- `src/lib/backup.ts:149-189` — impor berjalan **berurutan** per dokumen
  (`.set` satu per satu), bukan batch/transaksi; maksimal 5.000 baris
  (`backup-pure.ts:119,216`).
- `src/lib/backup.ts:128-146` — snapshot semua koleksi target ditulis ke **satu
  dokumen** `_backup_snapshots/{stamp}` dengan satu field per koleksi; koleksi order/user
  yang besar hampir pasti melewati batas 1 MiB. Error hanya di-log (best-effort),
  dan `readCollection` juga memotong pada 5.000 baris.
- `src/lib/backup.ts:166-177` — snapshot dibuat sebelum impor, tetapi tidak ada
  UI untuk memulihkan snapshot.
- Impor bersifat merge: dokumen yang dibuat setelah backup **tidak dihapus**,
  jadi ini bukan restore point-in-time.
- `src/app/api/admin/backup/route.ts:94-116` — request menunggu seluruh impor;
  jika function/serverless timeout, hasil parsial dan audit mungkin tidak tercatat.

**Dampak:** restore bisa tampak sukses sebagian, meninggalkan state campuran;
klaim “undo” dari snapshot tidak dapat diandalkan pada data besar. Ini berbahaya
untuk operasi pemulihan insiden.

**Rekomendasi:** jadikan restore sebagai background job dengan batch/commit per
N dokumen, checkpoint/resume, idempotency, progress, dan audit per batch. Pisahkan
mode merge vs overwrite. Simpan snapshot per dokumen atau sebagai file ekspor
terpisah, sediakan UI restore snapshot, dan uji di staging dengan volume realistis.

**Implementasi P1C:** `GET` dan `POST /api/admin/backup` memakai
`requireFreshOwner` (OWNER + re-auth), halaman backup melakukan redirect
server-side, dan entri navigasi/pengaturan disembunyikan untuk ADMIN. Restore
tetap **merge-only**: dokumen di luar backup tidak dihapus. Re-auth Google
diminta sebelum ekspor maupun impor. Keterbatasan timeout/snapshot 1 MiB tetap
seperti di atas.

**Implementasi ADM-12 (2026-10-24, `6f8bba1`):**

- **UI `/admin/settings/backup`** menampilkan maksimal 50 manifest snapshot
  terbaru, jumlah dokumen/chunk/sumber, status **Tidak lengkap** (ada chunk
  gagal) dan **Terpotong** (melewati batas baca), serta dialog konfirmasi.
  Snapshot yang tidak lengkap tidak dapat direstore.
- **Job restore tersimpan** di `_backup_restore_jobs/{uuid}` (metadata progres
  saja; isi baris/PII tidak disalin ke job). Setiap unit memproses **satu sumber
  snapshot pengaman** atau **satu chunk target ≤400 operasi**, lalu menyimpan
  checkpoint `sourceIndex`/`chunkIndex`/`processedUnits`/`written`/`failed`.
  Lock 2 menit mencegah dua worker memproses unit yang sama; retry aman karena
  penulisan tetap merge/idempoten.
- **Snapshot pengaman dibuat lebih dulu**, termasuk `settings/site`, sebelum
  data target ditulis. Snapshot target tetap berasal dari `_backup_snapshots`;
  restore tidak pernah menghapus dokumen di luar snapshot.
- **Otorisasi:** mulai restore = OWNER + `requireFreshOwner` + rate-limit
  3 permintaan/10 menit. Daftar, status, dan langkah job = OWNER; langkah tidak
  mewajibkan ulang fresh-auth agar job panjang tidak terputus, karena job hanya
  dapat dimulai setelah re-auth dan ID job berupa UUID.
- **Resume/background:** UI memanggil langkah berurutan dan menampilkan progres;
  `POST/GET /api/cron/backup-restore` menjalankan worker maksimal 20 unit/20 dtk,
  dijadwalkan tiap 10 menit di `.github/workflows/cron.yml` (fail-closed
  `CRON_SECRET`). Efek akhir (revalidate cache/tag + audit `settings.restore`)
  idempoten lewat `effectsApplied`, dengan sapu efek pending bila proses berhenti
  setelah checkpoint terakhir.
- **Batas jujur:** snapshot per sumber masih dibaca maksimal 5.000 baris dan
  ditandai `truncated`; belum ada pagination penuh, uji volume produksi,
  point-in-time, atau overwrite/delete. Job lama belum punya TTL otomatis.
- **File utama:** `src/lib/backup.ts` (snapshot chunk, `snapshotOneSource`,
  `readSnapshotChunk`, `writeBackupOperations`), `src/lib/backup-restore-pure.ts`
  (validasi manifest/progres), `src/lib/backup-restore.ts` (job/lock/worker),
  `src/app/api/admin/backup/snapshots/route.ts`,
  `src/app/api/admin/backup/snapshots/[jobId]/route.ts`,
  `src/app/api/cron/backup-restore/route.ts`,
  `src/components/admin/settings/settings-backup.tsx`, dan
  `.github/workflows/cron.yml`.

**Bukti/verifikasi ADM-12:** `scripts/backup-restore.test.ts` (7 test manifest,
urutan sumber, deteksi chunk gagal/kosong, progres, wiring), `test:unit`
**637/637**, `test:e2e` publik **24/24**, `test:e2e:auth` **9/9** (termasuk
restore nyata produk di emulator: job selesai dan harga kembali dari 2.000 ke
1.000), `tsc`, lint, dan build bersih **161/161** halaman. Ini verifikasi
emulator, bukan staging/produksi.

---

### ADM-13 · 🟡 Sedang · Audit log tidak lengkap dan kegagalan pencatatan senyap

**Status:** 🟢 Terverifikasi — kode.

**Status implementasi (2026-10-22):** ✅ **Selesai kode** — audit ditambahkan
untuk lead (status/stage/activity/delete), proyek (save/delete), konten situs,
koleksi media, email test (termasuk test broadcast), serta login/logout admin.
Aksi baru punya label + warna badge. Kegagalan `recordAdminAudit` kini dikirim
ke **Sentry** (tag `area=admin-audit`, tanpa actor/target/PII), tidak lagi hanya
`console.error`.

**Bukti sebelum perbaikan:**

- `src/lib/admin-audit-types.ts:22-23,58-59` mendefinisikan `lead.status` dan
  `lead.delete`, tetapi tidak ada pemanggilan `recordAdminAudit` di
  `src/app/api/admin/leads/route.ts`; hanya label yang ada.
- `src/app/api/admin/projects/route.ts` tidak memanggil audit.
- `src/app/api/admin/content/route.ts` tidak memanggil audit.
- `src/lib/admin-audit.ts:30-49` — kegagalan tulis hanya `console.error`; aksi
  tetap dianggap sukses dan tidak ada alert/retry.
- Perubahan media collection/tag, login/logout, dan email test juga tidak masuk
  audit admin.

**Dampak:** tidak semua perubahan bisa direkonstruksi (“siapa mengubah proyek/
konten/lead?”). Filter audit menampilkan aksi yang tidak pernah muncul. Kegagalan
audit tidak terlihat oleh admin/ops.

**Rekomendasi:** pusatkan audit mutasi (middleware/helper per route), tambahkan
tipe `project.*`, `content.update`, gunakan `lead.*` yang sudah ada, catat login/
logout serta aksi media collection; kirim kegagalan audit ke Sentry/monitor dan
sertakan statusnya di respons bila perlu.

---

### ADM-14 · 🔵 Rendah · `PUT /api/admin/content` tanpa skema/batas ukuran

**Status:** ✅ Diperbaiki dan terverifikasi — schema tests; production belum diuji.

**Bukti:**

- `src/app/api/admin/content/route.ts:41-55` memanggil `normalizeSiteContent(body)`
  tanpa Zod/ukuran maksimum.
- `src/lib/site-content.ts:22-30` hanya mengubah tipe; string/array tidak dibatasi
  panjangnya.
- Firestore membatasi 1 MiB per dokumen; payload besar bisa gagal 500 atau
  menghasilkan data yang terpotong secara tak terduga.

**Dampak:** admin (atau tokennya) dapat menyebabkan kegagalan simpan; input yang
salah tipe dinormalisasi diam-diam sehingga admin tidak tahu ada data yang hilang.

**Perbaikan:** `src/lib/site-content-schema.ts` memvalidasi body dengan Zod;
`PUT /api/admin/content` menolak payload di atas 900 KB dan mengembalikan 400
untuk schema invalid / 413 untuk body terlalu besar.
**Uji:** `scripts/site-content-schema.test.ts`.

---

## 5. Temuan Skala, Performa & Keandalan

### ADM-15 · 🟠 Tinggi · Daftar user: full scan, ringkasan berulang, batas 100 tersembunyi, ekspor parsial

**Status:** 🟡 Sebagian diperbaiki dan terverifikasi lewat kode/tests; search
substring tetap dibatasi 5.000 profil dan dampak volume masih dugaan.

**Bukti:**

- `src/lib/admin-users.ts:32-40` — `fetchAllUsers()` membaca **seluruh** koleksi
  `users`.
- `src/lib/admin-users.ts:42-57` — `fetchOrderAggregates()` membaca **seluruh**
  koleksi `orders` (field uid/total).
- `src/lib/admin-users.ts:95-127` — list memanggil kedua scan; filter/pencarian
  dilakukan di memori lalu `slice(0, limit)`.
- `src/lib/admin-users.ts:129-162` — summary memanggil kedua scan lagi.
- `src/app/api/admin/users/route.ts:50-61` — hanya mengembalikan `{ users }`;
  tidak ada total/nextCursor.
- `src/components/admin/users-manager.tsx:33` — UI meminta 100 baris; tidak ada
  tombol “muat lagi”/nomor halaman.
- `src/components/admin/users-manager.tsx:71-77` — setiap pencarian/filter memanggil
  list + summary; kegagalan summary diubah menjadi `null` (stale tanpa pesan).
- `src/components/admin/users-manager.tsx:94-100` — ekspor hanya `users` yang
  sudah dimuat; toast melaporkan jumlah itu tanpa peringatan bahwa total bisa lebih besar.

**Dampak:** setiap pencarian/filter dapat memicu hingga empat pemindaian koleksi
(users + orders untuk list, lalu users + orders lagi untuk summary), dan terus
naik seiring jumlah user/order. Admin tidak tahu bahwa hanya 100 dari total yang
tampil/diekspor, sehingga tindakan massal (blokir/ekspor) bisa salah sasaran.

**Perbaikan:** daftar reguler memakai cursor Firestore dan hanya mengagregasi
order milik uid halaman; UI punya “Muat lebih banyak”; summary cache 60 detik
dan tidak dipanggil ulang tiap pencarian. Pencarian substring dibatasi 5.000
profil yang dipindai; API menandai `truncated`. **Sisa:** daftar reguler Firestore
tidak mengurutkan profil tanpa `createdAtISO`; UI memberi peringatan bila summary
menunjukkan selisih. Ekspor masih hanya baris termuat; backfill/index pencarian
dan uji dataset besar belum dilakukan.

---

### ADM-16 · 🟡 Sedang · Lead dimuat seluruhnya; dashboard menggandakan query

**Status:** 🟡 Sebagian diperbaiki — pagination/list dan agregat dashboard sudah
ada; filter pencarian lead masih lokal pada halaman termuat.

**Bukti:**

- `src/app/api/admin/leads/route.ts:55-88` — `.get()` tanpa limit, seluruh lead
  + activities dikirim ke klien.
- `src/components/admin/leads-manager.tsx:56` — memakai `fetchLeads` (semua).
- `src/components/admin/dashboard-overview.tsx:29-33` — dashboard juga memanggil
  `fetchLeads` hanya untuk 4 angka dan 5 lead terbaru.
- `src/app/api/admin/leads/route.ts:28-53` sudah menyediakan `?summary=1` berbasis
  count, tetapi dashboard tidak memakainya.
- `src/components/admin/business-health.tsx:61-62` memanggil order summary
  server-side; `OrderSnapshot`/`UserSnapshot` juga memanggil summary serupa dari
  klien (`dashboard-overview.tsx:254,320`).

**Dampak:** response lead bisa sangat besar, memperlambat dashboard, dan
menghabiskan kuota baca. Data lead berisi PII dan activities; mengirim semuanya
setiap kali dashboard dibuka tidak perlu.

**Perbaikan:** `GET /api/admin/leads` mengembalikan 50 lead dengan cursor;
`LeadsManager` memuat halaman berikutnya. Dashboard meminta 5 lead terbaru dan
summary count/trend melalui query agregat Firestore paralel.
**Sisa:** pencarian/filter dan ekspor masih terbatas pada lead yang dimuat; UI
menyatakan batas itu dan tombol muat berikutnya tetap tersedia. Summary lead
menjalankan count per hari/status tanpa cache.

**Bukti implementasi:** `src/app/api/admin/leads/route.ts` memakai cursor dokumen
dan `createdAtISO` bersama document ID sebagai tie-breaker; `src/components/admin/leads-manager.tsx`
memuat halaman berikutnya dan memberi label batas pencarian/ekspor; dashboard
meminta `summary=1&trend=1`, sedangkan badge memakai summary count saja.

---

### ADM-17 · 🟡 Sedang · Kontrak daftar tidak konsisten: batas tersembunyi & filter audit mengecil

**Status:** 🟡 Sebagian diperbaiki — agregat ulasan dan urutan audit dibenahi;
subscriber/media masih perlu paging/flag batas.

**Bukti:**

- Ulasan: `src/lib/reviews.ts:141-151` mengambil maksimal 500 lalu memfilter di
  memori; `getReviewsSummary()` (`:163-164`) menghitung total/avg dari 500 itu,
  sehingga statistik salah setelah >500 ulasan.
- Audit: `src/lib/admin-audit.ts:66` mengambil `.limit(1000)` **tanpa orderBy**,
  lalu sort di memori (`:82`). Setelah >1.000 event, event terbaru bisa tidak
  termasuk. UI hanya meminta 300 (`audit-log-manager.tsx:49`) dan menghitung opsi
  filter dari entri yang termuat (`:76-79`), sehingga dropdown mengecil saat
  filter aktif.
- Subscriber: `src/lib/newsletter.ts:30,94` memakai `SCAN_CAP = 10000` dan tidak
  menandai pemotongan; panel hanya menampilkan “X dari Y” dari data yang termuat.
- Media: `src/lib/media.ts:103-127` membaca seluruh dokumen media sebelum
  memfilter/melakukan paginasi di memori.

**Dampak:** admin dapat melihat angka “total” yang salah, kehilangan event audit
terbaru, atau mengira daftar sudah lengkap. Filter audit juga berubah-ubah
sehingga sulit dipakai untuk investigasi.

**Perbaikan:** summary ulasan memakai Firestore count/average aggregate; audit
memakai `orderBy("atISO", "desc")` dan opsi filter stabil.
**Sisa:** paging/penanda pemotongan subscriber dan media masih terbuka; filter
audit per aksi tetap dibatasi 1.000 dokumen.

---

### ADM-18 · 🟡 Sedang · ✅ Selesai kode · Broadcast email sinkron, tanpa idempotency/cursor batch

**Status:** 🟢 Terverifikasi untuk desain; 🟡 Dugaan untuk timeout aktual
tergantung platform.

**Bukti:**

- `src/lib/email-broadcast.ts:23-24,159-182` — maksimal 200 email per request,
  dikirim **berurutan** dengan `await` per penerima.
- Komentar `:139-142` mengakui: jika penerima >200, admin harus “mengirim ulang
  ke segmen yang sama”, dan penerima yang sudah terkirim akan menerima lagi.
- `src/app/api/admin/broadcast/route.ts:116-131` memanggil seluruh proses dalam
  satu request, tanpa idempotency key.
- Tidak ada cursor batch/queue/retry di server.

**Dampak:** kampanye >200 penerima rawan timeout, duplikat email, dan status
parsial yang membingungkan. Resend berulang juga merusak reputasi domain.

**Rekomendasi:** queue/background job + idempotency per `(campaignId,email)`,
cursor batch, status per penerima, retry terbatas, dan tombol “lanjutkan batch”
yang tidak mengirim ulang. Batasi/test di lingkungan Resend yang sesuai.

**Status implementasi (2026-10-27):** ✅ **Selesai (kode) untuk idempotency +
cursor batch + tombol “lanjutkan batch”.**

- Idempotency per-batch sudah ada sejak ADM-07 (`broadcast_requests/{hash}`,
  status `processing`/`completed`/`indeterminate`, key wajib).
- **Cursor batch (ADM-18):** segmen dipecah jadi batch ≤ `BROADCAST_MAX_PER_RUN`
  (200). Kursor berbasis **email** (bukan offset) — batch berikutnya hanya berisi
  email `> kursor`, sehingga penerima yang sudah diproses **tidak pernah dikirim
  ulang** meski daftar berubah. Helper murni `src/lib/broadcast-batch-pure.ts`
  (`nextBroadcastBatch`, `normalizeBroadcastCursor`).
- `resolveSegmentEmails` mengurutkan email naik (kursor stabil); `email-broadcast`
  tak lagi memotong daftar sendiri; route memilih jendela & mengembalikan
  `cursor`/`done`/`remaining`/`total`; klien memakai key baru per batch + tombol
  **“Lanjutkan (sisa N)”** tanpa mengirim ulang. Bucket rate-limit terpisah untuk
  kelanjutan; kuota harian direservasi per batch.
- Tes `npm run test:broadcast-batch` (13): logika murni + wiring.
- **Masih di luar cakupan (backlog):** queue/background job penuh + status per
  penerima (retry otomatis server-side). Increment ini menutup risiko utama
  (duplikat email & status parsial membingungkan) tanpa infrastruktur queue.

---

### ADM-19 · 🔵 Rendah · Admin mewarisi provider publik, analytics, PWA, dan structured data

**Status:** 🟢 Terverifikasi — kode.

**Bukti:**

- `src/app/layout.tsx:3,147-165` memasang `AuthProvider`, `AccountStatusProvider`,
  `WishlistProvider`, `CartProvider`, `CartDraftSync`, `StructuredData`,
  `Analytics`, `GoogleAnalytics`, dan `PwaRegister` untuk semua route.
- `src/components/wishlist-provider.tsx:38-56` memanggil wishlist saat admin login.
- `src/components/account-status-provider.tsx:51-58` memanggil `/api/user/profile`.
- `src/components/cart-draft-sync.tsx:23-67` dapat mengirim draft keranjang dari
  area admin bila admin punya item.
- Service worker memang mem-bypass `/admin` (`public/sw.js:50-58`), jadi bukan
  risiko cache; masalahnya beban/hidrasi dan pencampuran analytics.

**Dampak:** admin pageviews ikut tracker, ada request profil/wishlist yang tidak
perlu, dan bundle/provider publik menambah biaya hidrasi. Tidak ada pemisahan
arsitektur yang jelas antara area publik dan admin.

**Rekomendasi:** route group dengan root layout terpisah untuk admin, atau
kondisional menonaktifkan provider/analytics/PWA/structured data di `/admin`.
Ukur bundle admin sebelum/sesudah.

---

### ADM-20 · 🟡 Sedang · Tidak ada loading/error boundary admin; dashboard menunggu dua query server

**Status:** ✅ Diperbaiki dan terverifikasi — TypeScript, lint, build.

**Bukti:**

- Tidak ada `src/app/admin/**/loading.tsx` atau `error.tsx`; yang ada hanya
  `src/app/loading.tsx` dan `src/app/error.tsx` (tampilan publik, link “Ke Beranda”).
- `src/app/admin/(dashboard)/layout.tsx:20-27` membungkus seluruh dashboard tanpa
  Suspense/error boundary admin.
- `src/components/admin/business-health.tsx:58-62` menunggu
  `getSalesAnalytics()` lalu `getOrdersSummary()` secara berurutan.
- `src/app/admin/(dashboard)/page.tsx` tidak membungkus `BusinessHealth` dengan
  Suspense.

**Dampak:** navigasi ke `/admin` bisa terasa “beku” sampai query server selesai;
jika gagal, admin dilempar ke error publik dan kehilangan konteks/sidebar, bukan
mendapat error yang bisa di-retry di area admin.

**Rekomendasi:** `loading.tsx` dan `error.tsx` khusus dashboard (mempertahankan
shell), Suspense + skeleton untuk `BusinessHealth`, `Promise.all` untuk query
independen, timeout/fallback, dan tombol retry.

---

## 6. Temuan UX & Aksesibilitas

### ADM-21 · 🟡 Sedang · Dialog tidak konsisten mengunci/mengembalikan fokus

**Status:** 🟡 Diperbaiki di dialog admin utama; keyboard/screen-reader E2E belum dijalankan.

**Bukti:**

- `src/components/admin/command-palette.tsx:96-100,125-145,147-171` — fokus input
  dan navigasi panah/Escape ada, tetapi tidak ada focus trap; Tab bisa keluar ke
  background dan fokus tidak dikembalikan ke pemicu.
- `src/components/admin/user-detail-dialog.tsx:65-72,92-103` — hanya Escape;
  tidak ada trap/inert/focus restore.
- `src/components/admin/leads-manager.tsx:427-438` — `role="dialog"`,
  `aria-modal`, tanpa trap.
- `useDrawerFocus` sudah tersedia dan dipakai di drawer, order detail, serta
  batch coupon; tiga dialog di atas belum memakainya.

**Dampak:** pengguna keyboard/screen reader dapat berpindah ke konten di belakang
dialog; setelah menutup, fokus hilang ke `<body>`. `aria-modal` saja tidak
mengubah perilaku fokus browser secara otomatis.

**Rekomendasi:** terapkan `useDrawerFocus` (trap + Escape + restore + inert`
background) ke semua dialog; tambahkan test keyboard.

---

### ADM-22 · 🟡 Sedang · Gap a11y di login dan pencarian user

**Status:** 🟡 Perbaikan kode selesai; audit axe/E2E aksesibilitas masih manual.

**Bukti:**

- `src/components/admin/users-manager.tsx:169-174` — input pencarian hanya punya
  placeholder; tidak ada `<label>`/`aria-label`. Placeholder bukan nama aksesibel.
- `src/components/skip-link.tsx:5-12` + `src/app/layout.tsx:147` — skip link
  “Lewati ke konten utama” selalu dirender, menuju `#konten`.
- `src/app/admin/login/page.tsx:19-35` — halaman login tidak memiliki `<main>`
  atau `id="konten"`, sehingga skip link di halaman login tidak punya target.
- `src/components/admin/login-form.tsx:132-137` — pesan error login tidak memakai
  `role="alert"`/`aria-live`, sehingga tidak diumumkan screen reader.
- Belum ada axe/E2E a11y untuk area admin. E2E auth emulator menguji
  otorisasi/sesi, bukan aksesibilitas.

**Dampak:** pengalaman keyboard/screen reader di titik masuk admin kurang baik,
dan regresi a11y tidak tertangkap.

**Rekomendasi:** label/aria-label pada semua input pencarian, `<main id="konten">`
di login, `role="alert"` untuk error, axe pada halaman login/dashboard dengan
akun uji, dan audit kontras/fokus.

---

### ADM-23 · 🔵 Rendah · Unsaved changes tidak dijaga saat logout/back

**Status:** 🟡 Guard logout/Back ditambahkan; perilaku browser history perlu verifikasi manual.

**Bukti:**

- `src/components/admin/unsaved-changes.tsx:43-64` menangani `beforeunload` dan
  navigasi lewat `requestNavigation` (sidebar), tetapi tidak menangani popstate/
  tombol Back.
- `src/components/admin/admin-shell.tsx:85-89` logout langsung clear + signOut,
  tanpa memeriksa `dirty`.
- Command palette menjalankan logout langsung
  (`src/components/admin/command-palette.tsx:119-122`).

**Dampak:** perubahan form bisa hilang tanpa konfirmasi saat admin logout atau
menekan Back. `beforeunload` hanya menolong saat refresh/tutup tab.

**Rekomendasi:** alihkan logout melalui guard dirty; tangani navigasi history;
test skenario edit → logout/back.

---

### ADM-24 · 🔵 Rendah · Redirect sesi kedaluwarsa kehilangan tujuan awal

**Status:** ✅ Diperbaiki di proxy/server/client guard; deep-link expiry belum diuji production.

**Bukti:**

- `src/proxy.ts:32-34` menyimpan `next` hanya saat cookie tidak ada.
- `src/components/admin/admin-server-guard.tsx:26-33` redirect ke
  `/admin/login` tanpa `next` saat cookie ada tetapi tidak valid/kedaluwarsa.
- `src/components/admin/auth-guard.tsx:23-26` juga redirect tanpa `next`.
- `src/components/admin/login-form.tsx` memakai `redirectTo`; tanpa parameter,
  fallback ke `/admin/leads`.

**Dampak:** admin yang membuka deep link lalu sesinya kedaluwarsa harus mencari
halaman itu lagi setelah login.

**Rekomendasi:** sertakan `next=pathname+search` pada kedua guard (validasi tetap
dengan `isSafeInternalPath`), dan test expiry → login → kembali ke halaman awal.

---

### ADM-25 · 🔵 Rendah · `noindex` admin tidak terpusat

**Status:** ✅ Diperkuat dengan metadata admin dan `X-Robots-Tag`; crawl eksternal belum diverifikasi.

**Bukti:**

- `src/app/layout.tsx:114-123` menetapkan `robots.index = true` global.
- `src/app/robots.ts:10-13` memblokir crawling `/admin`, tetapi itu bukan
  pengganti `noindex`.
- 14 dari 33 `page.tsx` admin tidak punya `robots: { index:false }`, termasuk
  dashboard, login, orders, products, projects, leads, media, dan content.
- Login juga mewarisi metadata default situs.

**Dampak:** mitigasi robots.txt cukup kuat, tetapi halaman admin/login bisa
diindeks bila tautannya ditemukan/di-share; metadata admin tidak konsisten.

**Rekomendasi:** set `robots: { index:false, follow:false }` di layout admin
(atau `X-Robots-Tag`), dan metadata login yang eksplisit. Jangan mengandalkan
robots.txt saja.

---

## 7. Temuan Testing, Dokumentasi & Operasional

### ADM-26 · 🟡 Sedang · ✅ Selesai kode · Tidak ada E2E/integration test admin atau test otorisasi

**Status:** 🟢 Terverifikasi — konfigurasi dan isi test.

**Bukti:**

- `playwright.config.ts:6-8` menyatakan E2E **sengaja tidak menyentuh** alur
  ber-kredensial (admin/checkout).
- E2E yang ada hanya `assets`, `nav`, dan `public-pages`.
- Tiga file test admin berisi 13 test statis: kelengkapan label audit, navigasi,
  dan regex `force-dynamic`/try-catch. Tidak ada test untuk:
  - `requireAdmin`/`requireOwner` per route,
  - `planImport` backup (yang akan langsung menangkap ADM-01),
  - escaping JSON-LD (ADM-02),
  - CSV injection,
  - revoke sesi (ADM-04),
  - hapus user/hapus order massal,
  - batas/paginasi.
- Saat audit, 593 unit test lulus tetapi tidak menyentuh route admin secara
  langsung. P1A–P1D menambahkan test wiring/CSV/backup/SEO/kuota dan E2E
  header/logout; P1E (`73a8609`) + ADM-12 (`6f8bba1`) menambahkan **9 E2E auth
  Firebase Emulator**: `401` tanpa token, `403` user biasa, role ADMIN +
  OWNER-only `403`, role OWNER + gate OWNER-only `400`, session cookie `/admin`,
  absolute timeout, idle expiry (cookie pendek), logout revoke, gate
  snapshot/restore, dan restore nyata. Suite unit kini 637 test.
- **Masih belum:** E2E terhadap project staging/produksi nyata, popup re-auth
  Google di browser, dan matrix seluruh route admin. Jadi ADM-26 belum ditutup
  penuh.

**Dampak:** regresi keamanan paling berbahaya tidak akan tertangkap CI. Audit ini
menemukan dua isu kritis yang seharusnya bisa dicegah test murah.

**Rekomendasi:** prioritaskan test murni/cepat (planImport, JSON-LD, CSV,
otorisasi helper), lalu integration test route dengan Firebase Auth emulator/
custom token, lalu E2E admin dengan akun uji dan storage state. Tambahkan matrix
route → role yang diuji.

**Status implementasi (2026-10-27):** 🟢 **Matrix otorisasi route admin selesai
(statis) — `npm run test:admin-authz` (58 test).**

- **Sweep menyeluruh** (bukan beberapa route tertentu): men-enumerasi SEMUA
  `src/app/api/admin/**/route.ts` (**43 route**) & memverifikasi **setiap** handler
  HTTP (GET/POST/PUT/PATCH/DELETE) mengimpor `@/lib/admin-guard` dan memanggil
  guard otorisasi (`requireAdmin`/`requireOwner`/`requireFreshAdmin`/
  `requireFreshOwner`). Route admin baru tanpa guard → CI **GAGAL** (regresi
  keamanan tertangkap).
- **Matrix route → role:** rute OWNER-only diuji per-handler & diberi penjaga
  anti-downgrade: `backup` (GET/POST `requireFreshOwner`), `backup/snapshots`
  (GET `requireOwner`, POST `requireFreshOwner`), `backup/snapshots/[jobId]`
  (GET/POST `requireOwner`), `admins` (POST/DELETE `requireFreshOwner`). Handler
  OWNER **tidak boleh** memakai `requireAdmin`/`requireFreshAdmin`.
- **Re-auth matrix:** aksi sensitif wajib guard fresh — broadcast POST, orders
  POST/DELETE, backup GET/POST, mulai restore, kelola admin.
- **Exception terdokumentasi & ditest tidak-usang:** `DELETE /api/admin/session`
  (logout) sengaja tanpa guard agar tetap jalan saat token kedaluwarsa; ia hanya
  mencabut sesi milik identitas yang diverifikasi (`resolveLogoutIdentity`).
- Uji ini **tidak menduplikasi** yang sudah ada: planImport (`test:backup`),
  JSON-LD (`test:seo-schema`), CSV injection (`test:csv`), revoke sesi/RBAC
  (`test:admin-security`).
- **Masih di luar cakupan (backlog):** E2E terhadap project staging/produksi
  nyata, popup re-auth Google di browser, dan integration test ber-kredensial
  (Firebase Auth emulator) untuk seluruh matrix. Increment ini menutup celah
  "route tanpa guard lolos CI" tanpa infrastruktur E2E.

---


### ADM-27 · 🔵 Rendah · Dokumentasi admin dan copy login sudah usang

**Status:** 🟢 Terverifikasi — dokumen dan UI.

**Bukti:**

- `docs/ADMIN-SETUP.md:27-34` menyatakan “hanya email di `ADMIN_EMAILS` yang boleh
  mengakses dashboard”; saat ini admin DB (`admins/{email}`) juga bisa.
- `docs/ADMIN-SETUP.md:93-99` meringkas “login tapi email tidak di ADMIN_EMAILS →
  403” dan “admin sah bisa kelola lead”, tidak menjelaskan role, backup, audit,
  sesi, atau admin DB.
- `src/components/admin/login-form.tsx:153-157` menampilkan copy yang sama:
  “Hanya email yang terdaftar di `ADMIN_EMAILS`…”.
- Tidak ada runbook untuk restore backup, pencabutan admin, revoke sesi, retensi
  audit, atau drill pemulihan.

**Dampak:** operator baru salah paham tentang cara memberi akses dan batas
wewenang; prosedur insiden bergantung pada pengetahuan lisan.

**Rekomendasi:** perbarui `ADMIN-SETUP.md`, copy login, dan tambahkan
`docs/ADMIN-OPERATIONS.md` (role matrix, revoke, backup/restore, audit retention,
insiden, environment). Cantumkan pemilik dan langkah verifikasi.

---

## 8. Backlog Rendah Tambahan

### ADM-28 · 🔵 Rendah · ✅ Selesai kode · Race slug produk/proyek: POST tidak memeriksa ketersediaan

**Status:** 🟢 Terverifikasi — kode.

**Bukti:**

- `src/app/api/admin/products/route.ts:65-70` (POST) tidak memanggil
  `isProductSlugTaken`; endpoint cek slug terpisah ada di PUT (`:217-239`).
- `src/app/api/admin/projects/route.ts:59-63` (POST) tidak memanggil
  `isSlugTaken`; endpoint cek slug terpisah ada di PUT (`:129-152`).
- Penyimpanan memakai `.set(..., { merge: true })` pada dokumen ber-slug, sehingga
  race dua tab/admin dapat menimpa data.

**Dampak:** rendah (admin-only), tetapi bisa menimpa produk/proyek tanpa
peringatan.

**Rekomendasi:** bedakan alur create vs update; create memakai transaksi/`create`
untuk mereservasi slug, update memakai `expectedVersion`; test dua request bersamaan.

**Status implementasi (2026-10-27):** ✅ **Selesai (kode) untuk reservasi create.**

- Produk/proyek **baru** disimpan via `create()` atomik Firestore
  (`saveProduct`/`saveProject` menerima `opts.create`) → slug yang sudah ada
  ditolak `SlugTakenError` → route POST membalas **409** `{ code: "slug_taken" }`.
  Pembaruan tetap `set(..., { merge: true })` (backward-compatible).
- Intent create dikirim klien (`src/lib/admin-api.ts` mengirim `create: true` bila
  UI `isNew`; manager produk/proyek meneruskan `{ create: isNew }`).
- Helper murni `src/lib/slug-reserve-pure.ts` (`isAlreadyExistsError` mengenali
  kode `6`/`"already-exists"`/`"ALREADY_EXISTS"`, termasuk lewat `cause`;
  `SlugTakenError`). Fallback: verifikasi eksistensi dokumen bila kode error tak
  dikenali, agar gangguan jaringan tidak salah dilaporkan sebagai slug bentrok.
- Tes `npm run test:admin-slug` (7): logika murni + wiring (create atomik, 409,
  intent klien).
- **Di luar cakupan:** `expectedVersion` (optimistic concurrency) → dilacak di
  **ADM-11**.

---

## 9. Rekomendasi Batch & Urutan Eksekusi

### P0 — sebelum deploy berikutnya (wajib)

| ID | Tindakan | Ukuran |
| -- | -------- | ------ |
| ADM-01 | Batasi restore `admins` ke OWNER; tolak `admins` untuk non-OWNER; test `planImport` (ekspor PII tetap P1/ADM-03) | M |
| ADM-02 | Escape serializer JSON-LD; mask author; test payload XSS | S |
| — | Tambahkan regression test untuk ADM-01/02 ke CI | S |

**Definition of done P0:** non-OWNER mendapat 403 saat mencoba menulis `admins`;
output JSON-LD tidak pernah mengandung `</script>` mentah; nama publik tersamar;
build + test hijau.

### ✅ Status implementasi P0 — selesai (2026-10-21, `a36bf53`)

- **ADM-01** — `POST /api/admin/backup` menolak bundle yang berisi baris `admins`
  dari non-OWNER (403). `planImport` kini fail-closed (`allowAdmins: false` secara
  default), route meneruskan izin hanya untuk OWNER, dan UI berhenti bila dry-run
  mendapat 403. Non-OWNER masih dapat memulihkan sumber non-admin.
- **ADM-02** — `jsonLdString` men-escape `<`, `>`, `&`, U+2028, dan U+2029;
  seluruh renderer JSON-LD memakai serializer ini. `buildReviewNodes` memakai
  `maskBuyerName`, dan API ulasan memakai helper yang sama agar nama lengkap tidak
  bocor.
- **Verifikasi:** `npm run test:backup` 18/18 · `npm run test:seo-schema` 20/20 ·
  `npm run test:unit` 600/600 · `npm run lint` ✅ · `npm run build` ✅ (161 halaman).
- **Belum termasuk P0:** ekspor `admins` untuk non-OWNER, revoke sesi, CSP, dan
  role matrix tetap di P1 (ADM-03/04/05).

### P1 — hardening otorisasi & data (1–2 sprint)

| ID | Tindakan |
| -- | -------- |
| ADM-03 | Capability matrix; pisahkan backup/PII/broadcast/destructive |
| ADM-04 | Revoke sesi saat logout; idle/absolute timeout; re-auth aksi sensitif |
| ADM-05 | CSP report-only → enforce; frame-ancestors/XFO/HSTS |
| ADM-06 | Util CSV aman + test |
| ADM-07 | Rate-limit + batasi testEmail + idempotency broadcast |
| ADM-08 | Putuskan & implementasikan semantik hapus/blokir user |
| ADM-09 | Perbaiki urutan restore kupon + audit kegagalan |
| ADM-12 | Restore sebagai background job/batch; snapshot yang benar |
| ADM-13 | Tutup coverage audit (project/content/lead/media collection) + alert |

**Status P1:** ADM-06 ✅ selesai; ADM-03 ✅ selesai (kode, 2 tier); ADM-04 ✅
selesai (kode, 12 jam + idle 60 menit + re-auth); ADM-08 ✅ selesai (blokir
saja); **ADM-09 ✅ selesai kode (transaksi atomik order+kupon); ADM-13 ✅ selesai
kode (coverage + Sentry); ADM-07 🟡 hampir selesai (idempotency + kuota +
rate-limit destruktif; angka kuota backup belum ada); ADM-05 🟡 sebagian (CSP
penuh report-only; enforce belum); **ADM-12 ✅ selesai kode (snapshot chunk +
batch impor + UI snapshot + job restore/checkpoint/worker `6f8bba1`)**. **P1E
(E2E auth emulator) ✅ 9/9** (7 gate awal + gate snapshot + restore nyata).

### 🟡 Status implementasi P1A — 2026-10-21 (`69d35b5`)

- **ADM-06** — `src/lib/csv.ts` menjadi satu-satunya serializer CSV admin;
  formula prefix dinetralkan, angka murni dipertahankan, dan semua ekspor
  (lead/media/user/order/kupon/pemakai kupon/analitik/subscriber) memakai util ini.
- **ADM-05** — `X-Frame-Options: DENY`, CSP minimal (`frame-ancestors`,
  `base-uri`, `object-src`), dan HSTS produksi (`max-age=31536000;
  includeSubDomains`) ditambahkan. E2E header lulus; CSP nonce/report-only
  penuh tetap pekerjaan P1.
- **ADM-07** — rate-limit broadcast per uid (test 10/10 menit, kirim 5/10 menit),
  `testEmail` dibatasi ke admin aktif, dan email test 5/10 menit. Re-auth,
  idempotency, alarm kuota, dan rate-limit aksi destruktif lain belum.
- **Verifikasi:** `npm run test:csv` 3/3 · `npm run test:unit` 603/603 ·
  `npm run lint` ✅ · `npm run build` ✅ · E2E `security-headers` 1/1 ✅.

### 🟡 Status implementasi P1B — 2026-10-22 (`f8a7950`)

- **ADM-04** — logout admin kini memanggil `revokeRefreshTokens(uid)` di server
  setelah memverifikasi Bearer ID token (fallback session cookie). Cookie tetap
  dihapus meski pencabutan gagal; respons memuat `revoked` untuk observability.
  `verifyIdToken`/`verifySessionCookie` memakai `checkRevoked = true`, jadi ID
  token & cookie lama di semua perangkat langsung ditolak. Label UI menjadi
  “Keluar (semua perangkat)”.
- **Belum:** idle/absolute timeout lebih pendek dan re-auth/step-up untuk aksi
  destruktif. Uji runtime “cookie lama → 401” dengan akun admin nyata masih
  terblokir kredensial; yang otomatis diuji adalah wiring + logout tanpa sesi.
- **Verifikasi:** `npm run test:admin-session` 1/1 · `npm run test:unit` 604/604 ·
  `npm run lint` ✅ · `npm run build` ✅ (161/161 halaman) · E2E
  `admin-session` + `security-headers` 2/2 ✅.

### ✅ Status implementasi P1C — 2026-10-22 (`885831c`)

- **ADM-03** — model 2 tier `OWNER`/`ADMIN`; `/api/admin/me` mengembalikan
  `isOwner`/`role`; menu, command palette, dan ringkasan pengaturan menyembunyikan
  entri OWNER-only; backup, ekspor PII massal, dan mutasi admin ditegakkan di
  server.
- **ADM-04** — absolute timeout 12 jam (`auth_time` + cookie login bertanda
  tangan), idle timeout 60 menit, refresh aktif 5 menit, re-auth 10 menit untuk
  restore backup/kelola admin/hapus order/broadcast, dan revoke logout tetap
  aktif. Sesi lama tanpa `__admin_login` diarahkan login ulang (disengaja).
- **ADM-08** — hapus user dinonaktifkan (405); UI hanya blokir/buka blokir.
- **ADM-12 (saat P1C)** — backup ekspor/impor OWNER-only + fresh auth; restore
  tetap merge-only. Background job/snapshot per dokumen belum saat itu; ✅
  dilanjutkan di `6f8bba1` (lihat §ADM-12).
- **Verifikasi otomatis:** `npm run test:admin-security` 10/10 ·
  `npm run test:nav` 9/9 · `npm run test:admin-session` 1/1 ·
  `npm run test:unit` 615/615 · `npm run lint` ✅ · `npm run build` ✅
  (161/161 halaman) · E2E `admin-session` + `security-headers` 2/2 ✅.
- **E2E emulator (P1E, `73a8609`):** 403 non-OWNER, OWNER-only, cookie `/admin`,
  absolute/idle expiry, dan logout revoke sudah lulus di Firebase Emulator.
  **Belum:** project staging/produksi nyata dan popup re-auth Google.
- **Sisa P1:** enforce CSP penuh setelah nonce/hash + verifikasi origin
  (ADM-05), angka kuota backup provider (ADM-07), dan verifikasi
  staging/produksi + popup re-auth. ADM-12 sudah selesai kode di `6f8bba1`;
  sisanya uji volume produksi/pagination penuh.

### 🟡 Status implementasi P1D — 2026-10-22 (`72bd482`)

- **ADM-09 ✅** — `deleteOrder(id, allowedStatuses)` menghapus order dan
  mengembalikan kuota kupon dalam **satu transaksi Firestore**; jalur bulk dan
  tunggal memakai helper yang sama. `restoreCouponUsageInTransaction` membaca
  semua dokumen sebelum menulis, mengembalikan `couponRestored=false` bila
  dokumen kupon sudah tidak ada, dan cache kupon invalidated setelah commit.
  Audit `order.delete` mencatat hasil restore.
- **ADM-13 ✅** — audit coverage ditambah untuk lead (status/stage/activity/
  delete), proyek (save/delete), konten situs, koleksi media, login/logout
  admin, dan email test; tipe aksi + label + aksen UI diperbarui. Kegagalan
  `recordAdminAudit` dikirim ke Sentry (`area=admin-audit`) tanpa PII.
- **ADM-07 🟡** — broadcast massal wajib `Idempotency-Key`; reservation
  `broadcast_requests` mencegah kiriman ganda (replay hasil, konflik body,
  `processing`, dan `indeterminate`). Guard kuota email harian opt-in
  (`BROADCAST_DAILY_QUOTA`) menolak kelebihan + alarm Sentry di 80%; rate-limit
  per uid ditambahkan untuk hapus order/produk/artikel/ulasan/kupon/lead dan
  blokir user. Alarm backup dikirim saat ekspor/impor terpotong atau parsial.
  Sisa: angka kuota backup dari provider belum tersedia (baru alarm batas
  internal 5.000 baris).
- **ADM-05 🟡** — CSP penuh kini dikirim sebagai
  `Content-Security-Policy-Report-Only` di produksi; CSP minimal yang menahan
  clickjacking tetap enforced. Enforce penuh belum karena nonce/hash inline
  Next/JSON-LD dan origin runtime belum diverifikasi.
- **ADM-12 🟡 (saat P1D)** — snapshot dipecah per sumber menjadi chunk <700 KiB
  + manifest `_backup_snapshots/{stamp}`; impor memakai `WriteBatch` ≤400
  operasi dengan fallback per-dokumen. Background worker/checkpoint, UI restore
  snapshot, dan uji volume produksi belum saat itu; ✅ dilanjutkan di
  `6f8bba1` (lihat §ADM-12).
- **Berkas utama:** `src/lib/orders.ts`, `src/lib/coupons.ts`,
  `src/app/api/admin/orders/route.ts`, `src/lib/broadcast-idempotency*.ts`,
  `src/lib/broadcast-quota*.ts`, `src/lib/admin-rate-limit.ts`,
  `src/lib/admin-audit*.ts`, `src/lib/backup.ts`, `src/lib/backup-pure.ts`,
  `next.config.ts`, `scripts/admin-p1.test.ts`.
- **Verifikasi:** `npx tsc --noEmit` ✅ · `npm run lint` ✅ ·
  `npm run test:admin-p1` 9/9 ✅ · `npm run test:unit` 624/624 ✅ ·
  `npm run build` ✅ (161/161 halaman) · E2E `security-headers` +
  `admin-session` 2/2 ✅. E2E ber-kredensial menyusul di P1E.
- **Catatan risiko:** reservation kuota broadcast bersifat konservatif (email
  yang gagal setelah dicoba tetap terhitung); key `processing`/`indeterminate`
  sengaja memblokir kirim ulang otomatis sampai diperiksa manual; `processing`
  yang basi belum punya auto-recovery.

### ✅ Status implementasi P1E — 2026-10-23 (`73a8609`; suite kini 9/9)

Harness E2E auth ber-kredensial memakai **Firebase Emulator** (Auth `9099`,
Firestore `8080`, project `lktech-emulator`) dan akun seed
`owner@lktech.test` / `admin@lktech.test` / `user@lktech.test`.

- **Konfigurasi:** `firebase.json`; `playwright.auth.config.ts`; seed
  fail-closed `scripts/seed-emulator.ts` (menolak berjalan tanpa host emulator);
  fixture bersama `scripts/emulator-fixtures.ts`; cleanup port Windows
  `scripts/cleanup-emulator-ports.mjs`. Smoke publik mengecualikan
  `e2e/auth/**` (`5b6af93`) agar `npm run test:e2e` tidak butuh emulator.
- **Isolasi produksi:** Admin SDK hanya memakai emulator bila
  `ADMIN_USE_FIREBASE_EMULATOR=1` **dan** host emulator di-set. Tidak ada
  fallback otomatis dari `FIRESTORE_EMULATOR_HOST` yang nyasar di produksi.
- **E2E 9/9:** `401` tanpa token; `403` user biasa; ADMIN mendapat role
  `ADMIN` dan ditolak `403` pada aksi OWNER-only; OWNER lolos gate (body kosong
  → `400`); session cookie membuka `/admin`; absolute timeout 12 jam menolak
  cookie login basi; idle expiry menolak session cookie pendek; logout
  mencabut Bearer lama (`401`); gate daftar/mulai snapshot OWNER-only; dan
  **restore nyata di emulator** (job selesai, harga produk kembali 2.000 →
  1.000).
- **Cara jalan:** `npm run build` lalu `npm run test:e2e:auth`. Auth emulator
  memakai REST sign-in, bukan popup Google. `test:e2e:auth` membersihkan proses
  emulator yang tertinggal sebelum run berikutnya.
- **Gate batch ini:** `npx tsc --noEmit` ✅ · `npm run lint` ✅ ·
  `npm run test:unit` 637/637 ✅ · `npm run test:backup` 25/25 ✅ · `npm run
  build` ✅ (build bersih 161/161 halaman statis) · E2E publik 24/24 ✅ ·
  `npm run test:e2e:auth` **9/9** ✅. Saat P1E murni angkanya 630/150/7; angka
  sekarang sudah termasuk ADM-12.
- **Verifikasi perubahan admin 2026-10-24:** `npm run test:unit` 646/646 ✅;
  `test:admin-users` 4/4 ✅; `test:content-schema` 5/5 ✅;
  `test:admin-p1` 9/9 ✅; lint ✅; `npx tsc --noEmit` ✅; build 161/161 ✅
  (SSG selesai; `SITE_URL` memakai fallback `https://lktech.id`). Staging/
  production belum diverifikasi.
- **Batas yang jujur:** ini verifikasi **emulator**, bukan staging/produksi.
  Popup re-auth Google, `AuthGuard` klien dengan login Firebase browser, dan
  WebKit belum diuji. Cookie sesi `Secure` diuji lewat HTTP mentah; cookie idle
  dibuat dengan menulis ulang `exp` karena emulator membatasi umur minimum
  5 menit. Tidak ada klaim bahwa alur Google asli sudah runtime-verified.
- **Tidak menyentuh homepage:** seluruh perubahan P1E hanya test/harness,
  konfigurasi emulator, dan helper Admin SDK; F0–F8 + F6 tidak diubah.

### P2 — skala, keandalan, UX inti

- ✅ ADM-10 — metrik user hanya order berstatus berbayar; regression tests tersedia.
- ✅ ADM-11 — version/expectedVersion (optimistic concurrency) untuk settings/content/produk/proyek; sisa uji dua-tab manual.
- 🟡 ADM-15 — paging user + cached summary; sisa search index/backfill dan ekspor server.
- 🟡 ADM-16 — paging lead + dashboard summary; sisa filter server-side.
- 🟡 ADM-17 — review aggregate + audit order; sisa paging newsletter/media dan filter audit cap.
- 🟡 ADM-18 — idempotency + cursor batch selesai kode (anti-duplikat, tombol “lanjutkan batch”); sisa queue/status per penerima.
- ✅ ADM-20 — loading/error/suspense admin.
- 🟡 ADM-21/22 — focus/label/main/live region diperbaiki; verifikasi aksesibilitas manual masih perlu.
- 🟡 ADM-26 — matrix otorisasi route admin selesai (sweep statis 43 route + role/re-auth); sisa E2E ber-kredensial/staging.

### P3 — polish & operasional

- ✅ ADM-14 — schema Zod dan batas 900 KB; tests tersedia.
- ADM-19 — pisahkan provider publik dari admin.
- 🟡 ADM-23 — guard logout/back; browser history perlu uji.
- ✅ ADM-24 — pertahankan `next` saat sesi kedaluwarsa.
- ✅ ADM-25 — noindex admin + `X-Robots-Tag`; crawl eksternal belum diuji.
- ADM-27 — dokumentasi/runbook/copy login.
- ✅ ADM-28 — reservasi slug (create atomik → 409 `slug_taken`).

---

## 10. Keputusan Pemilik (2026-10-22)

1. **Model role:** ✅ **Opsi A — 2 tier `OWNER` + `ADMIN`.** OWNER =
   `ADMIN_EMAILS`; ADMIN = koleksi `admins`. ADMIN menjalankan operasional harian,
   tetapi tidak boleh kelola admin, backup/restore, ekspor PII massal, atau hapus
   permanen user.
2. **Sesi:** ✅ **Absolute timeout 12 jam + idle timeout 60 menit + re-auth
   Google 10 menit** untuk aksi sensitif. Logout mencabut refresh token semua
   perangkat.
3. **Hapus user:** ✅ **Blokir saja.** Tidak ada penghapusan akun Auth/profil
   permanen pada batch ini; label dan semantik UI diselaraskan. Permintaan
   penghapusan data mengikuti kebijakan retensi order yang belum diputuskan.
4. **Backup:** ✅ **OWNER-only, ekspor/impor; restore merge-only.** Snapshot
   sebelum impor dibuat sebagai chunk <700 KiB + manifest (P1D); ADM-12
   (`6f8bba1`) menambahkan daftar snapshot, restore dari UI, job
   checkpoint/worker, dan resume. Bukan point-in-time; uji volume produksi dan
   pagination penuh masih backlog.
5. **E2E admin:** ✅ **Diizinkan memakai Firebase emulator/staging + akun seed**
   untuk alur ber-kredensial. Emulator + seed sudah dibuat dan suite E2E auth
   **9/9** lulus (`73a8609` + `6f8bba1`); staging/produksi dan popup Google tetap
   pekerjaan lanjutan.
6. **Retensi audit:** ⏳ **Belum diputuskan** — berapa lama disimpan, siapa yang
   boleh ekspor, dan apakah aksi baca PII perlu dicatat.
7. **Analytics admin:** ⏳ **Belum diputuskan** — apakah pageview admin
   dikecualikan sepenuhnya dari Vercel Analytics/GA.

---

## 11. Di Luar Cakupan / Belum Diverifikasi

- Audit awal tidak mengubah kode; P0 (ADM-01/02) diimplementasikan setelah audit
  dan diverifikasi pada commit `a36bf53`. P1A (ADM-06 selesai; ADM-05/07 sebagian)
  diimplementasikan pada commit `69d35b5`. P1B (ADM-04 revoke logout) di commit
  `f8a7950`. P1C (ADM-03/04/08/12 + re-auth) selesai **kode** 2026-10-22 di
  `885831c`. P1D (ADM-09/13 selesai; ADM-05/07/12 sebagian) di `72bd482`.
  ADM-12 dilanjutkan di `6f8bba1` (UI snapshot + job restore/worker). P1E
  (harness E2E auth emulator) di `73a8609`. P2–P3 masih dokumentasi/backlog.
- E2E admin **di Firebase Emulator** sudah dijalankan (suite **9/9**, termasuk
  restore nyata) dengan akun seed OWNER/ADMIN/user. Ini bukan verifikasi
  staging/produksi; popup re-auth Google dan `AuthGuard` klien dengan login
  Firebase browser belum diuji. Tidak ada eksploitasi ke Firestore produksi.
- axe/Lighthouse area admin tidak dijalankan; login terlindungi dan dashboard
  membutuhkan sesi.
- Playwright WebKit masih tertunda karena unduhan timeout; fokus QA browser
  sebelumnya baru Chromium/Firefox.
- Uji volume produksi (ribuan user/order/lead/audit) belum dilakukan; temuan
  skala ditandai sesuai bukti kode.
- Integrasi eksternal (Mayar produksi, Resend domain, GSC) tetap menjadi
  prasyarat manual pemilik dan tidak dinilai ulang di sini.

---

## 12. Langkah Berikutnya

1. Review P1–P3 dan jawab keputusan di §10.
2. ✅ **P0 selesai** (ADM-01/02) pada commit `a36bf53`; jangan regress. Regression
   test sudah masuk suite unit (`test:backup`, `test:seo-schema`, `test:unit`).
3. ✅ **P1A** (`69d35b5`): ADM-06 selesai; ADM-05/07 sebagian. **P1B**
   (`f8a7950`): ADM-04 revoke logout. **P1C** (2026-10-22): ADM-03/04/08/12
   selesai kode + re-auth. **P1D** (`72bd482`): ADM-09/13 selesai; ADM-07
   idempotency + kuota + rate-limit destruktif; ADM-05 CSP report-only penuh;
   ADM-12 snapshot chunk + batch impor. **ADM-12 lengkap** (`6f8bba1`): UI
   snapshot + job restore/checkpoint/worker. **P1E** (`73a8609`): E2E auth
   emulator, suite kini 9/9. Lanjutkan: enforce CSP setelah nonce/hash, angka
   kuota backup, verifikasi staging/produksi, lalu P2.
4. **Runtime emulator ✅:** seed OWNER/ADMIN/user, 401/403 non-OWNER, OWNER-only,
   cookie `/admin`, absolute/idle expiry, logout revoke, gate snapshot, dan
   restore nyata sudah lulus (`npm run test:e2e:auth`, 9/9). **Sisa:** ulangi di
   staging/produksi dan uji popup re-auth Google di browser.
5. Setelah P1, lanjut P2 (skala/UX), lalu P3 (polish).
6. Setiap batch wajib menambah test regresi dan memperbarui
   `docs/README.md` + `TASK-SELANJUTNYA.md`.
7. Dokumen audit & status ini sudah di-commit; perbarui status setiap batch.
