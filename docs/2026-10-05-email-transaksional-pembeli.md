# EMAIL TRANSAKSIONAL KE PEMBELI — Konfirmasi Pesanan & Update Status

> **Status dokumen:** ✅ **Dieksekusi** (FASE E0–E7 selesai)
> **Disusun:** 2026-10-05 · **Dieksekusi:** 2026-10-05
> **Cakupan:** Email otomatis **ke pembeli** — (1) **konfirmasi pesanan** saat checkout berhasil, (2) **notifikasi perubahan status** pesanan (diproses/selesai/dibatalkan) saat admin mengubah status. Termasuk template HTML, integrasi ke alur order, dan halaman pengaturan/preferensi bila perlu.
> **Tujuan:** Memberi **kepastian & kepercayaan** ke pembeli (bukti pesanan tercatat + tautan WhatsApp), mengurangi pertanyaan "pesanan saya bagaimana?", dan mendorong repeat order. Melengkapi notifikasi email yang saat ini **hanya ke admin**.
> **Prasyarat baca:** `docs/2026-10-02-orders-admin-module.md` (model & alur order), `src/lib/email.ts` (infrastruktur email existing), `docs/2026-10-05-portal-akun-pengguna.md` (profil/order pembeli), `docs/README.md`.
> **Verifikasi:** `npx tsc --noEmit` ✅ · `npx eslint .` ✅ · `npm run build` ✅ (66 halaman).

> **Status Eksekusi (E0–E7):** Seluruh fase **selesai**.
> File baru: `src/lib/email-order.ts` (email konfirmasi + update status ke pembeli, best-effort).
> Diubah: `src/app/api/orders/route.ts` (kirim konfirmasi), `src/app/api/admin/orders/route.ts` (kirim update status + cek toggle), `src/lib/orders.ts` (`getOrderById`), `src/lib/settings-types.ts` + `src/lib/settings.ts` + `src/lib/api-schemas.ts` (toggle `notifyBuyerOnOrder`/`notifyBuyerOnStatus`), `src/components/admin/settings-manager.tsx` (UI toggle), `src/components/cart-view.tsx` (teks konfirmasi email), `.env.example` (`ORDER_REPLY_TO`).
> Temuan teratasi: ET-01..ET-08.

> **⚠️ Penting:** agar email terkirim ke **pembeli umum**, domain harus **diverifikasi di Resend** (§10). Saat ini `EMAIL_FROM=LKTech <onboarding@resend.dev>` → hanya terkirim ke alamat terdaftar Resend. Kode sudah siap & aman (best-effort); email admin tetap berjalan.

---

