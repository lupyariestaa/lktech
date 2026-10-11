# Perencanaan — Sistem Pengaturan (Settings) Super Proper & Terintegrasi

> **Status: 📝 RENCANA (belum dieksekusi).** Dokumen perencanaan lengkap untuk
> meng-upgrade **menu Pengaturan** dari **satu halaman** menjadi **pusat pengaturan
> ber-submenu** yang lengkap, aman, dan **benar-benar berfungsi** (bukan UI kosong).
> Disusun: 2026-10-11. **Target: setelah approval pemilik.**
>
> **Keputusan pemilik (sesi ini) sudah dikunci** — lihat §3. Pemilik meminta: submenu
> bersifat **generik** (bisa dipakai menu lain), **multi-admin** (kelola akun admin),
> **backup/restore**, **status+uji integrasi** (bukan menyimpan secret), tanpa
> Toko/pajak/ongkir, tanpa Kupon (sudah ada menu sendiri), tanpa Tema/Tampilan,
> tanpa multi-bahasa.

---

## 0. Ringkasan Eksekutif

**Kondisi sekarang:** menu "Pengaturan" = **1 halaman** (`/admin/settings`) berisi
tiga kartu: *Informasi Kontak*, *Notifikasi Email Pembeli*, *Media Sosial*. Semua
disimpan pada **satu dokumen** `settings/site`. Sidebar hanya mendukung item **datar**
(tanpa submenu).

**Visi:** jadikan Pengaturan sebagai **pusat konfigurasi operasional situs** dengan
**submenu bertingkat** di sidebar (accordion), masing-masing halaman punya fungsi
nyata & terhubung ke sistem (bukan sekadar form). Dilengkapi:
- **Manajemen Admin** (multi-akun, aman),
- **Integrasi & Kesehatan** (Mayar, Resend, Cloudinary, Upstash — status + uji koneksi),
- **Pembayaran/Mayar** (kesehatan + metrik penggunaan),
- **Backup & Restore** (ekspor/impor seluruh pengaturan → JSON),
- **Notifikasi**, **SEO**, **Keamanan & Akses**, **Sistem/Lanjutan** (maintenance, cache),
- **Audit** setiap perubahan.

**Prinsip wajib (non-negotiable):**
1. **Semua fitur harus berfungsi** — dilarang UI/UX kosong. Setiap kontrol terhubung
   ke API → data layer → efek nyata. Bila fitur tidak bisa "benar", **jangan tampilkan**.
2. **Server-authoritative & fail-safe** — validasi di server; tanpa kredensial tetap aman.
3. **Backward-compatible** — data lama (`settings/site`) tetap valid; field baru opsional.
4. **Dokumentasi dulu → kode.** Tiap fase tutup gate `tsc`/`eslint`/semua `test:*`/`build`.
5. **Logika murni teruji** — aturan/validasi baru → fungsi murni + test Node.
6. **A11y & mobile-first** (khusus accordion submenu: keyboard, aria-expanded, dsb).
7. **Keamanan berlapis** untuk aksi sensitif (kelola admin, restore backup).

---

## 1. Kondisi Sekarang (baseline terverifikasi)

### 1.1 Data & tipe
- `src/lib/settings-types.ts` — `SiteSettings`: `email`, `whatsapp`, `location`,
  `socials[]`, `notifyBuyerOnOrder`, `notifyBuyerOnStatus`, `notifyCartReminders`.
- `src/lib/settings.ts` — `getSiteSettings()` (server), `mergeSettings()`,
  `SETTINGS_DOC_ID="site"`; dokumen `settings/{site}`.
- `src/components/settings-provider.tsx` — konteks klien (settings global).
- `src/components/admin/settings-manager.tsx` (384 baris) — form pengaturan (klien).

### 1.2 Guard & keamanan
- `src/lib/admin-guard.ts` — `requireAdmin` memverifikasi ID token Firebase **dan**
  whitelist **`ADMIN_EMAILS` (env)**. **Belum ada admin di DB.**
- `src/lib/env-check.ts` — daftar env wajib/opsional (log saat startup).
- `src/app/api/health/payment/route.ts` — status Mayar/download/email (tanpa rahasia).

### 1.3 Sidebar
- `src/lib/admin-nav.ts` — `ADMIN_NAV` (grup → item datar). **Tanpa `children`.**
- `src/components/admin/sidebar/sidebar-item.tsx` + `sidebar-nav.tsx` + `mobile-drawer.tsx`.
- `matchAdminItem`/`isAdminItemActive` — pencocokan prefix path.

