# Audit Dashboard Admin LKTech — Otorisasi, Integritas Data, UX, Performa & Operasional

> **Status:** 📝 **DOKUMEN TEMUAN (audit).** **P0 (ADM-01 & ADM-02) sudah
> diperbaiki 2026-10-21 (commit `a36bf53`); P1A (ADM-06 selesai, ADM-05/07
> sebagian) di commit `69d35b5`; P1B (ADM-04 sebagian) di commit `f8a7950`;
> P1 lain–P3 belum.**
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
test lulus.

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
| Build produksi | ✅ Lulus | `npm run build`; 161 halaman statis digenerate; seluruh rute admin dinamis; TypeScript lulus |
| Lint | ✅ Lulus | `npm run lint` (ESLint) tanpa error |
| Unit test | ✅ 593 lulus | `npm run test:unit` |
| Test khusus admin | ✅ 13 lulus | `admin-audit`, `admin-nav`, `admin-dashboard-dynamic` |
| Runtime `/admin` tanpa cookie | ✅ 307 | Redirect ke `/admin/login` |
| Runtime `/api/admin/me` tanpa token | ✅ 401 | Tidak ada kebocoran data |
| Header keamanan runtime | ⚠️ Terbatas | Hanya `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; **tidak ada CSP, X-Frame-Options, frame-ancestors, HSTS** |
| Firestore rules | ✅ Kuat | `firestore.rules:33-35` menolak seluruh baca/tulis langsung klien |
| Harness JSON-LD | 🔴 Berhasil membuktikan XSS | `</script>` tetap mentah pada output JSON |
| Harness backup | 🔴 Berhasil membuktikan eskalasi | `planImport` menerima baris `admins/attacker@example.com` dan memaksa `active:true` |

**Matriks otorisasi (strength):**

- Seluruh route data/mutasi admin memakai `requireAdmin` + Bearer token +
  `email_verified` + pengecekan admin di Firestore.
- Halaman `/admin` memakai proxy (cek cookie), `AdminServerGuard` (verifikasi
  kriptografis cookie), lalu `AuthGuard` (`/api/admin/me`).
- Hanya `POST/DELETE /api/admin/admins` yang memakai `requireOwner`.
- `DELETE /api/admin/session` tetap dapat dipanggil tanpa sesi untuk membersihkan
  cookie; bila Bearer/cookie valid, endpoint mencabut refresh token (ADM-04).
- `firestore.rules` menolak semua akses klien; seluruh data lewat Admin SDK.

**Yang tidak dijalankan:** E2E admin dengan akun nyata, axe/Lighthouse admin,
uji volume produksi, dan eksploitasi ke Firestore produksi. Karena itu dampak
volume dan beberapa perilaku browser ditandai 🟡/⚪ bila relevan.

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

**Bukti:**

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

---

### ADM-04 · 🟠 Tinggi · Sesi 5 hari tidak dapat dicabut; logout hanya menghapus cookie

**Status:** 🟢 Terverifikasi — kode; skenario pencurian cookie tidak disimulasikan
ke produksi.

**Status implementasi (2026-10-22):** 🟡 **Sebagian** — `DELETE /api/admin/session`
kini memverifikasi Bearer ID token (fallback session cookie), memanggil
`revokeRefreshTokens(uid)`, lalu menghapus cookie. Verifikasi cookie & ID token
sudah memakai `checkRevoked = true`, sehingga sesi lama di semua perangkat
langsung ditolak. Label logout diubah menjadi “Keluar (semua perangkat)”.
Idle timeout, absolute timeout lebih pendek, dan re-auth aksi destruktif belum.

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

**Status implementasi (2026-10-21):** 🟡 **Sebagian** — `X-Frame-Options: DENY`,
CSP minimal (`frame-ancestors 'none'`, `base-uri 'self'`, `object-src 'none'`),
dan HSTS produksi sudah terpasang di `next.config.ts`; regression E2E
`e2e/security-headers.spec.ts` lulus. CSP nonce/hash penuh (report-only →
enforce) belum; E2E baru mengunci subset header.

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

**Status implementasi (2026-10-21):** 🟡 **Sebagian** — `POST /api/admin/broadcast`
kini dibatasi per uid (test 10/10 menit; kirim massal 5/10 menit) dan
`testEmail` hanya boleh alamat admin aktif (atau email admin yang login);
`POST /api/admin/email/test` dibatasi 5/10 menit. Idempotency broadcast,
re-auth/step-up, alarm kuota, dan rate-limit aksi destruktif lain belum.

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

**Bukti:**

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

---

### ADM-09 · 🟡 Sedang · Hapus order massal dapat meninggalkan kuota kupon tidak konsisten

**Status:** 🟢 Terverifikasi — kode.

**Bukti:**

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

**Status:** 🟢 Terverifikasi — kode dan label UI.

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

**Rekomendasi:** definisikan status yang dihitung (mis. `dibayar`/`selesai`),
sertakan `paidOrderCount` dan `paidTotal`; tampilkan juga “semua order” bila
perlu. Gunakan agregasi/count yang konsisten dengan metrik resmi.

---

### ADM-11 · 🟡 Sedang · Tidak ada optimistic concurrency; dua admin saling menimpa

**Status:** 🟢 Terverifikasi — kode.

**Bukti:**

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

### ADM-12 · 🟡 Sedang · Restore backup tidak point-in-time, rawan timeout, snapshot berisiko >1 MiB

**Status:** 🟢 Terverifikasi untuk alur merge/loop; 🟡 Dugaan untuk kegagalan
snapshot pada volume produksi (batas dokumen Firestore 1 MiB tidak diuji dengan
data nyata).

**Bukti:**

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

---

### ADM-13 · 🟡 Sedang · Audit log tidak lengkap dan kegagalan pencatatan senyap

**Status:** 🟢 Terverifikasi — kode.

**Bukti:**

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

**Status:** 🟢 Terverifikasi — kode.

**Bukti:**

- `src/app/api/admin/content/route.ts:41-55` memanggil `normalizeSiteContent(body)`
  tanpa Zod/ukuran maksimum.
- `src/lib/site-content.ts:22-30` hanya mengubah tipe; string/array tidak dibatasi
  panjangnya.
- Firestore membatasi 1 MiB per dokumen; payload besar bisa gagal 500 atau
  menghasilkan data yang terpotong secara tak terduga.

**Dampak:** admin (atau tokennya) dapat menyebabkan kegagalan simpan; input yang
salah tipe dinormalisasi diam-diam sehingga admin tidak tahu ada data yang hilang.

**Rekomendasi:** Zod schema + batas panjang string/jumlah item, body size limit,
dan error 400 yang menjelaskan field bermasalah.

---

## 5. Temuan Skala, Performa & Keandalan

### ADM-15 · 🟠 Tinggi · Daftar user: full scan, ringkasan berulang, batas 100 tersembunyi, ekspor parsial

**Status:** 🟢 Terverifikasi untuk alur; 🟡 Dugaan untuk dampak biaya/UX pada
volume besar.

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

**Rekomendasi:** paginasi server (`orderBy(createdAtISO)` + cursor), total count
terpisah, summary di-cache/agregasi, ekspor server mengikuti filter dengan
progres, tampilkan “menampilkan X dari Y” dan tombol muat lagi. Index/pencarian
server-side untuk nama/email/WhatsApp.

---

### ADM-16 · 🟡 Sedang · Lead dimuat seluruhnya; dashboard menggandakan query

**Status:** 🟢 Terverifikasi — kode.

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

**Rekomendasi:** paginasi/filter/count server-side untuk lead; dashboard cukup
memakai summary + 5 terbaru; satukan query summary order/user; cache singkat
dengan invalidasi saat mutasi.

---

### ADM-17 · 🟡 Sedang · Kontrak daftar tidak konsisten: batas tersembunyi & filter audit mengecil

**Status:** 🟢 Terverifikasi — kode.

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

**Rekomendasi:** satu pola paginasi kursor + total count + flag `truncated` untuk
semua daftar; audit memakai `orderBy("atISO","desc")` + cursor; opsi filter audit
berasal dari konstanta aksi, bukan entri yang termuat; hitung ringkasan di server
dengan count/agregasi.

---

### ADM-18 · 🟡 Sedang · Broadcast email sinkron, tanpa idempotency/cursor batch

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

**Status:** 🟢 Terverifikasi — kode.

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

**Status:** 🟢 Terverifikasi — kode.

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

**Status:** 🟢 Terverifikasi — kode.

**Bukti:**

- `src/components/admin/users-manager.tsx:169-174` — input pencarian hanya punya
  placeholder; tidak ada `<label>`/`aria-label`. Placeholder bukan nama aksesibel.
- `src/components/skip-link.tsx:5-12` + `src/app/layout.tsx:147` — skip link
  “Lewati ke konten utama” selalu dirender, menuju `#konten`.