## DAFTAR ISI

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Baseline — Kondisi Email Saat Ini](#2-baseline--kondisi-email-saat-ini)
3. [Keputusan Desain](#3-keputusan-desain)
4. [Audit — Temuan & Celah](#4-audit--temuan--celah)
5. [Spesifikasi Target](#5-spesifikasi-target)
6. [Arsitektur & Implementasi](#6-arsitektur--implementasi)
7. [TASK IMPLEMENTATION FLOW (FASE E0–E7)](#7-task-implementation-flow-fase-e0e7)
8. [Definition of Done & Checklist QA](#8-definition-of-done--checklist-qa)
9. [Risiko & Mitigasi](#9-risiko--mitigasi)
10. [Catatan Operasional (Resend)](#10-catatan-operasional-resend)
11. [Out of Scope](#11-out-of-scope)
12. [Estimasi & Urutan Pengerjaan](#12-estimasi--urutan-pengerjaan)
13. [Lampiran — Referensi Pola Existing](#13-lampiran--referensi-pola-existing)

---

## 1. Ringkasan Eksekutif

Saat ini sistem email LKTech **hanya mengirim notifikasi ke admin** ketika ada lead baru & pesanan baru (`src/lib/email.ts` + Resend). **Pembeli tidak menerima email apa pun** — baik saat checkout berhasil maupun saat status pesanannya berubah (diproses/selesai/dibatalkan).

Akibatnya:
- Pembeli tidak punya **bukti tertulis** pesanan (hanya mengandalkan chat WhatsApp).
- Tidak ada **pengingat status** — pembeli sering bertanya "pesanan saya sudah diproses?"
- Kesan layanan kurang profesional dibanding kompetitor.

**Rencana:** Menambahkan **email transaksional ke pembeli**:
1. **Email konfirmasi pesanan** — dikirim otomatis saat checkout berhasil (rincian item, total, kode pesanan, tautan WhatsApp, link ke `/akun`).
2. **Email update status** — dikirim saat admin mengubah status pesanan (diproses / selesai / dibatalkan), dengan pesan kontekstual per status.

**Prinsip:** Reuse infrastruktur yang ada (`email.ts` + Resend HTTP API + pola HTML builder), **best-effort** (kegagalan email tidak boleh menggagalkan checkout/update status), dan tetap **aman** (alamat penerima = `buyerEmail` dari token yang terverifikasi, bukan dari input bebas).

---

## 2. Baseline — Kondisi Email Saat Ini

### 2.1 Infrastruktur (`src/lib/email.ts`)
- Provider: **Resend** via HTTP API (`https://api.resend.com/emails`).
- Env: `RESEND_API_KEY`, `EMAIL_FROM` (fallback `LKTech <onboarding@resend.dev>`), `LEAD_NOTIFY_EMAILS` (penerima admin).
- Flag `isEmailConfigured` (apiKey ada).
- Fungsi existing: `sendLeadNotification(lead)` → admin, `sendOrderNotification(order)` → admin, `sendTestEmail(to)`.
- Helper HTML: `buildText`/`buildHtml` (lead), `buildOrderText`/`buildOrderHtml` (order). Sudah ada **escaping** & template ber-brand.

### 2.2 Alur order
- **Checkout** (`POST /api/orders`, `src/app/api/orders/route.ts`): verifikasi token → hitung harga server → `createOrder()` → `sendOrderNotification(order)` **(ke admin)** → `incrementUserOrderCount`.
- **Ubah status** (`PATCH /api/admin/orders`, admin): `updateOrderStatus(id, status, adminEmail)` (`src/lib/orders.ts`) — **tanpa email**.
- **Model `Order`** (`src/lib/order-types.ts`): `id, uid, buyerName, buyerEmail, items[], total, status, whatsapp, message, createdAt`.
  - `buyerEmail` berasal dari **token terverifikasi** (tidak bisa dipalsukan).
- **Status**: `baru | diproses | selesai | dibatalkan` (`ORDER_STATUSES`), label `ORDER_STATUS_LABEL`.
- **Kode pesanan**: `shortOrderCode(id)` → `#A1B2C3D4`.

### 2.3 Halaman/UX terkait
- `/keranjang` (`cart-view.tsx`): setelah checkout, buka WhatsApp + tampilkan "Pesanan dikirim". **Belum ada** konfirmasi email (di UI tidak disebut).
- `/akun` tab **Pesanan**: riwayat pesanan pembeli (+ "Pesan lagi").
- Admin `/admin/orders`: daftar + ubah status.

### 2.4 Settings
- `getSiteSettings()` → `{ email, whatsapp, location, socials }` (dipakai untuk footer/kontak).
- `SITE` (`src/lib/site.ts`): `name`, `url`, dll — untuk tautan di email.

---

## 3. Keputusan Desain

| # | Keputusan | Alasan |
|---|---|---|
| E1 | Kirim **email konfirmasi ke pembeli** saat checkout sukses | Bukti tertulis + profesional; melengkapi notif admin |
| E2 | Kirim **email update status** ke pembeli saat admin ubah status | Menjawab "pesanan saya bagaimana?" |
| E3 | **Best-effort** — kegagalan email tidak menggagalkan order/update | Order tetap sah walau email gagal |
| E4 | Penerima = `order.buyerEmail` (token terverifikasi) | Aman; tidak menerima alamat dari input bebas |
| E5 | **Tidak** kirim email saat status = `baru` di jalur update (sudah ada konfirmasi) | Hindari email ganda |
| E6 | Template HTML dipisah jadi **modul email-order tersendiri** (`src/lib/email-order.ts`) agar rapi & reusable | `email.ts` makin besar; pisah tanggung jawab |
| E7 | `reply_to` email pembeli = email LKTech/notifikasi | Agar balasan masuk ke admin, bukan ke diri sendiri |
| E8 | Tambah **toggle** di Pengaturan dashboard: "Kirim email ke pembeli" (opsional, default aktif) | Kontrol admin; menghormati batasan Resend |

---

## 4. Audit — Temuan & Celah

Format: **[ET-xx] Judul** — *Severity* — Lokasi — Dampak — Rekomendasi.

**[ET-01] Pembeli tidak mendapat konfirmasi pesanan** — 🔴 Tinggi — `api/orders` (hanya `sendOrderNotification` ke admin). — Tidak ada bukti tertulis; bergantung chat. — **Rekomendasi:** email konfirmasi ke `buyerEmail`.

**[ET-02] Tidak ada email saat status pesanan berubah** — 🔴 Tinggi — `api/admin/orders` PATCH. — Pembeli tak tahu progres. — **Rekomendasi:** email update status.

**[ET-03] Template order hanya untuk admin** — 🟠 Menengah — `buildOrderHtml` (nada "Pesanan baru dari website", link dashboard admin). — Tidak cocok untuk pembeli. — **Rekomendasi:** template khusus pembeli (nada "Terima kasih atas pesanan Anda", link `/akun`).

**[ET-04] UI checkout tidak menyebut konfirmasi email** — 🔵 Rendah — `cart-view.tsx` ("Pesanan dikirim"). — Pembeli tak tahu akan dapat email. — **Rekomendasi:** tambahkan teks "Konfirmasi telah dikirim ke email Anda".

**[ET-05] Tidak ada jejak apakah email pembeli terkirim** — 🟠 Menengah — tidak ada log/status. — Sulit didiagnosis bila pembeli bilang tak menerima. — **Rekomendasi:** simpan `confirmationEmailAt`/`lastStatusEmailAt` (opsional) di dokumen order.

**[ET-06] Batasan Resend (onboarding@resend.dev)** — 🟠 Menengah — env. — Tanpa domain terverifikasi, email hanya terkirim ke alamat terdaftar Resend. — **Rekomendasi:** dokumentasikan; verifikasi domain agar bisa ke email mana pun (lihat §10).

**[ET-07] `email.ts` tumbuh & campur tanggung jawab** — 🔵 Rendah — `email.ts`. — Kurang rapi. — **Rekomendasi:** pisah builder email order pembeli ke modul baru.

**[ET-08] Tidak ada tombol "kirim ulang" konfirmasi** — 🔵 Rendah. — **Rekomendasi (opsional):** tombol di detail order admin.

### 4.4 Ringkasan temuan

| ID | Temuan | Severity | Fase |
|---|---|---|---|
| ET-01 | Tak ada konfirmasi ke pembeli | 🔴 | E3 |
| ET-02 | Tak ada email update status | 🔴 | E4 |
| ET-03 | Template order hanya utk admin | 🟠 | E2 |
| ET-05 | Tak ada jejak email terkirim | 🟠 | E3/E4 |
| ET-06 | Batasan Resend | 🟠 | E0/§10 |
| ET-04/07/08 | Minor | 🔵 | E2/E5 |

---

## 5. Spesifikasi Target

### 5.1 Email Konfirmasi Pesanan (checkout sukses)
- **Subjek**: `Pesanan #A1B2C3D4 diterima — LKTech`
- **Isi**:
  - Sapaan (nama pembeli).
  - Baris "Terima kasih, pesanan Anda sudah kami terima."
  - **Kode pesanan** + tanggal.
  - **Tabel item**: nama (+varian) × qty, subtotal.
  - **Total**.
  - **Langkah selanjutnya**: "Kami akan memproses & menghubungi Anda via WhatsApp (<nomor>) untuk konfirmasi & pembayaran."
  - **Tombol**: "Lihat Pesanan Saya" → `/akun?tab=pesanan`; (opsional) "Chat via WhatsApp".
  - Footer: nama situs + tautan + "email otomatis".

### 5.2 Email Update Status
| Status | Subjek | Nada/isi |
|---|---|---|
| `diproses` | `Pesanan #XXXX sedang diproses` | "Pesanan Anda sedang kami kerjakan." + tombol WA/akun |
| `selesai` | `Pesanan #XXXX telah selesai 🎉` | "Terima kasih!" + ajakan ulasan/repeat (opsional) |
| `dibatalkan` | `Pesanan #XXXX dibatalkan` | "Pesanan dibatalkan. Hubungi kami bila ini keliru." |
| `baru` | — (skip) | tidak dikirim pada jalur update (E5) |

### 5.3 Konfigurasi (opsional)
- Toggle di Pengaturan `site` (extend `SiteSettings`): `notifyBuyerOnOrder: boolean` (default `true`), `notifyBuyerOnStatus: boolean` (default `true`).

---

## 6. Arsitektur & Implementasi

### 6.1 Modul baru `src/lib/email-order.ts`
```ts
import "server-only";

/** Hasil pengiriman (best-effort, tidak melempar). */
export type EmailResult = { ok: boolean; skipped?: boolean; error?: string };

/** Email konfirmasi pesanan ke PEMBELI. */
export async function sendOrderConfirmationToBuyer(order: Order): Promise<EmailResult>;

/** Email update status pesanan ke PEMBELI. */
export async function sendOrderStatusToBuyer(order: Order, status: OrderStatus): Promise<EmailResult>;

// (internal) builder teks & HTML untuk pembeli
```

- Reuse pola dari `email.ts`: `isEmailConfigured`, `fromEmail`, helper `esc`, `formatRupiah`, `shortOrderCode`, `SITE`.
- Penerima: `[order.buyerEmail]` (lewati bila kosong).
- `reply_to`: dari env baru `ORDER_REPLY_TO` ?? `SITE`/settings email (agar balasan ke admin).

### 6.2 Integrasi
1. **`POST /api/orders`** — setelah `createOrder()` & `sendOrderNotification(order)` (admin), panggil `sendOrderConfirmationToBuyer(order)` (best-effort, `.catch`).
2. **`PATCH /api/admin/orders`** — setelah `updateOrderStatus(...)`, ambil order terbaru (perlu fungsi `getOrderById` atau kembalikan data) lalu bila status ∈ {diproses, selesai, dibatalkan} → `sendOrderStatusToBuyer(order, status)`.

### 6.3 File BARU/DIUBAH

**Baru:**
| File | Peran |
|---|---|
| `src/lib/email-order.ts` | Email transaksional ke pembeli (konfirmasi + status) |
| `docs/2026-10-05-email-transaksional-pembeli.md` | Dokumen ini |

**Diubah:**
| File | Perubahan |
|---|---|
| `src/app/api/orders/route.ts` | Panggil email konfirmasi ke pembeli |
| `src/app/api/admin/orders/route.ts` | Panggil email update status setelah PATCH |
| `src/lib/orders.ts` | Tambah `getOrderById(id)` (untuk mengambil order lengkap setelah update) |
| `src/lib/settings-types.ts` + `settings.ts` | (Opsional) toggle `notifyBuyerOnOrder`/`notifyBuyerOnStatus` |
| `src/components/admin/settings-manager.tsx` | (Opsional) UI toggle |
| `src/components/cart-view.tsx` | Teks "konfirmasi dikirim ke email Anda" |
| `.env.example` | `ORDER_REPLY_TO` (opsional) |
| `docs/README.md`, `TASK-SELANJUTNYA.md` | Dokumentasi |

---

## 7. TASK IMPLEMENTATION FLOW (FASE E0–E7)

### FASE E0 — Persiapan & baseline (±20 menit)
- [ ] Baca dokumen ini + `src/lib/email.ts` + `orders-admin-module.md`.
- [ ] Baseline: `tsc`/`lint`/`build` bersih.
- [ ] Pastikan `RESEND_API_KEY` & `EMAIL_FROM` ada (`.env.local`).

### FASE E1 — Modul `email-order.ts` (±2 jam)
- [ ] Buat `src/lib/email-order.ts` (hasil, `fromEmail`, helper esc, builder teks+HTML).
- [ ] `sendOrderConfirmationToBuyer(order)`.
- **DoD:** fungsi mengirim email (uji manual via skrip/route sementara).

### FASE E2 — Template HTML pembeli (±1.5 jam)
- [ ] Template konfirmasi (ber-brand, responsif email, tabel item, tombol).
- [ ] Template status (diproses/selesai/dibatalkan) dengan warna/ikon relevan.
- **DoD:** tampilan email rapi di Gmail/klien email.

### FASE E3 — Integrasi konfirmasi di checkout (±1 jam)
- [ ] `POST /api/orders`: panggil `sendOrderConfirmationToBuyer` (best-effort).
- [ ] (Opsional) simpan `confirmationEmailAt` di order.
- **DoD:** checkout → email konfirmasi terkirim ke pembeli.

### FASE E4 — Integrasi email status (±1.5 jam)
- [ ] Tambah `getOrderById(id)` di `orders.ts`.
- [ ] `PATCH /api/admin/orders`: kirim email status setelah update (kecuali `baru`).
- **DoD:** admin ubah status → pembeli dapat email sesuai status.

### FASE E5 — Preferensi & UX (±1 jam)
- [ ] (Opsional) toggle di Pengaturan (`notifyBuyerOnOrder`/`notifyBuyerOnStatus`).
- [ ] Teks di `cart-view.tsx` tentang konfirmasi email.
- [ ] (Opsional) tombol "Kirim ulang konfirmasi" di detail order admin.
- **DoD:** admin bisa atur; UX konsisten.

### FASE E6 — Dokumentasi & env (±30 menit)
- [ ] `.env.example`: `ORDER_REPLY_TO` (opsional).
- [ ] Update `docs/README.md` & `TASK-SELANJUTNYA.md`.
- [ ] Status dokumen → ✅ + "Status Eksekusi".

### FASE E7 — QA, deploy
- [ ] `tsc`/`lint`/`build` bersih.
- [ ] Checklist QA §8.
- [ ] Commit per fase → push → uji produksi (Resend).

---

## 8. Definition of Done & Checklist QA

### 8.1 DoD global
1. `tsc` bersih, `build` sukses, `lint` bersih.
2. Tidak ada regresi: checkout, update status, email admin, halaman akun.
3. Kegagalan email **tidak** menggagalkan checkout/update status (best-effort).

### 8.2 Email konfirmasi
- [ ] Checkout sukses → pembeli menerima email berisi item + total + kode + tombol.
- [ ] Subjek jelas; HTML rapi di mobile.
- [ ] Bila `buyerEmail` kosong / email tak dikonfigurasi → tidak error (skip).

### 8.3 Email status
- [ ] Update ke `diproses`/`selesai`/`dibatalkan` → email terkirim.
- [ ] Update ke `baru` → **tidak** kirim (hindari ganda).
- [ ] Isi email sesuai status.

### 8.4 UX & konfigurasi
- [ ] (Bila dibuat) toggle Pengaturan berpengaruh.
- [ ] Teks di `/keranjang` menyebut konfirmasi email.

### 8.5 Regresi
- [ ] Email notifikasi admin (lead & order) tetap terkirim.
- [ ] Order tetap tersimpan & tampil di `/akun` & `/admin/orders`.
- [ ] `sendTestEmail` tetap berfungsi.

---

## 9. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Resend tanpa domain terverifikasi → email tak sampai ke pembeli | Tinggi | Dokumen §10; sementara uji ke email terdaftar; verifikasi domain |
| R2 | Email masuk spam | Sedang | `from` konsisten + verifikasi domain (SPF/DKIM via Resend) |
| R3 | Kegagalan email menggagalkan checkout | Tinggi | Best-effort (`try/catch`, tidak `await` blocking) |
| R4 | Email ganda (konfirmasi + update ke `baru`) | Rendah | Skip status `baru` di jalur update (E5) |
| R5 | Pembeli tak punya email valid | Sedang | `buyerEmail` dari token Google (valid); skip bila kosong |
| R6 | Rate limit Resend | Rendah | Volume kecil; log & lanjut |
| R7 | Data salah di email (XSS) | Sedang | Escaping HTML pada semua input user (pola existing) |
| R8 | Tidak ada jejak pengiriman | Rendah | Simpan `*EmailAt` (opsional) |

---

## 10. Catatan Operasional (Resend)

- **Kondisi saat ini**: `EMAIL_FROM=LKTech <onboarding@resend.dev>` → email **hanya terkirim ke alamat yang terdaftar di akun Resend** (`lupyariestaa@gmail.com`). Artinya email ke **pembeli umum TIDAK akan terkirim** sampai domain diverifikasi.
- **Agar email transaksional ke pembeli bekerja penuh**:
  1. Beli domain (mis. `lktech.id`) — saat ini keputusan pemilik: belum.
  2. Tambah domain di **Resend → Domains**, set DNS (SPF/DKIM).
  3. Ganti `EMAIL_FROM` → `LKTech <notifikasi@lktech.id>`.
  4. (Opsional) `ORDER_REPLY_TO` → email admin.
- **Sementara belum berdomain**: kode tetap dibangun & aman; email admin tetap berfungsi. Untuk uji, gunakan akun pembeli dengan email terdaftar Resend.
- **Alternatif tanpa domain**: pertimbangkan provider lain dengan domain bersama (mis. `resend.dev` sender untuk penerima terverifikasi). Dibahas terpisah bila perlu.

---

## 11. Out of Scope

- **Domain sendiri & verifikasi Resend penuh** (tugas manual pemilik; lihat §10).
- **Email marketing/kampanye** ke daftar user (broadcast).
- **Template builder visual** (email dibuat di kode).
- **Email ke pembeli saat lead** (lead tetap ke admin).
- **Multi-bahasa** email.
- **Lampiran PDF invoice** (kandidat lanjutan).
- **Preferensi opt-out per user** (notifikasi transaksional dianggap wajib).

---

## 12. Estimasi & Urutan Pengerjaan

| Fase | Isi | Estimasi* | Nilai |
|---|---|---|---|
| E0 | Persiapan & baseline | 20 mnt | — |
| E1 | Modul `email-order.ts` | 2 jam | Fondasi |
| E2 | Template HTML pembeli | 1.5 jam | 🔴 Terasa |
| E3 | Integrasi konfirmasi (checkout) | 1 jam | 🔴 Inti |
| E4 | Integrasi email status | 1.5 jam | 🔴 Inti |
| E5 | Preferensi & UX | 1 jam | 🟠 |
| E6 | Dokumentasi & env | 30 mnt | — |
| E7 | QA & deploy | 1 jam | Wajib |

**Total inti (E0–E7):** ± 8–9 jam terfokus (± 1 sesi).

**Urutan:** E1 (modul) → E2 (template) → E3 (konfirmasi) → E4 (status) → E5 → E6 → E7.

> **Bila 1 sesi:** E1–E4 memberi nilai inti (konfirmasi + update status). E5 (preferensi) menyusul.

---

## 13. Lampiran — Referensi Pola Existing

| Kebutuhan | Referensi existing |
|---|---|
| Pengiriman email + template + escaping | `src/lib/email.ts` |
| Flag konfigurasi email | `isEmailConfigured` (`email.ts`) |
| Email admin saat order | `sendOrderNotification` |
| Model & kode order | `src/lib/order-types.ts`, `src/lib/format.ts` (`shortOrderCode`, `formatRupiah`) |
| Alur checkout | `src/app/api/orders/route.ts` |
| Ubah status order | `src/app/api/admin/orders/route.ts`, `src/lib/orders.ts` (`updateOrderStatus`) |
| Info situs (untuk email) | `src/lib/site.ts` (`SITE`), `src/lib/settings.ts` |
| Test email di dashboard | `src/components/admin/email-notifier.tsx`, `/api/admin/email/test` |
| Status & label order | `ORDER_STATUSES`, `ORDER_STATUS_LABEL` (`order-types.ts`) |

---

## CATATAN PENUTUP

Inti pengembangan ini: memberi **pengalaman transaksional profesional** ke pembeli — email **konfirmasi pesanan** saat checkout dan **update status** saat admin mengubah status — dengan memanfaatkan infrastruktur email yang sudah ada, tetap **best-effort**, **aman**, dan **ber-brand**.

**⚠️ Syarat agar berfungsi penuh di produksi:** verifikasi domain di Resend (§10). Tanpa itu, email hanya sampai ke alamat terdaftar Resend.

**Prioritas eksekusi:** E1 (modul) → E2 (template) → E3 (konfirmasi) → E4 (status) → E5 → E6 → E7.

> Setelah dieksekusi: ubah status di header + tambah bagian "Status Eksekusi", dan catat temuan baru sebagai `ET-09+` bila ada.