### 1.4 Integrasi yang bisa "dihidupkan" di Pengaturan
| Area | Sumber di kode | Bisa jadi halaman Pengaturan |
| --- | --- | --- |
| Mayar (pembayaran) | `src/lib/mayar.ts`, `api/health/payment` | Kesehatan + metrik |
| Resend (email) | `src/lib/email-*.ts`, `api/admin/email/test` | Notifikasi + uji kirim |
| Cloudinary (media) | `src/lib/cloudinary*.ts` | Status integrasi |
| Upstash (rate-limit) | `src/lib/rate-limit.ts` | Status integrasi |
| Cron | `api/cron/*` (CRON_SECRET) | Status + jadwal |
| Audit | `src/lib/admin-audit.ts` | Riwayat perubahan |

---

## 2. Analisis Peluang (gap "proper")

- **G1 — Menu Pengaturan datar.** Satu halaman menampung semua → sulit dikembangkan;
  perlu **submenu** (accordion) dengan halaman-halaman khusus.
- **G2 — Sidebar belum mendukung submenu.** Perlu ekstensi **generik** `children` di
  `AdminNavItem` + render accordion (dipakai semua menu, bukan hanya Pengaturan).
- **G3 — Belum ada manajemen admin.** Admin = whitelist env → tambah admin harus
  edit env + redeploy. Perlu **kelola admin** dari dashboard (aman).
- **G4 — Integrasi tak terlihat.** Status Mayar/Resend/Cloudinary/Upstash tersebar di
  `health/payment` & log env; belum ada **panel integrasi** dengan uji koneksi.
- **G5 — Pembayaran tanpa metrik.** Belum ada ringkasan **kesehatan & penggunaan Mayar**
  (invoice dibuat, dibayar, kedaluwarsa, mismatch, konversi) — data sudah ada di orders.
- **G6 — Tanpa backup/restore.** Tak ada cara ekspor/impor seluruh pengaturan → risiko
  saat migrasi/multi-admin.
- **G7 — Audit pengaturan minim.** `settings.update` dicatat, tapi belum ditampilkan
  per-halaman; multi-admin butuh jejak jelas.
- **G8 — SEO/situs belum bisa diatur.** `metadata`/`robots`/OG sebagian hardcoded;
  belum ada pengaturan meta default & verifikasi Search Console.
- **G9 — Keamanan/Akses belum tampak.** Daftar admin, sesi, rate-limit, maintenance
  tidak terlihat dalam satu tempat.

---

## 3. Keputusan Pemilik (TERKUNCI)

### 3.1 Navigasi (sidebar)
1. **Accordion** (klik "Pengaturan" → daftar anak muncul di bawah, tetap di sidebar).
2. Submenu = **mekanisme generik** — menu lain bisa punya submenu nanti tanpa membangun ulang.
3. URL anak pakai pola **`/admin/settings/<slug>`**.

### 3.2 Cakupan halaman Pengaturan (final)
| Halaman | Sertakan? | Catatan |
| --- | --- | --- |
| **Kontak & Identitas** | ✅ | email, WhatsApp, lokasi, sosmed, + identitas (nama brand, tagline). |
| **Notifikasi** | ✅ | toggle email pembeli (konfirmasi/status/pengingat), + uji kirim. |
| **Pembayaran (Mayar)** | ✅ (disesuaikan) | **HANYA** kesehatan & metrik Mayar (tanpa ongkir/PPN/rekening). |
| **Integrasi & API** | ✅ | status kredensial + tombol uji (Mayar/Resend/Cloudinary/Upstash/Cron). |
| **SEO & Situs** | ✅ | meta default, OG default, verifikasi Search Console, robots. |
| **Keamanan & Akses** | ✅ | kelola admin, sesi, rate-limit, maintenance. |
| **Backup & Restore** | ✅ | ekspor/impor seluruh pengaturan (JSON), validasi ketat. |
| **Lanjutan/Sistem** | ✅ | maintenance mode, bersihkan cache, info sistem, ekspor audit. |
| **Kelola Admin** | ✅ (di Keamanan & Akses) | tambah/hapus akun Google sebagai admin (aman). |
| ~~Toko & Pembayaran (PPN/ongkir/rekening)~~ | ❌ | tidak relevan (tanpa ongkir/pajak). |
| ~~Kupon & Promo~~ | ❌ | sudah punya menu sendiri — hindari duplikasi. |
| ~~Tampilan/Tema~~ | ❌ | dihindari (landing page dikelola manual). |
| ~~Multi-bahasa~~ | ❌ | tidak perlu. |
| **Pengiriman/Produk** | ⚠️ opsional | hanya bila benar-benar dibutuhkan; tanpa fitur menggantung. |