- `src/app/admin/login/page.tsx:19-35` — halaman login tidak memiliki `<main>`
  atau `id="konten"`, sehingga skip link di halaman login tidak punya target.
- `src/components/admin/login-form.tsx:132-137` — pesan error login tidak memakai
  `role="alert"`/`aria-live`, sehingga tidak diumumkan screen reader.
- Belum ada axe/E2E a11y untuk area admin; test E2E hanya halaman publik.

**Dampak:** pengalaman keyboard/screen reader di titik masuk admin kurang baik,
dan regresi a11y tidak tertangkap.

**Rekomendasi:** label/aria-label pada semua input pencarian, `<main id="konten">`
di login, `role="alert"` untuk error, axe pada halaman login/dashboard dengan
akun uji, dan audit kontras/fokus.

---

### ADM-23 · 🔵 Rendah · Unsaved changes tidak dijaga saat logout/back

**Status:** 🟢 Terverifikasi — kode.

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

**Status:** 🟢 Terverifikasi — kode.

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

**Status:** 🟢 Terverifikasi — kode.

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

### ADM-26 · 🟡 Sedang · Tidak ada E2E/integration test admin atau test otorisasi

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
- Seluruh 593 unit test lulus, tetapi tidak menyentuh route admin secara langsung.

**Dampak:** regresi keamanan paling berbahaya tidak akan tertangkap CI. Audit ini
menemukan dua isu kritis yang seharusnya bisa dicegah test murah.

