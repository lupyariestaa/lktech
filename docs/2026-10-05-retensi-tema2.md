# FASE DETAIL — Retensi & Engagement (Tema 2)

> **Status:** ✅ **Selesai (kode) — R1–R5** (Web Push ditunda).
> **⚠️ Pembaruan (2026-10-11):** FASE **R1 (Program Loyalitas/Poin) DIHAPUS** atas
> keputusan pemilik — LKTech cukup memakai **kupon/voucher**. Lihat
> `docs/2026-10-11-task-hapus-sistem-poin.md`. R2–R5 tetap berlaku.
> **Disusun:** sesi pasca-Laporan & CRM Mini.
> **Tema roadmap:** **Tema 2 — Retensi & Engagement** (`docs/2026-10-06-roadmap-pengembangan.md`).
> **Prasyarat baca:** `docs/2026-10-06-roadmap-pengembangan.md`, `docs/2026-10-05-kupon-diskon.md`, `docs/2026-10-05-portal-akun-pengguna.md`, `docs/2026-10-05-email-transaksional-pembeli.md`, `TASK-SELANJUTNYA.md`.
> **Prinsip:** server-authoritative, observability, a11y, mobile-first, **backward-compatible**, dokumentasi fase.

---

## 1. Ringkasan & Tujuan

Mengubah pembeli sekali menjadi **pelanggan berulang** dan pengunjung menjadi audiens:

1. **~~Program loyalitas/poin~~** (R1) — ❌ **DIHAPUS** (2026-10-11; cukup kupon/voucher).
2. **Email marketing ringan** (R2) — newsletter opt-in + broadcast promo dari admin + unsubscribe patuh.
3. **Alert wishlist** (R3) — pemberitahuan "harga turun"/"kembali tersedia" via email.
4. **Notifikasi kanal sekunder** (R4) — WhatsApp opsional (fail-safe) + kerangka Web Push.

---

## 2. Keputusan Desain Kunci

### 2.1 ~~Model & aturan poin (murni, teruji)~~ — ❌ DIHAPUS (2026-10-11)
> Sistem poin/loyalitas **dihapus**. Cukup sistem kupon/voucher. Lihat
> `docs/2026-10-11-task-hapus-sistem-poin.md`.
- **~~Rasio dasar:~~** 1 poin per Rp 10.000 belanja; tier Bronze/Silver/Gold; ledger `users/{uid}/points`; tukar poin → kupon. **(semua dilepas dari kode)**

### 2.2 Email marketing (R2)
- **Newsletter opt-in**: koleksi `subscribers/{email}` (public form di footer/promo).
- **Broadcast admin**: pilih segmen (semua / pernah beli / belum pernah) → kirim via Resend (batch), log hasil.
- **Unsubscribe** bertoken HMAC (reuse pola `/api/cart/unsubscribe`).

### 2.3 Alert wishlist (R3)
- Cron membandingkan wishlist user dengan produk: "harga turun" (`originalPrice > price`) & "kembali tersedia" (`soldOut` → false / `stock` naik).
- Email ke pemilik wishlist; cooldown agar tidak spam.

### 2.4 Notifikasi kanal sekunder (R4)
- **WhatsApp Cloud API**: abstraksi `notifyWhatsApp()` — **fail-safe** (nonaktif bila env kosong).
- **Web Push**: kerangka (manifest sudah ada?) — ditunda bila butuh SW kompleks.

---

## 3. Arsitektur Teknis

### 3.1 File/modul baru (rencana)
| File | Peran |
| --- | --- |
| ~~`src/lib/loyalty-pure.ts`~~ | ❌ DIHAPUS 2026-10-11 (aturan poin/tier). |
| ~~`src/lib/loyalty.ts`~~ | ❌ DIHAPUS 2026-10-11 (data layer poin). |
| ~~`src/lib/loyalty-api.ts`~~ | ❌ DIHAPUS 2026-10-11 (klien poin). |
| ~~`src/app/api/user/points/route.ts`~~ | ❌ DIHAPUS 2026-10-11 (API poin). |
| ~~`src/components/auth/account-points.tsx`~~ | ❌ DIHAPUS 2026-10-11 (tab "Poin"). |
| `src/lib/newsletter.ts` + `src/app/api/newsletter/route.ts` | Opt-in + broadcast + unsubscribe. |
| `src/components/admin/broadcast-manager.tsx` | UI kirim broadcast. |
| `src/lib/wishlist-alert.ts` + `src/app/api/cron/wishlist-alerts/route.ts` | Alert harga/stok. |
| `src/lib/whatsapp-notify.ts` | (R4) abstraksi WA opsional. |