### 3.3 Keputusan lain
4. **Rahasia (API key)** → **tidak** disimpan/diedit di DB. Dashboard hanya **status
   + uji**. (Env tetap di Vercel.)
5. **Backup/restore** → **ya**, dibuat & terintegrasi penuh.
6. **Audit & riwayat** → **ya** (penting untuk multi-admin).
7. **Multi-bahasa** → tidak.
8. **Improve bebas** selama **tidak ribet dikelola**.

---

## 4. Arsitektur Submenu (Generik)

### 4.1 Model nav (ekstensi `AdminNavItem`)
```ts
export type AdminNavItem = {
  label: string;
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: NavBadgeKind;
  /** Anak menu (accordion). Bila ada, `href` = halaman induk/ringkasan. */
  children?: AdminNavChild[];
};

export type AdminNavChild = {
  label: string;
  title: string;
  href: string; // /admin/settings/<slug>
  icon?: LucideIcon;
};
```
- **Backward-compatible:** item tanpa `children` berperilaku seperti sekarang.
- **Aturan:** item dengan `children` dirender sebagai **accordion** (tombol toggle +
  `aria-expanded` + daftar anak). Bila salah satu anak aktif → induk ditandai aktif &
  accordion **terbuka otomatis**.
- **Rail mode:** klik induk → buka popover anak (atau navigasi ke halaman induk) —
  detail di fase.

### 4.2 Komponen yang diubah/ditambah
- `sidebar-item.tsx` — dukung render accordion (mode expanded) & popover (rail).
- `sidebar-nav.tsx` — teruskan `pathname` untuk auto-expand.
- `mobile-drawer.tsx` — accordion tetap berfungsi di drawer.
- `command-palette.tsx` — daftar **flat** harus menyertakan anak (cari cepat).
- `matchAdminItem` — cocokkan juga anak (untuk judul header & metadata).
- **Baru:** `use-nav-accordion.ts` (state buka/tutup, persist di `localStorage`;
  auto-buka saat anak aktif), `sidebar-accordion-item.tsx` (komponen terpisah).

### 4.3 Aksesibilitas
- Induk accordion: `<button aria-expanded aria-controls>`; daftar anak `role="group"`/`ul`.
- Auto-expand anak aktif; toggle manual disimpan; keyboard (Enter/Space, Arrow).
- `aria-current="page"` pada anak aktif.

---

## 5. Daftar Halaman Anak (final)

| # | Route | Halaman | Fungsi nyata (terintegrasi) |
| --- | --- | --- | --- |
| S0 | `/admin/settings` | **Ringkasan Pengaturan** | Kartu status (kontak, email, Mayar, integrasi, admin) + pintasan. |
| S1 | `/admin/settings/kontak` | **Kontak & Identitas** | email, WhatsApp, lokasi, sosmed, nama brand, tagline → dipakai footer/kontak/WA. |
| S2 | `/admin/settings/notifikasi` | **Notifikasi** | toggle email pembeli + **uji kirim** (pakai `api/admin/email/test`). |
| S3 | `/admin/settings/pembayaran` | **Pembayaran (Mayar)** | kesehatan Mayar + **metrik** (invoice, dibayar, kedaluwarsa, mismatch, konversi). |
| S4 | `/admin/settings/integrasi` | **Integrasi & API** | status Mayar/Resend/Cloudinary/Upstash/Cron + tombol **uji koneksi**. |
| S5 | `/admin/settings/seo` | **SEO & Situs** | meta title/desc default, OG default, Search Console, robots, sitemap link. |
| S6 | `/admin/settings/keamanan` | **Keamanan & Akses** | **kelola admin**, sesi, rate-limit, maintenance mode. |
| S7 | `/admin/settings/backup` | **Backup & Restore** | ekspor JSON semua pengaturan, impor (validasi ketat + konfirmasi). |
| S8 | `/admin/settings/lanjutan` | **Lanjutan/Sistem** | maintenance, bersihkan cache, info build/env, pratinjau audit. |