**Rekomendasi:** prioritaskan test murni/cepat (planImport, JSON-LD, CSV,
otorisasi helper), lalu integration test route dengan Firebase Auth emulator/
custom token, lalu E2E admin dengan akun uji dan storage state. Tambahkan matrix
route → role yang diuji.

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

### ADM-28 · 🔵 Rendah · Race slug produk/proyek: POST tidak memeriksa ketersediaan

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

**Status P1:** ADM-06 ✅ selesai; ADM-05 🟡 sebagian (header + CSP minimal;
CSP nonce penuh belum); ADM-07 🟡 sebagian (rate-limit + batas `testEmail`;
idempotency/re-auth belum); ADM-04 🟡 sebagian (revoke saat logout; idle/absolute
timeout + re-auth belum). ADM-03/08/09/12/13 ⏳ belum.

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

### P2 — skala, keandalan, UX inti

- ADM-10 — metrik user hanya order yang valid.
- ADM-11 — version/If-Match untuk settings/content/produk/proyek.
- ADM-15 — paginasi + count + ekspor server untuk user.
- ADM-16 — paginasi lead; dashboard memakai summary.
- ADM-17 — kontrak paginasi/truncated/count seragam; audit orderBy.
- ADM-18 — queue broadcast + idempotency.
- ADM-20 — loading/error/suspense admin.
- ADM-21/22 — focus trap, label, main/skip target, live region.
- ADM-26 — test otorisasi/route/E2E admin.

### P3 — polish & operasional

- ADM-14 — validasi/batas konten.
- ADM-19 — pisahkan provider publik dari admin.
- ADM-23 — guard logout/back.
- ADM-24 — pertahankan `next` saat sesi kedaluwarsa.
- ADM-25 — noindex terpusat.
- ADM-27 — dokumentasi/runbook/copy login.
- ADM-28 — reservasi slug.

---

## 10. Keputusan yang Perlu Diambil Pemilik

1. **Model role:** tetap satu role super-admin (dengan backup/PII hanya OWNER)
   atau buat capability `owner/operations/content/support`?
2. **Hapus user:** benar-benar hapus akun Auth + anonymize data, atau cukup
   “blokir” dan ubah label?
3. **Backup:** siapa yang boleh ekspor/impor? Apakah restore harus point-in-time
   (menghapus dokumen yang tidak ada di backup) atau merge saja?
4. **Retensi audit:** berapa lama disimpan, siapa yang boleh ekspor, dan apakah
   aksi baca PII (mis. membuka detail user) perlu dicatat?
5. **E2E admin:** apakah diizinkan membuat akun uji + data seed di Firebase
   emulator/staging? Ini dibutuhkan untuk test alur nyata.
6. **Analytics:** apakah pageview admin harus dikecualikan sepenuhnya dari
   Vercel Analytics/GA?

---

## 11. Di Luar Cakupan / Belum Diverifikasi

- Audit awal tidak mengubah kode; P0 (ADM-01/02) diimplementasikan setelah audit
  dan diverifikasi pada commit `a36bf53`. P1A (ADM-06 selesai; ADM-05/07 sebagian)
  diimplementasikan pada commit `69d35b5`. P1B (ADM-04 sebagian) di commit
  `f8a7950`; P1 lain–P3 masih berupa dokumentasi.
- E2E admin dengan akun nyata tidak dijalankan karena membutuhkan kredensial dan
  data uji; tidak ada eksploitasi ke Firestore produksi.
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
3. 🟡 **P1A selesai sebagian** (`69d35b5`): ADM-06 ✅; ADM-05/07 🟡.
   **P1B** (`f8a7950`): ADM-04 🟡 (revoke logout selesai; timeout/re-auth belum).
   Lanjutkan CSP nonce/report-only penuh, idempotency/re-auth, timeout, lalu
   ADM-03/08/09/12/13.
4. Setelah P1, lanjut P2 (skala/UX), lalu P3 (polish).
5. Setiap batch wajib menambah test regresi dan memperbarui
   `docs/README.md` + `TASK-SELANJUTNYA.md`.
6. Dokumen audit & status ini sudah di-commit; perbarui status setiap batch.