### 3.2 Perubahan file
- ~~`src/lib/user-types.ts` — `points`, `pointsLifetime`, `tier`.~~ (dilepas 2026-10-11)
- ~~`src/lib/user-profile.ts` — normalisasi field poin.~~ (dilepas 2026-10-11)
- ~~`src/app/api/orders/route.ts` / webhook — beri poin saat order dibayar/lunas.~~ (dilepas 2026-10-11)
- `src/app/admin/(dashboard)/...` — menu broadcast.
- `firestore.rules` — catat koleksi baru (`subscribers`).

---

## 4. Fase Eksekusi

### FASE R1 — ~~Program Loyalitas/Poin~~ ❌ DIHAPUS (2026-10-11)
> Sistem poin/loyalitas dihapus; LKTech cukup memakai kupon/voucher.
> Lihat `docs/2026-10-11-task-hapus-sistem-poin.md`.

### FASE R2 — Email marketing & newsletter ✅
- Opt-in publik + verifikasi/no-verify, `subscribers`.
- Broadcast admin (segmentasi) + unsubscribe bertoken + log.

> **Status R2:** ✅ `newsletter.ts`+`newsletter-types.ts` (`subscribers`, segmen semua/pernah-beli/belum, unsubscribe HMAC), `email-broadcast.ts`; API `POST /api/newsletter` (honeypot+rate-limit) & `/api/newsletter/unsubscribe` (fail-closed); admin `GET/POST /api/admin/broadcast` + `/admin/broadcast`; form newsletter di footer.

### FASE R3 — Alert wishlist ✅
- Cron `/api/cron/wishlist-alerts` + email alert (cooldown).

> **Status R3:** ✅ `wishlist-alert-pure.ts` (`diffProductAlerts`, teruji 9), `wishlist-alert.ts` (banding snapshot `product_alerts_state`, kirim ke pemilik wishlist, cooldown 72 jam), `email-wishlist.ts`, cron `/api/cron/wishlist-alerts` (fail-closed).

### FASE R4 — Notifikasi kanal sekunder (fail-safe) ✅
- `notifyWhatsApp()` opsional (env kosong = nonaktif). Web Push ditunda.

> **Status R4:** ✅ `whatsapp-notify.ts` (WA Cloud API; **fail-safe**: nonaktif bila env kosong), dipanggil best-effort saat status pesanan berubah. Web Push ditunda (butuh service worker).

### FASE R5 — QA & dokumentasi ✅
- `tsc`/`lint`/`build` bersih; unit test aturan segmentasi & alert.
- Update `TASK-SELANJUTNYA.md`, `docs/README.md`, roadmap.

> **Status R5:** ✅ `tsc`/`eslint`/`build` bersih (72 halaman); **14 suite / 117 test** lolos. Dokumentasi diperbarui.

---

## 7. Hasil Akhir (R1–R5) — ✅ SELESAI (kode)
- **~~Loyalitas/poin~~** — ❌ **DIHAPUS** (2026-10-11; cukup kupon/voucher).
- **Email marketing:** opt-in newsletter (footer), broadcast admin per segmen, unsubscribe patuh.
- **Alert wishlist:** email otomatis "harga turun"/"kembali tersedia" (cron).
- **Notifikasi WA:** opsional & fail-safe (aktif bila env diisi).
- **Web Push (2.3):** ditunda (butuh service worker).

---

## 5. Risiko & Mitigasi
| Risiko | Mitigasi |
| --- | --- |
| Spam broadcast | Opt-out dihormati + segmentasi + batas |
| Infra WA kosong | Fail-safe (nonaktif, tidak error) |
| Data lama | Field user lama tetap valid (normalizer whitelist) |

---

## 6. Definition of Done
1. `tsc`/`lint`/`build` bersih; unit test segmentasi & alert.
2. Newsletter opt-in + unsubscribe patuh; broadcast berlog.
3. A11y & mobile-first (form newsletter).
4. Dokumentasi fase diperbarui.