> Setiap halaman = **route sendiri** + komponen klien sendiri di
> `src/components/admin/settings/*`. Halaman induk `/admin/settings` = ringkasan.

---

## 6. Skema Data & Penyimpanan

### 6.1 Dokumen `settings/site` (diperluas, backward-compatible)
Tambahan field **opsional** (default aman via `mergeSettings`):
```ts
type SiteSettings = {
  // ...existing...
  brandName?: string;
  tagline?: string;
  seo?: { title?: string; description?: string; ogImage?: string; searchConsoleId?: string };
  maintenance?: { enabled?: boolean; message?: string };
  // Pengaturan bisnis ringan (tanpa ongkir/pajak):
  order?: { minPurchase?: number; invoiceTtlMinutes?: number };
};
```

### 6.2 Koleksi baru: `admins/{email}` (Manajemen Admin)
- `{ email, addedBy, addedAtISO, role: "owner" | "admin", name? }`.
- **Owner** = `ADMIN_EMAILS` env (tidak bisa dihapus dari UI) — *root of trust*.
- Guard `requireAdmin` diperluas: **env whitelist OR** dokumen `admins/{email}`
  (aktif). Ini menjaga keamanan: env tetap jalur utama; DB = tambahan.
```ts
// admin-guard.ts (rencana)
async function isAdminEmail(email): Promise<boolean> {
  if (envWhitelist.includes(email)) return true;
  const doc = await db.collection("admins").doc(email).get();
  return doc.exists && doc.get("active") !== false;
}
```

### 6.3 Audit
- Aksi baru di `admin-audit-types.ts`: `admin.add`, `admin.remove`,
  `settings.restore`, `settings.cache_clear`, `settings.maintenance`.

---

## 7. Integrasi & Kesehatan (agar benar-benar berjalan)

### 7.1 Panel Integrasi (S4)
- **Sumber status:** `api/health/payment` diperluas + endpoint `api/admin/integrations`
  (status per layanan: terkonfigurasi?, mode, catatan) — **tanpa** membocorkan nilai.
- **Uji koneksi (server, aman):**
  - **Mayar** → panggil endpoint ringan (mis. get invoice dummy? **tanpa** biaya) /
    cek `isMayarConfigured` + ping. Bila tak ada endpoint aman → tampilkan "terkonfigurasi"
    saja (jangan uji yang berbiaya).
  - **Resend** → **sudah ada** `api/admin/email/test` (kirim email uji ke diri sendiri).
  - **Cloudinary** → cek `isCloudinaryConfigured` (bila ada helper).
  - **Upstash** → cek env; opsi uji `PING`.
  - **Cron** → cek `CRON_SECRET` terisi + tautan endpoint.

### 7.2 Pembayaran/Mayar (S3)
- **Kesehatan:** mode (sandbox/produksi), webhook token set, invoice TTL, status terakhir.
- **Metrik (dari orders, murni & teruji):** jumlah invoice dibuat, dibayar,
  kedaluwarsa, mismatch, konversi pembayaran (reuse `computePaymentConversion`).

---

## 8. Keamanan Multi-Admin (KERAS)

> Pemilik menekankan: **keamanan harus kuat**. Prinsip:

1. **Root of trust tetap ENV (`ADMIN_EMAILS`)** — tidak bisa dihapus dari UI; selalu admin.
2. **Tambah admin (S6):** hanya **owner (env)** boleh menambah/menghapus admin.
3. **Verifikasi email Google terverifikasi** (`email_verified`) sebelum dijadikan admin.
4. **Tidak menyimpan rahasia** di DB (API key tetap env).
5. **Audit wajib** tiap aksi admin (`admin.add`/`admin.remove`/`settings.*`).
6. **Rate-limit** endpoint sensitif (`admins`, `backup/restore`).
7. **Konfirmasi ganda** untuk aksi berisiko (hapus admin, restore backup menimpa data).
8. **Mencegah lockout:** owner env tidak bisa dihapus; minimal 1 admin wajib tersisa.
9. **Fail-closed:** bila Admin SDK tak tersedia → tolak (401/503), jangan longgar.
10. **Backup restore:** validasi schema ketat (zod), tolak field tak dikenal, catat audit,
    dan **snapshot sebelum restore** (bisa dibatalkan).

---

## 9. Backup & Restore (S7)

- **Ekspor:** tombol unduh JSON berisi `{ settings, admins?, meta (versi, waktu, oleh) }`.
  (Rahasia/secret **tidak** diekspor.) 
- **Impor:** unggah JSON → validasi zod ketat → **pratinjau diff** → konfirmasi →
  tulis (transaksional per-dokumen) → audit `settings.restore`.
- **Snapshot otomatis** sebelum restore (disimpan ke `settings/_backup_<ts>`).
- **Logika murni teruji:** `validateSettingsBackup(json)` (parsing, versi, batas).

---

## 10. Flow Task (Fase S0–S9)

> Tiap fase: kerjakan → gate `tsc`/`eslint`/semua `test:*`/`build` → tandai `[x]`.

### Fase S0 — Audit & dokumen (persiapan)
- [ ] Konfirmasi cakupan §3/§5 dengan pemilik.
- [ ] Inventaris ulang berkas (baseline §1) & titik refactor.
- **DoD:** keputusan terkunci; tanpa perubahan kode fungsional.

### Fase S1 — Submenu generik di sidebar (G1, G2)
- [ ] Ekstensi `AdminNavItem.children` (tipe + `matchAdminItem` untuk anak).
- [ ] `use-nav-accordion.ts` (buka/tutup, persist, auto-buka).
- [ ] `sidebar-accordion-item.tsx` + integrasi `sidebar-nav`/`mobile-drawer`/rail/command-palette.
- [ ] A11y (aria-expanded/controls, keyboard) + test logika murni (`nav-children`).
- **DoD:** menu submenu berfungsi; menu lain siap pakai mekanisme ini.

### Fase S2 — Kerangka halaman pengaturan (routing & layout)
- [ ] Struktur `src/app/admin/(dashboard)/settings/*` (induk + 8 anak).
- [ ] Layout bersama `settings-shell` (nav tab samping/anak + breadcrumb) — reuse accordion.
- [ ] `settings-nav` config (satu sumber).
- [ ] Komponen `admin/settings/*` per halaman (kerangka + simpan nyata).
- **DoD:** semua route anak dapat diakses & navigasi konsisten.

### Fase S3 — Kontak & Identitas + Notifikasi (pindah dari halaman lama) (S1, S2)
- [ ] Migrasi form kontak/sosmed ke halaman S1; tambah brand/tagline.
- [ ] Halaman notifikasi S2 (+ tombol **uji kirim** via `api/admin/email/test`).
- [ ] `mergeSettings` menangani field baru; API `settings` dukung.
- **DoD:** data lama tetap; field baru tersimpan & berefek.

### Fase S4 — Keamanan & Akses + Kelola Admin (G3) **KRITIS**
- [ ] Data layer `admins.ts` (`listAdmins`, `addAdmin`, `removeAdmin`, `isAdminEmail`).
- [ ] Perluas `admin-guard.requireAdmin` (env OR DB).
- [ ] API `api/admin/admins` (GET/POST/DELETE) + rate-limit + audit + guard owner.
- [ ] Halaman S6: daftar admin, tambah (email Google), hapus (konfirmasi, cegah lockout).
- [ ] Test murni (`admin-rbac-pure`) + uji perilaku guard.
- **DoD:** admin tambahan benar-benar bisa login sebagai admin; owner aman; teraudit.

### Fase S5 — Integrasi & API + Pembayaran/Mayar (G4, G5) (S3, S4)
- [ ] `api/admin/integrations` (status per layanan, tanpa rahasia).
- [ ] Uji koneksi aman (Resend=ada; mayar/cloudinary/upstash/cron sesuai kemampuan).
- [ ] Halaman S3 (kesehatan + metrik Mayar) & S4 (integrasi).
- [ ] Metrik murni `computePaymentMetrics` + test.
- **DoD:** status akurat; uji berfungsi; metrik dari data nyata.

### Fase S6 — SEO & Situs + Lanjutan/Sistem (G8)
- [ ] Halaman S5 (meta/OG/Search Console/robots) + integrasi ke `metadata`.
- [ ] Halaman S8 (maintenance mode, bersihkan cache, info sistem).
- [ ] `mergeSettings` + efek nyata (maintenance → halaman/blokir, cache → invalidate).
- **DoD:** pengaturan SEO dipakai; maintenance benar-benar bekerja.

### Fase S7 — Backup & Restore (G6) (S7)
- [ ] `admin-api`/`backup.ts`: ekspor JSON; impor + validasi zod + snapshot.
- [ ] Halaman S7 (unduh, unggah, pratinjau, konfirmasi).
- [ ] Test murni `validateSettingsBackup`.
- **DoD:** ekspor/impor bekerja & aman; teraudit.

### Fase S8 — Ringkasan induk + Audit pengaturan (G7)
- [ ] Halaman `/admin/settings` (induk) = kartu status + pintasan anak.
- [ ] Tampilkan riwayat `admin_audit` (filter target `settings/*`) di tiap halaman.
- **DoD:** induk informatif; jejak perubahan terlihat.

### Fase S9 — QA, a11y, docs & rilis
- [ ] Refactor & rapikan; a11y menyeluruh; mobile.
- [ ] Update `docs/README.md`, `TASK-SELANJUTNYA.md`, `firestore.rules` (koleksi `admins`).
- [ ] Gate penuh; commit konvensional; push.
- **DoD:** fitur berfungsi penuh; gate hijau; dokumentasi lengkap.

---

## 11. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
| --- | --- | --- | --- |
| R1 | Submenu mengganggu menu lain | Regresi nav | Ekstensi **opsional** (`children?`); item lama tak berubah; test |
| R2 | Kelola admin melemahkan keamanan | Akses tak sah | Owner=env; email terverifikasi; audit; rate-limit; cegah lockout |
| R3 | Restore backup menimpa data salah | Kehilangan data | Validasi zod + snapshot sebelum restore + konfirmasi ganda |
| R4 | Uji koneksi berbiaya (Mayar) | Biaya | Hanya uji yang **aman/gratis**; selain itu tampilkan status saja |
| R5 | Fitur tampil tapi tak jalan | Pelanggaran prinsip | Setiap kontrol WAJIB punya API+efek; review per fase |
| R6 | Field baru merusak data lama | Error render | Semua field opsional + default di `mergeSettings` |
| R7 | URL anak bentrok | 404 | `matchAdminItem` cocokkan anak (prefix terpanjang) |

---

## 12. Definition of Done (inisiatif)

1. Sidebar mendukung **submenu generik** (accordion) yang bisa dipakai ulang menu lain.
2. Pengaturan = **induk + 8 halaman anak**, tiap halaman **berfungsi penuh** (bukan UI kosong).
3. **Kelola admin** aman (multi-admin, owner=env, teraudit).
4. **Integrasi** menampilkan status + uji aman; **Pembayaran/Mayar** menampilkan kesehatan + metrik.
5. **Backup & Restore** berfungsi, tervalidasi, teraudit.
6. **SEO/Situs** & **Lanjutan/Sistem** mengubah perilaku nyata (metadata, maintenance, cache).
7. Audit tiap perubahan; a11y & mobile OK.
8. `tsc`/`lint`/semua `test:*`/`build` hijau; backward-compatible.

---

## 13. Pertanyaan Terbuka (konfirmasi saat S0)

1. **Uji koneksi Mayar:** cukup "terkonfigurasi + mode" — **[default]** — atau perlu
   ping endpoint aman bila tersedia?
2. **Kelola admin — role:** hanya **owner(env) + admin(DB)** — **[default]** — atau
   perlu role lain (mis. "editor" dengan akses terbatas)?
3. **Hapus admin:** bolehkan owner menghapus dirinya sendiri bila masih ada admin lain —
   **[default: tidak, owner env abadi]**.
4. **Maintenance mode:** menampilkan halaman "sedang pemeliharaan" untuk publik
   (kecuali admin) — **[default: ya]** — atau cukup banner di dashboard?
5. **Bersihkan cache:** tombol invalidate cache internal (summary/stats) — **[default: ya]**.
6. **Pengiriman/Produk (§3.2 opsional):** lewati dulu — **[default]** — atau sertakan
   (mis. low-stock threshold, prefix kode produk)?
7. **Backup:** hanya **pengaturan** — **[default]** — atau termasuk **admin** juga?
8. **Ekspor audit** (CSV) dari halaman Lanjutan — perlu — **[default: ya]**.
9. **Halaman induk `/admin/settings`:** kartu status + pintasan — **[default]** — setuju?
10. **Penamaan menu induk** tetap "Pengaturan" — **[default]** — atau "Setelan"?

---

## 14. Hasil Eksekusi

> _(Diisi setelah eksekusi.)_
